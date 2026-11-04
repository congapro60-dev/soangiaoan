const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const targetUrl = 'https://giaoandewey-g3bwgdjev-congapro60-devs-projects.vercel.app/adaptive-lessons';
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  // Kiểm tra options trong select "Chọn bài"
  const selectData = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const options = selects.map(s => Array.from(s.options).map(o => ({ value: o.value, text: o.text })));
    return options;
  });
  console.log('SELECT OPTIONS ON PAGE:', JSON.stringify(selectData, null, 2));

  // Click tab "Bài học tương tác" và lấy bảng
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, a'));
    const t = tabs.find(x => (x.innerText || '').includes('Bài học tương tác'));
    if (t) t.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  const tableRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, [role="row"], li'));
    return rows.map(r => (r.innerText || '').replace(/\s+/g, ' ').trim()).filter(t => t.includes('10-') || t.includes('11-') || t.includes('12-') || t.includes('Tứ phân vị') || t.includes('trung tâm'));
  });
  console.log('MATCHING TABLE ROWS:', tableRows);

  await page.close();
  await browser.disconnect();
})();
