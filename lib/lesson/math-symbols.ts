/**
 * V28 Phase B1 — Bảng ký hiệu Toán cho textarea tự luận/hoạt động cộng tác.
 *
 * Mỗi chip có `insert` là chuỗi chèn thẳng vào textarea; ký tự `#` đánh dấu
 * vị trí con trỏ (caret) sau khi chèn — mọi `#` sẽ bị gỡ khỏi văn bản.
 * Chips nhóm `composed`/`inline` là LaTeX (nút hiển thị qua MathText/KaTeX);
 * các nhóm còn lại là ký tự Unicode hiển thị trực tiếp trong textarea.
 */

export type MathChipGroupId = "basics" | "sup" | "sub" | "greek" | "composed" | "inline";

export interface MathChip {
  id: string;
  /** Chuỗi chèn vào textarea; `#` = vị trí caret sau khi chèn. */
  insert: string;
  /** Nội dung hiển thị trên nút (ký tự thuần hoặc LaTeX thuần). */
  label: string;
  /** Tên tiếng Việt — tooltip/aria-label. */
  name: string;
  group: MathChipGroupId;
}

export interface MathChipGroup {
  id: MathChipGroupId;
  title: string;
}

export const MATH_CHIP_GROUPS: MathChipGroup[] = [
  { id: "inline", title: "Công thức nhanh" },
  { id: "basics", title: "Ký hiệu" },
  { id: "sup", title: "Mũ trên" },
  { id: "sub", title: "Chỉ số dưới" },
  { id: "greek", title: "Chữ Hy Lạp" },
  { id: "composed", title: "Cấu trúc" },
];

function makeChips(group: MathChipGroupId, rows: Array<[insert: string, label: string, name: string]>): MathChip[] {
  return rows.map(([insert, label, name], index) => ({ id: `${group}-${index}`, insert, label, name, group }));
}

/** 48 ký hiệu đơn dùng nhiều trong Toán THPT. */
const BASIC_CHIPS = makeChips("basics", [
  ["−", "−", "Dấu trừ"],
  ["×", "×", "Dấu nhân"],
  ["÷", "÷", "Dấu chia"],
  ["±", "±", "Cộng trừ"],
  ["∓", "∓", "Trừ cộng"],
  ["≠", "≠", "Khác"],
  ["≈", "≈", "Xấp xỉ"],
  ["≤", "≤", "Nhỏ hơn hoặc bằng"],
  ["≥", "≥", "Lớn hơn hoặc bằng"],
  ["≡", "≡", "Đồng dư"],
  ["∞", "∞", "Vô cực"],
  ["√", "√", "Căn bậc hai"],
  ["∛", "∛", "Căn bậc ba"],
  ["∑", "∑", "Tổng"],
  ["∏", "∏", "Tích"],
  ["∫", "∫", "Tích phân"],
  ["∂", "∂", "Đạo hàm riêng"],
  ["∇", "∇", "Nabla"],
  ["∈", "∈", "Thuộc"],
  ["∉", "∉", "Không thuộc"],
  ["∋", "∋", "Chứa phần tử"],
  ["⊂", "⊂", "Tập con"],
  ["⊃", "⊃", "Tập cha"],
  ["⊆", "⊆", "Tập con bằng"],
  ["⊇", "⊇", "Tập cha bằng"],
  ["∪", "∪", "Hợp"],
  ["∩", "∩", "Giao"],
  ["∅", "∅", "Tập rỗng"],
  ["∖", "∖", "Hiệu hai tập"],
  ["⇒", "⇒", "Suy ra"],
  ["⇔", "⇔", "Tương đương"],
  ["→", "→", "Mũi tên"],
  ["↔", "↔", "Hai chiều"],
  ["∀", "∀", "Với mọi"],
  ["∃", "∃", "Tồn tại"],
  ["∄", "∄", "Không tồn tại"],
  ["∥", "∥", "Song song"],
  ["⊥", "⊥", "Vuông góc"],
  ["∠", "∠", "Góc"],
  ["△", "△", "Tam giác"],
  ["□", "□", "Hình vuông"],
  ["°", "°", "Độ"],
  ["′", "′", "Phút"],
  ["″", "″", "Giây"],
  ["∴", "∴", "Do đó"],
  ["∵", "∵", "Vì"],
  ["≅", "≅", "Đồng dạng"],
  ["∼", "∼", "Tương tự"],
]);

/** 20 ký tự mũ trên (Unicode). */
const SUP_CHIPS = makeChips("sup", [
  ["⁰", "⁰", "Mũ 0"],
  ["¹", "¹", "Mũ 1"],
  ["²", "²", "Mũ 2"],
  ["³", "³", "Mũ 3"],
  ["⁴", "⁴", "Mũ 4"],
  ["⁵", "⁵", "Mũ 5"],
  ["⁶", "⁶", "Mũ 6"],
  ["⁷", "⁷", "Mũ 7"],
  ["⁸", "⁸", "Mũ 8"],
  ["⁹", "⁹", "Mũ 9"],
  ["⁺", "⁺", "Mũ cộng"],
  ["⁻", "⁻", "Mũ trừ"],
  ["⁼", "⁼", "Mũ bằng"],
  ["⁽", "⁽", "Mũ mở ngoặc"],
  ["⁾", "⁾", "Mũ đóng ngoặc"],
  ["ⁿ", "ⁿ", "Mũ n"],
  ["ⁱ", "ⁱ", "Mũ i"],
  ["ᵃ", "ᵃ", "Mũ a"],
  ["ᵇ", "ᵇ", "Mũ b"],
  ["ᵐ", "ᵐ", "Mũ m"],
]);

/** 20 ký tự chỉ số dưới (Unicode). */
const SUB_CHIPS = makeChips("sub", [
  ["₀", "₀", "Chỉ số 0"],
  ["₁", "₁", "Chỉ số 1"],
  ["₂", "₂", "Chỉ số 2"],
  ["₃", "₃", "Chỉ số 3"],
  ["₄", "₄", "Chỉ số 4"],
  ["₅", "₅", "Chỉ số 5"],
  ["₆", "₆", "Chỉ số 6"],
  ["₇", "₇", "Chỉ số 7"],
  ["₈", "₈", "Chỉ số 8"],
  ["₉", "₉", "Chỉ số 9"],
  ["₊", "₊", "Chỉ số cộng"],
  ["₋", "₋", "Chỉ số trừ"],
  ["₌", "₌", "Chỉ số bằng"],
  ["₍", "₍", "Chỉ số mở ngoặc"],
  ["₎", "₎", "Chỉ số đóng ngoặc"],
  ["ₐ", "ₐ", "Chỉ số a"],
  ["ₑ", "ₑ", "Chỉ số e"],
  ["ₒ", "ₒ", "Chỉ số o"],
  ["ₓ", "ₓ", "Chỉ số x"],
  ["ₙ", "ₙ", "Chỉ số n"],
]);

/** 13 chữ Hy Lạp phổ biến. */
const GREEK_CHIPS = makeChips("greek", [
  ["α", "α", "alpha"],
  ["β", "β", "beta"],
  ["γ", "γ", "gamma"],
  ["δ", "δ", "delta"],
  ["ε", "ε", "epsilon"],
  ["θ", "θ", "theta"],
  ["λ", "λ", "lambda"],
  ["μ", "μ", "mu"],
  ["π", "π", "pi"],
  ["ρ", "ρ", "rho"],
  ["σ", "σ", "sigma"],
  ["φ", "φ", "phi"],
  ["ω", "ω", "omega"],
]);

/** 25 cấu trúc LaTeX ghép (chèn kèm $...$ để MathText render). */
const COMPOSED_CHIPS = makeChips("composed", [
  ["$\\frac{#}{#}$", "\\frac{□}{□}", "Phân số"],
  ["$\\dfrac{#}{#}$", "\\dfrac{□}{□}", "Phân số lớn"],
  ["$\\sqrt{#}$", "\\sqrt{□}", "Căn bậc hai (LaTeX)"],
  ["$\\sqrt[3]{#}$", "\\sqrt[3]{□}", "Căn bậc ba (LaTeX)"],
  ["$x^{#}$", "x^{□}", "Lũy thừa"],
  ["$x_{#}$", "x_{□}", "Chỉ số dưới (LaTeX)"],
  ["$\\left| # \\right|$", "\\left|□\\right|", "Giá trị tuyệt đối"],
  ["$\\vec{#}$", "\\vec{□}", "Vector"],
  ["$\\overline{#}$", "\\overline{□}", "Đoạn thẳng / bao trùm"],
  ["$\\underline{#}$", "\\underline{□}", "Gạch dưới"],
  ["$\\hat{#}$", "\\hat{□}", "Mũ phủ"],
  ["$\\bar{#}$", "\\bar{□}", "Thanh ngang"],
  ["$\\dot{#}$", "\\dot{□}", "Chấm trên"],
  ["$\\mathbf{#}$", "\\mathbf{□}", "Chữ đậm"],
  ["$\\text{#}$", "\\text{□}", "Chữ trong công thức"],
  ["$\\binom{#}{#}$", "\\binom{□}{□}", "Tổ hợp"],
  ["$$\\frac{#}{#}$$", "\\dfrac{□}{□}", "Phân số giữa dòng"],
  ["$\\lim_{#}$", "\\lim_{□}", "Giới hạn"],
  ["$\\sum_{#}$", "\\sum_{□}", "Tổng có cận"],
  ["$\\int_{#}$", "\\int_{□}", "Tích phân có cận"],
  ["$#^{\\circ}$", "□^{\\circ}", "Độ (LaTeX)"],
  ["$#'$", "□^{\\prime}", "Phút / dấu phẩy trên"],
  ["$\\dfrac{d#}{dx}$", "\\dfrac{d□}{dx}", "Đạo hàm theo x"],
  ["$\\begin{pmatrix}# & #\\\\ # & #\\end{pmatrix}$", "\\begin{pmatrix}□&□\\\\□&□\\end{pmatrix}", "Ma trận 2×2"],
  ["$\\begin{cases}# \\\\ #\\end{cases}$", "\\begin{cases}□\\\\□\\end{cases}", "Hệ phương trình"],
]);

/** 14 chip nhanh hiển thị ngay trên toolbar. */
export const QUICK_CHIPS: MathChip[] = makeChips("inline", [
  ["$x^{2}$", "x^{2}", "x bình phương"],
  ["$x^{#}$", "x^{n}", "Lũy thừa n"],
  ["$x_{#}$", "x_{n}", "Chỉ số dưới"],
  ["$\\frac{#}{#}$", "\\frac{a}{b}", "Phân số"],
  ["$\\sqrt{#}$", "\\sqrt{x}", "Căn bậc hai"],
  ["$\\left| # \\right|$", "\\left|x\\right|", "Giá trị tuyệt đối"],
  ["$\\vec{#}$", "\\vec{x}", "Vector"],
  ["$\\angle$", "\\angle", "Góc (LaTeX)"],
  ["$\\perp$", "\\perp", "Vuông góc (LaTeX)"],
  ["$\\parallel$", "\\parallel", "Song song (LaTeX)"],
  ["$\\triangle$", "\\triangle", "Tam giác (LaTeX)"],
  ["$\\pi$", "\\pi", "Số pi"],
  ["$\\infty$", "\\infty", "Vô cực"],
  ["$\\dfrac{1}{2}$", "\\dfrac{1}{2}", "Một phần hai"],
]);

export const MATH_CHIPS: MathChip[] = [
  ...QUICK_CHIPS,
  ...BASIC_CHIPS,
  ...SUP_CHIPS,
  ...SUB_CHIPS,
  ...GREEK_CHIPS,
  ...COMPOSED_CHIPS,
];

export function chipsByGroup(group: MathChipGroupId): MathChip[] {
  return MATH_CHIPS.filter((chip) => chip.group === group);
}

/**
 * Gỡ placeholder `#` khỏi chuỗi chèn và trả về vị trí đặt caret
 * (vị trí của `#` đầu tiên; nếu không có `#` thì caret nằm sau chuỗi).
 */
export function expandChipInsert(insert: string): { text: string; caretOffset: number } {
  const first = insert.indexOf("#");
  const text = insert.split("#").join("");
  return { text, caretOffset: first === -1 ? text.length : first };
}
