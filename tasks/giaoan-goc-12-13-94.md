# KẾ HOẠCH DẠY HỌC — Tính chất tuyến tính và cộng đoạn tích phân (Toán 12 · Tuần 13 · Tiết 94)

| Lớp | 12 | Tên bài học | Tính chất tuyến tính và cộng đoạn tích phân | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-13-94.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Nắm vững tính chất tuyến tính: ∫ [k f(x) ± m g(x)] dx = k ∫ f(x) dx ± m ∫ g(x) dx; tính chất cộng đoạn: ∫_a^b = ∫_a^c + ∫_c^b (chèn cận c).
- **Should (Trọng tâm – Thông hiểu):** Áp dụng tính chất chèn cận để tính tích phân các hàm số phân nhánh và hàm số chứa dấu giá trị tuyệt đối.
- **Could (Nâng cao – Vận dụng):** Chứng minh bất đẳng thức tích phân: nếu f(x) ≤ g(x) trên [a; b] thì ∫_a^b f(x) dx ≤ ∫_a^b g(x) dx.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Mô hình tính lượng nước xả qua đập thủy điện Hòa Bình qua hai ca trực:**
- Lưu lượng nước xả qua tổ máy thủy điện trong 24 giờ chia làm 2 giai đoạn:
  - Ca 1 (từ $t = 0$ đến $t = 8$ giờ): $q_1(t) = 100 + 10t$ ($m^3/s$).
  - Ca 2 (từ $t = 8$ đến $t = 24$ giờ): $q_2(t) = 180$ ($m^3/s$ không đổi).
- Tổng lượng nước xả trong cả ngày ($0 \to 24$ giờ):
  $$V = \int_0^{24} q(t) dt = \int_0^8 q_1(t) dt + \int_8^{24} q_2(t) dt.$$
- Tính từng tích phân thành phần:
  - $V_1 = \int_0^8 (100 + 10t) dt = (100t + 5t^2)\Big|_0^8 = 800 + 320 = 1120$ đơn vị.
  - $V_2 = \int_8^{24} 180 dt = 180(24 - 8) = 180 \cdot 16 = 2880$ đơn vị.
- Tổng lượng nước xả: $V = 1120 + 2880 = 4000$ đơn vị thể tích.
- **Tính chất cộng đoạn:** $\int_a^b f(x) dx = \int_a^c f(x) dx + \int_c^b f(x) dx$ đúng với mọi điểm $c$ bất kỳ thuộc tập xác định.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Hàm lưu lượng gãy khúc tại điểm t = 8 giờ. Ta tách thành hai tích phân từ 0 đến 8 và từ 8 đến 24.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Tổng lượng nước xả trong cả ngày tính bằng công thức nào?*
  - (A) ∫_0^8 q1(t) dt + ∫_8^24 q2(t) dt
  - (B) ∫_0^24 [q1(t) + q2(t)] dt
  - (C) Chỉ cần tính ∫_8^24 q2(t) dt
  - **Correct: (A)** — Theo tính chất cộng đoạn của tích phân, tích phân trên đoạn [0; 24] bằng tổng tích phân trên [0; 8] và [8; 24].
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Điểm nối t = 8 có cần liên tục không?
  2. `[SO SÁNH]` Tính chất cộng đoạn tích phân tương ứng với tính chất cộng đoạn thẳng nào?
- **TeacherCue (lớp yếu):** Vẽ đồ thị lưu lượng gồm hai đoạn thẳng nối nhau tại điểm x = 8.
- **LookFor:** HS nhận ra công thức chèn cận tích phân.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Nắm vững tính chất tuyến tính: ∫ [k f(x) ± m g(x)] dx = k ∫ f(x) dx ± m ∫ g(x) dx; tính chất cộng đoạn: ∫_a^b = ∫_a^c + ∫_c^b (chèn cận c).
- **Should:** Áp dụng tính chất chèn cận để tính tích phân các hàm số phân nhánh và hàm số chứa dấu giá trị tuyệt đối.
- **Could:** Chứng minh bất đẳng thức tích phân: nếu f(x) ≤ g(x) trên [a; b] thì ∫_a^b f(x) dx ≤ ∫_a^b g(x) dx.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Điểm chèn c trong công thức ∫_a^b = ∫_a^c + ∫_c^b có bắt buộc phải nằm giữa a và b không?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Tính chất 1 (Hằng số đưa ra ngoài): $\int_a^b k f(x) dx = k \int_a^b f(x) dx$ ($k$ là hằng số thực).
- **Bước 2:** Tính chất 2 (Tuyến tính tổng/hiệu): $\int_a^b [f(x) \pm g(x)] dx = \int_a^b f(x) dx \pm \int_a^b g(x) dx$.
- **Bước 3:** Tính chất 3 (Cộng đoạn / chèn cận): $\int_a^b f(x) dx = \int_a^c f(x) dx + \int_c^b f(x) dx$ ($c$ tùy ý).
- **Bước 4:** Tính chất 4 (Bảo toàn thứ tự): Nếu $f(x) \ge 0$ trên $[a; b]$ ($a < b$) thì $\int_a^b f(x) dx \ge 0$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Biểu thức ∫_1^5 f(x) dx - ∫_2^5 f(x) dx rút gọn thành gì?
  2. `[PHÁT HIỆN]` Khi nào thì phải chèn cận để tính tích phân có dấu giá trị tuyệt đối |x - a|?
- **TeacherCue (lớp yếu):** Quy tắc chèn cận: đuôi của tích phân trước là đầu của tích phân sau.
- **Chốt:** Tích phân có tính tuyến tính và cộng đoạn; muốn phá trị tuyệt đối bắt buộc phải chèn nghiệm của biểu thức.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Cho ∫_0^1 f(x) dx = 2 và ∫_0^1 g(x) dx = 3. Tính ∫_0^1 f(x)g(x) dx = [∫_0^1 f(x) dx] · [∫_0^1 g(x) dx] = 2 · 3 = 6."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Cho ∫_1^2 f(x) dx = 3 và ∫_1^4 f(x) dx = 7. Tính ∫_2^4 f(x) dx. AI viết: ∫_2^4 = ∫_1^2 + ∫_1^4 = 3 + 7 = 10.
  2. Bằng chứng: Áp dụng sai công thức cộng đoạn. Công thức đúng: ∫_1^4 = ∫_1^2 + ∫_2^4. Do đó ∫_2^4 = ∫_1^4 - ∫_1^2.
  3. Sửa: Sửa lại: ∫_2^4 f(x) dx = ∫_1^4 f(x) dx - ∫_1^2 f(x) dx = 7 - 3 = 4.
- **TeacherCue:** Nhắc lại: Chèn cận 2 vào giữa 1 và 4: Đoạn lớn bằng tổng hai đoạn nhỏ.
- **LookFor:** HS chỉ ra phép trừ thay vì phép cộng.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "áp dụng ∫_a^b = ∫_a^c + ∫_c^b; chú ý cận dưới và cận trên nối tiếp nhau."
  - **S:** "tách tích phân tổng thành tổng hai tích phân; đưa hệ số k ra ngoài."
  - **C:** "tìm nghiệm của biểu thức trong dấu giá trị tuyệt đối rồi chèn nghiệm đó làm cận trung gian."

- **Luồng M (Must) — hint: áp dụng ∫_a^b = ∫_a^c + ∫_c^b; chú ý cận dưới và cận trên nối tiếp nhau.**
1. Nếu ∫_1^4 f(x) dx = 6 thì ∫_1^4 3 f(x) dx bằng bao nhiêu?
   - **Đáp án:** Bằng 3 · 6 = 18.
2. Tính ∫_1^5 f(x) dx biết ∫_1^3 f = 4 và ∫_3^5 f = 5.
   - **Đáp án:** Bằng 4 + 5 = 9.

- **Luồng S (Should) — hint: tách tích phân tổng thành tổng hai tích phân; đưa hệ số k ra ngoài.**
1. Cho ∫_0^1 f(x) dx = 2, ∫_0^1 g(x) dx = -3. Tính I = ∫_0^1 [2f(x) + g(x)] dx.
   - **Đáp án:** I = 2(2) + (-3) = 4 - 3 = 1.
2. Cho ∫_1^6 f(x) dx = 12 và ∫_3^6 f(x) dx = 8. Tính ∫_1^3 f(x) dx.
   - **Đáp án:** ∫_1^3 = ∫_1^6 - ∫_3^6 = 12 - 8 = 4.

- **Luồng C (Could) — hint: tìm nghiệm của biểu thức trong dấu giá trị tuyệt đối rồi chèn nghiệm đó làm cận trung gian.**
1. Tính tích phân: I = ∫_{-1}^2 |2x - 1| dx.
   - **Đáp án:** Nghiệm x = 1/2. I = ∫_{-1}^{1/2} (1 - 2x) dx + ∫_{1/2}^2 (2x - 1) dx = (x - x²)|_{-1}^{1/2} + (x² - x)|_{1/2}^2 = [1/4 - (-2)] + [(4 - 2) - (-1/4)] = 9/4 + 9/4 = 18/4 = 9/2.
2. Cho hàm số f(x) liên tục thỏa mãn ∫_0^6 f(x) dx = 10. Tính I = ∫_0^2 f(3x) dx.
   - **Đáp án:** Đặt u = 3x => du = 3 dx <=> dx = du/3. Đổi cận: x = 0 => u = 0; x = 2 => u = 6. Khi đó I = ∫_0^6 f(u) (du/3) = (1/3) ∫_0^6 f(u) du = 10/3.

- **LookFor:** HS M chèn đúng cận; HS S đưa đúng hệ số ra ngoài; HS C phá đúng trị tuyệt đối.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho $\int_0^3 f(x) dx = 5$ và $\int_0^3 g(x) dx = 2$. Tính $I = \int_0^3 [3f(x) - 4g(x)] dx$. → Theo tính chất tuyến tính: $I = 3 \int_0^3 f(x) dx - 4 \int_0^3 g(x) dx = 3(5) - 4(2) = 15 - 8 = 7$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "∫_a^b f(x) dx = ∫_a^c f(x) dx + ∫_c^b f(x) dx với mọi c" → **Đúng**
  - "∫_a^b [f(x) · g(x)] dx = [∫_a^b f(x) dx] · [∫_a^b g(x) dx]" → **Sai — tích phân của tích không bằng tích các tích phân**
  - "∫_a^b k dx = k(b - a)" → **Đúng**
- **TeacherCue:** Đổi phiếu chấm chéo, kiểm tra kết quả tính 15 - 8 = 7.

- **Câu 1:** Có bao giờ ∫_a^b [f(x) · g(x)] dx = [∫_a^b f(x) dx] · [∫_a^b g(x) dx] không? → Hầu như không bao giờ bằng nhau (chỉ là trường hợp ngẫu nhiên vô cùng hy hữu), tích phân không nhân phân phối được.
- **Câu 2:** Nếu a > b thì tính chất cộng đoạn có còn đúng không? → Vẫn đúng hoàn toàn, công thức ∫_a^b = ∫_a^c + ∫_c^b đúng với mọi vị trí của a, b, c.
- **Chốt nhanh:** Tuyến tính: ∫(3f - 4g) = 3∫f - 4∫g; Cộng đoạn: ∫_a^b = ∫_a^c + ∫_c^b; Trị tuyệt đối: chèn nghiệm.

- Biểu giá điện sinh hoạt bậc thang (bậc 1 đến bậc 6) là hàm số từng khúc liên tục.
- Hệ thống phần mềm EVN tính hóa đơn tiền điện hàng tháng bằng phương pháp cộng đoạn tích phân từng mức tiêu thụ.
- Toán học tích phân bậc thang đảm bảo tính minh bạch và công bằng tài chính.
- **TeacherCue:** Hỏi: "Tại sao dùng càng nhiều điện thì đơn giá tiền điện cho mỗi kWh vượt định mức lại càng tăng cao?"

- **Exit Ticket (4 mục):**
  1. Nêu tính chất tuyến tính của tích phân.
  2. Nêu 1 bẫy (nhầm tích phân của tích bằng tích hai tích phân).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Cho ∫_1^3 f = 2, ∫_3^5 f = 4. Tính ∫_1^5 f.
- **TeacherCue (lớp yếu):** Nhìn lại tình huống xả nước thủy điện Hòa Bình.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nếu ∫_1^4 f(x) dx = 6 thì ∫_1^4 3 f(x) dx bằng bao nhiêu?
   - **Đáp án:** Bằng 3 · 6 = 18.
2. `[NB]` Tính ∫_1^5 f(x) dx biết ∫_1^3 f = 4 và ∫_3^5 f = 5.
   - **Đáp án:** Bằng 4 + 5 = 9.
3. `[TH]` Cho ∫_0^1 f(x) dx = 2, ∫_0^1 g(x) dx = -3. Tính I = ∫_0^1 [2f(x) + g(x)] dx.
   - **Đáp án:** I = 2(2) + (-3) = 4 - 3 = 1.
4. `[TH]` Cho ∫_1^6 f(x) dx = 12 và ∫_3^6 f(x) dx = 8. Tính ∫_1^3 f(x) dx.
   - **Đáp án:** ∫_1^3 = ∫_1^6 - ∫_3^6 = 12 - 8 = 4.
5. `[VD]` Tính tích phân: I = ∫_{-1}^2 |2x - 1| dx.
   - **Đáp án:** Nghiệm x = 1/2. I = ∫_{-1}^{1/2} (1 - 2x) dx + ∫_{1/2}^2 (2x - 1) dx = (x - x²)|_{-1}^{1/2} + (x² - x)|_{1/2}^2 = [1/4 - (-2)] + [(4 - 2) - (-1/4)] = 9/4 + 9/4 = 18/4 = 9/2.
6. `[VD]` Cho hàm số f(x) liên tục thỏa mãn ∫_0^6 f(x) dx = 10. Tính I = ∫_0^2 f(3x) dx.
   - **Đáp án:** Đặt u = 3x => du = 3 dx <=> dx = du/3. Đổi cận: x = 0 => u = 0; x = 2 => u = 6. Khi đó I = ∫_0^6 f(u) (du/3) = (1/3) ∫_0^6 f(u) du = 10/3.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Tự ý nhân hai tích phân với nhau khi gặp tích phân của một tích.
- Cộng nhầm cận: lấy ∫_1^3 + ∫_2^4 thành ∫_1^4 (hai khoảng chia không khớp nhau).
- Quên đổi dấu biểu thức khi phá trị tuyệt đối trên miền âm.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
