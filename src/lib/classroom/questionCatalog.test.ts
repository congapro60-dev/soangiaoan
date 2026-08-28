import { describe, expect, it } from 'vitest';
import { extractQuestionCatalogFromText, normalizeQuestionKey } from './questionCatalog';

describe('questionCatalog', () => {
  it('chuẩn hóa số câu có tiền tố và dấu câu để ghép với thống kê', () => {
    expect(normalizeQuestionKey('Câu 1')).toBe('1');
    expect(normalizeQuestionKey('Bài 4.2b')).toBe('4.2b');
    expect(normalizeQuestionKey('  Q-3.  ')).toBe('3');
  });

  it('giữ ngữ cảnh khi chuẩn hóa nhãn composite và nhận alias Tự luận', () => {
    expect(normalizeQuestionKey('Tự luận – Bài 1')).toBe(normalizeQuestionKey('Bài 1 (TL)'));
    expect(normalizeQuestionKey('Tự luận – Bài 1')).not.toBe(normalizeQuestionKey('Bài 1'));
    expect(normalizeQuestionKey('Phần II – Bài 4')).not.toBe(normalizeQuestionKey('Phần III – Bài 4'));
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

  it('ghép được nhãn Phần/Tự luận với cùng nhãn trong kết quả chấm', () => {
    expect(extractQuestionCatalogFromText(
      'Phần III – Bài 4: Tính $x^2$.\nTự luận – Bài 1: Chứng minh $a=b$.',
      ['Phần III – Bài 4', 'Bài 1 (TL)'],
    )).toEqual([
      { questionNumber: 'Phần III – Bài 4', content: 'Tính $x^2$.' },
      { questionNumber: 'Bài 1 (TL)', content: 'Chứng minh $a=b$.' },
    ]);
  });

  it('nhận diện tiêu đề câu có Markdown do OCR trả về', () => {
    expect(extractQuestionCatalogFromText(
      '### Câu 1: Tính $a+b$.\n**Câu 2:** Giải $x=1$.',
      ['Câu 1', 'Câu 2'],
    )).toEqual([
      { questionNumber: 'Câu 1', content: 'Tính $a+b$.' },
      { questionNumber: 'Câu 2', content: 'Giải $x=1$.' },
    ]);
  });

  it('không gộp nội dung của hai phần khác nhau có cùng số bài', () => {
    expect(extractQuestionCatalogFromText(
      'Phần II – Bài 4: Nội dung phần II $x$.\nPhần III – Bài 4: Nội dung phần III $y$.',
      ['Phần III – Bài 4'],
    )).toEqual([
      { questionNumber: 'Phần III – Bài 4', content: 'Nội dung phần III $y$.' },
    ]);
  });

  it('chỉ dùng toàn bộ văn bản làm dự phòng khi bài có đúng một câu được ghi nhận', () => {
    expect(extractQuestionCatalogFromText('Tính diện tích hình tròn bán kính $r$.', ['1'])).toEqual([{
      questionNumber: '1',
      content: 'Tính diện tích hình tròn bán kính $r$.',
    }]);
    expect(extractQuestionCatalogFromText('Tính diện tích.\nKết luận.', ['1', '2'])).toEqual([]);
  });
});
