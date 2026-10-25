/**
 * Điền điểm LO vào ĐÚNG file mẫu SSM xuất ra (Template_Export_Score_*.xlsx).
 *
 * Vì sao phải dùng file mẫu gốc: SSM kiểm tra mã bài/môn/lớp và cấu trúc cột khi nhận lại file;
 * file tự dựng không qua được. Script này chỉ GHI ĐIỂM vào các ô cột LO (D..I hoặc D..K),
 * giữ nguyên mọi thứ khác (header, merge, style, thứ tự học sinh).
 *
 * Cấu trúc file mẫu (đọc 25/10):
 *   dòng 1  : Tên bài đánh giá
 *   dòng 2  : Tên môn học / Mã môn
 *   dòng 3  : Tên lớp / Mã lớp
 *   dòng 4  : FP (Focal Point)
 *   dòng 5  : PS (Power Standard)
 *   dòng 6  : LO (mã + mô tả)  ← mỗi LO một cột, bắt đầu từ cột D
 *   dòng 7+: dữ liệu: A mã HS · B họ tên · C giới tính · D.. điểm LO
 *
 * node scripts/fill-ssm-template.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import * as XLSX from 'xlsx';

const HOME = process.env.USERPROFILE || '.';
const DOWNLOADS = resolve(HOME, 'Downloads');

/** Điểm đã tính (mảng: [mã HS, tên, ...điểm theo thứ tự LOS]). */
const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));

/** Ghép mỗi file mẫu với một bảng điểm. Tên file do SSM đặt, có thể lệch dấu. */
const TARGETS = [
  { match: /Template_Export_Score_10Olinda.*IA1/i, group: { c: '10Olinda', p: 'IA1' } },
  { match: /Template_Export_Score_10Olinda.*F1/i, group: { c: '10Olinda', p: 'F1' } },
  { match: /Template_Export_Score_11Columbus.*IA1/i, group: { c: '11Columbus', p: 'IA1' } },
  { match: /Template_Export_Score_11Columbus.*F1/i, group: { c: '11Columbus', p: 'F1' } },
  { match: /Template_Export_Score_12.*IA1/i, group: { c: '12LoTrinh1', p: 'F1+IA1' } },
  { match: /Template_Export_Score_12.*F1/i, group: { c: '12LoTrinh1', p: 'F1+IA1' } },
];

/** Danh sách file mẫu truyền từ shell (tránh đọc thư mục trong ESM). */
const providedFiles = process.argv.slice(2);
const templateFiles = providedFiles.length
  ? providedFiles
  : [
      'Template_Export_Score_10Olinda_VN TOÁN_IA1.xlsx',
      'Template_Export_Score_10Olinda_VN TOÁN_F1.xlsx',
      'Template_Export_Score_11Columbus_VN TOÁN_IA1.xlsx',
      'Template_Export_Score_11Columbus_VN TOÁN_F1.xlsx',
      'Template_Export_Score_12 VN Toán 1_VN TOÁN_IA1.xlsx',
      'Template_Export_Score_12 VN Toán 1_VN TOÁN_F1 (1).xlsx',
    ].map((name) => resolve(DOWNLOADS, name));

const results = [];

for (const target of TARGETS) {
  const filePath = templateFiles.find((p) => target.match.test(basename(p)));
  if (!filePath) {
    results.push({ group: target.group, error: 'không thấy file mẫu' });
    continue;
  }
  if (!existsSync(filePath)) {
    results.push({ group: target.group, error: 'file không tồn tại: ' + basename(filePath) });
    continue;
  }

  const group = scores.find((g) => g.c === target.group.c && g.p === target.group.p);
  if (!group) {
    results.push({ group: target.group, error: 'không có bảng điểm' });
    continue;
  }

  const book = XLSX.read(readFileSync(filePath), { type: 'buffer', cellStyles: true });
  const sheetName = book.SheetNames.includes('Sheet1') ? 'Sheet1' : book.SheetNames[0];
  const sheet = book.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: null });

  // Tìm dòng tiêu đề LO (dòng chứa "LO_DIS_TO_") và map mã LO → chỉ số cột.
  let loRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const row = rows[i] || [];
    if (row.some((cell) => typeof cell === 'string' && /LO_DIS_TO_\d+/.test(cell))) {
      loRowIndex = i;
      break;
    }
  }
  if (loRowIndex < 0) {
    results.push({ group: target.group, error: 'không thấy dòng LO trong file mẫu' });
    continue;
  }

  const loColumn = new Map();
  (rows[loRowIndex] || []).forEach((cell, index) => {
    const match = typeof cell === 'string' ? cell.match(/LO_DIS_TO_\d+/) : null;
    if (match) loColumn.set(match[0], index);
  });

  // Dòng dữ liệu bắt đầu sau dòng LO; file mẫu có 1 dòng trống phân cách.
  const dataStart = rows.findIndex((row, index) => index > loRowIndex && Array.isArray(row) && typeof row[0] === 'string' && row[0].length > 4);

  // Ghi điểm theo mã HS (không theo thứ tự dòng — thứ tự SSM có thể khác app).
  const byCode = new Map(group.rows.map((row) => [String(row[0]).trim(), row]));
  let filled = 0;
  const missing = [];
  for (let r = dataStart; r < rows.length; r += 1) {
    const row = rows[r];
    if (!Array.isArray(row) || !row[0]) continue;
    const code = String(row[0]).trim();
    const src = byCode.get(code);
    if (!src) {
      // Học sinh có trên SSM nhưng chưa nhập vào app (vd Trần Nguyễn Phương Linh lớp 12):
      // điền "N" cho mọi cột LO để SSM hiểu là chưa đánh giá, KHÔNG bịa điểm.
      for (const col of loColumn.values()) {
        const cellRef = XLSX.utils.encode_cell({ r, c: col });
        const existing = sheet[cellRef] || {};
        sheet[cellRef] = { ...existing, t: 's', v: 'N' };
      }
      missing.push(code);
      continue;
    }
    group.los.forEach((lo, loIndex) => {
      const col = loColumn.get(lo);
      if (col === undefined) return;
      const value = src[2 + loIndex];
      const cellRef = XLSX.utils.encode_cell({ r, c: col });
      const existing = sheet[cellRef] || {};
      sheet[cellRef] = { ...existing, t: typeof value === 'number' ? 'n' : 's', v: value };
      filled += 1;
    });
  }

  const outPath = resolve('docs/qa', basename(filePath).replace(/\.xlsx$/i, '_DA-DIEN.xlsx'));
  writeFileSync(outPath, XLSX.write(book, { type: 'buffer', bookType: 'xlsx', cellStyles: true }));
  results.push({
    group: `${target.group.c} ${target.group.p}`,
    template: basename(filePath),
    loColumns: [...loColumn.keys()],
    cellsFilled: filled,
    studentsMissing: missing,
    output: outPath,
  });
}

console.log(JSON.stringify(results, null, 1));
