// R3 fix1 — xác minh hàng 11-11-78 sau republish: tiêu đề, lessonId, trạng thái
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'https://giaoandewey.vercel.app';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('console', (m) => { const t = m.text(); if (t.startsWith('ROW78:')) console.log(t); });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 7000));

  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]'))
      .find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await new Promise((r) => setTimeout(r, 5000));

  const rows = await page.evaluate(() => {
    const out = [];
    for (const tr of document.querySelectorAll('table tbody tr')) {
      const txt = (tr.innerText || '').replace(/\n{2,}/g, '\n');
      if (/Tiết 78|Tiết 79/.test(txt)) out.push(txt.slice(0, 400));
    }
    return out;
  });
  console.log('=== Hàng chứa Tiết 78/79 ===');
  rows.forEach((r, i) => console.log('--- hàng ' + i + ' ---\n' + r));

  try { await page.screenshot({ path: 'tasks/tmp-r3-fix1-verify.png', fullPage: false }); } catch (e) { console.log('shot fail:', e.message); }
  fs.writeFileSync('tasks/tmp-r3-fix1-verify.json', JSON.stringify({ savedAt: new Date().toISOString(), rows }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r3-fix1-verify.json');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
