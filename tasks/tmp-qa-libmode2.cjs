// Bắt request /api/classroom khi mở chế độ học lại — xác định action + response
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const reqs = [];
  page.on('response', async (res) => {
    if (res.url().includes('/api/classroom')) {
      let body = null;
      try { body = await res.json(); } catch {}
      reqs.push({ status: res.status(), req: res.request().postData()?.slice(0, 120), res: JSON.stringify(body).slice(0, 200) });
    }
  });
  page.on('console', (msg) => { const s = msg.text(); if (/error|Error|WARN/i.test(s)) console.log('[console]', s.slice(0, 160)); });
  await page.goto(APP + '/adaptive-portal/library/adaptive-1792833009074', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(12000);
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('TITLE bài:', (t.split('\n').find((l) => /— Tiết|Cấp số|Khoảng/.test(l)) || '').slice(0, 90));
  console.log('URL:', page.url());
  console.log('REQS:');
  reqs.forEach((r) => console.log(' ', r.status, '|', r.req, '|', r.res));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
