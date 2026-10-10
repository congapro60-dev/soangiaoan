// Local-only DOCX pair rehearsal: two codes, per-attempt shuffle, original scoring and closed review.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const pdf = process.argv[2] || 'C:/Users/ADMIN/Downloads/Toan11_GHKI_4_Dang.docx';
const base = process.argv[3] || 'http://localhost:5173';
const guide = process.argv[5] || 'C:/Users/ADMIN/Downloads/Huong_dan_cham_Toan11_GHKI_4_dang.docx';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Chỉ diễn tập trên máy local, không dùng dữ liệu giả trên site thật.');
const chrome =
  process.argv[4] ||
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
if (!pdf || !fs.existsSync(pdf)) throw new Error('Truyền đường dẫn file PDF đề làm tham số đầu tiên.');
if (!fs.existsSync(guide)) throw new Error('Không tìm thấy file hướng dẫn chấm; truyền tham số thứ năm.');
if (!chrome) throw new Error('Không tìm thấy Chrome.');

const port = 9500 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-e2e-'));
const child = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1280,1000', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let reviewBrowser;

async function attach(page) {
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(msg.error.message));
      else res(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; const timer = setTimeout(() => { pending.delete(i); rej(new Error('CDP timeout: ' + method)); }, 30000); pending.set(i, { res: value => { clearTimeout(timer); res(value); }, rej: error => { clearTimeout(timer); rej(error); } }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const click = (text) => evaluate(`(() => { const b = [...document.querySelectorAll('button, a, label')].find((x) => x.textContent.trim().includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const waitFor = async (expression, label, seconds = 60) => {
    for (let i = 0; i < seconds * 2; i++) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        /* the page is still loading */
      }
      await sleep(500);
    }
    throw new Error('Quá thời gian chờ: ' + label);
  };
  const setFiles = async (selector, files) => {
    const doc = await send('DOM.getDocument', { depth: 1 });
    const node = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
    await send('DOM.setFileInputFiles', { nodeId: node.nodeId, files });
  };
  const fill = (selector, index, value) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})][${index}]; const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  return { send, evaluate, click, waitFor, setFiles, fill, errors };
}

async function tabs() {
  for (let i = 0; i < 60; i++) {
    try {
      return await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Không kết nối được Chrome.');
}

const step = (text) => console.log('✔', text);


try {
  const t = await attach((await tabs()).find(tab => tab.type === 'page'));
  const ownerHeaders = {'oai-authenticated-user-id':'shuffle-e2e','oai-authenticated-user-email':'shuffle-e2e@test.local'};
  await t.send('Network.enable');
  await t.send('Network.setExtraHTTPHeaders',{headers:ownerHeaders});
  await t.send('Page.navigate',{url:base+'/exams'});
  await t.waitFor("document.body.innerText.includes('Phòng kiểm tra')",'teacher');
  for(let i=0;i<30 && !await t.evaluate("!!document.querySelector('input[type=file]')");i++){await t.click('Tạo bài kiểm tra từ file');await sleep(500);}
  await t.setFiles('input[type=file]',[pdf]);
  await t.waitFor("document.querySelectorAll('.exam-qcard').length===23",'23 Word questions',90);
  assert.equal(await t.evaluate("document.querySelectorAll('.katex-error').length"),0);
  assert.ok(await t.evaluate("document.querySelectorAll('.katex').length")>20);
  await t.setFiles('input[aria-label="File hướng dẫn chấm"]',[guide]);
  await t.waitFor("document.querySelectorAll('[data-guide-review] tbody tr').length===23",'guide review',90);
  assert.ok(await t.evaluate("document.body.innerText.includes('9') && document.body.innerText.includes('10')"));
  fs.mkdirSync('tasks/qa-exam-shuffle',{recursive:true});
  await t.evaluate("const row=document.querySelector('[data-guide-question=\"101_q2\"]');row.querySelector('details').open=true;row.scrollIntoView({block:'start'});true");
  fs.writeFileSync('tasks/qa-exam-shuffle/guide-math.png',Buffer.from((await t.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await t.click('Áp dụng hướng dẫn chấm');
  await t.evaluate("document.querySelector('input[aria-label=\"Đảo thứ tự câu trong từng phần\"]').click(); document.querySelector('input[aria-label=\"Đảo phương án và ý đúng/sai\"]').click(); true");
  await t.click('Tạo phòng kiểm tra');
  await t.waitFor("!!document.querySelector('.exam-code-big')",'room',90);
  const roomCode=await t.evaluate("document.querySelector('.exam-code-big').innerText");
  const examId=await t.evaluate("new URL(location.href).searchParams.get('id')");
  const teacherGet=async()=>{const response=await fetch(base+'/api/exams?id='+examId,{headers:ownerHeaders});assert.equal(response.status,200);return response.json();};
  const post=async(body)=>{const response=await fetch(base+'/api/exams',{method:'POST',headers:{...ownerHeaders,'content-type':'application/json'},body:JSON.stringify({id:examId,...body})});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
  const original=(await teacherGet()).exam;
  assert.equal(original.settings.shuffleQuestions,true);
  assert.equal(original.settings.shuffleOptions,true);
  const firstCode=original.codes[0].code;
  const originalQuestions=original.codes[0].questions;
  assert.equal(originalQuestions.length,23);
  assert.deepEqual(originalQuestions.filter(q=>q.type==='mc').map(q=>q.key),['C','B','B','B','A','B','B','C','B','A','A','A']);
  assert.deepEqual(originalQuestions.filter(q=>q.type==='tf').map(q=>q.key),[[true,true,true,false],[true,true,true,false],[true,false,true,true],[true,true,true,false]]);
  assert.deepEqual(originalQuestions.filter(q=>q.type==='short').map(q=>q.key.accept),[['2'],['258'],['6']]);
  assert.equal(originalQuestions.reduce((sum,q)=>sum+q.points,0),10);
  assert.equal(originalQuestions.reduce((sum,q)=>sum+(q.questionImages?.length||0),0),14);
  step('Word + HDC: all19keys,23questions,14figures,10points');
  const secondCode=firstCode==='102'?'103':'102';
  await post({action:'duplicate-code',sourceCode:firstCode,newCode:secondCode});
  await post({action:'update',exam:{settings:{shuffleQuestions:true,shuffleOptions:true,assignment:'alternate',showCode:false}}});
  await post({action:'control',command:'open'});
  const pupilPost=async(token,body)=>{const response=await fetch(base+'/api/exam-play',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const value=await response.json();assert.ok(response.ok,JSON.stringify(value));return value;};
  const students=[];
  for(const name of ['QA Shuffle An','QA Shuffle Bình']){students.push({name,...await pupilPost(null,{action:'join',code:roomCode,name,mascot:1})});}
  const teacherState=await teacherGet();
  assert.equal(new Set(teacherState.attempts.map(a=>a.examCode)).size,2);
  await post({action:'control',command:'start'});
  const pupilState=async(token)=>(await fetch(base+'/api/exam-play',{headers:{authorization:'Bearer '+token}})).json();
  for(const [index,student] of students.entries()){
    const state=await pupilState(student.token);
    assert.equal(state.questions.length,23);
    assert.equal(state.exam.examCode,undefined);
    assert.ok(!/"key"|"solution"|"rubric"|"shuffle_seed"|"view_json"/.test(JSON.stringify(state)));
    const attempt=teacherState.attempts.find(a=>a.name===student.name);
    const paper=(await teacherGet()).exam.codes.find(c=>c.code===attempt.examCode);
    assert.notDeepEqual(state.questions.map(q=>q.id),paper.questions.map(q=>q.id));
    const preview=await post({action:'preview',examCode:attempt.examCode,seed:'sample'});
    assert.ok(preview);
    const pt=await (await fetch('http://127.0.0.1:'+port+'/json/new?'+base+'/exam?code='+roomCode,{method:'PUT'})).json();
    const p=await attach(pt);
    await p.send('Page.navigate',{url:base+'/exam?code='+roomCode});
    await p.waitFor("document.readyState==='complete'",'pupil tab');
    await p.evaluate('localStorage.setItem("exam-session",'+JSON.stringify(JSON.stringify({code:roomCode,token:student.token,name:student.name}))+');true');
    await p.send('Page.navigate',{url:base+'/exam?code='+roomCode});
    await p.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
    await p.waitFor("!!document.querySelector('.exam-question')",'pupil questions');
    await p.evaluate("document.querySelector('.exam-question').scrollIntoView({block:'start'});true");
    assert.equal(await p.evaluate("document.querySelectorAll('.katex-error').length"),0);
    assert.equal(await p.evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
    assert.equal(await p.evaluate("document.body.innerText.includes('Mã đề')"),false);
    fs.writeFileSync('tasks/qa-exam-shuffle/pupil-'+index+'-375.png',Buffer.from((await p.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    const answers={};
    for(const q of state.questions){
      const source=paper.questions.find(s=>s.id===q.id);
      if(q.type==='mc'){
        const correctText=source.choiceText[source.key];
        answers[q.id]=q.options.find(letter=>q.choiceText[letter]===correctText);
        assert.ok(answers[q.id]);
      }else if(q.type==='tf'){
        answers[q.id]=q.statements.map(letter=>{
          const originalLetter=source.statements.find(s=>source.statementText[s]===q.statementText[letter]);
          assert.ok(originalLetter);return source.key[source.statements.indexOf(originalLetter)];
        });
      }else if(q.type==='short')answers[q.id]=source.key.accept[0];
    }
    const another=students[1-index];
    const otherAttempt=teacherState.attempts.find(a=>a.name===another.name);
    const otherCode=(await teacherGet()).exam.codes.find(c=>c.code===otherAttempt.examCode);
    const foreignAsset=otherCode.questions.flatMap(q=>q.questionImages||[])[0];
    assert.equal((await fetch(base+'/api/exam-play?question='+foreignAsset.id,{headers:{authorization:'Bearer '+student.token}})).status,404);
    const submitted=await pupilPost(student.token,{action:'submit',answers});
    assert.equal(submitted.result.total,8.5);
    assert.equal(submitted.review,undefined);
    student.pin=submitted.reviewPin;
    assert.equal(typeof student.pin==='string' && /^[A-Z2-9]{8}$/.test(student.pin),true,'review PIN shape');
    const earlyReview=await fetch(base+'/api/exam-play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'review-join',code:roomCode,name:student.name,pin:student.pin})});
    assert.equal(earlyReview.status,403);
    student.order=state.questions.map(q=>q.id);
    student.page=p;
    step('pupil'+index+' shuffled answers score8.5, phone375, foreign assets denied');
  }
  await post({action:'control',command:'close'});
  for(const student of students){
    await student.page.waitFor("document.body.innerText.includes('Trạm lời giải')",'closed review',30);
    const review=await pupilState(student.token);
    assert.deepEqual(review.review.questions.map(q=>q.id),student.order);
    assert.equal(review.result.total,8.5);
    for(const q of review.review.questions.filter(q=>q.type!=='essay'))assert.equal(review.review.items[q.id].correct,true,q.id);
    assert.deepEqual(student.page.errors,[]);
  }
  const reviewPort=port+500;
  const reviewProfile=fs.mkdtempSync(path.join(os.tmpdir(),'exam-review-device-'));
  reviewBrowser=spawn(chrome,['--headless=new','--remote-debugging-port='+reviewPort,'--user-data-dir='+reviewProfile,'--no-first-run','about:blank'],{stdio:'ignore'});
  for(let attempt=0;attempt<40;attempt++){try{await fetch('http://127.0.0.1:'+reviewPort+'/json/list');break;}catch{await sleep(250);}}
  const reviewPage=await(await fetch('http://127.0.0.1:'+reviewPort+'/json/new?'+base+'/exam?code='+roomCode,{method:'PUT'})).json();
  const rp=await attach(reviewPage);
  await rp.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  await rp.send('Page.navigate',{url:base+'/exam?code='+roomCode});
  await rp.waitFor("document.readyState==='complete'",'new device review');
  await rp.evaluate("localStorage.removeItem('exam-session');true");
  await rp.send('Page.navigate',{url:base+'/exam?code='+roomCode});
  await rp.waitFor("document.querySelectorAll('input.lesson-input').length>=2",'review login form');
  await rp.fill('input.lesson-input',1,students[0].name);
  await rp.evaluate("[...document.querySelectorAll('summary')].find(el=>el.textContent.includes('PIN')).click();true");
  await rp.fill('input[aria-label="PIN xem lại"]',0,students[0].pin);
  await rp.click('Mở bài để xem lại');
  await rp.waitFor("document.body.innerText.includes('Phiên chỉ xem lại')",'PIN read-only on second device');
  const readToken=await rp.evaluate("JSON.parse(localStorage.getItem('exam-session')).token");
  assert.equal((await pupilState(readToken)).reviewPin,undefined);
  const readonlyWrite=await fetch(base+'/api/exam-play',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+readToken},body:JSON.stringify({action:'answer',qid:students[0].order[0],value:'A',seq:1})});
  assert.equal(readonlyWrite.status,401);
  await rp.evaluate("document.querySelector('.exam-post-map').scrollIntoView({block:'start'});true");
  await rp.waitFor("!!document.querySelector('.exam-post-map iframe')?.contentDocument?.querySelector('[data-exam-station]')",'journey stations',60);
  for(const [mode,width] of [['3d',1280],['3d',375],['2d',1280],['2d',375]]){
    await rp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});
    await rp.evaluate(`(()=>{const doc=document.querySelector('.exam-post-map iframe').contentDocument;const menu=doc.querySelector('[data-action=map-menu]');if(menu.getAttribute('aria-expanded')!=='true')menu.click();doc.querySelector('[data-action=map-mode][data-mode="${mode}"]').click();if(menu.getAttribute('aria-expanded')==='true')menu.click();return true;})()`);
    await sleep(1500);
    if(mode==='3d')await rp.waitFor("!!document.querySelector('.exam-post-map iframe').contentDocument.querySelector('#pilot3d canvas')",'actual3D renderer',60);
    await rp.evaluate("document.querySelector('.exam-post-map').scrollIntoView({block:'start'});true");
    const screenshot=await rp.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync('tasks/qa-exam-shuffle/journey-'+mode+'-'+width+'.png',Buffer.from(screenshot.data,'base64'));
  }
  const station=(await pupilState(readToken)).review.questions.find(question=>question.type==='essay').id;
  await rp.evaluate('document.querySelector(".exam-post-map iframe").contentDocument.querySelector("[data-exam-station=\\"'+station+'\\"]").click();true');
  await rp.waitFor("document.querySelector('.exam-review-question')?.textContent.includes('Bài')",'journey selects station');
  for(const width of [1280,375]){
    await rp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});
    await rp.evaluate('window.scrollTo(0,document.documentElement.scrollHeight);true');
    assert.equal(await rp.evaluate("document.querySelector('.exam-review-question').getBoundingClientRect().bottom<=document.querySelector('.exam-review .exam-nav').getBoundingClientRect().top"),true,'last solution lines clear the fixed review bar');
    assert.equal(await rp.evaluate("getComputedStyle(document.querySelector('.exam-review .exam-nav')).backgroundColor==='rgb(15, 23, 42)'"),true,'review bar is opaque');
    fs.writeFileSync('tasks/qa-exam-shuffle/review-bottom-'+width+'.png',Buffer.from((await rp.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  assert.equal((await pupilState(readToken)).attempt.name,students[0].name);
  assert.deepEqual(rp.errors,[]);
  const csv=await (await fetch(base+'/api/exams?id='+examId+'&csv=1',{headers:ownerHeaders})).text();
  assert.match(csv,/Mã đề/);
  assert.ok(csv.includes(firstCode)&&csv.includes(secondCode));
  await post({action:'delete',confirmTitle:original.title,confirmAttempts:students.length});
  assert.equal((await fetch(base+'/api/exams?id='+examId,{headers:ownerHeaders})).status,404);
  assert.equal((await fetch(base+'/api/exam-play',{headers:{authorization:'Bearer '+readToken}})).status,401);
  step('PIN second device read-only, before-close denied, journey3D/2D, owner delete invalidates sessions');
  step('DOCX pair keys: 12 MC, 4x4 TF, short 2/258/6, 23 questions, 14 figures, total10');
  step('2 pupils / 2 codes: stable shuffled views, canonical scoring8.5, raw assets isolated, closed review own order');
  assert.deepEqual(t.errors,[]);
  console.log('All anti-cheating E2E checks passed.');
}catch(error){console.error('FAIL:',error.stack||error.message);process.exitCode=1;}finally{reviewBrowser?.kill();child.kill();}

