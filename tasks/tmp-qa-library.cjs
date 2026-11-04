// QA Thư viện học lại: mở /adaptive-library, đếm list, filter, click 1 bài Tuần 11 mở portal
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const gb = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const page = await gb.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto(APP + '/adaptive-library', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const t1 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('TITLE:', t1.includes('Thư viện học lại') ? 'Thư viện học lại ✓' : '(thiếu tiêu đề!)');
  const countLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="/adaptive-portal/"]')).map((a) => ({ t: (a.textContent || '').trim(), href: a.getAttribute('href') })));
  console.log('LINK MỞ BÀI:', countLinks.length);
  for (const k of ['Lớp 10', 'Lớp 11', 'Lớp 12']) console.log(k + ':', t1.includes(k) ? 'có' : 'không');
  console.log('Tuần 11 xuất hiện:', (t1.match(/Tuần 11/g) || []).length, 'lần');
  // Tìm bài Tuần 11 (Khoảng biến thiên — g12) và click
  const target = countLinks.find((l) => /Khoảng biến thiên|Nguyên hàm|phân tán/.test(l.t));
  console.log('BÀI TUẦN 11 CHỌN:', target ? target.t.slice(0, 60) + ' → ' + target.href : '(không thấy)');
  if (target) {
    await page.goto(APP + target.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(8000);
    const t2 = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
    console.log('PORTAL MỞ:', /Cổng học sinh/.test(t2) ? '✓ (Cổng học sinh)' : '(chưa vào portal!)', '| Thư viện link:', t2.includes('Thư viện học lại') ? '✓' : '✗');
  }
  await page.close();
  await gb.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
