// R3 B7 step 1 — mở /adaptive-lessons Production, xác nhận GV đăng nhập + nút "Tạo và xuất bản 54 bài" (deploy db1fd27)
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
  await new Promise(r => setTimeout(r, 8000));

  const bodyText = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const pubBtn = (bodyText.match(/Tạo và xuất bản[^\n]*/) || [null])[0];
  const loggedIn = bodyText.includes('KHO BÀI HỌC');
  console.log('URL:', page.url());
  console.log('Nút xuất bản:', pubBtn);
  console.log('GV đăng nhập (KHO BÀI HỌC):', loggedIn);
  console.log('== BODY TEXT (1800) ==\n' + bodyText.slice(0, 1800));

  fs.writeFileSync('tasks/tmp-r3-qa-b7-step1.json', JSON.stringify({
    savedAt: new Date().toISOString(), url: page.url(), pubBtn, loggedIn,
  }, null, 1), 'utf8');

  await page.screenshot({ path: 'tasks/tmp-r3-qa-b7-step1.png' });
  console.log('SCREENSHOT: tasks/tmp-r3-qa-b7-step1.png');
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
