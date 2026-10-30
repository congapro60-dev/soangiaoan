import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-qa-stage7.cjs', 'utf8');
// Tạo phiên mới: đổi từ script qa-stage7 (dùng phiên cũ hết hạn) — chuyển thành tạo phiên mới bằng logic của tmp-qa-xoaytua.cjs phần tạo phiên
const createBlock = `  // Tạo phiên mới 11-11-76
  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 900 });
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 20; i++) { const ok = await gvp.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC') && /Tạo và xuất bản \d+ bài/.test(document.body.innerText || '')); if (ok) break; await sleep(2000); }
  await gvp.evaluate(() => { const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((x) => (x.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác')); if (tab) tab.click(); });
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
    const m = await gvp.evaluate(() => (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/));
    if (studentLink && m) { console.log('SESSION:', m[1]); break; }
  }
  if (!studentLink) throw new Error('Không tạo được phiên');
`;
// Chèn createBlock sau dòng "const gv2 = ..." đầu tiên trong qa-stage7? — thực tế qa-stage7 mở gv2 tv-control của phiên cũ.
// Cách gọn: thay thế mở đầu — trước khi goto tv-control, tạo phiên mới rồi dùng link mới.
const tvAnchor = "await gv2.goto(STUDENT_LINK.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });";
if (!t.includes(tvAnchor)) throw new Error('tv anchor missing');
t = t.replace(tvAnchor, createBlock + `\n  const tvLink = studentLink.replace('mode=student', 'mode=tv-control');\n  ` + tvAnchor.replace('STUDENT_LINK.replace(\'mode=student\', \'mode=tv-control\')', 'tvLink'));
// HS link: dùng studentLink mới thay STUDENT_LINK cũ
t = t.split("await hp.goto(STUDENT_LINK, { waitUntil: 'domcontentloaded', timeout: 90000 });").join("await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });");
writeFileSync('tasks/tmp-qa-xoaytua3.cjs', t, 'utf8');
console.log('written tmp-qa-xoaytua3.cjs');
