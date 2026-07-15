import { describe, it, expect } from 'vitest';
import { extractDisplayFormulas, replaceInlineFormulasWithText, latexToPlainTextApprox } from './mathToImage';

describe('extractDisplayFormulas', () => {
  it('tách khối $$...$$ ra khỏi text, trả về text còn lại rỗng khi point chỉ có formula', () => {
    const { remainingText, formulas } = extractDisplayFormulas('$$\\frac{a}{b} = c$$');
    expect(remainingText).toBe('');
    expect(formulas).toEqual(['\\frac{a}{b} = c']);
  });

  it('giữ lại text bao quanh, chỉ bỏ phần $$...$$', () => {
    const { remainingText, formulas } = extractDisplayFormulas('Công thức tổng quát: $$(a+b)^2 = a^2+2ab+b^2$$');
    expect(remainingText).toBe('Công thức tổng quát:');
    expect(formulas).toEqual(['(a+b)^2 = a^2+2ab+b^2']);
  });

  it('không có $$ thì trả về nguyên text, formulas rỗng', () => {
    const { remainingText, formulas } = extractDisplayFormulas('Không có công thức nào ở đây');
    expect(remainingText).toBe('Không có công thức nào ở đây');
    expect(formulas).toEqual([]);
  });

  it('tách nhiều khối display trong cùng một point', () => {
    const { formulas } = extractDisplayFormulas('$$x^2$$ và $$y^2$$');
    expect(formulas).toEqual(['x^2', 'y^2']);
  });
});

describe('replaceInlineFormulasWithText', () => {
  it('thay $...$ bằng xấp xỉ text đọc được', () => {
    expect(replaceInlineFormulasWithText('Tính $\\frac{1}{2}$ của số đó')).toBe('Tính 1/2 của số đó');
  });

  it('không đụng vào text không có $', () => {
    expect(replaceInlineFormulasWithText('Không có công thức')).toBe('Không có công thức');
  });
});

describe('latexToPlainTextApprox', () => {
  it('chuyển các ký hiệu phổ biến sang Unicode', () => {
    expect(latexToPlainTextApprox('\\sqrt{2}')).toBe('√(2)');
    expect(latexToPlainTextApprox('a \\le b')).toBe('a ≤ b');
    expect(latexToPlainTextApprox('x \\times y')).toBe('x × y');
    expect(latexToPlainTextApprox('x^2')).toBe('x²');
  });

  it('không để sót backslash/brace thô trong kết quả', () => {
    const result = latexToPlainTextApprox('\\left(\\frac{a}{b}\\right)');
    expect(result).not.toMatch(/[\\{}]/);
  });
});
