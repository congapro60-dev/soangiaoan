// Sinh bộ QA R7 (session + rea + probe7 + reload) từ khuôn R6 cho bài 12-11-79
const fs = require('fs');
const R = (f, map, out) => {
  let t = fs.readFileSync(f, 'utf8');
  for (const [a, b] of map) {
    if (!t.includes(a)) throw new Error(f + ': KHÔNG thấy ' + a.slice(0, 70));
    t = t.split(a).join(b);
  }
  fs.writeFileSync(out, t, 'utf8');
  console.log('WROTE ' + out);
};

R('tasks/tmp-r6-qa-session.cjs', [["'Lớp 12 · Tuần 11 · Tiết 78'", "'Lớp 12 · Tuần 11 · Tiết 79'"], ['tmp-r6-qa-session.json', 'tmp-r7-qa-session.json']], 'tasks/tmp-r7-qa-session.cjs');

// Rea — S4: bẫy làm tròn x̄ (AI + "176,7" trần), không lộ "530/3"/"1247,22"
R('tasks/tmp-r6-qa.cjs', [
  ["process.argv[2] || 'tasks/tmp-r6-qa-session.json'", "process.argv[2] || 'tasks/tmp-r7-qa-session.json'"],
  ["process.argv[3] || 'tasks/tmp-r6-qa-log.json'", "process.argv[3] || 'tasks/tmp-r7-qa-log.json'"],
], 'tasks/tmp-r7-qa.cjs');
{
  let t = fs.readFileSync('tasks/tmp-r7-qa.cjs', 'utf8').replace(/tasks\/tmp-r6-qa-/g, 'tasks/tmp-r7-qa-');
  const reps = [
    ["hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('35 − 10 = 25'),", "hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('176,7'),"],
    ["tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('35 − 10 = 25'),", "tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('176,7'),"],
    ["hsNoProof: !hsT5.includes('40 − 5') && !hsT5.includes('a(m+1)') && !hsT5.includes('aₘ₊₁'),", "hsNoProof: !hsT5.includes('530/3') && !hsT5.includes('1247,22') && !hsT5.includes('STO'),"],
    ["tvNoProof: !tvT5.includes('40 − 5') && !tvT5.includes('a(m+1)') && !tvT5.includes('aₘ₊₁'),", "tvNoProof: !tvT5.includes('530/3') && !tvT5.includes('1247,22') && !tvT5.includes('STO'),"],
    ["const SPOILER_RX = { dNB: '41,25', dTH: '30,34' };", "const SPOILER_RX = { dchung: '13,75', tong: '20982' };"],
    ["const EXIT_TEXT = 'Em rút ra: R là đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu; tính Q1, Q3 theo ba bước lập cf — dò mốc n/4, 3n/4 — nội suy có nhân h; so sánh độ phân tán số đông dùng ΔQ.';", "const EXIT_TEXT = 'Em rút ra: dùng công thức rút gọn s² = trung bình bình phương trừ bình phương trung bình; không làm tròn x̄ ở bước trung gian (STO A); với y = ax + b thì độ phân tán nhân |a|, tịnh tiến không đổi.';"],
  ];
  for (const [a, b] of reps) {
    if (!t.includes(a)) throw new Error('rea: KHÔNG thấy ' + a.slice(0, 70));
    t = t.split(a).join(b);
  }
  fs.writeFileSync('tasks/tmp-r7-qa.cjs', t, 'utf8');
  console.log('PATCHED tmp-r7-qa.cjs');
}

R('tasks/tmp-r6-probe7.cjs', [['tasks/tmp-r6-qa-session.json', 'tasks/tmp-r7-qa-session.json']], 'tasks/tmp-r7-probe7.cjs');
{
  let t = fs.readFileSync('tasks/tmp-r7-probe7.cjs', 'utf8').replace(/tasks\/tmp-r6-/g, 'tasks/tmp-r7-');
  fs.writeFileSync('tasks/tmp-r7-probe7.cjs', t, 'utf8');
}

// Reload — band chặng 5 = "12–14 phút", marker S4 = "176,7"
R('tasks/tmp-r6-reload.cjs', [
  ['tasks/tmp-r6-qa-session.json', 'tasks/tmp-r7-qa-session.json'],
  ['tasks/tmp-r6-reload.json', 'tasks/tmp-r7-reload.json'],
  ["const MARKER = 'Nháp R6 78 — kiểm tra lưu 28/10';", "const MARKER = 'Nháp R7 79 — kiểm tra lưu 28/10';"],
  ["t.includes('Chặng 12–15 phút') && t.includes('35 − 10')", "t.includes('Chặng 12–14 phút') && t.includes('176,7')"],
  ["after.includes('35 − 10')", "after.includes('176,7')"],
  ['tasks/tmp-r6-reload-before.png', 'tasks/tmp-r7-reload-before.png'],
  ['tasks/tmp-r6-reload-after.png', 'tasks/tmp-r7-reload-after.png'],
], 'tasks/tmp-r7-reload.cjs');
