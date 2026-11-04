// QA nhóm xoay tua tự động trên phiên live Production
// HS: Tuệ Minh (R6RCFC, PIN 2750) — chọn nhóm, gửi phần nhóm → thẻ DEEP (R1); GV thấy nhãn chậm (R2)
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  // Tạo phiên live 11-11-76
  const gp = await gv.newPage();
  await gp.setViewport({ width: 1440, height: 900 });
  await gp.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 20; i++) { const ok = await gp.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC') && /Tạo và xuất bản \d+ bài/.test(document.body.innerText || '')); if (ok) break; await sleep(2000); }
  await gp.evaluate(() => { const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác')); if (tab) tab.click(); });
  await sleep(4000);
  let clicked = false;
  for (let i = 0; i < 10; i++) {
    clicked = await gp.evaluate(() => {
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
    const ok = await gp.evaluate(() => {
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
    const ok = await gp.evaluate(() => { const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => (x.textContent || '').includes('Tạo phiên tiết trực tiếp') && !x.disabled); if (b) { b.click(); return true; } return false; });
    if (ok) break;
    await sleep(2000);
  }
  let sessionId = null;
  let studentLink = null;
  for (let i = 0; i < 25; i++) {
    await sleep(2000);
    const links = await gp.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).map((a) => a.href));
    studentLink = links.find((u) => u.includes('mode=student')) || null;
    const m = await gp.evaluate(() => (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/));
    if (m) { sessionId = m[1]; break; }
  }
  console.log('SESSION:', sessionId);
  await gp.close();

  // HS join + chạy theo GV
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1000, height: 900 });
  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  // login lớp nếu form
  for (let i = 0; i < 6; i++) {
    const hasForm = await hp.evaluate(() => (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')));
    if (!hasForm) break;
    await hp.evaluate(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(700);
    await hp.evaluate(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
    await sleep(4000);
  }
  console.log('HS joined');

  // GV: chạy tiết + nav tới chặng có StudentGroupPicker (checkpoint nhóm)
  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 900 });
  const tvControl = studentLink.replace('mode=student', 'mode=tv-control');
  await gvp.goto(tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const gvClick = (label) => gvp.evaluate((l) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === l && !x.disabled); if (b) { b.click(); return true; } return false; }, label);
  for (let i = 0; i < 6; i++) { if (await gvClick('Chạy')) break; await sleep(2000); }
  await sleep(3000);

  // Nav dần và dừng khi HS thấy Group picker (isGroupActivity)
  let stageInfo = null;
  for (let target = 2; target <= 11; target++) {
    const cur = await gvp.evaluate(() => (document.body.innerText || '').match(/Chặng (\d+)\/12/)?.[1] || '1');
    if (Number(cur) < target) { await gvClick('Sau →'); await sleep(4000); }
    stageInfo = await gvp.evaluate(() => (document.body.innerText || '').match(/Chặng \d+\/12/)?.[0] || null);
    const hasPicker = await hp.evaluate(() => Boolean(document.querySelector('select')) && /Nhóm|Xác nhận nhóm/.test(document.body.innerText || ''));
    const t = await hp.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
    const isGroup = /Nhóm đã phân công|Xác nhận nhóm|Nhóm đã chọn/.test(t) || hasPicker;
    if (isGroup) { console.log('CHẶNG NHÓM tại:', stageInfo, '| picker:', hasPicker); break; }
  }

  // HS chọn nhóm 3 + gửi phần nhóm (nếu có trường gửi)
  const joined = await hp.evaluate(() => {
    const sel = document.querySelector('select');
    if (!sel) return { picker: false };
    const opt = Array.from(sel.options).find((o) => o.value === '3');
    if (!opt) return { picker: false };
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { picker: true, value: sel.value };
  });
  console.log('HS chọn nhóm:', JSON.stringify(joined));
  await sleep(2500);
  await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Xác nhận nhóm/.test((x.textContent || '')) && !x.disabled); if (b) b.click(); });
  await sleep(3000);
  // Gửi phần nhóm (textarea + nút Gửi) nếu có
  const sent = await hp.evaluate(() => {
    const ta = Array.from(document.querySelectorAll('textarea')).find((e) => e.offsetParent !== null);
    if (ta) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      set.call(ta, 'Nhóm em thống nhất: nhóm chứa Q1 là nhóm có tần số tích lũy vượt n/4; Q3 tương ứng 3n/4.');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const b = Array.from(document.querySelectorAll('button')).find((x) => /^Gửi/.test((x.textContent || '').trim()) && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  });
  console.log('HS gửi phần nhóm:', sent);
  await sleep(8000);
  // Kiểm thẻ DEEP (R1) — nhóm 1 thành viên đã gửi → done
  const t2 = await hp.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('R1 THẺ DEEP:', t2.includes('Nhóm em xong sớm') ? '✓ HIỆN' : '✗ không thấy', '| Đề VD:', (t2.split('\n').find((l) => /mức VD|VD/.test(l)) || '').slice(0, 60));
  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});
  // GV — kiểm nhãn nhóm chậm (R2): chỉ 1 nhóm có HS; nhóm khác trống → không nhãn; chụp màn hình panel
  const gt = await gvp.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('R2 NHÃN CHẬM (GV):', gt.includes('Nhóm chậm') ? (gt.split('\n').find((l) => l.includes('Nhóm chậm')) || '').slice(0, 90) : 'không hiện (đúng — chỉ 1 nhóm có HS, đã gửi đủ)');
  await gvp.screenshot({ path: 'tasks/tmp-xoaytua-gv.png' }).catch(() => {});
  await hp.close(); await gvp.close();
  await gb.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
