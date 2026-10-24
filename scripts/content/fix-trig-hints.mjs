// Sửa hint H1 (và H2–H4 của task-3-x) bị gán chung một câu generic không khớp
// từng task lượng giác lớp 11. Ánh xạ theo DẠNG đề bài, không theo id pkg, để
// chạy lại được và không phụ thuộc thứ tự entry.
//
// Chạy: node scripts/content/fix-trig-hints.mjs [--dry]

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'content/lessons/hki-2026-g11.json';
const DRY = process.argv.includes('--dry');

// Câu generic cần thay (bị lặp cho mọi task trong pkg)
const GENERIC = new Set([
  'Phân biệt góc đối với góc phụ.',
  'Xác định phép đối xứng tương ứng.',
  'Theo dõi tọa độ biểu diễn hàm đang hỏi.',
  'Chỉ thay số sau khi đã viết quan hệ dấu.',
  'Ví dụ khác: điểm đối xứng qua tâm có cả hai tọa độ đổi dấu.',
  'Nhận hai góc toàn phần thay vì khai triển mọi tích.',
]);

// Khoá theo dạng đề -> bộ hint theo tier
const RULES = [
  {
    match: /Tính\s*\$\\sin\(-x\)\$/,
    why: 'góc đối (sin lẻ)',
    hints: {
      H1: 'Góc $-x$ là góc đối của $x$, không phải góc phụ; với sin, góc đối cho giá trị ngược dấu.',
      H2: 'Điểm biểu diễn $-x$ đối xứng với điểm của $x$ qua trục hoành nên tung độ đổi dấu.',
      H3: 'Viết $\\sin(-x)=-\\sin x$ rồi mới thay số đã cho.',
    },
  },
  {
    match: /Tính\s*\$\\cos\(\\pi\/2-x\)\$/,
    why: 'góc phụ (cos–sin)',
    hints: {
      H1: 'Góc $\\pi/2-x$ là góc phụ của $x$; cos của góc phụ bằng sin của góc gốc, giữ nguyên dấu.',
      H2: 'Điểm biểu diễn $\\pi/2-x$ đối xứng với điểm của $x$ qua đường phân giác $y=x$ nên hoành độ và tung độ đổi vai.',
      H3: 'Viết $\\cos(\\pi/2-x)=\\sin x$ rồi mới thay số đã cho.',
    },
  },
  {
    match: /Tính\s*\$\\sin\(\\pi\+x\)\$/,
    why: 'góc hơn kém pi (sin)',
    hints: {
      H1: 'Góc $\\pi+x$ hơn góc $x$ đúng nửa vòng; với sin, giá trị đổi dấu.',
      H2: 'Điểm biểu diễn $\\pi+x$ đối xứng với điểm của $x$ qua gốc tọa độ nên cả hai tọa độ đổi dấu.',
      H3: 'Viết $\\sin(\\pi+x)=-\\sin x$ rồi mới thay số đã cho.',
      H4: 'Ví dụ khác: điểm biểu diễn $\\pi+30^\\circ$ là điểm đối tâm của điểm $30^\\circ$ trên đường tròn lượng giác.',
    },
  },
  {
    match: /Tính\s*\$\\cos\(\\pi-x\)\$/,
    why: 'góc bù (cos)',
    hints: {
      H1: 'Góc $\\pi-x$ là góc bù của $x$; với cos, góc bù cho giá trị ngược dấu.',
      H2: 'Điểm biểu diễn $\\pi-x$ đối xứng với điểm của $x$ qua trục tung nên hoành độ đổi dấu, tung độ giữ nguyên.',
      H3: 'Viết $\\cos(\\pi-x)=-\\cos x$ rồi mới thay số đã cho.',
    },
  },
  {
    match: /Tính\s*\$\\cos x\$/,
    why: 'tìm cos từ sin (hệ thức cơ bản)',
    hints: {
      H1: 'Dùng $\\sin^2x+\\cos^2x=1$ rồi chọn dấu theo khoảng chứa $x$.',
      H2: 'Tính $\\cos^2x$ trước, chưa vội lấy căn; dấu quyết định ở bước cuối.',
      H3: 'Xem $x$ thuộc góc phần tư nào để biết $\\cos x$ âm hay dương.',
    },
  },
  {
    match: /Rút gọn \$P=\\sin\(-12x\)/,
    why: 'rút gọn tổng (góc đối + góc phụ)',
    hints: {
      H1: 'Mỗi số hạng đưa về $\\sin(12x)$: số hạng đầu bằng $-\\sin(12x)$, số hạng sau bằng $\\sin(12x)$.',
    },
  },
  {
    match: /Rút gọn \$P=\\sin\(\\pi-5x\)/,
    why: 'rút gọn tổng (góc bù + hơn kém pi)',
    hints: {
      H1: 'Ba số hạng lần lượt bằng $\\sin(5x)$, $-\\sin(5x)$, $-\\cos(5x)$.',
    },
  },
  {
    match: /Rút gọn \$P=\\sin\(\\pi-14x\)/,
    why: 'rút gọn tổng (góc bù + hơn kém pi)',
    hints: {
      H1: 'Ba số hạng lần lượt bằng $\\sin(14x)$, $-\\sin(14x)$, $-\\cos(14x)$.',
    },
  },
  {
    match: /Có góc \$x\$ thỏa đồng thời/,
    why: 'kiểm tính tương thích dữ kiện',
    hints: {
      H1: 'Dùng $\\sin^2x+\\cos^2x=1$ để kiểm; nếu tổng lớn hơn $1$ thì không có góc nào thỏa.',
    },
  },
];

const db = JSON.parse(readFileSync(FILE, 'utf8'));
let changed = 0;
const report = [];
const unmatched = [];

for (const entry of db.entries || []) {
  const pkg = entry.pkg;
  if (!pkg) continue;
  for (const task of pkg.tasks || []) {
    const prompt = String(task.prompt || '');
    const rule = RULES.find(r => r.match.test(prompt));
    if (!rule) continue;

    for (const hid of task.hintIds || []) {
      const hint = (pkg.hints || []).find(h => h.id === hid);
      if (!hint) continue;
      if (!GENERIC.has(hint.text)) continue;
      const next = rule.hints[hint.tier];
      if (!next) {
        unmatched.push({ pkg: pkg.id, task: task.id, hint: hint.id, tier: hint.tier });
        continue;
      }
      report.push({ pkg: pkg.id, task: task.id, hint: hint.id, tier: hint.tier, from: hint.text, to: next });
      hint.text = next;
      changed++;
    }
  }
}

console.log(`Hint đã sửa: ${changed}`);
if (unmatched.length) {
  console.log(`Không có hint thay cho tier (bỏ qua): ${unmatched.length}`);
  for (const u of unmatched.slice(0, 12)) console.log('  ', JSON.stringify(u));
}
for (const r of report) console.log(`  ${r.pkg} ${r.task} ${r.hint} [${r.tier}] "${r.from}" -> "${r.to.slice(0, 60)}…"`);

if (!DRY) {
  // giữ đúng format gốc của file
  writeFileSync(FILE, JSON.stringify(db, null, 1) + '\r\n', 'utf8');
  console.log('\nĐÃ GHI', FILE);
} else {
  console.log('\nDRY RUN — không ghi file');
}
