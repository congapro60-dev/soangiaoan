import { describe, expect, it } from 'vitest';
import { latexToUnicodeMath } from '../_assistant-math-text.js';
import { geometrySvg } from '../_assistant-geometry-svg.js';
import { parseGeometrySpec } from '../_assistant-geometry.js';

/**
 * Ba lỗi chủ dự án báo từ ảnh thật trên Zalo (28/10):
 * 1. Hình vẽ SAI ĐỀ: đề cho "SA ⊥ (ABCD)" nhưng hình vẽ S trên tâm O.
 * 2. SAI TÍNH CHẤT HÌNH HỌC: SA không còn là đường cao nên bài giải rối.
 * 3. Công thức lỗi: "a^2" và "1/3a^2" in nguyên si ra chat.
 */
describe('lỗi 28/10 — công thức trong chat', () => {
  it('M1: "a^2" trần (không bọc $) phải thành a²', () => {
    expect(latexToUnicodeMath('S_day=a^2')).toBe('S_day=a²');
    expect(latexToUnicodeMath('x^2 + 1')).toBe('x² + 1');
  });

  it('M2: "1/3a^2" → "⅓a²" (phân số + mũ, model viết liền)', () => {
    expect(latexToUnicodeMath('V=1/3a^2.SA')).toBe('V=⅓a².SA');
  });

  it('M3: chỉ số dưới trước mũ không được ăn mất biến (S_day=a^2)', () => {
    // Trước đây "_" quét trước nên đọc "day=a" rồi để lại "a^2" hỏng.
    expect(latexToUnicodeMath('S_day=a^2')).toContain('a²');
    expect(latexToUnicodeMath('S_day=a^2')).not.toContain('^');
  });

  it('M4: KHÔNG phá số liệu thật — 15/100 và điểm 8/10 giữ nguyên', () => {
    expect(latexToUnicodeMath('15/100 = 3/20')).toBe('15/100 = 3/20');
    expect(latexToUnicodeMath('diem 8/10')).toBe('diem 8/10');
  });

  it('M5: phân số có ký tự riêng vẫn đổi (2/3 → ⅔, 1/2 → ½)', () => {
    expect(latexToUnicodeMath('2/3 + 1/2')).toBe('⅔ + ½');
  });
});

describe('lỗi 28/10 — chân đường cao phải theo đề', () => {
  it('H1: đề "SA ⊥ đáy" → apexAt="A", S nằm trên A, KHÔNG có O', () => {
    const spec = parseGeometrySpec({ shape: 'pyramid', base: 'square', apexAt: 'A' });
    expect(spec).not.toBeNull();
    const svg = geometrySvg(spec) ?? '';
    // Có đủ đỉnh, KHÔNG có nhãn O (vì SA chính là đường cao).
    for (const l of ['S', 'A', 'B', 'C', 'D']) expect(svg).toContain(`>${l}<`);
    expect(svg).not.toContain('>O<');
    // Dấu góc vuông tại A giữa SA và AB.
    expect(svg).toContain('<polyline');
  });

  it('H2: "hình chóp đều" → apexAt="center", có O và đường cao S→O', () => {
    const spec = parseGeometrySpec({ shape: 'pyramid', base: 'square', apexAt: 'center' });
    const svg = geometrySvg(spec) ?? '';
    expect(svg).toContain('>O<');
    expect(svg).toContain('stroke-dasharray');
  });

  it('H3: apexAt chỉ hợp lệ cho pyramid — gắn vào box thì từ chối cả khối', () => {
    expect(parseGeometrySpec({ shape: 'box', apexAt: 'A' })).toBeNull();
  });

  it('H4: apexAt giá trị lạ → từ chối', () => {
    expect(parseGeometrySpec({ shape: 'pyramid', apexAt: 'M' })).toBeNull();
  });

  it('H5: mặc định (không khai báo apexAt) → S trên tâm, tương thích cũ', () => {
    const svg = geometrySvg(parseGeometrySpec({ shape: 'pyramid', base: 'square' })) ?? '';
    expect(svg).toContain('>O<');
  });
});
