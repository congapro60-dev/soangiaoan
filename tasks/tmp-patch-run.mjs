import { readFileSync, writeFileSync } from 'node:fs';
const p = 'tasks/tmp-qa-xoaytua2.cjs';
let t = readFileSync(p, 'utf8');
const oldS = "  for (let i = 0; i < 5; i++) { if (await gvClick('Chạy')) break; await sleep(2500); }\n  await sleep(3000);";
const newS = `  let ran = false;
  for (const lbl of ['Chạy', 'Bắt đầu tiết', 'Chạy tiết']) {
    for (let i = 0; i < 3; i++) { if (await gvClick(lbl)) { ran = true; break; } await sleep(2000); }
    if (ran) break;
  }
  console.log('GV nút chạy:', ran);
  await sleep(3000);
  console.log('status:', await gvEval(() => { const x = document.body.innerText || ''; return x.includes('CHỜ VÀO TIẾT') ? 'waiting' : x.includes('ĐANG HỌC') ? 'running' : x.includes('TẠM DỪNG') ? 'paused' : '?'; }));`;
if (!t.includes(oldS)) throw new Error('run loop not found');
t = t.split(oldS).join(newS);
writeFileSync(p, t, 'utf8');
console.log('fixed');
