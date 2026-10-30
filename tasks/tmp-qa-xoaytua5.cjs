// QA xoay tua — phiên mới + HS login lớp + vào live chặng nhóm + thẻ DEEP
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  // Tạo phiên live 11-11-76
  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 900 });
  await gvp.goto('https://giaoandewey.vercel.app/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 20; i++) { const ok = await gvp.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC') && /Tạo và xuất bản \d+ bài/.test(document.body.innerText || '')); if (ok) break; await sleep(2000); }
  await gvp.evaluate(() => { const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác')); if (tab) tab.click(); });
  await sleep(4000);
  let clicked = false;
  for (let i = 0; i < 10; i++) {
    clicked = await gvp.evaluate(() => {
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => (r.innerText || '').includes('Các số đặc trưng đo xu thế trung tâm — Tiết 2') && (r.innerText || '').includes('Lớp 11'));
      if (!tr) return false;
      const btn = Array.from(tr.querySelectorAll('button, a')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (clicked) break;
    await sleep(2000);
  }
  if (!clicked) throw new Error('Không thấy hàng 11-11-76');
  await sleep(3000);
  for (let i = 0; i < 12; i++) {
    const ok = await gvp.evaluate(() => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return false;
      const opt = Array.from(sel.options).find((o) => o.value === 'class-1787188523562');
      if (!opt) return false;
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    if (ok) break;
    await sleep(2000);
  }
  await sleep(1000);
  for (let i = 0; i < 10; i++) {
    const ok = await gvp.evaluate(() => { const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => (x.textContent || '').includes('Tạo phiên tiết trực tiếp') && !x.disabled); if (b) { b.click(); return true; } return false; });
    if (ok) break;
    await sleep(2000);
  }
  let sessionId = null;
  let studentLink = null;
  for (let i = 0; i < 25; i++) {
    await sleep(2000);
    studentLink = await gvp.evaluate(() => { const a = Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).find((x) => x.href.includes('mode=student')); return a ? a.href : null; });
    const m = await gvp.evaluate(() => (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/));
    if (m) { sessionId = m[1]; break; }
  }
  console.log('SESSION:', sessionId);
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 900 });
  await gv2.goto(studentLink.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const gvClick = async (label) => gv2.evaluate((l) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === l && !x.disabled); if (b) { b.click(); return true; } return false; }, label);
  for (let i = 0; i < 5; i++) { if (await gvClick('Chạy')) break; await sleep(2500); }
  await sleep(3000);
  for (let target = 2; target <= 7; target++) {
    const cur = await gv2.evaluate(() => (document.body.innerText || '').match(/Chặng (\d+)\/12/)?.[1] || '1');
    if (Number(cur) < target) { await gvClick('Sau →'); await sleep(3500); } else if (Number(cur) > target) { await gvClick('← Trước'); await sleep(3500); }
  }
  await sleep(12000);
  console.log('GV ở chặng 7 ✓');

  // HS login lớp + vào live
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1000, height: 900 });
  await hp.goto('https://giaoandewey.vercel.app/lop/R6RCFC', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(8000);
  await hp.evaluate(() => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
    if (opt) {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(600);
  await hp.evaluate(() => {
    const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').toUpperCase().includes('PIN'));
    if (inp) {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(600);
  await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Vào lớp|Đăng nhập|Xác nhận/.test((x.textContent || '').trim()) && !x.disabled); if (b) b.click(); });
  await sleep(8000);
  await hp.goto(studentLink, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(12000);
  const t = await hp.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('R1 THẺ DEEP:', t.includes('Nhóm em xong sớm') ? '✓ HIỆN' : '✗ không thấy');
  console.log('R1 Đề VD:', (t.split('\n').find((l) => /mức VD|vận dụng/.test(l)) || '').slice(0, 110));
  console.log('TEXT (300):', t.slice(0, 300).replace(/\n/g, ' | '));
  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});
  await gv2.screenshot({ path: 'tasks/tmp-xoaytua-gv.png' }).catch(() => {});
  await hp.close(); await gv2.close(); await gvp.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
