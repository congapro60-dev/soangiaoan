// Read-only layout rehearsal: all API calls use synthetic projections; shared D1 is never contacted.
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createLessonSession, reduceLessonSession } from '../../lib/lesson/runtime.js';
import { serializeForStudent, serializeForTeacher, serializeForPresenter } from '../../lib/lesson/serialize.js';
import { pilotDraft } from '../../lib/lesson/director.js';

const base = new URL(process.argv[2] || 'http://localhost:5173');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Local server only');
assert.equal(base.port, '5173', 'Only the existing dev server on 5173');
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
assert.ok(chrome, 'Chrome required');
const profile = mkdtempSync(path.join(tmpdir(), 'codex-layout-'));
assert.ok(path.resolve(profile).startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(profile).startsWith('codex-layout-'), 'Unsafe temporary profile path');
const port = 9800 + Math.floor(Math.random() * 150);
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore', windowsHide: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const pkg = JSON.parse(readFileSync(new URL('../../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
let state = createLessonSession({ package: pkg, hostId: 'qa-host', sessionId: 'qa-layout', now: Date.now(), learners: [{ id: 'qa-pupil', name: 'Học sinh kiểm thử' }] });
state = reduceLessonSession(state, { type: 'START', eventId: 'qa-start', round: state.round, revision: state.revision, payload: {} }, { now: Date.now(), actor: { role: 'teacher', id: 'qa-host' } }).state;
state.roster['qa-pupil'].mascot = 0;
state.diceTrack['qa-pupil'].position = 8;
state.gamePlan = pilotDraft({ package: pkg, theme: 'historical', map: 'historical', seed: 42 }).plan;
let socket;
const report = { source: 'synthetic API fixtures, no D1 writes; GPU disabled for reliable layout screenshots (not a FPS test)', sizes: [], apiIntercepted: 0, postsBlocked: 0 };
const output = new URL('../../tasks/qa-codex-responsive/', import.meta.url);
mkdirSync(output, { recursive: true });
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page'); } catch { /* startup */ }
    if (!target) await pause(200);
  }
  assert.ok(target, 'Chrome startup timed out');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
  let nextId = 0;
  const waiting = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; const timer = setTimeout(() => { waiting.delete(id); reject(new Error('CDP timeout: ' + method)); }, 20000); waiting.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener('message', async event => {
    const data = JSON.parse(event.data);
    if (data.id && waiting.has(data.id)) {
      const task = waiting.get(data.id); waiting.delete(data.id);
      if (data.error) task.reject(new Error(data.error.message)); else task.resolve(data.result);
    }
    if (data.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = data.params;
    const url = new URL(request.url);
    report.apiIntercepted++;
    if (request.method !== 'GET') report.postsBlocked++;
    let payload;
    if (url.pathname === '/api/lesson-sessions') {
      const view = url.searchParams.get('kind') === 'presenter' ? serializeForPresenter(state) : request.headers.Authorization || request.headers.authorization ? serializeForStudent(state, 'qa-pupil') : serializeForTeacher(state);
      payload = { view, revision: state.revision, serverNow: Date.now() };
      // Use the existing public descriptor rather than seeding real shared classroom data.
    } else if (url.pathname === '/api/lessons/proposal') payload = { capabilities: { enabled: false }, enabled: false };
    else if (url.searchParams.get('kind') === 'list') payload = { packages: [] };
    else if (url.searchParams.get('kind') === 'director') payload = { status: 'draft', plan: null, uncertainties: [], alternatives: [] };
    else payload = { package: pkg, lesson: pkg };
    await send('Fetch.fulfillRequest', { requestId, responseCode: request.method === 'GET' ? 200 : 409, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(request.method === 'GET' ? payload : { error: 'QA_READ_ONLY' })).toString('base64') });
  });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setExtraHTTPHeaders', { headers: { 'oai-authenticated-user-id': 'qa-layout-host', 'oai-authenticated-user-email': 'qa-layout@example.invalid' } });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://localhost:5173/api/*' }, { urlPattern: '*://127.0.0.1:5173/api/*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.setItem('lesson_active_session_id','qa-layout');sessionStorage.setItem('lesson_active_learner_id','qa-pupil');sessionStorage.setItem('lesson_active_token','synthetic-qa-token');sessionStorage.setItem('active_teacher_session','qa-layout');` });
  const sizes = [[360, 640], [390, 844], [768, 1024], [1920, 1080]];
  for (const [width, height] of sizes) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    for (const page of ['play', 'presenter', 'lessons']) {
      await send('Page.navigate', { url: new URL(page === 'presenter' ? '/presenter?session=qa-layout' : '/' + page, base).href });
      await pause(2200);
      const expected = page === 'play' ? 'Học sinh kiểm thử' : page === 'presenter' ? 'HOẠT ĐỘNG:' : 'Bài học:';
      for (let i = 0; i < 40; i++) { if (await evaluate(`document.body.innerText.includes(${JSON.stringify(expected)}) && !document.querySelector('vite-error-overlay')`)) break; await pause(250); }
      if (page === 'play') { await evaluate(`document.querySelector('.play-encounter-fab')?.click()`); await pause(500); }
      if (page === 'lessons') { await evaluate(`document.querySelectorAll('button').forEach(b=>{if(b.textContent.includes('Đến phòng điều hành'))b.click()});`); await pause(1200); }
      const layout = await evaluate(`(() => { const root=document.documentElement; const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&getComputedStyle(e).visibility!=='hidden'}; return {url:location.pathname,width:innerWidth,height:innerHeight,scrollWidth:root.scrollWidth,body:document.body.innerText.slice(0,240),smallControls:[...document.querySelectorAll('button,input,select')].filter(visible).map(e=>{const target=e.matches('input[type="radio"],input[type="checkbox"]')?(e.closest('label')||e):e;const r=target.getBoundingClientRect();return {text:(target.textContent||e.getAttribute('aria-label')||e.id).trim().slice(0,70),w:r.width,h:r.height}}).filter(e=>e.w<44||e.h<44),mathCount:document.querySelectorAll('.katex').length,mathErrors:document.querySelectorAll('.katex-error,.math-error').length,overlay:!!document.querySelector('vite-error-overlay')};})()`);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(new URL(`${page}-${width}x${height}.png`, output), Buffer.from(shot.data, 'base64'));
      report.sizes.push({ page, requestedWidth: width, requestedHeight: height, ...layout });
      writeFileSync(new URL('report.json', output), JSON.stringify(report, null, 2));
      console.log(page, `${width}x${height}`, 'scrollWidth', layout.scrollWidth, 'smallControls', layout.smallControls.length, 'mathErrors', layout.mathErrors);
    }
  }
  writeFileSync(new URL('report.json', output), JSON.stringify(report, null, 2));
  assert.ok(report.apiIntercepted > 0, 'API interception did not run');
  assert.ok(report.sizes.every(x => x.scrollWidth <= x.requestedWidth && !x.overlay && x.mathErrors === 0 && x.smallControls.length === 0), 'Responsive defects: see report.json');
} finally {
  socket?.close();
  if (proc.exitCode === null) {
    const exited = new Promise(resolve => proc.once('exit', resolve));
    proc.kill();
    await Promise.race([exited, pause(3000)]);
  }
  // ponytail: temp profile cleanup may be delayed by Windows; leave it for OS cleanup when locked.
  try { rmSync(profile, { recursive: true }); } catch { /* Chrome file locks */ }
}
