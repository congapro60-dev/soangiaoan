# KẾ HOẠCH DẠY HỌC — Khảo sát hàm phân thức bậc nhất trên bậc nhất (Toán 12 · Tuần 6 · Tiết 34)

| Lớp | 12 | Tên bài học | Khảo sát hàm phân thức bậc nhất trên bậc nhất | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-6-34.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Tính đạo hàm, xác định chiều biến thiên và hai tiệm cận của hàm bậc nhất/bậc nhất.
- **Should (Trọng tâm – Thông hiểu):** Lập bảng biến thiên, xác định tâm đối xứng và vẽ đồ thị.
- **Could (Nâng cao – Vận dụng):** Mô hình hóa nồng độ thuốc và biện luận theo tham số.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Nồng độ thuốc (mg/L) trong máu sau $t$ giờ: $C(t) = \dfrac{2t + 1}{t + 3}$, $t \ge 0$.**

- **Tập xác định:** $D = \mathbb{R} \setminus \{-3\}$; với bài thực tế chỉ xét $t \ge 0$.
- **Đạo hàm:** $C'(t) = \dfrac{2(t+3) - (2t+1)\cdot1}{(t+3)^2} = \dfrac{5}{(t+3)^2} > 0$ → hàm **luôn tăng** trên từng khoảng xác định.
- **Tiệm cận đứng:** $t = -3$. **Tiệm cận ngang:** $y = 2$ (tỉ số hệ số bậc cao nhất).
- **Kiểm chứng tay:** $C(0) = \tfrac13 \approx 0{,}33$; $C(1) = \tfrac34 = 0{,}75$; $C(7) = \tfrac{15}{10} = 1{,}5$; $C(97) = \tfrac{195}{100} = 1{,}95$ → tiến dần 2 mg/L.
- **Tâm đối xứng:** giao hai tiệm cận $(-3; 2)$.

**Bẫy của bài:** tính đạo hàm sai dấu ($ad - bc$); nhầm tâm đối xứng với gốc tọa độ; quên tập xác định.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** C(t) = (2t+1)/(t+3). Cần biết nồng độ tăng hay giảm và tiến về đâu.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Đạo hàm của $C(t) = \dfrac{2t+1}{t+3}$ bằng bao nhiêu?*
  - (A) 5/(t+3)²
  - (B) −5/(t+3)²
  - (C) 2/(t+3)²
  - **Correct: (A)** — Quy tắc thương: (2(t+3) − (2t+1)·1)/(t+3)² = 5/(t+3)².
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao đạo hàm luôn dương?
  2. `[SO SÁNH]` Tiệm cận ngang và đứng ở đâu?
- **TeacherCue (lớp yếu):** Viết công thức đạo hàm tổng quát (ad − bc)/(cx+d)² và thay số.
- **LookFor:** HS tính đúng tử số ad − bc.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Tính đạo hàm, xác định chiều biến thiên và hai tiệm cận của hàm bậc nhất/bậc nhất.
- **Should:** Lập bảng biến thiên, xác định tâm đối xứng và vẽ đồ thị.
- **Could:** Mô hình hóa nồng độ thuốc và biện luận theo tham số.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao hàm $y = \dfrac{ax+b}{cx+d}$ chỉ có hai dạng biến thiên (luôn tăng hoặc luôn giảm)?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Tập xác định: $cx + d \ne 0 \Rightarrow x \ne -\tfrac{d}{c}$.
- **Bước 2:** Đạo hàm: $y' = \dfrac{ad - bc}{(cx+d)^2}$ — dấu không đổi trên từng khoảng.
- **Bước 3:** Tiệm cận: đứng $x = -\tfrac{d}{c}$; ngang $y = \tfrac{a}{c}$.
- **Bước 4:** Bảng biến thiên + tâm đối xứng $\left(-\tfrac{d}{c}; \tfrac{a}{c}\right)$ + vẽ.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao đạo hàm không đổi dấu?
  2. `[PHÁT HIỆN]` Nếu $ad - bc < 0$ thì hàm thế nào?
- **TeacherCue (lớp yếu):** Khung 4 bước; nhắc: "(cx+d)² luôn dương nên dấu do ad − bc".
- **Chốt:** Hàm bậc nhất/bậc nhất chỉ có hai kiểu: tăng đều hoặc giảm đều trên từng khoảng.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI kết luận: "Hàm C(t) = (2t+1)/(t+3) nghịch biến vì khi t tăng thì mẫu t + 3 tăng, làm phân số giảm.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI kết luận hàm nghịch biến vì "mẫu tăng nên phân số giảm".
  2. Bằng chứng: Phải xét đạo hàm: $C'(t) = 5/(t+3)^2 > 0$ nên hàm **đồng biến**, dù mẫu tăng (tử cũng tăng nhanh hơn).
  3. Sửa: Đồng biến trên $(-3; +\infty)$ và $(-\infty; -3)$.
- **TeacherCue:** Cho HS tính C(0), C(7), C(97) để thấy tăng dần.
- **LookFor:** HS dùng đạo hàm thay vì cảm giác.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "tính ad − bc rồi xét dấu."
  - **S:** "lập bảng biến thiên và tìm tâm đối xứng."
  - **C:** "biện luận theo tham số a, b, c, d."

- **Luồng M (Must) — hint: tính ad − bc rồi xét dấu.**
1. Nêu tập xác định của y = (ax+b)/(cx+d).
   - **Đáp án:** x ≠ −d/c.
2. Nêu công thức đạo hàm của (ax+b)/(cx+d).
   - **Đáp án:** y′ = (ad − bc)/(cx + d)².

- **Luồng S (Should) — hint: lập bảng biến thiên và tìm tâm đối xứng.**
1. Khảo sát chiều biến thiên của y = (2x + 1)/(x + 3).
   - **Đáp án:** y′ = (2·3 − 1·1)/(x+3)² = 5/(x+3)² > 0 ⇒ đồng biến trên (−∞;−3) và (−3;+∞).
2. Tìm tiệm cận của y = (2x + 1)/(x + 3).
   - **Đáp án:** Tiệm cận đứng x = −3; tiệm cận ngang y = 2.

- **Luồng C (Could) — hint: biện luận theo tham số a, b, c, d.**
1. Khảo sát y = (−x + 2)/(x − 1).
   - **Đáp án:** y′ = (−3)/(x−1)² < 0 ⇒ nghịch biến; TCĐ x = 1; TCN y = −1; tâm đối xứng (1; −1).
2. Tìm m để hàm y = (mx + 1)/(x − 2) đồng biến trên từng khoảng xác định.
   - **Đáp án:** y′ = (m·(−2) − 1·1)/(x−2)² = (−2m − 1)/(x−2)². Đồng biến ⇔ −2m − 1 > 0 ⇔ m < −1/2.

- **LookFor:** HS M đúng dấu; HS S đủ bước; HS C biện luận được.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Khảo sát chiều biến thiên và tiệm cận của $y = \dfrac{-x+2}{x-1}$. → $y' = \dfrac{(-1)\cdot1 - 2\cdot1}{(x-1)^2} = \dfrac{-3}{(x-1)^2} < 0$ ⇒ nghịch biến trên từng khoảng. Tiệm cận đứng $x = 1$; ngang $y = -1$; tâm đối xứng $(1; -1)$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Đạo hàm của (ax+b)/(cx+d) là (ad − bc)/(cx+d)²" → **Đúng**
  - "Tiệm cận ngang là y = a/c" → **Đúng**
  - "Hàm luôn tăng vì tử và mẫu đều tăng" → **Sai**
- **TeacherCue:** Chiếu 2 bảng biến thiên, cùng sửa dấu.

- **Câu 1:** Vì sao hàm bậc nhất/bậc nhất không có cực trị? → Vì đạo hàm không đổi dấu (tử ad − bc là hằng số, mẫu luôn dương) nên không có điểm mà y′ đổi dấu.
- **Câu 2:** Tâm đối xứng của đồ thị hàm phân thức là giao của hai đường nào? → Giao của tiệm cận đứng và tiệm cận ngang.
- **Chốt nhanh:** Tập xác định — đạo hàm (ad−bc) — hai tiệm cận — bảng.

- Nồng độ tăng từ 0,33 mg/L (t = 0) và tiến dần 2 mg/L — không vượt 2.
- Sau 7 giờ đạt 1,5 mg/L; sau 97 giờ gần 1,95 mg/L.
- Đường tiệm cận ngang là giới hạn sinh học của mô hình — hữu ích cho bác sĩ.
- **TeacherCue:** Hỏi: "Vì sao mô hình không thể vượt 2 mg/L?" → do tiệm cận ngang.

- **Exit Ticket (4 mục):**
  1. Nêu 4 bước khảo sát hàm bậc nhất/bậc nhất.
  2. Nêu 1 bẫy (sai dấu ad − bc; nhầm tâm đối xứng).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Khảo sát C(t) = (2t+1)/(t+3): chiều biến thiên và hai tiệm cận?
- **TeacherCue (lớp yếu):** Mở lại khung 4 bước ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu tập xác định của y = (ax+b)/(cx+d).
   - **Đáp án:** x ≠ −d/c.
2. `[NB]` Nêu công thức đạo hàm của (ax+b)/(cx+d).
   - **Đáp án:** y′ = (ad − bc)/(cx + d)².
3. `[TH]` Khảo sát chiều biến thiên của y = (2x + 1)/(x + 3).
   - **Đáp án:** y′ = (2·3 − 1·1)/(x+3)² = 5/(x+3)² > 0 ⇒ đồng biến trên (−∞;−3) và (−3;+∞).
4. `[TH]` Tìm tiệm cận của y = (2x + 1)/(x + 3).
   - **Đáp án:** Tiệm cận đứng x = −3; tiệm cận ngang y = 2.
5. `[VD]` Khảo sát y = (−x + 2)/(x − 1).
   - **Đáp án:** y′ = (−3)/(x−1)² < 0 ⇒ nghịch biến; TCĐ x = 1; TCN y = −1; tâm đối xứng (1; −1).
6. `[VD]` Tìm m để hàm y = (mx + 1)/(x − 2) đồng biến trên từng khoảng xác định.
   - **Đáp án:** y′ = (m·(−2) − 1·1)/(x−2)² = (−2m − 1)/(x−2)². Đồng biến ⇔ −2m − 1 > 0 ⇔ m < −1/2.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Tính đạo hàm sai dấu (dùng bc − ad).
- Nhầm tâm đối xứng với gốc tọa độ.
- Bỏ tập xác định khi kết luận biến thiên.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
