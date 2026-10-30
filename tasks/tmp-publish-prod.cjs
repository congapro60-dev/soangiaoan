const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const targetUrl = 'https://giaoandewey.vercel.app/adaptive-lessons';
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Bấm "Tạo và xuất bản 59 bài" trên PRODUCTION...');
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => /Tạo và xuất bản \d+ bài/.test((b.textContent || '')) && !b.disabled);
    if (btn) {
      btn.click();
      return btn.textContent.trim();
    }
    return null;
  });
  console.log('CLICK RESULT:', clicked);

  // Theo dõi tiến trình
  let lastLog = '';
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const status = await page.evaluate(() => {
      const text = document.body.innerText;
      const m = text.match(/Đang xuất bản[^\n]*/);
      return m ? m[0] : null;
    });
    if (status && status !== lastLog) {
      console.log(`[${new Date().toLocaleTimeString()}] ${status}`);
      lastLog = status;
    }
    if (!status && i > 3) {
      console.log('XUẤT BẢN HOÀN TẤT TRÊN PRODUCTION!');
      break;
    }
  }

  // Chuyển sang tab Bài học tương tác kiểm tra
  console.log('Mở tab Bài học tương tác...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 4000));

  const check = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      has101288: text.includes('10-12-88') || (text.includes('Tứ phân vị') && text.includes('Tiết 2')),
      rows: Array.from(document.querySelectorAll('tr, [role="row"], li'))
        .map(r => (r.innerText || '').replace(/\s+/g, ' ').trim())
        .filter(t => t.includes('10-') || t.includes('Tứ phân vị'))
    };
  });

  console.log('CHECK LESSON IN PRODUCTION:', check);
  await page.screenshot({ path: 'tasks/tmp-w12-prod-published.png' });
  console.log('SAVED tasks/tmp-w12-prod-published.png');

  await page.close();
  await browser.disconnect();
})();
