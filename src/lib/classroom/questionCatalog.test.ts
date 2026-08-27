import { describe, expect, it } from 'vitest';
import { extractQuestionCatalogFromText, normalizeQuestionKey } from './questionCatalog';

describe('questionCatalog', () => {
  it('chuẩn hóa số câu có tiền tố và dấu câu để ghép với thống kê', () => {
    expect(normalizeQuestionKey('Câu 1')).toBe('1');
    expect(normalizeQuestionKey('Bài 4.2b')).toBe('4.2b');
    expect(normalizeQuestionKey('  Q-3.  ')).toBe('3');
  });

  it('tách nội dung theo tiêu đề Câu và giữ công thức nguyên dạng', () => {
    const catalog = extractQuestionCatalogFromText(
      'Câu 1: Giải phương trình $x+1=0$.\nNêu tập nghiệm.\n\nCâu 2. Tính $f(0)$.',
      ['1', '2'],
    );

    expect(catalog).toEqual([
      { questionNumber: '1', content: 'Giải phương trình $x+1=0$.\nNêu tập nghiệm.' },
      { questionNumber: '2', content: 'Tính $f(0)$.' },
    ]);
  });

  it('nhận diện tiêu đề dạng Bài 4.2b và không gán nhầm phần khác', () => {
    const catalog = extractQuestionCatalogFromText(
      'Bài 4.2a\nChứng minh mệnh đề thứ nhất.\nBài 4.2b – Xác định giao tuyến của hai mặt phẳng.',
      ['4.2b', '4.3'],
    );

    expect(catalog).toEqual([{ questionNumber: '4.2b', content: 'Xác định giao tuyến của hai mặt phẳng.' }]);
  });

  it('chỉ dùng toàn bộ văn bản làm dự phòng khi bài có đúng một câu được ghi nhận', () => {
    expect(extractQuestionCatalogFromText('Tính diện tích hình tròn bán kính $r$.', ['1'])).toEqual([{
      questionNumber: '1',
      content: 'Tính diện tích hình tròn bán kính $r$.',
    }]);
    expect(extractQuestionCatalogFromText('Tính diện tích.\nKết luận.', ['1', '2'])).toEqual([]);
  });
});
