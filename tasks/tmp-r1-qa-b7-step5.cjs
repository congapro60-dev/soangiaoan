// B7 step 5 — chờ render kỹ, vào tab tương tác, lấy lessonId từ hàng bài mới, bấm "Mở bài"
const puppeteer = require('puppeteer');

const APP = 'https://giaoandewey.vercel.app';
const TITLE = 'Các số đặc trưng đo xu thế trung tâm — Tiết 2';

async function waitAppReady(page) {
  for (let i = 0; i < 20; i++) {
    const ok = await page.evaluate(() => {
      const t = document.body ? document.body.innerText : '';
      return t.includes('KHO BÀI HỌC') && t.includes('Tạo và xuất bản');
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  const ready = await waitAppReady(page);
  console.log('App ready:', ready);
  await new Promise(r => setTimeout(r, 4000));

  // Vào tab tương tác
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find(t => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 4000));

  // Đọc đầy đủ các cell của hàng bài mới
  const row = await page.evaluate((title) => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find(r => (r.innerText || '').includes(title));
    if (!tr) return null;
    return {
      cells: Array.from(tr.querySelectorAll('td')).map(td => (td.innerText || '').trim()),
      html: tr.innerHTML.slice(0, 2500),
    };
  }, TITLE);
  if (!row) { console.log('KHÔNG THẤY HÀNG'); await browser.disconnect(); return; }
  console.log('== CELLS ==\n' + JSON.stringify(row.cells, null, 1));
  console.log('== ROW HTML (2500) ==\n' + row.html);

  // Bấm "Mở bài"
  const popupPromise = new Promise(resolve => browser.once('targetcreated', t => { t.page().then(p => resolve(p)).catch(() => resolve(null)); }));
  await page.evaluate((title) => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find(r => (r.innerText || '').includes(title));
    const btn = tr && Array.from(tr.querySelectorAll('button, a')).find(b => (b.textContent || '').trim() === 'Mở bài');
    if (btn) btn.click();
  }, TITLE);
  const opened = await Promise.race([popupPromise, new Promise(r => setTimeout(() => r(null), 5000))]);
  const detail = opened || page;
  if (opened) await opened.setViewport({ width: 1440, height: 900 });
  // Chờ render
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const len = await detail.evaluate(() => document.body ? document.body.innerText.length : 0);
    if (len > 300) break;
  }
  await new Promise(r => setTimeout(r, 3000));
  console.log('== DETAIL URL ==', detail.url());
  const text = await detail.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== DETAIL TEXT (5000) ==\n' + text.slice(0, 5000));
  await detail.screenshot({ path: 'tasks/tmp-r1-qa-b7-step5-detail.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-b7-step5-detail.png');
  if (opened) await opened.close();
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
