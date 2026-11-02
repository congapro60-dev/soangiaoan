<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-83 — "Nguyên hàm — Tiết 4: Nguyên hàm của hàm số lũy thừa" · Soạn ngày 2026-11-01 -->
<!-- Kế thừa: tính chất tuyến tính từ Tiết 3 (`12-12-82`); bảng nguyên hàm sơ cấp từ Tiết 2 (`12-11-77`). -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 4: Nguyên hàm của hàm số lũy thừa)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 4: Nguyên hàm của hàm số lũy thừa | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Phát hiện điều kiện của công thức $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ chỉ áp dụng khi $\alpha \neq -1$; suy ra trường hợp đặc biệt $\int \frac{1}{x} dx = \ln|x| + C$ bằng cách nhận xét đạo hàm của $\ln|x|$ là $\frac{1}{x}$ trên từng nửa mặt phẳng $x > 0$ hoặc $x < 0$.
- **Năng lực giải quyết vấn đề toán học:** Biến đổi biểu thức chứa căn thức và phân thức về dạng lũy thừa $x^{\alpha}$ ($\alpha \in \mathbb{Q}$) rồi tính nguyên hàm; tách phân thức thành tổng các đơn thức trước khi áp dụng công thức; xác định hằng số $C$ theo điều kiện ban đầu trên miền xác định.
- **Năng lực giao tiếp toán học:** Nhận diện và phản biện lỗi áp dụng công thức cho $\alpha = -1$ (chia cho 0) và lỗi viết $\ln x$ thay vì $\ln|x|$ khi chưa nêu miền xác định.
- **Năng lực mô hình hóa toán học:** Ứng dụng nguyên hàm hàm lũy thừa vào bài toán chi phí biên — tổng chi phí với dữ liệu thực tiễn.

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Viết đúng 2 công thức $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ ($\alpha \neq -1$) và $\int \frac{dx}{x} = \ln|x| + C$; tính nguyên hàm của đa thức, căn thức đơn giản ($\sqrt{x}$), và $\frac{1}{x^2}$.
- **Should (Trọng tâm - TH):** Tính nguyên hàm của phân thức tách được thành tổng đơn thức và $\frac{1}{x}$; viết điều kiện xác định (trên $(0; +\infty)$ hoặc $(-\infty; 0)$); tìm nguyên hàm thỏa mãn điều kiện ban đầu $F(x_0) = y_0$.
- **Could (Nâng cao - VD/VDC):** Tính nguyên hàm của biểu thức cần khai triển rồi quy về lũy thừa phân số $(\frac{(2x-1)^2}{\sqrt{x}})$; giải bài toán thực tế chi phí biên chứa $\frac{1}{x}$; giải thích vì sao $\alpha = -1$ buộc dùng $\ln|x|$.

---

## II. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C).
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.

---

## III. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống:** Cho hai bạn An và Bình cùng tìm nguyên hàm $I = \int \frac{dx}{x}$ ($x \neq 0$):
  - An: Áp dụng công thức $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ với $\alpha = -1$, được $\frac{x^0}{0} + C$ — "kết quả không xác định, vậy hàm $\frac{1}{x}$ không có nguyên hàm".
  - Bình: Nhớ đạo hàm $(\ln|x|)' = \frac{1}{x}$ trên từng khoảng $x > 0$ và $x < 0$, nên $I = \ln|x| + C$.
  - Câu hỏi: Ai đúng? Vì sao công thức lũy thừa "hụt" đúng tại $\alpha = -1$?
- **Câu hỏi thiết yếu giữ nguyên suốt tiết:** *"Công thức $\int x^{\alpha} dx$ dùng được khi nào, và khi $\alpha = -1$ thì nguyên hàm nằm ở đâu?"*

### 2. Hoạt động 2: Hình thành kiến thức — Công thức nguyên hàm hàm số lũy thừa (8 phút)
- **Công thức 1:** $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ với mọi $\alpha \in \mathbb{Q}, \alpha \neq -1$.
- **Công thức 2 (trường hợp $\alpha = -1$):** $\int \frac{1}{x} dx = \ln|x| + C$ với $x \neq 0$.
  - Trên miền $(0; +\infty)$: $\int \frac{dx}{x} = \ln x + C$; trên miền $(-\infty; 0)$: $\int \frac{dx}{x} = \ln(-x) + C$.
- **Chú ý then chốt (Bẫy kinh điển):**
  - Tuyệt đối không thay $\alpha = -1$ vào công thức 1 (mẫu số bằng 0).
  - Viết $\ln|x|$ khi chưa biết dấu của $x$; chỉ viết $\ln x$ sau khi nêu điều kiện $x > 0$.
  - Căn thức và phân thức phải quy về lũy thừa trước: $\sqrt{x} = x^{1/2}$, $\frac{1}{x^2} = x^{-2}$.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:**
  Cho bài toán tìm nguyên hàm $I = \int \frac{dx}{x}$ ($x \neq 0$). AI lập luận: "Áp dụng công thức $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ với $\alpha = -1$, ta có $I = \frac{x^0}{0} + C$. Vì $x^0 = 1$ và $1/0$ không xác định nên hàm số $y = \frac{1}{x}$ không có nguyên hàm."
- **Nhiệm vụ HS:** Chỉ ra lỗi sai của AI: công thức lũy thừa có điều kiện $\alpha \neq -1$; trường hợp $\alpha = -1$ có nguyên hàm riêng $\ln|x| + C$ — tồn tại trên từng khoảng $(0; +\infty)$ và $(-\infty; 0)$, kiểm chứng bằng đạo hàm $(\ln|x|)' = \frac{1}{x}$.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng (8 phút)
- **Luồng Master (Must):**
  1. Tìm họ nguyên hàm $\int (5x^3 - 2x) dx$.
  2. Tìm họ nguyên hàm $\int \sqrt{x}\, dx$ và $\int \frac{dx}{x^2}$ ($x \neq 0$).
- **Luồng Support (Should):**
  1. Tìm họ nguyên hàm $\int \frac{x^2 + 2x - 3}{x} dx$ trên $(0; +\infty)$ (kỹ năng tách phân thức).
  2. Tìm nguyên hàm $F(x)$ của $f(x) = 6x^2 + \frac{1}{x}$ trên $(0; +\infty)$ biết $F(1) = 5$.
- **Luồng Challenge (Could):**
  1. Tìm họ nguyên hàm $I = \int \frac{(2x-1)^2}{\sqrt{x}} dx$ với $x > 0$ (khai triển rồi quy về lũy thừa phân số).
  2. Một doanh nghiệp có chi phí biên $C'(x) = 3x^2 + \frac{100}{x}$ (triệu đồng) khi sản xuất $x$ đơn vị ($x > 0$). Biết chi phí sản xuất 1 đơn vị là $C(1) = 143$ triệu đồng. Tìm hàm tổng chi phí $C(x)$.

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- Bảng con/trắc nghiệm máy: nhận diện khi nào dùng công thức lũy thừa, khi nào dùng $\ln|x|$; quy đổi căn/phân thức sang lũy thừa.

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- Bài toán điều kiện ban đầu trên miền xác định; bài toán chi phí biên (luồng Challenge) mang ra thảo luận chung.
- Bảng con tổng hợp: cho trước 5 hàm, HS chọn nhanh công thức phù hợp.
- Exit ticket củng cố: quy tắc chọn công thức $\alpha \neq -1$ vs $\alpha = -1$.

---

## IV. KIẾN THỨC BẢNG (tóm tắt)
1. $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ ($\alpha \neq -1$); $\int \frac{dx}{x} = \ln|x| + C$ ($x \neq 0$).
2. Quy về lũy thừa trước khi tính: $\sqrt{x} = x^{1/2}$, $\frac{1}{x^n} = x^{-n}$.
3. Trên $(0; +\infty)$: $\ln|x| = \ln x$; trên $(-\infty; 0)$: $\ln|x| = \ln(-x)$.
4. Tách phân thức → áp dụng tuyến tính (Tiết 3) → chọn công thức → tìm $C$ theo điều kiện ban đầu.
