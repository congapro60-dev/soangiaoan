import puppeteer from 'puppeteer';
import path from 'path';

const OUT_DIR = 'C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai\\UI-UX';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log('Logging in to Vercel...');
    await page.goto('https://giaoandewey.vercel.app/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chế độ dùng thử'));
      if (btn) btn.click();
    });
    await page.waitForSelector('main', { timeout: 15000 });
    
    // Dashboard is already active after login
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT_DIR, 'vercel_01_dashboard.png') });
    console.log('Saved vercel_01_dashboard.png');

    // Click each tab and take a screenshot
    const tabs = [
      { name: 'Soạn giáo án', file: 'vercel_02_soangiaoan.png' },
      { name: 'Bảng Kiểm tra', file: 'vercel_03_bangkiemtra.png' },
      { name: 'Thi online', file: 'vercel_04_thionline.png' },
      { name: 'Chấm điểm AI', file: 'vercel_05_chamdiemai.png' },
      { name: 'Quản lý bài học', file: 'vercel_06_quanlybaihoc.png' },
      { name: 'Công cụ AI', file: 'vercel_07_congcuai.png' },
      { name: 'Thư viện', file: 'vercel_08_thuvien.png' }
    ];

    for (const tab of tabs) {
      console.log(`Navigating to ${tab.name}...`);
      const clicked = await page.evaluate((tabName) => {
        const buttons = Array.from(document.querySelectorAll('aside nav button'));
        const btn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes(tabName.toLowerCase()));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      }, tab.name);
      
      if (clicked) {
        await new Promise(r => setTimeout(r, 3000)); // wait for load
        await page.screenshot({ path: path.join(OUT_DIR, tab.file) });
        console.log(`Saved ${tab.file}`);
      } else {
        console.log(`Could not find tab: ${tab.name}`);
      }
    }

    console.log('Done capturing accessible tabs!');

  } finally {
    await browser.close();
  }
}

run();
