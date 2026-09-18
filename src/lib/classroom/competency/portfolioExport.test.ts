import { describe, expect, it } from 'vitest';
import { buildPortfolioExportRequests, type PortfolioMark } from './portfolioExport';

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
  { topic: 'Hàm số bậc hai', level: 'Xuất sắc' },
  { topic: 'Vectơ và các phép toán', level: 'Đạt yêu cầu' },
];

describe('buildPortfolioExportRequests', () => {
  it('điền Mã HS + Họ tên vào B1/B2', () => {
    const { requests } = buildPortfolioExportRequests({ sheetId: 7, columnA, grade: 10, studentCode: 'S001', studentName: 'Trần A', marks: [] });
    const cells = requests.map(r => (r as any).updateCells).filter(Boolean);
    expect(cells).toHaveLength(2);
    expect(cells[0].range).toMatchObject({ sheetId: 7, startRowIndex: 0, startColumnIndex: 1, endColumnIndex: 2 });
    expect(cells[0].rows[0].values[0].userEnteredValue.stringValue).toBe('S001');
    expect(cells[1].rows[0].values[0].userEnteredValue.stringValue).toBe('Trần A');
  });

  it('bôi vàng đúng ô mức, đúng cột theo thứ tự Xuất sắc/Tốt/Đạt/Chưa đạt', () => {
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
      marks: [{ topic: 'Vectơ và các phép toán', level: 'Tốt' }],
    });
    const paints = requests.map(r => (r as any).repeatCell).filter(Boolean);
    expect(paints).toHaveLength(1);
    expect(paints[0].range.startRowIndex).toBe(13); // dòng khối 11, không phải 9
    expect(paints[0].range.startColumnIndex).toBe(3); // Tốt = cột 3
  });

  it('chủ đề không có trong file mẫu -> báo unmatched, không sinh lệnh bôi', () => {
    const { unmatched, requests } = buildPortfolioExportRequests({
      sheetId: 7, columnA, grade: 10, studentCode: 'S1', studentName: 'A',
      marks: [{ topic: 'Chủ đề lạ', level: 'Tốt' }],
    });
    expect(unmatched).toEqual(['Chủ đề lạ']);
    expect(requests.filter(r => (r as any).repeatCell)).toHaveLength(0);
  });
});
