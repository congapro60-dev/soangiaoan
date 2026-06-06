import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('request', request => {
    const url = request.url();
    if (url.includes('firestore.googleapis.com')) {
      console.log(`[Request] ${request.method()} ${url}`);
      const headers = request.headers();
      console.log(`  Headers:`, JSON.stringify(headers));
      const postData = request.postData();
      if (postData) {
        console.log(`  Body:`, postData);
      }
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('firestore.googleapis.com')) {
      console.log(`[Response] ${response.status()} ${url}`);
      try {
        const text = await response.text();
        console.log(`  Response Body:`, text.substring(0, 500));
      } catch (e) {
        console.log(`  Could not read body:`, e.message);
      }
    }
  });

  try {
    const url = 'https://giaoandewey.vercel.app/';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Login
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chế độ dùng thử'));
      if (btn) btn.click();
    });
    
    await page.waitForSelector('main', { timeout: 10000 });

    // Chuyển sang Thi online
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside nav button'));
      const examsBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('thi online'));
      if (examsBtn) examsBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 5000));

  } finally {
    await browser.close();
  }
}

run();
