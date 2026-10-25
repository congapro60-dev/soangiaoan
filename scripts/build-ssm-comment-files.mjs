/**
 * Dựng file "Nhận xét môn học" đúng định dạng SSM để tải lên hàng loạt.
 *
 * Định dạng lấy từ chính file SSM xuất ra (`export-template` của
 * `v2/evaluation/subject-comments`):
 *   dòng 1-3: thông tin quarter / môn / lớp (SSM đọc lại để biết nhập vào đâu)
 *   dòng 4  : tiêu đề cột
 *   dòng 5+: A mã HS · B tên HS · C giới tính · D ĐTB môn · E NHẬN XÉT · F kết quả (SSM ghi)
 *
 * Cột E là cột duy nhất được nhập. D và F để trống vì SSM tự tính/ghi.
 *
 * node scripts/build-ssm-comment-files.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));

/** Mã lớp trên SSM (lấy từ file mẫu SSM xuất ra cho 11Columbus). */
const SSM_CLASS_CODE = {
  '10Olinda': '2627_TDSTHT_DIS_K10_10Olinda',
  '11Columbus': '2627_TDSTHT_DIS_K11_11Columbus',
  '12LoTrinh1': '2627_TDSTHT_DIS_K12_12VNToan1',
};

/** Giới tính: SSM cần để hiển thị; lấy từ dữ liệu lớp nếu có, không thì để trống. */
const loadGender = () => {
  try {
    const raw = readFileSync(resolve('docs/qa/gender.json'), 'utf8');
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
};

/** Nhận xét theo điểm: chỉ dùng các LO học thuật (bỏ thực hành - trải nghiệm luôn 4 điểm). */
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

const commentFor = (name, marks, los) => {
  const pairs = los
    .map((lo, i) => ({ lo, mark: marks[i] }))
    .filter((p) => p.lo !== 'LO_DIS_TO_34764' && typeof p.mark === 'number');
  if (!pairs.length) return `Em ${name} chưa có bài nộp nào được duyệt trong kỳ này.`;

  const avg = round1(pairs.reduce((s, p) => s + p.mark, 0) / pairs.length);
  const sorted = [...pairs].sort((a, b) => b.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const parts = [];

  if (avg >= 3.5) parts.push(`Em ${name} học tốt môn Toán trong kỳ này.`);
  else if (avg >= 3) parts.push(`Em ${name} có ý thức học tập, kết quả ở mức khá.`);
  else if (avg >= 2.5) parts.push(`Em ${name} cần cố gắng thêm để nâng kết quả môn Toán.`);
  else parts.push(`Em ${name} còn hạn chế nhiều ở môn Toán, cần được hỗ trợ thêm.`);

  if (best.mark >= 2.5) parts.push(`Em nắm ${best.mark >= 3.5 ? 'chắc' : 'được'} phần ${LO_SHORT[best.lo] || best.lo}.`);
  if (worst.mark < 2.5) parts.push(`Cần tập trung ôn lại phần ${LO_SHORT[worst.lo] || worst.lo}.`);
  else if (round1(best.mark - worst.mark) >= 1) parts.push(`Cần chú ý hơn ở phần ${LO_SHORT[worst.lo] || worst.lo}.`);

  if (avg >= 3) parts.push('Em tiếp tục phát huy, làm thêm bài tập nâng cao để giữ vững phong độ.');
  else if (avg >= 2.5) parts.push('Em nên làm lại các bài tập đã chữa và hỏi thầy cô ngay khi chưa hiểu bài.');
  else parts.push('Em cần học lại kiến thức nền, làm bài tập cơ bản và nhờ thầy cô kèm thêm.');

  return parts.join(' ');
};

const gender = loadGender();
const written = [];

for (const group of scores) {
  // 12LoTrinh1 gộp 2 kỳ nhưng SSM vẫn tách quarter: ghi vào Quarter 1 (kỳ đang chấm).
  const quarterName = 'Quarter 1';
  const quarterCode = 'quarter1';

  const header = [
    `Tên quarter: ${quarterName}`,
    `Mã quarter: ${quarterCode}`,
  ];
  const subject = ['Tên môn học: VN TOÁN', 'Mã môn học: TO'];
  const klass = [`Tên lớp học: ${group.c}`, `Mã lớp học: ${SSM_CLASS_CODE[group.c] || ''}`];
  const columns = [
    'Mã học sinh',
    'Tên học sinh',
    'Giới tính',
    'Điểm trung bình môn',
    'Nhận xét môn học\n(Vui lòng chỉ nhập dữ liệu tại cột E, không nhập liệu tại các cột A,B,C,D,F)',
    'Kết quả tải dữ liệu',
  ];

  const rows = [header, subject, klass, columns];
  for (const row of group.rows) {
    const [code, name, ...marks] = row;
    const text = commentFor(name, marks, group.los);
    rows.push([code, name, gender.get(code) || '', '', text, '']);
  }

  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 8 }, { wch: 12 }, { wch: 90 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(book, sheet, 'Worksheet');

  const slug = group.p.toLowerCase().replace('+', '-');
  const fileName = resolve(`docs/qa/${group.c}_${slug}_nhan-xet.xlsx`);
  writeFileSync(fileName, XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
  written.push({ file: fileName, rows: group.rows.length });
}

console.log(JSON.stringify({ written }, null, 1));
