// R3 fix1 — publish lại bài 11-11-78 từ bundle mới (nút "Tạo và xuất bản N bài")
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
  await new Promise((r) => setTimeout(r, 6000));

  // Bấm nút "Tạo và xuất bản N bài"
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find((b) => /Tạo và xuất bản \d+ bài/.test((b.textContent || '')) && b.offsetParent !== null && !b.disabled);
    if (btn) { const t = (btn.textContent || '').trim(); btn.click(); return t; }
    return null;
  });
  console.log('Clicked button:', clicked);
  if (!clicked) { console.log('KHÔNG tìm thấy nút!'); await page.close(); browser.disconnect(); return; }

  // Theo dõi tiến trình tối đa 5 phút
  let lastProgress = '';
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
    const m = text.match(/Đang xuất bản[^\n]*/);
    const prog = m ? m[0] : '';
    if (prog !== lastProgress) { console.log('[' + new Date().toISOString() + ']', prog || '(hết tiến trình)'); lastProgress = prog; }
    if (!prog && i > 1) break;
  }

  // Mở tab "Bài học tương tác" và dump trạng thái
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await new Promise((r) => setTimeout(r, 5000));
  const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  const has78 = /Lớp 11 · Tuần 11 · Tiết 78/.test(text);
  const line78 = text.split('\n').filter((l) => /Tiết 78|Hai mặt phẳng/.test(l)).slice(0, 6);
  console.log('Hàng 11-11-78 có sau publish:', has78);
  console.log('Dòng liên quan:\n' + line78.join('\n'));
  try { await page.screenshot({ path: 'tasks/tmp-r3-fix1-publish.png', fullPage: false }); } catch (e) { console.log('shot fail:', e.message); }

  fs.writeFileSync('tasks/tmp-r3-fix1-publish.json', JSON.stringify({
    savedAt: new Date().toISOString(), clicked, has78, line78,
  }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r3-fix1-publish.json');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
