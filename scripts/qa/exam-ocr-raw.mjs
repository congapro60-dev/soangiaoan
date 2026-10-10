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


try{const t=await attach((await tabs()).find(x=>x.type==='page'));await t.send('Page.navigate',{url:base+'/exam'});await t.waitFor("document.body.innerText.includes('Vào làm bài')",'ready');await t.evaluate("// ponytail: pinned protocol review on upgrade / portable core SIMD only measured need.\n\n/** @param {{ WorkerCtor?: typeof Worker | null, origin?: string, signal?: AbortSignal, onProgress?: (data: { progress?: number, status?: string }) => void }} options */\nfunction createOcr({\n  WorkerCtor = (typeof Worker !== 'undefined' ? Worker : null),\n  origin = (typeof location !== 'undefined' ? location.origin : ''),\n  signal,\n  onProgress\n} = {}) {\n  let worker = null;\n  let initPromise = null;\n  let destroyed = false;\n  let nextId = 1;\n  const pending = new Map();\n\n  function failPending(err) {\n    for (const [id, req] of pending) {\n      clearTimeout(req.timer);\n      pending.delete(id);\n      req.reject(err);\n    }\n  }\n\n  function terminate() {\n    if (worker) {\n      worker.terminate();\n      worker = null;\n    }\n  }\n\n  function destroy(err = new DOMException('The operation was aborted', 'AbortError')) {\n    if (destroyed) return;\n    destroyed = true;\n    if (signal && onAbort) signal.removeEventListener('abort', onAbort);\n    failPending(err);\n    terminate();\n  }\n\n  const onAbort = () => destroy();\n  if (signal) {\n    if (signal.aborted) destroyed = true;\n    else signal.addEventListener('abort', onAbort, { once: true });\n  }\n\n  function post(action, payload) {\n    return new Promise((resolve, reject) => {\n      if (destroyed) return reject(new DOMException('The operation was aborted', 'AbortError'));\n      const id = String(nextId++);\n      const timer = setTimeout(() => {\n        if (pending.has(id)) {\n          destroy(new Error('OCR quá lâu. Thử lại với ít trang hơn.')); \n        }\n      }, 30000);\n\n      pending.set(id, { resolve, reject, timer });\n      try { worker.postMessage({ workerId: 'exam-ocr', jobId: id, action, payload }); } catch { destroy(new Error('Không gửi được ảnh tới OCR.')); }\n    });\n  }\n\n  async function init() {\n    worker = new WorkerCtor(`${origin}/vendor/tesseract/worker.min.js`);\n    worker.onerror = () => destroy(new Error('Chưa đọc được đề scan. Thử lại hoặc dùng PDF có chữ.'));\n    worker.onmessage = (e) => {\n      const { workerId, jobId, status, data } = e.data || {};\n      if (workerId !== 'exam-ocr' || !pending.has(jobId)) return;\n      if (status === 'progress') {\n        onProgress?.(data);\n        return;\n      }\n      const { resolve, reject, timer } = pending.get(jobId);\n      clearTimeout(timer);\n      pending.delete(jobId);\n      if (status === 'resolve') resolve(data);\n      else reject(new Error('Chưa đọc được đề scan. Thử lại hoặc dùng PDF có chữ.'));\n    };\n\n    await post('load', {\n      options: { lstmOnly: true, corePath: `${origin}/vendor/tesseract/tesseract-core-lstm.wasm.js`, logging: false }\n    });\n    await post('loadLanguage', {\n      langs: 'vie+eng',\n      options: { langPath: `${origin}/vendor/tesseract/lang`, gzip: false, cacheMethod: 'none', lstmOnly: true }\n    });\n    await post('initialize', {\n      langs: 'vie+eng',\n      oem: 1,\n      config: { tessedit_pageseg_mode: 3 }\n    });\n  }\n\n  return {\n    async recognize(bytes) {\n      if (destroyed || signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');\n      if (!initPromise) {\n        initPromise = init().catch(err => {\n          const outErr = destroyed ? new DOMException('The operation was aborted', 'AbortError') : new Error('Chưa đọc được đề scan. Thử lại hoặc dùng PDF có chữ.');\n          destroy(outErr);\n          throw outErr;\n        });\n      }\n      await initPromise;\n      if (destroyed || signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');\n      return post('recognize', {\n        image: bytes,\n        options: {},\n        output: { text: true, blocks: true, tsv: true }\n      });\n    },\n    destroy\n  };\n}\n\n");for(const page of [1,4,5]){const bytes=fs.readFileSync('tasks/qa-ocr/scan-page-'+page+'.png').toString('base64');const result=await t.evaluate('(async()=>{const o=createOcr();try{return await o.recognize(Uint8Array.from(atob('+JSON.stringify(bytes)+'),c=>c.charCodeAt(0)))}finally{o.destroy()}})()');fs.writeFileSync('tasks/qa-ocr/raw-'+page+'.json',JSON.stringify(result));console.log(JSON.stringify({page,heads:result.text.split('\n').filter(x=>/ph.?n|PH|Câu|Bài|Cau|Bai/.test(x)).slice(0,16)}));}}finally{child.kill();}