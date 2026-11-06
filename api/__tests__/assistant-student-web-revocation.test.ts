import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import { confirmWebHandoff, handleWebHandoffAction, issueWebHandoff, verifyStudentBotLink } from '../_assistant-web-handoff.js';
import { assertActorCurrent, resolveSubmissionActor } from '../_submission-actors.js';
import { handleScoreBookAction } from '../_score-book.js';
import { handlePortfolioAction } from '../_portfolio.js';
const auth = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => auth }));
let db: FakeDb;
const res = () => { const response: any = { code: 200, data: null }; response.status = (value: number) => { response.code = value; return response; }; response.json = (value: unknown) => { response.data = value; return response; }; response.setHeader = vi.fn(); return response; };
const action = async (body: Record<string, unknown>) => { const response = res(); await handleWebHandoffAction(db.db, body, response); return response; };
const uid = 'anonymous';
const link = () => db.rows.get(`studentLinks/${uid}`)!;
const grantPath = () => `assistantStudentWebSessions/${link().botWebSession}`;
const grant = async () => {
  const url = await issueWebHandoff(db.db, 'bot', 'user', 'student', 'c', 's');
  const ticket = url.split('#bot=')[1], verifier = 'a'.repeat(64);
  const begin = await action({ action: 'beginBotWeb', ticket, verifier });
  await confirmWebHandoff(db.db, 'bot', 'user', `mở web ${begin.data.code}`);
  const redeemed = await action({ action: 'redeemBotWeb', ticket, verifier, idToken: 'anonymous' });
  expect(redeemed.code).toBe(200);
};
beforeEach(() => {
  db = new FakeDb();
  db.put('channelLinks/channel', { active: true, channel: 'zalo_bot', channelAccountId: 'bot', channelUserId: 'user', role: 'student', classId: 'c', studentId: 's' });
  db.put('classes/c', { teacherId: 'teacher', joinCode: 'LOP1' });
  db.put('classes/c/students/s', { name: 'Học sinh thử' });
  db.put('classes/c/studentSecrets/s', { pinHash: 'server-private-hash', updatedAt: 'revision-one' });
  auth.verifyIdToken.mockResolvedValue({ uid, firebase: { sign_in_provider: 'anonymous' } });
});
describe('bot-issued student web session revocation', () => {
  it('stores only an opaque grant pointer in the client-readable link', async () => {
    await grant();
    expect(await verifyStudentBotLink(db.db, uid, link())).toBe(true);
    expect(Object.keys(link()).sort()).toEqual(['botWebSession', 'classId', 'createdAt', 'studentId', 'teacherId', 'uid']);
    expect(JSON.stringify(link())).not.toMatch(/pinHash|pinRevision|server-private-hash/);
    expect(db.rows.get(grantPath())!.expiresAt - Date.now()).toBeGreaterThan(7 * 60 * 60_000);
  });
  it.each(['pinHash', 'pinRevision', 'unlink', 'removeStudent', 'wrongClass', 'wrongStudent', 'teacher', 'expiry', 'wrongUid'])('rejects %s after successful redemption', async change => {
    await grant();
    if (change === 'pinHash') db.put('classes/c/studentSecrets/s', { pinHash: 'changed', updatedAt: 'revision-one' });
    if (change === 'pinRevision') db.put('classes/c/studentSecrets/s', { pinHash: 'server-private-hash', updatedAt: 'revision-two' });
    if (change === 'unlink') db.put('channelLinks/channel', { ...db.rows.get('channelLinks/channel'), active: false });
    if (change === 'removeStudent') db.rows.delete('classes/c/students/s');
    if (change === 'wrongClass') db.put(`studentLinks/${uid}`, { ...link(), classId: 'other' });
    if (change === 'wrongStudent') db.put(`studentLinks/${uid}`, { ...link(), studentId: 'other' });
    if (change === 'teacher') db.put('classes/c', { teacherId: 'other', joinCode: 'LOP1' });
    if (change === 'expiry') db.put(grantPath(), { ...db.rows.get(grantPath()), expiresAt: Date.now() - 1 });
    expect(await verifyStudentBotLink(db.db, change === 'wrongUid' ? 'other' : uid, link())).toBe(false);
  });
  it('keeps ordinary anonymous PIN login policy unchanged', async () => {
    const normal = { uid, classId: 'c', studentId: 's', teacherId: 'teacher' };
    db.put(`studentLinks/${uid}`, normal);
    expect(await verifyStudentBotLink(db.db, uid, normal)).toBe(true);
    expect((await resolveSubmissionActor(db.db, { idToken: 'anonymous', role: 'student' }, res()))?.studentId).toBe('s');
    expect(await verifyStudentBotLink(db.db, uid, { ...normal, botWebSession: 'forged' })).toBe(false);
  });
  it.each(['studentScoreBook', 'studentPortfolio'])('%s rejects a revoked bot session before loading private data', async name => {
    await grant();
    db.put('channelLinks/channel', { ...db.rows.get('channelLinks/channel'), active: false });
    const response = res();
    const handler = name === 'studentScoreBook' ? handleScoreBookAction : handlePortfolioAction;
    await handler(db.db, { action: name, idToken: 'anonymous' }, response);
    expect(response.code).toBe(403);
    expect(response.data).toHaveProperty('error');
  });
  it('submission mutations revalidate a bot grant in the same transaction', async () => {
    await grant();
    const actor = (await resolveSubmissionActor(db.db, { idToken: 'anonymous', role: 'student' }, res()))!;
    db.beforeCommit = () => db.put('channelLinks/channel', { ...db.rows.get('channelLinks/channel'), active: false });
    await expect(db.db.runTransaction(async tx => {
      await assertActorCurrent(db.db, tx, actor);
      tx.set(db.db.collection('proof').doc('mutation'), { accepted: true });
    })).rejects.toMatchObject({ statusCode: 403 });
    expect(db.rows.has('proof/mutation')).toBe(false);
  });
});
