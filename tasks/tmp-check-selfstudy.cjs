const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Bài tự học phân hoá'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  const g10W12 = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, [role="row"]'));
    return rows.map(r => (r.innerText || '').replace(/\s+/g, ' ').trim()).filter(t => t.includes('10-12-88') || (t.includes('Tuần 12') && t.includes('10')) || t.includes('Tứ phân vị'));
  });

  console.log('SELF-STUDY MATCHES FOR G10 W12:', g10W12);

  await page.close();
  await browser.disconnect();
})();
