// Probe mọi request + full innerText
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const reqs = [];
  page.on('request', (r) => { if (!/\.(js|css|png|svg|woff|ico)/.test(r.url())) reqs.push(r.url().slice(0, 140)); });
  page.on('console', (msg) => { const s = msg.text(); if (/Error|error|fetch|Firebase|permission/i.test(s)) console.log('[console]', s.slice(0, 250)); });
  await page.goto(APP + '/adaptive-portal/library/adaptive-1792833009074', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(10000);
  console.log('REQS:');
  reqs.forEach((r) => console.log(' ', r));
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('--- FULL TEXT (1200) ---');
  console.log(t.slice(0, 1200).replace(/\n/g, ' | '));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
