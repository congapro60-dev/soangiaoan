import puppeteer from 'puppeteer';

async function run() {
  console.log('=== TEST REACT FIBER EXAMSTAB ===');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

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
    
    // Wait for ExamsTab to load
    console.log('Waiting for + Tạo đề mới button...');
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('button')).some(b => b.textContent && b.textContent.includes('Tạo đề mới'));
    }, { timeout: 10000 });

    console.log('Inspecting ExamsTab fiber...');
    const result = await page.evaluate(() => {
      // Find the "+ Tạo đề mới" button
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Tạo đề mới'));
      if (!btn) return 'Tạo đề mới button not found';

      const key = Object.keys(btn).find(k => k.startsWith('__reactFiber$'));
      if (!key) return 'Fiber key not found';

      let fiber = btn[key];
      const trace = [];
      
      while (fiber) {
        let name = '';
        if (fiber.type) {
          name = fiber.type.name || (typeof fiber.type === 'function' ? fiber.type.name : '');
          if (typeof fiber.type === 'string') name = fiber.type;
        }
        
        const hooks = [];
        if (fiber.memoizedState) {
          let hook = fiber.memoizedState;
          while (hook && hook.hasOwnProperty('memoizedState')) {
            hooks.push({
              value: Array.isArray(hook.memoizedState) ? 'array' : (typeof hook.memoizedState === 'object' ? 'object' : hook.memoizedState),
              hasQueue: !!hook.queue
            });
            hook = hook.next;
          }
        }

        trace.push({
          name: name || 'Anonymous',
          hooksCount: hooks.length,
          hooks
        });

        fiber = fiber.return;
      }
      return trace;
    });

    console.log('Fiber Trace:');
    console.dir(result, { depth: null });
  } finally {
    await browser.close();
  }
}

run();
