import {spawn} from 'node:child_process';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';const port=9500+Math.floor(Math.random()*200);const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ocr-e2e-'));const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+profile,'--window-size=1280,1000','--no-first-run','about:blank'],{stdio:'ignore'});const sleep=ms=>new Promise(r=>setTimeout(r,ms));
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


try {
 const t=await attach((await tabs()).find(x=>x.type==='page'));await t.send('Network.enable');await t.send('Network.setExtraHTTPHeaders',{headers:{'oai-authenticated-user-id':'ocr-e2e','oai-authenticated-user-email':'ocr-e2e@test.local'}});
 await t.send('Page.navigate',{url:base+'/exams'});await t.waitFor("document.body.innerText.includes('Phòng kiểm tra')",'teacher');await t.click('Tạo bài kiểm tra từ file');await t.waitFor("!!document.querySelector('input[type=file]')",'file');
 await t.setFiles('input[type=file]',[path.resolve('C:/Users/ADMIN/Downloads/Toan11_GHKI_ThiThu_De01_CAP_NHAT_4_HINH.pdf')]);await t.waitFor("document.body.innerText.includes('Kiểm tra lại đề')",'textPDF',180);
 const heads=await t.evaluate("[...document.querySelectorAll('.exam-qcard-head strong')].map(x=>x.textContent.trim())");const beforeRequests=await t.evaluate("performance.getEntriesByType('resource').map(x=>x.name).filter(x=>x.includes('tesseract'))");assert.equal(beforeRequests.length,0);console.log(JSON.stringify({textHeads:heads,noOcrOnText:true}));
 await t.click('Chọn file khác');await t.waitFor("!!document.querySelector('input[type=file]')",'scanfile');await t.setFiles('input[type=file]',[path.resolve('tasks/qa-ocr/scan-exam-150dpi.pdf')]);await t.waitFor("document.body.innerText.includes('Đọc đề scan')",'OCRstarted',40);await t.click('Hủy đọc đề');await t.waitFor("document.body.innerText.includes('Chọn file đề')",'cancel');console.log('✔ cancel during worker initialization');
 await t.setFiles('input[type=file]',[path.resolve('tasks/qa-ocr/scan-exam-150dpi.pdf')]);await t.waitFor("document.body.innerText.includes('Kiểm tra lại đề')||!!document.querySelector('[role=alert]')",'scanPDF',240);
 const alert=await t.evaluate("document.querySelector('[role=alert]')?.textContent");if(alert)throw Error(alert);
 const scan=await t.evaluate("[...document.querySelectorAll('.exam-qcard-head strong')].map(x=>x.textContent.trim())");const matched=scan.filter(x=>heads.includes(x));const wantedSections=[...new Set(heads.map(x=>x.split('·')[0].trim()))],foundSections=[...new Set(scan.map(x=>x.split('·')[0].trim()))];const matchRate=matched.length/heads.length;
 const summary={textCount:heads.length,scanCount:scan.length,matchRate,sectionsExpected:wantedSections,sectionsFound:foundSections,scanHeads:scan,ocrResources:await t.evaluate("performance.getEntriesByType('resource').map(x=>x.name).filter(x=>x.includes('tesseract'))"),images:await t.evaluate("document.querySelectorAll('.exam-qcard img').length")};fs.writeFileSync('tasks/qa-ocr/fixture-match.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
 const shot=await t.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('tasks/qa-ocr/scan-review.png',Buffer.from(shot.data,'base64'));assert.ok(matchRate>=0.9,'questionstarts90%');assert.deepEqual(foundSections,wantedSections);assert.ok(await t.evaluate("document.body.innerText.includes('Đề scan: máy đọc vị trí câu, hãy rà kỹ')"));assert.ok(!t.errors.length,t.errors.join('\n'));

 await t.click('Chọn file khác');await t.setFiles('input[type=file]',[path.resolve('tasks/qa-ocr/scan-page-1.png')]);await t.waitFor("document.body.innerText.includes('Kiểm tra lại đề')||!!document.querySelector('[role=alert]')",'JPGPNG',120);assert.ok(!(await t.evaluate("document.querySelector('[role=alert]')?.textContent")));assert.equal(await t.evaluate("document.querySelectorAll('.exam-qcard').length"),4);console.log('✔ PNG scan detected4questionstarts');

 await t.setFiles('[data-guide-import] input[type=file]',[path.resolve('tasks/qa-ocr/scan-guide.png')]);await t.waitFor("document.body.innerText.includes('Áp dụng hướng dẫn chấm')||!!document.querySelector('[data-guide-import] [role=alert]')",'scanguide',120);const guideError=await t.evaluate("document.querySelector('[data-guide-import] [role=alert]')?.textContent");if(guideError)throw Error(guideError);assert.ok(await t.evaluate("document.body.innerText.includes('Hướng dẫn chấm scan')"));const guideShot=await t.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync('tasks/qa-ocr/scan-guide-review.png',Buffer.from(guideShot.data,'base64'));console.log('✔ scanned guide remains in teacher review with images');
 console.log('All OCR E2E checks passed.');
} finally {child.kill();}
