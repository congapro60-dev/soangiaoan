import {resolveIdentity} from '../../../lib/account-room-access.js';
import {getEnv} from '../../../lib/storage.js';
import {listAuthoredLessons,getAuthoredLesson} from '../../../lib/lesson/authored-content.js';
export const dynamic='force-dynamic';
export async function GET(request){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!resolveIdentity(request,getEnv()).user)return json({error:'AUTH_REQUIRED'},401);
 const query=new URL(request.url).searchParams;
 if([...query.keys()].some(key=>key!=='id')||query.getAll('id').length>1)return json({error:'INVALID_QUERY'},400);
 if(!query.has('id'))return json({lessons:listAuthoredLessons()});
 const pkg=getAuthoredLesson(query.get('id'));return pkg?json({package:pkg}):json({error:'NOT_FOUND'},404);
}
