// R2 fix1 shots3d-hs — CHỈ HS trên Edge 9223: join, dump, screenshot
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r2-fix1-session.json', 'utf8'));
const HS_URL = S.student;

(async () => {
  const ver = await (await fetch('http://127.0.0.1:9223/json/version')).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await browser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(HS_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  let joined = 'lost';
  for (let i = 0; i < 12; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
    }));
    if (!st.hasForm) { joined = 'view'; break; }
    await hs.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(500);
    await hs.evaluate(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(4000);
  }
  console.log('HS join:', joined);
  await sleep(4000);
  const text = await hs.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  await hs.screenshot({ path: 'tasks/tmp-r2-fix1-live-s10exit3-hs.png' });
  fs.writeFileSync('tasks/tmp-r2-fix1-live-hs-text.json', JSON.stringify({ savedAt: new Date().toISOString(), joined, text }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-live-hs-text.json');
  await browser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
