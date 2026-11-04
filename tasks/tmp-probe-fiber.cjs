// Probe: đếm fiber key, thử nhiều kiểu scan state React
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  // Tìm tab đang là app (url chứa giaoandewey)
  let page = pages.find((p) => (p.url() || '').includes('giaoandewey'));
  if (!page) { console.log('NO_APP_TAB'); await browser.disconnect(); process.exit(1); }
  const report = await page.evaluate(() => {
    const out = { fiberEls: 0, hooksSeen: 0, stateShapes: [], lessonPlansHits: [], reactVersion: '' };
    const keysSeen = new Set();
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const fk = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
      if (!fk) continue;
      out.fiberEls++;
      if (keysSeen.has(fk)) continue;
      keysSeen.add(fk);
    }
    // react version
    try {
      const rootEl = document.querySelector('#root') || document.querySelector('#__next') || document.body.firstElementChild;
      const fk = Object.keys(rootEl || {}).find((k) => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
      if (fk) {
        const f = rootEl[fk];
        out.reactVersion = (f.type && f.type.name) || 'root-fiber-found';
      }
    } catch (e) {}
    // deep scan hooks — kiểm nhiều shape
    function classify(v) {
      if (v === null) return 'null';
      if (Array.isArray(v)) return 'array(' + v.length + ')';
      return typeof v;
    }
    function look(v, pathStr, depth) {
      if (depth > 3 || !v || typeof v !== 'object') return;
      if (Array.isArray(v)) {
        for (let i = 0; i < Math.min(v.length, 4); i++) look(v[i], pathStr + '[' + i + ']', depth + 1);
        return;
      }
      for (const k of Object.keys(v)) {
        if (k === 'lessonPlans') {
          out.lessonPlansHits.push(pathStr + '.' + k + ' len=' + (Array.isArray(v[k]) ? v[k].length : '?'));
        }
      }
    }
    function scanFiber(fiber, visited) {
      if (!fiber || visited.has(fiber)) return;
      visited.add(fiber);
      let hook = fiber.memoizedState;
      let hops = 0;
      while (hook && hops < 100) {
        out.hooksSeen++;
        look(hook.memoizedState, 'fiber:' + (fiber.type && (fiber.type.name || fiber.tag)), 0);
        hook = hook.next; hops++;
      }
      scanFiber(fiber.child, visited);
      scanFiber(fiber.sibling, visited);
    }
    const rootEl = document.querySelector('#root') || document.querySelector('#__next') || document.body.firstElementChild;
    const fk = rootEl && Object.keys(rootEl).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
    if (rootEl && fk) {
      scanFiber(rootEl[fk], new Set());
    }
    return out;
  }).catch((e) => ({ error: e.message }));
  console.log(JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(__dirname, 'tmp-probe-result.json'), JSON.stringify(report, null, 2), 'utf8');
  await browser.disconnect();
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exit(1); });
