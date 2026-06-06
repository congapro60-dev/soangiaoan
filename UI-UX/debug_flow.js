import puppeteer from 'puppeteer';
import path from 'path';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto('https://giaoandewey.vercel.app/', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai\\UI-UX\\debug_1.png' });
    console.log('debug_1.png taken');

    // Click login
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chế độ dùng thử'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai\\UI-UX\\debug_2.png' });
    console.log('debug_2.png taken');

    // Click Thi online
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside nav button'));
      const examsBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('thi online'));
      if (examsBtn) examsBtn.click();
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai\\UI-UX\\debug_3.png' });
    console.log('debug_3.png taken');
  } finally {
    await browser.close();
  }
}

run();
