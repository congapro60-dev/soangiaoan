// QA xoay tua (R1/R2) — tạo phiên mới, GV tới chặng nhóm, HS đăng nhập ngay trong trang live,
// chọn nhóm, gửi bài, rồi kiểm thẻ DEEP + nhãn chậm. Không dùng regex trong chuỗi sinh.
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';
const JOIN_CODE = 'R6RCFC';
const STUDENT_NAME = 'Đặng Tuệ Minh';
const STUDENT_PIN = '2750';

(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 240000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 240000 });

  // ---------- 1. Tạo phiên live cho 11-11-76 ----------
  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 900 });
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 25; i++) {
    const ok = await gvp.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC'));
    if (ok) break;
    await sleep(2000);
  }
  await gvp.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(5000);
  let clicked = false;
  for (let i = 0; i < 12; i++) {
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
  for (let i = 0; i < 15; i++) {
    const ok = await gvp.evaluate((cid) => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return false;
      const opt = Array.from(sel.options).find((o) => o.value === cid);
      if (!opt) return false;
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, CLASS_ID);
    if (ok) break;
    await sleep(2000);
  }
  await sleep(1200);
  for (let i = 0; i < 12; i++) {
    const ok = await gvp.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => (x.textContent || '').includes('Tạo phiên tiết trực tiếp') && !x.disabled);
      if (b) { b.click(); return true; }
      return false;
    });
    if (ok) break;
    await sleep(2000);
  }
  let sessionId = null;
  let studentLink = null;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const found = await gvp.evaluate(() => {
      const a = Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).find((x) => x.href.indexOf('mode=student') >= 0);
      const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
      return { link: a ? a.href : null, id: m ? m[1] : null };
    });
    if (found.id && found.link) { sessionId = found.id; studentLink = found.link; break; }
  }
  if (!sessionId) throw new Error('Không tạo được phiên');
  console.log('SESSION:', sessionId);
  await gvp.close();

  // ---------- 2. GV điều khiển tới chặng nhóm ----------
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 900 });
  await gv2.goto(studentLink.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  const gvClick = async (label) => {
    try {
      return await gv2.evaluate((l) => {
        const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === l && !x.disabled);
        if (b) { b.click(); return true; }
        return false;
      }, label);
    } catch (e) { return false; }
  };
  for (let i = 0; i < 6; i++) { if (await gvClick('Chạy')) break; await sleep(2500); }
  await sleep(4000);
  for (let target = 2; target <= 7; target++) {
    const cur = await gv2.evaluate(() => {
      const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/);
      return m ? Number(m[1]) : 1;
    });
    if (cur < target) { await gvClick('Sau →'); await sleep(4000); }
    else if (cur > target) { await gvClick('← Trước'); await sleep(4000); }
  }
  const gvStage = await gv2.evaluate(() => {
    const m = (document.body.innerText || '').match(/Chặng \d+\/12/);
    return m ? m[0] : '?';
  });
  console.log('GV chặng:', gvStage);
  await sleep(8000);

  // ---------- 3. HS đăng nhập ngay trong trang live ----------
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 900 });
  const hsEval = async (fn, arg) => { try { return await hp.evaluate(fn, arg); } catch (e) { return null; } };
  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  for (let round = 0; round < 8; round++) {
    const hasForm = await hsEval(() => (document.body.innerText || '').indexOf('Vào tiết học trực tiếp') >= 0 && Boolean(document.querySelector('select')));
    if (!hasForm) break;
    await hsEval((name) => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === name);
      if (!opt) return false;
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, STUDENT_NAME);
    await sleep(700);
    await hsEval((pin) => {
      const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').toUpperCase().indexOf('PIN') >= 0);
      if (!inp) return false;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, pin);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, STUDENT_PIN);
    await sleep(600);
    await hsEval(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled);
      if (b) { b.click(); return true; }
      return false;
    });
    await sleep(6000);
  }
  const loggedIn = await hsEval(() => (document.body.innerText || '').indexOf('HỌC SINH · TIẾT TRỰC TIẾP') >= 0);
  console.log('HS đăng nhập live:', loggedIn ? '✓' : '✗');

  // ---------- 4. HS chọn nhóm + gửi ----------
  const hasSelect = await hsEval(() => Boolean(document.querySelector('select')));
  console.log('có picker nhóm:', hasSelect);
  if (hasSelect) {
    const picked = await hsEval(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.value === '3');
      if (!opt) return { ok: false };
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, value: sel.value };
    });
    console.log('chọn nhóm 3:', JSON.stringify(picked));
    await sleep(2500);
    const confirmed = await hsEval(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf('Xác nhận nhóm') >= 0 && !x.disabled);
      if (b) { b.click(); return true; }
      return false;
    });
    console.log('bấm xác nhận nhóm:', confirmed);
    await sleep(3000);
  }
  const sent = await hsEval(() => {
    const ta = Array.from(document.querySelectorAll('textarea')).find((e) => e.offsetParent !== null);
    if (ta) {
      const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      set.call(ta, 'Nhóm em thống nhất: Q1 là giá trị có tần số tích luỹ vượt n/4; Q3 ứng với 3n/4.');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim().indexOf('Gửi') === 0 && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  });
  console.log('gửi phần nhóm:', sent);

  // ---------- 5. Poll groupProgress công khai + kiểm thẻ ----------
  let progress = null;
  for (let i = 0; i < 20; i++) {
    await sleep(3000);
    try {
      const res = await fetch('https://firestore.googleapis.com/v1/projects/smartplan-ai-14200/databases/(default)/documents/liveLessonSessions/' + sessionId + '/public/groupProgress');
      if (res.status === 200) {
        const json = await res.json();
        const f = json.fields || {};
        progress = {
          cueId: f.cueId && f.cueId.stringValue,
          members: f.members && f.members.mapValue && f.members.mapValue.fields,
          submitted: f.submitted && f.submitted.mapValue && f.submitted.mapValue.fields,
        };
        break;
      }
    } catch (e) { /* ignore */ }
  }
  console.log('groupProgress:', progress ? JSON.stringify(progress).slice(0, 400) : 'KHÔNG CÓ (null/403)');

  const hsText = (await hsEval(() => (document.body.innerText || '').split('\n\n').join('\n'))) || '';
  const r1 = hsText.indexOf('Nhóm em xong sớm') >= 0;
  console.log('R1 THẺ DEEP:', r1 ? '✓ HIỆN' : '✗ không thấy');
  if (r1) {
    const idx = hsText.indexOf('Nhóm em xong sớm');
    console.log('R1 nội dung:', hsText.slice(idx, idx + 220).replace(/\n/g, ' | '));
  }
  const gvText = await gv2.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));
  const r2 = gvText.indexOf('Nhóm chậm') >= 0;
  console.log('R2 NHÃN CHẬM (GV):', r2 ? (gvText.slice(gvText.indexOf('Nhóm chậm'), gvText.indexOf('Nhóm chậm') + 140).replace(/\n/g, ' | ')) : 'không hiện');

  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});
  await gv2.screenshot({ path: 'tasks/tmp-xoaytua-gv.png' }).catch(() => {});
  await hp.close();
  await gv2.close();
  await gv.disconnect();
  await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
