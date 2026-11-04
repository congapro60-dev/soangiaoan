# KẾ HOẠCH DẠY HỌC — Tiệm cận xiên (Toán 12 · Tuần 5 · Tiết 26)

| Lớp | 12 | Tên bài học | Tiệm cận xiên | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 5 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-5-26.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Nhận biết khi nào đồ thị có tiệm cận xiên và tìm nó bằng chia đa thức.
- **Should (Trọng tâm – Thông hiểu):** Tìm tiệm cận xiên của hàm phân thức và kiểm bằng giới hạn hiệu $f(x) - (ax+b)$.
- **Could (Nâng cao – Vận dụng):** Chứng minh bằng định nghĩa giới hạn; phân biệt ba loại tiệm cận theo bậc.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Chi phí sản xuất $x$ nghìn sản phẩm của xưởng in: $C(x) = \dfrac{x^2 + 2x + 3}{x + 1}$ (triệu đồng).**

- **Chia đa thức:** $C(x) = x + 1 + \dfrac{2}{x + 1}$.
- Khi $x \to +\infty$: $C(x) - (x + 1) = \dfrac{2}{x+1} \to 0$ → **tiệm cận xiên $y = x + 1$**.
- **Kiểm chứng tay:** $C(9) = 9 + 1 + \dfrac{2}{10} = 10{,}2$; đường $y = x+1$ cho $10$ → chênh 0,2. $C(99) = 100 + 0{,}02 = 100{,}02$ → chênh 0,02.
- **Tiệm cận đứng:** $x = -1$ (mẫu bằng 0, tử khác 0).
- **Vì sao không có tiệm cận ngang:** bậc tử (2) lớn hơn bậc mẫu (1) đúng 1 bậc → có tiệm cận xiên, không có ngang.

**Bẫy của bài:** nhầm $y = x + 1$ với $y = x$; chỉ lấy phần đa thức mà quên điều kiện phần dư → 0; nhầm bậc bằng nhau (tiệm cận ngang) với hơn 1 bậc (xiên).

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** C(x) = (x² + 2x + 3)/(x + 1). Khi x rất lớn, chi phí gần với đường nào?
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Để tìm tiệm cận xiên, bước đầu tiên nên làm gì?*
  - (A) Tính đạo hàm
  - (B) Chia tử cho mẫu để tách phần đa thức và phần dư
  - (C) Tính giới hạn tại x = −1
  - **Correct: (B)** — Chia đa thức cho ta dạng f(x) = ax + b + r(x) với r(x) → 0, từ đó đọc được tiệm cận xiên.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao phần dư phải tiến về 0?
  2. `[SO SÁNH]` Hàm này có tiệm cận ngang không?
- **TeacherCue (lớp yếu):** Nhắc lại phép chia đa thức bằng sơ đồ; viết f = thương + dư/mẫu.
- **LookFor:** HS nêu được ý tưởng tách phần dư.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Nhận biết khi nào đồ thị có tiệm cận xiên và tìm nó bằng chia đa thức.
- **Should:** Tìm tiệm cận xiên của hàm phân thức và kiểm bằng giới hạn hiệu $f(x) - (ax+b)$.
- **Could:** Chứng minh bằng định nghĩa giới hạn; phân biệt ba loại tiệm cận theo bậc.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khi nào một đồ thị tiến sát một đường thẳng nghiêng thay vì đường ngang?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Chia tử cho mẫu: $f(x) = ax + b + \dfrac{R(x)}{Q(x)}$ với $\deg R < \deg Q$.
- **Bước 2:** Nếu $\dfrac{R(x)}{Q(x)} \to 0$ khi $x \to \pm\infty$ thì $y = ax + b$ là tiệm cận xiên.
- **Bước 3:** Kiểm bằng định nghĩa: $\lim\limits_{x\to\infty} [f(x) - (ax+b)] = 0$.
- **Bước 4:** Phân biệt theo bậc: bậc tử = bậc mẫu → tiệm cận ngang; hơn đúng 1 bậc → xiên; hơn từ 2 bậc → không có tiệm cận xiên.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao hơn 2 bậc thì không có tiệm cận xiên?
  2. `[PHÁT HIỆN]` Hàm C(x) có tiệm cận đứng ở đâu?
- **TeacherCue (lớp yếu):** Khung 4 bước; nhắc HS yếu ghi rõ "thương" và "dư".
- **Chốt:** Tiệm cận xiên = phần đa thức bậc nhất còn lại sau khi tách phần dư tiến về 0.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI kết luận: "C(x) = (x² + 2x + 3)/(x+1) ≈ x nên tiệm cận xiên là y = x." (bỏ phần hằng số +1 của thương)."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI kết luận tiệm cận xiên của $C(x)$ là $y = x$ vì "bỏ phần $+1$ cho đơn giản".
  2. Bằng chứng: Phần đa thức sau khi chia là $x + 1$; bỏ $+1$ là sai. Kiểm: $C(x) - x = 1 + \dfrac{2}{x+1} \to 1 \ne 0$.
  3. Sửa: $y = x + 1$; kiểm $C(x) - (x+1) = \dfrac{2}{x+1} \to 0$.
- **TeacherCue:** Cho HS tính hiệu với $y = x$ để thấy tiến về 1 chứ không về 0.
- **LookFor:** HS kiểm bằng giới hạn hiệu.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "chia đa thức rồi đọc thương bậc nhất."
  - **S:** "kiểm bằng giới hạn hiệu f(x) − (ax+b)."
  - **C:** "phân biệt ba loại tiệm cận theo bậc và chứng minh bằng định nghĩa."

- **Luồng M (Must) — hint: chia đa thức rồi đọc thương bậc nhất.**
1. Khi nào đồ thị hàm phân thức có tiệm cận xiên?
   - **Đáp án:** Khi bậc của tử lớn hơn bậc của mẫu đúng 1 bậc (sau khi đã rút gọn).
2. Nêu định nghĩa tiệm cận xiên y = ax + b.
   - **Đáp án:** Đường y = ax + b là tiệm cận xiên nếu lim [f(x) − (ax + b)] = 0 khi x → +∞ (hoặc −∞).

- **Luồng S (Should) — hint: kiểm bằng giới hạn hiệu f(x) − (ax+b).**
1. Tìm tiệm cận xiên của f(x) = (x² + 1)/x.
   - **Đáp án:** f(x) = x + 1/x ⇒ tiệm cận xiên y = x; tiệm cận đứng x = 0.
2. Tìm tiệm cận xiên của f(x) = (2x² + x + 1)/(x − 1).
   - **Đáp án:** f(x) = 2x + 3 + 4/(x−1) ⇒ tiệm cận xiên y = 2x + 3.

- **Luồng C (Could) — hint: phân biệt ba loại tiệm cận theo bậc và chứng minh bằng định nghĩa.**
1. Hàm f(x) = (x³ + 1)/(x² + 1) có tiệm cận xiên không? Nếu có, tìm.
   - **Đáp án:** Chia: x³ + 1 = x(x² + 1) − x + 1 ⇒ f(x) = x + (1 − x)/(x²+1). Phần dư → 0 nên tiệm cận xiên y = x.
2. Giải thích vì sao hàm f(x) = (x³ + x)/(x) không có tiệm cận xiên mà chỉ là đường thẳng.
   - **Đáp án:** Rút gọn f(x) = x² + 1 (với x ≠ 0) — đây là parabol, không phải phân thức có bậc tử hơn mẫu đúng 1. Không tồn tại đường thẳng mà hiệu tiến về 0.

- **LookFor:** HS M chia đúng; HS S kiểm đúng; HS C phân loại đúng.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tìm tiệm cận xiên của $f(x) = \dfrac{x^2 + 1}{x}$. → $f(x) = x + \dfrac{1}{x}$ nên tiệm cận xiên là $y = x$ (vì $\tfrac1x \to 0$); tiệm cận đứng $x = 0$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Bậc tử bằng bậc mẫu thì có tiệm cận xiên" → **Sai — đó là tiệm cận ngang**
  - "f(x) − (ax+b) → 0 là định nghĩa tiệm cận xiên" → **Đúng**
  - "Hàm (x²+1)/x có tiệm cận ngang" → **Sai**
- **TeacherCue:** Chiếu 2 bài, kiểm bằng giới hạn hiệu.

- **Câu 1:** Vì sao phần dư phải tiến về 0? → Vì tiệm cận xiên đòi hỏi f(x) − (ax+b) → 0; nếu phần dư tiến về số khác 0 thì đường ax+b không phải tiệm cận.
- **Câu 2:** Hàm (x² + 2x + 3)/(x + 1) có tiệm cận ngang không? → Không, vì bậc tử lớn hơn bậc mẫu nên không có tiệm cận ngang (chỉ có xiên và đứng).
- **Chốt nhanh:** Chia đa thức — phần dư → 0 — tiệm cận xiên là thương bậc nhất.

- Chi phí trung bình mỗi sản phẩm tiến dần về đường y = x + 1 (triệu đồng cho x nghìn sản phẩm).
- Ở x = 9: chi phí 10,2 so với đường 10 — chênh 0,2; ở x = 99: chênh 0,02.
- Nhờ tiệm cận, nhà quản lý dự báo chi phí dài hạn mà không cần tính từng mức sản lượng.
- **TeacherCue:** Hỏi: "Nếu bỏ qua tiệm cận, dự báo chi phí ở x = 1000 sai bao nhiêu?" → chênh 2/1001 ≈ 0,002 triệu.

- **Exit Ticket (4 mục):**
  1. Nêu quy trình tìm tiệm cận xiên.
  2. Nêu 1 bẫy (bỏ phần hằng số; nhầm với tiệm cận ngang).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tìm tiệm cận xiên của (x² + 2x + 3)/(x + 1).
- **TeacherCue (lớp yếu):** Mở lại khung 4 bước ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Khi nào đồ thị hàm phân thức có tiệm cận xiên?
   - **Đáp án:** Khi bậc của tử lớn hơn bậc của mẫu đúng 1 bậc (sau khi đã rút gọn).
2. `[NB]` Nêu định nghĩa tiệm cận xiên y = ax + b.
   - **Đáp án:** Đường y = ax + b là tiệm cận xiên nếu lim [f(x) − (ax + b)] = 0 khi x → +∞ (hoặc −∞).
3. `[TH]` Tìm tiệm cận xiên của f(x) = (x² + 1)/x.
   - **Đáp án:** f(x) = x + 1/x ⇒ tiệm cận xiên y = x; tiệm cận đứng x = 0.
4. `[TH]` Tìm tiệm cận xiên của f(x) = (2x² + x + 1)/(x − 1).
   - **Đáp án:** f(x) = 2x + 3 + 4/(x−1) ⇒ tiệm cận xiên y = 2x + 3.
5. `[VD]` Hàm f(x) = (x³ + 1)/(x² + 1) có tiệm cận xiên không? Nếu có, tìm.
   - **Đáp án:** Chia: x³ + 1 = x(x² + 1) − x + 1 ⇒ f(x) = x + (1 − x)/(x²+1). Phần dư → 0 nên tiệm cận xiên y = x.
6. `[VD]` Giải thích vì sao hàm f(x) = (x³ + x)/(x) không có tiệm cận xiên mà chỉ là đường thẳng.
   - **Đáp án:** Rút gọn f(x) = x² + 1 (với x ≠ 0) — đây là parabol, không phải phân thức có bậc tử hơn mẫu đúng 1. Không tồn tại đường thẳng mà hiệu tiến về 0.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Bỏ phần hằng số của thương khi viết tiệm cận xiên.
- Nhầm tiệm cận xiên với tiệm cận ngang khi bậc bằng nhau.
- Không kiểm bằng giới hạn hiệu.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
