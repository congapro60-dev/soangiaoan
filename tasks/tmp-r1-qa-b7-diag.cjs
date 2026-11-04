// B7 diag — kiểm trạng thái đăng nhập trên tab giaoandewey đang mở + reload
const puppeteer = require('puppeteer');

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().startsWith('https://giaoandewey.vercel.app'));
  if (!page) { console.log('KHÔNG có tab giaoandewey'); await browser.disconnect(); return; }
  console.log('Tab tìm thấy:', page.url());
  await page.bringToFront();
  await page.reload({ waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 8000));
  const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== TEXT (1500) ==\n' + text.slice(0, 1500));
  // Firebase auth user trong localStorage/IndexedDB
  const authInfo = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(k => k.toLowerCase().includes('firebase') || k.toLowerCase().includes('auth'));
    return { localStorageKeys: keys, hasAuthUser: keys.map(k => k + '=' + String(localStorage.getItem(k)).slice(0, 60)) };
  });
  console.log('== AUTH INFO ==\n' + JSON.stringify(authInfo, null, 1));
  await browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
