// R2 B7 step 4b — retry preview: click "Xem trước bài học", đợi, dump dialog/overlay + tabs trước/sau
const puppeteer = require('puppeteer');
const fs = require('fs');

const DETAIL_URL = 'https://giaoandewey.vercel.app/adaptive-builder/adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listURLs(browser) {
  const pages = await browser.pages();
  return pages.map((p) => p.url());
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const before = await listURLs(browser);
  console.log('TABS BEFORE:', JSON.stringify(before, null, 1));

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(DETAIL_URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(8000);

  // dump nút quanh "Xem trước"
  const btnInfo = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, a'))
      .filter((b) => /Xem trước/.test((b.textContent || '')));
    return els.map((b) => ({ tag: b.tagName, text: (b.textContent || '').trim().slice(0, 80), href: b.href || null, disabled: b.disabled || null, visible: !!b.offsetParent }));
  });
  console.log('PREVIEW ELEMENTS:', JSON.stringify(btnInfo, null, 1));

  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a'))
      .find((b) => /Xem trước bài học/.test((b.textContent || '')) && b.offsetParent !== null);
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('Clicked:', clicked);
  await sleep(12000);

  const after = await listURLs(browser);
  console.log('TABS AFTER:', JSON.stringify(after, null, 1));
  console.log('PAGE URL NOW:', page.url());

  const text = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('textLen:', text.length);
  console.log('== BODY (2600) ==\n' + text.slice(0, 2600));

  // dump mọi dialog/overlay nếu có
  const dialogText = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"], .modal, [data-state="open"]');
    return dlg ? (dlg.innerText || '').replace(/\n{2,}/g, '\n') : null;
  });
  console.log('== DIALOG ==\n' + (dialogText ? dialogText.slice(0, 3000) : '(none)'));

  await page.screenshot({ path: 'tasks/tmp-r2-qa-b7-step4b.png' });
  console.log('SCREENSHOT: tasks/tmp-r2-qa-b7-step4b.png');

  fs.writeFileSync('tasks/tmp-r2-qa-b7-step4b.json', JSON.stringify({
    savedAt: new Date().toISOString(), btnInfo, before, after, bodyText: text, dialogText,
  }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-b7-step4b.json');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
