import { describe, expect, it } from 'vitest';
import { preprocessExamMarkdownForWord, splitBannerRowsFromTables } from './render-word-core';

describe('splitBannerRowsFromTables', () => {
  it('tách dải tiêu đề dính dưới bảng thành bảng một cột riêng', () => {
    const input = [
      '| Lớp | 11 | Môn học | Toán |',
      '| --- | --- | --- | --- |',
      '| Giáo viên | ..... | Tuần học | 5 |',
      '| **I. THÔNG TIN CHUNG** |',
      'Nội dung tiếp theo.',
    ].join('\n');

    const output = splitBannerRowsFromTables(input).split('\n');
    const viTri = output.indexOf('| **I. THÔNG TIN CHUNG** |');

    expect(output[viTri - 1]).toBe('');
    expect(output[viTri + 1]).toBe('| --- |');
  });

  it('không đụng vào hàng bình thường của bảng nhiều cột', () => {
    const input = [
      '| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |',
      '| --- | --- | --- |',
      '| P0–P3 | GV nêu câu hỏi | 1. ÔN TẬP |',
    ].join('\n');

    expect(splitBannerRowsFromTables(input)).toBe(input);
  });

  it('không đụng vào bảng một cột vốn đã đứng riêng', () => {
    const input = ['| **PHA 1: TRẢI NGHIỆM** |', '| --- |', ''].join('\n');

    expect(splitBannerRowsFromTables(input)).toBe(input);
  });
});

describe('preprocessExamMarkdownForWord', () => {
  it('converts short plain A/B/C/D options to a valid 4-column GFM option grid', () => {
    const input = ['Câu 1. Chọn đáp án đúng.', 'A. 1', 'B. 2', 'C. 3', 'D. 4'].join('\n');

    const output = preprocessExamMarkdownForWord(input);

    expect(output).toContain('<!-- OPTION_GRID -->');
    expect(output).toContain('| A. 1 | B. 2 | C. 3 | D. 4 |');
    expect(output).toContain('| --- | --- | --- | --- |');
  });

  it('converts markdown-list bold A/B/C/D options to a valid 4-column GFM option grid', () => {
    const input = ['Câu 2. Chọn đáp án đúng.', '- **A.** 10', '- **B.** 20', '- **C.** 30', '- **D.** 40'].join('\n');

    const output = preprocessExamMarkdownForWord(input);

    expect(output).toContain('<!-- OPTION_GRID -->');
    expect(output).toContain('| A. 10 | B. 20 | C. 30 | D. 40 |');
    expect(output).toContain('| --- | --- | --- | --- |');
  });

  it('sanitizes centered HTML wrappers around the end marker', () => {
    const output = preprocessExamMarkdownForWord('<div style="text-align:center">**--- HẾT ---**</div>');

    expect(output).toBe('**--- HẾT ---**');
    expect(output).not.toContain('<div');
    expect(output).not.toContain('</div>');
  });
});
