// Đếm bài tự học phân hoá thuộc 10 tiết Tuần 11
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEYS = ['Số gần đúng và sai số', 'Các số đặc trưng đo xu thế trung tâm', 'Mẫu số liệu ghép nhóm', 'Hai mặt phẳng song song', 'Nguyên hàm', 'Khoảng biến thiên và khoảng tứ phân vị', 'Các số đặc trưng đo mức độ phân tán'];
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
  await gv.evaluate(() => { const el = Array.from(document.querySelectorAll('[role="tab"], button')).find((x) => (x.textContent || '').replace(/\s+/g, ' ').startsWith('Bài tự học phân hoá')); if (el) el.click(); });
  await sleep(2500);
  const r = await gv.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const found = [];
  for (const kw of KEYS) {
    let i = -1;
    while ((i = r.indexOf(kw, i + 1)) !== -1) {
      const seg = r.slice(i, i + 200).replace(/\n/g, ' | ');
      if (/Tuần 11/.test(seg)) { found.push(seg.slice(0, 150)); break; }
    }
  }
  console.log('TỰ HỌC — tên Tuần 11 khớp (' + found.length + '/' + KEYS.length + ' tên):');
  for (const f of found) console.log(' -', f);
  // Tuần 11 chi tiết: đếm bài có nhãn "Tuần 11" trong tab tự học
  const tu11 = (r.match(/Tuần 11/g) || []).length;
  console.log('Số lần nhãn "Tuần 11" trong tab tự học:', tu11);
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
