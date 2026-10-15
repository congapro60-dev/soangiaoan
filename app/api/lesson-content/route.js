import {resolveIdentity} from '../../../lib/account-room-access.js';
import {db,getEnv} from '../../../lib/storage.js';
import {listAuthoredLessons,getAuthoredLesson} from '../../../lib/lesson/authored-content.js';
import {getSemesterExam,listSemesterExams} from '../../../lib/lesson/semester-content.js';
import {canAccessTeacherSolutions} from '../../../lib/lesson/teacher-access.js';
export const dynamic='force-dynamic';
export async function GET(request){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!resolveIdentity(request,getEnv()).user)return json({error:'AUTH_REQUIRED'},401);
 const query=new URL(request.url).searchParams;
 if(query.has('exam')){
  if([...query.keys()].some(key=>!['exam','format'].includes(key))||query.getAll('exam').length!==1||query.getAll('format').length>1||!['questions','solutions'].includes(query.get('format')))return json({error:'INVALID_QUERY'},400);
  const exam=await getSemesterExam(query.get('exam'));
  if(!exam)return json({error:'NOT_FOUND'},404);
  const format=query.get('format');
  if(format==='solutions'){
   const identity=resolveIdentity(request,getEnv());
   const systemHost=identity.user&&!identity.isRootUser?await db().prepare('SELECT role,revoked_at FROM system_hosts WHERE account_id=?').bind(identity.user.userId).first():null;
   if(!canAccessTeacherSolutions({...identity,systemHost}))return json({error:'FORBIDDEN'},403);
  }
  return new Response(format==='questions'?exam.questionText:exam.teacherSolutions,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="${query.get('exam')}-${format}.txt"`}});
 }
 if([...query.keys()].some(key=>key!=='id')||query.getAll('id').length>1)return json({error:'INVALID_QUERY'},400);
 if(!query.has('id'))return json({lessons:listAuthoredLessons(),exams:listSemesterExams()});
 const pkg=await getAuthoredLesson(query.get('id'));return pkg?json({package:pkg}):json({error:'NOT_FOUND'},404);
}
