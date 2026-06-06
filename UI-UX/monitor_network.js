import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('firestore') || url.includes('googleapis')) {
      console.log(`[Request] ${request.method()} ${url}`);
    }
  });

  try {
    await page.goto('https://giaoandewey.vercel.app/', { waitUntil: 'networkidle2' });
    
    // Login
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Chế độ dùng thử')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 5000));
  } finally {
    await browser.close();
  }
}

run();
