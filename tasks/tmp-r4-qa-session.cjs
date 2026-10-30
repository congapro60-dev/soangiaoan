// R3 — tạo phiên live 2 (phiên 1 hết hạn). Lưu tasks/tmp-r4-qa-session.json
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';
const ROW_RX = 'Lớp 11 · Tuần 11 · Tiết 79';
const OUT = process.argv[2] || 'tasks/tmp-r4-qa-session.json';

(async () => {
  const info = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 300000 });
  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 25; i++) {
    const ok = await gv.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC') && /Tạo và xuất bản \d+ bài/.test(document.body.innerText || ''));
    if (ok) break;
    await sleep(2000);
  }
  await gv.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(4000);
  let clicked = false;
  for (let i = 0; i < 10; i++) {
    clicked = await gv.evaluate((rx) => {
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => (r.innerText || '').includes(rx));
      if (!tr) return false;
      const btn = Array.from(tr.querySelectorAll('button, a')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
      if (btn) { btn.click(); return true; }
      return false;
    }, ROW_RX);
    if (clicked) break;
    await sleep(2000);
  }
  if (!clicked) throw new Error('Không thấy hàng ' + ROW_RX);
  await sleep(3000);
  let classChosen = null;
  for (let i = 0; i < 12; i++) {
    classChosen = await gv.evaluate((cid) => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return { error: 'no-select' };
      const opt = Array.from(sel.options).find((o) => o.value === cid);
      if (!opt) return { error: 'no-option' };
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: sel.value };
    }, CLASS_ID);
    if (classChosen && classChosen.ok) break;
    await sleep(2000);
  }
  console.log('Lớp chọn:', JSON.stringify(classChosen));
  await sleep(1000);
  for (let i = 0; i < 10; i++) {
    const ok = await gv.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) => (b.textContent || '').includes('Tạo phiên tiết trực tiếp') && !b.disabled);
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (ok) break;
    await sleep(2000);
  }
  let sessionId = null;
  for (let i = 0; i < 25; i++) {
    await sleep(2000);
    sessionId = await gv.evaluate(() => {
      const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
      return m ? m[1] : null;
    });
    if (sessionId) break;
  }
  const links = await gv.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).map((a) => a.href).filter((v, i, a) => a.indexOf(v) === i));
  const s2 = {
    sessionId,
    tvControl: links.find((u) => u.includes('mode=tv-control')) || null,
    tv: links.find((u) => u.includes('mode=tv&')) || null,
    student: links.find((u) => u.includes('mode=student')) || null,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(OUT, JSON.stringify(s2, null, 1), 'utf8');
  console.log('SESSION2:', sessionId, '| student có joinCode:', /joinCode=R6RCFC/.test(s2.student || ''), '| saved ' + OUT);
  await gv.close().catch(() => {});
  browser.disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
