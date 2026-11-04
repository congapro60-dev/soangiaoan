# KẾ HOẠCH DẠY HỌC — Giới hạn một bên của hàm số (Toán 11 · Tuần 13 · Tiết 93)

| Lớp | 11 | Tên bài học | Giới hạn một bên của hàm số | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-13-93.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu định nghĩa giới hạn bên phải lim_{x -> x0+} f(x) và giới hạn bên trái lim_{x -> x0-} f(x).
- **Should (Trọng tâm – Thông hiểu):** Nắm vững điều kiện cần và đủ để hàm số có giới hạn tại một điểm: lim_{x -> x0+} = lim_{x -> x0-} = L.
- **Could (Nâng cao – Vận dụng):** Tính giới hạn một bên của hàm số phân nhánh (hàm cho bởi nhiều công thức) và hàm chứa dấu giá trị tuyệt đối.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Mô hình bật công tắc cấp nguồn vi mạch điện tử:**
- Cường độ dòng điện $I(t)$ (ampe) theo thời gian $t$ (giây) tại thời điểm đóng mạch $t = 0$:
  $$I(t) = \begin{cases} 0 & \text{nếu } t < 0 \text{ (trước khi bật)} \\ 5 & \text{nếu } t \ge 0 \text{ (sau khi bật)} \end{cases}$$
- Khảo sát giới hạn khi $t$ tiến tới $0$ từ hai phía:
  - Bên trái ($t \to 0^-$ nghĩa là $t < 0$): $I(t) = 0 \implies \lim_{t \to 0^-} I(t) = 0$.
  - Bên phải ($t \to 0^+$ nghĩa là $t > 0$): $I(t) = 5 \implies \lim_{t \to 0^+} I(t) = 5$.
- Vì giới hạn bên trái ($0$) khác giới hạn bên phải ($5$) nên **không tồn tại giới hạn hai bên** $\lim_{t \to 0} I(t)$.
- **Định lý then chốt:**
  $$\lim_{x \to x_0} f(x) = L \iff \lim_{x \to x_0^+} f(x) = \lim_{x \to x_0^-} f(x) = L.$$

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Trước t=0 dòng điện bằng 0A; sau t=0 dòng điện nhảy lên 5A.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Hàm số dòng điện I(t) có giới hạn khi t tiến về 0 không?*
  - (A) Không tồn tại (vì giới hạn trái khác giới hạn phải)
  - (B) Có giới hạn bằng 5A
  - (C) Có giới hạn bằng 2,5A
  - **Correct: (A)** — Giới hạn trái bằng 0 khác giới hạn phải bằng 5 nên theo định lý không tồn tại giới hạn tại điểm 0.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Nếu thay đổi giá trị I(0) = 10 thì giới hạn một bên có đổi không?
  2. `[SO SÁNH]` Hàm số y = |x|/x có giới hạn tại 0 không?
- **TeacherCue (lớp yếu):** Vẽ đồ thị bậc thang có bước nhảy đứt đoạn tại điểm x = 0.
- **LookFor:** HS nhận diện hai giới hạn một bên khác nhau.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu định nghĩa giới hạn bên phải lim_{x -> x0+} f(x) và giới hạn bên trái lim_{x -> x0-} f(x).
- **Should:** Nắm vững điều kiện cần và đủ để hàm số có giới hạn tại một điểm: lim_{x -> x0+} = lim_{x -> x0-} = L.
- **Could:** Tính giới hạn một bên của hàm số phân nhánh (hàm cho bởi nhiều công thức) và hàm chứa dấu giá trị tuyệt đối.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Điều kiện cần và đủ để tồn tại giới hạn lim_{x -> x0} f(x) là gì?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Giới hạn bên phải: $x \to x_0^+$ nghĩa là $x > x_0$ và $x \to x_0$.
- **Bước 2:** Giới hạn bên trái: $x \to x_0^-$ nghĩa là $x < x_0$ và $x \to x_0$.
- **Bước 3:** Định lý tồn tại: $\lim_{x \to x_0} f(x) = L \iff \lim_{x \to x_0^+} f(x) = \lim_{x \to x_0^-} f(x) = L$.
- **Bước 4:** Hàm phân nhánh: Chọn đúng công thức tương ứng với miền $x > x_0$ hoặc $x < x_0$ để tính.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Khi phá dấu giá trị tuyệt đối |x - 2| với x -> 2+ ta được gì?
  2. `[PHÁT HIỆN]` Nếu chỉ có một trong hai giới hạn một bên tồn tại thì có giới hạn hai bên không?
- **TeacherCue (lớp yếu):** Bảng đối chiếu x -> x0+ (x > x0) và x -> x0- (x < x0).
- **Chốt:** Muốn có giới hạn tại x0 thì hai nhánh trái và phải phải \"hàn gắn\" gặp nhau tại cùng một giá trị L.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Cho f(x) = { 3x khi x > 1; 2x + 1 khi x < 1 }. Tính lim_{x -> 1+} f(x) = 3 nên kết luận luôn lim_{x -> 1} f(x) = 3."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Cho f(x) = { 2x + 1 khi x > 1; x² khi x ≤ 1 }. AI tính f(1) = 1 và kết luận ngay lim_{x -> 1} f(x) = 1.
  2. Bằng chứng: Hàm phân nhánh không được lấy giá trị tại điểm f(1) làm giới hạn. Phải tính cả hai giới hạn một bên.
  3. Sửa: Giới hạn phải: lim_{x -> 1+} (2x + 1) = 3. Giới hạn trái: lim_{x -> 1-} (x²) = 1. Vì 3 ≠ 1 nên không tồn tại lim_{x -> 1} f(x).
- **TeacherCue:** Vẽ hai nhánh đồ thị: một nhánh tiến về 3, một nhánh tiến về 1, không gặp nhau.
- **LookFor:** HS chỉ ra phải kiểm tra cả hai phía trái và phải.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "x -> x0+ chọn công thức x > x0; x -> x0- chọn công thức x < x0."
  - **S:** "với hàm chứa |x - x0|: x > x0 thì |x - x0| = x - x0; x < x0 thì |x - x0| = -(x - x0)."
  - **C:** "tìm tham số m để hai giới hạn một bên bằng nhau để hàm số có giới hạn."

- **Luồng M (Must) — hint: x -> x0+ chọn công thức x > x0; x -> x0- chọn công thức x < x0.**
1. Ký hiệu x -> 3- có nghĩa là gì?
   - **Đáp án:** Có nghĩa là x tiến dần tới 3 và luôn nhỏ hơn 3 (x < 3).
2. Biết lim_{x -> 2+} f(x) = 4 và lim_{x -> 2-} f(x) = 4. Hỏi lim_{x -> 2} f(x) bằng bao nhiêu?
   - **Đáp án:** Bằng 4 theo định lý tồn tại giới hạn.

- **Luồng S (Should) — hint: với hàm chứa |x - x0|: x > x0 thì |x - x0| = x - x0; x < x0 thì |x - x0| = -(x - x0).**
1. Cho f(x) = 2x với x > 0 và f(x) = 1 với x ≤ 0. Hàm số có giới hạn tại x = 0 không?
   - **Đáp án:** lim_{x -> 0+} f(x) = 0; lim_{x -> 0-} f(x) = 1. Vì 0 ≠ 1 nên hàm số KHÔNG có giới hạn tại x = 0.
2. Tính lim_{x -> 3-} (2x - 1).
   - **Đáp án:** Thay x = 3: 2·3 - 1 = 5.

- **Luồng C (Could) — hint: tìm tham số m để hai giới hạn một bên bằng nhau để hàm số có giới hạn.**
1. Tìm m để hàm số f(x) = { mx + 1 khi x ≤ 2; x² - 3 khi x > 2 } có giới hạn tại x = 2.
   - **Đáp án:** lim_{x -> 2+} f(x) = 2² - 3 = 1. lim_{x -> 2-} f(x) = 2m + 1. Hàm số có giới hạn tại x = 2 <=> 2m + 1 = 1 <=> 2m = 0 <=> m = 0.
2. Tính giới hạn một bên: lim_{x -> 1-} (x + 1)/(x - 1).
   - **Đáp án:** Khi x -> 1- thì tử tiến về 1 + 1 = 2 > 0, mẫu tiến về 0 và mẫu âm (x - 1 < 0 vì x < 1). Do đó giới hạn bằng -∞.

- **LookFor:** HS M chọn đúng công thức; HS S phá đúng trị tuyệt đối; HS C tìm đúng tham số m.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho $f(x) = \dfrac{|x - 2|}{x - 2}$. Tính $\lim_{x \to 2^+} f(x)$ và $\lim_{x \to 2^-} f(x)$. → Khi $x \to 2^+ (x > 2)$: $|x - 2| = x - 2 \implies f(x) = 1 \implies \lim = 1$. Khi $x \to 2^- (x < 2)$: $|x - 2| = -(x - 2) \implies f(x) = -1 \implies \lim = -1$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - \"x -> 2+ nghĩa là x nhận các giá trị lớn hơn 2\" → **Đúng**
  - \"Nếu giới hạn trái khác giới hạn phải thì không tồn tại giới hạn tại điểm đó\" → **Đúng**
  - \"lim_{x -> 0} (|x|/x) = 1\" → **Sai — không tồn tại (trái ra -1, phải ra 1)**
- **TeacherCue:** Đổi phiếu chấm chéo, chú ý dấu âm khi x < 2.

- **Câu 1:** Nếu hàm số không xác định tại x0 thì có thể có giới hạn một bên tại x0 không? → Có thể, hàm số chỉ cần xác định trên khoảng (x0; x0 + h) hoặc (x0 - h; x0).
- **Câu 2:** lim_{x -> 0+} (1/x) bằng bao nhiêu? → Bằng +∞ vì tử dương và mẫu tiến về 0 từ phía dương.
- **Chốt nhanh:** x -> x0+ là x > x0; x -> x0- là x < x0; Giới hạn tồn tại <=> Trái = Phải = L.

- Hàm bước nhảy Heaviside u(t) = 0 (t < 0) và u(t) = 1 (t ≥ 0) là tín hiệu kích hoạt chuẩn trong kỹ thuật điện tử.
- Giới hạn một bên mô tả chính xác sự chuyển đổi trạng thái của cổng logic và rơ-le bán dẫn.
- Mô hình hóa xung tín hiệu trong mạng viễn thông dựa trên các hàm gián đoạn này.
- **TeacherCue:** Hỏi: \"Tại sao tín hiệu số Digital chỉ nhận hai mức 0 và 1 mà không có trạng thái lơ lửng ở giữa?\"

- **Exit Ticket (4 mục):**
  1. Nêu điều kiện để hàm số có giới hạn tại x0.
  2. Nêu 1 bẫy (lấy f(x0) làm giới hạn của hàm phân nhánh mà không xét 2 bên).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tính lim_{x -> 0+} (1/x) và lim_{x -> 0-} (1/x).
- **TeacherCue (lớp yếu):** Nhìn lại đồ thị cường độ dòng điện bật công tắc.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Ký hiệu x -> 3- có nghĩa là gì?
   - **Đáp án:** Có nghĩa là x tiến dần tới 3 và luôn nhỏ hơn 3 (x < 3).
2. `[NB]` Biết lim_{x -> 2+} f(x) = 4 và lim_{x -> 2-} f(x) = 4. Hỏi lim_{x -> 2} f(x) bằng bao nhiêu?
   - **Đáp án:** Bằng 4 theo định lý tồn tại giới hạn.
3. `[TH]` Cho f(x) = 2x với x > 0 và f(x) = 1 với x ≤ 0. Hàm số có giới hạn tại x = 0 không?
   - **Đáp án:** lim_{x -> 0+} f(x) = 0; lim_{x -> 0-} f(x) = 1. Vì 0 ≠ 1 nên hàm số KHÔNG có giới hạn tại x = 0.
4. `[TH]` Tính lim_{x -> 3-} (2x - 1).
   - **Đáp án:** Thay x = 3: 2·3 - 1 = 5.
5. `[VD]` Tìm m để hàm số f(x) = { mx + 1 khi x ≤ 2; x² - 3 khi x > 2 } có giới hạn tại x = 2.
   - **Đáp án:** lim_{x -> 2+} f(x) = 2² - 3 = 1. lim_{x -> 2-} f(x) = 2m + 1. Hàm số có giới hạn tại x = 2 <=> 2m + 1 = 1 <=> 2m = 0 <=> m = 0.
6. `[VD]` Tính giới hạn một bên: lim_{x -> 1-} (x + 1)/(x - 1).
   - **Đáp án:** Khi x -> 1- thì tử tiến về 1 + 1 = 2 > 0, mẫu tiến về 0 và mẫu âm (x - 1 < 0 vì x < 1). Do đó giới hạn bằng -∞.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Nhầm ký hiệu x -> x0+ là x tiến tới số dương.
- Quên đổi dấu khi phá trị tuyệt đối với x < x0.
- Kết luận có giới hạn mà chỉ mới tính một bên.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
