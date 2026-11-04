# KẾ HOẠCH DẠY HỌC — Khảo sát hàm phân thức bậc nhất trên bậc nhất — tiếp (Toán 12 · Tuần 6 · Tiết 35)

| Lớp | 12 | Tên bài học | Khảo sát hàm phân thức bậc nhất trên bậc nhất — tiếp | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-6-35.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Xác định chiều biến thiên và tiệm cận của hàm có $a < 0$.
- **Should (Trọng tâm – Thông hiểu):** Tìm giao trục, tâm đối xứng và vẽ đồ thị đúng.
- **Could (Nâng cao – Vận dụng):** Giải bài toán tham số: tìm $m$ để hàm đồng biến/nghịch biến; phản biện kết luận sai khoảng.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Hiệu suất lọc nước của một thiết bị: $E(x) = \dfrac{-x + 2}{x - 1}$ (%), $x$ là số giờ vận hành.**

- **Tập xác định:** $x \ne 1$.
- **Đạo hàm:** $E'(x) = \dfrac{(-1)\cdot1 - 2\cdot1}{(x-1)^2} = \dfrac{-3}{(x-1)^2} < 0$ → **nghịch biến**.
- **Tiệm cận:** đứng $x = 1$; ngang $y = -1$.
- **Giao trục:** $E(0) = \dfrac{2}{-1} = -2$ (trục tung); $E(x) = 0 \Leftrightarrow x = 2$ (trục hoành).
- **Kiểm chứng tay:** $E(0) = -2$; $E(2) = 0$; $E(3) = \dfrac{-1}{2} = -0{,}5$; $E(11) = \dfrac{-9}{10} = -0{,}9$ → tiến về $-1$.
- **Tâm đối xứng:** $(1; -1)$.

**Bẫy của bài:** nhầm dấu đạo hàm khi $a < 0$; tính giao trục sai dấu; kết luận hàm nghịch biến trên toàn $\mathbb{R}$ (sai — chỉ trên từng khoảng).

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** E(x) = (−x+2)/(x−1). Cần biết xu hướng và giới hạn.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Đạo hàm $E'(x)$ bằng bao nhiêu?*
  - (A) −3/(x−1)²
  - (B) 3/(x−1)²
  - (C) −1/(x−1)²
  - **Correct: (A)** — (ad − bc) = (−1)·1 − 2·1 = −3 nên E′ = −3/(x−1)².
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Đồ thị cắt trục hoành tại đâu?
  2. `[SO SÁNH]` Tiệm cận ngang bằng bao nhiêu?
- **TeacherCue (lớp yếu):** Nhắc công thức ad − bc và cho HS tính riêng tử trước.
- **LookFor:** HS tính đúng tử số trước khi viết phân thức.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Xác định chiều biến thiên và tiệm cận của hàm có $a < 0$.
- **Should:** Tìm giao trục, tâm đối xứng và vẽ đồ thị đúng.
- **Could:** Giải bài toán tham số: tìm $m$ để hàm đồng biến/nghịch biến; phản biện kết luận sai khoảng.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Tham số ảnh hưởng thế nào đến chiều biến thiên của hàm phân thức?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Đạo hàm $E' = \dfrac{ad - bc}{(cx+d)^2}$; xét dấu.
- **Bước 2:** Tiệm cận đứng $x = -\tfrac{d}{c}$; ngang $y = \tfrac{a}{c}$.
- **Bước 3:** Giao trục: $E(0) = \tfrac{b}{d}$; $E(x) = 0 \Leftrightarrow x = -\tfrac{b}{a}$.
- **Bước 4:** Tâm đối xứng là giao hai tiệm cận; vẽ qua các điểm đặc biệt.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao hàm nghịch biến nhưng vẫn có nhánh tăng ở bên trái tiệm cận?
  2. `[PHÁT HIỆN]` Tâm đối xứng ở đâu?
- **TeacherCue (lớp yếu):** Khung 4 bước + bảng 3 điểm đặc biệt.
- **Chốt:** Chỉ cần đạo hàm, hai tiệm cận và hai giao trục là vẽ đủ đồ thị.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI kết luận: "Vì E′(x) = −3/(x−1)² < 0 với mọi x ≠ 1 nên hàm số nghịch biến trên toàn bộ ℝ.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI kết luận hàm nghịch biến trên $\mathbb{R}$ vì $E' < 0$ với mọi $x \ne 1$.
  2. Bằng chứng: Sai phạm vi: hàm chỉ nghịch biến trên từng khoảng $(-\infty; 1)$ và $(1; +\infty)$, không trên toàn $\mathbb{R}$ (tập xác định không gồm 1).
  3. Sửa: Nghịch biến trên mỗi khoảng xác định.
- **TeacherCue:** Cho HS so sánh E(0) = −2 và E(2) = 0: 0 < 2 mà E(0) < E(2) — nếu nghịch biến trên ℝ thì phải ngược lại.
- **LookFor:** HS phát hiện mâu thuẫn bằng hai giá trị hai bên tiệm cận.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "tính ad − bc và hai tiệm cận."
  - **S:** "tìm giao trục và tâm đối xứng."
  - **C:** "giải bài tham số về dấu của ad − bc."

- **Luồng M (Must) — hint: tính ad − bc và hai tiệm cận.**
1. Tìm tiệm cận của y = (−x+2)/(x−1).
   - **Đáp án:** TCĐ x = 1; TCN y = −1.
2. Nêu dấu đạo hàm của y = (ax+b)/(cx+d) theo ad − bc.
   - **Đáp án:** ad − bc > 0: đồng biến; ad − bc < 0: nghịch biến (trên từng khoảng xác định).

- **Luồng S (Should) — hint: tìm giao trục và tâm đối xứng.**
1. Tìm giao điểm với các trục của y = (−x+2)/(x−1).
   - **Đáp án:** Trục tung: (0; −2); trục hoành: (2; 0).
2. Tìm tâm đối xứng của đồ thị y = (−x+2)/(x−1).
   - **Đáp án:** Giao hai tiệm cận: (1; −1).

- **Luồng C (Could) — hint: giải bài tham số về dấu của ad − bc.**
1. Tìm m để y = (mx+1)/(x−2) nghịch biến trên từng khoảng xác định.
   - **Đáp án:** −2m − 1 < 0 ⇔ m > −1/2.
2. Phản biện: "Vì E′ < 0 với mọi x ≠ 1 nên E nghịch biến trên ℝ".
   - **Đáp án:** Sai. Tập xác định không gồm x = 1, và trên hai khoảng riêng biệt hàm nghịch biến nhưng không so sánh được giá trị hai bên (ví dụ E(0) = −2 < E(2) = 0).

- **LookFor:** HS M đúng dấu; HS S đủ điểm; HS C giải được m.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tìm $m$ để $y = \dfrac{mx + 1}{x - 2}$ nghịch biến trên từng khoảng xác định. → $y' = \dfrac{-2m - 1}{(x-2)^2}$; nghịch biến ⇔ $-2m - 1 < 0 \Leftrightarrow m > -\tfrac12$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "E′(x) = −3/(x−1)²" → **Đúng**
  - "Hàm nghịch biến trên ℝ" → **Sai — chỉ trên từng khoảng**
  - "Giao trục hoành tại x = 2" → **Đúng**
- **TeacherCue:** Chấm chéo bảng biến thiên.

- **Câu 1:** Vì sao không thể nói hàm nghịch biến trên ℝ? → Vì tập xác định bị khuyết điểm x = 1; tính đơn điệu chỉ xét trên từng khoảng liên tục.
- **Câu 2:** Giao trục hoành của (−x+2)/(x−1) ở đâu? → Giải −x + 2 = 0 (với x ≠ 1) được x = 2.
- **Chốt nhanh:** Dấu ad − bc quyết định — phạm vi là từng khoảng.

- Hiệu suất giảm dần từ 0% (t = 2) và tiến về −1% — mô hình cho thấy thiết bị không còn hiệu quả sau vài giờ.
- Điểm cắt trục hoành x = 2 là thời điểm hiệu suất bằng 0 — mốc cần thay lõi lọc.
- Tiệm cận ngang y = −1 là giới hạn dưới của mô hình.
- **TeacherCue:** Hỏi: "Nên thay lõi lọc trước hay sau mốc x = 2? Vì sao?"

- **Exit Ticket (4 mục):**
  1. Nêu 4 bước khảo sát và ba điểm đặc biệt.
  2. Nêu 1 bẫy (kết luận nghịch biến trên ℝ).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Khảo sát E(x) = (−x+2)/(x−1): chiều biến thiên, tiệm cận, giao trục?
- **TeacherCue (lớp yếu):** Mở lại khung 4 bước ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tìm tiệm cận của y = (−x+2)/(x−1).
   - **Đáp án:** TCĐ x = 1; TCN y = −1.
2. `[NB]` Nêu dấu đạo hàm của y = (ax+b)/(cx+d) theo ad − bc.
   - **Đáp án:** ad − bc > 0: đồng biến; ad − bc < 0: nghịch biến (trên từng khoảng xác định).
3. `[TH]` Tìm giao điểm với các trục của y = (−x+2)/(x−1).
   - **Đáp án:** Trục tung: (0; −2); trục hoành: (2; 0).
4. `[TH]` Tìm tâm đối xứng của đồ thị y = (−x+2)/(x−1).
   - **Đáp án:** Giao hai tiệm cận: (1; −1).
5. `[VD]` Tìm m để y = (mx+1)/(x−2) nghịch biến trên từng khoảng xác định.
   - **Đáp án:** −2m − 1 < 0 ⇔ m > −1/2.
6. `[VD]` Phản biện: "Vì E′ < 0 với mọi x ≠ 1 nên E nghịch biến trên ℝ".
   - **Đáp án:** Sai. Tập xác định không gồm x = 1, và trên hai khoảng riêng biệt hàm nghịch biến nhưng không so sánh được giá trị hai bên (ví dụ E(0) = −2 < E(2) = 0).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Kết luận đơn điệu trên toàn ℝ.
- Tính giao trục sai dấu.
- Bỏ qua tập xác định khi vẽ.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
