// R1 recon 1 — kiểm tra phiên GV + cấu trúc app trên Production (Edge 9222)
const puppeteer = require('puppeteer');

const APP = 'https://giaoandewey.vercel.app';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const pages = await browser.pages();
  console.log('== TABS HIỆN CÓ ==');
  for (const p of pages) console.log('-', p.url().slice(0, 120));

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  console.log('== MỞ APP ==', APP);
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 8000));

  const url = page.url();
  console.log('URL sau load:', url);
  console.log('Title:', await page.title());

  // Text chính của trang (đầu 3000 ký tự)
  const bodyText = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== BODY TEXT (3000) ==\n' + bodyText.slice(0, 3000));

  // Danh sách nút/link/tab
  const controls = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a, [role="tab"], [role="menuitem"]'))
      .map(el => (el.textContent || '').trim().replace(/\s+/g, ' '))
      .filter(t => t && t.length < 80)
  );
  console.log('== CONTROLS ==\n' + JSON.stringify(controls.slice(0, 60), null, 1));

  await page.screenshot({ path: 'tasks/tmp-r1-recon1.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-recon1.png');

  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
