const puppeteer = require('puppeteer');

const DEPLOY_URL = 'https://giaoandewey-g3bwgdjev-congapro60-devs-projects.vercel.app/adaptive-lessons';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find((p) => (p.url() || '').includes('giaoandewey'));
    if (!page) page = await browser.newPage();

    console.log('Navigating to giaoandewey deployed URL:', DEPLOY_URL);
    await page.goto(DEPLOY_URL, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 4000));

    // Look for G10 W12 package
    const res = await page.evaluate(() => {
      const allText = document.body.innerText;
      const cards = Array.from(document.querySelectorAll('div, button, a'))
        .map(el => (el.innerText || '').trim())
        .filter(t => t.includes('10-12-88') || t.includes('Tứ phân vị') || (t.includes('Tuần 12') && t.includes('Lớp 10')));
      return {
        hasKey: allText.includes('10-12-88'),
        hasTuPhanVi: allText.includes('Tứ phân vị'),
        cardMatches: Array.from(new Set(cards)).slice(0, 5)
      };
    });

    console.log('PROBE RESULT ON GIAOANDEWEY DEPLOYMENT:', res);
    await page.screenshot({ path: 'tasks/tmp-w12-giaoandewey-portal.png', fullPage: false });
    console.log('SAVED tasks/tmp-w12-giaoandewey-portal.png');

    await browser.disconnect();
  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
