// Hard reload tắt cache — QA chế độ học lại trên bundle mới
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await hb.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const cdp = await page.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const apiCalls = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/classroom')) {
      let b = null; try { b = await r.json(); } catch {}
      apiCalls.push({ status: r.status(), action: (r.request().postData() || '').match(/"action":"([^"]+)"/)?.[1], res: JSON.stringify(b).slice(0, 130) });
    }
  });
  await page.goto('https://giaoandewey.vercel.app/adaptive-library/adaptive-1792833009074', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  const t = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('TITLE:', (t.split('\n').find((l) => /— Tiết|Cấp số|Khoảng/.test(l)) || '').slice(0, 90));
  console.log('notice học lại:', t.includes('Chế độ học lại') ? '✓' : '✗');
  console.log('Cần đăng nhập lớp:', /đăng nhập lớp/.test(t) ? 'CÓ (HS chưa login lớp)' : 'không');
  console.log('API CALLS:');
  apiCalls.forEach((c) => console.log(' ', c.status, c.action, '→', c.res));
  await page.close();
  await hb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
