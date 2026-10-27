import { describe, expect, it } from 'vitest';
import { MATH_FORMAT_RULE, latexToUnicodeMath } from '../_assistant-math-text.js';

describe('công thức — LaTeX sang Unicode cho chat Zalo', () => {
  it('M1: dấu bao \\( \\) biến mất, mũ thành ký tự Unicode', () => {
    expect(latexToUnicodeMath('Thể tích hình lập phương cạnh \\(a\\) là \\(a^3\\).')).toBe(
      'Thể tích hình lập phương cạnh a là a³.',
    );
  });

  it('M2: inline $…$ và display $$…$$ đều được chuyển', () => {
    expect(latexToUnicodeMath('Diện tích $S = a^2$ nhé.')).toBe('Diện tích S = a² nhé.');
    expect(latexToUnicodeMath('$$x^2 + 1$$')).toBe('x² + 1');
  });

  it('M3: phân số và căn thức đọc được bằng ngoặc thường', () => {
    expect(latexToUnicodeMath('$\\frac{1}{2}$')).toBe('1/2');
    expect(latexToUnicodeMath('$\\frac{x+1}{2}$')).toBe('(x+1)/2');
    expect(latexToUnicodeMath('$\\sqrt{x+1}$')).toBe('√(x+1)');
    expect(latexToUnicodeMath('$\\sqrt{2}$')).toBe('√2');
  });

  it('M4: căn bậc n lồng nhau vẫn đúng', () => {
    expect(latexToUnicodeMath('$\\sqrt[3]{8}$')).toBe('8^(1/3)');
    expect(latexToUnicodeMath('$\\frac{\\frac{1}{2}}{3}$')).toBe('(1/2)/3');
  });

  it('M5: chỉ số dưới, hằng số và ký hiệu so sánh', () => {
    expect(latexToUnicodeMath('$x_1 + x_2 \\leq 5$')).toBe('x₁ + x₂ ≤ 5');
    expect(latexToUnicodeMath('$\\pi \\approx 3.14$')).toBe('π ≈ 3.14');
    expect(latexToUnicodeMath('$x \\in A \\Rightarrow x \\neq 0$')).toBe('x ∈ A ⇒ x ≠ 0');
  });

  it('M6: hàm toán bỏ dấu chéo, \\text giữ nguyên chữ', () => {
    expect(latexToUnicodeMath('$\\sin x + \\cos x$')).toBe('sin x + cos x');
    expect(latexToUnicodeMath('$5\\text{cm}$')).toBe('5cm');
  });

  it('M7: mũ có bản Unicode thì dùng Unicode (đẹp hơn), không có mới dùng ^( )', () => {
    expect(latexToUnicodeMath('$x^{n+1}$')).toBe('xⁿ⁺¹');
    expect(latexToUnicodeMath('$2^{10}$')).toBe('2¹⁰');
    expect(latexToUnicodeMath('$a^{x+y}$')).toBe('aˣ⁺ʸ');
  });

  it('M8: LaTeX trần không có dấu bao vẫn được chuyển', () => {
    expect(latexToUnicodeMath('Công thức là \\frac{a}{b} nhé')).toBe('Công thức là a/b nhé');
  });

  it('M9: văn bản không có toán thì giữ nguyên, không phá câu chữ', () => {
    const plain = 'Em làm bài tốt lắm, cố gắng giữ phong độ nhé.';
    expect(latexToUnicodeMath(plain)).toBe(plain);
    expect(latexToUnicodeMath('Nhắn 0 để xem lại menu.')).toBe('Nhắn 0 để xem lại menu.');
  });

  it('M10: ký hiệu hình học và tập hợp', () => {
    expect(latexToUnicodeMath('$AB \\perp CD$, $\\triangle ABC$, $A \\cup B$')).toBe(
      'AB ⊥ CD, △ ABC, A ∪ B',
    );
  });

  it('M11: quy tắc prompt nhắc đúng điều cấm (LaTeX) và điều phải dùng (Unicode)', () => {
    expect(MATH_FORMAT_RULE).toContain('KHÔNG dùng LaTeX');
    expect(MATH_FORMAT_RULE).toContain('a³');
    expect(MATH_FORMAT_RULE).toContain('\\frac');
  });

  it('M12: không còn dấu bao hay lệnh LaTeX nào sót lại trong đầu ra', () => {
    const messy = 'Ta có \\(\\frac{a^2}{b}\\) và \\(\\sqrt{3}\\) cùng \\(x \\geq 0\\).';
    const out = latexToUnicodeMath(messy);
    expect(out).not.toContain('\\');
    expect(out).not.toContain('$');
    expect(out).toBe('Ta có a²/b và √3 cùng x ≥ 0.');
  });
});
