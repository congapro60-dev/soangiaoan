// R2 part3 bước 1 — tạo phiên 2 (log chi tiết từng nhịp): reload → hàng g11 → Mở tiết trực tiếp → dialog → lớp → tạo → ID + links
const puppeteer = require('puppeteer');
const fs = require('fs');

const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';
const ROW_RX = 'Lớp 11 · Tuần 11 · Tiết 76';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 120000 });

  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });

  // chờ app sẵn sàng
  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await gv.evaluate(() => {
      const t = document.body ? document.body.innerText : '';
      return t.includes('KHO BÀI HỌC') && /Tạo và xuất bản \d+ bài/.test(t);
    }).catch(() => false);
    if (ready) break;
    await sleep(2000);
  }
  console.log('App ready:', ready);

  await gv.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(5000);

  // tìm hàng + bấm Mở tiết trực tiếp (retry + log)
  let clicked = false;
  for (let i = 0; i < 10; i++) {
    clicked = await gv.evaluate((rx) => {
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => (r.innerText || '').includes(rx));
      if (!tr) return false;
      const btn = Array.from(tr.querySelectorAll('button, a')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
      if (btn) { btn.click(); return true; }
      return false;
    }, ROW_RX);
    console.log('Lần ' + (i + 1) + ' bấm Mở tiết trực tiếp:', clicked);
    if (clicked) break;
    await sleep(2000);
  }
  if (!clicked) {
    const body = await gv.evaluate(() => (document.body.innerText || '').slice(0, 1500));
    console.log('BODY (1500):\n' + body);
  }

  // chờ dialog
  let dlg = null;
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    dlg = await gv.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? (d.innerText || '').slice(0, 500) : null;
    }).catch(() => null);
    if (dlg) break;
  }
  console.log('Dialog:', dlg ? dlg.replace(/\n/g, ' | ').slice(0, 300) : '(không xuất hiện sau 30s)');
  if (!dlg) {
    await gv.screenshot({ path: 'tasks/tmp-r2-qa-p3-s2-nodialog.png' });
    await gv.close();
    browser.disconnect();
    process.exit(1);
  }

  // chọn lớp (retry)
  let chosen = null;
  for (let i = 0; i < 10; i++) {
    chosen = await gv.evaluate((cid) => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return { error: 'no-select' };
      const opt = Array.from(sel.options).find((o) => o.value === cid);
      if (!opt) return { error: 'no-option' };
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: sel.value };
    }, CLASS_ID);
    if (chosen && chosen.ok) break;
    await sleep(2000);
  }
  console.log('Lớp:', JSON.stringify(chosen));
  await sleep(1000);

  // bấm tạo phiên (retry chờ enable)
  let created = false;
  for (let i = 0; i < 10; i++) {
    created = await gv.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((b) => (b.textContent || '').includes('Tạo phiên tiết trực tiếp') && !b.disabled);
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (created) break;
    await sleep(2000);
  }
  console.log('Bấm tạo phiên:', created);

  // chờ ID (30×2s)
  let sessionId = null;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    sessionId = await gv.evaluate(() => {
      const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
      return m ? m[1] : null;
    }).catch(() => null);
    if (sessionId) break;
  }
  console.log('SESSION 2 ID:', sessionId);

  const links = await gv.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).map((a) => a.href).filter((v, i, a) => a.indexOf(v) === i)).catch(() => []);
  const s2 = {
    sessionId,
    tvControl: links.find((u) => u.includes('mode=tv-control')) || null,
    student: links.find((u) => u.includes('mode=student')) || null,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync('tasks/tmp-r2-qa-session2.json', JSON.stringify(s2, null, 1), 'utf8');
  console.log('LINKS:', JSON.stringify(s2, null, 1));
  await gv.screenshot({ path: 'tasks/tmp-r2-qa-p3-s2-created.png' });
  await gv.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
