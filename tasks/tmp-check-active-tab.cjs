const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => (p.url() || '').includes('giaoandewey'));
  console.log('CURRENT URL:', page?.url());
  const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log('TEXT SNIPPET:\n', text);
  await browser.disconnect();
})();
