import { describe, expect, it } from 'vitest';
import { extractQuestionCatalogFromText, normalizeQuestionKey, questionGroupKey } from './questionCatalog';
import { parseQuestionCatalog } from './gradingPrompt';

/**
 * Nhãn có thật, chép từ bảng thống kê của giáo viên ngày 08/09/2026: cùng một câu bị model đặt
 * tên sáu kiểu nên bảng xé thành sáu dòng, dòng báo 100% dòng báo 50%.
 */
describe('questionGroupKey — gộp nhãn cùng một câu', () => {
  it('gộp mọi biến thể của Bài 3.5 Ý 1 về một khoá', () => {
    const key = questionGroupKey('Bài 3.5 – Ý 1');
    expect(questionGroupKey('Bài 3.5 – Ý 1 (Tính cos A)')).toBe(key);
    expect(questionGroupKey('Bài 3.5 – Ý 1: Tính cos A')).toBe(key);
    expect(questionGroupKey('Bài 3.5 (Ý 1)')).toBe(key);
    expect(questionGroupKey('Bài 3.5 (Ý 1 – Tính cos A)')).toBe(key);
  });

  it('gộp Ý 2 và Ý 3 theo cùng cách, và không trộn lẫn các ý với nhau', () => {
    expect(questionGroupKey('Bài 3.5 – Ý 2 (Tính diện tích S)')).toBe(questionGroupKey('Bài 3.5 – Ý 2: Tính diện tích S'));
    expect(questionGroupKey('Bài 3.5 (Ý 2 – Tính S)')).toBe(questionGroupKey('Bài 3.5 – Ý 2'));
    expect(questionGroupKey('Bài 3.5 – Ý 3 (Tính bán kính r)')).toBe(questionGroupKey('Bài 3.5 (Ý 3)'));

    const keys = ['Bài 3.5 – Ý 1', 'Bài 3.5 – Ý 2', 'Bài 3.5 – Ý 3'].map(questionGroupKey);
    expect(new Set(keys).size).toBe(3);
  });

  it('câu mẹ không bị nuốt vào câu con', () => {
    expect(questionGroupKey('Bài 3.5')).not.toBe(questionGroupKey('Bài 3.5 – Ý 1'));
  });

  it('gộp cách viết rời và viết dính của cùng một phần', () => {
    expect(questionGroupKey('Bài 3.9a')).toBe(questionGroupKey('Bài 3.9 – Câu a'));
    expect(questionGroupKey('Bài 3.9 – Câu a: Tính các góc tam giác ABC')).toBe(questionGroupKey('Bài 3.9a'));
    expect(questionGroupKey('Bài 3.9b')).not.toBe(questionGroupKey('Bài 3.9a'));
  });

  it('bỏ phần mô tả dài kể cả khi không có ý con', () => {
    expect(questionGroupKey('Bài 3.11 (Độ dài đường hầm giảm bao nhiêu)')).toBe(questionGroupKey('Bài 3.11'));
    expect(questionGroupKey('Bài 3.11: Tính độ dài đường mới giảm')).toBe(questionGroupKey('Bài 3.11'));
  });

  it('giữ ngữ cảnh phần và tự luận, không gộp nhầm hai phần khác nhau', () => {
    expect(questionGroupKey('Phần II – Câu 4')).not.toBe(questionGroupKey('Phần III – Câu 4'));
    expect(questionGroupKey('Tự luận – Bài 1')).toBe(questionGroupKey('Bài 1 (TL)'));
  });

  it('nhãn không có số vẫn giữ khoá riêng, không dồn hết vào một dòng', () => {
    expect(questionGroupKey('Tính chiều cao toà nhà')).not.toBe(questionGroupKey('Tính diện tích tam giác'));
    expect(questionGroupKey('')).toBe('');
  });
});

describe('parseQuestionCatalog', () => {
  it('đọc danh mục câu hỏi kèm công thức LaTeX và thang điểm từng câu', () => {
    const raw = JSON.stringify({
      questions: [
        { questionNumber: 'Bài 3.5 – Ý 1', content: 'Tính $\\cos A$ của tam giác.', maxScore: 2 },
        { questionNumber: 'Bài 3.9', content: 'Tính chiều cao toà nhà.' },
      ],
    });
    expect(parseQuestionCatalog(raw)).toEqual([
      { questionNumber: 'Bài 3.5 – Ý 1', content: 'Tính $\\cos A$ của tam giác.', maxScore: 2 },
      { questionNumber: 'Bài 3.9', content: 'Tính chiều cao toà nhà.' },
    ]);
  });

  it('bỏ phần tử hỏng nhưng giữ phần còn lại, không ném lỗi làm mất cả danh mục', () => {
    const raw = JSON.stringify({
      questions: [
        { questionNumber: 'Bài 1', content: 'Nội dung tốt.' },
        { questionNumber: '', content: 'Thiếu nhãn nên bỏ.' },
        { questionNumber: 'Bài 2', content: '   ' },
        'không phải object',
        { questionNumber: 'Bài 1', content: 'Trùng nhãn nên bỏ.' },
      ],
    });
    expect(parseQuestionCatalog(raw)).toEqual([{ questionNumber: 'Bài 1', content: 'Nội dung tốt.' }]);
  });

  it('chịu được code fence và trả mảng rỗng khi không có JSON', () => {
    expect(parseQuestionCatalog('```json\n{"questions":[{"questionNumber":"Câu 1","content":"Giải $x^2=4$."}]}\n```'))
      .toEqual([{ questionNumber: 'Câu 1', content: 'Giải $x^2=4$.' }]);
    expect(parseQuestionCatalog('AI không trả JSON')).toEqual([]);
    expect(parseQuestionCatalog('')).toEqual([]);
  });
});

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
