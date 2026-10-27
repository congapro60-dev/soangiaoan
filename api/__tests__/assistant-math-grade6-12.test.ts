import { describe, expect, it } from 'vitest';
import { latexToUnicodeMath } from '../_assistant-math-text.js';

/**
 * Bộ test theo CHƯƠNG TRÌNH TOÁN 6–12 (GDPT 2018).
 * Mỗi lớp lấy đúng dạng công thức HS thật sự gặp, viết theo kiểu model hay sinh ra
 * (\frac, \sqrt, ^, \vec, \angle, hệ phương trình...). Mục tiêu: HS đọc được trên Zalo,
 * không còn ký tự LaTeX thô nào.
 */
const clean = (s: string) => latexToUnicodeMath(s);

/** Không còn dấu hiệu LaTeX nào sót. Ngoặc nhọn của hệ phương trình là hợp lệ. */
const expectNoLatex = (out: string) => {
  expect(out).not.toMatch(/\\[A-Za-z]+/);
  expect(out).not.toContain('$');
  expect(out).not.toMatch(/\\[()[\]]/);
  expect(out).not.toContain('\\{');
  expect(out).not.toContain('\\}');
};

describe('Toán 6 — phân số, số thập phân, phần trăm', () => {
  it('6A: cộng trừ phân số', () => {
    const out = clean('$\\frac{1}{2} + \\frac{2}{3} = \\frac{7}{6}$');
    expect(out).toBe('1/2 + 2/3 = 7/6');
    expectNoLatex(out);
  });

  it('6B: hỗn số và phép chia phân số', () => {
    const out = clean('$\\frac{3}{4} : \\frac{2}{5} = \\frac{15}{8}$');
    expect(out).toBe('3/4 : 2/5 = 15/8');
    expectNoLatex(out);
  });

  it('6C: phần trăm và số thập phân', () => {
    const out = clean('15% của 240 là $240 \\cdot \\frac{15}{100} = 36$.');
    expect(out).toContain('240 · 15/100 = 36');
    expectNoLatex(out);
  });

  it('6D: ước chung, bội chung', () => {
    const out = clean('ƯCLN(12, 18) = 6, BCNN(12, 18) = 36.');
    expect(out).toBe('ƯCLN(12, 18) = 6, BCNN(12, 18) = 36.');
  });
});

describe('Toán 7 — số hữu tỉ, tỉ lệ, tam giác', () => {
  it('7A: lũy thừa số hữu tỉ âm', () => {
    const out = clean('$\\left(\\frac{-1}{2}\\right)^3 = \\frac{-1}{8}$');
    expect(out).toBe('(-1/2)³ = -1/8');
    expectNoLatex(out);
  });

  it('7B: căn bậc hai', () => {
    expect(clean('$\\sqrt{16} = 4$, $\\sqrt{2} \\approx 1.414$')).toBe('√16 = 4, √2 ≈ 1.414');
  });

  it('7C: tổng ba góc tam giác', () => {
    const out = clean('Trong $\\triangle ABC$: $\\angle A + \\angle B + \\angle C = 180^\\circ$');
    expect(out).toBe('Trong △ ABC: ∠ A + ∠ B + ∠ C = 180°');
    expectNoLatex(out);
  });

  it('7D: hai góc đối đỉnh, song song', () => {
    const out = clean('Nếu $a \\parallel b$ thì hai góc so le trong bằng nhau.');
    expect(out).toContain('a ∥ b');
    expectNoLatex(out);
  });
});

describe('Toán 8 — hằng đẳng thức, tứ giác, hình chóp', () => {
  it('8A: bảy hằng đẳng thức đáng nhớ', () => {
    expect(clean('$(a+b)^2 = a^2 + 2ab + b^2$')).toBe('(a+b)² = a² + 2ab + b²');
    expect(clean('$a^2 - b^2 = (a-b)(a+b)$')).toBe('a² - b² = (a-b)(a+b)');
    expect(clean('$(a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3$')).toBe(
      '(a+b)³ = a³ + 3a²b + 3ab² + b³',
    );
  });

  it('8B: phân tích đa thức thành nhân tử', () => {
    const out = clean('$x^2 - 5x + 6 = (x-2)(x-3)$');
    expect(out).toBe('x² - 5x + 6 = (x-2)(x-3)');
    expectNoLatex(out);
  });

  it('8C: thể tích hình chóp, lăng trụ', () => {
    expect(clean('$V = \\frac{1}{3} S h$')).toBe('V = 1/3 S h');
    expect(clean('$V = S_{\\text{đáy}} \\cdot h$')).toBe('V = S_đáy · h');
  });
});

describe('Toán 9 — căn thức, hàm số, đường tròn', () => {
  it('9A: rút gọn căn thức', () => {
    const out = clean('$\\sqrt{50} = \\sqrt{25 \\cdot 2} = 5\\sqrt{2}$');
    expect(out).toBe('√50 = √(25 · 2) = 5√2');
    expectNoLatex(out);
  });

  it('9B: hệ thức lượng trong tam giác vuông', () => {
    const out = clean('$AB^2 = BH \\cdot BC$, $\\sin C = \\frac{AB}{BC}$');
    expect(out).toBe('AB² = BH · BC, sin C = AB/BC');
    expectNoLatex(out);
  });

  it('9C: phương trình bậc hai và delta', () => {
    const out = clean('$\\Delta = b^2 - 4ac$; nếu $\\Delta > 0$ thì có 2 nghiệm phân biệt.');
    expect(out).toBe('Δ = b² - 4ac; nếu Δ > 0 thì có 2 nghiệm phân biệt.');
    expectNoLatex(out);
  });

  it('9D: công thức nghiệm', () => {
    const out = clean('$x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$');
    expect(out).toBe('x_(1,2) = (-b ± √Δ)/2a');
    expectNoLatex(out);
  });
});

describe('Toán 10 — vectơ, tích vô hướng, lượng giác', () => {
  it('10A: vectơ có mũi tên', () => {
    const out = clean('$\\vec{AB} + \\vec{BC} = \\vec{AC}$');
    expect(out).toBe('AB→ + BC→ = AC→');
    expectNoLatex(out);
  });

  it('10B: độ dài vectơ và toạ độ', () => {
    const out = clean('$\\vec{u} = (2; -3)$, $|\\vec{u}| = \\sqrt{2^2 + (-3)^2} = \\sqrt{13}$');
    expect(out).toBe('u→ = (2; -3), |u→| = √(2² + (-3)²) = √13');
    expectNoLatex(out);
  });

  it('10C: tích vô hướng và góc giữa hai vectơ', () => {
    const out = clean('$\\cos(\\vec{a}, \\vec{b}) = \\frac{\\vec{a} \\cdot \\vec{b}}{|\\vec{a}| |\\vec{b}|}$');
    expect(out).toBe('cos(a→, b→) = (a→ · b→)/(|a→| |b→|)');
    expectNoLatex(out);
  });

  it('10D: công thức lượng giác cơ bản', () => {
    const out = clean('$\\sin^2 x + \\cos^2 x = 1$');
    expect(out).toBe('sin² x + cos² x = 1');
    expectNoLatex(out);
  });
});

describe('Toán 11 — lượng giác, dãy số, xác suất, không gian', () => {
  it('11A: phương trình lượng giác', () => {
    const out = clean('$\\sin x = \\frac{1}{2} \\Leftrightarrow x = \\frac{\\pi}{6} + k2\\pi$');
    expect(out).toContain('sin x = 1/2 ⇔ x = π/6 + k2π');
    expectNoLatex(out);
  });

  it('11B: cấp số cộng, cấp số nhân', () => {
    expect(clean('$u_n = u_1 + (n-1)d$')).toBe('uₙ = u₁ + (n-1)d');
    expect(clean('$S_n = \\frac{n(u_1 + u_n)}{2}$')).toBe('Sₙ = n(u₁ + uₙ)/2');
  });

  it('11C: tổ hợp, chỉnh hợp, xác suất', () => {
    const out = clean('$C_n^k = \\frac{n!}{k!(n-k)!}$, $P(A) = \\frac{n(A)}{n(\\Omega)}$');
    expect(out).toContain('Cₙᵏ = n!/k!(n-k)!');
    expect(out).toContain('P(A) = n(A)/n(Ω)');
    expectNoLatex(out);
  });

  it('11D: hệ phương trình (cases) không để lại rác', () => {
    const out = clean('$\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}$');
    expect(out).toBe('{ 2x + y = 5; x - y = 1');
    expect(out).not.toContain('begin');
    expect(out).not.toContain('end{cases}');
    expectNoLatex(out);
  });

  it('11E: vectơ trong không gian', () => {
    const out = clean('$\\vec{AB} \\cdot \\vec{CD} = 0 \\Leftrightarrow AB \\perp CD$');
    expect(out).toBe('AB→ · CD→ = 0 ⇔ AB ⊥ CD');
    expectNoLatex(out);
  });

  it('11F: góc giữa đường thẳng và mặt phẳng', () => {
    const out = clean('Góc giữa $d$ và $(P)$ là $\\alpha$, $0^\\circ \\le \\alpha \\le 90^\\circ$.');
    expect(out).toContain('0° ≤ α ≤ 90°');
    expectNoLatex(out);
  });
});

describe('Toán 12 — đạo hàm, tích phân, mũ logarit, hình học Oxyz', () => {
  it('12A: đạo hàm', () => {
    expect(clean("$y' = 3x^2 - 2x + 1$")).toBe("y' = 3x² - 2x + 1");
    expect(clean("$y = \\frac{x+1}{x-2} \\Rightarrow y' = \\frac{-3}{(x-2)^2}$")).toBe(
      "y = (x+1)/(x-2) ⇒ y' = -3/(x-2)²",
    );
  });

  it('12B: nguyên hàm, tích phân', () => {
    const out = clean('$\\int x^2 dx = \\frac{x^3}{3} + C$');
    expect(out).toBe('∫ x² dx = x³/3 + C');
    expectNoLatex(out);
  });

  it('12C: mũ và logarit', () => {
    const out = clean('$\\log_a(bc) = \\log_a b + \\log_a c$, $a > 0, a \\neq 1$');
    expect(out).toBe('logₐ(bc) = logₐ b + logₐ c, a > 0, a ≠ 1');
    expectNoLatex(out);
  });

  it('12D: toạ độ trong không gian Oxyz', () => {
    const out = clean('$\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A)$');
    expect(out).toBe('AB→ = (x_B - x_A; y_B - y_A; z_B - z_A)');
    expectNoLatex(out);
  });

  it('12E: phương trình mặt phẳng', () => {
    const out = clean('$(P): ax + by + cz + d = 0$ với $a^2 + b^2 + c^2 \\neq 0$');
    expect(out).toBe('(P): ax + by + cz + d = 0 với a² + b² + c² ≠ 0');
    expectNoLatex(out);
  });

  it('12F: khoảng cách từ điểm đến mặt phẳng', () => {
    const out = clean('$d(M, (P)) = \\frac{|ax_0 + by_0 + cz_0 + d|}{\\sqrt{a^2+b^2+c^2}}$');
    expect(out).toBe('d(M, (P)) = |ax₀ + by₀ + cz₀ + d|/√(a²+b²+c²)');
    expectNoLatex(out);
  });
});

describe('Câu văn trộn công thức — không được phá chữ Việt', () => {
  it('V1: câu giải thích có công thức xen giữa', () => {
    const out = clean(
      'Em áp dụng công thức $S = \\frac{1}{2} a h$ với $a$ là đáy, $h$ là chiều cao nhé.',
    );
    expect(out).toBe('Em áp dụng công thức S = 1/2 a h với a là đáy, h là chiều cao nhé.');
    expectNoLatex(out);
  });

  it('V2: dấu tiếng Việt còn nguyên vẹn', () => {
    const out = clean('Đường tròn ngoại tiếp tam giác vuông có tâm là trung điểm cạnh huyền.');
    expect(out).toBe('Đường tròn ngoại tiếp tam giác vuông có tâm là trung điểm cạnh huyền.');
  });

  it('V3: nhiều công thức liên tiếp, không dính chữ', () => {
    const out = clean('$a^2$, $b^2$, $c^2$ là ba cạnh góc vuông.');
    expect(out).toBe('a², b², c² là ba cạnh góc vuông.');
    expectNoLatex(out);
  });
});
