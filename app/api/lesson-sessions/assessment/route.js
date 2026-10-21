import { db, getEnv } from '../../../../lib/storage.js';
import { resolveIdentity } from '../../../../lib/account-room-access.js';
import { createLessonService } from '../../../../lib/lesson/service.js';
import { loadStoredAI } from '../../../../lib/ai-settings.js';
import { lessonAIConfig } from '../../../../lib/lesson/generation-provider.js';
import { createAssessmentAI, generateAssessmentProposal } from '../../../../lib/lesson/assessment-ai.js';

export const dynamic='force-dynamic';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const known=new Set(['FORBIDDEN','NOT_FOUND','INVALID_BODY','AI_PROVIDER_OFF','AI_CONSENT_REQUIRED','REQUEST_ID_CONFLICT','AI_IN_PROGRESS','AI_ASSESSMENT_FAILED','NO_PENDING_ASSESSMENTS','ASSESSMENT_SOURCE_CHANGED','AI_INVALID_PROPOSAL','AI_NETWORK_ERROR','AI_QUOTA_EXCEEDED','ASSESSMENT_ANSWER_TOO_LARGE','ASSESSMENT_CRITERIA_REQUIRED','ASSESSMENT_BATCH_TOO_LARGE','ASSESSMENT_APPLY_UNAVAILABLE','INVALID_AUTOMATIC_ASSESSMENT_BATCH']);
export async function POST(request){
 const env=getEnv(),{user}=resolveIdentity(request,env);
 if(!user)return json({error:'AUTH_REQUIRED'},401);
 try{
  const reader=request.body?.getReader();if(!reader)throw Error('INVALID_BODY');
  const chunks=[];let bytes=0;
  for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>2048){await reader.cancel();throw Error('INVALID_BODY');}chunks.push(part.value);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('INVALID_BODY');}
  const keys=body?.action==='preview'?['action','id']:body?.action==='automatic'?['action','id','requestId']:['action','id','fingerprint','requestId','confirmed'];
  if(!body||typeof body!=='object'||Array.isArray(body)||!['preview','propose','automatic'].includes(body.action)||Object.keys(body).length!==keys.length||keys.some(k=>!Object.hasOwn(body,k))||typeof body.id!=='string'||!body.id||body.id.length>128||body.action==='automatic'&&(typeof body.requestId!=='string'||!/^[-\w]{1,120}$/.test(body.requestId)))throw Error('INVALID_BODY');
  const database=db(),lessonService=createLessonService({db:database});
  await lessonService.assessmentContext({id:body.id,accountId:user.userId});
  await loadStoredAI(database);
  const api=createAssessmentAI({db:database,lessonService,getConfig:()=>lessonAIConfig(env),generate:generateAssessmentProposal});
  return json(await api[body.action]({...body,accountId:user.userId}));
 }catch(error){
  const code=known.has(error.message)?error.message:'ASSESSMENT_UNAVAILABLE';
  return json({error:code},code==='FORBIDDEN'?403:code==='NOT_FOUND'?404:code==='ASSESSMENT_UNAVAILABLE'?503:400);
 }
}
