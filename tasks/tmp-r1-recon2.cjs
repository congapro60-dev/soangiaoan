// R1 recon 2 — vào Thư viện, tìm giáo án "Các số đặc trưng đo xu thế trung tâm" (g10, Tiết 1)
const puppeteer = require('puppeteer');

const APP = 'https://giaoandewey.vercel.app';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  // Click "Thư viện"
  const clicked = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, a, [role="link"], div, span'));
    const target = els.find(el => (el.textContent || '').trim() === 'Thư viện' && el.offsetParent !== null);
    if (target) { target.click(); return true; }
    return false;
  });
  console.log('Click Thư viện:', clicked);
  await new Promise(r => setTimeout(r, 6000));
  console.log('URL:', page.url());

  const bodyText = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== LIBRARY TEXT (6000) ==\n' + bodyText.slice(0, 6000));

  await page.screenshot({ path: 'tasks/tmp-r1-recon2.png', fullPage: false });
  console.log('SCREENSHOT: tasks/tmp-r1-recon2.png');

  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
