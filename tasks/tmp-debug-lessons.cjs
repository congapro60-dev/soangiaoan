// Debug trang /adaptive-lessons: xem tab + hàng bài 11-11-76
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const p = await gv.newPage();
  await p.setViewport({ width: 1440, height: 1000 });
  await p.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(15000);
  const info = await p.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map((t) => (t.textContent || '').trim());
    const rows = Array.from(document.querySelectorAll('table tbody tr')).map((r) => (r.innerText || '').replace(/\s+/g, ' ').slice(0, 90));
    const text = (document.body.innerText || '').slice(0, 400);
    return { tabs, rowCount: rows.length, rows: rows.slice(0, 8), text };
  });
  console.log(JSON.stringify(info, null, 1).slice(0, 2500));
  await p.close(); await gv.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
