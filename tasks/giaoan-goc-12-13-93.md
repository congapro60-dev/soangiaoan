# KẾ HOẠCH DẠY HỌC — Định nghĩa tích phân và công thức Newton (Toán 12 · Tuần 13 · Tiết 93)

| Lớp | 12 | Tên bài học | Định nghĩa tích phân và công thức Newton | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-13-93.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Nắm vững định nghĩa tích phân xác định và công thức Newton - Leibniz: ∫_a^b f(x) dx = F(b) - F(a) = F(x)|_a^b.
- **Should (Trọng tâm – Thông hiểu):** Tính thành thạo tích phân của các hàm số sơ cấp cơ bản bằng cách tìm nguyên hàm rồi thế cận.
- **Could (Nâng cao – Vận dụng):** Chứng minh công thức Newton - Leibniz bằng định lý giá trị trung bình; giải thích mối liên hệ giữa đạo hàm và tích phân.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Mô hình tính quãng đường ô tô phanh gấp dừng lại:**
- Khi đạp phanh khẩn cấp, vận tốc của ô tô giảm theo thời gian:
  $$v(t) = 20 - 4t \quad (\text{m/s}, 0 \le t \le 5 \text{ giây}).$$
- Sau $t = 5$ giây, $v(5) = 20 - 4(5) = 0$ m/s (xe dừng hẳn).
- Quãng đường phanh xe $s$ chính là tích phân của vận tốc từ $t = 0$ đến $t = 5$:
  $$s = \int_0^5 v(t) dt = \int_0^5 (20 - 4t) dt.$$
- **Áp dụng công thức Newton - Leibniz:**
  - Một nguyên hàm của $v(t) = 20 - 4t$ là $F(t) = 20t - 2t^2$.
  - Ký hiệu thế cận: $F(t) \Big|_0^5 = F(5) - F(0)$.
  - Tính giá trị tại cận trên: $F(5) = 20(5) - 2(5)^2 = 100 - 50 = 50$ mét.
  - Tính giá trị tại cận dưới: $F(0) = 20(0) - 2(0)^2 = 0$ mét.
  - Quãng đường phanh an toàn: $s = 50 - 0 = 50$ mét.
- **Sự biến mất của $C$:** Nếu chọn $F(t) + C$ thì $[F(b) + C] - [F(a) + C] = F(b) - F(a) + (C - C) = F(b) - F(a)$. Hằng số $C$ luôn triệt tiêu.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Nguyên hàm của v(t) = 20 - 4t là F(t) = 20t - 2t². Ta thế cận t từ 0 đến 5.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Giá trị F(5) - F(0) cho kết quả bao nhiêu mét?*
  - (A) 50 mét
  - (B) 100 mét
  - (C) 25 mét
  - **Correct: (A)** — F(5) = 20·5 - 2·25 = 50; F(0) = 0. Hiệu số F(5) - F(0) = 50 mét.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Nếu cộng thêm C = 100 vào nguyên hàm thì hiệu số có đổi không?
  2. `[SO SÁNH]` Công thức Newton-Leibniz biến bài toán hình học diện tích thành bài toán đại số gì?
- **TeacherCue (lớp yếu):** Viết ký hiệu thế cận F(x)|_a^b với gạch đứng ở bên phải.
- **LookFor:** HS thế đúng cận trên trừ cận dưới: F(b) - F(a).

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Nắm vững định nghĩa tích phân xác định và công thức Newton - Leibniz: ∫_a^b f(x) dx = F(b) - F(a) = F(x)|_a^b.
- **Should:** Tính thành thạo tích phân của các hàm số sơ cấp cơ bản bằng cách tìm nguyên hàm rồi thế cận.
- **Could:** Chứng minh công thức Newton - Leibniz bằng định lý giá trị trung bình; giải thích mối liên hệ giữa đạo hàm và tích phân.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Tại sao hằng số C hoàn toàn biến mất khi áp dụng công thức Newton - Leibniz?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Định lý cơ bản của Giải tích: Cho $f(x)$ liên tục trên đoạn $[a; b]$. Nếu $F(x)$ là một nguyên hàm bất kỳ của $f(x)$ trên $[a; b]$ thì:
- **Bước 2:** $$\int_a^b f(x) dx = F(b) - F(a) = F(x) \Big|_a^b.$$
- **Bước 3:** Quy trình tính 3 bước: (1) Tìm một nguyên hàm $F(x)$ (chọn $C = 0$); (2) Viết ký hiệu gạch đứng thế cận $F(x)|_a^b$; (3) Lấy $F(b) - F(a)$.
- **Bước 4:** Tính chất cận: $\int_a^b f(x) dx = -\int_b^a f(x) dx$ và $\int_a^a f(x) dx = 0$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Đạo hàm của tích phân theo cận trên d/dx [∫_a^x f(t) dt] bằng gì?
  2. `[PHÁT HIỆN]` Vì sao bắt buộc phải lấy F(cận trên) trừ F(cận dưới)?
- **TeacherCue (lớp yếu):** Bảng đối chiếu Newton (Anh) và Leibniz (Đức) cùng độc lập phát minh công thức.
- **Chốt:** Tích phân bằng F(cận trên) trừ F(cận dưới); hằng số C luôn tự động triệt tiêu.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI giải: Tính I = ∫_0^1 (x - 1) dx. Nguyên hàm F(x) = x²/2 - x. AI tính F(1) = 1/2 - 1 = -1/2, F(0) = 0. AI kết luận vì tích phân là diện tích nên I = |-1/2| = 1/2."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Tính I = ∫_1^2 3x² dx. Nguyên hàm là x³. AI thế cận: I = F(1) - F(2) = 1³ - 2³ = 1 - 8 = -7.
  2. Bằng chứng: Thế ngược thứ tự cận: Công thức Newton - Leibniz bắt buộc phải lấy F tại CẬN TRÊN trừ F tại CẬN DƯỚI: F(b) - F(a), không được lấy F(a) - F(b).
  3. Sửa: Thế cận đúng: I = F(2) - F(1) = 2³ - 1³ = 8 - 1 = 7.
- **TeacherCue:** Khẩu quyết: "Trên trừ Dưới, không lấy Dưới trừ Trên".
- **LookFor:** HS phát hiện lỗi đảo ngược thứ tự cận trên và cận dưới.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "tìm nguyên hàm F(x) trước; viết gạch đứng thế cận; tính F(b) rồi trừ F(a)."
  - **S:** "chú ý các hàm phân thức chứa ln: ln|b| - ln|a| = ln|b/a|."
  - **C:** "tính tích phân của hàm chứa dấu giá trị tuyệt đối bằng cách chia khoảng xét dấu."

- **Luồng M (Must) — hint: tìm nguyên hàm F(x) trước; viết gạch đứng thế cận; tính F(b) rồi trừ F(a).**
1. Tính tích phân I = ∫_0^2 4 dx.
   - **Đáp án:** I = 4 · (2 - 0) = 8.
2. Công thức Newton - Leibniz lấy F(a) trừ F(b) hay F(b) trừ F(a)?
   - **Đáp án:** Lấy F(b) trừ F(a) (cận trên trừ cận dưới).

- **Luồng S (Should) — hint: chú ý các hàm phân thức chứa ln: ln|b| - ln|a| = ln|b/a|.**
1. Tính tích phân: I = ∫_0^1 (2x + 3) dx.
   - **Đáp án:** F(x) = x² + 3x. I = F(1) - F(0) = (1 + 3) - 0 = 4.
2. Tính tích phân: I = ∫_0^1 e^(2x) dx.
   - **Đáp án:** F(x) = e^(2x)/2. I = e² / 2 - e⁰ / 2 = (e² - 1)/2.

- **Luồng C (Could) — hint: tính tích phân của hàm chứa dấu giá trị tuyệt đối bằng cách chia khoảng xét dấu.**
1. Tính tích phân: I = ∫_0^2 |x - 1| dx.
   - **Đáp án:** Chia thành 2 đoạn: ∫_0^1 (1 - x) dx + ∫_1^2 (x - 1) dx = (x - x²/2)|_0^1 + (x²/2 - x)|_1^2 = 1/2 + 1/2 = 1.
2. Tìm m dương để tích phân ∫_0^m (2x - 3) dx = 4.
   - **Đáp án:** Ta có F(x) = x² - 3x. F(m) - F(0) = m² - 3m = 4 <=> m² - 3m - 4 = 0 <=> m = 4 hoặc m = -1. Vì m > 0 nên chọn m = 4.

- **LookFor:** HS M tính đúng F(b)-F(a); HS S rút gọn logarit chuẩn; HS C phá đúng trị tuyệt đối.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tính tích phân: $I = \int_0^{\pi} \sin x dx$. → Nguyên hàm của $\sin x$ là $-\cos x$. Ta có: $I = -\cos x \Big|_0^{\pi} = -\cos(\pi) - [-\cos(0)] = -(-1) - (-1) = 1 + 1 = 2$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Công thức Newton - Leibniz: ∫_a^b f(x) dx = F(b) - F(a)" → **Đúng**
  - "Nguyên hàm F(x) trong công thức Newton bắt buộc phải cộng C" → **Sai — C luôn triệt tiêu nên chọn C = 0**
  - "∫_0^1 e^x dx = e - 1" → **Đúng (e¹ - e⁰ = e - 1)**
- **TeacherCue:** Đổi phiếu chấm chéo, chú ý dấu âm kép -(-1) = +1.

- **Câu 1:** Nếu f(x) ≥ 0 trên [a; b] với a < b thì tích phân ∫_a^b f(x) dx có thể âm được không? → Không thể âm, tích phân luôn ≥ 0.
- **Câu 2:** Tại sao Newton và Leibniz được coi là hai cha đẻ độc lập của giải tích? → Vì Newton tìm ra giải tích thông qua cơ học quang học ở Anh, còn Leibniz tìm ra thông qua hình học đại số ở Đức với hệ ký hiệu d và ∫ còn dùng đến ngày nay.
- **Chốt nhanh:** ∫_a^b f(x) dx = F(b) - F(a); Cận trên trừ cận dưới; Chọn C = 0 cho tiện.

- Máy thu GPS giải tích phân gia tốc hai lần liên tiếp theo công thức Newton - Leibniz để tính tọa độ tức thời của vệ tinh.
- Bộ điều khiển tên lửa SpaceX Falcon 9 tính toán lượng nhiên liệu tiêu hao chính xác từng mili-giây.
- Công thức Newton - Leibniz là trụ cột toán học đưa loài người bay vào không gian.
- **TeacherCue:** Hỏi: "Làm thế nào phi thuyền tự động biết được vị trí chính xác của nó khi bay xa khỏi Trái Đất?"

- **Exit Ticket (4 mục):**
  1. Phát biểu công thức Newton - Leibniz.
  2. Nêu 1 bẫy (lấy F(dưới) trừ F(trên) làm sai dấu kết quả).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tính ∫_1^3 2x dx.
- **TeacherCue (lớp yếu):** Nhìn lại tình huống phanh xe ô tô 50m.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tính tích phân I = ∫_0^2 4 dx.
   - **Đáp án:** I = 4 · (2 - 0) = 8.
2. `[NB]` Công thức Newton - Leibniz lấy F(a) trừ F(b) hay F(b) trừ F(a)?
   - **Đáp án:** Lấy F(b) trừ F(a) (cận trên trừ cận dưới).
3. `[TH]` Tính tích phân: I = ∫_0^1 (2x + 3) dx.
   - **Đáp án:** F(x) = x² + 3x. I = F(1) - F(0) = (1 + 3) - 0 = 4.
4. `[TH]` Tính tích phân: I = ∫_0^1 e^(2x) dx.
   - **Đáp án:** F(x) = e^(2x)/2. I = e² / 2 - e⁰ / 2 = (e² - 1)/2.
5. `[VD]` Tính tích phân: I = ∫_0^2 |x - 1| dx.
   - **Đáp án:** Chia thành 2 đoạn: ∫_0^1 (1 - x) dx + ∫_1^2 (x - 1) dx = (x - x²/2)|_0^1 + (x²/2 - x)|_1^2 = 1/2 + 1/2 = 1.
6. `[VD]` Tìm m dương để tích phân ∫_0^m (2x - 3) dx = 4.
   - **Đáp án:** Ta có F(x) = x² - 3x. F(m) - F(0) = m² - 3m = 4 <=> m² - 3m - 4 = 0 <=> m = 4 hoặc m = -1. Vì m > 0 nên chọn m = 4.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Thế ngược cận: lấy F(a) - F(b) làm đổi dấu kết quả.
- Quên dấu trừ khi nguyên hàm hàm lượng giác cos sang sin hoặc sin sang -cos.
- Nhầm ln(0) = 0 (ln 0 không xác định).

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
