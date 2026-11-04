// B7 step 1 — mở /adaptive-lessons trên Production, kiểm GV đăng nhập + tab Bài học tương tác
const puppeteer = require('puppeteer');

const APP = 'https://giaoandewey.vercel.app';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 8000));

  console.log('URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
  console.log('== BODY TEXT (5000) ==\n' + bodyText.slice(0, 5000));

  const controls = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a, [role="tab"]'))
      .map(el => (el.textContent || '').trim().replace(/\s+/g, ' '))
      .filter(t => t && t.length < 90)
  );
  console.log('== CONTROLS ==\n' + JSON.stringify(controls, null, 1));

  await page.screenshot({ path: 'tasks/tmp-r1-qa-b7-step1.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-qa-b7-step1.png');
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
