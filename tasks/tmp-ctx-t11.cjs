// CTX các nhãn "Tuần 11" trong tab Bài tự học phân hoá
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
  const r = await gv.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  let i = -1, n = 0;
  while ((i = r.indexOf('Tuần 11', i + 1)) !== -1) {
    n++;
    console.log('CTX' + n + ': …' + r.slice(Math.max(0, i - 200), i + 60).replace(/\n/g, ' | ') + '…');
  }
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
