// Debug: bấm tab "Bài học tương tác" rồi dump hàng
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const p = await gv.newPage();
  await p.setViewport({ width: 1440, height: 1000 });
  await p.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  const clicked = await p.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').indexOf('Bài học tương tác') >= 0);
    if (!tab) return 'no-tab';
    tab.click();
    return 'clicked';
  });
  console.log('tab:', clicked);
  for (let i = 0; i < 10; i++) {
    await sleep(3000);
    const rows = await p.evaluate(() => Array.from(document.querySelectorAll('table tbody tr')).map((r) => (r.innerText || '').replace(/\s+/g, ' ').slice(0, 100)));
    const has = rows.some((r) => r.indexOf('Các số đặc trưng đo xu thế trung tâm — Tiết 2') >= 0);
    console.log(i, 'rows:', rows.length, 'has-11-76:', has);
    if (has) { console.log(rows.filter((r) => r.indexOf('Các số đặc trưng') >= 0).join('\n')); break; }
  }
  const btns = await p.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => t).slice(0, 20));
  console.log('buttons:', JSON.stringify(btns));
  await p.close(); await gv.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
