import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://giaoandewey.vercel.app/', { waitUntil: 'networkidle2' });
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).map(s => s.src);
    });
    console.log('Scripts:', scripts);
  } finally {
    await browser.close();
  }
}

run();
