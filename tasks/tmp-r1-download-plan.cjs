// R1 A2 — tải giáo án gốc "Các số đặc trưng đo xu thế trung tâm — Tiết 1" (Lớp 10, Tuần 11, CẬP NHẬT 24/10)
// Đường vào: Thư viện → card Lớp 10 → nút "Xem preview" → React fiber → props.plan (id + content gốc)
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'https://giaoandewey.vercel.app';
const OUT = 'tasks/tmp-r1-plan-raw.json';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  // 1. Vào Thư viện
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, a, [role="link"], div, span'));
    const target = els.find(el => (el.textContent || '').trim() === 'Thư viện' && el.offsetParent !== null);
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 6000));

  // 2. Tìm đúng card Lớp 10 + nút Xem preview
  const found = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('article'));
    const card = cards.find(el => {
      const t = (el.innerText || '').toLowerCase();
      return t.includes('các số đặc trưng đo xu thế trung tâm') && t.includes('lớp 10');
    });
    if (!card) return { ok: false, candidates: cards.map(c => (c.innerText || '').slice(0, 80)) };
    const btn = card.querySelector('button[title="Xem preview"]');
    if (!btn) return { ok: false, reason: 'không thấy nút Xem preview trong card' };
    btn.click();
    return { ok: true };
  });
  console.log('Tìm card:', JSON.stringify(found).slice(0, 600));
  if (!found.ok) { await page.close(); browser.disconnect(); process.exit(2); }

  await new Promise(r => setTimeout(r, 2500));

  // 3. Lấy plan từ React fiber (id + content gốc markdown) — quét toàn document
  const plan = await page.evaluate(() => {
    const debug = { fixedCount: document.querySelectorAll('.fixed.inset-0').length, fiberEls: 0, checked: 0 };
    const all = Array.from(document.body.querySelectorAll('*'));
    for (const el of all) {
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (!fiberKey) continue;
      debug.fiberEls += 1;
      let fiber = el[fiberKey];
      let hops = 0;
      while (fiber && hops < 400) {
        const props = fiber.memoizedProps;
        if (props && typeof props === 'object') {
          debug.checked += 1;
          const cand = props.plan;
          if (cand && typeof cand === 'object' && typeof cand.content === 'string' && cand.content.length > 500) {
            return {
              ok: true,
              id: cand.id, title: cand.title, grade: cand.grade, week: cand.week,
              subject: cand.subject, authorName: cand.authorName,
              updatedAt: cand.updatedAt, createdAt: cand.createdAt,
              contentLength: cand.content.length,
              content: cand.content,
              debug,
            };
          }
        }
        fiber = fiber.return;
        hops += 1;
      }
      if (debug.fiberEls > 4000) break;
    }
    return { ok: false, reason: 'không tìm thấy fiber có props.plan', debug };
  });

  console.log('Kết quả fiber:', JSON.stringify({ ...plan, content: undefined, contentLength: plan.contentLength }).slice(0, 800));
  if (!plan.ok) { await page.close(); browser.disconnect(); process.exit(3); }

  fs.writeFileSync(OUT, JSON.stringify(plan, null, 1), 'utf8');
  console.log('ĐÃ LƯU:', OUT, '— content', plan.contentLength, 'ký tự');

  // Ảnh minh chứng modal
  await page.screenshot({ path: 'tasks/tmp-r1-preview-modal.png' });
  console.log('SCREENSHOT: tasks/tmp-r1-preview-modal.png');

  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
