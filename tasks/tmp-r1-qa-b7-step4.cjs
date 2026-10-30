// B7 step 4 — lấy lessonId của bài mới trong tab tương tác + mở "Mở bài" ghi nhận nội dung
const puppeteer = require('puppeteer');

const APP = 'https://giaoandewey.vercel.app';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 7000));

  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find(t => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 5000));

  // Tìm hàng bài mới và lấy HTML cell đầu để thấy lessonId
  const firstRow = await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find(r => (r.innerText || '').includes('Các số đặc trưng đo xu thế trung tâm — Tiết 2'));
    if (!tr) return null;
    return tr.innerHTML.slice(0, 4000);
  });
  console.log('== FIRST ROW HTML ==\n' + (firstRow || 'KHÔNG THẤY'));

  // Bấm "Mở bài" trên hàng đó — mở tab mới nếu target=_blank
  const popupPromise = new Promise(resolve => browser.once('targetcreated', t => resolve(t.page())));
  await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find(r => (r.innerText || '').includes('Các số đặc trưng đo xu thế trung tâm — Tiết 2'));
    const btn = tr && Array.from(tr.querySelectorAll('button, a')).find(b => (b.textContent || '').trim() === 'Mở bài');
    if (btn) btn.click();
  });
  const opened = await Promise.race([popupPromise, new Promise(r => setTimeout(() => r(null), 6000))]);
  const detail = opened || page;
  if (opened) { await opened.setViewport({ width: 1440, height: 900 }); }
  await new Promise(r => setTimeout(r, 9000));
  console.log('== DETAIL URL ==', detail.url());
  const text = await detail.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== DETAIL TEXT (4000) ==\n' + text.slice(0, 4000));
  await detail.screenshot({ path: 'tasks/tmp-r1-qa-b7-step4-detail.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-b7-step4-detail.png');
  if (opened) await opened.close();
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
