# V28 — Bảng chọn ký hiệu & cấu trúc Toán cho HS (đầy đủ chương trình cấp 2 + cấp 3)

> Yêu cầu của user 24/10/2026: HS không thể gõ các ký hiệu/cấu trúc Toán bằng bàn phím thường/điện thoại (`∠ ⊥ ∥ ∈ ⊂ logₐ lim(x→+∞) ∫ₐᵇ Cₙᵏ …` đều không có trên keyboard) → phải có **bảng chọn ký hiệu** chèn thẳng vào ô trả lời. Không được để HS "bế tắc vì không gõ được" — đây là yêu cầu cứng.
> **Đã chốt 24/10**: gộp vào lô v28 (cùng ảnh trong đề, 2 hoạt động tập thể, AI chấm, keypad decimal_4) — deploy một lần sau khi QA v27 đóng.

## 0. Nguyên tắc chọn cách đưa vào (chốt thiết kế)

1. **Chèn Unicode tuyến tính** — ký tự thật (`∠ ⊥ √ ² ⁿ ∫ ∞ …`) hoặc chuỗi ghép (`AB→`, `lim(x→+∞)`, `Cₙᵏ`) đặt tại vị trí con trỏ trong textarea. Không bắt HS gõ/biết LaTeX (`\frac{a}{b}` v.v.). Chuỗi thuần Unicode → GV đọc ngay, **AI chấm đọc ngay** (máy chấm nhận answer thô), không cần renderer mới.
2. **2 tầng UI**: (a) 1 hàng chip "thường dùng" nằm ngay trên textarea ô trả lời tự luận (lớp 6–12 dùng chung, ≤ 14 chip, wrap 2 dòng ở 375px); (b) nút **"√x Bảng ký hiệu"** mở sheet di động với các nhóm đầy đủ (tab/grid), chip ≥ 44px, sheet giữ mở để chèn nhiều lần.
3. **Khối ghép có vị trí con trỏ**: chuỗi chèn có ký tự `#` đánh dấu chỗ HS gõ tiếp — chèn xong caret nhảy tới `#` (VD  `|#|`, `lim(x→#)`, `∫ₐᵇ #dx`, `Cₙᵏ`...). Nếu chuỗi không có `#` thì caret về cuối phần chèn.
4. Chỉ áp cho **textarea tự luận / câu hỏi phản tư / cộng tác nhóm**. Ô trả lời ngắn `short_answer_4` (4 ô số + dấu `,`) và MC/TF không đổi.
5. Danh sách ký hiệu là const trong `lib/lesson/math-symbols.ts` — KHÔNG thêm trường cấu hình catalogue/authored trong v28 (cân nhắc `task.mathSymbols` khi có yêu cầu môn ngoài Toán, VD Hóa `→ ↑ ↓`).

## 1. Bảng tra cứu ký hiệu theo chương trình (CT GDPT 2018, lớp 6→12)

### 1a. Số học – tập hợp (lớp 6–9)
| Ký hiệu | Tên | Cấp | Chip |
|---|---|---|---|
| ∈ ∉ | thuộc / không thuộc | 6 | đơn |
| ⊂ ⊃ ∖ | tập con / chứa / hiệu hai tập | 6 | đơn |
| ∪ ∩ | hợp, giao | 6 | đơn |
| ∅ | tập rỗng | 6 | đơn |
| ℕ ℤ ℚ ℝ ℂ | tập số (ℂ lớp 12 — số phức) | 6/12 | đơn |
| ≠ ≤ ≥ ≈ < > | so sánh | 6 | đơn |
| + − × ÷ ± ⋅ | phép tính | 6 | đơn |
| a/b | phân số | 6 | gõ `/`, chip không cần |
| x², x³, xⁿ, aˣ | lũy thừa | 6–12 | chỉ số trên |
| √ ∛ ⁿ√( ) | căn bậc 2/3/n | 6–9 | đơn + khối ghép `√(#)` `ⁿ√(#)` |
| \|x\| | giá trị tuyệt đối | 7 | khối ghép `\|#\|` |
| log, ln, logₐ, aˣ | logarit (12) | 12 | đơn + ghép `logₐ(#)` |
| e | số e | 12 | gõ e |

### 1b. Hình học phẳng – không gian (lớp 6–12)
| Ký hiệu | Tên | Cấp | Chip |
|---|---|---|---|
| ∠ABC | góc | 7 | đơn `∠` (HS gõ tiếp chữ) |
| ⊥ ∥ | vuông góc, song song | 7/8 | đơn |
| ∽ ∼ ≅ | đồng dạng / bằng nhau | 8 | đơn (đưa cả ∽ và ∼) |
| Δ | tam giác (ΔABC) | 7 | đơn |
| ° ′ ″ | độ, phút, giây (góc) | 7 | đơn |
| π, ⊙, R, r, d | đường tròn | 9 | đơn π, ⊙ |
| (AB), [AB], [AB) | đường thẳng, đoạn, tia | 6 | chips `( )` `[ ]` HS gõ tiếp chữ |
| (α) (SBC) | mặt phẳng (11) | 11 | gõ bằng `( )` + greek |
| AB→ (vectơ AB) | vectơ | 10 | ghép `AB→`; chip `→` |
| \|AB\| \|a→\| | độ dài vectơ/đoạn | 10 | ghép |
| V S h a b c | thể tích, diện tích, độ cao… | 6–12 | gõ chữ thường |

### 1c. Đại số – hàm – lượng giác (lớp 9–12)
| Ký hiệu | Tên | Cấp | Chip |
|---|---|---|---|
| f(x), f: A→B, y = ax + b | hàm số | 9–10 | `→` |
| sin cos tan cot | lượng giác | 10 | gõ chữ |
| α β γ θ φ ω λ δ ε μ | Hy Lạp | 10–12 | đơn |
| sin²x, cos²x | bình phương lượng giác | 10 | compose `sin` + chip `²` |
| arcsin arccos arctan | ngược lượng giác (12) | 12 | gõ chữ |
| ĐKS: khoảng/đoạn | ( ; ) [ ; ] ( ; ] [ ; ) | 10 | ghép 4 chip |

### 1d. Giới hạn – đạo hàm – tích phân (lớp 11–12)
| Ký hiệu | Tên | Cấp | Chip |
|---|---|---|---|
| lim(x→+∞), lim(x→−∞), lim(x→0⁺) | giới hạn | 12 | khối ghép có sẵn + chip `x→0⁻`… |
| y′, f′(x), y″, f″ | đạo hàm | 11 | chip `′` `″` + ghép `y′` `f′(#)` |
| (x)₀, x₀, uₙ | chỉ số dưới (dãy số) | 11–12 | chỉ số dưới |
| ∫, ∫ₐᵇ f(x)dx | tích phân | 12 | chip `∫` + ghép `∫ₐᵇ #dx` |
| F(x) | nguyên hàm | 12 | gõ chữ |
| ∞ | vô cực | 12 | đơn |

### 1e. Tổ hợp – xác suất – logic (lớp 10–11)
| Ký hiệu | Tên | Cấp | Chip |
|---|---|---|---|
| n! | giai thừa | 11 | đơn `!` (gõ được) — không chip |
| Cₙᵏ, Aₙᵏ | tổ hợp / chỉnh hợp | 11 | ghép |
| P(A), Ā | xác suất, biến cố đối | 11 | ghép `P(#)` + đơn `Ā` |
| Ω | không gian mẫu | 11 | đơn |
| ⇒ ⇔ ∀ ∃ ¬ | mệnh đề, suy ra, phủ định | 10 | đơn |

## 2. Danh sách chip cuối cùng (const `lib/lesson/math-symbols.ts`)

### 2a. Nhóm inline "thường dùng" (hàng ngay trên textarea, ≤ 14)
`√( )` `²` `³` `ⁿ` `≤` `≥` `≠` `∠` `⊥` `∥` `∈` `⇒` `→` `π` — cố định cho mọi khối; không tùy lesson (đơn giản, đủ 80% nhu cầu).

### 2b. Sheet "Bảng ký hiệu" — các nhóm tab
1. **Ký hiệu đơn** (48): `< > ≠ ≈ ≤ ≥ ± × ÷ ⋅ ° ∈ ∉ ⊂ ⊃ ∪ ∩ ∅ ∖ ℕ ℤ ℚ ℝ ℂ Δ ∠ ⊥ ∥ ∽ ∼ ≅ ⊙ π Ω ¬ ⇒ ⇔ ∀ ∃ → ∞ ∫ ′ ″ √ ∛ Ā`
2. **Chỉ số trên** (20): `⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁺ ⁻ ⁿ ⁱ ˣ ᵏ ᵐ ᵇ ᵃ ᵗ`
3. **Chỉ số dưới** (20): `₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ₊ ₋ ₐ ₑ ₒ ₓ ₖ ₙ ₘ ₜ`
4. **Hy Lạp** (13): `α β γ θ φ ω λ δ ε μ ρ σ τ`
5. **Khối ghép** (25; chèn 1 phát, `#` = vị trí caret nhảy tới sau khi chèn): `√(#)` `ⁿ√(#)` `|#|` `logₐ(#)` `lim(x→+∞)#` `lim(x→−∞)#` `lim(x→#)` `x→+∞` `x→−∞` `x→0⁺` `x→0⁻` `y′` `y″` `f′(#)` `∫ₐᵇ #dx` `Cₙᵏ` `Aₙᵏ` `P(#)` `|AB|` `AB→` `( ; )` `[ ; ]` `( ; ]` `[ ; )` `sin(θ)`
→ Tổng 126 mục trong sheet (`!` và `%` HS gõ được bằng bàn phím nên không đặt chip); mọi mục là chuỗi const → an toàn XSS.

## 3. Việc cần làm

1. `lib/lesson/math-symbols.ts` — const 5 nhóm ở mục 2 (+ type `MathChip { label, insert }`); test chặn trùng lặp/chuỗi rỗng.
2. `TaskInput.tsx` — thêm `ref` cho 3 textarea (tự luận `:1034`, cộng tác nhóm `:476`, (không áp cho short answer)): hàng inline chip + nút mở sheet; chèn tại `selectionStart/End`, trả focus về textarea, caret tới `#`.
3. Sheet component mới `components/lesson/MathSymbolSheet.tsx` (mobile-first, tabs ngang, grid 44px, giữ mở khi chèn).
4. CSS: chip wrap; ở 375px hàng inline không tràn (nếu tràn → scroll ngang).
5. **`v28-cham-bai-ai.md` bổ sung**: prompt máy chấm thêm một dòng giải nghĩa quy ước tuyến tính (`AB→` = vectơ AB, `(SBC)` = mặt phẳng, `lim(x→+∞)`, `Cₙᵏ`, `∫ₐᵇ`, `√( )`, `x²`…) để AI hiểu bài làm HS chữ thẳng.
6. Verify: `npm run build` sạch; test đơn vị (chèn giữa chuỗi, caret đúng, không mất focus); QA bot phòng QA: mở task open → bấm 3 chip (1 đơn 1 trên/dưới 1 ghép) → answer trên server chứa đúng chuỗi; xem 375px không vỡ layout.

## 4. Ràng buộc

- KHÔNG render KaTeX cho bài làm HS trong v28 (MathText có sẵn ở `LearningEvidencePanel` — cân nhắc bật cho phần *hiển thị* bài chấm ở lớp sau; KHÔNG đụng lib/exam/**).
- KHÔNG thêm trình soạn công thức/LaTeX/Desmos — dụng cụ câu hỏi Desmos/Vẽ tay nằm ở mục 23/10 của kế hoạch chính.
- Không đổi schema bài học/graded answer — ký hiệu chỉ nằm trong answer string.

## 5. Cross-ref

- `v28-hinh-anh-goi-y-va-de-bai.md`, `v28-hoat-dong-tap-the.md`, `v28-cham-bai-ai.md`, `v28-bang-ky-hieu-toan.md` (file này).
- Keypad `decimal_4` không render phía HS — checklist v27 finding (`serialize.js:67`) — sửa cùng nhánh v28.
