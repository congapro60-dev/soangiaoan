// Probe sâu: mọi request + console khi mở /adaptive-portal/library/:lessonId
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const reqs = [];
  page.on('request', (r) => { if (/firestore|classroom|adaptive/.test(r.url())) reqs.push(r.url().slice(0, 160)); });
  page.on('response', async (r) => { if (/classroom/.test(r.url())) { let b = null; try { b = await r.json(); } catch {} console.log('[API]', r.status(), (r.request().postData() || '').slice(0, 110), '→', JSON.stringify(b).slice(0, 160)); } });
  page.on('console', (msg) => { const s = msg.text(); if (/error|Error|không|Không|warn/i.test(s)) console.log('[console]', s.slice(0, 200)); });
  await page.goto(APP + '/adaptive-portal/library/adaptive-1792833009074', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(10000);
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('TITLE:', (t.split('\n').find((l) => /— Tiết|Cấp số|Khoảng/.test(l)) || '').slice(0, 90));
  console.log('pathname:', await page.evaluate(() => location.pathname));
  console.log('FIRESTORE/ADAPTIVE REQUESTS:');
  reqs.slice(0, 12).forEach((r) => console.log(' ', r));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
