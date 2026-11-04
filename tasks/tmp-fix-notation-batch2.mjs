// Sửa ký hiệu toán plain-text trong banToan-w11-batch2.snapshot.json (v2)
// - Bỏ qua mảng "formulas": [ ... ] (LaTeX trần, không bọc $)
// - Với dòng còn lại: chỉ thay token ở segment NGOÀI span $...$
// - Audit theo dòng + kiểm tra cân bằng $ + JSON hợp lệ
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json';
const MAP = {
  c_i: 'c\u1D62', // ᵢ
  m_i: 'm\u1D62',
  M_e: 'M\u2091', // ₑ
  a_p: 'a\u209A', // ₚ
  m_p: 'm\u209A',
};

const raw = readFileSync(FILE, 'utf8');
const lines = raw.split('\n');

// 1. Cân bằng $ trên từng dòng
const odd = lines.map((l, i) => [i + 1, (l.match(/\$/g) || []).length]).filter(([, n]) => n % 2 !== 0);
if (odd.length) {
  console.error('ABORT: dòng có số $ lẻ:', odd);
  process.exit(1);
}

// 2. Xử lý từng dòng
let inFormulas = false;
const counts = Object.fromEntries(Object.keys(MAP).map((k) => [k, 0]));
const audit = [];
const outLines = lines.map((line, idx) => {
  if (/^\s*"formulas":\s*\[/.test(line)) inFormulas = true;
  const closingBracket = /^\s*\],?\s*$/.test(line);
  if (inFormulas) {
    if (closingBracket) inFormulas = false;
    return line; // LaTeX trần — giữ nguyên
  }
  let lineChanged = 0;
  const newLine = line
    .split(/(\$[^$]*\$)/g)
    .map((seg, segIdx) => {
      if (segIdx % 2 === 1) return seg; // span LaTeX inline — giữ nguyên
      return seg.replace(/([A-Za-z])_([a-z])(?![A-Za-z0-9])/g, (m0, a, b) => {
        const key = `${a}_${b}`;
        if (MAP[key]) {
          counts[key] += 1;
          lineChanged += 1;
          return MAP[key];
        }
        return m0;
      });
    })
    .join('');
  if (lineChanged) audit.push(`  dòng ${idx + 1}: ${lineChanged} token`);
  return newLine;
});
const out = outLines.join('\n');

console.log('Số token đã thay:', counts);
console.log('Dòng bị sửa:');
console.log(audit.join('\n') || '  (không có)');

// 3. Xác thực
JSON.parse(out); // JSON hợp lệ
const leftover = [];
{
  let inF = false;
  out.split('\n').forEach((line, i) => {
    if (/^\s*"formulas":\s*\[/.test(line)) inF = true;
    const closing = /^\s*\],?\s*$/.test(line);
    if (inF) {
      if (closing) inF = false;
      return; // trong formulas — LaTeX trần, hợp lệ
    }
    const plain = line.split(/(\$[^$]*\$)/g).filter((_, s) => s % 2 === 0).join('');
    const m = plain.match(/[A-Za-z]_[a-z](?![A-Za-z0-9])/g);
    if (m) leftover.push(`  dòng ${i + 1}: ${m.join(', ')}`);
  });
}
console.log('Token underscore còn lại (ngoài $..., ngoài formulas):', leftover.length ? '\n' + leftover.join('\n') : 'không');

const EXPECT = { c_i: 13, m_i: 11, M_e: 15, a_p: 3, m_p: 3 };
const mismatch = Object.keys(EXPECT).filter((k) => counts[k] !== EXPECT[k]);
if (mismatch.length) {
  console.error('ABORT: đếm lệch kỳ vọng:', mismatch.map((k) => `${k}=${counts[k]} (kỳ vọng ${EXPECT[k]})`).join('; '));
  process.exit(1);
}
if (leftover.length) {
  console.error('ABORT: còn token ngoài $...$');
  process.exit(1);
}

writeFileSync(FILE, out, 'utf8');
console.log('OK: đã ghi', FILE);
