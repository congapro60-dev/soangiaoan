import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExamConversionFile } from './examConversion';

/** Dựng file .xlsx từ mảng hàng để đưa vào đúng luồng đọc thật. */
const fileOf = (rows: unknown[][]): File => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([buffer], 'quy-doi.xlsx');
};

describe('file quy đổi MOET → TDS', () => {
  it('đọc Mã HS + điểm MOET + điểm TDS theo hàng tiêu đề', async () => {
    const file = fileOf([
      ['Kết quả quy đổi giữa kì'],
      ['Mã HS', 'Điểm MOET', 'Điểm TDS'],
      ['S1', 8, 85],
      ['S2', '7,5', 70],
      ['', 9, 90],
    ]);
    expect(await parseExamConversionFile(file)).toEqual([
      { studentCode: 'S1', moet: 8, tds: 85 },
      { studentCode: 'S2', moet: 7.5, tds: 70 },
    ]);
  });

  it('thiếu cột Mã HS hoặc thiếu cột điểm thì báo lỗi rõ ràng, không đoán mò', async () => {
    await expect(parseExamConversionFile(fileOf([['Họ tên', 'Điểm']]))).rejects.toThrow('Mã HS');
    await expect(parseExamConversionFile(fileOf([['Mã HS', 'Điểm MOET']]))).rejects.toThrow('MOET');
  });
});
