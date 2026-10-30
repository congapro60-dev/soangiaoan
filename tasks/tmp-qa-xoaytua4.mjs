
import { createRequire } from 'node:module';
import { setTimeout as sleep } from 'node:timers/promises';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
(async () => {
const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
const gv2 = await gv.newPage();
await gv2.setViewport({ width: 1440, height: 900 });
const hp = await hs.newPage();
await hp.setViewport({ width: 1000, height: 900 });
const gvEval = async (fn, arg) => { try { return await gv2.evaluate(fn, arg); } catch (e) { return null; } };
const hsEval = async (fn) => { try { return await hp.evaluate(fn); } catch (e) { return null; } };
const STUDENT_LINK = 'https://giaoandewey.vercel.app/adaptive-live/sY4gRJSMS1h6v9eTy7A5?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';
await gv2.goto(STUDENT_LINK.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
await sleep(8000);
await hp.goto(STUDENT_LINK, { waitUntil: 'domcontentloaded', timeout: 90000 });
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
const gvClick = async (label) => gvEval((l) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === l && !x.disabled); if (b) { b.click(); return true; } return false; }, label);
for (let i = 0; i < 5; i++) { if (await gvClick('Chạy')) break; await sleep(2500); }
await sleep(3000);
for (let target = 2; target <= 7; target++) {
  const cur = await gvEval(() => (document.body.innerText || '').match(/Chặng (\d+)\/12/)?.[1] || '1');
  if (Number(cur) < target) { await gvClick('Sau →'); await sleep(3500); } else if (Number(cur) > target) { await gvClick('← Trước'); await sleep(3500); }
}
await sleep(12000);
const t = await hsEval(() => (document.body.innerText || '').split('\n\n').join('\n')) || '';
console.log('HS @ chặng 7:', (t.split('\n').find((l) => /CÙNG NHAU|Nhóm/.test(l)) || '').slice(0, 60), '| có select:', await hsEval(() => Boolean(document.querySelector('select'))));
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
  const t2 = await hsEval(() => (document.body.innerText || '').split('\n\n').join('\n')) || '';
  console.log('R1 THẺ DEEP:', t2.includes('Nhóm em xong sớm') ? '✓ HIỆN' : '✗ không thấy');
  console.log('R1 Đề VD:', (t2.split('\n').find((l) => /mức VD|vận dụng cao/.test(l)) || '').slice(0, 100));
  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});
  const gt = await gvEval(() => (document.body.innerText || '').split('\n\n').join('\n')) || '';
  console.log('R2 NHÃN CHẬM (GV):', gt.includes('Nhóm chậm') ? (gt.split('\n').find((l) => l.includes('Nhóm chậm')) || '').slice(0, 120) : 'không hiện');
  await gv2.screenshot({ path: 'tasks/tmp-xoaytua-gv.png' }).catch(() => {});
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();

  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
