// Dump đầy đủ danh sách tab Bài tự học phân hoá (title + nhãn lớp/tuần)
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv = await gb.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 20; i++) {
    const ok = await gv.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC'));
    if (ok) break;
    await sleep(2000);
  }
  await sleep(4000);
  await gv.evaluate(() => { const el = Array.from(document.querySelectorAll('[role="tab"], button')).find((x) => (x.textContent || '').replace(/\s+/g, ' ').startsWith('Bài tự học phân hoá')); if (el) el.click(); });
  await sleep(2500);
  const rows = await gv.evaluate(() => Array.from(document.querySelectorAll('table tbody tr')).map((r) => (r.innerText || '').replace(/\s+/g, ' ').slice(0, 160)));
  console.log('ROWS=' + rows.length);
  rows.forEach((r, i) => console.log((i + 1) + ': ' + r));
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
