# KẾ HOẠCH DẠY HỌC — Khảo sát hàm phân thức bậc hai trên bậc nhất (Toán 12 · Tuần 6 · Tiết 36)

| Lớp | 12 | Tên bài học | Khảo sát hàm phân thức bậc hai trên bậc nhất | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-6-36.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Chia đa thức, tìm tiệm cận xiên và tiệm cận đứng.
- **Should (Trọng tâm – Thông hiểu):** Tính đạo hàm, tìm hai cực trị và lập bảng biến thiên.
- **Could (Nâng cao – Vận dụng):** Biện luận theo tham số; giải thích ý nghĩa chi phí trung bình dài hạn.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Chi phí trung bình mỗi sản phẩm: $y = \dfrac{x^2 - 2x + 3}{x - 1}$ (triệu đồng), $x$ là số nghìn sản phẩm.**

- **Chia đa thức:** $y = x - 1 + \dfrac{2}{x - 1}$.
- **Tiệm cận:** đứng $x = 1$; **xiên** $y = x - 1$.
- **Đạo hàm:** $y' = 1 - \dfrac{2}{(x-1)^2} = \dfrac{(x-1)^2 - 2}{(x-1)^2}$; $y' = 0 \Leftrightarrow x = 1 \pm \sqrt2$.
  - $x = 1 + \sqrt2 \approx 2{,}41$: $y = \sqrt2 + \sqrt2 = 2\sqrt2 \approx 2{,}83$ → **cực tiểu**.
  - $x = 1 - \sqrt2 \approx -0{,}41$: $y = -2\sqrt2 \approx -2{,}83$ → **cực đại**.
- **Kiểm chứng tay:** $y(2) = (4 - 4 + 3)/1 = 3$; $y(3) = (9 - 6 + 3)/2 = 3$; $y(11) = (121 - 22 + 3)/10 = 10{,}2$ — tiến sát đường $y = x - 1$ (cho $10$).

**Bẫy của bài:** quên tiệm cận xiên (chỉ tìm đứng/ngang); tính sai đạo hàm; nhầm cực đại/cực tiểu do dấu $y'$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** y = (x² − 2x + 3)/(x − 1). Cần biết hình dạng và điểm thấp nhất.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Tiệm cận xiên của hàm này là đường nào?*
  - (A) y = x
  - (B) y = x − 1
  - (C) y = x + 1
  - **Correct: (B)** — Chia: y = x − 1 + 2/(x−1); phần dư 2/(x−1) → 0 nên tiệm cận xiên là y = x − 1.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Đạo hàm bằng 0 tại đâu?
  2. `[SO SÁNH]` Vì sao có hai cực trị?
- **TeacherCue (lớp yếu):** Thực hiện phép chia ngay trên bảng; HS đối chiếu thương và dư.
- **LookFor:** HS viết đúng dạng thương + dư.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Chia đa thức, tìm tiệm cận xiên và tiệm cận đứng.
- **Should:** Tính đạo hàm, tìm hai cực trị và lập bảng biến thiên.
- **Could:** Biện luận theo tham số; giải thích ý nghĩa chi phí trung bình dài hạn.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao hàm bậc hai/bậc nhất luôn có tiệm cận xiên và có thể có hai cực trị?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Tập xác định: mẫu $\ne 0$.
- **Bước 2:** Chia đa thức: $y = (mx + n) + \dfrac{R}{cx+d}$ → tiệm cận xiên $y = mx + n$ (nếu $R \ne 0$).
- **Bước 3:** Đạo hàm, giải $y' = 0$ → hai cực trị (nếu có).
- **Bước 4:** Bảng biến thiên, giao trục, vẽ đồ thị (đối xứng qua giao hai tiệm cận).
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao tiệm cận xiên là phần đa thức sau khi chia?
  2. `[PHÁT HIỆN]` Cực tiểu có tọa độ bao nhiêu?
- **TeacherCue (lớp yếu):** Khung 4 bước; nhấn: "bậc hai/bậc nhất → luôn có tiệm cận xiên".
- **Chốt:** Chia đa thức cho tiệm cận xiên; đạo hàm cho hai cực trị.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI giải: "y′ = 1 − 2/(x−1)² = 0 ⇒ (x−1)² = 2 ⇒ x = 1 + √2. Vậy hàm có một cực trị.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI kết luận hàm chỉ có một cực trị vì $y' = 0$ "chỉ có một nghiệm".
  2. Bằng chứng: $y' = 0 \Leftrightarrow (x-1)^2 = 2 \Leftrightarrow x = 1 \pm \sqrt2$ — hai nghiệm, nên có hai cực trị.
  3. Sửa: Hai cực trị tại $x = 1 \pm \sqrt2$, giá trị $\pm 2\sqrt2$.
- **TeacherCue:** Cho HS giải phương trình bậc hai $(x-1)^2 = 2$ cẩn thận.
- **LookFor:** HS nhớ hai nghiệm khi bình phương bằng số dương.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "chia đa thức trước, rồi đạo hàm."
  - **S:** "tìm hai cực trị và lập bảng."
  - **C:** "biện luận theo tham số và giải thích ý nghĩa."

- **Luồng M (Must) — hint: chia đa thức trước, rồi đạo hàm.**
1. Nêu cách tìm tiệm cận xiên của hàm bậc hai/bậc nhất.
   - **Đáp án:** Chia tử cho mẫu để được dạng mx + n + R/(cx+d); tiệm cận xiên là y = mx + n.
2. Tìm tiệm cận đứng của y = (x²−2x+3)/(x−1).
   - **Đáp án:** x = 1.

- **Luồng S (Should) — hint: tìm hai cực trị và lập bảng.**
1. Tính y′ của y = (x²−2x+3)/(x−1).
   - **Đáp án:** y′ = 1 − 2/(x−1)².
2. Tìm cực trị của y = (x²−2x+3)/(x−1).
   - **Đáp án:** x = 1 ± √2; cực tiểu tại 1 + √2 (y = 2√2), cực đại tại 1 − √2 (y = −2√2).

- **Luồng C (Could) — hint: biện luận theo tham số và giải thích ý nghĩa.**
1. Khảo sát tiệm cận và cực trị của y = (x² + x − 1)/(x + 2).
   - **Đáp án:** y = x − 1 + 1/(x+2) ⇒ tiệm cận xiên y = x − 1; đứng x = −2. y′ = 1 − 1/(x+2)² = 0 ⇔ x = −1 hoặc x = −3.
2. Giải thích vì sao hàm bậc hai/bậc nhất không có tiệm cận ngang.
   - **Đáp án:** Vì bậc tử lớn hơn bậc mẫu đúng 1 bậc; khi x → ∞, y tiến theo đường thẳng mx + n chứ không tiến tới hằng số.

- **LookFor:** HS M đúng tiệm cận xiên; HS S đủ cực trị; HS C biện luận được.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tìm tiệm cận và cực trị của $y = \dfrac{x^2 + x - 1}{x + 2}$. → Chia: $y = x - 1 + \dfrac{1}{x+2}$ ⇒ tiệm cận xiên $y = x - 1$; tiệm cận đứng $x = -2$. $y' = 1 - \dfrac{1}{(x+2)^2} = 0 \Leftrightarrow (x+2)^2 = 1 \Leftrightarrow x = -1$ hoặc $x = -3$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Bậc hai/bậc nhất luôn có tiệm cận xiên" → **Đúng (khi phần dư khác 0)**
  - "y′ = 0 có thể có hai nghiệm" → **Đúng**
  - "Hàm này có tiệm cận ngang" → **Sai**
- **TeacherCue:** Chấm chéo phép chia và đạo hàm.

- **Câu 1:** Vì sao phải chia đa thức trước khi khảo sát? → Để tách phần đa thức (cho tiệm cận xiên) và phần dư tiến về 0; nhờ đó biết hình dạng đồ thị ở xa gốc.
- **Câu 2:** Hàm này có bao nhiêu cực trị? → Hai, tại x = 1 ± √2, vì y′ = 0 có hai nghiệm phân biệt.
- **Chốt nhanh:** Chia → tiệm cận xiên; đạo hàm → hai cực trị.

- Cực tiểu tại $x = 1 + \sqrt2 \approx 2{,}41$ nghìn sản phẩm với chi phí $2\sqrt2 \approx 2{,}83$ triệu.
- Sản lượng rất lớn: chi phí trung bình tiến sát $x - 1$ (tăng dần) — không nên sản xuất quá nhiều.
- Mô hình cho thấy có mức sản lượng tối ưu hữu hạn.
- **TeacherCue:** Hỏi: "Vì sao chi phí trung bình lại tăng khi sản lượng quá lớn?"

- **Exit Ticket (4 mục):**
  1. Nêu quy trình khảo sát bậc hai/bậc nhất.
  2. Nêu 1 bẫy (quên tiệm cận xiên; mất một cực trị).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tìm tiệm cận xiên của (x²−2x+3)/(x−1) và hai cực trị.
- **TeacherCue (lớp yếu):** Mở lại khung 4 bước ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu cách tìm tiệm cận xiên của hàm bậc hai/bậc nhất.
   - **Đáp án:** Chia tử cho mẫu để được dạng mx + n + R/(cx+d); tiệm cận xiên là y = mx + n.
2. `[NB]` Tìm tiệm cận đứng của y = (x²−2x+3)/(x−1).
   - **Đáp án:** x = 1.
3. `[TH]` Tính y′ của y = (x²−2x+3)/(x−1).
   - **Đáp án:** y′ = 1 − 2/(x−1)².
4. `[TH]` Tìm cực trị của y = (x²−2x+3)/(x−1).
   - **Đáp án:** x = 1 ± √2; cực tiểu tại 1 + √2 (y = 2√2), cực đại tại 1 − √2 (y = −2√2).
5. `[VD]` Khảo sát tiệm cận và cực trị của y = (x² + x − 1)/(x + 2).
   - **Đáp án:** y = x − 1 + 1/(x+2) ⇒ tiệm cận xiên y = x − 1; đứng x = −2. y′ = 1 − 1/(x+2)² = 0 ⇔ x = −1 hoặc x = −3.
6. `[VD]` Giải thích vì sao hàm bậc hai/bậc nhất không có tiệm cận ngang.
   - **Đáp án:** Vì bậc tử lớn hơn bậc mẫu đúng 1 bậc; khi x → ∞, y tiến theo đường thẳng mx + n chứ không tiến tới hằng số.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Quên tìm tiệm cận xiên.
- Mất một cực trị khi giải (x−1)² = 2.
- Nhầm cực đại với cực tiểu.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
