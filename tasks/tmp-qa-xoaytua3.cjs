// QA xoay tua — tiếp nối phiên wPXEqrWTZUe1bKe5GAGG (chống detached frame)
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const STUDENT_LINK = APP + '/adaptive-live/wPXEqrWTZUe1bKe5GAGG?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  const hp = await hs.newPage();
  await hp.setViewport({ width: 1000, height: 900 });
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 900 });

  const gvEval = async (fn, arg) => { try { return await gv2.evaluate(fn, arg); } catch (e) { console.log('[gv detached]', e.message); return null; } };
  const hsEval = async (fn) => { try { return await hp.evaluate(fn); } catch (e) { console.log('[hs detached]', e.message); return null; } };

  // GV mở tv-control (trang mới — không detach)
    // Tạo phiên mới 11-11-76
  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 900 });
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 20; i++) { const ok = await gvp.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC') && /Tạo và xuất bản d+ bài/.test(document.body.innerText || '')); if (ok) break; await sleep(2000); }
  await gvp.evaluate(() => { const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((x) => (x.textContent || '').replace(/s+/g, ' ').includes('Bài học tương tác')); if (tab) tab.click(); });
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
  let studentLink = null;
  for (let i = 0; i < 25; i++) {
    await sleep(2000);
    studentLink = await gvp.evaluate(() => { const a = Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).find((x) => x.href.includes('mode=student')); return a ? a.href : null; });
    const m = await gvp.evaluate(() => (document.body.innerText || '').match(/Đã tạo phiên chung:s*(S+)/));
    if (studentLink && m) { console.log('SESSION:', m[1]); break; }
  }
  if (!studentLink) throw new Error('Không tạo được phiên');

  const tvLink = studentLink.replace('mode=student', 'mode=tv-control');
  await gv2.goto(tvLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  // HS join
  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  for (let i = 0; i < 6; i++) {
    const hasForm = await hsEval(() => (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')));
    if (!hasForm) break;
    await hsEval(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(700);
    await hsEval(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    await hsEval(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
    await sleep(4000);
  }
  console.log('HS joined');
  const gvClick = async (label) => gvEval((l) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === l && !x.disabled); if (b) { b.click(); return true; } return false; }, label);
  let ran = false;
  for (const lbl of ['Chạy', 'Bắt đầu tiết', 'Chạy tiết']) {
    for (let i = 0; i < 3; i++) { if (await gvClick(lbl)) { ran = true; break; } await sleep(2000); }
    if (ran) break;
  }
  console.log('GV nút chạy:', ran);
  await sleep(3000);
  console.log('status:', await gvEval(() => { const x = document.body.innerText || ''; return x.includes('CHỜ VÀO TIẾT') ? 'waiting' : x.includes('ĐANG HỌC') ? 'running' : x.includes('TẠM DỪNG') ? 'paused' : '?'; }));

  // Nav tới chặng nhóm — dừng khi HS thấy group picker
  let stopped = null;
  for (let target = 2; target <= 7; target++) {
    const cur = await gvEval(() => (document.body.innerText || '').match(/Chặng (\d+)\/12/)?.[1] || '1') || '1';
    if (Number(cur) < target) { await gvClick('Sau →'); await sleep(4500); } else if (Number(cur) > target) { await gvClick('← Trước'); await sleep(4500); }
    stopped = await gvEval(() => (document.body.innerText || '').match(/Chặng \d+\/12/)?.[0] || null);
    const t = await hsEval(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')) || '';
    const isGroup = /Nhóm đã phân công|Xác nhận nhóm/.test(t);
    console.log('Chặng', stopped, '| group picker:', isGroup ? '✓' : '—');
    if (isGroup) { await sleep(10000); const dump = await hsEval(() => (document.body.innerText || '').slice(0, 500)); console.log('HS @ nhóm:', (dump || '').replace(/\n/g, ' | ')); break; }
  }

  await sleep(12000);
  const hsDump = await hsEval(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')) || '';
  console.log('HS TEXT (800):', hsDump.slice(0, 800).replace(/\n/g, ' | '));
  console.log('co select:', await hsEval(() => Boolean(document.querySelector('select'))));

  // HS chọn nhóm 3 + xác nhận
  const joined = await hsEval(() => {
    const sel = document.querySelector('select');
    if (!sel) return { ok: false };
    const opt = Array.from(sel.options).find((o) => o.value === '3');
    if (!opt) return { ok: false };
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: sel.value };
  });
  console.log('HS chọn nhóm 3:', JSON.stringify(joined));
  await sleep(2500);
  await hsEval(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Xác nhận nhóm/.test((x.textContent || '')) && !x.disabled); if (b) b.click(); });
  await sleep(3000);
  // Gửi phần nhóm (textarea + Gửi)
  const sent = await hsEval(() => {
    const ta = Array.from(document.querySelectorAll('textarea')).find((e) => e.offsetParent !== null);
    if (ta) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      set.call(ta, 'Nhóm em thống nhất: nhóm chứa Q1 có tần số tích lũy vượt n/4; Q3 ứng với 3n/4.');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const b = Array.from(document.querySelectorAll('button')).find((x) => /^Gửi/.test((x.textContent || '').trim()) && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  });
  console.log('gửi phần nhóm:', sent);
  await sleep(10000);
  const t2 = await hsEval(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')) || '';
  console.log('R1 THẺ DEEP:', t2.includes('Nhóm em xong sớm') ? '✓ HIỆN' : '✗ không thấy');
  console.log('R1 Đề VD:', (t2.split('\n').find((l) => /mức VD|vận dụng cao/.test(l)) || '').slice(0, 90));
  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});
  const gt = await gvEval(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')) || '';
  console.log('R2 NHÃN CHẬM (GV):', gt.includes('Nhóm chậm') ? (gt.split('\n').find((l) => l.includes('Nhóm chậm')) || '').slice(0, 110) : 'không hiện');
  await gv2.screenshot({ path: 'tasks/tmp-xoaytua-gv.png' }).catch(() => {});
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
