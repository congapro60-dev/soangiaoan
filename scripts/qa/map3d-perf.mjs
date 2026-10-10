// Đo tốc độ bản đồ 3D trên chính máy này (Chrome thật, card đồ họa thật, không dùng khung xem trước ẩn).
//   node scripts/qa/map3d-perf.mjs [địa-chỉ-trang] [đường-dẫn-chrome]
// Mặc định mở http://localhost:5173/lesson-map.html?demo=1&debug=1 (cần đang chạy `npm run dev`).
// In ra: tên card đồ họa, thời gian một khung hình ở độ nét đầy đủ, số khung/giây khi xoay camera liên tục,
// độ nét mà hệ thống tự chọn. Mục tiêu: >= 45 khung/giây khi xoay, hình nét khi đứng yên.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:5173/lesson-map.html?demo=1&debug=1';
const chrome =
  process.argv[3] ||
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Không tìm thấy Chrome. Truyền đường dẫn làm tham số thứ hai.');

const port = 9400 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'map3d-perf-'));
const child = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1920,1080', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.addEventListener('open', res);
          ws.addEventListener('error', rej);
        });
        let id = 0;
        const pending = new Map();
        ws.addEventListener('message', (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id && pending.has(msg.id)) {
            const { res, rej } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) rej(new Error(msg.error.message));
            else res(msg.result);
          }
        });
        const send = (method, params = {}) =>
          new Promise((res, rej) => {
            const i2 = ++id;
            pending.set(i2, { res, rej });
            ws.send(JSON.stringify({ id: i2, method, params }));
          });
        const evaluate = async (expression) => {
          const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
          if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
          return r.result.value;
        };
        return { send, evaluate };
      }
    } catch {
      /* chưa sẵn sàng */
    }
    await sleep(250);
  }
  throw new Error('Không kết nối được Chrome.');
}

const sizes = [
  { name: 'Laptop 1536x864 (màn 125%)', w: 1536, h: 864, dpr: 1.25 },
  { name: 'Máy tính 1920x1080', w: 1920, h: 1080, dpr: 1 },
  { name: 'Điện thoại 390x844 (x3)', w: 390, h: 844, dpr: 3, mobile: true },
];

try {
  const c = await connect();
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  const gpu = await c.evaluate("(() => { const g = document.createElement('canvas').getContext('webgl2'); if (!g) return 'KHÔNG CÓ WEBGL2'; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'ẩn'; })()");
  console.log('Card đồ họa:', gpu);
  for (const s of sizes) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: s.dpr, mobile: Boolean(s.mobile) });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: Boolean(s.mobile), maxTouchPoints: 5 });
    await c.send('Page.navigate', { url });
    for (let i = 0; i < 160; i++) {
      if (await c.evaluate('!!window.__map3d')) break;
      await sleep(250);
    }
    await sleep(3500);
    if (process.env.MAP_COMPARE_OWLS === '1') {
      for (let i = 0; i < 40 && !(await c.evaluate('window.__map3d.stats().owl.loaded')); i++) await sleep(250);
      const pairs = [];
      for (let i = 0; i < 3; i++) {
        const pair = {};
        for (const on of i % 2 ? [true, false] : [false, true]) {
          await c.evaluate(`window.__map3d.owlMode(${on}); window.__map3d.tune({ scale: 1, level: 0 }); true`);
          await sleep(500);
          pair[on ? 'owl' : 'cards'] = await c.evaluate('(() => { window.__map3d.bench(10); return { frame: window.__map3d.bench(50), stats: window.__map3d.stats() }; })()');
        }
        pairs.push(pair);
      }
      const median = values => values.sort((a,b)=>a-b)[1];
      const cards = median(pairs.map(p=>p.cards.frame.ms)), owl = median(pairs.map(p=>p.owl.frame.ms));
      console.log(JSON.stringify({ name: s.name, cards, owl, worseningPercent: Math.round((owl/cards-1)*1000)/10, pairs }));
      continue;
    }
    const full = await c.evaluate('(() => { window.__map3d.tune({ scale: 1 }); window.__map3d.bench(10); return window.__map3d.bench(30); })()');
    await c.evaluate("window.__spin = true; (function spin() { if (!window.__spin) return; const r = window.__map3d.read(); window.__map3d.look(r.yaw + 0.03, r.pitch); requestAnimationFrame(spin); })(); true");
    await sleep(9000);
    const moving = await c.evaluate('JSON.stringify({ fps: window.__map3d.fps(), scale: window.__map3d.quality.scale, level: window.__map3d.quality.level })');
    await c.evaluate('window.__spin = false; true');
    await sleep(1500);
    const rest = await c.evaluate('JSON.stringify({ scale: window.__map3d.perf.drawnScale })');
    const m = JSON.parse(moving);
    console.log(`\n${s.name}`);
    console.log(`  Một khung ở độ nét 100%: ${full.ms} ms (≈ ${Math.round(1000 / full.ms)} khung/giây nếu không tự giảm độ nét)`);
    console.log(`  Khi xoay liên tục: ${m.fps} khung/giây, độ nét tự chọn ${Math.round(m.scale * 100)}%, mức tính năng ${m.level}`);
    console.log(`  Khi đứng yên: độ nét ${Math.round(JSON.parse(rest).scale * 100)}%`);
  }
} finally {
  child.kill();
}
