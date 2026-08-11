/**
 * Rút unit plan (kế hoạch học phần) THPT thành JSON đóng sẵn trong app.
 *
 *   node scripts/build-unitplan.mjs
 *
 * Chỉ lấy học phần I — chủ dự án chốt ngày 2026-08-11 là bản học kỳ II chờ phát hành mới.
 * Chỉ lấy "Phần 1: Tổng quan học phần" và "Phần 3: Kế hoạch chương học"; phần 4 và 5 là
 * chỗ giáo viên điền theo thời gian thực nên trong file mẫu chúng rỗng.
 *
 * THCS (Toán 6–9) là PDF bị vỡ dấu tiếng Việt khi rút chữ ("T ập h ợ p s ố") nên chưa nạp.
 */
import mammoth from 'mammoth';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'Phan phoi va unit plan', 'Unitplan', 'THPT');
const OUT_DIR = join(ROOT, 'src', 'data', 'unitplan');

const FILES = {
  10: 'Dis_Toán 10 Kế-hoạch-học-phần-I năm 24-25-final.docx',
  11: 'Dis_Toán 11 Kế-hoạch-học-phần-I năm 25-26.docx',
  12: 'Dis_Toán 12 Kế-hoạch-học-phần-I năm 24-25.docx',
};

/** Lấy đoạn nằm giữa hai mốc "Phần n:" trong văn bản đã làm phẳng. */
const sectionBetween = (lines, startRe, endRe) => {
  const from = lines.findIndex(l => startRe.test(l));
  if (from < 0) return '';
  const rest = lines.slice(from + 1);
  const to = rest.findIndex(l => endRe.test(l));
  return (to < 0 ? rest : rest.slice(0, to)).join('\n').trim();
};

mkdirSync(OUT_DIR, { recursive: true });
const summary = [];

for (const [grade, file] of Object.entries(FILES)) {
  const { value } = await mammoth.extractRawText({ path: join(SRC_DIR, file) });
  const lines = value.split('\n').map(l => l.trim()).filter(Boolean);

  // Danh sách chương nằm ngay đầu file, trước "Phần 1".
  // Gộp trùng theo TÊN chương, bỏ qua số La Mã: bản Toán 11 ghi cùng một chương hai lần,
  // một lần là "Chương III." và một lần là "Chương IV.".
  const seen = new Set();
  const chapters = [];
  for (const line of lines.filter(l => /^Chương\s+[IVX]+\./i.test(l))) {
    const text = line.replace(/\s+/g, ' ').trim();
    const key = text.replace(/^Chương\s+[IVX]+\.\s*/i, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chapters.push(text);
  }

  const overview = sectionBetween(lines, /^Phần 1: Tổng quan học phần/i, /^Phần 2:/i);
  const chapterPlan = sectionBetween(lines, /^Phần 3: Kế hoạch chương học/i, /^Phần 4:/i);

  if (!chapters.length) throw new Error(`Toán ${grade}: không tìm thấy dòng "Chương ..." nào`);
  if (!overview) throw new Error(`Toán ${grade}: không tìm thấy "Phần 1: Tổng quan học phần"`);

  writeFileSync(
    join(OUT_DIR, `tds-g${grade}.json`),
    JSON.stringify({ grade: Number(grade), term: 'I', source: file, chapters, overview, chapterPlan }),
    'utf8',
  );
  summary.push({ khối: grade, chương: chapters.length, 'tổng quan (ký tự)': overview.length, 'kế hoạch chương (ký tự)': chapterPlan.length });
}

console.table(summary);
