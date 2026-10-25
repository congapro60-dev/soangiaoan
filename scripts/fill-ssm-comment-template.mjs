/**
 * Điền nhận xét Quý 1 vào ĐÚNG file mẫu SSM xuất ra (nút "Tải Xuống File Mẫu").
 *
 * Vì sao phải dùng file gốc: SSM kiểm tra mã lớp / mã môn / thứ tự học sinh khi nhận lại file.
 * File tự dựng (kể cả đúng khuôn) bị SSM bỏ qua — chủ dự án xác nhận 25/10.
 *
 * Cấu trúc file mẫu SSM:
 *   dòng 1: Tên quarter / Mã quarter
 *   dòng 2: Tên môn học / Mã môn học
 *   dòng 3: Tên lớp học / Mã lớp học
 *   dòng 4: tiêu đề cột (A mã HS · B tên · C giới tính · D ĐTB môn · E NHẬN XÉT · F kết quả)
 *   dòng 5+: dữ liệu, SSM đã điền sẵn A, B, C, D
 *
 * Script CHỈ ghi cột E, giữ nguyên mọi thứ khác.
 *
 * node scripts/fill-ssm-comment-template.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import * as XLSX from 'xlsx';

const HOME = process.env.USERPROFILE || '.';
const DOWNLOADS = resolve(HOME, 'Downloads');
const comments = JSON.parse(readFileSync(resolve('docs/qa/nhan-xet-Q1.json'), 'utf8'));

/** File mẫu SSM mà chủ dự án đã tải về — khớp theo tên lớp trong tên file. */
const TEMPLATES = [
  { match: /Class_10Olinda/i, className: '10Olinda' },
  { match: /Class_11Columbus/i, className: '11Columbus' },
  { match: /Class_12/i, className: '12LoTrinh1' },
];

/** Danh sách file mẫu do shell truyền vào (đường dẫn tuyệt đối). */
const provided = process.argv.slice(2);
const candidates = provided.length
  ? provided
  : [
      resolve(DOWNLOADS, 'Comment_Subject_VN_TOÁN_Class_10Olinda.xlsx'),
      resolve(DOWNLOADS, 'Comment_Subject_VN_TOÁN_Class_11Columbus.xlsx'),
      resolve(DOWNLOADS, 'Comment_Subject_VN_TOÁN_Class_12_VN_Toán_1.xlsx'),
    ];

const results = [];

for (const target of TEMPLATES) {
  const filePath = candidates.find((p) => target.match.test(basename(p)));
  if (!filePath || !existsSync(filePath)) {
    results.push({ className: target.className, error: 'không thấy file mẫu' });
    continue;
  }

  const items = comments.filter((c) => c.className === target.className);
  if (!items.length) {
    results.push({ className: target.className, error: 'không có nhận xét' });
    continue;
  }

  const book = XLSX.read(readFileSync(filePath), { type: 'buffer' });
  const sheetName = book.SheetNames.includes('Worksheet') ? 'Worksheet' : book.SheetNames[0];
  const sheet = book.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: null });

  // Cột E = nhận xét (chỉ số 4). Xác nhận bằng tiêu đề dòng 4.
  const header = rows[3] || [];
  const commentCol = header.findIndex((cell) => typeof cell === 'string' && /Nhận xét môn học/i.test(cell));
  if (commentCol < 0) {
    results.push({ className: target.className, error: 'không thấy cột nhận xét trong file mẫu' });
    continue;
  }

  const byCode = new Map(items.map((c) => [String(c.code).trim(), c.comment]));
  let filled = 0;
  const missing = [];
  for (let r = 4; r < rows.length; r += 1) {
    const row = rows[r];
    if (!Array.isArray(row) || !row[0]) continue;
    const code = String(row[0]).trim();
    const text = byCode.get(code);
    if (!text) {
      // Học sinh có trên SSM nhưng chưa nhập vào app (Trần Nguyễn Phương Linh lớp 12):
      // để nhận xét ở mức trung tính, KHÔNG bịa đánh giá về năng lực.
      const cellRef = XLSX.utils.encode_cell({ r, c: commentCol });
      const existing = sheet[cellRef] || {};
      sheet[cellRef] = {
        ...existing,
        t: 's',
        v: 'Học sinh chưa có dữ liệu học tập được ghi nhận trong Quý 1.',
      };
      missing.push(code);
      continue;
    }
    const cellRef = XLSX.utils.encode_cell({ r, c: commentCol });
    const existing = sheet[cellRef] || {};
    sheet[cellRef] = { ...existing, t: 's', v: text };
    filled += 1;
  }

  const outPath = resolve('docs/qa', basename(filePath).replace(/\.xlsx$/i, '_DA-DIEN.xlsx'));
  writeFileSync(outPath, XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
  results.push({
    className: target.className,
    template: basename(filePath),
    commentColumn: XLSX.utils.encode_col(commentCol),
    filled,
    missing,
    output: outPath,
  });
}

console.log(JSON.stringify(results, null, 1));
