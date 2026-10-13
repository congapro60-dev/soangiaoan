import { db, stmt, getEnv } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { createLessonService, MAX_EVENT_BYTES, validateSessionBody } from '../../../lib/lesson/service.js';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const json = (body, status = 200) => Response.json(body, { status, headers });
// Only machine codes reach clients; anything else (database text, stack messages) is reported as unavailable.
const ERROR_CODE = /^[A-Z][A-Z0-9_]*$/;
const fail = (code, status = 400) => ERROR_CODE.test(code) ? json({ error: code }, status) : json({ error: 'SESSION_UNAVAILABLE' }, 503);
const service = () => createLessonService({ db: db() });
const identity = request => resolveIdentity(request, getEnv());
async function boundedBody(request) {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_EVENT_BYTES)) throw Object.assign(new Error('BODY_TOO_LARGE'), { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error('INVALID_BODY'), { status: 400 });
  const chunks = []; let total = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > MAX_EVENT_BYTES) { await reader.cancel(); throw Object.assign(new Error('BODY_TOO_LARGE'), { status: 413 }); }
    chunks.push(part.value);
  }
  const merged = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  const raw = new TextDecoder().decode(merged);
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('INVALID_BODY'), { status: 400 }); }
}
async function account(user) { await stmt('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name', user.userId, user.email, user.displayName, Date.now()).run(); }

export async function GET(request) {
  const { user } = identity(request); const q = new URL(request.url).searchParams; const id = q.get('id');
  if (!id) return fail('INVALID_QUERY');
  try {
    const api = service();
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    if (q.get('kind') === 'presenter') {
      if (bearer) return json(await api.getSession({ id, presenterToken: bearer }));
      if (!user) return fail('AUTH_REQUIRED', 401);
      await account(user);
      return json(await api.getSession({ id, accountId: user.userId, presenterViewer: true }));
    }
    if (bearer) return json(await api.getSession({ id, learnerToken: bearer, actingLearnerId: q.get('actingLearnerId') || undefined }));
    if (!user) return fail('AUTH_REQUIRED', 401); await account(user);
    return json(await api.getSession({ id, accountId: user.userId }));
  } catch (error) { return fail(error.message || 'SESSION_UNAVAILABLE', error.message === 'NOT_FOUND' ? 404 : 403); }
}

export async function POST(request) {
  const { user, isRootUser } = identity(request); let input;
  try { input = await boundedBody(request); } catch (error) { return fail(error.message, error.status || 400); }
  try { validateSessionBody(input); } catch (error) { return fail(error.message || 'INVALID_BODY', 400); }
  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  try {
    const api = service();
    if (input.action === 'join') return json(await api.joinSession({ code: input.code, name: input.name, classToken: input.classToken, token: auth || undefined }));
    if (input.action === 'event' && auth) return json(await api.event({ sessionId: input.id, learnerToken: auth, actingLearnerId: input.actingLearnerId, event: input.event }));
    if (!user) return fail('AUTH_REQUIRED', 401); await account(user);
    if (input.action === 'create') return json(await api.createSession({ ownerAccountId: user.userId, classId: input.classId, isRoot: isRootUser, packageRowId: input.packageRowId, packageVersion: input.packageVersion, packageHash: input.packageHash, planRowId: input.planRowId, planHash: input.planHash, mode: input.mode, title: input.title, requestId: input.requestId, teacherSetup: input.teacherSetup }));
    if (input.action === 'event') return json(await api.event({ sessionId: input.id, accountId: user.userId, event: input.event }));
    if (input.action === 'tick') return json(await api.tick({ id: input.id, accountId: user.userId, isRoot: isRootUser, round: input.round, revision: input.revision, eventId: input.eventId }));
    if (input.action === 'rotate-presenter') return json(await api.rotatePresenter({ id: input.id, accountId: user.userId, isRoot: isRootUser, revision: input.revision }));
    return fail('INVALID_ACTION');
  } catch (error) { return fail(error.message || 'SESSION_UNAVAILABLE', error.status || (error.message?.includes('CONFLICT') || error.message === 'PROFILE_ALREADY_JOINED' ? 409 : ['FORBIDDEN', 'DEVICE_UNAVAILABLE'].includes(error.message) ? 403 : 400)); }
}
