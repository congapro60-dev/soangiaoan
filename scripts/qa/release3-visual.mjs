// Synthetic reducer projections; all API traffic intercepted. No classroom records written.
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {createLessonSession,reduceLessonSession} from '../../lib/lesson/runtime.js';
import {serializeForStudent,serializeForTeacher} from '../../lib/lesson/serialize.js';
import {recordTaskSubmission,recordHintAssistance} from '../../lib/lesson/passport.js';
const base=process.argv[2]||'http://127.0.0.1:5173';
assert.ok(['127.0.0.1','mat-ma-da-gioi.cuong-vuviet.chatgpt.site'].includes(new URL(base).hostname));
const production=new URL(base).hostname!=='127.0.0.1';
const output='tasks/qa-release3';mkdirSync(output,{recursive:true});
const pkg=JSON.parse(readFileSync('content/lessons/g11-sequences-p1.json','utf8'));
const now=Date.now();let state=createLessonSession({package:pkg,hostId:'qa-host',sessionId:'qa-release3',now:now-600000,
 learners:Array.from({length:5},(_,i)=>({id:'qa-'+i,name:'HS kiểm thử '+(i+1)}))});
function command(type,time,payload={}){
 const next=reduceLessonSession(state,{eventId:type+'-'+state.revision,type,activityId:state.timeline.currentActivityId,round:state.round,revision:state.revision,payload},{actor:{role:'teacher',id:'qa-host'},now:time});
 assert.ok(next.result.ok,JSON.stringify(next.result));state=next.state;
}
command('START',now-600000);for(let i=0;i<5;i++)command('NEXT',now-599990+i);command('EXTEND',now-599980,{minutes:10});
for(let i=0;i<5;i++){const id='qa-'+i;state.roster[id].mascot=i%8;state.diceTrack[id].position=48;state.gateHistory[id]={round:1,activityId:'act-recheck',gatePosition:48,enteredAt:now-500000+i*10000,activeMs:500000-i*10000,updatedAt:now};}
state.submissions={
 w1:{submissionId:'w1',learnerId:'qa-1',taskId:'task-recheck-18',activityId:'act-recheck',at:now-10000,ok:false,assessmentStatus:'assessed'},
 w2:{submissionId:'w2',learnerId:'qa-2',taskId:'task-recheck-18',activityId:'act-recheck',at:now-9000,ok:false,assessmentStatus:'assessed'},
 p:{submissionId:'p',learnerId:'qa-3',taskId:'task-recheck-19',activityId:'act-recheck',at:now-8000,ok:false,assessmentStatus:'pending'}
};state.openAssessments={p:{submissionId:'p',learnerId:'qa-3',taskId:'task-recheck-19',activityId:'act-recheck',status:'pending',createdAt:now-8000}};
const teacher=serializeForTeacher(state,now);
let passport=state.passports['qa-0'];
for(const [index,taskId] of ['task-recheck-18','task-exit-ticket'].entries())passport=recordTaskSubmission(passport,{submissionId:'own'+index,taskId,activityId:index?'act-exit':'act-recheck',answer:'synthetic',ok:true,now:now+index},pkg);
state.passports['qa-0']=passport;
let supported=recordHintAssistance(state.passports['qa-1'],{taskId:'task-recheck-19',hintId:'qa-hint',tier:'H1',now});
supported=recordTaskSubmission(supported,{submissionId:'help',taskId:'task-recheck-19',activityId:'act-recheck',answer:'synthetic',ok:true,now},pkg);state.passports['qa-1']=supported;
command('CONCLUDE',now+1000);
const student=serializeForStudent(state,'qa-0');const assisted=serializeForStudent(state,'qa-1');
assert.equal(student.status,'concluded');assert.ok(student.passportCard);assert.equal(student.passportCard.objectives[0].status,'independent');
const port=9550+Math.floor(Math.random()*70);const proc=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(path.join(os.tmpdir(),'release3-qa-'))}`,'--no-first-run','about:blank'],{stdio:'ignore',windowsHide:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));let socket;let current='student';const report={environment:base,syntheticProjection:true,productionWrites:0,screenshots:[],checks:[]};
try{
 let page;for(let i=0;i<60&&!page;i++){try{page=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page')}catch{}if(!page)await pause(200)}assert.ok(page);
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r);socket.addEventListener('error',j)});let sequence=0;const pending=new Map();const errors=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'))},20000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});socket.send(JSON.stringify({id,method,params}))});
 socket.addEventListener('message',async event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const t=pending.get(m.id);pending.delete(m.id);m.error?t.reject(Error(m.error.message)):t.resolve(m.result)}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  if(m.method!=='Fetch.requestPaused')return;const {requestId,request}=m.params;const u=new URL(request.url);let body;
  if(u.pathname==='/api/lesson-sessions')body={view:current==='teacher'?teacher:current==='assisted'?assisted:student,revision:state.revision,serverNow:Date.now()};
  else if(u.pathname==='/api/lessons/proposal')body={capabilities:{enabled:false},enabled:false};
  else if(u.searchParams.get('kind')==='list')body={packages:[]};
  else body={package:pkg,lesson:pkg};
  await send('Fetch.fulfillRequest',{requestId,responseCode:request.method==='GET'?200:409,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(request.method==='GET'?body:{error:'QA_READ_ONLY'})).toString('base64')});
 });
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 const wait=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression).catch(()=>false))return;await pause(200)}throw Error('UI timeout: '+expression)};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${output}/${name}.png`,Buffer.from(r.data,'base64'));report.screenshots.push(name)};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 if(!production)await send('Network.setExtraHTTPHeaders',{headers:{'oai-authenticated-user-id':'qa-layout-host','oai-authenticated-user-email':'qa-layout@example.invalid'}});
 await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/*'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('lesson_active_session_id','qa-release3');sessionStorage.setItem('lesson_active_learner_id','qa-0');sessionStorage.setItem('lesson_active_token','synthetic-qa-token');sessionStorage.setItem('active_teacher_session','qa-release3');"});
 for(const width of [375,1280]){
  current='student';await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});await send('Page.navigate',{url:base+'/play'});
  await wait("!!document.querySelector('.passport-card')");await evaluate("document.querySelector('.play-encounter-fab')?.click()");await wait("document.querySelector('.passport-card')?.innerText.length>0");await evaluate("document.querySelector('.passport-card').scrollIntoView({block:'start'})");await pause(300);
  const layout=await evaluate("(()=>{const e=document.querySelector('.passport-card'),r=e.getBoundingClientRect();return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,left:r.left,right:r.right,text:e.innerText}})()");
  assert.ok(layout.scrollWidth<=width&&layout.left>=0&&layout.right<=width,JSON.stringify(layout));assert.match(layout.text,/tự làm|Tự làm/);report.checks.push(layout);await shot((production?'production-':'')+'passport-'+width);
 }
 if(!production){
  current='assisted';await send('Page.navigate',{url:base+'/play'});await wait("!!document.querySelector('.passport-card')");await evaluate("document.querySelector('.play-encounter-fab')?.click();document.querySelector('.passport-card').scrollIntoView({block:'start'})");await shot('passport-supported-1280');
  current='teacher';await send('Page.navigate',{url:base+'/lessons'});await wait("document.body.innerText.includes('Đến phòng điều hành')");await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Đến phòng điều hành')).click()");await wait("document.querySelectorAll('.cockpit-action').length===3");await evaluate("document.querySelector('.cockpit-actions').scrollIntoView({block:'start'})");
  const actions=await evaluate("[...document.querySelectorAll('.cockpit-action')].map(e=>({className:e.className,text:e.innerText}))");assert.ok(actions.some(a=>a.className.includes('support'))&&actions.some(a=>a.className.includes('error'))&&actions.some(a=>a.className.includes('review')));report.checks.push({actions});await shot('cockpit-actions-1280');
 }
 assert.equal(errors.length,0,errors.join('\n'));writeFileSync(`${output}/${production?'production-':''}visual-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{socket?.close();proc.kill()}
