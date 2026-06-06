import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

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
    
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('button')).some(b => b.textContent && b.textContent.includes('Tạo đề mới'));
    }, { timeout: 10000 });

    // Inspect Hook 5 and Hook 6
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Tạo đề mới'));
      if (!btn) return;

      const key = Object.keys(btn).find(k => k.startsWith('__reactFiber$'));
      if (!key) return;

      let fiber = btn[key];
      let examsTabFiber = null;
      while (fiber) {
        if (fiber.memoizedState) {
          let count = 0;
          let hook = fiber.memoizedState;
          while (hook && hook.hasOwnProperty('memoizedState')) {
            count++;
            hook = hook.next;
          }
          if (count === 8) {
            examsTabFiber = fiber;
            break;
          }
        }
        fiber = fiber.return;
      }

      if (!examsTabFiber) return;

      let hook = examsTabFiber.memoizedState;
      let index = 0;
      while (hook) {
        if (index === 5 || index === 6) {
          const val = hook.memoizedState;
          if (Array.isArray(val)) {
            console.log(`Hook ${index} is array of length ${val.length}. Items:`);
            val.forEach((item, itemIdx) => {
              const keys = item && typeof item === 'object' ? Object.keys(item) : [];
              const title = item && item.title ? item.title : (item && item.studentName ? item.studentName : 'no title');
              console.log(`  Item ${itemIdx}: keys = [${keys.join(', ')}], title/name = ${title}`);
            });
          } else {
            console.log(`Hook ${index} is not an array: ${typeof val}`);
          }
        }
        hook = hook.next;
        index++;
      }
    });

  } finally {
    await browser.close();
  }
}

run();
