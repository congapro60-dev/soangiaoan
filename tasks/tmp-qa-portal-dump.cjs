// Dump trang portal khi mở bài từ thư viện
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await gb.newPage();
  page.on('console', (msg) => { const s = msg.text(); if (/error|Error|không/i.test(s)) console.log('[console]', s.slice(0, 200)); });
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto('https://giaoandewey.vercel.app/adaptive-portal/adaptive-1792833009074', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(12000);
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('TEXT đầu 900:', t.slice(0, 900).replace(/\n/g, ' | '));
  await page.close();
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
