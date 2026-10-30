// QA — kiểm 10 bài Tuần 11 hiển thị đúng nhãn trên /adaptive-library
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WANT = ['Số gần đúng và sai số', 'Các số đặc trưng đo xu thế trung tâm', 'Mẫu số liệu ghép nhóm', 'Hai mặt phẳng song song', 'Nguyên hàm', 'Khoảng biến thiên và khoảng tứ phân vị', 'Các số đặc trưng đo mức độ phân tán', 'Phương sai và độ lệch chuẩn'];
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await gb.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto('https://giaoandewey.vercel.app/adaptive-library', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('li')).map((li) => (li.innerText || '').replace(/\s+/g, ' ')).filter((s) => s.includes('Học lại bài này')));
  console.log('tổng bài trong list:', rows.length);
  const w11 = rows.filter((s) => s.includes('Tuần 11'));
  console.log('bài nhãn Tuần 11:', w11.length);
  w11.forEach((s) => console.log(' ✓', s.slice(0, 120)));
  // đối chiếu các tên bài Tuần 11 mong đợi
  const joined = w11.join('\n');
  for (const kw of WANT) console.log(kw.slice(0, 30) + ':', joined.includes(kw) ? '✓' : '✗');
  await page.close();
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
