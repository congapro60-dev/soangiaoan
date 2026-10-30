// B7 step 2 — bấm "Tạo và xuất bản 52 bài", chờ xong, mở tab "Bài học tương tác", dump bảng
const puppeteer = require('puppeteer');

const APP = 'https://giaoandewey.vercel.app';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 6000));

  // Bấm nút "Tạo và xuất bản 52 bài"
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => (b.textContent || '').includes('Tạo và xuất bản') && b.offsetParent !== null && !b.disabled);
    if (btn) { btn.click(); return (btn.textContent || '').trim(); }
    return null;
  });
  console.log('Clicked button:', clicked);
  if (!clicked) { console.log('KHÔNG tìm thấy nút!'); await page.close(); browser.disconnect(); return; }

  // Theo dõi tiến trình tối đa 5 phút
  let lastProgress = '';
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
    const m = text.match(/Đang xuất bản [^\n]*/);
    const prog = m ? m[0] : '';
    if (prog !== lastProgress) { console.log('[' + new Date().toISOString() + ']', prog || '(hết tiến trình)'); lastProgress = prog; }
    if (!prog && i > 1) break;
  }

  // Dump trạng thái sau xuất bản
  const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== TEXT SAU XUẤT BẢN (3000) ==\n' + text.slice(0, 3000));
  await page.screenshot({ path: 'tasks/tmp-r1-qa-b7-step2-published.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-b7-step2-published.png');

  // Bấm tab "Bài học tương tác"
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"], button'))
      .find(b => (b.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác') && b.offsetParent !== null);
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 5000));
  const text2 = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== TAB TƯƠNG TÁC (2500) ==\n' + text2.slice(0, 2500));
  await page.screenshot({ path: 'tasks/tmp-r1-qa-b7-step2-tab.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-b7-step2-tab.png');
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
