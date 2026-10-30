// Sinh tasks/tmp-r4-qa.cjs từ khuôn tmp-r3-fix2-rea.cjs — đổi session/paths + S4 AI-error 79 + no-spoiler 79
const fs = require('fs');
let t = fs.readFileSync(__dirname + '/tmp-r3-fix2-rea.cjs', 'utf8');

const reps = [
  // Đường dẫn session/log + prefix ảnh
  ["process.argv[2] || 'tasks/tmp-r3-fix2-session.json'", "process.argv[2] || 'tasks/tmp-r4-qa-session.json'"],
  ["process.argv[3] || 'tasks/tmp-r3-fix2-rea-log.json'", "process.argv[3] || 'tasks/tmp-r4-qa-log.json'"],
  [/tasks\/tmp-r3-fix2-/g, 'tasks/tmp-r4-qa-'],
  // No-spoiler 79: d_S + HÌNH THANG (hoa, chỉ trong đáp án mục III.2)
  ["const SPOILER_RX = { s75: '7,5(?!\\\\d)', cm12: '12 cm' };", "const SPOILER_RX = { dS: 'd_S', thangHoa: 'HÌNH THANG' };"],
  // Exit ticket text 79
  [/const EXIT_TEXT = '[^']*',/, "const EXIT_TEXT = 'Em rút ra: muốn chứng minh hai mặt phẳng song song phải đủ điều kiện — hai đường thẳng cắt nhau tại một điểm và từng đường song song với mặt phẳng kia; dựng thiết diện qua điểm bằng cách kẻ song song với cạnh tương ứng.',"],
  // S4 (chặng 5) — AI-error 79: bài làm sai MN ∥ AB, PQ ∥ CD ⇒ (MNPQ) ∥ (ABCD)
  ["hsHasAiKetLuan: hsT5.includes('AI kết luận') && hsT5.includes('a ⊂ (α)'),", "hsHasAiKetLuan: hsT5.includes('AI') && hsT5.includes('MN ∥ AB') && hsT5.includes('MNPQ'),"],
  ["tvHasAiKetLuan: tvT5.includes('AI kết luận') && tvT5.includes('a ⊂ (α)'),", "tvHasAiKetLuan: tvT5.includes('AI') && tvT5.includes('MN ∥ AB') && tvT5.includes('MNPQ'),"],
  ["hsNoProof: !hsT5.includes('Phản ví dụ gốc') && !hsT5.includes('trần'),", "hsNoProof: !hsT5.includes('Thales đảo') && !hsT5.includes('chưa đủ điều kiện'),"],
  ["tvNoProof: !tvT5.includes('Phản ví dụ gốc') && !tvT5.includes('trần'),", "tvNoProof: !tvT5.includes('Thales đảo') && !tvT5.includes('chưa đủ điều kiện'),"],
];

for (const [a, b] of reps) {
  if (a instanceof RegExp) t = t.replace(a, b);
  else {
    if (!t.includes(a)) throw new Error('KHÔNG tìm thấy: ' + a.slice(0, 80));
    t = t.replace(a, b);
  }
}
// Header comment
t = t.replace(/^\/\/ R3 fix1.*$/m, '// R4 — QA A–F bài 11-11-79 (khuôn tmp-r3-fix2-rea.cjs)');
fs.writeFileSync(__dirname + '/tmp-r4-qa.cjs', t, 'utf8');
console.log('WROTE tmp-r4-qa.cjs lines=' + t.split('\n').length);
console.log('check SPOILER_RX:', t.includes("dS: 'd_S'"));
console.log('check EXIT:', t.includes('hai đường thẳng cắt nhau tại một điểm'));
console.log('check S4:', t.includes("hsT5.includes('MN ∥ AB')"));
