const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url() === 'https://giaoandewey.vercel.app/');

  for (let i = 0; i < 5; i++) {
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => (x.innerText || '').includes('Tải thêm'));
      if (b) { b.click(); return true; }
      return false;
    });
    console.log(`Click Tải thêm ${i + 1}:`, clicked);
    await new Promise(r => setTimeout(r, 2500));
  }

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
    return best ? best.map(p => ({ id: p.id, title: p.title, grade: p.grade })) : null;
  });

  console.log('TOTAL PLANS AFTER LOAD MORE:', plans?.length);
  plans?.forEach((p, idx) => console.log(`[${idx}] ${p.id} | ${p.title} (grade: ${p.grade})`));

  await browser.disconnect();
})();
