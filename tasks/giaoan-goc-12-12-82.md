<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-82 — "Nguyên hàm — Tiết 3: Tính chất cơ bản của nguyên hàm" · Soạn ngày 2026-10-30 -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 3: Tính chất cơ bản của nguyên hàm)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 3: Tính chất cơ bản của nguyên hàm | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Vận dụng tính chất tuyến tính của đạo hàm $(k \cdot u)' = k \cdot u'$ và $(u \pm v)' = u' \pm v'$ để suy ra tính chất tuyến tính của nguyên hàm: $\int k f(x) dx = k \int f(x) dx$ ($k \neq 0$) và $\int [f(x) \pm g(x)] dx = \int f(x) dx \pm \int g(x) dx$.
- **Năng lực giải quyết vấn đề toán học:** Phân tích biểu thức hàm số phức tạp thành tổng các đơn thức/hàm số sơ cấp có trong bảng nguyên hàm; thiết lập phương trình xác định hằng số $C$ khi biết điều kiện ban đầu $F(x_0) = y_0$.
- **Năng lực giao tiếp toán học:** Nhận diện và phản biện chính xác sai lầm khi ngộ nhận nguyên hàm của tích bằng tích nguyên hàm hoặc tự ý đưa biến số ra ngoài dấu nguyên hàm.
- **Năng lực mô hình hóa toán học:** Ứng dụng tính chất nguyên hàm để tìm phương trình vận tốc tức thời $v(t) = \int a(t) dt$ và phương trình chuyển động $s(t) = \int v(t) dt$ với điều kiện thời điểm ban đầu $t = 0$.

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Nhận biết và phát biểu đúng 2 tính chất cơ bản của nguyên hàm; tính được nguyên hàm của đa thức bậc hai, bậc ba và tổng hai hàm số sơ cấp đơn giản.
- **Should (Trọng tâm - TH):** Vận dụng thành thạo tính chất tuyến tính để tính nguyên hàm của hàm phân thức hữu tỉ đơn giản (tách tử/chia đa thức), biến đổi lượng giác cơ bản; xác định duy nhất nguyên hàm $F(x)$ thỏa mãn điều kiện $F(x_0) = y_0$.
- **Could (Nâng cao - VD/VDC):** Giải quyết bài toán vật lý/kinh tế thực tế yêu cầu tích hợp liên tiếp (gia tốc $\to$ vận tốc $\to$ quãng đường); nhận biết khi nào cần dùng phương pháp đổi biến số hoặc từng phần thay vì áp dụng máy móc tính chất tuyến tính.

---

## II. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C).
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.

---

## III. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Mục tiêu:** Tái hiện công thức nguyên hàm sơ cấp từ Tiết 2, đặt tình huống tính nguyên hàm của tổng đa thức $f(x) = 3x^2 - 4x + \frac{5}{\cos^2 x}$.
- **Tình huống:** Cho hai bạn An và Bình cùng tính $\int (2x + \cos x) dx$:
  - An: Lấy đạo hàm thấy $(x^2 + \sin x)' = 2x + \cos x$ nên $\int (2x + \cos x) dx = x^2 + \sin x + C$.
  - Bình: Tách thành $2 \int x dx + \int \cos x dx = 2 \cdot \frac{x^2}{2} + \sin x + C = x^2 + \sin x + C$.
  - Câu hỏi: Quy tắc tách của Bình có luôn đúng cho mọi hàm số không? Liệu phép nhân $\int [f(x) \cdot g(x)] dx$ có tách được như vậy không?

### 2. Hoạt động 2: Hình thành kiến thức — Tính chất cơ bản (8 phút)
- **Định lý (Tính chất nguyên hàm):**
  1. $\int k f(x) dx = k \int f(x) dx$ với mọi hằng số $k \neq 0$.
  2. $\int [f(x) \pm g(x)] dx = \int f(x) dx \pm \int g(x) dx$.
- **Chú ý then chốt (Bẫy kinh điển):**
  - Không có tính chất $\int [f(x) \cdot g(x)] dx = \int f(x) dx \cdot \int g(x) dx$.
  - Tuyệt đối không đưa biến số chứa $x$ ra ngoài dấu nguyên hàm, ví dụ $\int x \cos x dx \neq x \int \cos x dx$.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:**
  Cho bài toán tìm nguyên hàm $I = \int x \cdot \sin x \, dx$. AI lập luận: "Áp dụng tính chất đưa thừa số ra ngoài dấu nguyên hàm, ta có $I = x \int \sin x \, dx = x(-\cos x) + C = -x \cos x + C$."
- **Nhiệm vụ HS:** Chỉ ra lỗi sai của AI, kiểm tra lại bằng đạo hàm $(-x\cos x + C)' = -\cos x + x \sin x \neq x \sin x$ và khẳng định $x$ là biến số tích phân, không phải hằng số.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng (8 phút)
- **Luồng Master (Must):**
  1. Tìm họ nguyên hàm $F(x) = \int (6x^2 - 4x + 3) dx$.
  2. Tìm họ nguyên hàm $G(x) = \int \left(3e^x - \frac{2}{x}\right) dx$ trên $(0; +\infty)$.
- **Luồng Support (Should):**
  1. Tìm nguyên hàm $F(x)$ của hàm số $f(x) = 4x^3 - 3\cos x + 1$ biết $F(0) = 5$.
  2. Tìm họ nguyên hàm $H(x) = \int \frac{2x^2 + 3x - 1}{x} dx$ trên $(0; +\infty)$ (kỹ năng tách phân thức).
- **Luồng Challenge (Could):**
  1. Một vật chuyển động thẳng với gia tốc $a(t) = 3t^2 - 2t + 4$ ($m/s^2$). Biết tại thời điểm $t = 0$, vận tốc ban đầu $v_0 = 5$ m/s và vật đang ở vị trí $s(0) = 10$ m. Xác định phương trình vận tốc $v(t)$ và phương trình quãng đường $s(t)$.
  2. Tìm nguyên hàm $F(x)$ của $f(x) = \cos^2 x$ thỏa mãn $F\left(\frac{\pi}{4}\right) = 0$ (kỹ năng hạ bậc $\cos^2 x = \frac{1 + \cos 2x}{2}$).

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- Câu hỏi bảng con kiểm tra trực tiếp khả năng nhận diện tính chất hợp lệ.

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- Ứng dụng tìm hàm chi phí biên và tổng chi phí trong kinh tế.
- Exit ticket củng cố 3 mốc kiểm tra trước khi kết thúc tiết học.
