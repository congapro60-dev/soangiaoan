/**
 * Dựng 6 file Excel nhập điểm LO + 1 file nhận xét, từ dữ liệu đã tính.
 *
 * Nguồn dữ liệu: kết quả tính trong app (`window.__final`) đã được chép ra
 * `docs/qa/scores-input.json` dạng:
 *   [{ c: '10Olinda', p: 'IA1', los: [...], rows: [[mã, tên, m4...], ...] }, ...]
 *
 * Quy ước cột theo file mẫu của trường: STT · Họ và tên · Mã HS · điểm từng LO.
 *
 * node scripts/build-final-excel.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

const input = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));

/** Nhãn cột dễ đọc cho giáo viên. */
const LO_LABEL = {
  LO_DIS_TO_34344: 'LO1 Mệnh đề',
  LO_DIS_TO_34345: 'LO2 Tập hợp',
  LO_DIS_TO_34346: 'LO3 BPT bậc nhất 2 ẩn',
  LO_DIS_TO_34352: 'LO4 Lượng giác 0-180',
  LO_DIS_TO_34353: 'LO5 Hệ thức lượng',
  LO_DIS_TO_34354: 'LO6 Vectơ',
  LO_DIS_TO_34745: 'LO1 Lượng giác & hàm LG',
  LO_DIS_TO_34746: 'LO2 Phương trình lượng giác',
  LO_DIS_TO_34747: 'LO3 Dãy số',
  LO_DIS_TO_34748: 'LO4 Cấp số cộng & nhân',
  LO_DIS_TO_34756: 'LO5 Đường thẳng & mặt phẳng',
  LO_DIS_TO_34764: 'LO6 Thực hành - trải nghiệm',
  LO_DIS_TO_34383: 'LO1 Đồng biến nghịch biến',
  LO_DIS_TO_34384: 'LO2 Cực trị',
  LO_DIS_TO_34385: 'LO3 GTLN - GTNN',
  LO_DIS_TO_34386: 'LO4 Tiệm cận',
  LO_DIS_TO_34387: 'LO5 Khảo sát & vẽ đồ thị',
  LO_DIS_TO_34390: 'LO6 Vectơ không gian',
  LO_DIS_TO_34391: 'LO7 Hệ trục toạ độ',
  LO_DIS_TO_34392: 'LO8 Biểu thức toạ độ vectơ',
};

/** Tên năng lực để soạn nhận xét. */
const LO_SHORT = {
  LO_DIS_TO_34344: 'mệnh đề',
  LO_DIS_TO_34345: 'các phép toán trên tập hợp',
  LO_DIS_TO_34346: 'bất phương trình bậc nhất hai ẩn',
  LO_DIS_TO_34352: 'giá trị lượng giác của góc 0°–180°',
  LO_DIS_TO_34353: 'hệ thức lượng trong tam giác',
  LO_DIS_TO_34354: 'vectơ và các phép toán',
  LO_DIS_TO_34745: 'hàm số lượng giác',
  LO_DIS_TO_34746: 'phương trình lượng giác',
  LO_DIS_TO_34747: 'dãy số',
  LO_DIS_TO_34748: 'cấp số cộng và cấp số nhân',
  LO_DIS_TO_34756: 'đường thẳng và mặt phẳng trong không gian',
  LO_DIS_TO_34383: 'sự đồng biến, nghịch biến của hàm số',
  LO_DIS_TO_34384: 'cực trị hàm số',
  LO_DIS_TO_34385: 'giá trị lớn nhất, nhỏ nhất',
  LO_DIS_TO_34386: 'các đường tiệm cận',
  LO_DIS_TO_34387: 'khảo sát và vẽ đồ thị hàm số',
  LO_DIS_TO_34390: 'vectơ trong không gian',
  LO_DIS_TO_34391: 'hệ trục toạ độ trong không gian',
  LO_DIS_TO_34392: 'biểu thức toạ độ của phép toán vectơ',
};

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Nhận xét một em. Bỏ qua "thực hành - trải nghiệm" khi xét điểm mạnh/yếu vì cột đó
 * luôn 4 điểm, không phản ánh năng lực học thuật.
 */
const commentFor = (name, marks, los) => {
  const pairs = los
    .map((lo, index) => ({ lo, mark: marks[index] }))
    .filter((p) => p.lo !== 'LO_DIS_TO_34764' && typeof p.mark === 'number');
  if (pairs.length === 0) return `Em ${name} chưa có bài nộp nào được duyệt trong kỳ này.`;

  const avg = round1(pairs.reduce((sum, p) => sum + p.mark, 0) / pairs.length);
  const sorted = [...pairs].sort((a, b) => b.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const parts = [];

  if (avg >= 3.5) parts.push(`Em ${name} học tốt môn Toán trong kỳ này.`);
  else if (avg >= 3) parts.push(`Em ${name} có ý thức học tập, kết quả ở mức khá.`);
  else if (avg >= 2.5) parts.push(`Em ${name} cần cố gắng thêm để nâng kết quả môn Toán.`);
  else parts.push(`Em ${name} còn hạn chế nhiều ở môn Toán, cần được hỗ trợ thêm.`);

  if (best.mark >= 2.5) {
    parts.push(`Em nắm ${best.mark >= 3.5 ? 'chắc' : 'được'} phần ${LO_SHORT[best.lo] || best.lo}.`);
  }
  if (worst.mark < 2.5) {
    parts.push(`Cần tập trung ôn lại phần ${LO_SHORT[worst.lo] || worst.lo}.`);
  } else if (round1(best.mark - worst.mark) >= 1) {
    parts.push(`Cần chú ý hơn ở phần ${LO_SHORT[worst.lo] || worst.lo}.`);
  }

  if (avg >= 3) parts.push('Em tiếp tục phát huy, làm thêm bài tập nâng cao để giữ vững phong độ.');
  else if (avg >= 2.5) parts.push('Em nên làm lại các bài tập đã chữa và hỏi thầy cô ngay khi chưa hiểu bài.');
  else parts.push('Em cần học lại kiến thức nền, làm bài tập cơ bản và nhờ thầy cô kèm thêm.');

  return parts.join(' ');
};

const files = [];
const commentRows = ['lop,ky,ma_hs,ten,nhan_xet'];

for (const group of input) {
  const header = ['STT', 'Họ và tên', 'Mã HS', ...group.los.map((lo) => LO_LABEL[lo] || lo)];
  const rows = [header];
  group.rows.forEach((row, index) => {
    const [code, name, ...marks] = row;
    rows.push([index + 1, name, code, ...marks]);
  });

  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 14 }, ...group.los.map(() => ({ wch: 16 }))];
  XLSX.utils.book_append_sheet(book, sheet, 'Diem LO');

  const periodSlug = group.p.toLowerCase().replace('+', '-');
  const fileName = resolve(`docs/qa/${group.c}_${periodSlug}_diem-LO.xlsx`);
  writeFileSync(fileName, XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
  files.push({ file: fileName, rows: group.rows.length, los: group.los.length });

  for (const row of group.rows) {
    const [code, name, ...marks] = row;
    const text = commentFor(name, marks, group.los).replace(/"/g, '""');
    commentRows.push([group.c, group.p, code, name, `"${text}"`].join(','));
  }
}

writeFileSync(resolve('docs/qa/nhan-xet.csv'), commentRows.join('\n'), 'utf8');

console.log(JSON.stringify({ files, comments: commentRows.length - 1, commentFile: 'docs/qa/nhan-xet.csv' }, null, 1));
