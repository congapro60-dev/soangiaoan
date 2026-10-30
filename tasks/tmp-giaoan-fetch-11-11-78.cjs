// Tải giáo án gốc "Hai mặt phẳng song song — Tiết 2" (g11, Tuần 11) từ Thư viện bài dạy
// CDP thô qua WebSocket (lesson 964). Bài học 2026-10-27:
//  - Tab Thư viện cũ có thể TREO (evaluate im lặng dù WS mở) → ping, chết thì bỏ qua/mở tab mới.
//  - Trang /adaptive-lessons giờ là "KHO BÀI HỌC" V8.8; giáo án nguồn ở mục "Thư viện bài dạy"
//    → bấm điều hướng bằng evaluate RIÊNG LẺ (SPA navigate hủy context → không giữ awaitPromise qua lần bấm).
//  - process.exit ngay sau ws.close() gây crash libuv → sleep ngắn trước khi exit.
const fs = require('fs');
const path = require('path');

const OUT_META = path.join(__dirname, 'tmp-plans-meta-11-11-78.json');
const OUT_DUMP = path.join(__dirname, 'tmp-giaoan-dump-11-11-78.json');
const LIB_URL = 'https://giaoandewey.vercel.app/';
const CDP_HTTP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- CDP mini client ----
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 0;
    const pending = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { resolve: rs, reject: rj } = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) rj(new Error('CDP ' + JSON.stringify(m.error).slice(0, 200)));
        else rs(m.result);
      }
    };
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((rs, rj) => {
        const id = ++msgId;
        pending.set(id, { resolve: rs, reject: rj });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      close: () => { try { ws.close(); } catch (_) {} },
    });
    ws.onerror = () => reject(new Error('WS_ERROR'));
  });
}

function pingPage(wsUrl, ms = 5000) {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let done = false;
    const finish = (ok) => { if (!done) { done = true; try { ws.close(); } catch (_) {} resolve(ok); } };
    const killTo = setTimeout(() => finish(false), 10000);
    ws.onopen = () => {
      clearTimeout(killTo);
      const t2 = setTimeout(() => finish(false), ms);
      ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === 1) { clearTimeout(t2); finish(true); }
      };
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '1+1', returnByValue: true } }));
    };
    ws.onerror = () => { clearTimeout(killTo); finish(false); };
  });
}

async function evaluate(cdp, expr, timeoutMs = 60000) {
  let timer = null;
  const res = await Promise.race([
    cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }),
    new Promise((_, rj) => { timer = setTimeout(() => rj(new Error('EVAL_TIMEOUT')), timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
  if (res.exceptionDetails) throw new Error('EVAL_EXC ' + JSON.stringify(res.exceptionDetails).slice(0, 400));
  return res.result.value;
}

async function createLibraryTab() {
  let created = null;
  try {
    const r = await fetch(CDP_HTTP + '/json/new?' + encodeURIComponent(LIB_URL), { method: 'PUT' });
    created = await r.json();
  } catch (e) {
    const r = await fetch(CDP_HTTP + '/json/new?' + encodeURIComponent(LIB_URL)); // fallback GET
    created = await r.json();
  }
  if (!created || !created.webSocketDebuggerUrl) throw new Error('NO_PAGE_WS');
  await sleep(12000);
  return created;
}

async function findLiveLibTab() {
  const res = await fetch(CDP_HTTP + '/json');
  const targets = await res.json();
  const libTabs = targets.filter((t) => t.type === 'page' && (t.url || '').includes('giaoandewey.vercel.app/adaptive-lessons'));
  for (const t of libTabs) {
    if (await pingPage(t.webSocketDebuggerUrl)) {
      console.log('USE_TAB ' + t.id.slice(0, 12));
      return t.webSocketDebuggerUrl;
    }
    console.log('SKIP_DEAD_TAB ' + t.id.slice(0, 12));
  }
  const created = await createLibraryTab();
  if (!(await pingPage(created.webSocketDebuggerUrl))) throw new Error('NEW_TAB_ALSO_DEAD');
  console.log('NEW_TAB ' + created.id.slice(0, 12));
  return created.webSocketDebuggerUrl;
}

// ---- Hàm trong trang: bấm điều hướng sang "Thư viện" (tab trong app chính, evaluate riêng lẻ) ----
const NAV_FN = '(' + function nav() {
  const txt = document.body.innerText || '';
  if (txt.indexOf('Thư viện bài dạy') !== -1) return { need: false };
  const els = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'));
  const vis = (x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // Ưu tiên nút nav "Thư viện" đúng nghĩa (không phải "Tạo từ giáo án nguồn")
  const el = els.find((x) => { const t = (x.textContent || '').trim(); return vis(x) && (t === 'Thư viện' || t.indexOf('Thư viện bài dạy') !== -1); })
    || els.find((x) => { const t = (x.textContent || '').trim().toLowerCase(); return vis(x) && t.indexOf('thư viện') !== -1 && t.indexOf('giáo án nguồn') === -1; });
  if (!el) return { need: true, clicked: false, sample: txt.replace(/\s+/g, ' ').slice(0, 300) };
  el.click();
  return { need: true, clicked: true, clickedText: (el.textContent || '').trim().slice(0, 60) };
}.toString() + ')()';

// ---- Hàm trong trang: fiber-scan lessonPlans + load more + lấy full content ----
const PAGE_FN = '(' + function main() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const kwList = ['mặt phẳng song song', 'thales', 'hai mặt phẳng', 'tuần 11', '15 tiết', 'cập nhật 24/10'];

  function collectPlans() {
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
    return best ? Array.from(best) : null;
  }

  async function run() {
    if ((document.body.innerText || '').indexOf('Thư viện bài dạy') === -1) {
      return { status: 'BLOCKED_NOT_LIBRARY', url: location.href, sample: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300) };
    }
    let plans = null;
    for (let i = 0; i < 45; i++) {
      plans = collectPlans();
      if (plans && plans.length > 0) break;
      await sleep(1000);
    }
    if (!plans || !plans.length) return { status: 'BLOCKED_NO_STATE', url: location.href };

    const hasRelevant = (list) => list.some((p) => kwList.some((k) => (p.title || '').toLowerCase().includes(k)));
    let guard = 0;
    while (!hasRelevant(plans) && guard < 10) {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => (x.textContent || '').includes('Tải thêm giáo án'));
      if (!b) break;
      b.click();
      await sleep(2500);
      const again = collectPlans();
      if (again && again.length) {
        const ids = new Set(plans.map((p) => p.id));
        const before = plans.length;
        for (const p of again) if (!ids.has(p.id)) plans.push(p);
        if (plans.length === before) break;
      }
      guard++;
    }

    const relevant = plans.filter((p) => kwList.some((k) => (p.title || '').toLowerCase().includes(k)));
    const sel = relevant.length > 0 ? relevant : plans.slice(0, 20);
    const docs = sel.map((p) => ({ id: p.id, title: p.title, grade: p.grade, week: p.week, updatedAt: p.updatedAt, content: p.content || '' }));
    return {
      status: 'OK',
      total: plans.length,
      relevant: relevant.length,
      items: plans.map((p) => ({
        id: p.id, title: p.title, grade: p.grade, week: p.week, isPublic: !!p.isPublic,
        updatedAt: p.updatedAt, contentLength: (p.content || '').length,
        preview: (p.content || '').replace(/\s+/g, ' ').slice(0, 220),
      })),
      docs,
    };
  }
  return run();
}.toString() + ')()';

(async () => {
  const wsUrl = await findLiveLibTab();
  const cdp = await connect(wsUrl);

  // Bước 1: nếu chưa ở trang Thư viện bài dạy → bấm điều hướng (evaluate riêng lẻ)
  for (let attempt = 0; attempt < 3; attempt++) {
    const nav = await evaluate(cdp, NAV_FN, 20000);
    if (!nav.need) break;
    console.log('NAV ' + JSON.stringify(nav));
    if (!nav.clicked) break;
    await sleep(5000); // chờ SPA render trang mới
  }

  // Bước 2: xác nhận đã ở trang Thư viện bài dạy
  const check = await evaluate(cdp, '(function(){return {href: location.href, ok: (document.body.innerText||"").indexOf("Thư viện bài dạy") !== -1, sample: (document.body.innerText||"").replace(/\\s+/g," ").slice(0,250)}})()', 20000);
  console.log('CHECK ' + JSON.stringify(check).slice(0, 400));
  if (!check.ok) {
    cdp.close();
    await sleep(500);
    console.log('BLOCKED_NOT_LIBRARY');
    process.exit(4);
  }
  await sleep(2000); // chờ danh sách giáo án nạp thêm sau khi tab mở

  // Bước 3: fiber-scan + load more + dump (cùng trang, không điều hướng giữa chừng)
  let value = null;
  try {
    value = await evaluate(cdp, PAGE_FN, 150000);
  } catch (e) {
    cdp.close();
    await sleep(500);
    fs.writeFileSync(OUT_META, JSON.stringify({ status: 'BLOCKED_EVAL', error: String(e.message || e) }, null, 2), 'utf8');
    console.log('BLOCKED_EVAL ' + (e.message || e));
    process.exit(5);
  }
  cdp.close();
  await sleep(500);

  if (!value || value.status !== 'OK') {
    fs.writeFileSync(OUT_META, JSON.stringify({ status: 'BLOCKED', value }, null, 2), 'utf8');
    console.log('BLOCKED ' + JSON.stringify(value).slice(0, 400));
    process.exit(3);
  }

  fs.writeFileSync(OUT_META, JSON.stringify({ fetchedAt: new Date().toISOString(), status: 'OK', total: value.total, relevant: value.relevant, items: value.items }, null, 2), 'utf8');
  fs.writeFileSync(OUT_DUMP, JSON.stringify({ fetchedAt: new Date().toISOString(), totalPlans: value.total, docs: value.docs }, null, 2), 'utf8');
  console.log('META_OK total=' + value.total + ' relevant=' + value.relevant);
  console.log('DUMP_OK docs=' + value.docs.length + ' file=' + OUT_DUMP);
  for (const d of value.docs) {
    console.log('DOC id=' + d.id + ' | ' + d.title + ' | grade=' + d.grade + ' | week=' + d.week + ' | len=' + (d.content || '').length);
  }
  process.exit(0);
})().catch((e) => {
  console.error('FATAL ' + (e && e.stack || e));
  process.exit(1);
});
