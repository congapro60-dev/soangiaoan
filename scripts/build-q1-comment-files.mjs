/**
 * Xuất file nhận xét QUÝ 1 (gộp F1 + IA1) đúng định dạng SSM để tải lên hàng loạt.
 *
 * Dùng nhận xét từ `docs/qa/nhan-xet-Q1.json`; khung file theo `export-template` của
 * `v2/evaluation/subject-comments` (dòng 1-3 header, dòng 4 tiêu đề, dòng 5+ dữ liệu, cột E là nhận xét).
 *
 * node scripts/build-q1-comment-files.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

const comments = JSON.parse(readFileSync(resolve('docs/qa/nhan-xet-Q1.json'), 'utf8'));
const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));

const SSM_CLASS_CODE = {
  '10Olinda': '2627_TDSTHT_DIS_K10_10Olinda',
  '11Columbus': '2627_TDSTHT_DIS_K11_11Columbus',
  '12LoTrinh1': '2627_TDSTHT_DIS_K12_12VNToan1',
};

const gender = (() => {
  try {
    return new Map(Object.entries(JSON.parse(readFileSync(resolve('docs/qa/gender.json'), 'utf8'))));
  } catch {
    return new Map();
  }
})();

const byClass = new Map();
for (const item of comments) {
  if (!byClass.has(item.className)) byClass.set(item.className, []);
  byClass.get(item.className).push(item);
}

const written = [];

for (const [className, items] of byClass) {
  const rows = [
    ['Tên quarter: Quarter 1', 'Mã quarter: quarter1'],
    ['Tên môn học: VN TOÁN', 'Mã môn học: TO'],
    [`Tên lớp học: ${className}`, `Mã lớp học: ${SSM_CLASS_CODE[className] || ''}`],
    [
      'Mã học sinh',
      'Tên học sinh',
      'Giới tính',
      'Điểm trung bình môn',
      'Nhận xét môn học\n(Vui lòng chỉ nhập dữ liệu tại cột E, không nhập liệu tại các cột A,B,C,D,F)',
      'Kết quả tải dữ liệu',
    ],
  ];

  for (const item of items) {
    rows.push([item.code, item.name, gender.get(item.code) || '', '', item.comment, '']);
  }

  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 8 }, { wch: 12 }, { wch: 110 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(book, sheet, 'Worksheet');

  const fileName = resolve(`docs/qa/${className}_Q1_nhan-xet.xlsx`);
  writeFileSync(fileName, XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
  written.push({ file: fileName, students: items.length });
}

console.log(JSON.stringify({ written, totalComments: comments.length }, null, 1));
