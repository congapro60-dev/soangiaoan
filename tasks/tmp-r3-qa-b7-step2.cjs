// R3 B7 step 2 — bấm "Tạo và xuất bản 54 bài", chờ xong, mở tab "Bài học tương tác", dump bảng
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'https://giaoandewey.vercel.app';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 6000));

  // Bấm nút "Tạo và xuất bản 54 bài"
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => /Tạo và xuất bản \d+ bài/.test((b.textContent || '')) && b.offsetParent !== null && !b.disabled);
    if (btn) { const t = (btn.textContent || '').trim(); btn.click(); return t; }
    return null;
  });
  console.log('Clicked button:', clicked);
  if (!clicked) { console.log('KHÔNG tìm thấy nút!'); await page.close(); browser.disconnect(); return; }

  // Theo dõi tiến trình tối đa 5 phút
  let lastProgress = '';
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
    const m = text.match(/Đang xuất bản[^\n]*/);
    const prog = m ? m[0] : '';
    if (prog !== lastProgress) { console.log('[' + new Date().toISOString() + ']', prog || '(hết tiến trình)'); lastProgress = prog; }
    if (!prog && i > 1) break;
  }

  // Dump trạng thái sau xuất bản
  const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  const has78 = /11-11-78|adaptive-v4-11-11-78/.test(text);
  const hasTiet3 = text.includes('Hai mặt phẳng song song — Tiết 3');
  console.log('Sau xuất bản: có 11-11-78:', has78, '| có title "Hai mặt phẳng song song — Tiết 3":', hasTiet3);
  await page.screenshot({ path: 'tasks/tmp-r3-qa-b7-step2-published.png' });
  console.log('SCREENSHOT: tasks/tmp-r3-qa-b7-step2-published.png');

  // Bấm tab "Bài học tương tác"
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"], button'))
      .find(b => (b.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác') && b.offsetParent !== null);
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 5000));

  // Dump các hàng bảng — đánh dấu hàng nào chứa 11-11-78
  const rows = await page.evaluate(() => {
    const out = [];
    for (const tr of Array.from(document.querySelectorAll('table tbody tr'))) {
      const tds = Array.from(tr.querySelectorAll('td')).map(td => (td.innerText || '').replace(/\n+/g, ' | ').replace(/\s+/g, ' ').trim());
      const html = tr.innerHTML || '';
      out.push({ has78: /11-11-78/.test(html), tds: tds.join(' §§ ') });
    }
    return out;
  });
  console.log('== ROWS (' + rows.length + ') — hàng có 11-11-78 đánh dấu [R3] ==');
  for (const r of rows) console.log((r.has78 ? '[R3] ' : '     ') + r.tds.slice(0, 240));

  await page.screenshot({ path: 'tasks/tmp-r3-qa-b7-step2-tab.png', fullPage: true });
  console.log('SCREENSHOT: tasks/tmp-r3-qa-b7-step2-tab.png');

  fs.writeFileSync('tasks/tmp-r3-qa-b7-step2.json', JSON.stringify({
    savedAt: new Date().toISOString(), clicked, publishedHas78: has78, publishedHasTiet3: hasTiet3, rowsG11: rows.filter(r => r.has78),
  }, null, 1), 'utf8');
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
