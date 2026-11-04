// R3 B7 probe — đếm số bài trên nút xuất bản (chỉ báo deploy mới)
const puppeteer = require('puppeteer');

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 90000 });
  await new Promise(r => setTimeout(r, 8000));
  const btn = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => /Tạo và xuất bản \d+ bài/.test(x.textContent || ''));
    const gói = (document.body.innerText.match(/\d+ gói bài học phân hoá/) || [null])[0];
    return { nút: b ? (b.textContent || '').trim() : null, gói };
  });
  console.log('Nút:', btn.nút, '| Gói:', btn.gói);
  await page.close();
  browser.disconnect();
}
main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
