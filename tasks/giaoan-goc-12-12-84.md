<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-84 — "Nguyên hàm — Tiết 5: Nguyên hàm của hàm số mũ" · Soạn ngày 2026-11-02 -->
<!-- Kế thừa: công thức lũy thừa + ln|x| từ Tiết 4 (`12-12-83`); tính chất tuyến tính từ Tiết 3 (`12-12-82`). -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 5: Nguyên hàm của hàm số mũ)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 5: Nguyên hàm của hàm số mũ | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Phân biệt hàm số mũ $y = a^x$ ($a > 0$, $a \neq 1$) với hàm số lũy thừa $y = x^{\alpha}$; kiểm chứng công thức $\left(\frac{a^x}{\ln a}\right)' = a^x$ bằng đạo hàm của hàm số mũ, từ đó thiết lập $\int a^x dx = \frac{a^x}{\ln a} + C$ và $\int e^x dx = e^x + C$.
- **Năng lực giải quyết vấn đề toán học:** Kết hợp tính chất tuyến tính (Tiết 3) với hai công thức hàm mũ để tính nguyên hàm của biểu thức chứa $e^x$, $2^x$, $3^x$; xác định hằng số $C$ theo điều kiện ban đầu $F(x_0) = y_0$.
- **Năng lực giao tiếp toán học:** Nhận diện và phản biện lỗi ngộ nhận hàm mũ là hàm lũy thừa (thay $x$ vào vị trí $\alpha$) và lỗi quên chia $\ln a$ khi lấy nguyên hàm $a^x$.
- **Năng lực mô hình hóa toán học:** Ứng dụng nguyên hàm hàm số mũ vào bài toán tổng doanh thu tăng theo cấp số nhân theo thời gian.

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Viết đúng 2 công thức $\int e^x dx = e^x + C$ và $\int a^x dx = \frac{a^x}{\ln a} + C$ ($a > 0$, $a \neq 1$); tính nguyên hàm của tổng đa thức và một hàm mũ đơn giản.
- **Should (Trọng tâm - TH):** Tính nguyên hàm của biểu thức tuyến tính kết hợp nhiều hàm mũ ($2e^x + 3^x$); tìm nguyên hàm thỏa mãn điều kiện ban đầu.
- **Could (Nâng cao - VD/VDC):** Giải bài toán thực tế tổng doanh thu/qui trình tăng trưởng $R'(t) = k \cdot 2^t$ với điều kiện $R(0) = 0$; nhận biết và phân tích cội nguồn công thức qua đạo hàm ngược.

---

## II. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C).
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.
- Máy tính Casio fx-580VN X để đối soát $2^t$, $\ln 2$.

---

## III. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống:** Cho hai bạn An và Bình cùng tìm nguyên hàm $I = \int 2^x dx$:
  - An: Áp dụng công thức Tiết 4 $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ với "biến" là $x$ ở số mũ, được $\frac{2^{x+1}}{x+1} + C$.
  - Bình: Nhớ đạo hàm $\left(\frac{2^x}{\ln 2}\right)' = 2^x$, nên $I = \frac{2^x}{\ln 2} + C$.
  - Câu hỏi: Ai đúng? $2^x$ khác $x^2$ ở điểm nào khiến công thức Tiết 4 không dùng được?
- **Bảng con ôn kiến thức (chờ hai nhịp):**
  1. `[PHÂN BIỆT]` $x^2$ và $2^x$ — hàm nào là hàm lũy thừa, hàm nào là hàm mũ?
  2. `[GHI NHỚ]` Nguyên hàm của $\frac{1}{x}$ (Tiết 4) là gì?
  3. `[KẾT NỐI]` Đạo hàm của $e^x$ là gì?
- **Câu hỏi thiết yếu giữ nguyên suốt tiết:** *"Nguyên hàm của hàm số mũ $a^x$ có dạng nào, và vì sao xuất hiện $\ln a$ ở mẫu?"*

### 2. Hoạt động 2: Hình thành kiến thức — Công thức nguyên hàm hàm số mũ (8 phút)
- **Công thức 1:** $\int e^x dx = e^x + C$.
- **Công thức 2:** $\int a^x dx = \frac{a^x}{\ln a} + C$ với $a > 0$, $a \neq 1$.
- **Kiểm chứng bằng đạo hàm:** $\left(\frac{a^x}{\ln a}\right)' = \frac{1}{\ln a} \cdot a^x \ln a = a^x$; riêng $e$ có $\ln e = 1$ nên $\int e^x dx = e^x + C$.
- **Chú ý then chốt (Bẫy kinh điển):**
  - Hàm mũ $a^x$ (biến ở số mũ) khác hàm lũy thừa $x^{\alpha}$ (biến ở cơ số) — không thay thế công thức lẫn giữa hai nhóm.
  - Không quên chia $\ln a$: $\int 3^x dx = \frac{3^x}{\ln 3} + C$, không phải $3^x + C$.
  - $e^x$ là trường hợp riêng $a = e$ vì $\ln e = 1$.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:**
  Cho bài toán tìm nguyên hàm $I = \int 3^x dx$. AI lập luận: "Hàm $3^x$ là hàm số mũ có đạo hàm bằng chính nó (giống $e^x$), nên nguyên hàm của $3^x$ là $3^x + C$."
- **Nhiệm vụ HS:** Chỉ ra lỗi sai của AI: chỉ $e^x$ mới có đạo hàm bằng chính nó; với $a \neq e$ phải chia $\ln a$. Kiểm chứng: $\left(3^x + C\right)' = 3^x \ln 3 \neq 3^x$; đáp án đúng $\frac{3^x}{\ln 3} + C$.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng (8 phút)
- **Luồng Master (Must):**
  1. Tìm họ nguyên hàm $\int (x^2 + e^x) dx$.
  2. Tìm họ nguyên hàm $\int 5^x dx$.
- **Luồng Support (Should):**
  1. Tìm họ nguyên hàm $\int (2e^x + 3^x) dx$.
  2. Tìm nguyên hàm $F(x)$ của $f(x) = e^x - 2^x$ biết $F(0) = 3$.
- **Luồng Challenge (Could):**
  1. Một cửa hàng có doanh thu tăng theo cấp số nhân với tốc độ $R'(t) = 3 \cdot 2^t$ (triệu đồng/ngày), $t$ là số ngày bán. Biết tổng doanh thu tích lũy tại thời điểm khởi mở $t = 0$ bằng 0. Tìm hàm tổng doanh thu $R(t)$ và tính tổng doanh thu sau 3 ngày (làm tròn 2 chữ số thập phân).
  2. Tìm họ nguyên hàm $\int \frac{e^x + 2^x}{2} dx$ và kiểm chứng kết quả bằng đạo hàm.

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- Bảng con/trắc nghiệm máy: chọn nhanh công thức $e^x$ vs $\frac{a^x}{\ln a}$; phát hiện lỗi quên $\ln a$.

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- Bài toán doanh thu (luồng Challenge) mang ra thảo luận chung: ý nghĩa $\frac{2^t - 1}{\ln 2}$ trong tăng trưởng kép.
- Đối soát Casio: tính $\frac{3 \cdot 2^3 - 3}{\ln 2} = \frac{21}{\ln 2} \approx 30{,}30$ triệu đồng.
- Exit ticket củng cố 2 công thức và bẫy kinh điển.

---

## IV. KIẾN THỨC BẢNG (tóm tắt)
1. $\int e^x dx = e^x + C$; $\int a^x dx = \frac{a^x}{\ln a} + C$ ($a > 0$, $a \neq 1$).
2. Hàm mũ ($a^x$ — biến ở mũ) khác hàm lũy thừa ($x^{\alpha}$ — biến ở cơ số): hai nhóm công thức riêng.
3. Chỉ $e^x$ có đạo hàm bằng chính nó; với $a \neq e$ phải chia $\ln a$.
4. Kết hợp tuyến tính (Tiết 3) → chọn công thức → tìm $C$ theo điều kiện ban đầu.
