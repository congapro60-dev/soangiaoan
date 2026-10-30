// Debug HS login trên phiên live mới — in trạng thái từng bước để biết vì sao nút bị disabled.
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';

const connect = async (port) => puppeteer.connect({
  browserWSEndpoint: (await (await fetch('http://127.0.0.1:' + port + '/json/version')).json()).webSocketDebuggerUrl,
  defaultViewport: null, protocolTimeout: 300000,
});

(async () => {
  const gv = await connect(9222);
  const hs = await connect(9223);

  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 1000 });
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  await gvp.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').indexOf('Bài học tương tác') >= 0);
    if (tab) tab.click();
  });
  await sleep(6000);
  let ok = false;
  for (let i = 0; i < 12; i++) {
    ok = await gvp.evaluate(() => {
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
    if (ok) break;
    await sleep(2500);
  }
  if (!ok) throw new Error('không mở được hàng 11-11-76');
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

  // GV chạy + tới chặng 7 (bền hơn: lặp tới khi đạt)
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 1000 });
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
  const stage = () => gv2.evaluate(() => {
    const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/);
    return m ? Number(m[1]) : 0;
  });
  for (let i = 0; i < 6; i++) { if (await gvClick('Chạy')) break; await sleep(2500); }
  await sleep(4000);
  let cur = await stage();
  console.log('chặng đầu:', cur);
  for (let i = 0; i < 12 && cur < 7; i++) {
    const before = cur;
    await gvClick('Sau →');
    await sleep(4000);
    cur = await stage();
    console.log('  nav:', before, '->', cur);
    if (cur === before) await sleep(3000);
  }
  console.log('GV chặng cuối:', cur);
  await gvClick('Hiện kết quả lớp');
  await sleep(4000);

  // HS login chi tiết
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 1000 });
  const errs = [];
  hp.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  hp.on('console', (m) => { const t = m.text(); if (m.type() === 'error') errs.push(t.slice(0, 200)); });
  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  console.log('form?', await hp.evaluate(() => (document.body.innerText || '').indexOf('Vào tiết học trực tiếp') >= 0));
  await hp.evaluate(() => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(1200);
  console.log('sau chọn tên:', JSON.stringify(await hp.evaluate(() => ({
    sel: document.querySelector('select').value,
    pin: (document.querySelector('input[type="password"]') || {}).value,
    btn: Array.from(document.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim(), dis: b.disabled })).filter((x) => x.t),
  }))));
  await hp.evaluate(() => {
    const inp = document.querySelector('input[type="password"]');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(1200);
  console.log('sau nhập PIN:', JSON.stringify(await hp.evaluate(() => ({
    pin: document.querySelector('input[type="password"]').value,
    btn: Array.from(document.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim(), dis: b.disabled })).filter((x) => x.t),
  }))));
  await hp.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled);
    if (b) b.click();
  });
  await sleep(10000);
  const txt = await hp.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
  console.log('SAU LOGIN (400):', txt.slice(0, 400).replace(/\n/g, ' | '));
  console.log('đã vào live?', txt.indexOf('HỌC SINH · TIẾT TRỰC TIẾP') >= 0);
  console.log('errors:', errs.slice(0, 5).join(' || ') || '(không)');

  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
