const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url() === 'https://giaoandewey.vercel.app/');

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

  console.log('TOTAL PLANS:', plans?.length);
  const items = plans ? plans.map(p => ({ id: p.id, title: p.title, grade: p.grade, contentLength: (p.content || '').length })) : [];
  fs.writeFileSync('tasks/tmp-loaded-all-plans.json', JSON.stringify(items, null, 2), 'utf8');
  
  items.forEach((p, i) => {
    console.log(`[${i}] ${p.id} | ${p.title} (g${p.grade})`);
  });

  const target = plans?.find(p => {
    const t = (p.title || '').toLowerCase();
    return (t.includes('tứ phân vị') || t.includes('tiết 2')) && (p.grade == 10 || t.includes('10'));
  });

  if (target) {
    console.log('FOUND TARGET PLAN!', target.id, target.title);
    fs.writeFileSync('tasks/giaoan-goc-10-12-88.md', `<!-- Nguồn: Firestore lessonPlans/${target.id} — "${target.title}" — tải 30/10/2026 -->\n\n` + target.content, 'utf8');
    console.log('SAVED tasks/giaoan-goc-10-12-88.md');
  } else {
    console.log('TARGET PLAN STILL NOT FOUND');
  }

  await browser.disconnect();
})();
