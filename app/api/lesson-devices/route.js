import { db, stmt, getEnv } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { createLessonDeviceService } from '../../../lib/lesson/device-service.js';
import { json, readJson, bearer } from '../../../lib/exam/http.js';

export const dynamic = 'force-dynamic';
const service = () => createLessonDeviceService({ db: db() });
const codes = { AUTH_REQUIRED: 401, FORBIDDEN: 403, DEVICE_UNAVAILABLE: 403, DEVICE_SESSION_UNAVAILABLE: 409, REQUEST_CONFLICT: 409,
  INVALID_DEVICE_INPUT: 400, INVALID_DEVICE_MEMBER: 400, INVALID_BOARD_RESPONSE: 400, INVALID_ACTION: 400, INVALID_BODY: 400, BODY_TOO_LARGE: 413 };
const failed = error => json({ error: Object.hasOwn(codes, error?.message) ? error.message : 'DEVICE_UNAVAILABLE' }, codes[error?.message] || 503);
async function account(user) { await stmt('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name', user.userId, user.email, user.displayName, Date.now()).run(); }

export async function GET(request) {
  try {
    const sessionId = new URL(request.url).searchParams.get('sessionId'), token = bearer(request), api = service();
    if (token) return json(await api.listDeviceMembers({ sessionId, deviceToken: token }));
    const { user } = resolveIdentity(request, getEnv());
    if (!user) throw new Error('AUTH_REQUIRED'); await account(user);
    return json(await api.listDevices({ accountId: user.userId, sessionId }));
  } catch (error) { return failed(error); }
}

export async function POST(request) {
  try {
    const body = await readJson(request, 32 * 1024), token = bearer(request), api = service();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('INVALID_BODY');
    const allowed = { create: ['action', 'sessionId', 'kind', 'memberIds', 'requestId', 'ttlMs'], revoke: ['action', 'sessionId', 'deviceId'],
      resolve: ['action', 'sessionId', 'learnerId'], 'prepare-board-response': ['action', 'sessionId', 'learnerId', 'taskId', 'answer'] };
    if (!Object.hasOwn(allowed, body.action)) throw new Error('INVALID_ACTION');
    if (Object.keys(body).some(key => !allowed[body.action].includes(key))) throw new Error('INVALID_BODY');
    if (body.action === 'resolve') return json(await api.resolveActingLearner({ sessionId: body.sessionId, deviceToken: token, learnerId: body.learnerId }));
    if (token) throw new Error('AUTH_REQUIRED');
    const { user } = resolveIdentity(request, getEnv());
    if (!user) throw new Error('AUTH_REQUIRED'); await account(user);
    const args = { accountId: user.userId, sessionId: body.sessionId };
    if (body.action === 'create') return json(await api.issueDevice({ ...args, kind: body.kind, memberIds: body.memberIds, requestId: body.requestId, ttlMs: body.ttlMs }));
    if (body.action === 'revoke') return json(await api.revokeDevice({ ...args, deviceId: body.deviceId }));
    return json(await api.authorizeBoardResponse({ ...args, learnerId: body.learnerId, taskId: body.taskId, answer: body.answer }));
  } catch (error) { return failed(error); }
}
