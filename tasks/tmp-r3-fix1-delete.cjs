// R3 fix1 — XÓA bài 11-11-78 cũ trên Production (để publish lại từ bundle mới)
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'https://giaoandewey.vercel.app';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  page.on('dialog', (d) => { console.log('NATIVE DIALOG:', d.type(), '|', (d.message() || '').slice(0, 300)); d.accept().catch(() => {}); });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(7000);

  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(5000);

  const rowExists = async () => page.evaluate(() =>
    Array.from(document.querySelectorAll('table tbody tr')).some((r) => /Lớp 11 · Tuần 11 · Tiết 78/.test(r.innerText || '')));
  console.log('Hàng 11-11-78 tồn tại:', await rowExists());

  // Bấm "Xóa" trên hàng đó
  await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('table tbody tr'))
      .find((r) => /Lớp 11 · Tuần 11 · Tiết 78/.test(r.innerText || ''));
    const btn = tr && Array.from(tr.querySelectorAll('button, a')).find((b) => (b.textContent || '').trim() === 'Xóa');
    if (btn) btn.click();
  });
  await sleep(2500);

  // Dump dialog/modal nếu có
  const dialogText = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"], [role="alertdialog"], .modal, [class*="modal"], [class*="Modal"]');
    return dlg ? (dlg.innerText || '').slice(0, 1500) : null;
  });
  console.log('== DIALOG ==\n' + (dialogText || '(không thấy dialog)'));
  const dlgButtons = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"], [role="alertdialog"], .modal, [class*="modal"], [class*="Modal"]');
    if (!dlg) return [];
    return Array.from(dlg.querySelectorAll('button')).map((b) => (b.textContent || '').trim());
  });
  console.log('Nút trong dialog:', JSON.stringify(dlgButtons));

  // Bấm nút xác nhận xóa cuối cùng trong dialog
  const confirmed = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"], [role="alertdialog"], .modal, [class*="modal"], [class*="Modal"]');
    if (!dlg) return null;
    const btns = Array.from(dlg.querySelectorAll('button'));
    const btn = [...btns].reverse().find((b) => /^(Xóa|Xác nhận|Đồng ý|Có|OK|Yes)$/i.test((b.textContent || '').trim()));
    if (btn) { const t = (btn.textContent || '').trim(); btn.click(); return t; }
    return null;
  });
  console.log('Nút xác nhận đã bấm:', confirmed);
  await sleep(6000);

  const stillThere = await rowExists();
  console.log('Hàng 11-11-78 còn sau khi xóa:', stillThere);
  try { await page.screenshot({ path: 'tasks/tmp-r3-fix1-delete.png', fullPage: false }); } catch (e) { console.log('shot fail:', e.message); }

  fs.writeFileSync('tasks/tmp-r3-fix1-delete.json', JSON.stringify({
    savedAt: new Date().toISOString(), dialogText, dlgButtons, confirmed, stillThere,
  }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r3-fix1-delete.json');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
