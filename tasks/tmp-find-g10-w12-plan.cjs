const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find((p) => (p.url() || '').includes('giaoandewey'));
    if (!page) {
      console.log('No giaoandewey page found on port 9222');
      process.exit(1);
    }

    const COLLECT_PLANS_FN = function collect() {
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
      if (!rootEl) return { ok: false, reason: 'NO_ROOT' };
      const fk = Object.keys(rootEl).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
      if (!fk) return { ok: false, reason: 'NO_ROOT_FIBER' };
      scanFiber(rootEl[fk], new Set());
      if (!best) return { ok: false, reason: 'NO_STATE' };
      return { ok: true, plans: best };
    };

    const res = await page.evaluate(COLLECT_PLANS_FN);
    if (!res || !res.ok) {
      console.log('COLLECT FAILED:', res);
      process.exit(1);
    }

    console.log('TOTAL PLANS IN STATE:', res.plans.length);
    const g10Plans = res.plans.filter(p => {
      const t = (p.title || '').toLowerCase();
      return t.includes('tứ phân vị') || t.includes('mốt') || t.includes('xu thế trung tâm') || t.includes('tiết 2') || p.grade === 10;
    });

    console.log('MATCHING CANDIDATES:');
    g10Plans.forEach((p, idx) => {
      console.log(`[${idx}] id: ${p.id} | title: ${p.title} | grade: ${p.grade} | week: ${p.week}`);
    });

    fs.writeFileSync('tasks/tmp-g10-w12-candidates.json', JSON.stringify(g10Plans, null, 2), 'utf8');
    await browser.disconnect();
  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
