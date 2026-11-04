<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-85 — "Nguyên hàm — Tiết 6: Nguyên hàm của hàm số lượng giác" · Soạn lại 03/11/2026 chuẩn V8.8 Master Teacher -->
<!-- Kế thừa: tính chất tuyến tính từ Tiết 3 (`12-12-82`); công thức lũy thừa (Tiết 4) và hàm số mũ (Tiết 5). -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 6: Nguyên hàm của hàm số lượng giác)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 6: Nguyên hàm của hàm số lượng giác | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

> **Chuẩn V8.8 Master Teacher:** Trục dữ liệu thực nghiệm xuyên suốt (Con lắc Foucault bảo tàng Khoa học), câu hỏi phân tầng có hint, teacherCue định hướng học sinh yếu, reveal giấu đáp án, Exit Ticket cô đọng.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Hình thành 2 công thức $\int \cos x\,dx = \sin x + C$ và $\int \sin x\,dx = -\cos x + C$ bằng chiều ngược của bảng đạo hàm; giải thích nguồn gốc dấu trừ từ $(\cos x)' = -\sin x$.
- **Năng lực giải quyết vấn đề toán học:** Từ dữ liệu vận tốc của con lắc Foucault, dựng lại phương trình li độ $s(t) = \int v\,dt$; kết hợp tính chất tuyến tính (Tiết 3) và điều kiện ban đầu $s(0) = 0$.
- **Năng lực giao tiếp toán học:** Phản biện lỗi nhầm chiều đạo hàm — nguyên hàm; kiểm chứng mọi kết quả bằng đạo hàm.
- **Năng lực mô hình hóa toán học:** Mô hình hóa dao động điều hòa của con lắc và hệ thống treo cabin tàu: từ vận tốc → li độ → biên độ dao động.

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Viết đúng 2 công thức kèm kiểm chứng; tính $\int 2\sin t\,dt$, $\int (t^2 + \cos t)\,dt$.
- **Should (Trọng tâm - TH):** Tính $\int (2\sin t - 3\cos t)\,dt$; tìm nguyên hàm thỏa mãn $F(0) = 5$ với $f(t) = \sin t + 2\cos t$; nhớ $\cos 0 = 1$, $\sin 0 = 0$ khi tìm $C$.
- **Could (Nâng cao - VD/VDC):** Giải bài toán dao động điều hòa $v(t) = 3\cos t$, $s(0) = 0$ → biên độ 3 m; tính $\int (\sin t - 2\cos t + e^t)\,dt$ kèm kiểm chứng; giải thích vì sao dấu trừ "đi theo" đạo hàm của $\cos$.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT (THEMATIC DATASET)

**Tình huống: Con lắc Foucault tại bảo tàng Khoa học — dựng lại chuyển động từ cảm biến.**

| Đại lượng | Giá trị |
|---|---|
| Chiều dài dây con lắc $l$ | $\approx 9{,}8$ m |
| Chu kỳ dao động $T = \dfrac{2\pi}{\omega}$ với $\omega = \sqrt{g/l} = \sqrt{9{,}8/9{,}8} = 1$ rad/s | $T = 2\pi \approx 6{,}28$ s |
| Vận tốc ngang đo được (qua vị trí thấp nhất lúc $t = 0$) | $v(t) = 0{,}5\cos t$ (m/s) |
| Điều kiện ban đầu | $s(0) = 0$ |

- **Dựng lại li độ:** $s(t) = \int 0{,}5\cos t\,dt = 0{,}5\sin t + C$; $s(0) = 0 \Rightarrow C = 0$ → $s(t) = 0{,}5\sin t$ (m).
- **Biên độ dao động:** $A = 0{,}5$ m; tốc độ cực đại $v_{max} = 0{,}5$ m/s tại vị trí thấp nhất; chu kỳ $T \approx 6{,}28$ s — khớp thiết kế con lắc $l \approx 9{,}8$ m ✓.
- **Kiểm chứng hoàn nguyên:** $s'(t) = 0{,}5\cos t = v(t)$ ✓.

**Bẫy kiểm chứng (dùng ở AI Error):** AI nhầm chiều đạo hàm — nguyên hàm: từ $v(t) = \sin t$ (tín hiệu chuẩn hóa ở đầu dây khác) viết $s(t) = \cos t + C$ → đạo hàm $s'(t) = -\sin t$ âm trong khi con lắc đang đi tới ($v > 0$) — **AI làm con lắc chạy ngược chiều!** Đúng: $s(t) = -\cos t + C$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống:** Con lắc Foucault của bảo tàng Khoa học (dây dài 9,8 m) swing qua vị trí thấp nhất lúc $t = 0$. Cảm biến đo vận tốc ngang $v(t) = 0{,}5\cos t$ (m/s). Ban biên tập cần dựng lại phương trình li độ $s(t)$ để làm hình ảnh động cho trung tâm bốc bài.
- **Câu hỏi tương tác (máy HS):**
  1. `[NHẬN DIỆN]` Nguyên hàm của $\sin t$ là: (A) $\cos t + C$ (giống đạo hàm); (B) $-\cos t + C$; (C) $\sin t + C$? → Đáp án B.
  2. `[SO SÁNH]` Vì sao nguyên hàm của $\cos t$ không mang dấu trừ ($\sin t + C$) còn nguyên hàm của $\sin t$ lại mang dấu trừ ($-\cos t + C$)?
- **TeacherCue (lớp yếu):** Nhắc trước quy tắc "ngược chiều": nguyên hàm của $f$ là hàm có **đạo hàm bằng $f$** — muốn biết công thức đúng, lấy đạo hàm thử đáp án là ra ngay.

### 2. Hoạt động 2: Hình thành kiến thức — Công thức nguyên hàm lượng giác (6 phút)
- **Công thức 1:** $\int \cos x\,dx = \sin x + C$ (vì $(\sin x)' = \cos x$).
- **Công thức 2:** $\int \sin x\,dx = -\cos x + C$ (vì $(-\cos x)' = \sin x$).
  - Nguồn gốc dấu trừ: đạo hàm của $\cos x$ mang dấu âm $(-\sin x)$, nên khi "đi ngược" phải thêm dấu trừ.
- **GV làm mẫu — dựng li độ con lắc (4 bước):**
  - Bước 1: Nhận diện $s = \int v$ (chiều ngược).
  - Bước 2: Tách hệ số: $\int 0{,}5\cos t\,dt = 0{,}5\int \cos t\,dt$ (tuyến tính, Tiết 3).
  - Bước 3: Chọn công thức 1: $s(t) = 0{,}5\sin t + C$.
  - Bước 4: Điều kiện qua vị trí thấp nhất lúc $t=0$: $s(0) = 0 \Rightarrow C = 0$ → $s(t) = 0{,}5\sin t$.
  - Kết luận: biên độ $A = 0{,}5$ m; chu kỳ $T = 2\pi \approx 6{,}28$ s khớp thiết kế $l \approx 9{,}8$ m.
- **TeacherCue:** Nhấn mạnh bước 4 — điều kiện ban đầu xác định duy nhất chuyển động; giống vai trò $v(0) = 0$ của tàu Metro ở Tiết 3.
- **Chú ý then chốt (Bẫy kinh điển):** Đừng đọc bảng đạo hàm theo chiều xuôi; kiểm chứng bằng đạo hàm trước khi chốt.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:** AI trợ lý của bảo tàng dựng li độ từ tín hiệu chuẩn hóa $v(t) = \sin t$: "Vì đạo hàm của $\sin t$ là $\cos t$, nên $s(t) = \cos t + C$."
- **Nhiệm vụ HS:**
  1. Đạo hàm kiểm tra: $(\cos t + C)' = -\sin t \neq \sin t$ — sai dấu.
  2. Bằng chứng vật lý: tại $t$ nhỏ dương, con lắc đang đi tới ($v = \sin t > 0$) nhưng đạo hàm của $\cos t$ âm — **AI làm con lắc chạy ngược chiều!**
  3. Sửa đúng: $s(t) = -\cos t + C$, vì $(-\cos t)' = \sin t$ ✓.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng kèm hint (8 phút)
- **Luồng Master (Must) —_hint: lấy đạo hàm thử đáp án; cos đi xuôi, sin đi ngược có dấu trừ:**
  1. Viết 2 công thức kèm kiểm chứng; tính $I = \int 2\sin t\,dt$ (dữ liệu cảm biến gấp đôi). → $I = -2\cos t + C$.
  2. Tính $\int (t^2 + \cos t)\,dt$ (xu thế + rung động). → $\frac{t^3}{3} + \sin t + C$.
- **Luồng Support (Should) —_hint: tách tuyến tính trước; nhớ cos 0 = 1, sin 0 = 0 khi tìm C:**
  1. Tính $\int (2\sin t - 3\cos t)\,dt$. → $-2\cos t - 3\sin t + C$.
  2. Tìm $F(t)$ của $f(t) = \sin t + 2\cos t$ biết $F(0) = 5$. → $F(t) = -\cos t + 2\sin t + 6$.
- **Luồng Challenge (Could) —_hint: tích phân rồi dùng điều kiện s(0) = 0; biên độ là hệ số của sin/cos:**
  1. Vật dao động điều hòa có $v(t) = 3\cos t$ (m/s), $s(0) = 0$. Tìm $s(t)$ và biên độ dao động. → $s(t) = 3\sin t$; biên độ $3$ m.
  2. Tính $I = \int (\sin t - 2\cos t + e^t)\,dt$ và kiểm chứng bằng đạo hàm. → $-\cos t - 2\sin t + e^t + C$ ✓.

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- **ĐGTX máy:** Con lắc bảo tàng: $v(t) = 0{,}5\cos t$, $s(0) = 0$. Dựng $s(t)$, tính biên độ và chu kỳ. → $s(t) = 0{,}5\sin t$; biên độ $0{,}5$ m; $T = 2\pi \approx 6{,}28$ s; hoàn nguyên $s'(t) = 0{,}5\cos t$ ✓.
- **Câu hỏi bảng con:** Với mỗi hàm ($\cos t$, $\sin t$, $2\sin t$, $-3\cos t$), chọn nhanh nguyên hàm đúng và chỉ ra dấu trừ nằm ở đâu.

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- **Ứng dụng — Hệ thống treo cabin tàu (kế thừa Tiết 3):** Gia tốc thẳng đứng chuẩn hóa của cabin đo được $f(t) = \sin t + 2\cos t$ (m/s²), biết độ lệch tại $t = 0$ là $F(0) = 5$. Tìm $F(t)$. → $F(t) = -\cos t + 2\sin t + 6$.
- **Quick-check:** 2 câu chốt (khẳng định sai của An về $\int \sin$; nguồn gốc dấu trừ).
- **Exit Ticket:** 1) Viết 2 công thức kèm kiểm chứng; 2) Nêu 1 bẫy (nhầm chiều / quên dấu trừ); 3) Tự đánh giá M/S/C; 4) Chốt ngữ cảnh: li độ con lắc Foucault = ? → $s(t) = 0{,}5\sin t$, biên độ 0,5 m, chu kỳ 6,28 s.
