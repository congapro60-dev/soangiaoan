// Tải giáo án gốc "Các số đặc trưng đo xu thế trung tâm" (g10, Tuần 11) từ Thư viện
// Kết nối Edge 9222. Scan state React từ root container fiber.
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT_META = path.join(__dirname, 'tmp-plans-meta-10-11-80.json');
const OUT_DUMP = path.join(__dirname, 'tmp-giaoan-dump-10-11-80.json');
const APP_URL = 'https://giaoandewey.vercel.app';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find((p) => (p.url() || '').includes('giaoandewey'));
  if (!page) {
    page = await browser.newPage();
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
  }
  page.setDefaultTimeout(60000);

  // 0) Đảm bảo đang ở tab Thư viện
  const libVisible = await page.evaluate(() => (document.body.innerText || '').indexOf('Thư viện bài dạy') !== -1).catch(() => false);
  if (!libVisible) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const el = els.find((x) => {
          const t = (x.textContent || '').trim();
          const r = x.getBoundingClientRect();
          return t.indexOf('Thư viện') !== -1 && r.width > 0 && r.height > 0;
        });
        if (el) el.click();
      }).catch(() => {});
      for (let j = 0; j < 8; j++) {
        const vis = await page.evaluate(() => (document.body.innerText || '').indexOf('Thư viện bài dạy') !== -1).catch(() => false);
        if (vis) break;
        await sleep(1000);
      }
      if (await page.evaluate(() => (document.body.innerText || '').indexOf('Thư viện bài dạy') !== -1).catch(() => false)) break;
    }
  }

  // 1) Poll state
  let result = null;
  for (let i = 0; i < 45; i++) {
    result = await page.evaluate(COLLECT_PLANS_FN).catch((e) => ({ ok: false, reason: 'EVAL_FAIL: ' + e.message }));
    if (result && result.ok) break;
    await sleep(1000);
  }
  if (!result || !result.ok) {
    fs.writeFileSync(OUT_META, JSON.stringify({ status: 'BLOCKED_NO_STATE', result }, null, 2), 'utf8');
    console.log('BLOCKED: ' + JSON.stringify(result));
    await browser.disconnect();
    process.exit(3);
  }

  const toMeta = (p) => ({
    id: p.id, title: p.title, grade: p.grade, week: p.week, isPublic: !!p.isPublic,
    updatedAt: p.updatedAt, contentLength: (p.content || '').length,
    preview: (p.content || '').replace(/\s+/g, ' ').slice(0, 220),
  });
  let plans = result.plans;
  fs.writeFileSync(OUT_META, JSON.stringify({ status: 'OK', total: plans.length, items: plans.map(toMeta) }, null, 2), 'utf8');
  console.log('META_OK total=' + plans.length);

  // 2) Nếu chưa thấy doc liên quan → bấm "Tải thêm giáo án..." (tối đa 10 trang)
  const kwList = ['số đặc trưng', 'tuần 11', '15 tiết', 'trung tâm', 'cập nhật 24/10'];
  const hasRelevant = (list) => list.some((p) => kwList.some((k) => (p.title || '').toLowerCase().includes(k)));
  let guard = 0;
  while (!hasRelevant(plans) && guard < 10) {
    const more = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => (x.textContent || '').includes('Tải thêm giáo án'));
      if (b) { b.click(); return true; }
      return false;
    }).catch(() => false);
    if (!more) break;
    console.log('LOAD_MORE clicked');
    await sleep(2500);
    const again = await page.evaluate(COLLECT_PLANS_FN).catch(() => null);
    if (again && again.ok) {
      const before = plans.length;
      const ids = new Set(plans.map((p) => p.id));
      for (const p of again.plans) if (!ids.has(p.id)) plans.push(p);
      if (plans.length === before) break;
      fs.writeFileSync(OUT_META, JSON.stringify({ status: 'OK', total: plans.length, items: plans.map(toMeta) }, null, 2), 'utf8');
      console.log('META_OK total=' + plans.length);
    }
    guard++;
  }

  const relevant = plans.filter((p) => kwList.some((k) => (p.title || '').toLowerCase().includes(k)));
  console.log('RELEVANT=' + relevant.length + ' / total=' + plans.length);

  // 3) Lấy full content các doc liên quan (nếu 0 → lấy 20 mới nhất)
  const sel = relevant.length > 0 ? relevant : plans.slice(0, 20);
  const selIds = sel.map((p) => p.id);

  const fullDocs = await page.evaluate((ids) => {
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
    if (!rootEl) return [];
    const fk = Object.keys(rootEl).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
    if (!fk) return [];
    scanFiber(rootEl[fk], new Set());
    if (!best) return [];
    return best
      .filter((p) => ids.includes(p.id))
      .map((p) => ({ id: p.id, title: p.title, grade: p.grade, week: p.week, updatedAt: p.updatedAt, content: p.content || '' }));
  }, selIds).catch(() => []);

  fs.writeFileSync(OUT_DUMP, JSON.stringify({ fetchedAt: new Date().toISOString(), totalPlans: plans.length, docs: fullDocs }, null, 2), 'utf8');
  console.log('DUMP_OK docs=' + fullDocs.length + ' file=' + OUT_DUMP);
  for (const d of fullDocs) {
    console.log('DOC id=' + d.id + ' | ' + d.title + ' | grade=' + d.grade + ' | week=' + d.week + ' | len=' + (d.content || '').length);
  }
  await browser.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('FATAL ' + (e && e.stack || e));
  process.exit(1);
});
