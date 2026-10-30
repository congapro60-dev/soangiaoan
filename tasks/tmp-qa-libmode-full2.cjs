// QA học lại — retry với console + API log
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  page.on('console', (m) => { const s = m.text(); if (/error|Error|Lỗi|lỗi|không/i.test(s)) console.log('[console]', s.slice(0, 200)); });
  const api = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/classroom')) {
      let b = null; try { b = await r.json(); } catch {}
      const a = (r.request().postData() || '').match(/"action":"([^"]+)"/);
      api.push({ a: a && a[1], s: r.status(), res: JSON.stringify(b).slice(0, 150) });
    }
  });
  await page.goto('https://giaoandewey.vercel.app/adaptive-library/adaptive-1792833009074', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(15000);
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('FULL (800):', t.slice(0, 800).replace(/\n/g, ' | '));
  console.log('API:');
  api.forEach((c) => console.log(' ', c.a, c.s, '→', c.res));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
