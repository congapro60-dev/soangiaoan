// QA nhóm xoay tua (R1 + R2) — bản chốt, chỉ cần 1 HS.
// Trình tự: HS vào nhóm 3 nhưng CHƯA gửi → chờ quá 80% thời lượng chặng → GV thấy "Nhóm chậm" (R2),
// HS không thấy → HS gửi hết bài luyện tập → thẻ DEEP hiện (R1) và nhãn chậm biến mất.
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';
const HS = { name: 'Đặng Tuệ Minh', pin: '2750', group: '3' };

const connect = async (port) => puppeteer.connect({
  browserWSEndpoint: (await (await fetch('http://127.0.0.1:' + port + '/json/version')).json()).webSocketDebuggerUrl,
  defaultViewport: null, protocolTimeout: 300000,
});

const clickByText = async (page, text, exact) => {
  try {
    return await page.evaluate((t, ex) => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => {
        const label = (x.textContent || '').trim();
        const hit = ex ? label === t : label.indexOf(t) >= 0;
        return hit && !x.disabled;
      });
      if (b) { b.click(); return true; }
      return false;
    }, text, Boolean(exact));
  } catch (e) { return false; }
};

const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n'));

const readProgress = async (sessionId) => {
  try {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/smartplan-ai-14200/databases/(default)/documents/liveLessonSessions/' + sessionId + '/public/groupProgress');
    if (res.status !== 200) return { status: res.status };
    const json = await res.json();
    const f = json.fields || {};
    const flatten = (m) => {
      const out = {};
      const fields = (m && m.mapValue && m.mapValue.fields) || {};
      Object.keys(fields).forEach((k) => { out[k] = Number(fields[k].integerValue || 0); });
      return out;
    };
    return { status: 200, cueId: f.cueId && f.cueId.stringValue, members: flatten(f.members), submitted: flatten(f.submitted) };
  } catch (e) { return { status: 'error', message: e.message }; }
};

(async () => {
  const gv = await connect(9222);
  const hs = await connect(9223);

  // ---------- 1. Tạo phiên ----------
  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 900 });
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 25; i++) { if (await gvp.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC'))) break; await sleep(2000); }
  await gvp.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(5000);
  let rowClicked = false;
  for (let i = 0; i < 12; i++) {
    rowClicked = await gvp.evaluate(() => {
      const norm = (r) => (r.innerText || '').replace(/\s+/g, ' ');
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => {
        const t = norm(r);
        return t.indexOf('Các số đặc trưng đo xu thế trung tâm — Tiết 2') >= 0 && t.indexOf('Lớp 11') >= 0;
      });
      if (!tr) return false;
      const btn = Array.from(tr.querySelectorAll('button, a')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (rowClicked) break;
    await sleep(2000);
  }
  if (!rowClicked) throw new Error('Không thấy hàng 11-11-76');
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
  if (!sessionId) throw new Error('Không tạo được phiên');
  console.log('SESSION:', sessionId);
  await gvp.close();

  // ---------- 2. GV: chạy + tới chặng 7 + bật kết quả lớp ----------
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 900 });
  await gv2.goto(studentLink.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  for (let i = 0; i < 6; i++) { if (await clickByText(gv2, 'Chạy', true)) break; await sleep(2500); }
  await sleep(4000);
  for (let target = 2; target <= 7; target++) {
    const cur = await gv2.evaluate(() => { const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/); return m ? Number(m[1]) : 1; });
    if (cur < target) { await clickByText(gv2, 'Sau →', true); await sleep(4000); }
    else if (cur > target) { await clickByText(gv2, '← Trước', true); await sleep(4000); }
  }
  console.log('GV chặng:', await gv2.evaluate(() => { const m = (document.body.innerText || '').match(/Chặng \d+\/12/); return m ? m[0] : '?'; }));
  await sleep(4000);
  await clickByText(gv2, 'Hiện kết quả lớp', true);
  await sleep(5000);
  console.log('nút kết quả lớp:', await gv2.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /kết quả/.test(x.textContent || ''));
    return b ? (b.textContent || '').trim() : '?';
  }));

  // ---------- 3. HS: login + chọn nhóm 3 (CHƯA gửi) ----------
  const page = await hs.newPage();
  await page.setViewport({ width: 1100, height: 900 });
  await page.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  const hasForm = await page.evaluate(() => (document.body.innerText || '').indexOf('Vào tiết học trực tiếp') >= 0 && Boolean(document.querySelector('select')));
  if (!hasForm) throw new Error('Không thấy form đăng nhập HS (phiên có thể đã hết hạn)');
  await page.evaluate((name) => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === name);
    if (opt) {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, HS.name);
  await sleep(700);
  await page.evaluate((pin) => {
    const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').toUpperCase().indexOf('PIN') >= 0);
    if (inp) {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, pin);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, HS.pin);
  await sleep(700);
  await clickByText(page, 'Vào lớp', true);
  await sleep(8000);
  console.log('HS đăng nhập live:', (await bodyText(page)).indexOf('HỌC SINH · TIẾT TRỰC TIẾP') >= 0 ? '✓' : '✗');

  const picked = await page.evaluate((g) => {
    const sel = document.querySelector('select');
    if (!sel) return { ok: false, why: 'no-select' };
    const opt = Array.from(sel.options).find((o) => o.value === g);
    if (!opt) return { ok: false, why: 'no-option' };
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: sel.value };
  }, HS.group);
  await sleep(1500);
  const confirmed = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf('Xác nhận nhóm') >= 0 && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  });
  await sleep(4000);
  console.log('HS chọn nhóm ' + HS.group + ':', JSON.stringify(picked), '| xác nhận:', confirmed);

  // ---------- 4. R2: chờ quá 80% thời lượng chặng (nhóm có người, chưa ai gửi) ----------
  let r2 = false, r2Text = '', waited = 0;
  for (let i = 0; i < 44; i++) {
    await sleep(15000);
    waited += 15;
    const gvText = await bodyText(gv2);
    if (gvText.indexOf('Nhóm chậm') >= 0) {
      r2 = true; r2Text = gvText;
      console.log('R2 xuất hiện sau ~' + waited + 's');
      break;
    }
    if (i % 4 === 0) {
      const p = await readProgress(sessionId);
      console.log('  [' + waited + 's] progress:', JSON.stringify(p));
    }
  }
  console.log('R2 NHÃN CHẬM (GV):', r2 ? r2Text.slice(r2Text.indexOf('Nhóm chậm'), r2Text.indexOf('Nhóm chậm') + 170).replace(/\n/g, ' | ') : '✗ không hiện sau ' + waited + 's');
  const hsTextR2 = await bodyText(page);
  console.log('HS không thấy nhãn chậm (đúng yêu cầu):', hsTextR2.indexOf('Nhóm chậm') < 0 ? '✓' : '✗');

  // ---------- 5. HS gửi hết bài luyện tập → R1 ----------
  const filled = await page.evaluate(() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    const areas = Array.from(document.querySelectorAll('textarea')).filter((a) => a.offsetParent !== null);
    areas.forEach((a, i) => {
      set.call(a, 'Bài ' + (i + 1) + ': em lập bảng tần số, tính giá trị đặc trưng rồi kiểm lại bằng máy tính.');
      a.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return areas.length;
  });
  await sleep(1500);
  const clickedSend = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((x) => (x.textContent || '').trim() === 'Gửi bài này' && !x.disabled);
    buttons.forEach((b) => b.click());
    return buttons.length;
  });
  console.log('HS gửi bài: điền', filled, 'ô · bấm', clickedSend, 'nút');
  await sleep(6000);

  let progress = null;
  for (let i = 0; i < 15; i++) {
    await sleep(4000);
    progress = await readProgress(sessionId);
    if (progress.status === 200) {
      const m = (progress.members || {})[HS.group] || 0;
      const s = (progress.submitted || {})[HS.group] || 0;
      if (m > 0 && s >= m) break;
    }
  }
  console.log('groupProgress sau khi gửi:', JSON.stringify(progress));
  await sleep(7000);
  const textAfter = await bodyText(page);
  const r1 = textAfter.indexOf('Nhóm em xong sớm') >= 0;
  console.log('R1 THẺ DEEP:', r1 ? '✓ HIỆN' : '✗ không thấy');
  if (r1) {
    const i = textAfter.indexOf('Nhóm em xong sớm');
    console.log('R1 nội dung:', textAfter.slice(i, i + 280).replace(/\n/g, ' | '));
  }
  const gvAfter = await bodyText(gv2);
  console.log('R2 nhãn chậm biến mất sau khi nhóm gửi đủ:', gvAfter.indexOf('Nhóm chậm') < 0 ? '✓' : '✗ vẫn còn');

  await page.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});
  await gv2.screenshot({ path: 'tasks/tmp-xoaytua-gv.png' }).catch(() => {});
  await page.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
