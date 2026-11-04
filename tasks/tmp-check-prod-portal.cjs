const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find((p) => p.url() === 'https://giaoandewey.vercel.app/');
  if (!page) {
    page = await browser.newPage();
  }
  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));

  const text = await page.evaluate(() => {
    return document.body.innerText.slice(0, 800);
  });
  console.log('PAGE TEXT SNIPPET:\n', text);

  // Search if 10-12-88 appears anywhere in innerText
  const found = await page.evaluate(() => {
    const all = document.body.innerText;
    return {
      hasKey: all.includes('10-12-88'),
      hasTuPhanVi: all.includes('Tứ phân vị') || all.includes('tứ phân vị'),
      hasTuan12: all.includes('Tuần 12')
    };
  });
  console.log('SEARCH IN giaoandewey.vercel.app:', found);

  await browser.disconnect();
})();
