const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => (p.url() || '').includes('giaoandewey-g3bwgdjev'));
  if (page) {
    const text = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText);
      return {
        h2Text: h2?.innerText,
        btns
      };
    });
    console.log('PAGE INSPECTION ON g3bwgdjev:', text);
  } else {
    console.log('No page found for g3bwgdjev');
  }
  await browser.disconnect();
})();
