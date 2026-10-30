// Sinh bộ QA R5 (session + rea + probe7 + reload) từ khuôn R4 cho bài 12-11-77
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

// 1) Session — ROW_RX lớp 12
R('tasks/tmp-r4-qa-session.cjs', [["'Lớp 11 · Tuần 11 · Tiết 79'", "'Lớp 12 · Tuần 11 · Tiết 77'"], ['tmp-r4-qa-session.json', 'tmp-r5-qa-session.json']], 'tasks/tmp-r5-qa-session.cjs');

// 2) Rea A–F — S4: bẫy "bạn Nam" (AI + "ln x" trần, không lộ "trị tuyệt đối"/"|x|")
let qa = fs.readFileSync('tasks/tmp-r4-qa.cjs', 'utf8');
for (const [a, b] of [
  ["process.argv[2] || 'tasks/tmp-r4-qa-session.json'", "process.argv[2] || 'tasks/tmp-r5-qa-session.json'"],
  ["process.argv[3] || 'tasks/tmp-r4-qa-log.json'", "process.argv[3] || 'tasks/tmp-r5-qa-log.json'"],
]) {
  if (!qa.includes(a)) throw new Error('qa: KHÔNG thấy ' + a.slice(0, 70));
  qa = qa.split(a).join(b);
}
qa = qa.replace(/tasks\/tmp-r4-qa-/g, 'tasks/tmp-r5-qa-');
const qaReps = [
  ["const SPOILER_RX = { dS: 'd_S', thangHoa: 'HÌNH THANG' };", "const SPOILER_RX = { hmax: '20,41', ln2: '2\\\\ln' };"],
  ["hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('MN ∥ AB') && hsT5.includes('MNPQ'),", "hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('ln x') && hsT5.includes('1/x'),"],
  ["tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('MN ∥ AB') && tvT5.includes('MNPQ'),", "tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('ln x') && tvT5.includes('1/x'),"],
  ["hsNoProof: !hsT5.includes('Thales đảo') && !hsT5.includes('chưa đủ điều kiện'),", "hsNoProof: !hsT5.includes('trị tuyệt đối') && !hsT5.includes('ℝ') && !hsT5.includes('(−∞'),"],
  ["tvNoProof: !tvT5.includes('Thales đảo') && !tvT5.includes('chưa đủ điều kiện'),", "tvNoProof: !tvT5.includes('trị tuyệt đối') && !tvT5.includes('ℝ') && !tvT5.includes('(−∞'),"],
  ["const EXIT_TEXT = 'Em rút ra: muốn chứng minh hai mặt phẳng song song phải đủ điều kiện — hai đường thẳng cắt nhau tại một điểm và từng đường song song với mặt phẳng kia; dựng thiết diện qua điểm bằng cách kẻ song song với cạnh tương ứng.';", "const EXIT_TEXT = 'Em rút ra: tìm nguyên hàm phải thuộc chuẩn dấu lượng giác, luôn viết + C, và với 1/x phải ghi ln|x| + C (x ≠ 0); tìm hàm số qua điều kiện ban đầu bằng quy trình 2 bước.';"],
];
for (const [a, b] of qaReps) {
  if (!qa.includes(a)) throw new Error('qa: KHÔNG thấy ' + a.slice(0, 70));
  qa = qa.split(a).join(b);
}
fs.writeFileSync('tasks/tmp-r5-qa.cjs', qa, 'utf8');
console.log('WROTE tasks/tmp-r5-qa.cjs');

// 3) Probe7 route choice
R('tasks/tmp-r4-probe7.cjs', [
  ['tasks/tmp-r4-qa-session.json', 'tasks/tmp-r5-qa-session.json'],
], 'tasks/tmp-r5-probe7.cjs');
{
  let t = fs.readFileSync('tasks/tmp-r5-probe7.cjs', 'utf8').replace(/tasks\/tmp-r4-/g, 'tasks/tmp-r5-');
  fs.writeFileSync('tasks/tmp-r5-probe7.cjs', t, 'utf8');
}

// 4) Reload — band chặng 5 = "13–16 phút", marker AI-error = "ln x"
R('tasks/tmp-r4-reload.cjs', [
  ['tasks/tmp-r4-qa-session.json', 'tasks/tmp-r5-qa-session.json'],
  ['tasks/tmp-r4-reload.json', 'tasks/tmp-r5-reload.json'],
  ["const MARKER = 'Nháp R4 79 — kiểm tra lưu 28/10';", "const MARKER = 'Nháp R5 77 — kiểm tra lưu 28/10';"],
  ["t.includes('Chặng 12–15 phút') && t.includes('MN ∥ AB')", "t.includes('Chặng 13–16 phút') && t.includes('ln x')"],
  ["after.includes('MN ∥ AB')", "after.includes('ln x')"],
  ['tasks/tmp-r4-reload-before.png', 'tasks/tmp-r5-reload-before.png'],
  ['tasks/tmp-r4-reload-after.png', 'tasks/tmp-r5-reload-after.png'],
], 'tasks/tmp-r5-reload.cjs');
