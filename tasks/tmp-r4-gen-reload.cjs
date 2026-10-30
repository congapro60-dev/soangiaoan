// Sinh tasks/tmp-r4-reload.cjs từ khuôn tmp-r2-fix1-reload-test.cjs cho bài 11-11-79
const fs = require('fs');
let t = fs.readFileSync(__dirname + '/tmp-r2-fix1-reload-test.cjs', 'utf8');

const reps = [
  ["tasks/tmp-r2-fix1-session2.json", "tasks/tmp-r4-qa-session.json"],
  ["tasks/tmp-r2-fix1-reload-test.json", "tasks/tmp-r4-reload.json"],
  ["const MARKER = 'Nháp R2 fix1 — kiểm tra lưu 27/10';", "const MARKER = 'Nháp R4 79 — kiểm tra lưu 28/10';"],
  ["t.includes('Chặng 16–19 phút') && t.includes('Nam')", "t.includes('Chặng 12–15 phút') && t.includes('MN ∥ AB')"], // 2 chỗ (before + after)
];
for (const [a, b] of reps) {
  if (!t.includes(a)) throw new Error('KHÔNG thấy: ' + a.slice(0, 60));
  t = t.split(a).join(b);
}
t = t.replace(/tasks\/tmp-r2-fix1-reload-(before|after)\.png/g, 'tasks/tmp-r4-reload-$1.png');
// 'Nam' còn lại (aiErrorStill)
t = t.replace("after.includes('Nam')", "after.includes('MN ∥ AB')");
t = t.replace(/^\/\/ R2 fix1 reload-test.*$/m, '// R4 — reload-test nháp giữ + tự rejoin (bài 11-11-79, chặng 5 = 12–15 phút, AI-error "MN ∥ AB")');
t = t.replace(/Nháp R2 fix1/g, 'Nháp R4');
fs.writeFileSync(__dirname + '/tmp-r4-reload.cjs', t, 'utf8');
console.log('WROTE tmp-r4-reload.cjs');
console.log('band ok:', t.includes('Chặng 12–15 phút'), '| marker ok:', t.includes('Nháp R4 79'), '| still ok:', t.includes("after.includes('MN ∥ AB')"));
