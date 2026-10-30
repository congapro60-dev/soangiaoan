const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  // Hook vào publishSequentially bằng cách log ra console window
  await page.evaluate(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    console.warn = (...args) => {
      console.log('INTERCEPTED WARN:', ...args);
      originalWarn.apply(console, args);
    };
    console.error = (...args) => {
      console.log('INTERCEPTED ERROR:', ...args);
      originalError.apply(console, args);
    };
  });

  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => /Tạo và xuất bản \d+ bài/.test((b.textContent || '')) && !b.disabled);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('CLICKED:', clicked);
  await new Promise(r => setTimeout(r, 10000));

  await page.close();
  await browser.disconnect();
})();
