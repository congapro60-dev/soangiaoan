import { describe, expect, it } from 'vitest';
import { CALENDAR_SHEET_HINT, PPCT_SHEET_HINT, rankSheetsText } from './sheetText';

describe('rankSheetsText', () => {
  const sheets = [
    { name: 'Hướng dẫn', text: 'Hướng dẫn điền file, cấu hình email' },
    { name: 'SUM', text: 'Thống kê hành động' },
    { name: 'School calendar', text: 'W1 tháng 8\n31: Nghỉ lễ Quốc khánh\n2: PD day HS nghỉ\nThi giữa kỳ tuần 10' },
    { name: 'Trống', text: '   ' },
  ];

  it('trang lịch lên đầu; trang trống bỏ; thứ tự gốc giữ khi bằng điểm', () => {
    const text = rankSheetsText(sheets, CALENDAR_SHEET_HINT, 10_000);
    expect(text.indexOf('Trang tính: School calendar')).toBe(0);
    expect(text).not.toContain('Trang tính: Trống');
    expect(text.indexOf('Hướng dẫn')).toBeLessThan(text.indexOf('Trang tính: SUM'));
  });

  it('vượt giới hạn: bỏ trang ít liên quan, không cắt ngang trang quan trọng', () => {
    const big = [{ name: 'Rác', text: 'x'.repeat(500) }, { name: 'Lịch', text: 'Nghỉ lễ tết tuần tháng' }];
    const text = rankSheetsText(big, CALENDAR_SHEET_HINT, 100);
    expect(text).toContain('Trang tính: Lịch');
    expect(text).not.toContain('Trang tính: Rác');
  });

  it('PPCT ưu tiên trang có tiết/bài/chương', () => {
    const text = rankSheetsText([{ name: 'Bìa', text: 'Trường THPT' }, { name: 'PPCT', text: 'Tiết 1 Bài 1 Chương I' }], PPCT_SHEET_HINT, 1000);
    expect(text.startsWith('Trang tính: PPCT')).toBe(true);
  });
});
