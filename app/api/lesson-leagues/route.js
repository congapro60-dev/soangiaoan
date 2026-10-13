import { db, stmt, getEnv } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { createLessonLeagueService } from '../../../lib/lesson/league-service.js';
import { json, readJson, bearer } from '../../../lib/exam/http.js';

export const dynamic = 'force-dynamic';
const service = () => createLessonLeagueService({ db: db() });
const codes = { AUTH_REQUIRED: 401, NOT_FOUND: 404, BODY_TOO_LARGE: 413, CONFIRM_REQUIRED: 409, RELATION_DELETED: 409, REQUEST_CONFLICT: 409, ROUND_CONFLICT: 409, LEAGUE_CONFLICT: 409, LEAGUE_CLASSES_FROZEN: 409, LIVE_NOT_READY: 409, SESSION_NOT_CONCLUDED: 409, NO_PARTICIPANTS: 409, INVALID_BODY: 400, INVALID_TITLE: 400, INVALID_FORMAT: 400, INVALID_ROUND: 400, INVALID_REQUEST_ID: 400, INVALID_SERVER_SCORE: 503 };
const errorResponse = error => Object.hasOwn(codes, error?.message) ? json({ error: error.message }, codes[error.message]) : json({ error: 'LEAGUE_UNAVAILABLE' }, 503);
const keys = { create: ['action', 'title', 'format', 'requestId'], delete: ['action', 'leagueId', 'confirmTitle'], 'class-add': ['action', 'leagueId', 'classId'], 'class-remove': ['action', 'leagueId', 'classId', 'confirmTitle'], link: ['action', 'leagueId', 'classId', 'sessionId', 'round'], unlink: ['action', 'leagueId', 'classId', 'round', 'confirmSessionId'], finalize: ['action', 'leagueId', 'classId', 'round'] };
async function account(user) { await stmt('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name', user.userId, user.email, user.displayName, Date.now()).run(); }

export async function GET(request) {
  try {
    const api = service(), token = bearer(request), id = new URL(request.url).searchParams.get('id');
    if (token) return json(await api.getLeague({ leagueId: id, memberToken: token }));
    const { user } = resolveIdentity(request, getEnv()); if (!user) throw new Error('AUTH_REQUIRED'); await account(user);
    return json(id ? await api.getLeague({ ownerAccountId: user.userId, leagueId: id }) : await api.listLeagues(user.userId));
  } catch (error) { return errorResponse(error); }
}
export async function POST(request) {
  try {
    if (bearer(request)) throw new Error('AUTH_REQUIRED');
    const { user } = resolveIdentity(request, getEnv()); if (!user) throw new Error('AUTH_REQUIRED');
    const body = await readJson(request, 16 * 1024);
    if (!Object.hasOwn(keys, body.action) || Object.keys(body).some(key => !keys[body.action].includes(key))) throw new Error('INVALID_BODY'); await account(user);
    const args = { ownerAccountId: user.userId, leagueId: body.leagueId, classId: body.classId };
    if (body.action === 'create') return json(await service().createLeague({ ownerAccountId: user.userId, title: body.title, format: body.format, requestId: body.requestId }));
    if (body.action === 'class-add') return json(await service().addClass(args));
    if (body.action === 'delete') return json(await service().deleteLeague({ ...args, confirmTitle: body.confirmTitle }));
    if (body.action === 'class-remove') return json(await service().removeClass({ ...args, confirmTitle: body.confirmTitle }));
    if (body.action === 'unlink') return json(await service().unlinkSession({ ...args, round: body.round, confirmSessionId: body.confirmSessionId }));
    if (body.action === 'link') return json(await service().linkSession({ ...args, sessionId: body.sessionId, round: body.round }));
    return json(await service().finalizeRound({ ...args, round: body.round }));
  } catch (error) { return errorResponse(error); }
}
