import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,readdir,stat,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createLessonService} from '../../lib/lesson/service.js';
import {packLessonState,unpackLessonState} from '../../lib/lesson/state-storage.js';
import {getAuthoredLesson} from '../../lib/lesson/authored-content.js';

const root=resolve(import.meta.dirname,'../..'), serverRoot=join(root,'dist/server'),assets=join(root,'dist/client');
const req=createRequire(import.meta.url),wrangler=req.resolve('wrangler');
const {Miniflare}=await import(pathToFileURL(req.resolve('miniflare',{paths:[wrangler]})).href);
const files=(await readdir(serverRoot,{recursive:true})).filter(x=>x.endsWith('.js'));
const owner='qa-r25-teacher',teacherHeaders={'oai-authenticated-user-id':owner,'oai-authenticated-user-email':'qa-r25@example.invalid','oai-authenticated-user-full-name':'QA R25 Teacher'};
let calls=0;
const mf=new Miniflare({rootPath:serverRoot,modules:files.map(file=>({type:'ESModule',path:join(serverRoot,file)})),scriptPath:join(serverRoot,'index.js'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'qa-r25'},r2Buckets:{LESSON_SOURCES:'qa-r25'},bindings:{LESSON_AI_ENABLED:'true',LESSON_AI_ENDPOINT:'https://qa-r25.invalid/chat',LESSON_AI_MODEL:'mock',LESSON_AI_API_KEY:'FAKE-QA-ONLY'},outboundService:async request=>{
 if(new URL(request.url).host!=='qa-r25.invalid')return new Response('No external requests permitted',{status:403});
 calls++;const body=await request.json(),items=JSON.parse(body.messages[1].content);
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(items.map(item=>({ref:item.ref,criteriaMet:true,feedback:'Đề xuất giả: dùng đúng công thức.'})))}}]});
}});
const base=String(await mf.ready).replace(/\/$/,''),db=await mf.getD1Database('DB');
for(const entry of JSON.parse(await readFile(join(root,'drizzle/meta/_journal.json'),'utf8')).entries)
 for(const sql of (await readFile(join(root,'drizzle',entry.tag+'.sql'),'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
await db.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').bind(owner,'qa-r25@example.invalid','QA R25 Teacher',Date.now()).run();
const service=createLessonService({db}),pkg=JSON.parse(await readFile(join(root,'content/lessons/g11-sequences-p1.json'),'utf8'));
const saved=await service.savePackage({ownerAccountId:owner,package:pkg});
const room=await service.createSession({ownerAccountId:owner,packageRowId:saved.row.rowId,mode:'preview',title:'QA R25 — dữ liệu giả',requestId:'qa-r25-room',teacherSetup:undefined});
const pupil=await service.joinSession({code:room.session.code,name:'QA R25 Pupil'});
let original=await db.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(room.session.id).first();
let state=unpackLessonState(JSON.parse(original.state));state.status='concluded';state.timeline.activityIndex=7;state.timeline.currentActivityId='act-exit';state.timeline.currentPhase='exit';
state.clock.startedAt=Date.now()-300000;state.clock.activityDeadline=Date.now()-1000;
state.selfProgress={[pupil.learnerId]:7};
state.submissions={'qa-r25-exit':{submissionId:'qa-r25-exit',learnerId:pupil.learnerId,taskId:'task-exit-ticket',activityId:'act-exit',answer:'QA R25 Pupil: dùng công thức tổng cấp số cộng.',ok:false,assessmentStatus:'pending',at:Date.now()}};
state.openAssessments={'qa-r25-exit':{...state.submissions['qa-r25-exit'],status:'pending'}};
await db.prepare("UPDATE lesson_sessions SET state=?,status='concluded' WHERE id=?").bind(JSON.stringify(packLessonState(state)),room.session.id).run();

const api=async(path,body,headers=teacherHeaders)=>{
 const response=await mf.dispatchFetch(base+path,{method:body?'POST':'GET',headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 return {status:response.status,body:await response.json()};
};
assert.equal((await api('/api/lesson-sessions/assessment',{action:'preview',id:room.session.id},{})).status,401);
const preview=await api('/api/lesson-sessions/assessment',{action:'preview',id:room.session.id});
assert.equal(preview.status,200,JSON.stringify(preview.body));assert.equal(preview.body.batch.count,1);
assert.doesNotMatch(JSON.stringify(preview.body.batch),/QA R25 Pupil|FAKE-QA-ONLY/);
const input={action:'propose',id:room.session.id,fingerprint:preview.body.batch.fingerprint,requestId:'native-r25',confirmed:true};
const proposed=await api('/api/lesson-sessions/assessment',input);assert.equal(proposed.status,200,JSON.stringify(proposed.body));
assert.equal((await api('/api/lesson-sessions/assessment',input)).status,200);assert.equal(calls,1);
let own=await service.getSession({id:room.session.id,accountId:owner});
const approved=await api('/api/lesson-sessions',{action:'event',id:room.session.id,event:{eventId:'qa-r25-approve',type:'ASSESS_BATCH_APPLY',round:own.view.round,revision:own.revision,payload:{requestId:'native-r25',assessments:proposed.body.proposal.assessments}}});
assert.equal(approved.status,200,JSON.stringify(approved.body));
const student=await service.getSession({id:room.session.id,learnerToken:pupil.token});
assert.equal(student.view.learningEvidence.items[0].criteriaMet,true);assert.equal(student.view.learningEvidence.stats,undefined);
const pupilHeaders={Authorization:'Bearer '+pupil.token};
const sentReport=await api('/api/lesson-sessions/reports',{action:'submit',id:room.session.id,requestId:'native-report',category:'question_repeated',description:'QA native: câu hỏi giống nhau chỉ đổi số.'},pupilHeaders);
assert.equal(sentReport.status,200,JSON.stringify(sentReport.body));
assert.equal((await api('/api/lesson-sessions/reports?id='+room.session.id,null,pupilHeaders)).status,401);
const listedReports=await api('/api/lesson-sessions/reports?id='+room.session.id);
assert.equal(listedReports.status,200);assert.equal(listedReports.body.reports.length,1);
assert.equal((await api('/api/lesson-sessions/reports',{action:'update',id:room.session.id,reportId:sentReport.body.reportId,status:'archived'})).status,200);
assert.equal((await api('/api/lesson-sessions/reports',{action:'update',id:room.session.id,reportId:sentReport.body.reportId,status:'restore'})).status,200);
const planePackage=await service.savePackage({ownerAccountId:owner,package:await getAuthoredLesson('r22-g11-discover-r106')});
const planeRoom=await service.createSession({ownerAccountId:owner,packageRowId:planePackage.row.rowId,mode:'preview',title:'QA Hai mặt phẳng song song',requestId:'qa-plane-room'});
// Recreate one pending exit for the browser to review against the real native route.
const latest=await db.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(room.session.id).first();
state=unpackLessonState(JSON.parse(latest.state));state.submissions['qa-r25-exit'].assessmentStatus='pending';state.submissions['qa-r25-exit'].ok=false;state.openAssessments['qa-r25-exit'].status='pending';
delete state.openAssessments['qa-r25-exit'].feedback;
await db.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').bind(JSON.stringify(packLessonState(state)),room.session.id).run();
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.woff2':'font/woff2','.glb':'model/gltf-binary','.svg':'image/svg+xml'};
function proxy(port,teacher){
 const server=createServer(async(request,response)=>{
  try{
   const url=new URL(request.url,'http://127.0.0.1:'+port),file=resolve(assets,'.'+decodeURIComponent(url.pathname));
   if(file.startsWith(assets+sep)&&(await stat(file).catch(()=>null))?.isFile()){
    response.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});response.end(await readFile(file));return;
   }
   const headers=new Headers();
   for(const[key,value]of Object.entries(request.headers))if(!['host','content-length','connection','accept-encoding'].includes(key)&&!key.startsWith('oai-authenticated-'))headers.set(key,Array.isArray(value)?value.join(','):value);
   if(teacher)for(const[key,value]of Object.entries(teacherHeaders))headers.set(key,value);
   if(headers.has('origin')){if(headers.get('origin')!=='http://127.0.0.1:'+port){response.writeHead(403);response.end('QA origin denied');return;}headers.set('origin',base);}
   const body=[];for await(const part of request)body.push(part);
   const result=await mf.dispatchFetch(base+url.pathname+url.search,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:Buffer.concat(body)});
   response.writeHead(result.status,Object.fromEntries([...result.headers].filter(([key])=>!['content-length','content-encoding','transfer-encoding'].includes(key))));
   response.end(Buffer.from(await result.arrayBuffer()));
  }catch{response.writeHead(503);response.end('QA unavailable');}
 });
 server.listen(port,'127.0.0.1');return server;
}
const teachers=proxy(5217,true),pupils=proxy(5218,false);
const report={status:'NATIVE_HTTP_PASS',productionTouched:false,provider:'local fake only',providerCalls:calls,teacherUrl:'http://127.0.0.1:5217/lessons?session='+room.session.id,pupilUrl:'http://127.0.0.1:5218/play?code='+room.session.code,pupilName:'QA R25 Pupil',planeTeacherUrl:'http://127.0.0.1:5217/lessons?session='+planeRoom.session.id,planePupilUrl:'http://127.0.0.1:5218/play?code='+planeRoom.session.code,checks:['migrations 0000–0026','anonymous denied','actual native assessment route','consent preview redaction','provider proposal durable replay once','GV batch apply after concluded','own result privacy','report native submit/list/deny/archive/restore','r106 room from repaired authored package']};
await mkdir(join(root,'tasks/r25'),{recursive:true});await writeFile(join(root,'tasks/r25/native-qa.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{teachers.close();pupils.close();await mf.dispose();process.exit(0);});
await new Promise(()=>{});
