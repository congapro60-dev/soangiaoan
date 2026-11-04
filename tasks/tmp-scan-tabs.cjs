// Soi 3 tab KHO BÀI HỌC: danh sách bài từng loại (đặc biệt "Bài học phân hoá 0")
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
  // Tìm các tab/count nhãn
  const tabs = await gv.evaluate(() => Array.from(document.querySelectorAll('[role="tab"], button, a')).map((b) => ({ tag: b.tagName, role: b.getAttribute('role') || '', txt: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80) })).filter((x) => /Bài tự học phân hoá|Bài học tương tác|Bài học phân hoá|Bài học tương tác Tuần 11/.test(x.txt)));
  console.log('TABS:', JSON.stringify(tabs, null, 1).slice(0, 1200));
  // Click từng tab và dump phần liệt kê
  for (const label of ['Bài tự học phân hoá', 'Bài học tương tác', 'Bài học phân hoá']) {
    const clicked = await gv.evaluate((lb) => {
      const el = Array.from(document.querySelectorAll('[role="tab"], button, a')).find((x) => (x.textContent || '').trim().replace(/\s+/g, ' ').startsWith(lb) && x.getBoundingClientRect().width > 0);
      if (el) { el.click(); return true; }
      return false;
    }, label);
    await sleep(2500);
    const listing = await gv.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr, li, [class*="card"], [class*="row"]'))
        .map((r) => (r.innerText || '').replace(/\s+/g, ' ').slice(0, 110))
        .filter((s) => /Tiết|tuần|Tuần|g10|g11|g12|Lớp/.test(s));
      return { count: rows.length, sample: rows.slice(0, 8) };
    });
    console.log('== ' + label + ' (clicked=' + clicked + ') ==');
    console.log(JSON.stringify(listing, null, 1).slice(0, 1200));
  }
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
