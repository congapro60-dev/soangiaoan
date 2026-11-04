// Dump UI "Giao bài cho lớp" — selects + options + nút
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const gv = await gb.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 20; i++) {
    const ok = await gv.evaluate(() => (document.body.innerText || '').includes('Giao bài cho lớp'));
    if (ok) break;
    await sleep(2000);
  }
  await sleep(4000);
  const ui = await gv.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map((s) => ({
      name: s.name || s.id || '',
      opts: Array.from(s.options).map((o) => ({ v: o.value, t: o.textContent.trim().slice(0, 60) })).slice(0, 12),
    }));
    const btns = Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)).filter((x) => x && /Giao|giao|Xuất bản|Tạo/.test(x));
    return { selects: selects.slice(0, 6), btns };
  });
  console.log(JSON.stringify(ui, null, 1).slice(0, 2500));
  await gv.close();
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
