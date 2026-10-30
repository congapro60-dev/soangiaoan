const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  await page.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  // Kiểm tra fiber state để lấy sequentialResult
  const auditResult = await page.evaluate(() => {
    const root = document.querySelector('#root') || document.body.firstElementChild;
    const fk = Object.keys(root).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
    if (!fk) return 'no fiber';
    
    let target = null;
    function walk(fiber) {
      if (!fiber || target) return;
      let hook = fiber.memoizedState;
      while (hook) {
        if (hook.memoizedState && typeof hook.memoizedState === 'object' && hook.memoizedState.failedReports) {
          target = hook.memoizedState;
          return;
        }
        hook = hook.next;
      }
      if (fiber.child) walk(fiber.child);
      if (fiber.sibling) walk(fiber.sibling);
    }
    walk(root[fk]);
    return target;
  });

  console.log('FIBER AUDIT RESULT:', JSON.stringify(auditResult, null, 2));

  await page.close();
  await browser.disconnect();
})();
