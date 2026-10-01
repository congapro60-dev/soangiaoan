import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { SSM_MERGE_HEADERS, SSM_MERGE_MESSAGE, buildSsmMergeWorkbook, missingCodeCount, ssmMergeRows } from './ssmMailMerge';

const students = [
  { code: 'GB0117', name: 'Trần Thùy Anh', pin: '0482' },
  { code: ' S23050256 ', name: 'Nguyễn Minh Đức', pin: '7310' },
  { code: '', name: 'Em chưa có mã', pin: '1234' },
];
const LINK = 'https://giaoandewey.vercel.app/ph/7W288E';

describe('file Mail merge cho SSM', () => {
  it('cột A là Ma_Hocsinh, tiêu đề không dấu và đúng thứ tự', () => {
    expect(SSM_MERGE_HEADERS[0]).toBe('Ma_Hocsinh');
    for (const header of SSM_MERGE_HEADERS) expect(header).toMatch(/^[A-Za-z_]+$/);
  });

  it('dòng dữ liệu: mã HS cắt khoảng trắng, PIN giữ số 0 đầu, mọi ô là chữ', () => {
    const rows = ssmMergeRows(students, LINK);
    expect(rows[0]).toEqual(['GB0117', 'Trần Thùy Anh', '0482', LINK]);
    expect(rows[1][0]).toBe('S23050256');
    expect(rows.flat().every(cell => typeof cell === 'string')).toBe(true);
  });

  it('workbook đúng bố cục mẫu SSM: 3 sheet (sheet đầu ẩn, trống), dữ liệu từ dòng 2, PIN là chữ', () => {
    const book = buildSsmMergeWorkbook(students, LINK);
    expect(book.SheetNames).toEqual(['Kangatang', 'Dữ liệu Import', 'Hướng dẫn nhập liệu ']);
    expect(book.Workbook?.Sheets?.map(s => s.Hidden)).toEqual([1, 0, 0]);
    // Ghi ra rồi đọc lại như SSM sẽ đọc.
    const again = XLSX.read(XLSX.write(book, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
    const sheet = again.Sheets['Dữ liệu Import'];
    expect(sheet.A1.v).toBe('Ma_Hocsinh');
    expect(sheet.C1.v).toBe('PIN_phu_huynh');
    expect(sheet.A2.v).toBe('GB0117');
    expect(sheet.C2.v).toBe('0482');
    expect(sheet.C2.t).toBe('s');
    expect(again.Sheets['Hướng dẫn nhập liệu '].A3.v).toContain('Ma_Hocsinh');
  });

  it('báo số em chưa có mã HS; tin gợi ý dùng đúng tên cột', () => {
    expect(missingCodeCount(students)).toBe(1);
    for (const header of ['Ho_ten_Hoc_sinh', 'Link_bao_cao', 'PIN_phu_huynh']) expect(SSM_MERGE_MESSAGE).toContain(`{${header}}`);
  });
});
