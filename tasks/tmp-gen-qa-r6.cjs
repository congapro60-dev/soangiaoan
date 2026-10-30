// Sinh bộ QA R6 (session + rea + probe7 + reload) từ khuôn R5 cho bài 12-11-78
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

R('tasks/tmp-r5-qa-session.cjs', [["'Lớp 12 · Tuần 11 · Tiết 77'", "'Lớp 12 · Tuần 11 · Tiết 78'"], ['tmp-r5-qa-session.json', 'tmp-r6-qa-session.json']], 'tasks/tmp-r6-qa-session.cjs');

// Rea — S4: bẫy "R = 35 − 10 = 25" trần (AI + "35 − 10"), không lộ "40 − 5"/định nghĩa đúng
R('tasks/tmp-r5-qa.cjs', [
  ["process.argv[2] || 'tasks/tmp-r5-qa-session.json'", "process.argv[2] || 'tasks/tmp-r6-qa-session.json'"],
  ["process.argv[3] || 'tasks/tmp-r5-qa-log.json'", "process.argv[3] || 'tasks/tmp-r6-qa-log.json'"],
], 'tasks/tmp-r6-qa.cjs');
{
  let t = fs.readFileSync('tasks/tmp-r6-qa.cjs', 'utf8').replace(/tasks\/tmp-r5-qa-/g, 'tasks/tmp-r6-qa-');
  const reps = [
    ["hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('ln x') && hsT5.includes('1/x'),", "hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('35 − 10 = 25'),"],
    ["tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('ln x') && tvT5.includes('1/x'),", "tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('35 − 10 = 25'),"],
    ["hsNoProof: !hsT5.includes('trị tuyệt đối') && !hsT5.includes('ℝ') && !hsT5.includes('(−∞'),", "hsNoProof: !hsT5.includes('40 − 5') && !hsT5.includes('a(m+1)') && !hsT5.includes('aₘ₊₁'),"],
    ["tvNoProof: !tvT5.includes('trị tuyệt đối') && !tvT5.includes('ℝ') && !tvT5.includes('(−∞'),", "tvNoProof: !tvT5.includes('40 − 5') && !tvT5.includes('a(m+1)') && !tvT5.includes('aₘ₊₁'),"],
    ["const SPOILER_RX = { hmax: '20,41', ln2: '2\\\\ln' };", "const SPOILER_RX = { dNB: '41,25', dTH: '30,34' };"],
    ["const EXIT_TEXT = 'Em rút ra: tìm nguyên hàm phải thuộc chuẩn dấu lượng giác, luôn viết + C, và với 1/x phải ghi ln|x| + C (x ≠ 0); tìm hàm số qua điều kiện ban đầu bằng quy trình 2 bước.';", "const EXIT_TEXT = 'Em rút ra: R là đầu mút phải nhóm cuối trừ đầu mút trái nhóm đầu; tính Q1, Q3 theo ba bước lập cf — dò mốc n/4, 3n/4 — nội suy có nhân h; so sánh độ phân tán số đông dùng ΔQ.';"],
  ];
  for (const [a, b] of reps) {
    if (!t.includes(a)) throw new Error('rea: KHÔNG thấy ' + a.slice(0, 70));
    t = t.split(a).join(b);
  }
  fs.writeFileSync('tasks/tmp-r6-qa.cjs', t, 'utf8');
  console.log('PATCHED tmp-r6-qa.cjs');
}

R('tasks/tmp-r5-probe7.cjs', [['tasks/tmp-r5-qa-session.json', 'tasks/tmp-r6-qa-session.json']], 'tasks/tmp-r6-probe7.cjs');
{
  let t = fs.readFileSync('tasks/tmp-r6-probe7.cjs', 'utf8').replace(/tasks\/tmp-r5-/g, 'tasks/tmp-r6-');
  fs.writeFileSync('tasks/tmp-r6-probe7.cjs', t, 'utf8');
}

// Reload — band chặng 5 = "12–15 phút", marker S4 = "35 − 10"
R('tasks/tmp-r5-reload.cjs', [
  ['tasks/tmp-r5-qa-session.json', 'tasks/tmp-r6-qa-session.json'],
  ['tasks/tmp-r5-reload.json', 'tasks/tmp-r6-reload.json'],
  ["const MARKER = 'Nháp R5 77 — kiểm tra lưu 28/10';", "const MARKER = 'Nháp R6 78 — kiểm tra lưu 28/10';"],
  ["t.includes('Chặng 13–16 phút') && t.includes('ln x')", "t.includes('Chặng 12–15 phút') && t.includes('35 − 10')"],
  ["after.includes('ln x')", "after.includes('35 − 10')"],
  ['tasks/tmp-r5-reload-before.png', 'tasks/tmp-r6-reload-before.png'],
  ['tasks/tmp-r5-reload-after.png', 'tasks/tmp-r6-reload-after.png'],
], 'tasks/tmp-r6-reload.cjs');
