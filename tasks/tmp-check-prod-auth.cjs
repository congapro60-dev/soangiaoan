const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('PROD PAGE BODY:\n', text);
  await page.close();
  await browser.disconnect();
})();
