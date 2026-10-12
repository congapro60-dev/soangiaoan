import { db, stmt, getEnv } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { createLessonClassService } from '../../../lib/lesson/class-service.js';
import { json, readJson, bearer } from '../../../lib/exam/http.js';

export const dynamic = 'force-dynamic';
const service = () => createLessonClassService({ db: db() });
const codes = { AUTH_REQUIRED: 401, NOT_FOUND: 404, CLASS_LOGIN_UNAVAILABLE: 403, REQUEST_CONFLICT: 409, CONFIRM_REQUIRED: 409, CLASS_FULL: 409, BODY_TOO_LARGE: 413, INVALID_TITLE: 400, INVALID_NAME: 400, INVALID_TEAM: 400, INVALID_REQUEST_ID: 400, INVALID_ACTION: 400, INVALID_BODY: 400, CODE_UNAVAILABLE: 503 };
const errorResponse = error => Object.hasOwn(codes, error?.message) ? json({ error: error.message }, codes[error.message]) : json({ error: 'CLASS_UNAVAILABLE' }, 503);
async function account(user) { await stmt('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name', user.userId, user.email, user.displayName, Date.now()).run(); }

export async function GET(request) {
  try {
    const api = service(), token = bearer(request);
    if (token) return json(await api.getPassport({ token }));
    const { user } = resolveIdentity(request, getEnv());
    if (!user) throw new Error('AUTH_REQUIRED'); await account(user);
    const classId = new URL(request.url).searchParams.get('id');
    return json(classId ? await api.getClass({ ownerAccountId: user.userId, classId }) : await api.listClasses(user.userId));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  try {
    const body = await readJson(request, 32 * 1024), api = service(), token = bearer(request);
    if (body.action === 'join') return json(await api.joinClass({ classCode: body.classCode, memberCode: body.memberCode, pin: body.pin }));
    if (token) throw new Error('AUTH_REQUIRED');
    const { user } = resolveIdentity(request, getEnv());
    if (!user) throw new Error('AUTH_REQUIRED'); await account(user);
    const args = { ownerAccountId: user.userId, classId: body.classId, memberId: body.memberId };
    switch (body.action) {
      case 'create': return json(await api.createClass({ ownerAccountId: user.userId, title: body.title, requestId: body.requestId }));
      case 'update': return json(await api.updateClass({ ...args, title: body.title }));
      case 'delete': return json(await api.deleteClass({ ...args, confirmTitle: body.confirmTitle }));
      case 'team-create': return json(await api.createTeam({ ...args, title: body.title, requestId: body.requestId }));
      case 'member-add': return json(await api.addMember({ ...args, name: body.name, teamId: body.teamId, requestId: body.requestId }));
      case 'member-update': return json(await api.updateMember({ ...args, name: body.name, teamId: body.teamId }));
      case 'member-revoke': return json(await api.revokeMember(args));
      case 'member-reset-pin': return json(await api.resetMemberPin(args));
      default: throw new Error('INVALID_ACTION');
    }
  } catch (error) { return errorResponse(error); }
}
