<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-85 — "Nguyên hàm — Tiết 6: Nguyên hàm của hàm số lượng giác" · Soạn ngày 2026-11-02 -->
<!-- Kế thừa: tính chất tuyến tính từ Tiết 3 (`12-12-82`); công thức lũy thừa/mũ từ Tiết 4-5 (`12-12-83`, `12-12-84`). -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 6: Nguyên hàm của hàm số lượng giác)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 6: Nguyên hàm của hàm số lượng giác | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Từ bảng đạo hàm $(\sin x)' = \cos x$, $(\cos x)' = -\sin x$ suy ra ngược hai công thức nguyên hàm $\int \cos x dx = \sin x + C$ và $\int \sin x dx = -\cos x + C$; giải thích nguồn gốc dấu trừ trong công thức của $\sin x$.
- **Năng lực giải quyết vấn đề toán học:** Kết hợp tính chất tuyến tính (Tiết 3) với hai công thức lượng giác để tính nguyên hàm của biểu thức chứa $\sin x$, $\cos x$ kết hợp đa thức, $e^x$; xác định hằng số $C$ theo điều kiện ban đầu.
- **Năng lực giao tiếp toán học:** Nhận diện và phản biện lỗi nhầm chiều giữa đạo hàm và nguyên hàm (lấy đạo hàm của $\sin x$ thay vì tìm hàm có đạo hàm bằng $\sin x$) và lỗi quên dấu trừ.
- **Năng lực mô hình hóa toán học:** Ứng dụng nguyên hàm lượng giác vào bài toán dao động: tìm phương trình li độ từ vận tốc $v(t) = v_0 \cos t$ với điều kiện li độ ban đầu.

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Viết đúng 2 công thức $\int \sin x dx = -\cos x + C$ và $\int \cos x dx = \sin x + C$; tính nguyên hàm của tổng đa thức và một hàm lượng giác đơn giản.
- **Should (Trọng tâm - TH):** Tính nguyên hàm của biểu thức tuyến tính kết hợp nhiều hàm ($x^2 + 2\cos x$, $\sin x + 2\cos x$); tìm nguyên hàm thỏa mãn điều kiện ban đầu $F(x_0) = y_0$.
- **Could (Nâng cao - VD/VDC):** Giải bài toán dao động cơ học (li độ — vận tốc); tính nguyên hàm biểu thức chứa cả lượng giác và hàm mũ; kiểm chứng kết quả bằng đạo hàm.

---

## II. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C).
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.

---

## III. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống:** Cho hai bạn An và Bình cùng tìm nguyên hàm $I = \int \sin x \, dx$:
  - An: "Đạo hàm của $\sin x$ là $\cos x$, vậy nguyên hàm của $\sin x$ là $\cos x + C$."
  - Bình: "Tìm hàm có đạo hàm bằng $\sin x$: vì $(\cos x)' = -\sin x$ nên $I = -\cos x + C$."
  - Câu hỏi: Ai đúng? Tại sao lấy đạo hàm của $\sin x$ không phải là cách tìm nguyên hàm của $\sin x$?
- **Bảng con ôn kiến thức (chờ hai nhịp):**
  1. `[GHI NHỚ]` Đạo hàm của $\sin x$ và của $\cos x$?
  2. `[PHÂN BIỆT]` "Đạo hàm của $f$" và "nguyên hàm của $f$" khác nhau ở chiều nào?
  3. `[KẾT NỐI]` Nguyên hàm của $e^x$ (Tiết 5) là gì?
- **Câu hỏi thiết yếu giữ nguyên suốt tiết:** *"Ngược lại bảng đạo hàm lượng giác thế nào để ra bảng nguyên hàm, và dấu trừ nằm ở đâu?"*

### 2. Hoạt động 2: Hình thành kiến thức — Công thức nguyên hàm lượng giác (8 phút)
- **Công thức 1:** $\int \cos x \, dx = \sin x + C$.
- **Công thức 2:** $\int \sin x \, dx = -\cos x + C$.
- **Kiểm chứng bằng đạo hàm:** $(\sin x)' = \cos x$; $(-\cos x)' = -(-\sin x) = \sin x$.
- **Chú ý then chốt (Bẫy kinh điển):**
  - Nguyên hàm đi theo chiều **ngược** bảng đạo hàm: $(\cos x)' = -\sin x$ nên nguyên hàm của $\sin x$ mang **dấu trừ** và là $-\cos x$, không phải $\cos x$.
  - Không đổi vai: $\int \cos x dx \neq \cos x + C$; $\int \sin x dx \neq \sin x + C$.
  - Kết hợp tuyến tính: $\int [a\sin x + b\cos x] dx = -a\cos x + b\sin x + C$.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:**
  Cho bài toán tìm nguyên hàm $I = \int \sin x \, dx$. AI lập luận: "Vì đạo hàm của $\sin x$ là $\cos x$, nên nguyên hàm của $\sin x$ là $\cos x + C$."
- **Nhiệm vụ HS:** Chỉ ra lỗi sai của AI: nhầm chiều giữa đạo hàm và nguyên hàm. Kiểm chứng: $(\cos x + C)' = -\sin x \neq \sin x$. Đáp án đúng: $I = -\cos x + C$ vì $(-\cos x)' = \sin x$.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng (8 phút)
- **Luồng Master (Must):**
  1. Tìm họ nguyên hàm $\int (2\sin x - 3\cos x) dx$.
  2. Tìm họ nguyên hàm $\int (x^2 + \cos x) dx$.
- **Luồng Support (Should):**
  1. Tìm họ nguyên hàm $\int (x^2 + 2\cos x) dx$.
  2. Tìm nguyên hàm $F(x)$ của $f(x) = \sin x + 2\cos x$ biết $F(0) = 5$.
- **Luồng Challenge (Could):**
  1. Một vật dao động điều hòa có vận tốc $v(t) = 3\cos t$ (m/s). Biết tại $t = 0$ vật ở vị trí $s(0) = 0$. Tìm phương trình li độ $s(t)$ và xác định li độ cực đại của vật.
  2. Tìm họ nguyên hàm $\int (\sin x - 2\cos x + e^x) dx$ và kiểm chứng bằng đạo hàm.

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- Bảng con/trắc nghiệm máy: chọn nhanh công thức đúng, phát hiện lỗi dấu và lỗi nhầm chiều.

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- Bài toán dao động (luồng Challenge) mang ra thảo luận chung: ý nghĩa biên độ, s(π/2) = 3 (đến biên dương).
- Bảng con tổng hợp: cho 4 hàm (sin, cos, e^x, 2^x), HS chọn nhanh công thức nguyên hàm.
- Exit ticket củng cố 2 công thức và bẫy dấu trừ.

---

## IV. KIẾN THỨC BẢNG (tóm tắt)
1. $\int \cos x \, dx = \sin x + C$; $\int \sin x \, dx = -\cos x + C$.
2. Nguyên hàm là chiều ngược của đạo hàm: $(\cos x)' = -\sin x$ → nguyên hàm của $\sin x$ mang dấu trừ.
3. Kết hợp tuyến tính: $\int [a\sin x + b\cos x] dx = -a\cos x + b\sin x + C$.
4. Tìm $C$ theo điều kiện ban đầu; kiểm chứng kết quả bằng đạo hàm.
