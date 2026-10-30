// B7 diag2 — screenshot tab hiện tại + kiểm readyState + thử mở tab mới và so sánh localStorage
const puppeteer = require('puppeteer');

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().startsWith('https://giaoandewey.vercel.app'));
  if (!page) { console.log('KHÔNG có tab giaoandewey'); await browser.disconnect(); return; }
  await page.bringToFront();
  const state = await page.evaluate(() => ({
    readyState: document.readyState,
    url: location.href,
    bodyLen: document.body ? document.body.innerText.length : -1,
    cookieCount: document.cookie ? document.cookie.split(';').length : 0,
    cookieSample: (document.cookie || '').slice(0, 120),
  }));
  console.log('STATE:', JSON.stringify(state, null, 1));
  await page.screenshot({ path: 'tasks/tmp-r1-qa-b7-diag2.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-b7-diag2.png');

  // IndexedDB check
  const idb = await page.evaluate(async () => {
    try {
      const dbs = await indexedDB.databases();
      return dbs.map(d => d.name);
    } catch (e) { return ['ERR:' + e.message]; }
  });
  console.log('IndexedDB:', JSON.stringify(idb));
  await browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
