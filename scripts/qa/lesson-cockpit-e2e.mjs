// Synthetic session; API interception prevents all shared classroom writes.
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createLessonSession, reduceLessonSession } from '../../lib/lesson/runtime.js';
import { serializeForTeacher, serializeForPresenter } from '../../lib/lesson/serialize.js';
import { pilotDraft } from '../../lib/lesson/director.js';
import { cockpitLearners } from '../../lib/lesson/cockpit.js';

const base = 'http://127.0.0.1:5173';
const output = 'tasks/qa-cockpit'; mkdirSync(output, { recursive: true });
const pkg = JSON.parse(readFileSync('content/lessons/g11-sequences-p1.json', 'utf8'));
const start = Date.now() - 540000;
let state = createLessonSession({ package: pkg, hostId: 'qa-host', sessionId: 'qa-cockpit', now: start,
  learners: Array.from({ length: 50 }, (_, i) => ({ id: 'qa-' + i, name: `HS kiểm thử ${String(i + 1).padStart(2, '0')}` })) });
const command = (type, now, payload = {}, learnerId) => {
  const result = reduceLessonSession(state, { type, eventId: `qa-${state.revision}-${type}`, round: state.round, revision: state.revision,
    activityId: state.timeline.currentActivityId, payload }, { now, actor: { role: learnerId ? 'student' : 'teacher', id: learnerId || 'qa-host' } });
  assert.ok(result.result.ok, JSON.stringify(result.result)); state = result.state;
};
command('START', start);
for (let i = 0; i < 5; i++) command('NEXT', start + i + 1);
// Extend before the original recheck deadline, so old arrivals remain actionable today.
command('EXTEND', start + 10, { minutes: 10 });
for (let i = 0; i < 50; i++) {
  const id = 'qa-' + i; state.roster[id].mascot = i % 8;
  while (state.diceTrack[id].position < 48) command('ROLL', start + 1000 + i * 1000, {}, id);
}
state.gamePlan = pilotDraft({ package: pkg, theme: 'academy', map: 'academy', seed: 42 }).plan;
state.roster['qa-0'].mascot = 1; // The first selectable peer also exercises the owl hit target.
state.roster['qa-1'].present = false; delete state.gateHistory['qa-1'];
for (const [id, learnerId, at] of [['wrong1','qa-44',start+100000],['wrong2','qa-44',start+200000]]) {
  state.submissions[id] = { submissionId: id, learnerId, taskId: 'task-recheck-18', activityId: 'act-recheck', at, ok: false, assessmentStatus: 'assessed' };
}
delete state.gateHistory['qa-44'];
// Two all-submitted states: completed and awaiting teacher review, neither needs a timer warning.
for (const i of [47,48]) for (const [j, taskId] of ['task-recheck-18','task-recheck-19'].entries()) {
  const id = `done-${i}-${j}`;
  state.submissions[id] = { submissionId: id, learnerId: 'qa-'+i, taskId, activityId: 'act-recheck', at: start+210000+j,
    ok: i===47 || j===0, assessmentStatus: i===48 && j===1 ? 'pending' : 'assessed' };
}
state.passports['qa-0'].supportHistory = [{ taskId:'task-recheck-18',hintId:'h1',tier:'H1',at:start+205000 }];
const rows = () => cockpitLearners(serializeForTeacher(state, Date.now()), 5);
const expected = rows().filter(r=>r.needsSupport).sort((a,b)=>(b.activeMs??-1)-(a.activeMs??-1)||b.wrongRechecks-a.wrongRechecks).map(r=>r.name);
assert.equal(expected.length,47);
const report = { fixture:'50 synthetic learners; 1 absent; 47 need support; 1 complete; 1 awaiting review', screenshots:[], selected:[], blockedPosts:0, privacy:false };
const port = 9650 + Math.floor(Math.random()*100);
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(path.join(tmpdir(),'cockpit-qa-'))}`, '--no-first-run','about:blank'], { stdio:'ignore', windowsHide:true });
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try {
  let page;
  for (let i=0;i<60&&!page;i++) { try { page=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page'); } catch { /* startup */ } if(!page)await pause(200); }
  assert.ok(page); socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve);socket.addEventListener('error',reject)});
  let seq=0; const pending=new Map(); const errors=[];
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},20000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});socket.send(JSON.stringify({id,method,params}))});
  socket.addEventListener('message',async event=>{
    const msg=JSON.parse(event.data);
    if(msg.id&&pending.has(msg.id)){const task=pending.get(msg.id);pending.delete(msg.id);if(msg.error)task.reject(Error(msg.error.message));else task.resolve(msg.result)}
    if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);
    if(msg.method!=='Fetch.requestPaused')return;
    const {requestId,request}=msg.params;const url=new URL(request.url);let payload;
    if(request.method!=='GET')report.blockedPosts++;
    if(url.pathname==='/api/lesson-sessions')payload={view:url.searchParams.get('kind')==='presenter'?serializeForPresenter(state):serializeForTeacher(state,Date.now()),revision:state.revision,serverNow:Date.now()};
    else if(url.pathname==='/api/lessons/proposal')payload={capabilities:{enabled:false},enabled:false};
    else if(url.searchParams.get('kind')==='list')payload={packages:[]};
    else if(url.searchParams.get('kind')==='director')payload={status:'draft',plan:null};
    else payload={package:pkg,lesson:pkg};
    await send('Fetch.fulfillRequest',{requestId,responseCode:request.method==='GET'?200:409,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(request.method==='GET'?payload:{error:'QA_READ_ONLY'})).toString('base64')});
  });
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
  const wait=async(expression,label)=>{for(let i=0;i<100;i++){if(await evaluate(expression).catch(()=>false))return;await pause(200)}console.log(JSON.stringify({label,errors,frame:await evaluate("document.querySelector('iframe')?.contentDocument?.body.innerText.slice(-1200)")}));throw Error('Timeout '+label)};
  const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${output}/${name}.png`,Buffer.from(r.data,'base64'));report.screenshots.push(name)};
  const tapMap=async selector=>{
    const point=await evaluate(`(()=>{const f=document.querySelector('iframe'),e=f.contentDocument.querySelector(${JSON.stringify(selector)});if(!e)return null;const a=f.getBoundingClientRect(),r=e.getBoundingClientRect();return{x:a.left+r.left+r.width/2,y:a.top+r.top+r.height/2,w:r.width,h:r.height}})()`);
    assert.ok(point,'Missing map target '+selector);assert.ok(point.w>=44&&point.h>=44,'Map target under44px');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
  };
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setExtraHTTPHeaders',{headers:{'oai-authenticated-user-id':'qa-layout-host','oai-authenticated-user-email':'qa-layout@example.invalid'}});
  await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/*'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('active_teacher_session','qa-cockpit');"});
  for(const [width,height] of [[1280,1000],[1920,1080]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:base+'/lessons'});await wait("document.body.innerText.includes('Đến phòng điều hành')",'teacher studio');
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Đến phòng điều hành')).click()");
    await wait("document.querySelector('.cockpit-support-list')?.children.length===47",'support list');
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.cockpit-support-list strong')].map(e=>e.textContent)"),expected);
    if(width===1280){
      const changeMinutes=value=>evaluate(`(()=>{const e=document.querySelector('.cockpit-support-threshold input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await changeMinutes('10');await wait("document.querySelector('.cockpit-support-list')?.children.length===1",'teacher threshold10');
      await changeMinutes('5');await wait("document.querySelector('.cockpit-support-list')?.children.length===47",'teacher threshold5');report.threshold=true;
    }
    await wait("!!document.querySelector('iframe')?.contentDocument?.querySelector('[data-action=map-menu]')",'map');
    // The model may stack every peer; inspect available aggregate and choose the actual pupil.
    await evaluate("document.querySelector('iframe').scrollIntoView({block:'start'})");
    await pause(800);
    report.mapSelectors=await evaluate("[...document.querySelector('iframe').contentDocument.querySelectorAll('button')].filter(b=>b.offsetWidth>0).map(b=>({action:b.dataset.action,peer:b.dataset.peerId,text:b.textContent.slice(0,40)}))");
    await tapMap('[data-peer-id="m0"]');
    await wait("document.querySelector('.cockpit-peer-card')?.textContent.includes('HS kiểm thử 01')",'selected card');
    const selected=await evaluate("document.querySelector('.cockpit-peer-card').innerText");assert.match(selected,/server/);assert.match(selected,/1 lượt/);
    report.selected.push(selected);
    await tapMap('[data-peer-ids]');
    await wait("document.querySelector('iframe').contentDocument.querySelector('#lmPeerChooser')?.open",'2D aggregate chooser');
    const hidden=await evaluate("document.querySelector('iframe').contentDocument.querySelector('#lmPeerChooser [data-peer-id]')?.dataset.peerId");
    assert.ok(hidden);const hiddenName=state.roster[Object.keys(state.roster)[Number(hidden.slice(1))]].name;
    await tapMap(`#lmPeerChooser [data-peer-id="${hidden}"]`);
    await wait(`document.querySelector('.cockpit-peer-card')?.textContent.includes(${JSON.stringify(hiddenName)})`,'aggregate selected card');
    report.aggregateSelected=hiddenName;
    // Return to the first card for a readable evidence screenshot.
    await evaluate("document.querySelector('.cockpit-support-list button').click()");
    await evaluate("document.querySelector('.cockpit-peer-card').scrollIntoView({block:'nearest'})");await shot('cockpit-'+width);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    if(width===1280){
      await evaluate("document.querySelector('iframe').scrollIntoView({block:'start'});document.querySelector('iframe').src='/lesson-map.html?debug&q=0'");
      await wait("document.querySelector('iframe').contentWindow.location.search.includes('debug')&&!!document.querySelector('iframe').contentDocument.querySelector('[data-action=map-menu]')",'3D debug map ready');
      await evaluate("document.querySelector('iframe').contentDocument.querySelector('[data-action=map-menu]').click();document.querySelector('iframe').contentDocument.querySelector('[data-mode=\"3d\"]').click()");
      await wait("!!document.querySelector('iframe').contentWindow.__map3d",'3D world');
      await evaluate("document.querySelector('iframe').contentDocument.querySelector('[data-action=map-menu]').click()");
      await pause(2200);
      const selector=await evaluate("[...document.querySelector('iframe').contentDocument.querySelectorAll('button[data-peer-id]')].find(e=>e.offsetWidth>0)?.dataset.peerId");
      assert.ok(selector);await tapMap(`[data-peer-id="${selector}"]`);
      const learner=Object.keys(state.roster)[Number(selector.slice(1))];
      await wait(`document.querySelector('.cockpit-peer-card')?.textContent.includes(${JSON.stringify(state.roster[learner].name)})`,'3D peer selected');
      report.threeDPeer=selector;
      await wait("document.querySelector('iframe').contentWindow.__map3d.stats().owl.active>0",'owl model visible');
      report.owlBeforeGesture=await evaluate("document.querySelector('iframe').contentWindow.__map3d.stats().owl");
      report.threeDStats=await evaluate("document.querySelector('iframe').contentWindow.__map3d.stats()");
      await evaluate("document.querySelector('.cockpit-workspace').scrollIntoView({block:'start'})");await shot('cockpit-3d-1280');
      await tapMap('button[data-peer-ids]');await wait("document.querySelector('iframe').contentDocument.querySelector('#lmPeerChooser')?.open",'3D aggregate');
      const aggregateId=await evaluate("document.querySelector('iframe').contentDocument.querySelector('#lmPeerChooser [data-peer-id]')?.dataset.peerId");
      await shot('cockpit-chooser-1280');
      await tapMap(`#lmPeerChooser [data-peer-id="${aggregateId}"]`);report.threeDAggregate=aggregateId;
      await wait(`document.querySelector('.cockpit-peer-card')?.textContent.includes(${JSON.stringify(state.roster[Object.keys(state.roster)[Number(aggregateId.slice(1))]].name)})`,'3D aggregate card');
      await evaluate("window.__qaPeerSelections=0;window.addEventListener('message',e=>{if(e.data?.type==='lesson-map:peer')window.__qaPeerSelections++})");
      const cameraBefore=await evaluate("document.querySelector('iframe').contentWindow.__map3d.read()");
      const cardBeforeDrag=await evaluate("document.querySelector('.cockpit-peer-card .lesson-card-title').textContent");
      const dragPoint=await evaluate(`(()=>{const f=document.querySelector('iframe'),r=f.contentDocument.querySelector('[data-peer-id="${selector}"]').getBoundingClientRect(),a=f.getBoundingClientRect();return{x:a.left+r.left+r.width/2,y:a.top+r.top+r.height/2}})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...dragPoint,button:'left',clickCount:1});
      for(let step=1;step<=5;step++)await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:dragPoint.x+step*6,y:dragPoint.y,button:'left',buttons:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:dragPoint.x+30,y:dragPoint.y,button:'left',clickCount:1});
      await pause(500);
      const cameraAfter=await evaluate("document.querySelector('iframe').contentWindow.__map3d.read()");
      assert.notEqual(cameraAfter.yaw,cameraBefore.yaw,'Drag on owl hit target must turn camera');
      assert.equal(await evaluate('window.__qaPeerSelections'),0,'Drag must not emit peer selection');
      assert.equal(await evaluate("document.querySelector('.cockpit-peer-card .lesson-card-title').textContent"),cardBeforeDrag,'Drag must not select another peer');
      report.threeDDrag=true;
      await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
      const touchBefore=await evaluate("document.querySelector('iframe').contentWindow.__map3d.read()");
      const touchPoint=await evaluate(`(()=>{const f=document.querySelector('iframe'),r=f.contentDocument.querySelector('[data-peer-id="${selector}"]').getBoundingClientRect(),a=f.getBoundingClientRect();f.contentWindow.__qaTouchCancels=0;f.contentDocument.addEventListener('pointercancel',()=>f.contentWindow.__qaTouchCancels++);return{x:a.left+r.left+r.width/2,y:a.top+r.top+r.height/2}})()`);
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touchPoint,id:1}]});
      for(let step=1;step<=5;step++)await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchPoint.x+step*5,y:touchPoint.y,id:1}]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(500);
      const touchAfter=await evaluate("document.querySelector('iframe').contentWindow.__map3d.read()");
      assert.notEqual(touchBefore.yaw,touchAfter.yaw,'Touch drag on owl must turn camera');
      assert.equal(await evaluate("document.querySelector('iframe').contentWindow.__qaTouchCancels"),0,'Native scrolling must not cancel mascot drag');
      report.threeDTouchDrag=true;
      const pinchBefore=await evaluate("document.querySelector('iframe').contentWindow.__map3d.read()");
      const pinchPoint=await evaluate("(()=>{const f=document.querySelector('iframe'),e=[...f.contentDocument.querySelectorAll('button[data-peer-id]')].find(b=>b.offsetWidth>0),r=e.getBoundingClientRect(),a=f.getBoundingClientRect();return{x:a.left+r.left+r.width/2,y:a.top+r.top+r.height/2}})()");
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pinchPoint.x-5,y:pinchPoint.y,id:1},{x:pinchPoint.x+5,y:pinchPoint.y,id:2}]});
      await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pinchPoint.x-20,y:pinchPoint.y,id:1},{x:pinchPoint.x+20,y:pinchPoint.y,id:2}]});
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(500);
      const pinchAfter=await evaluate("document.querySelector('iframe').contentWindow.__map3d.read()");
      assert.notEqual(pinchBefore.dist,pinchAfter.dist,'Touch pinch on peer must zoom camera');
      assert.equal(await evaluate("document.querySelector('iframe').contentWindow.__qaTouchCancels"),0);report.threeDTouchPinch=true;
      await send('Emulation.setTouchEmulationEnabled',{enabled:false});
    }
    await send('Page.reload');await wait("document.body.innerText.includes('Đến phòng điều hành')",'reload');
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Đến phòng điều hành')).click()");await wait("document.querySelector('.cockpit-support-list')?.children.length===47",'reload history');
  }
  command('PAUSE',Date.now());await wait("document.querySelector('.cockpit-support-panel')?.textContent.includes('Chưa có cảnh báo cần hỗ trợ')",'server pause suppresses support');
  command('RESUME',Date.now());await wait("document.querySelector('.cockpit-support-list')?.children.length===47",'server resume restores support');report.pauseResume=true;
  await send('Page.navigate',{url:base+'/presenter?session=qa-cockpit'});
  await wait("document.body.innerText.includes('HOẠT ĐỘNG:')",'TV');
  const tvText=await evaluate('document.body.innerText');assert.doesNotMatch(tvText,/HS kiểm thử|HS cần hỗ trợ|Thông tin học sinh/);
  const tv=serializeForPresenter(state);assert.equal(tv.gateTiming,undefined);assert.equal(tv.gateClockActive,undefined);assert.equal(tv.roster,undefined);
  assert.ok(tv.map.peers.every(p=>p.name===undefined));report.privacy=true;await shot('presenter-1920');
  assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify(report));
  writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));
} finally { socket?.close();proc.kill(); }
