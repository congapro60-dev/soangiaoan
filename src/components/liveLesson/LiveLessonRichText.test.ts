import { describe, expect, it } from 'vitest';
import { toLiveLessonMarkdown } from './LiveLessonRichText';

describe('toLiveLessonMarkdown', () => {
  it('wraps raw LaTeX formula lines so the live screens can render them', () => {
    expect(toLiveLessonMarkdown('Công cụ\nax+by\\le c\\quad(\\text{hoặc }<,\\ge,>)')).toBe(
      'Công cụ\n\n$$ax+by\\le c\\quad(\\text{hoặc }<,\\ge,>)$$',
    );
  });

  it('separates every content line into its own block so lines do not collapse', () => {
    expect(toLiveLessonMarkdown('x: số chiếc bánh\ny: số chai nước\n15x + 10y ≤ 150')).toBe(
      'x: số chiếc bánh\n\ny: số chai nước\n\n15x + 10y ≤ 150',
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

  it('does not wrap Vietnamese prose that carries a stray LaTeX command', () => {
    const line = 'Miền nghiệm của 15x + 10y \\le 150 nằm dưới đường thẳng.';
    expect(toLiveLessonMarkdown(line)).toBe(line);
  });

  it('keeps a mixed prose sentence as prose (no whole-line math block)', () => {
    const line = '(x0; y0) là nghiệm nếu thay vào làm bất phương trình đúng';
    expect(toLiveLessonMarkdown(line)).toBe(line);
  });

  it('leaves ascii-operator formula-ish prose untouched when it has no LaTeX command', () => {
    const line = '15x + 10y <= 150 (hoặc >=, >)';
    expect(toLiveLessonMarkdown(line)).toBe(line);
  });

  it('still wraps a standalone inequality that has no natural-language word', () => {
    expect(toLiveLessonMarkdown('15x + 10y \\le 150')).toBe('$$15x + 10y \\le 150$$');
  });

  it('does not merge a formula line into the following Vietnamese sentence', () => {
    const source = '3x + 2y \\le 30\nMiền nghiệm nằm dưới đường biên.';
    expect(toLiveLessonMarkdown(source)).toBe('$$3x + 2y \\le 30$$\n\nMiền nghiệm nằm dưới đường biên.');
  });
});
