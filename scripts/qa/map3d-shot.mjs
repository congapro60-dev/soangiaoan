// Chụp ảnh bản đồ 3D của một hay nhiều thế giới bằng Chrome thật (card đồ họa thật), để xem mà không cần mở trình duyệt.
//   node scripts/qa/map3d-shot.mjs <world> [<world> ...] [--out thư-mục] [--size 1280x720] [--demo 8]
// Mỗi thế giới cho ra 3 ảnh: <world>-own.png (nhìn từ linh vật của em), <world>-overview.png (cả bản đồ), <world>-night.png.
// Mặc định lưu vào tasks/qa-shots/. Cần đang chạy `npm run dev` (http://localhost:5173), không tự bật máy chủ.
// Ví dụ: node scripts/qa/map3d-shot.mjs future galaxy --demo 50
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf('--' + name);
  if (at < 0) return fallback;
  const value = args[at + 1];
  args.splice(at, 2);
  return value;
};
const out = flag('out', 'tasks/qa-shots');
const size = flag('size', '1280x720').split('x').map(Number);
const demo = flag('demo', '8');
const worlds = args.length ? args : ['historical'];
const base = process.env.MAP_URL || 'http://localhost:5173';

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Không tìm thấy Chrome.');
fs.mkdirSync(out, { recursive: true });

const port = 9800 + Math.floor(Math.random() * 300);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'map3d-shot-'));
const child = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${size[0]},${size[1]}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
        const send = (method, params = {}) => new Promise((res, rej) => {
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

try {
  const c = await connect();
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: size[0], height: size[1], deviceScaleFactor: 1, mobile: false });
  const snap = async (name) => {
    await sleep(2800);
    const shot = await c.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(out, name + '.png');
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('  đã lưu', file);
  };
  for (const world of worlds) {
    console.log(world);
    await c.send('Page.navigate', { url: `${base}/lesson-map.html?demo=${demo}&world=${world}&show=all&debug=1&q=0` });
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) {
      ready = await c.evaluate('!!window.__map3d');
      if (!ready) await sleep(250);
    }
    if (!ready) {
      console.log('  KHÔNG mở được 3D cho', world);
      continue;
    }
    await sleep(1500);
    await snap(`${world}-own`);
    await c.evaluate('window.__map3d.overview(); true');
    await snap(`${world}-overview`);
    await c.evaluate('window.__map3d.light(); window.__map3d.overview(); true');
    await snap(`${world}-night`);
  }
} finally {
  child.kill();
}
