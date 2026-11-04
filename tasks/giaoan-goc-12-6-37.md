# KẾ HOẠCH DẠY HỌC — Khảo sát hàm phân thức bậc hai trên bậc nhất — tiếp (Toán 12 · Tuần 6 · Tiết 37)

| Lớp | 12 | Tên bài học | Khảo sát hàm phân thức bậc hai trên bậc nhất — tiếp | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-6-37.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Khảo sát đủ các bước cho một hàm bậc hai/bậc nhất.
- **Should (Trọng tâm – Thông hiểu):** So sánh hai hàm cùng tiệm cận xiên nhưng khác cực trị.
- **Could (Nâng cao – Vận dụng):** Biện luận tham số và phản biện kết luận dựa trên đồ thị.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Hai mô hình chi phí cần so sánh: $y_1 = \dfrac{x^2 + x - 1}{x + 2}$ và $y_2 = \dfrac{x^2 - 2x + 3}{x - 1}$.**

| Hàm | Tiệm cận xiên | Tiệm cận đứng | Cực trị |
|---|---|---|---|
| $y_1$ | $y = x - 1$ | $x = -2$ | $x = -1$; $x = -3$ |
| $y_2$ | $y = x - 1$ | $x = 1$ | $x = 1 \pm \sqrt2$ |

- **Kiểm chứng tay $y_1$:** chia $x^2 + x - 1 = (x+2)(x-1) + 1$ ⇒ $y_1 = x - 1 + \dfrac{1}{x+2}$; $y_1' = 1 - \dfrac{1}{(x+2)^2} = 0 \Leftrightarrow (x+2)^2 = 1 \Leftrightarrow x = -1$ hoặc $x = -3$.
- $y_1(-1) = -1 - 1 + 1 = -1$ (cực tiểu); $y_1(-3) = -3 - 1 - 1 = -5$ (cực đại).

**Bẫy của bài:** nhầm dấu cực trị; quên rằng tiệm cận xiên có thể trùng nhau ở hai hàm khác nhau; tính sai khi chia đa thức.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** y₁ và y₂ đều có tiệm cận xiên y = x − 1 nhưng khác tiệm cận đứng và cực trị.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Với $y_1 = \dfrac{x^2+x-1}{x+2}$, $y_1' = 0$ tại đâu?*
  - (A) x = −1 và x = −3
  - (B) x = 1 và x = 3
  - (C) x = −2
  - **Correct: (A)** — y₁′ = 1 − 1/(x+2)² = 0 ⇔ (x+2)² = 1 ⇔ x = −1 hoặc x = −3.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Đâu là cực đại?
  2. `[SO SÁNH]` Hai hàm khác nhau ở điểm nào?
- **TeacherCue (lớp yếu):** Cho HS chia đa thức trước, rồi mới đạo hàm.
- **LookFor:** HS giải đúng phương trình bình phương bằng 1.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Khảo sát đủ các bước cho một hàm bậc hai/bậc nhất.
- **Should:** So sánh hai hàm cùng tiệm cận xiên nhưng khác cực trị.
- **Could:** Biện luận tham số và phản biện kết luận dựa trên đồ thị.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Tham số trong hàm bậc hai/bậc nhất làm thay đổi tiệm cận hay cực trị trước?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Chia đa thức cho từng hàm để có tiệm cận xiên.
- **Bước 2:** Đạo hàm, giải $y' = 0$, lập bảng dấu để xác định cực đại/tiểu.
- **Bước 3:** So sánh: cùng tiệm cận xiên nhưng khác vị trí tiệm cận đứng và cực trị.
- **Bước 4:** Bài tham số: xét dấu của biểu thức đạo hàm theo tham số.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao hai hàm có cùng tiệm cận xiên?
  2. `[PHÁT HIỆN]` Cực đại của y₁ ở đâu và giá trị bao nhiêu?
- **TeacherCue (lớp yếu):** Khung 4 bước; nhắc: "cùng tiệm cận xiên không có nghĩa cùng đồ thị".
- **Chốt:** Tiệm cận xiên do phần đa thức; cực trị do phần dư quyết định.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI kết luận: "Vì y₁ và y₂ cùng có tiệm cận xiên y = x − 1 nên hai đồ thị chỉ khác nhau ở vị trí, hình dạng hoàn toàn giống nhau; có thể dùng chung một bảng biến thiên.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI kết luận hai hàm có cùng đồ thị vì cùng tiệm cận xiên $y = x - 1$.
  2. Bằng chứng: Cùng tiệm cận xiên nhưng khác tiệm cận đứng ($x = -2$ so với $x = 1$) và khác cực trị.
  3. Sửa: Hai đồ thị khác nhau; chỉ tiệm cận xiên trùng.
- **TeacherCue:** Cho HS tính y₁(0) và y₂(0): −1/2 so với −3 — khác nhau.
- **LookFor:** HS so sánh giá trị cụ thể.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "chia đa thức rồi đạo hàm."
  - **S:** "lập bảng dấu để phân biệt cực đại/tiểu."
  - **C:** "biện luận tham số ở biểu thức đạo hàm."

- **Luồng M (Must) — hint: chia đa thức rồi đạo hàm.**
1. Tìm tiệm cận xiên và đứng của y = (x²+x−1)/(x+2).
   - **Đáp án:** Chia: y = x − 1 + 1/(x+2) ⇒ tiệm cận xiên y = x − 1; tiệm cận đứng x = −2.
2. Nêu điều kiện để hàm bậc hai/bậc nhất có hai cực trị.
   - **Đáp án:** Phương trình y′ = 0 có hai nghiệm phân biệt (thường dạng 1 − R/(cx+d)² = 0 với R > 0).

- **Luồng S (Should) — hint: lập bảng dấu để phân biệt cực đại/tiểu.**
1. Tìm cực trị của y = (x²+x−1)/(x+2).
   - **Đáp án:** Cực đại (−3; −5); cực tiểu (−1; −1).
2. Tính y(0) của hai hàm y₁, y₂ để so sánh.
   - **Đáp án:** y₁(0) = −1/2 = −0,5; y₂(0) = 3/(−1) = −3.

- **Luồng C (Could) — hint: biện luận tham số ở biểu thức đạo hàm.**
1. Tìm m để hàm y = (x² + mx + 1)/(x − 1) có hai cực trị.
   - **Đáp án:** Chia: y = x + (m+1) + (m+2)/(x−1). y′ = 1 − (m+2)/(x−1)²; y′ = 0 ⇔ (x−1)² = m+2. Có hai nghiệm ⇔ m + 2 > 0 ⇔ m > −2.
2. Phản biện: "Hai hàm có cùng tiệm cận xiên thì có cùng hình dạng".
   - **Đáp án:** Sai. Tiệm cận xiên chỉ mô tả hành vi ở xa gốc; gần tiệm cận đứng và vùng cực trị hai đồ thị khác nhau hoàn toàn (ví dụ y₁(0) = −0,5 và y₂(0) = −3).

- **LookFor:** HS M đúng tiệm cận; HS S đúng cực trị; HS C biện luận rõ.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Khảo sát cực trị của $y = \dfrac{x^2 + x - 1}{x + 2}$. → $y = x - 1 + 1/(x+2)$; $y' = 1 - 1/(x+2)^2 = 0$ tại $x = -1$ (cực tiểu, $y = -1$) và $x = -3$ (cực đại, $y = -5$).
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Cùng tiệm cận xiên ⇒ cùng đồ thị" → **Sai**
  - "y₁ có cực đại tại x = −3" → **Đúng**
  - "Tiệm cận đứng của y₁ là x = −2" → **Đúng**
- **TeacherCue:** Chấm chéo bảng so sánh hai hàm.

- **Câu 1:** Vì sao y₁ có cực đại tại x = −3 nhưng giá trị −5 lại nhỏ hơn cực tiểu −1? → Vì "cực đại/cực tiểu" là tính chất địa phương (so với lân cận), không phải so sánh toàn cục; −5 là giá trị lớn nhất trong lân cận bên trái của nó.
- **Câu 2:** Tiệm cận xiên của hai hàm có giống nhau không? → Có, cùng là y = x − 1, vì phần đa thức sau khi chia giống nhau.
- **Chốt nhanh:** Tiệm cận xiên theo phần đa thức; cực trị theo phần dư.

- Cả hai mô hình đều tăng tuyến tính dài hạn theo y = x − 1.
- y₁ có cực tiểu tại x = −1 (không có ý nghĩa với x > 0); y₂ có cực tiểu tại x ≈ 2,41 — có ý nghĩa thực tế.
- Vì vậy với sản lượng dương, mô hình y₂ phù hợp hơn để tìm điểm tối ưu.
- **TeacherCue:** Hỏi: "Mô hình nào cho điểm tối ưu trong miền sản lượng dương?"

- **Exit Ticket (4 mục):**
  1. Nêu hai bước chính khi so sánh hai hàm phân thức.
  2. Nêu 1 bẫy (nhầm cực đại/tiểu; kết luận theo tiệm cận).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tìm cực trị của (x²+x−1)/(x+2).
- **TeacherCue (lớp yếu):** Mở lại bảng so sánh ở mục II.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tìm tiệm cận xiên và đứng của y = (x²+x−1)/(x+2).
   - **Đáp án:** Chia: y = x − 1 + 1/(x+2) ⇒ tiệm cận xiên y = x − 1; tiệm cận đứng x = −2.
2. `[NB]` Nêu điều kiện để hàm bậc hai/bậc nhất có hai cực trị.
   - **Đáp án:** Phương trình y′ = 0 có hai nghiệm phân biệt (thường dạng 1 − R/(cx+d)² = 0 với R > 0).
3. `[TH]` Tìm cực trị của y = (x²+x−1)/(x+2).
   - **Đáp án:** Cực đại (−3; −5); cực tiểu (−1; −1).
4. `[TH]` Tính y(0) của hai hàm y₁, y₂ để so sánh.
   - **Đáp án:** y₁(0) = −1/2 = −0,5; y₂(0) = 3/(−1) = −3.
5. `[VD]` Tìm m để hàm y = (x² + mx + 1)/(x − 1) có hai cực trị.
   - **Đáp án:** Chia: y = x + (m+1) + (m+2)/(x−1). y′ = 1 − (m+2)/(x−1)²; y′ = 0 ⇔ (x−1)² = m+2. Có hai nghiệm ⇔ m + 2 > 0 ⇔ m > −2.
6. `[VD]` Phản biện: "Hai hàm có cùng tiệm cận xiên thì có cùng hình dạng".
   - **Đáp án:** Sai. Tiệm cận xiên chỉ mô tả hành vi ở xa gốc; gần tiệm cận đứng và vùng cực trị hai đồ thị khác nhau hoàn toàn (ví dụ y₁(0) = −0,5 và y₂(0) = −3).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Nhầm cực đại/cực tiểu.
- Kết luận hai hàm cùng đồ thị vì cùng tiệm cận.
- Chia đa thức sai dấu.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
