import { describe, expect, it } from 'vitest';
import { toLiveLessonMarkdown } from './LiveLessonRichText';

describe('toLiveLessonMarkdown', () => {
  it('wraps raw LaTeX formula lines so the live screens can render them', () => {
    expect(toLiveLessonMarkdown('Công cụ\nax+by\\le c\\quad(\\text{hoặc }<,\\ge,>)')).toBe(
      'Công cụ\n\n$$ax+by\\le c\\quad(\\text{hoặc }<,\\ge,>)$$\n',
    );
  });

  it('keeps existing inline or display math unchanged', () => {
    const source = 'Kiểm tra $15x+10y\\le150$\n\n$$3x+2y\\le30$$';
    expect(toLiveLessonMarkdown(source)).toBe(source);
  });

  it('does not wrap ordinary text that contains no raw math command', () => {
    expect(toLiveLessonMarkdown('Tìm lỗi · phân loại · sửa · chứng minh.')).toBe(
      'Tìm lỗi · phân loại · sửa · chứng minh.',
    );
  });
});
