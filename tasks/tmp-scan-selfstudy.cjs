// Khảo sát KHO BÀI HỌC: mỗi key Tuần 11 đã có bài tự học phân hoá + bài tương tác chưa
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv = await gb.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 20; i++) {
    const ok = await gv.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC'));
    if (ok) break;
    await sleep(2000);
  }
  await sleep(4000);
  const r = await gv.evaluate(() => {
    const t = (document.body.innerText || '').replace(/\n{2,}/g, '\n');
    return {
      tabs: t.slice(0, 1500),
      buttons: Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ')).filter((x) => x && x.length < 60).slice(0, 30),
    };
  });
  console.log('TEXT:', r.tabs.replace(/\n/g, ' | ').slice(0, 1400));
  console.log('BUTTONS:', JSON.stringify(r.buttons));
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
