const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find((p) => (p.url() || '').includes('giaoandewey'));
    if (!page) {
      console.log('No giaoandewey page');
      process.exit(1);
    }

    // Click "Thư viện"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a, [role="button"]')).find(b => (b.innerText || '').trim() === 'Thư viện');
      if (btn) btn.click();
    });
    console.log('Clicked Thư viện tab, waiting 4s...');
    await new Promise(r => setTimeout(r, 4000));

    // Lặp click "Tải thêm giáo án..." 5 lần để tải hết danh sách
    for (let i = 0; i < 5; i++) {
      const clicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('Tải thêm'));
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (clicked) {
        console.log(`Clicked Tải thêm lần ${i + 1}`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        break;
      }
    }

    // Quét state
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
      console.log('TOTAL PLANS FOUND IN FIBER:', plans.length);
      const items = plans.map(p => ({ id: p.id, title: p.title, grade: p.grade, week: p.week, length: (p.content || '').length }));
      fs.writeFileSync('tasks/tmp-all-library-plans.json', JSON.stringify(items, null, 2), 'utf8');
      
      const q = items.filter(x => {
        const t = (x.title || '').toLowerCase();
        return t.includes('tứ phân vị') || t.includes('mốt') || t.includes('tiết 2') || t.includes('trung tâm');
      });
      console.log('MATCHING QUERY:', q);

      // Nếu có bài khớp, dump content ra tasks/giaoan-goc-10-12-88.md
      const target = plans.find(p => {
        const t = (p.title || '').toLowerCase();
        return (t.includes('tứ phân vị') || t.includes('mốt') || (t.includes('tiết 2') && t.includes('trung tâm'))) && (p.grade == 10 || t.includes('10'));
      });
      if (target) {
        console.log('FOUND TARGET LESSON PLAN:', target.id, target.title);
        fs.writeFileSync('tasks/giaoan-goc-10-12-88.md', `<!-- Nguồn: Firestore lessonPlans/${target.id} — "${target.title}" — tải 30/10/2026 -->\n\n` + target.content, 'utf8');
        console.log('SAVED tasks/giaoan-goc-10-12-88.md');
      } else {
        console.log('Target plan not found in library list.');
      }
    } else {
      console.log('No plans found');
    }

    await browser.disconnect();
  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
