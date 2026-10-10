// Chụp ảnh nền 2D của một thế giới từ chính bản đồ 3D, nhìn thẳng từ trên xuống đúng khung chơi (đường 2D khớp đường 3D).
//   node scripts/qa/map3d-cover.mjs <world> [<world> ...] [--out public/assets]
// Mỗi thế giới cho ra world-<id>.webp (1600x900) và world-<id>@2x.webp (3200x1800).
// Cần đang chạy `npm run dev` (http://localhost:5173), không tự bật máy chủ.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const at = args.indexOf('--out');
const out = at >= 0 ? args.splice(at, 2)[1] : 'public/assets';
const worlds = args.length ? args : ['cube'];
const base = process.env.MAP_URL || 'http://localhost:5173';
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
if (!chrome) throw new Error('Không tìm thấy Chrome.');

const port = 9800 + Math.floor(Math.random() * 300);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'map3d-cover-'));
const child = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1600,900', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
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
        const send = (method, params = {}) => new Promise((res, rej) => { const i2 = ++id; pending.set(i2, { res, rej }); ws.send(JSON.stringify({ id: i2, method, params })); });
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
  for (const world of worlds) {
    await c.send('Page.navigate', { url: `${base}/lesson-map.html?demo=1&world=${world}&debug=1&q=0` });
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) {
      ready = await c.evaluate('!!window.__map3d');
      if (!ready) await sleep(250);
    }
    if (!ready) {
      console.log('KHÔNG mở được 3D cho', world);
      continue;
    }
    await sleep(3000); // vegetation, baked ground and textures settle
    for (const [suffix, w, h] of [['@2x', 3200, 1800], ['', 1600, 900]]) {
      const url = await c.evaluate(`window.__map3d.coverShot({ width: ${w}, height: ${h} })`);
      const file = path.join(out, `world-${world}${suffix}.webp`);
      fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      console.log('đã lưu', file, Math.round(fs.statSync(file).size / 1024) + ' KB');
    }
  }
} finally {
  child.kill();
}
