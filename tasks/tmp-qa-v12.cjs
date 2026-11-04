// QA nhóm xoay tua v12 — như v11 nhưng tắt cache qua CDP cho cả 2 trang (tránh bundle cũ).
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';

const connect = async (port) => puppeteer.connect({
  browserWSEndpoint: (await (await fetch('http://127.0.0.1:' + port + '/json/version')).json()).webSocketDebuggerUrl,
  defaultViewport: null, protocolTimeout: 300000,
});

const noCache = async (page) => {
  const cdp = await page.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.setBypassServiceWorker', { bypass: true });
};

const readProgress = async (sessionId) => {
  try {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/smartplan-ai-14200/databases/(default)/documents/liveLessonSessions/' + sessionId + '/public/groupProgress');
    if (res.status !== 200) return { status: res.status };
    const json = await res.json();
    const f = json.fields || {};
    const flat = (m) => {
      const out = {};
      const fields = (m && m.mapValue && m.mapValue.fields) || {};
      Object.keys(fields).forEach((k) => { out[k] = Number(fields[k].integerValue || 0); });
      return out;
    };
    return { status: 200, cueId: f.cueId && f.cueId.stringValue, stepId: f.stepId && f.stepId.stringValue, members: flat(f.members), submitted: flat(f.submitted) };
  } catch (e) { return { status: 'error', message: e.message }; }
};

(async () => {
  const gv = await connect(9222);
  const hs = await connect(9223);

  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 1000 });
  await noCache(gvp);
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  await gvp.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').indexOf('Bài học tương tác') >= 0);
    if (tab) tab.click();
  });
  await sleep(6000);
  let opened = false;
  for (let i = 0; i < 12; i++) {
    opened = await gvp.evaluate(() => {
      const norm = (r) => (r.innerText || '').replace(/\s+/g, ' ');
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => {
        const t = norm(r);
        return t.indexOf('Các số đặc trưng đo xu thế trung tâm — Tiết 2') >= 0 && t.indexOf('Lớp 11') >= 0;
      });
      if (!tr) return false;
      const btn = Array.from(tr.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (opened) break;
    await sleep(2500);
  }
  if (!opened) throw new Error('không mở được hàng 11-11-76');
  await sleep(4000);
  for (let i = 0; i < 15; i++) {
    const done = await gvp.evaluate((cid) => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return false;
      const opt = Array.from(sel.options).find((o) => o.value === cid);
      if (!opt) return false;
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, CLASS_ID);
    if (done) break;
    await sleep(2000);
  }
  await sleep(1500);
  for (let i = 0; i < 12; i++) {
    const clicked = await gvp.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => (x.textContent || '').indexOf('Tạo phiên tiết trực tiếp') >= 0 && !x.disabled);
      if (b) { b.click(); return true; }
      return false;
    });
    if (clicked) break;
    await sleep(2000);
  }
  let sessionId = null, studentLink = null;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const found = await gvp.evaluate(() => {
      const a = Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).find((x) => x.href.indexOf('mode=student') >= 0);
      const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
      return { link: a ? a.href : null, id: m ? m[1] : null };
    });
    if (found.id && found.link) { sessionId = found.id; studentLink = found.link; break; }
  }
  if (!sessionId) throw new Error('không tạo được phiên');
  console.log('SESSION:', sessionId);
  await gvp.close();

  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
  await noCache(gv2);
  await gv2.goto(studentLink.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  const gvClick = async (label) => {
    try {
      return await gv2.evaluate((l) => {
        const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === l && !x.disabled);
        if (b) { b.click(); return true; }
        return false;
      }, label);
    } catch (e) { return false; }
  };
  const stage = () => gv2.evaluate(() => { const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/); return m ? Number(m[1]) : 0; });
  for (let i = 0; i < 6; i++) { if (await gvClick('Chạy')) break; await sleep(2500); }
  await sleep(4000);
  let cur = await stage();
  for (let i = 0; i < 14 && cur < 7; i++) { await gvClick('Sau →'); await sleep(4000); cur = await stage(); }
  console.log('GV chặng:', cur);

  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 1400 });
  await noCache(hp);
  const chunkInfo = await (async () => {
    try {
      const perf = await hp.evaluate(() => 'ok');
      return perf;
    } catch (e) { return '?'; }
  })();
  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  await hp.evaluate(() => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(1200);
  await hp.evaluate(() => {
    const inp = document.querySelector('input[type="password"]');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(1200);
  await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
  await sleep(10000);
  console.log('HS vào live:', (await hp.evaluate(() => (document.body.innerText || ''))).indexOf('HỌC SINH · TIẾT TRỰC TIẾP') >= 0 ? '✓' : '✗');

  await hp.evaluate(() => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find((o) => o.value === '3');
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(1500);
  await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf('Xác nhận nhóm') >= 0 && !x.disabled); if (b) b.click(); });
  await sleep(5000);

  await sleep(12000);
  const sendState = await hp.evaluate(() => {
    const ta = Array.from(document.querySelectorAll('textarea')).find((a) => a.offsetParent !== null);
    if (ta) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      set.call(ta, 'Nhóm em lập bảng tần số, tính giá trị đại diện và nội suy số trung vị; kiểm lại bằng máy tính.');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Gửi câu trả lời' && !x.disabled);
    if (b) { b.click(); return 'sent'; }
    return 'not-sent';
  });
  console.log('HS gửi bài:', sendState);
  await sleep(8000);

  await gvClick('Hiện kết quả lớp');
  await sleep(6000);
  let progress = null;
  for (let i = 0; i < 12; i++) {
    progress = await readProgress(sessionId);
    if (progress.status === 200 && (progress.submitted || {})['3'] >= 1) break;
    await sleep(3000);
  }
  console.log('progress sau bật stats:', JSON.stringify(progress));

  await sleep(8000);
  const textA = await hp.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
  const r1 = textA.indexOf('Nhóm em xong sớm') >= 0;
  console.log('R1 THẺ DEEP:', r1 ? '✓ HIỆN' : '✗ không thấy');
  if (r1) {
    const i = textA.indexOf('Nhóm em xong sớm');
    console.log('R1 nội dung:', textA.slice(i, i + 280).replace(/\n/g, ' | '));
  } else {
    // chẩn đoán: myGroupNumber + groupCounters đã tới tay HS chưa
    const diag = await hp.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n').slice(0, 900));
    console.log('HS TEXT:', diag.replace(/\n/g, ' | '));
  }
  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png', fullPage: true }).catch(() => {});
  await gv2.screenshot({ path: 'tasks/tmp-xoaytua-gv.png', fullPage: true }).catch(() => {});
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
