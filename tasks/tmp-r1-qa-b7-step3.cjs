// B7 step 3 — mở tab "Bài học tương tác", dump bảng bài với id + trạng thái
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

  // Click đúng role=tab "Bài học tương tác"
  const clicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const tab = tabs.find(t => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) { tab.click(); return (tab.textContent || '').trim(); }
    return null;
  });
  console.log('Clicked tab:', clicked);
  await new Promise(r => setTimeout(r, 6000));

  // Dump toàn bộ hàng trong bảng
  const rows = await page.evaluate(() => {
    const out = [];
    for (const tr of Array.from(document.querySelectorAll('table tbody tr'))) {
      const tds = Array.from(tr.querySelectorAll('td')).map(td => (td.innerText || '').replace(/\n+/g, ' | ').replace(/\s+/g, ' ').trim());
      out.push(tds.join(' §§ '));
    }
    return out;
  });
  console.log('== ROWS (' + rows.length + ') ==');
  for (const r of rows) console.log('• ' + r.slice(0, 260));

  await page.screenshot({ path: 'tasks/tmp-r1-qa-b7-step3-interactive-tab.png', fullPage: true });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-b7-step3-interactive-tab.png');
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
