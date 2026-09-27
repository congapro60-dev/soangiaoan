// E2E tiện ích "SmartPlan ↔ SSM" trên Edge thật (headless, hồ sơ tạm riêng — không đụng Edge của giáo viên).
// Đi đủ đường: trang app → app-relay → service worker → tab SSM → API SSM thật.
// Dùng vé GIẢ nên SSM thật trả 401 — không đọc dữ liệu thật nào.
//
// Chạy: bật `npm run dev` (cổng 3000) rồi `node scripts/qa/e2e-ssm-bridge.mjs`
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const EXT = resolve('extension/ssm-bridge');
const APP = process.env.APP_URL || 'http://localhost:3000';
const profile = mkdtempSync(join(tmpdir(), 'ssm-bridge-e2e-'));
const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

const browser = await puppeteer.launch({
  executablePath: EDGE, userDataDir: profile, headless: true, pipe: true, enableExtensions: [EXT], protocolTimeout: 120000,
});
try {
  const openPage = async () => {
    const page = await browser.newPage();
    await new Promise(res => setTimeout(res, 500));
    return page;
  };
  const ask = (page, op, params, timeout = 8000) => page.evaluate((op, params, timeout) => new Promise(done => {
    const id = `e2e-${Math.random()}`;
    const timer = setTimeout(() => done({ timeout: true }), timeout);
    window.addEventListener('message', e => {
      if (e.data?.source === 'ssm-bridge' && e.data.id === id) { clearTimeout(timer); done(e.data); }
    });
    window.postMessage({ source: 'smartplan-app', kind: 'ssm-request', id, op, params }, location.origin);
  }), op, params, timeout);

  const app = await openPage();
  await app.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120000 });

  let r = await ask(app, 'ping');
  check('ping qua relay → service worker', r.ok === true && typeof r.data?.version === 'string', r);
  r = await ask(app, 'profile');
  check('chưa có tab SSM → báo mở SSM', r.ok === false && /Chưa mở SSM/.test(r.error), r);
  r = await ask(app, 'rm-rf');
  check('lệnh lạ bị từ chối', r.ok === false && /không hợp lệ/.test(r.error), r);

  // Tab SSM giả trên đúng tên miền ssm.edufit.vn để content script của tiện ích chạy.
  const ssm = await openPage();
  await ssm.setRequestInterception(true);
  ssm.on('request', req => (req.url().startsWith('https://ssm.edufit.vn/')
    ? req.respond({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' })
    : req.continue()));
  await ssm.goto('https://ssm.edufit.vn/welcome', { waitUntil: 'load' });

  r = await ask(app, 'profile');
  check('tab SSM chưa đăng nhập → báo đăng nhập', r.ok === false && /chưa đăng nhập/.test(r.error), r);

  await ssm.evaluate(() => { localStorage.setItem('access_token', 'fake-e2e-token'); localStorage.setItem('workspace', 'branch_23'); });
  r = await ask(app, 'profile', undefined, 15000);
  check('API SSM thật + vé giả → 401 → báo hết hạn', r.ok === false && r.status === 401 && /hết hạn/.test(r.error), r);
  check('vé không lộ về app', !JSON.stringify(r).includes('fake-e2e-token'), r);

  const other = await openPage();
  await other.goto(APP.replace('localhost', '127.0.0.1'), { waitUntil: 'domcontentloaded', timeout: 120000 });
  r = await ask(other, 'ping', undefined, 2500);
  check('trang không có trong danh sách không gọi được tiện ích', r.timeout === true, r);
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}

for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.name}${x.ok ? '' : `  ${JSON.stringify(x.detail)}`}`);
process.exit(results.every(x => x.ok) ? 0 : 1);
