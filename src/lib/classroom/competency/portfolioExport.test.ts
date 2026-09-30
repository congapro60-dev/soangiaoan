import { describe, expect, it } from 'vitest';
import { buildPortfolioAddRowsRequests, buildPortfolioExportRequests, type PortfolioMark } from './portfolioExport';
import { competenciesByGrade } from './framework';

// Ảnh cột A rút gọn của file mẫu: có mốc khối + area + header + chủ đề (trùng chủ đề giữa 2 khối để thử gate).
const columnA = [
  'Mã học sinh:',          // 0
  'Họ và tên:',            // 1
  'Học sinh tự bôi vàng…', // 2
  'Lớp 10',                // 3
  'Đại số',                // 4
  'Nội dung',              // 5
  'Hàm số bậc hai',        // 6
  'Hình học',              // 7
  'Nội dung',              // 8
  'Vectơ và các phép toán',// 9
  'Lớp 11',                // 10
  'Đại số và Giải tích',   // 11
  'Nội dung',              // 12
  'Vectơ và các phép toán',// 13  (trùng tên, thuộc khối 11 — không được khớp khi xuất khối 10)
];

const marks: PortfolioMark[] = [
  { topic: 'Hàm số bậc hai', selfLevel: 'Xuất sắc' },
  { topic: 'Vectơ và các phép toán', selfLevel: 'Đạt yêu cầu' },
];

describe('buildPortfolioExportRequests', () => {
  it('điền Mã HS + Họ tên vào B1/B2, chú thích màu vào ô hướng dẫn', () => {
    const { requests } = buildPortfolioExportRequests({ sheetId: 7, columnA, grade: 10, studentCode: 'S001', studentName: 'Trần A', marks: [] });
    const cells = requests.map(r => (r as any).updateCells).filter(Boolean);
    expect(cells).toHaveLength(3);
    expect(cells[2].rows[0].values[0].note).toMatch(/Nền vàng: HS tự đánh giá/);
    expect(cells[0].range).toMatchObject({ sheetId: 7, startRowIndex: 0, startColumnIndex: 1, endColumnIndex: 2 });
    expect(cells[0].rows[0].values[0].userEnteredValue.stringValue).toBe('S001');
    expect(cells[1].rows[0].values[0].userEnteredValue.stringValue).toBe('Trần A');
  });

  it('mức HS: bôi vàng đúng ô, đúng cột theo thứ tự Xuất sắc/Tốt/Đạt/Chưa đạt', () => {
    const { requests, matched } = buildPortfolioExportRequests({ sheetId: 7, columnA, grade: 10, studentCode: 'S1', studentName: 'A', marks });
    const paints = requests.map(r => (r as any).repeatCell).filter(Boolean);
    // Hàm số bậc hai (dòng 6) -> Xuất sắc = cột 2; Vectơ (dòng 9, khối 10) -> Đạt yêu cầu = cột 4.
    expect(paints).toHaveLength(2);
    expect(paints[0].range).toMatchObject({ startRowIndex: 6, endRowIndex: 7, startColumnIndex: 2, endColumnIndex: 3 });
    expect(paints[0].cell.userEnteredFormat.backgroundColor).toEqual({ red: 1, green: 1, blue: 0 });
    expect(paints[1].range).toMatchObject({ startRowIndex: 9, startColumnIndex: 4, endColumnIndex: 5 });
    expect(matched).toEqual(['Hàm số bậc hai', 'Vectơ và các phép toán']);
  });

  it('chỉ khớp trong đúng khối — chủ đề trùng ở khối khác không bị bôi', () => {
    const { requests } = buildPortfolioExportRequests({
      sheetId: 7, columnA, grade: 11, studentCode: 'S1', studentName: 'A',
      marks: [{ topic: 'Vectơ và các phép toán', selfLevel: 'Tốt' }],
    });
    const paints = requests.map(r => (r as any).repeatCell).filter(Boolean);
    expect(paints).toHaveLength(1);
    expect(paints[0].range.startRowIndex).toBe(13); // dòng khối 11, không phải 9
    expect(paints[0].range.startColumnIndex).toBe(3); // Tốt = cột 3
  });

  it('chủ đề không có trong file mẫu -> báo unmatched, không sinh lệnh bôi', () => {
    const { unmatched, requests } = buildPortfolioExportRequests({
      sheetId: 7, columnA, grade: 10, studentCode: 'S1', studentName: 'A',
      marks: [{ topic: 'Chủ đề lạ', selfLevel: 'Tốt' }],
    });
    expect(unmatched).toEqual(['Chủ đề lạ']);
    expect(requests.filter(r => (r as any).repeatCell)).toHaveLength(0);
  });
});

// Cột A giống file mẫu thật: khối 10 chỉ có 8 năng lực gốc.
const templateA = [
  'Mã học sinh:', 'Họ và tên:', 'Học sinh tự bôi vàng…',
  'Lớp 10',
  'Đại số', 'Nội dung', 'Tập hợp và mệnh đề', 'Phép toán trên tập hợp', 'Bất phương trình bậc nhất hai ẩn', 'Hàm số bậc hai',
  'Hình học', 'Nội dung', 'Hệ thức lượng trong tam giác', 'Vectơ và các phép toán',
  'Thống kê - Xác suất', 'Nội dung', 'Số gần đúng và sai số', 'Xác suất cổ điển',
  'Lớp 11', 'Đại số và Giải tích', 'Nội dung', 'Hàm số lượng giác và phương trình lượng giác',
];

describe('mức GV + kế hoạch', () => {
  const run = (mark: PortfolioMark, months: string[] = []) =>
    buildPortfolioExportRequests({ sheetId: 7, columnA, grade: 10, studentCode: 'S1', studentName: 'A', marks: [mark], months }).requests;

  it('GV khác mức HS: ô GV nền xanh; trùng mức: giữ vàng, thêm viền xanh', () => {
    const differ = run({ topic: 'Hàm số bậc hai', selfLevel: 'Tốt', teacherLevel: 'Đạt yêu cầu' }).map(r => (r as any).repeatCell).filter(Boolean);
    expect(differ).toHaveLength(2);
    expect(differ[1].range.startColumnIndex).toBe(4);
    expect(differ[1].cell.userEnteredFormat.backgroundColor).not.toEqual({ red: 1, green: 1, blue: 0 });
    const same = run({ topic: 'Hàm số bậc hai', selfLevel: 'Tốt', teacherLevel: 'Tốt' }).map(r => (r as any).repeatCell).filter(Boolean);
    expect(same[1].fields).toBe('userEnteredFormat.borders');
    expect(same[1].range.startColumnIndex).toBe(3);
  });

  it('điền cột G..L theo thứ tự Mục tiêu/Phương án/Thời gian/Khó khăn/Tiến độ/Ý kiến GV; ô trống để nguyên', () => {
    const requests = run({ topic: 'Hàm số bậc hai', goal: 'Đạt Tốt', timeframe: 'tháng 11/2026', progress: 'Đang thực hiện', teacherComment: 'Cố lên' }, ['tháng 8/2026', 'tháng 11/2026']);
    const plan = requests.map(r => (r as any).updateCells).filter(Boolean).find((c: any) => c.range.startColumnIndex === 6);
    expect(plan.range).toMatchObject({ startRowIndex: 6, startColumnIndex: 6, endColumnIndex: 12 });
    expect(plan.rows[0].values.map((v: any) => v.userEnteredValue?.stringValue ?? null))
      .toEqual(['Đạt Tốt', null, 'tháng 11/2026', null, 'Đang thực hiện', 'Cố lên']);
    const validation = requests.map(r => (r as any).setDataValidation).filter(Boolean)[0];
    expect(validation.range).toMatchObject({ startRowIndex: 6, startColumnIndex: 8 });
    expect(validation.rule.condition.values.map((v: any) => v.userEnteredValue)).toEqual(['tháng 8/2026', 'tháng 11/2026']);
  });
});

describe('buildPortfolioAddRowsRequests — bổ sung đủ khung khi xuất', () => {
  it('chèn 9 năng lực còn thiếu vào đúng mảng, đúng thứ tự khung; khối khác không đổi', () => {
    const { columnA, added, skipped, requests } = buildPortfolioAddRowsRequests({ sheetId: 3, columnA: templateA, grade: 10 });
    expect(added).toHaveLength(9);
    expect(skipped).toEqual([]);
    expect(requests).toHaveLength(27); // mỗi dòng: chèn + chép định dạng + điền nội dung
    const section = columnA.slice(columnA.indexOf('Lớp 10'), columnA.indexOf('Lớp 11'));
    const topics = section.filter(cell => competenciesByGrade(10).some(c => c.topic === cell));
    expect(topics).toEqual(competenciesByGrade(10).map(c => c.topic));
    expect(columnA.slice(columnA.indexOf('Lớp 11'))).toEqual(templateA.slice(templateA.indexOf('Lớp 11')));
  });

  it('dòng mới: chèn sau năng lực đứng trước, chép định dạng dòng đó, điền nội dung + 4 mức', () => {
    const { requests } = buildPortfolioAddRowsRequests({ sheetId: 3, columnA: templateA, grade: 10 });
    const [insert, copy, fill] = requests as any[];
    // "Hàm số và đồ thị" đứng sau "Bất phương trình bậc nhất hai ẩn" (dòng 8) → chèn dòng 9.
    expect(insert.insertDimension.range).toEqual({ sheetId: 3, dimension: 'ROWS', startIndex: 9, endIndex: 10 });
    expect(copy.copyPaste.source).toMatchObject({ startRowIndex: 8, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 12 });
    expect(copy.copyPaste.destination).toMatchObject({ startRowIndex: 9, endRowIndex: 10 });
    const texts = fill.updateCells.rows[0].values.map((v: any) => v.userEnteredValue.stringValue);
    expect(texts[0]).toBe('Hàm số và đồ thị');
    expect(texts).toHaveLength(6);
    expect(texts.every((t: string) => t.length > 0)).toBe(true);
  });

  it('file đã đủ thì không chèn gì; bôi vàng tính trên cột A sau khi chèn', () => {
    const first = buildPortfolioAddRowsRequests({ sheetId: 3, columnA: templateA, grade: 10 });
    const again = buildPortfolioAddRowsRequests({ sheetId: 3, columnA: first.columnA, grade: 10 });
    expect(again.requests).toEqual([]);
    const { matched, unmatched, requests } = buildPortfolioExportRequests({
      sheetId: 3, columnA: first.columnA, grade: 10, studentCode: 'S1', studentName: 'A',
      marks: [{ topic: 'Ba đường conic', selfLevel: 'Tốt' }, { topic: 'Hàm số bậc hai', selfLevel: 'Xuất sắc' }],
    });
    expect(unmatched).toEqual([]);
    expect(matched).toEqual(['Ba đường conic', 'Hàm số bậc hai']);
    const paints = requests.map(r => (r as any).repeatCell).filter(Boolean);
    expect(paints[0].range.startRowIndex).toBe(first.columnA.indexOf('Ba đường conic'));
  });

  it('khối không có trong file → bỏ qua, báo lại', () => {
    const { skipped, requests } = buildPortfolioAddRowsRequests({ sheetId: 3, columnA: ['Lớp 11'], grade: 10 });
    expect(requests).toEqual([]);
    expect(skipped).toHaveLength(17);
  });
});
