import { describe, expect, it } from 'vitest';
import { hasLatexFormula, mathAnswerDocument, mathAnswerHtml } from '../_assistant-math-image.js';

/**
 * Ảnh công thức KaTeX (chốt 28/10): Unicode không có phân thức xếp tầng, tích phân
 * có cận, lim dưới, ma trận → render ảnh chuẩn SGK. Text/caption vẫn là Unicode đầy đủ.
 */
describe('mathAnswerHtml — dựng HTML render công thức', () => {
  it('M1: phát hiện đúng có/không có LaTeX', () => {
    expect(hasLatexFormula('Công thức $$\\dfrac{1}{2}$$ đây')).toBe(true);
    expect(hasLatexFormula('inline $x^2$ đây')).toBe(true);
    expect(hasLatexFormula('dạng \\(x+1\\) cũ')).toBe(true);
    expect(hasLatexFormula('dạng \\[x+1\\] cũ')).toBe(true);
    expect(hasLatexFormula('Không có công thức, chỉ chữ ⅓ và a³.')).toBe(false);
    expect(hasLatexFormula('')).toBe(false);
  });

  it('M2: $$…$$ thành display (khối riêng), $…$ thành inline', () => {
    const html = mathAnswerHtml('Ta có $$\\dfrac{1}{2}$$ và $x^2$.');
    expect(html).toContain('class="disp"');
    expect(html).toContain('katex-display');
    // inline không bọc .disp
    const inlinePart = html.split('class="disp"')[1] ?? '';
    expect(inlinePart).toContain('katex');
  });

  it('M3: chữ thường được giữ nguyên, ký tự HTML được escape', () => {
    const html = mathAnswerHtml('Em xét a < b & c > d rồi tính $x^2$.');
    expect(html).toContain('a &' + 'lt; b &' + 'amp; c &' + 'gt; d');
    expect(html).not.toContain('a < b');
  });

  it('M4: markdown **đậm** bị bỏ (ảnh bitmap sẽ hiện nguyên dấu sao)', () => {
    const html = mathAnswerHtml('Vậy kết quả là **2**. Em kiểm tra lại nhé.');
    expect(html).toContain('Vậy kết quả là 2.');
    expect(html).not.toContain('**2**');
  });

  it('M5: công thức lỗi cú pháp không làm hỏng cả trang (render nguyên văn)', () => {
    const html = mathAnswerHtml('Xét $$\\dfrac{1}{$$ xong.');
    expect(html).toContain('katex');
    expect(html.length).toBeGreaterThan(50);
  });

  it('M6: document có CSS KaTeX nhúng + nền trắng + khổ rộng cho điện thoại', () => {
    const doc = mathAnswerDocument('Công thức $$\\dfrac{1}{2}$$');
    expect(doc).toContain('<!doctype html>');
    expect(doc).toContain('katex');
    expect(doc).toContain('background:#fff');
    expect(doc).toContain('width:960px');
  });
});
