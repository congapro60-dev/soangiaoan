import {db,getEnv} from '../../../lib/storage.js';
import {resolveIdentity} from '../../../lib/account-room-access.js';
import {createSiteTrashService} from '../../../lib/site-trash.js';
import {createLessonService} from '../../../lib/lesson/service.js';
import {createLessonSourceService} from '../../../lib/lesson/source-service.js';
import {createLessonGenerationService} from '../../../lib/lesson/generation-service.js';
import {createLessonClassService} from '../../../lib/lesson/class-service.js';
import {createLessonLeagueService} from '../../../lib/lesson/league-service.js';
import {createExamService} from '../../../lib/exam/service.js';
import {readJson} from '../../../lib/exam/http.js';
export const dynamic='force-dynamic';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const error=issue=>json({error:/^[A-Z][A-Z0-9_]*$/.test(issue.message)?issue.message:'TRASH_UNAVAILABLE'},issue.message==='AUTH_REQUIRED'?401:issue.message==='FORBIDDEN'?403:issue.message==='NOT_FOUND'?404:issue.message?.includes('CONFLICT')?409:400);
async function actor(request){const identity=resolveIdentity(request,getEnv());if(!identity.user)throw Error('AUTH_REQUIRED');if(!identity.isRootUser&&await db().prepare('SELECT account_id FROM system_hosts WHERE account_id=? AND revoked_at IS NOT NULL').bind(identity.user.userId).first())throw Error('FORBIDDEN');return identity;}
export async function GET(request){
  try{
    const {user}=await actor(request);
    const query=new URL(request.url).searchParams;
    if([...query.keys()].some(key=>key!=='offset'))throw Error('INVALID_QUERY');
    return json(await createSiteTrashService({db:db()}).list({ownerAccountId:user.userId,offset:Number(query.get('offset')||0)}));
  }catch(issue){return error(issue);}
}
export async function POST(request){
  try{
    if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin)throw Error('FORBIDDEN');
    const {user,isRootUser}=await actor(request);
    const body=await readJson(request,4096);
    if(!body||Array.isArray(body)||Object.keys(body).some(key=>!['action','kind','id'].includes(key))||body.action!=='restore'||typeof body.kind!=='string'||typeof body.id!=='string'||!body.id||body.id.length>256)throw Error('INVALID_BODY');
    const args={ownerAccountId:user.userId,kind:body.kind,id:body.id,objectId:body.id};
    const database=db();
    let result;
    if(body.kind==='room')result=await createSiteTrashService({db:database}).restoreRoom({...args,isRoot:isRootUser});
    else if(body.kind==='game-team')result=await createSiteTrashService({db:database}).restoreTeam({...args,isRoot:isRootUser});
    else if(['package','plan'].includes(body.kind))result=await createLessonService({db:database}).restoreContent(args);
    else if(body.kind==='lesson-learner')result=await createLessonService({db:database}).restoreTrashLearner(args);
    else if(body.kind==='source')result=await createLessonSourceService({db:database}).restore(args);
    else if(body.kind==='job')result=await createLessonGenerationService({db:database,sourceService:createLessonSourceService({db:database,bucket:getEnv().LESSON_SOURCES})}).restore(args);
    else if(['class','class-team','class-member'].includes(body.kind))result=await createLessonClassService({db:database}).restoreTrash(args);
    else if(['league','league-class','league-round'].includes(body.kind))result=await createLessonLeagueService({db:database}).restoreTrash(args);
    else if(['exam','exam_attempt','exam_asset','exam_structure'].includes(body.kind))result=await createExamService({db:database}).restoreTrash(args);
    else throw Error('INVALID_ACTION');
    return json(result);
  }catch(issue){return error(issue);}
}
