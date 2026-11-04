const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const targetUrl = 'https://giaoandewey.vercel.app/adaptive-lessons';
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  const text = await page.evaluate(() => {
    const h2 = document.querySelector('h2');
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText);
    return { h2: h2?.innerText, buttons };
  });

  console.log('DOM IN PRODUCTION (giaoandewey.vercel.app):', text);
  await page.close();
  await browser.disconnect();
})();
