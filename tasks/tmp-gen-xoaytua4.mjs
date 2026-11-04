// QA xoay tua phiên k02h — nav chặng 7 + chọn nhóm + gửi + thẻ DEEP (base: tdz-sm + tail)
import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-qa-tdz-sm.mjs', 'utf8');
const tail = `
  // HS chọn nhóm 3 + xác nhận + gửi phần nhóm
  const picked = await hsEval(() => {
    const sel = document.querySelector('select');
    if (!sel) return { ok: false };
    const opt = Array.from(sel.options).find((o) => o.value === '3');
    if (!opt) return { ok: false };
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: sel.value };
  });
  console.log('chọn nhóm:', JSON.stringify(picked));
  await sleep(2000);
  const confirmed = await hsEval(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Xác nhận nhóm/.test((x.textContent || '')) && !x.disabled); if (b) { b.click(); return true; } return false; });
  console.log('xác nhận nhóm:', confirmed);
  await sleep(3000);
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
  console.log('R1 Đề VD:', (t2.split('\n').find((l) => /mức VD|vận dụng cao/.test(l)) || '').slice(0, 100));
  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});
  const gt = await gvEval(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')) || '';
  console.log('R2 NHÃN CHẬM (GV):', gt.includes('Nhóm chậm') ? (gt.split('\n').find((l) => l.includes('Nhóm chậm')) || '').slice(0, 120) : 'không hiện');
  await gv2.screenshot({ path: 'tasks/tmp-xoaytua-gv.png' }).catch(() => {});
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
`;
// Chèn trước process.exit cuối
const exitIdx = t.lastIndexOf('process.exit(0);');
t = t.slice(0, exitIdx) + tail + '\n  ' + t.slice(exitIdx);
writeFileSync('tasks/tmp-qa-xoaytua4.mjs', t, 'utf8');
console.log('written tmp-qa-xoaytua4.mjs');
