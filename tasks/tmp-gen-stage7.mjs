import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-qa-xoaytua2.cjs', 'utf8');
// Giữ nguyên link phiên wPXE + đổi loop nav: chỉ tới chặng 7 rồi dump HS
t = t.split('for (let target = 2; target <= 11; target++) {').join('for (let target = 2; target <= 7; target++) {');
// Sau vòng nav, thêm dump HS (trước phần "HS chọn nhóm 3")
const anchor = "  // HS chọn nhóm 3 + xác nhận";
if (!t.includes(anchor)) throw new Error('anchor missing');
const dumpBlock = String.raw`  await sleep(12000);
  const hsDump = await hsEval(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')) || '';
  console.log('HS TEXT (800):', hsDump.slice(0, 800).replace(/\n/g, ' | '));
  console.log('co select:', await hsEval(() => Boolean(document.querySelector('select'))));

`;
t = t.replace(anchor, dumpBlock + anchor);
// Bỏ phần sau "HS gửi phần nhóm" (chưa cần) — cắt tại log R1
const cutIdx = t.indexOf("  // Gửi phần nhóm (textarea + Gửi)");
if (cutIdx === -1) throw new Error('cut anchor missing');
t = t.slice(0, cutIdx) + "  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});\n  await hp.close(); await gv2.close();\n  await gv.disconnect(); await hs.disconnect();\n  process.exit(0);\n})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });\n";
writeFileSync('tasks/tmp-qa-stage7.cjs', t, 'utf8');
console.log('written tmp-qa-stage7.cjs');
