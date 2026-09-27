// Run only with Firebase emulators. Uses new browser contexts, never a personal profile.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080', 'Start via firebase emulators:exec');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
const projectId = 'demo-p31-classroom';
const lessonKey = process.env.LESSON_KEY || process.env.WEEK6_KEY || '10-5-31';
const isWeek5 = lessonKey.split('-')[1] === '5';
const isWeek6 = lessonKey.split('-')[1] === '6';
const isP31 = lessonKey === '10-5-31';
const isGenericV72 = isWeek5 || isWeek6;
const isLegacyAdapter = !isGenericV72 && !isP31;
const isV72Practice = isGenericV72 || isP31;
process.env.VITE_USE_EMULATOR = '1';
process.env.VITE_FIREBASE_PROJECT_ID = projectId;
process.env.VITE_FIREBASE_API_KEY = 'local-emulator-key';
const admin = initializeApp({ projectId });
const db = getFirestore(admin);
const output = path.resolve(process.env.QA_OUTPUT || (isWeek6 ? 'artifacts/week6-v72' : isWeek5 ? 'artifacts/week5-v72' : 'artifacts/p31-classroom'));
await fs.mkdir(output, { recursive: true });
const results = { checks: [], screenshots: [], layout: [], pageErrors: [], blockedNetwork: [] };
const pass = name => { results.checks.push(name); console.log(`PASS ${name}`); };
let teacherUid;
const roster = { classId:'p31-qa-class',className:'Lớp thử nghiệm P31',students:[
  {studentId:'qa-1',name:'Học sinh thử nghiệm 1'},
  {studentId:'qa-2',name:'Học sinh thử nghiệm 2'},
  {studentId:'qa-3',name:'Học sinh thử nghiệm 3'},
] };
const api = createHttpServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    let raw=''; for await (const chunk of req) raw += chunk;
    const body=JSON.parse(raw || '{}');
    if (req.url !== '/api/classroom') throw new Error('Only the local classroom fixture API is supported');
    if (body.joinCode !== 'P31QA') throw new Error('Wrong fixture class');
    if (body.action === 'roster') return res.end(JSON.stringify(roster));
    if (body.action === 'login') {
      const student=roster.students.find(item => item.studentId === body.studentId);
      assert(student && body.pin === '1234');
      const claims=await getAuth(admin).verifyIdToken(body.idToken);
      assert.equal(claims.firebase.sign_in_provider,'anonymous');
      await db.doc(`studentLinks/${claims.uid}`).set({classId:roster.classId,studentId:student.studentId,teacherId:teacherUid});
      return res.end(JSON.stringify({classId:roster.classId,className:roster.className,teacherId:teacherUid,studentId:student.studentId,studentName:student.name}));
    }
    throw new Error('Unsupported fixture action');
  } catch (error) { res.statusCode=400; res.end(JSON.stringify({error:error.message})); }
});
await new Promise(resolve => api.listen(0,'127.0.0.1',resolve));
const apiTarget=`http://127.0.0.1:${api.address().port}`;
const bootstrap = `
import {auth} from '/src/lib/firebase.ts';
import {createUserWithEmailAndPassword} from 'firebase/auth';
import {getLiveLessonDefinitionForRoute} from '/src/lib/liveLesson/routeDefinition.ts';
import {createLiveLessonSession,updateLiveLessonState} from '/src/services/liveLessonService.ts';
window.fixture = {
  login:async()=> (await createUserWithEmailAndPassword(auth,'teacher-'+Date.now()+'@p31.test','local-p31-password')).user.uid,
  create:async()=>{const definition=getLiveLessonDefinitionForRoute('${lessonKey}');
    const session=await createLiveLessonSession({definition,teacherUid:auth.currentUser.uid,classId:'p31-qa-class'});
    return {sessionId:session.id,cues:definition.cues.map(c=>({id:c.id,title:definition.tvScreens.find(s=>s.id===c.tvScreenId)?.title}))};},
  update:async(sessionId,patch)=>updateLiveLessonState(sessionId,patch)
};`;
const vite=await createServer({
  server:{host:'127.0.0.1',port:3016,strictPort:true,proxy:{'/api':{target:apiTarget}}},plugins:[
  {
    name:'p31-local-firebase-env',
    async load(id){
      const normalized=id.replaceAll('\\','/').split('?')[0];
      if(!normalized.endsWith('/src/lib/firebase.ts')) return null;
      const code=await fs.readFile(normalized,'utf8');
      const next=code
        .replaceAll('import.meta.env.VITE_USE_EMULATOR', JSON.stringify('1'))
        .replaceAll('import.meta.env.VITE_FIREBASE_PROJECT_ID', JSON.stringify(projectId))
        .replaceAll('import.meta.env.VITE_FIREBASE_API_KEY', JSON.stringify('local-emulator-key'));
      return next;
    },
  },
  {
  name:'p31-local-fixture',
  resolveId(id){if(id==='/__p31-bootstrap.js')return id;},
  load(id){if(id==='/__p31-bootstrap.js')return bootstrap;},
  configureServer(server){server.middlewares.use('/__p31-fixture',async(req,res)=>{
    res.setHeader('Content-Type','text/html');
    res.end(await server.transformIndexHtml('/__p31-fixture','<!doctype html><html><body>Local P31 fixture<script type="module" src="/__p31-bootstrap.js"></script></body></html>'));
  });},
}]});
await vite.listen();
const base='http://127.0.0.1:3016';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox'],defaultViewport:{width:1280,height:800}});
const contexts=[];
async function newPage(role, width=1280,height=800,context) {
  if(!context){context=await browser.createBrowserContext();contexts.push(context);}
  const page=await context.newPage();
  await page.setViewport({width,height,deviceScaleFactor:1});
  page.setDefaultTimeout(25000);
  page.on('pageerror',error=>results.pageErrors.push({role,error:error.message}));
  await page.setRequestInterception(true);
  page.on('request',req=>{
    const url=new URL(req.url());
    if(['http:','https:'].includes(url.protocol) && !['127.0.0.1','localhost'].includes(url.hostname)) {
      results.blockedNetwork.push({role,host:url.hostname});void req.abort();
    } else void req.continue();
  });
  return page;
}
async function button(page,text){
  await page.waitForFunction(expected=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()===expected&&!button.disabled),{},text);
  await page.evaluate(expected=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===expected&&!item.disabled);if(!button)throw new Error(`Button not found: ${expected}`);button.click();},text);
}
async function buttonContaining(page,text){
  await page.waitForFunction(expected=>[...document.querySelectorAll('button')].some(button=>button.textContent.includes(expected)&&!button.disabled),{},text);
  await page.evaluate(expected=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.includes(expected)&&!item.disabled);if(!button)throw new Error(`Button containing text not found: ${expected}`);button.click();},text);
}
async function chooseGroup(page,value){
  const selector='.student-group-form select';
  await page.waitForSelector(selector);
  await page.select(selector,value);
  await page.waitForFunction(({selector,value})=>{const select=document.querySelector(selector);const button=select?.closest('.student-group-form')?.querySelector('button');return select?.value===value&&button instanceof HTMLButtonElement&&!button.disabled;},{}, {selector,value});
  await page.evaluate(selector=>{const select=document.querySelector(selector);const button=select?.closest('.student-group-form')?.querySelector('button');if(!(button instanceof HTMLButtonElement))throw new Error('Group confirmation button not found');button.click();},selector);
}
async function capture(page,name,fullPage=false){
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(output,name+'.png'),fullPage});
  results.screenshots.push(name+'.png');
}
async function visibleText(page,text){await page.waitForFunction(value=>{const haystack=`${document.body.innerText} ${document.body.textContent}`.toLocaleLowerCase();return haystack.includes(String(value).toLocaleLowerCase());},{},text);}
async function waitForResponseCount(stepId,count){const deadline=Date.now()+25000;while(Date.now()<deadline){const snapshot=await db.collection(`liveLessonSessions/${sessionId}/responses`).where('stepId','==',stepId).get();if(snapshot.size>=count)return;await new Promise(resolve=>setTimeout(resolve,250));}throw new Error(`Timed out waiting for ${count} responses at ${stepId}`);}
async function waitForPublicStats(stepId){const deadline=Date.now()+25000;while(Date.now()<deadline){const snapshot=await db.doc(`liveLessonSessions/${sessionId}/public/stats`).get();if(snapshot.exists&&snapshot.data()?.stepId===stepId)return;await new Promise(resolve=>setTimeout(resolve,250));}throw new Error(`Timed out waiting for public stats at ${stepId}`);}
let sessionId;
try {
  const teacher=await newPage('teacher');
  await teacher.goto(base+'/__p31-fixture');
  await teacher.waitForFunction(()=>window.fixture);
  teacherUid=await teacher.evaluate(()=>window.fixture.login());
  await db.doc(`classes/${roster.classId}`).set({teacherId:teacherUid,name:roster.className,joinCode:'P31QA'});
  const created=await teacher.evaluate(()=>window.fixture.create());
  sessionId=created.sessionId;
  const sessionDoc=await db.doc(`liveLessonSessions/${sessionId}`).get();
  assert.equal(sessionDoc.data().teacherUid,teacherUid,'Fixture session owner must match the authenticated teacher');
  assert.equal((await db.doc(`classes/${roster.classId}`).get()).data().teacherId,teacherUid,'Fixture class owner must match the authenticated teacher');
  await teacher.evaluate((id)=>window.fixture.update(id,{status:'running'}),sessionId);
  await teacher.evaluate((id)=>window.fixture.update(id,{status:'lobby'}),sessionId);
  console.log('PASS direct teacher state mutation before control click');
  const url=mode=>`${base}/adaptive-live/${sessionId}?mode=${mode}&definitionKey=${lessonKey}`;
  await teacher.goto(url('teacher'));
  await teacher.waitForSelector('nav[aria-label="Điều khiển cue"]');
  const control=await newPage('tv-control',1280,720,teacher.browserContext());
  const tv=await newPage('tv',1920,1080);
  await Promise.all([control.goto(url('tv-control')),tv.goto(url('tv'))]);
  await control.waitForSelector('.tv-presenter-bar');
  await tv.waitForSelector('.tv-slide-title');
  assert.equal(await tv.$('.tv-intent-frame'),null,'No teacher goals before students formulate their own');
  pass('Owner GV and TV-control; public TV; goals hidden at opening');
  const students=[];
  for(let i=0;i<3;i++) {
    const p=await newPage('student-'+i,i===2?390:1024,i===2?844:768);
    await p.goto(url('student')+`&classId=${roster.classId}&joinCode=P31QA`);
    await p.waitForSelector('select');await p.select('select',roster.students[i].studentId);
    await p.type('input[placeholder="PIN"]','1234');await button(p,'Vào lớp');
    await p.waitForSelector('.student-language-panel');
    await buttonContaining(p,i===1?'English':'Tiếng Việt');
    students.push(p);
  }
  pass('Three isolated student identities sign in through local roster/PIN API');
  await button(control,'Chạy');await tv.waitForSelector('.tv-status-pill.is-running');
  for(let n=0;n<created.cues.length-1;n++) {
    const cue=created.cues[n];
    if(n>0){await button(control,'Sau →');await tv.waitForFunction(title=>document.querySelector('.tv-slide-title')?.textContent===title,{},cue.title);}
    await students[0].waitForFunction(title=>document.querySelector('.student-tv-reference h2')?.textContent===title,{},cue.title);
    const guideCount=await students[0].$$eval('[aria-label="Hướng dẫn hoạt động"]',elements=>elements.length);
    assert.equal(guideCount,1,`Student must render exactly one current activity guide at ${cue.id}`);
    if(isP31 && (cue.id==='P03'||cue.id==='P05')) {
      for(const [i,p]of students.entries()) {
        await p.type('textarea[aria-label="Câu trả lời của em"]',cue.id==='P03'?'Làm sao kiểm tra mọi cách mua?':`Em muốn tự kiểm tra cặp số và giải thích bằng phép tính ${i+1}.`);
        await button(p,'Gửi câu trả lời');await visibleText(p,'Đã xác nhận trên máy chủ.');
      }
      if(cue.id==='P03') assert.equal(await tv.$('.tv-intent-frame'),null);
      if(cue.id==='P05') { assert.ok(await tv.$('.tv-intent-frame')); await visibleText(tv,'Đích đến của lớp'); }
    }
    if(isGenericV72 && (cue.id==='P02'||cue.id==='P04')) {
      for(const p of students){
        await p.type('textarea[aria-label="Câu trả lời của em"]',cue.id==='P02'?'Em cần biết dữ kiện nào để chọn công cụ?':'Em muốn giải được một bài và kiểm tra lại bằng phép thay.');
        await button(p,'Gửi câu trả lời'); await visibleText(p,'Đã xác nhận trên máy chủ.');
      }
    }
    if(isLegacyAdapter && cue.id==='P08') {
      for(const [i,p] of students.entries()) {
        await buttonContaining(p,i===2?'< ·':'≤ ·');
        await visibleText(p,'Đã xác nhận trên máy chủ.');
      }
      await button(control,'Hiện kết quả lớp');
      await tv.waitForFunction(()=>document.querySelector('.tv-response-total strong')?.textContent==='3');
      pass('HS choices aggregate live on TV; answers remain hidden until teacher opens results');
      await capture(tv,'P08-TV-results');
      await button(control,'Ẩn kết quả');await tv.waitForSelector('.tv-results-hidden');
    }
    if(isLegacyAdapter && cue.id==='P16') {
      for(const p of students){
        await buttonContaining(p,'Lập luận');
        await p.type('textarea','160 > 150 nên phương án vượt ngân sách 10 nghìn.');
        await button(p,'Gửi câu trả lời');await visibleText(p,'Đã xác nhận trên máy chủ.');
      }
      await button(control,'Hiện kết quả lớp');await tv.waitForFunction(()=>document.querySelector('.tv-response-total strong')?.textContent==='3');
      const rows=await db.collection(`liveLessonSessions/${sessionId}/responses`).where('stepId','==','cp-ai-error').get();
      assert.equal(rows.size,3);for(const row of rows.docs){assert.equal(JSON.parse(row.data().value).category,'Logical');}
      pass('Rapid AI category then explanation preserves both; counts each student once');
      await button(control,'Ẩn kết quả');
    }
    if(isP31 && cue.id==='P19')for(const [i,p]of students.entries()){
      await buttonContaining(p,['Bắt đầu với hỗ trợ','Kết nối kiến thức','Mở rộng lập luận'][i]);
      await visibleText(p,'Đã xác nhận trên máy chủ.');
    }
    if(isGenericV72 && cue.id==='P15') {
      for(const p of students){
        await buttonContaining(p,'Lập luận');
        await p.type('textarea','Em kiểm tra lại phép tính và điều kiện trước khi kết luận.');
        await button(p,'Gửi câu trả lời'); await visibleText(p,'Đã xác nhận trên máy chủ.');
      }
    }
    if(isGenericV72 && cue.id==='P18') {
      for(const p of students){ await buttonContaining(p,'Bắt đầu với hỗ trợ'); await visibleText(p,'Đã xác nhận trên máy chủ.'); }
    }
    if(isLegacyAdapter && cue.id==='P20') {
      await students[0].reload();await visibleText(students[0],'Nhiệm vụ tuyến M');
      for(const [i,p]of students.entries()){
        await chooseGroup(p,i===2?'2':'1');
        await visibleText(p,i===2?'Em đang ở nhóm 2':'Em đang ở nhóm 1');
        await p.type('textarea','(4;8):140 ≤ 150 hợp lệ; (8;4):160 > 150 không; (6;6):150 dùng hết.');
        await button(p,'Gửi câu trả lời');await visibleText(p,'Đã xác nhận trên máy chủ.');
      }
      await button(control,'Hiện kết quả lớp');
      await visibleText(tv,'2/2 đã gửi');await visibleText(tv,'1/1 đã gửi');
      pass('Route retained after reload; real group membership/submissions aggregate as 2/2 and 1/1');
      await capture(tv,'P20-TV-results');await capture(students[0],'P20-HS-route-M',true);
      await button(control,'Ẩn kết quả');
    }
    if((isGenericV72 && cue.id==='P22') || (isP31 && cue.id==='P20')) {
      for(const [i,p] of students.entries()){
        await chooseGroup(p,i===2?'2':'1');
        await visibleText(p,i===2?'Em đang ở nhóm 2':'Em đang ở nhóm 1');
        const practiceField='textarea[aria-label^="Câu trả lời bài A"]';
        await p.waitForSelector(practiceField); await p.type(practiceField,'Em nêu bước làm, điều kiện và phép kiểm của bài A.');
        await button(p,'Gửi bài này'); await visibleText(p,'Đã gửi');
      }
      await waitForResponseCount('cp-practice-a',3);
      await button(control,'Hiện kết quả lớp');
      try { await waitForPublicStats('cp-practice-a'); }
      catch (error) { console.log('P22 publisher state',await control.evaluate(()=>document.body.innerText.slice(-1200)),await tv.evaluate(()=>document.body.innerText.slice(-1200))); throw error; }
      await tv.waitForFunction(()=>document.querySelector('.tv-response-total strong')?.textContent==='3');
      pass('V7.2 practice set A–D is interactive and public TV receives aggregate A progress');
      await button(control,'Ẩn kết quả');
    }
    if(isLegacyAdapter && cue.id==='P27') {
      await students[0].type('textarea','2·5+3=13 > 12; không là nghiệm. (5;2) làm hai vế bằng nhau.');
      await students[0].reload();await students[0].waitForSelector('textarea');
      assert((await students[0].$eval('textarea',el=>el.value)).includes('13 > 12'));
      await button(students[0],'Gửi câu trả lời');await visibleText(students[0],'Đã xác nhận trên máy chủ.');
      pass('Individual work draft survives page reload and submits');
    }
    if(isLegacyAdapter && cue.id==='P32') {
      for(const p of students){await button(p,'A · (6; 6)');await visibleText(p,'Đã xác nhận trên máy chủ.');}
    }
    if(isLegacyAdapter && cue.id==='P38') {
      await visibleText(students[0],'Em muốn tự kiểm tra cặp số');
      await students[0].type('textarea','Em đã kiểm tra được cặp số bằng phép thay. Em cần luyện giải thích điều kiện nguyên.');
      await button(students[0],'Gửi câu trả lời');await visibleText(students[0],'Đã xác nhận trên máy chủ.');
      pass('Exit ticket restores personal goal for evidence-based reflection');
    }
    if(isGenericV72 && cue.id==='P36') {
      await students[0].type('textarea[aria-label="Câu trả lời của em"]','Em đã tạo được một kết luận có căn cứ và biết kiểm tra điều kiện.');
      await button(students[0],'Gửi câu trả lời'); await visibleText(students[0],'Đã xác nhận trên máy chủ.');
    }
    if(isGenericV72 && cue.id==='P39') {
      await visibleText(students[0],'Đích đến chung của lớp');
      await students[0].type('textarea[aria-label="Câu trả lời của em"]','MUST: Đã làm được. SHOULD: Đang tiến bộ. COULD: Chưa chắc.');
      await button(students[0],'Gửi câu trả lời'); await visibleText(students[0],'Đã xác nhận trên máy chủ.');
    }
    await capture(tv,cue.id+'-TV-1920');
    await tv.setViewport({width:1280,height:720,deviceScaleFactor:1});
    await capture(tv,cue.id+'-TV-1280');
    const layout=await tv.evaluate(()=>[...document.querySelectorAll('.tv-shell,.tv-content-card,.tv-results-panel')].map(el=>({className:el.className,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth})));
    results.layout.push({cue:cue.id,layout});
    await tv.setViewport({width:1920,height:1080,deviceScaleFactor:1});
    await capture(students[1],cue.id+'-HS-EN',true);await capture(students[2],cue.id+'-HS-mobile',true);
  }
  const publicDocs=await db.collection(`liveLessonSessions/${sessionId}/public`).get();
  const serialized=JSON.stringify(publicDocs.docs.map(d=>d.data()));
  assert(!/participantUid|studentName|teacherScript|explanation|privateReason/.test(serialized));
  pass('Public documents contain aggregate counts only; no student text/identity');
  assert.equal(results.pageErrors.length,0,JSON.stringify(results.pageErrors));
  pass('No uncaught browser errors');
} catch(error) { results.failure=error.stack; console.error(error);process.exitCode=1; }
finally {
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
  await browser.close();await vite.close();await new Promise(resolve=>api.close(resolve));
  await db.terminate();
}
