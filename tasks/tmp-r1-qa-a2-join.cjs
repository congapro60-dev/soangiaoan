// B8-A2 — HS join phiên live trong browser context riêng: chọn "Trần Thùy Anh" + PIN 2143
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r1-qa-session.json', 'utf8'));
const STUDENT_URL = SESSION.links.student;
const NAME = 'Trần Thùy Anh';
const PIN = '2143';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(STUDENT_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });

  let form = false;
  for (let i = 0; i < 20; i++) {
    form = await page.evaluate(() => (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')));
    if (form) break;
    await sleep(2000);
  }
  console.log('Form đăng nhập HS:', form);
  await page.screenshot({ path: 'tasks/tmp-r1-qa-a2-login.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-a2-login.png');
  if (!form) throw new Error('Không thấy form đăng nhập HS');

  const chosen = await page.evaluate((name) => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === name);
    if (!opt) return { error: 'no-option', opts: Array.from(sel.options).map((o) => o.textContent.trim()) };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: opt.value };
  }, NAME);
  console.log('Chọn HS:', JSON.stringify(chosen));
  if (!chosen.ok) throw new Error('Không chọn được HS');

  await page.evaluate((pin) => {
    const inp = document.querySelector('input[placeholder="PIN"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(inp, pin);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, PIN);
  await sleep(500);

  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('Bấm Vào lớp:', clicked);

  let joined = false;
  let firstView = '';
  for (let i = 0; i < 20; i++) {
    await sleep(2000);
    const t = await page.evaluate(() => (document.body.innerText || ''));
    if (t.includes('Chặng') || t.includes('Suy nghĩ') || t.includes('Gửi')) {
      joined = true;
      firstView = t.replace(/\n{2,}/g, '\n');
      break;
    }
  }
  console.log('== HS VIEW sau join (1800) ==\n' + firstView.slice(0, 1800));
  await page.screenshot({ path: 'tasks/tmp-r1-qa-a2-joined.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-a2-joined.png');
  console.log('JOINED:', joined);
  // Giữ trang HS mở trong context riêng — các script sau tìm lại theo URL
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
