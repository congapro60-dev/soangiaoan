// HS g11 — dump studentAdaptiveList (bài được giao)
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const lists = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/classroom') && r.request().method() === 'POST') {
      let b = null; try { b = await r.json(); } catch {}
      const a = (r.request().postData() || '').match(/"action":"([^"]+)"/);
      if (a && a[1] === 'studentAdaptiveList' && b && b.assignments) lists.push(b.assignments);
    }
  });
  await page.goto('https://giaoandewey.vercel.app/lop/R6RCFC', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  const list = lists[0] || [];
  console.log('SỐ BÀI GIAO (g11 R6RCFC):', list.length);
  list.forEach((x) => console.log('  -', (x.title || '').slice(0, 65), '| closed:', !!x.closed));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
