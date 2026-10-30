const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    const txt = msg.text();
    if (txt.includes('audit') || txt.includes('publish') || txt.includes('error') || txt.includes('10-12-88')) {
      console.log('BROWSER LOG:', txt);
    }
  });

  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  const result = await page.evaluate(async () => {
    // Gọi trực tiếp publish cho key 10-12-88
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => /Tạo và xuất bản \d+ bài/.test((b.textContent || '')) && !b.disabled);
    if (btn) btn.click();
    return 'clicked';
  });
  console.log('EVAL RESULT:', result);

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await page.evaluate(() => {
      const all = document.body.innerText;
      const m1 = all.match(/Đang xuất bản[^\n]*/);
      const m2 = all.match(/Xuất bản tuần tự xong[^\n]*/);
      return m1 ? m1[0] : (m2 ? m2[0] : null);
    });
    console.log(`[Loop ${i}] Status:`, status);
    if (status && status.includes('xong')) break;
  }

  await page.close();
  await browser.disconnect();
})();
