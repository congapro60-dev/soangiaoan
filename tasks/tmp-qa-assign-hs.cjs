// QA: HS g11 vào portal → studentAdaptiveList có bài Tuần 11 được giao
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const api = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/classroom') && r.request().method() === 'POST') {
      let b = null; try { b = await r.json(); } catch {}
      const a = (r.request().postData() || '').match(/"action":"([^"]+)"/);
      api.push({ a: a && a[1], s: r.status(), res: JSON.stringify(b).slice(0, 500) });
    }
  });
  await page.goto('https://giaoandewey.vercel.app/lop/R6RCFC', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const adaptiveCalls = api.filter((c) => c.a === 'studentAdaptiveList');
  console.log('studentAdaptiveList:', adaptiveCalls.length, 'lượt');
  for (const c of adaptiveCalls) {
    const j = JSON.parse(c.res);
    const list = j.assignments || [];
    console.log('số bài giao:', list.length);
    list.forEach((x) => console.log('  -', (x.title || '').slice(0, 60), '| isOpen:', !x.closed));
  }
  console.log('PORTAL nhãn:', t.includes('Bài học phân hoá') || t.includes('Học bài này') ? '✓ có mục bài phân hoá' : '(không thấy)');
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
