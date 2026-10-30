const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  const text = await page.evaluate(() => document.body.innerText);
  const m = text.match(/Xuất bản tuần tự xong[^\n]*/);
  console.log('STATUS MESSAGE:', m ? m[0] : 'Not found');
  console.log('TIẾN ĐỘ:', text.match(/Tiến độ xuất bản[^\n]*/)?.[0]);

  // Click vào tab Bài học tương tác
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('Bài học tương tác'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  const interactiveText = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('div, tr, li'))
      .map(e => e.innerText)
      .filter(t => t.includes('BÀI HỌC TƯƠNG TÁC'));
    return Array.from(new Set(list));
  });
  console.log('INTERACTIVE ITEMS COUNT:', interactiveText.length);
  interactiveText.slice(0, 5).forEach((item, idx) => console.log(`[${idx}] ${item.replace(/\s+/g, ' ').slice(0, 100)}`));

  await page.close();
  await browser.disconnect();
})();
