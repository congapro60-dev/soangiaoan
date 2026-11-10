import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { FakeDb } from './_fake-db.js';
import { bindParentWebCookie, confirmWebHandoff, handleWebHandoffAction, issueWebHandoff, verifyParentWebSession } from '../_assistant-web-handoff.js';
const auth = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => auth }));
const sha = (v: string) => createHash('sha256').update(v).digest('hex');
let db: FakeDb;
const verifier = 'a'.repeat(64);
const response = () => { const res: any = { code: 200, data: null, headers: {} }; res.status = (v: number) => { res.code = v; return res; }; res.json = (v: any) => { res.data = v; return res; }; res.setHeader = (k: string, v: string) => { res.headers[k] = v; }; return res; };
const call = async (body: any) => { const res = response(); await handleWebHandoffAction(db.db, body, res); return res; };
const setup = async (role: 'student' | 'parent' = 'parent') => {
  db.put('channelLinks/link', { channel: 'zalo_bot', channelAccountId: 'bot', channelUserId: 'user', active: true, classId: 'c', studentId: 's', role });
  const url = await issueWebHandoff(db.db, 'bot', 'user', role, 'c', 's', 'a');
  return { url, ticket: url.split('#bot=')[1] };
};
const begin = async (ticket: string) => call({ action: 'beginBotWeb', ticket, verifier });
const confirmed = async (role: 'student' | 'parent' = 'parent') => {
  const { ticket } = await setup(role); const started = await begin(ticket);
  await confirmWebHandoff(db.db, 'bot', 'user', `mở web ${started.data.code}`);
  return ticket;
};
beforeEach(() => {
  db = new FakeDb();
  db.put('classes/c', { teacherId: 't', joinCode: 'LOP1' });
  db.put('classes/c/students/s', { name: 'Học sinh thử' });
  db.put('classes/c/parentSecrets/s', { pinHash: 'hash', updatedAt: '1', pinSetBy: 'parent' });
  db.put('classes/c/studentSecrets/s', { pinHash: 'hash', updatedAt: '1' });
  db.put('assignments/a', { teacherId: 't', classId: 'c' });
  auth.verifyIdToken.mockResolvedValue({ uid: 'anonymous', firebase: { sign_in_provider: 'anonymous' } });
});
describe('bot web handoff', () => {
  it('issues opaque fragment, stores only ticket hash, binds assignment', async () => {
    const { url, ticket } = await setup();
    expect(new URL(url).search).toBe(''); expect(url).not.toContain('pin=');
    expect(db.rows.get(`assistantWebTickets/${sha(ticket)}`)?.assignmentId).toBe('a');
    expect([...db.rows.keys()]).not.toContain(`assistantWebTickets/${ticket}`);
  });
  it('cannot redeem before original chat confirmation', async () => {
    const { ticket } = await setup(); await begin(ticket);
    expect((await call({ action: 'redeemBotWeb', ticket, verifier })).code).toBe(202);
    expect([...db.rows.keys()].some(k => k.startsWith('assistantParentWebSessions/'))).toBe(false);
  });
  it('forwarded URL cannot replace bound browser or confirm from a different chat', async () => {
    const { ticket } = await setup(); const started = await begin(ticket);
    expect((await call({ action: 'beginBotWeb', ticket, verifier: 'b'.repeat(64) })).code).toBe(401);
    await confirmWebHandoff(db.db, 'bot', 'someone-else', `mở web ${started.data.code}`);
    expect((await call({ action: 'redeemBotWeb', ticket, verifier })).code).toBe(202);
  });
  it('parent redemption creates HttpOnly session, replay denied', async () => {
    const ticket = await confirmed();
    const result = await call({ action: 'redeemBotWeb', ticket, verifier });
    expect(result.code).toBe(200); expect(result.data.assignmentId).toBe('a');
    expect(result.headers['Set-Cookie']).toMatch(/HttpOnly; Secure; SameSite=Strict/);
    expect(JSON.stringify(result.data)).not.toContain('hash');
    expect((await call({ action: 'redeemBotWeb', ticket, verifier })).code).toBe(401);
  });
  it.each(['unlink', 'pin', 'enrollment', 'assignment', 'expiry'])('rejects %s between confirmation and redemption', async change => {
    const ticket = await confirmed();
    if (change === 'unlink') db.put('channelLinks/link', { ...db.rows.get('channelLinks/link'), active: false });
    if (change === 'pin') db.put('classes/c/parentSecrets/s', { pinHash: 'new' });
    if (change === 'enrollment') db.rows.delete('classes/c/students/s');
    if (change === 'assignment') db.put('assignments/a', { classId: 'other', teacherId: 't' });
    if (change === 'expiry') db.put(`assistantWebTickets/${sha(ticket)}`, { ...db.rows.get(`assistantWebTickets/${sha(ticket)}`), expiresAt: 0 });
    expect((await call({ action: 'redeemBotWeb', ticket, verifier })).code).toBe(401);
  });
  it('student redemption binds verified anonymous UID, cannot use teacher token', async () => {
    const ticket = await confirmed('student');
    auth.verifyIdToken.mockResolvedValueOnce({ uid: 'teacher', firebase: { sign_in_provider: 'google.com' } });
    expect((await call({ action: 'redeemBotWeb', ticket, verifier, idToken: 'teacher' })).code).toBe(401);
    expect((await call({ action: 'redeemBotWeb', ticket, verifier, idToken: 'anon' })).code).toBe(200);
    expect(db.rows.get('studentLinks/anonymous')).toMatchObject({ classId: 'c', studentId: 's', teacherId: 't' });
    expect(db.rows.has('studentLinks/teacher')).toBe(false);
  });
  it('parent session scope, expiry, PIN change and unlink are checked on use', async () => {
    const ticket = await confirmed(); const result = await call({ action: 'redeemBotWeb', ticket, verifier });
    const token = result.headers['Set-Cookie'].split(';')[0].split('=')[1];
    expect(await verifyParentWebSession(db.db, token, 'c', 's')).toBeTruthy();
    expect(await verifyParentWebSession(db.db, token, 'c', 'other')).toBeNull();
    db.put('channelLinks/link', { ...db.rows.get('channelLinks/link'), active: false });
    expect(await verifyParentWebSession(db.db, token, 'c', 's')).toBeNull();
  });
  it('concurrent redemption grants exactly one session', async () => {
    const ticket = await confirmed();
    const results = await Promise.all([call({ action: 'redeemBotWeb', ticket, verifier }), call({ action: 'redeemBotWeb', ticket, verifier })]);
    expect(results.map(r => r.code).sort()).toEqual([200, 401]);
    expect([...db.rows.keys()].filter(k => k.startsWith('assistantParentWebSessions/'))).toHaveLength(1);
  });
});


describe('parent cookie credential boundary', () => {
  it('discards forged JSON credentials and accepts only the exact cookie', () => {
    const body: Record<string, unknown> = { webParentSession: 'forged' };
    bindParentWebCookie(body, undefined);
    expect(body.webParentSession).toBeUndefined();
    bindParentWebCookie(body, `other=value; spai_parent_web=${verifier}; end=x`);
    expect(body.webParentSession).toBe(verifier);
    bindParentWebCookie(body, 'spai_parent_web=invalid');
    expect(body.webParentSession).toBeUndefined();
  });
});
