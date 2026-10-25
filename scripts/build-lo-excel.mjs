/**
 * Dựng file Excel nhập điểm LO cho SSM từ kết quả đã tính (`docs/qa/lo-scores.json`).
 *
 * Bám đúng cấu trúc file mẫu của trường (sheet "Mã 101"):
 *   A = STT, B = Họ tên, AK.. = điểm từng LO (mức 4 / 3.5 / 3 / 2.5 / 2 / 1.5 / 1 / 0 / N).
 * Chỉ điền cột LO — các cột câu hỏi (C..AJ) không có dữ liệu tương ứng trong app nên để trống,
 * giáo viên tự nhập nếu cần; SSM chỉ cần cột LO để cập nhật điểm năng lực.
 *
 * node scripts/build-lo-excel.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

const scores = JSON.parse(readFileSync(resolve('docs/qa/lo-scores.json'), 'utf8'));

/** Nhãn cột cho giáo viên đọc; SSM đọc theo vị trí cột nên tên chỉ để người xem hiểu. */
const LO_LABEL = {
  LO_DIS_TO_34344: 'LO1 mệnh đề',
  LO_DIS_TO_34345: 'LO2 tập hợp',
  LO_DIS_TO_34346: 'LO3 bpt bậc nhất 2 ẩn',
  LO_DIS_TO_34352: 'LO4 lượng giác 0-180',
  LO_DIS_TO_34353: 'LO5 hệ thức lượng',
  LO_DIS_TO_34354: 'LO6 vectơ',
  LO_DIS_TO_34745: 'LO1 lượng giác & hàm LG',
  LO_DIS_TO_34746: 'LO2 phương trình lượng giác',
  LO_DIS_TO_34747: 'LO3 dãy số',
  LO_DIS_TO_34748: 'LO4 cấp số cộng & nhân',
  LO_DIS_TO_34756: 'LO5 đường thẳng & mặt phẳng',
  LO_DIS_TO_34764: 'LO6 thực hành - trải nghiệm',
  LO_DIS_TO_34383: 'LO1 đồng biến nghịch biến',
  LO_DIS_TO_34384: 'LO2 cực trị',
  LO_DIS_TO_34385: 'LO3 GTLN - GTNN',
  LO_DIS_TO_34386: 'LO4 tiệm cận',
  LO_DIS_TO_34387: 'LO5 khảo sát & vẽ đồ thị',
  LO_DIS_TO_34390: 'LO6 vectơ trong không gian',
  LO_DIS_TO_34391: 'LO7 hệ trục toạ độ',
  LO_DIS_TO_34392: 'LO8 biểu thức toạ độ vectơ',
};

const LO_TO_COMPETENCY = {
  LO_DIS_TO_34344: 'g10-tap-hop-va-menh-de',
  LO_DIS_TO_34345: 'g10-phep-toan-tren-tap-hop',
  LO_DIS_TO_34346: 'g10-bpt-bac-nhat-hai-an',
  LO_DIS_TO_34352: 'g10-gia-tri-luong-giac-0-180',
  LO_DIS_TO_34353: 'g10-he-thuc-luong-tam-giac',
  LO_DIS_TO_34354: 'g10-vecto-va-phep-toan',
  LO_DIS_TO_34745: 'g11-ham-va-pt-luong-giac',
  LO_DIS_TO_34746: 'g11-ham-va-pt-luong-giac',
  LO_DIS_TO_34747: 'g11-day-so-cap-so',
  LO_DIS_TO_34748: 'g11-day-so-cap-so',
  LO_DIS_TO_34756: 'g11-duong-thang-mat-phang-kg',
  LO_DIS_TO_34757: 'g11-quan-he-song-song',
  LO_DIS_TO_34383: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34384: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34385: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34386: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34387: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34390: 'g12-toa-do-khong-gian',
  LO_DIS_TO_34391: 'g12-toa-do-khong-gian',
  LO_DIS_TO_34392: 'g12-toa-do-khong-gian',
};

const written = [];
for (const cls of scores) {
  for (const periodKey of ['IA1', 'F1']) {
    const period = cls.periods[periodKey];
    const los = cls.los;

    const header = ['STT', 'Họ và tên', 'Mã HS', ...los.map((lo) => LO_LABEL[lo] || lo)];
    const rows = [header];
    period.rows.forEach((row, index) => {
      rows.push([
        index + 1,
        row.name,
        row.code,
        ...los.map((lo) => {
          const competencyId = LO_TO_COMPETENCY[lo];
          const mark = row.mark4?.[competencyId];
          return mark === undefined ? 'N' : mark;
        }),
      ]);
    });

    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 14 }, ...los.map(() => ({ wch: 14 }))];
    XLSX.utils.book_append_sheet(book, sheet, 'Diem LO');

    // Sheet thứ hai: bảng điểm thang 10 để giáo viên đối chiếu khi cần giải thích.
    const detail = [['Họ và tên', 'Mã HS', ...los.map((lo) => (LO_LABEL[lo] || lo) + ' (thang 10)')]];
    for (const row of period.rows) {
      detail.push([row.name, row.code, ...los.map((lo) => row.mark10?.[LO_TO_COMPETENCY[lo]] ?? '')]);
    }
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(detail), 'Thang 10');

    const safePeriod = periodKey.toLowerCase();
    const fileName = resolve(`docs/qa/${cls.className}_${safePeriod}_diem-LO.xlsx`);
    const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
    writeFileSync(fileName, buffer);
    written.push({ file: fileName, rows: period.rows.length, los: los.length });
  }
}

console.log(JSON.stringify({ written }, null, 1));
