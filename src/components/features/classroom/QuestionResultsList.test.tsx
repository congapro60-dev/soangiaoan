import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QuestionResultsList } from './QuestionResultsList';

describe('QuestionResultsList', () => {
  it('render công thức đã có delimiter trong bài làm và đáp án bằng KaTeX', () => {
    const html = renderToStaticMarkup(
      <QuestionResultsList
        results={[{
          questionNumber: 'Bài 4.2a',
          status: 'correct',
          score: 1.75,
          maxScore: 1.75,
          studentAnswer: '$D \\in SA \\subset (SAB)$',
          expectedAnswer: '$D \\in SA \\subset (SAB) \\Rightarrow D \\in (SAB)$',
          errorType: 'Không có',
          explanation: 'Lập luận đầy đủ.',
          correction: 'Không cần chỉnh sửa.',
          nextPractice: 'Tiếp tục phát huy.',
          needsTeacherReview: false,
        }]}
      />,
    );

    const studentLabel = html.indexOf('Bài làm của em');
    const expectedLabel = html.indexOf('Đáp án / mốc cần đạt');
    expect(studentLabel).toBeGreaterThanOrEqual(0);
    expect(expectedLabel).toBeGreaterThan(studentLabel);
    expect(html.slice(studentLabel, expectedLabel)).toContain('class="katex"');
    expect(html.slice(expectedLabel)).toContain('class="katex"');
  });

  it('render công thức raw không có delimiter trong cả bài làm và đáp án bằng KaTeX', () => {
    const html = renderToStaticMarkup(
      <QuestionResultsList
        results={[{
          questionNumber: 'Bài 4.2b',
          status: 'partially_correct',
          score: 1,
          maxScore: 1.75,
          studentAnswer: 'D \\in SA \\subset (SAB)',
          expectedAnswer: 'D \\in SA \\subset (SAB) \\Rightarrow D \\in (SAB)',
          errorType: 'Thiếu kết luận.',
          explanation: 'Em chưa nêu mặt phẳng chứa D.',
          correction: 'Bổ sung kết luận.',
          nextPractice: 'Luyện thêm một bài tương tự.',
          needsTeacherReview: false,
        }]}
      />,
    );

    const studentLabel = html.indexOf('Bài làm của em');
    const expectedLabel = html.indexOf('Đáp án / mốc cần đạt');
    expect(studentLabel).toBeGreaterThanOrEqual(0);
    expect(expectedLabel).toBeGreaterThan(studentLabel);
    expect(html.slice(studentLabel, expectedLabel)).toContain('class="katex"');
    expect(html.slice(expectedLabel)).toContain('class="katex"');
  });
});
