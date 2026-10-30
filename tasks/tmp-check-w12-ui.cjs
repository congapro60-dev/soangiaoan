const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find((p) => (p.url() || '').includes('adaptive-lessons'));
    if (!page) {
      console.log('Not found adaptive-lessons tab');
      process.exit(1);
    }

    console.log('Reloading adaptive-lessons tab...');
    await page.reload({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 4000));

    // Look for G10 W12 or Period 88 or Tứ phân vị
    const packages = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div, button, a'));
      const textMatches = cards
        .map(c => (c.innerText || '').trim())
        .filter(t => t.includes('10-12-88') || t.includes('Tứ phân vị') || (t.includes('Tuần 12') && t.includes('Lớp 10')));
      return Array.from(new Set(textMatches));
    });

    console.log('MATCHING PACKAGES ON UI:', packages.slice(0, 5));
    await browser.disconnect();
  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
