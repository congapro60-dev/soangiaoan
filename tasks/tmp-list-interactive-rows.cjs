const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Bài học tương tác'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  const allItems = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, [role="row"]'));
    return rows.map(r => (r.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  });

  console.log('ALL INTERACTIVE ROWS:');
  allItems.forEach((r, i) => console.log(`[${i}] ${r}`));

  await page.close();
  await browser.disconnect();
})();
