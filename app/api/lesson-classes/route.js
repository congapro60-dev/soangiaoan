import { db, stmt, getEnv } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { createLessonClassService } from '../../../lib/lesson/class-service.js';
import { exportLearningRecords, learningRecordsCsv } from '../../../lib/lesson/learning-record-export.js';
import { json, readJson, bearer } from '../../../lib/exam/http.js';

export const dynamic = 'force-dynamic';
const service = () => createLessonClassService({ db: db() });
const codes = { AUTH_REQUIRED: 401, NOT_FOUND: 404, CLASS_LOGIN_UNAVAILABLE: 403, EVIDENCE_SNAPSHOT_CHANGED: 409, REQUEST_CONFLICT: 409, CONFIRM_REQUIRED: 409, RESTORE_REQUIRED: 409, CLASS_FULL: 409, BODY_TOO_LARGE: 413, INVALID_QUERY: 400, RECORD_TRUNCATED: 409, STALE_PLAN: 409, PLAN_CONFLICT: 409, EXPORT_TOO_LARGE: 413, INVALID_TITLE: 400, INVALID_NAME: 400, INVALID_TEAM: 400, INVALID_REQUEST_ID: 400, INVALID_ACTION: 400, INVALID_BODY: 400, CODE_UNAVAILABLE: 503 };
const errorResponse = error => Object.hasOwn(codes, error?.message) ? json({ error: error.message }, codes[error.message]) : json({ error: 'CLASS_UNAVAILABLE' }, 503);
async function account(user) { await stmt('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name', user.userId, user.email, user.displayName, Date.now()).run(); }

export async function GET(request) {
  try {
    const api=service(),token=bearer(request),query=new URL(request.url).searchParams,action=query.get('action');
    if(token){if(action)throw Error('AUTH_REQUIRED');return json(await api.getPassport({token}));}
    const {user}=resolveIdentity(request,getEnv());if(!user)throw Error('AUTH_REQUIRED');
    const args={ownerAccountId:user.userId,classId:query.get('id'),...(query.has('from')?{from:Number(query.get('from'))}:{}),...(query.has('to')?{to:Number(query.get('to'))}:{})};
    if(action && [...query.keys()].some(key=>!['action','id','memberId','from','to','limit','offset','format'].includes(key)))throw Error('INVALID_QUERY');
    if(action==='records')return json(await api.getRecords({...args,offset:Number(query.get('offset')??0),limit:Number(query.get('limit')??50)}));
    if(action==='record'){const detail=await api.getRecord({...args,memberId:query.get('memberId')});return json({...detail,plans:await api.listPlans({...args,memberId:query.get('memberId')},detail)});}
    if(action==='records-export'){
      const format=query.get('format')||'json';if(!['json','csv'].includes(format))throw Error('INVALID_QUERY');
      const bundle=await exportLearningRecords(api,{...args,memberId:query.get('memberId'),offset:Number(query.get('offset')??0)});
      return new Response(format==='csv'?learningRecordsCsv(bundle):JSON.stringify(bundle),{headers:{'Content-Type':format==='csv'?'text/csv; charset=utf-8':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="learning-records.'+format+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(action)throw Error('INVALID_ACTION');await account(user);
    return json(args.classId?await api.getClass(args):await api.listClasses(user.userId));
  } catch(error){return errorResponse(error);}
}

export async function POST(request) {
  try {
    if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) throw new Error('AUTH_REQUIRED');
    const body = await readJson(request, 32 * 1024), api = service(), token = bearer(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('INVALID_BODY');
    if (body.action === 'join') return json(await api.joinClass({ classCode: body.classCode, memberCode: body.memberCode, pin: body.pin }));
    if (token) throw new Error('AUTH_REQUIRED');
    const { user } = resolveIdentity(request, getEnv());
    if (!user) throw new Error('AUTH_REQUIRED'); await account(user);
    const args = { ownerAccountId: user.userId, classId: body.classId, memberId: body.memberId };
    switch (body.action) {
      case 'records-backfill': return json(await api.backfill({...args,cursor:body.cursor??null}));
      case 'learning-plan-suggest': return json(await api.suggestPlan(args));
      case 'learning-plan-save': return json(await api.savePlan({...args,planId:body.planId,revision:body.revision,body:body.body,status:body.status}));
      case 'learning-plan-delete': return json(await api.deletePlan({...args,planId:body.planId,revision:body.revision}));
      case 'create': return json(await api.createClass({ ownerAccountId: user.userId, title: body.title, requestId: body.requestId }));
      case 'update': return json(await api.updateClass({ ...args, title: body.title }));
      case 'delete': return json(await api.deleteClass({ ...args, confirmTitle: body.confirmTitle }));
      case 'team-create': return json(await api.createTeam({ ...args, title: body.title, requestId: body.requestId }));
      case 'team-delete': return json(await api.deleteTeam({ ...args, teamId: body.teamId, confirmTitle: body.confirmTitle }));
      case 'member-add': return json(await api.addMember({ ...args, name: body.name, teamId: body.teamId, requestId: body.requestId }));
      case 'member-update': return json(await api.updateMember({ ...args, name: body.name, teamId: body.teamId }));
      case 'member-revoke': return json(await api.revokeMember(args));
      case 'member-delete': return json(await api.deleteMember({ ...args, confirmName: body.confirmName, confirmCode: body.confirmCode }));
      case 'member-reset-pin': return json(await api.resetMemberPin(args));
      default: throw new Error('INVALID_ACTION');
    }
  } catch (error) { return errorResponse(error); }
}
