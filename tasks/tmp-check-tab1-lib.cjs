const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url() === 'https://giaoandewey.vercel.app/');
  if (!page) {
    console.log('Not found tab 1');
    process.exit(1);
  }

  // Check login status in localStorage
  const user = await page.evaluate(() => {
    return {
      keys: Object.keys(localStorage),
      user: localStorage.getItem('smartplan_user') || localStorage.getItem('user')
    };
  });
  console.log('TAB 1 USER STATE:', user);

  // Switch to Library Tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const b = btns.find(x => (x.innerText || '').trim() === 'Thư viện');
    if (b) b.click();
  });
  console.log('Clicked Thư viện on Tab 1, waiting 4s...');
  await new Promise(r => setTimeout(r, 4000));

  // Collect fiber plans
  const plans = await page.evaluate(() => {
    const seenHooks = new WeakSet();
    let best = null;
    function check(v, depth) {
      if (depth > 3 || !v || typeof v !== 'object') return;
      if (Array.isArray(v)) {
        for (let i = 0; i < Math.min(v.length, 6); i++) check(v[i], depth + 1);
        return;
      }
      if (Array.isArray(v.lessonPlans) && v.lessonPlans.length > 0) {
        if (!best || v.lessonPlans.length > best.length) best = v.lessonPlans;
      }
    }
    function scanFiber(fiber, visited) {
      if (!fiber || visited.has(fiber)) return;
      visited.add(fiber);
      let hook = fiber.memoizedState;
      let hops = 0;
      while (hook && hops < 100) {
        if (!seenHooks.has(hook)) { seenHooks.add(hook); check(hook.memoizedState, 0); }
        hook = hook.next; hops++;
      }
      scanFiber(fiber.child, visited);
      scanFiber(fiber.sibling, visited);
    }
    const rootEl = document.querySelector('#root') || document.querySelector('#__next') || document.body.firstElementChild;
    if (!rootEl) return null;
    const fk = Object.keys(rootEl).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
    if (!fk) return null;
    scanFiber(rootEl[fk], new Set());
    return best;
  });

  if (plans) {
    console.log('PLANS IN TAB 1:', plans.length);
    plans.forEach((p, idx) => {
      console.log(`[${idx}] ${p.id} | ${p.title} | grade: ${p.grade}`);
    });
  } else {
    console.log('NO PLANS IN TAB 1 FIBER');
  }

  await browser.disconnect();
})();
