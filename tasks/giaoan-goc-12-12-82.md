<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-82 — "Nguyên hàm — Tiết 3: Tính chất cơ bản của nguyên hàm" · Soạn lại 03/11/2026 chuẩn V8.8 Master Teacher -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 3: Tính chất cơ bản của nguyên hàm)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 3: Tính chất cơ bản của nguyên hàm | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

> **Chuẩn V8.8 Master Teacher:** Trục dữ liệu thực nghiệm xuyên suốt (tàu điện Metro tuyến số 1 Bến Thành – Suối Tiên), câu hỏi phân tầng có hint, teacherCue định hướng học sinh yếu, reveal giấu đáp án, Exit Ticket cô đọng.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Vận dụng tính chất tuyến tính của đạo hàm $(k \cdot u)' = k \cdot u'$ và $(u \pm v)' = u' \pm v'$ để suy ra tính chất tuyến tính của nguyên hàm: $\int k f(x) dx = k \int f(x) dx$ ($k \neq 0$) và $\int [f(x) \pm g(x)] dx = \int f(x) dx \pm \int g(x) dx$.
- **Năng lực giải quyết vấn đề toán học:** Từ dữ liệu gia tốc đo được của tàu metro, tái lập hàm vận tốc $v(t) = \int a(t) dt$ và quãng đường $s(t) = \int v(t) dt$ bằng cách tách biểu thức thành tổng các đơn thức sơ cấp; thiết lập phương trình xác định hằng số $C$ khi biết điều kiện ban đầu.
- **Năng lực giao tiếp toán học:** Nhận diện và phản biện chính xác sai lầm khi ngộ nhận nguyên hàm của tích bằng tích nguyên hàm hoặc tự ý đưa biến số (thời gian $t$) ra ngoài dấu nguyên hàm.
- **Năng lực mô hình hóa toán học:** Mô hình hóa chuỗi "gia tốc $\to$ vận tốc $\to$ quãng đường" của tàu điện bằng tích phân liên tiếp; kiểm chứng tính hợp lý vật lý của kết quả (tốc độ tàu không vượt 80 km/h).

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Phát biểu đúng 2 tính chất cơ bản; từ bảng dữ liệu gia tốc tàu $a(t) = t^2 + 3t$, tính được $v(t) = \frac{t^3}{3} + \frac{3t^2}{2}$ (điều kiện tàu rời ga đứng yên) và $v(3) = 22{,}5$ m/s.
- **Should (Trọng tâm - TH):** Tích phân hai lần để có $s(t) = \frac{t^4}{12} + \frac{t^3}{2}$, tính quãng đường tăng tốc $s(3) = 20{,}25$ m; xác định duy nhất nguyên hàm khi biết điều kiện ban đầu $F(x_0) = y_0$ (ví dụ $v(1) = 8$).
- **Could (Nâng cao - VD/VDC):** Giải bài toán phanh khẩn cấp của tàu ($a(t) = -4t + 8$, $v(0) = 10$ m/s): tìm thời điểm dừng $t = 5$ s và quãng đường hãm phanh $\frac{200}{3} \approx 66{,}7$ m; hạ bậc lượng giác $\cos^2 x$.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT (THEMATIC DATASET)

**Tình huống: Tàu điện Metro tuyến số 1 (Bến Thành – Suối Tiên) rời ga trong 3 giây đầu.**
Cảm biến IMU trên tàu đo gia tốc, chu kỳ lấy mẫu 1 giây:

| Thời điểm $t$ (s) | 0 | 1 | 2 | 3 |
|---|:---:|:---:|:---:|:---:|
| **Gia tốc đo được $a$ (m/s²)** | 0 | 4 | 10 | 18 |

- Khớp mô hình: $a(t) = t^2 + 3t$ (m/s²) — kiểm chứng: $t=1 \to 4$; $t=2 \to 10$; $t=3 \to 18$ ✓
- Điều kiện ban đầu: tàu đứng yên tại ga khi $t = 0$: $v(0) = 0$, $s(0) = 0$.
- $v(t) = \frac{t^3}{3} + \frac{3t^2}{2}$ (m/s) $\Rightarrow v(3) = 9 + 13{,}5 = 22{,}5$ m/s $= 81$ km/h.
- $s(t) = \frac{t^4}{12} + \frac{t^3}{2}$ (m) $\Rightarrow s(3) = 6{,}75 + 13{,}5 = 20{,}25$ m.

**Bẫy kiểm chứng vật lý (dùng ở AI Error):** nếu AI tính $v_{AI}(t) = \frac{t^3}{2} + 3t^2$ thì $v_{AI}(3) = 40{,}5$ m/s $= 145{,}8$ km/h — vượt xa tốc độ tối đa của tàu metro (80 km/h) → kết quả vô lý.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống:** Tàu metro rời ga Bến Thành, bảng dữ liệu cảm biến (0, 4, 10, 18). Muốn biết tốc độ của tàu tại từng thời điểm, cần làm gì với $a(t)$?
- **Câu hỏi tương tác (máy HS):**
  1. `[NHẬN DIỆN]` Để có $v(t)$ từ $a(t)$, em cần: (A) Lấy đạo hàm $a(t)$; (B) Tìm nguyên hàm của $a(t)$; (C) Nhân $a(t)$ với $t$? → Đáp án B.
  2. `[SO SÁNH]` Hai cách tính $\int (2t + \cos t) dt$: An lấy đạo hàm ngược $(t^2 + \sin t)' = 2t + \cos t$; Bình tách $2\int t\,dt + \int \cos t\,dt$. Kết quả có giống nhau không? Quy tắc tách của Bình có luôn đúng không?
  3. `[CẢNH BÁO]` Phép nhân $\int [f(t) \cdot g(t)] dt$ có tách thành $\int f(t) dt \cdot \int g(t) dt$ được không?
- **TeacherCue (lớp yếu):** Nhắc quan hệ đảo chiều "a là đạo hàm của v nên v là nguyên hàm của a" trước khi cho chọn đáp án.

### 2. Hoạt động 2: Hình thành kiến thức — Tính chất cơ bản (6 phút)
- **Định lý (Tính chất nguyên hàm):**
  1. $\int k f(x) dx = k \int f(x) dx$ với mọi hằng số $k \neq 0$.
  2. $\int [f(x) \pm g(x)] dx = \int f(x) dx \pm \int g(x) dx$.
- **GV làm mẫu từ dữ liệu tàu:** 4 bước: (1) $v = \int a$; (2) tách $\int t^2 dt + 3\int t\,dt$; (3) hệ số 3 là hằng số được đưa ra ngoài; (4) điều kiện $v(0) = 0 \Rightarrow C = 0$. Kết quả $v(t) = \frac{t^3}{3} + \frac{3t^2}{2}$.
- **TeacherCue:** Nhấn mạnh bước 4 — vì sao tàu rời ga đứng yên cho phép xác định duy nhất $C = 0$; đây là ý nghĩa vật lý của hằng số tích phân.
- **Chú ý then chốt (Bẫy kinh điển):** Không có $\int [f \cdot g] dx = \int f\,dx \cdot \int g\,dx$; tuyệt đối không đưa biến số ra ngoài dấu nguyên hàm.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:** AI tính vận tốc tàu: $v(t) = \int t(t+3)\,dt$, "đưa thừa số $t$ ra ngoài": $v(t) = t\int(t+3)\,dt = t\left(\frac{t^2}{2} + 3t\right) = \frac{t^3}{2} + 3t^2$.
- **Nhiệm vụ HS:**
  1. Đạo hàm kiểm tra: $\left(\frac{t^3}{2} + 3t^2\right)' = \frac{3t^2}{2} + 6t \neq t^2 + 3t$.
  2. Bằng chứng vật lý: $v_{AI}(3) = 40{,}5$ m/s = 145,8 km/h — tàu metro không thể đạt tốc độ này khi còn trong ga.
  3. Sửa đúng: $v(t) = \int (t^2 + 3t)\,dt = \frac{t^3}{3} + \frac{3t^2}{2}$ (áp đúng 2 tính chất).

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng kèm hint (8 phút)
- **Luồng Master (Must) —_hint: tách theo 2 tính chất rồi mới tích phân từng phần:**
  1. Từ bảng cảm biến: tìm $v(t)$ biết $a(t) = t^2 + 3t$, $v(0) = 0$. → $v(t) = \frac{t^3}{3} + \frac{3t^2}{2}$.
  2. Tính tốc độ tàu tại $t = 3$ s, đổi ra km/h. → $22{,}5$ m/s $= 81$ km/h.
- **Luồng Support (Should) —_hint: tích phân hai lần, lần nào cũng tách trước khi tính:**
  1. Tìm quãng đường $s(t)$ biết $v(t) = \frac{t^3}{3} + \frac{3t^2}{2}$, $s(0) = 0$. → $s(t) = \frac{t^4}{12} + \frac{t^3}{2}$.
  2. Tàu tăng tốc mô phỏng $a(t) = 3t^2 - 2t + 4$, biết $v(1) = 8$ m/s. Tìm $v(t)$. → $v(t) = t^3 - t^2 + 4t + 4$.
- **Luồng Challenge (Could) —_hint: tìm thời điểm dừng bằng giải phương trình v(t) = 0:**
  1. Tàu hãm phanh khẩn cấp: $a(t) = -4t + 8$ (m/s²), $v(0) = 10$ m/s. Tìm thời điểm dừng và quãng đường hãm phanh. → $v(t) = -2t^2 + 8t + 10$; dừng ở $t = 5$ s; $s(5) = \frac{200}{3} \approx 66{,}7$ m.
  2. Dao động hệ thống treo: tìm $F(x)$ của $f(x) = \cos^2 x$ biết $F\left(\frac{\pi}{4}\right) = 0$. → $F(x) = \frac{x}{2} + \frac{\sin 2x}{4} - \frac{\pi}{8} - \frac{1}{4}$.

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- **ĐGTX máy:** Cho $s(t) = \frac{t^4}{12} + \frac{t^3}{2}$. Em hãy lấy đạo hàm hai lần để khôi phục gia tốc, đối chiếu với bảng cảm biến. → $s''(t) = t^2 + 3t$ ✓ (hoàn nguyên).
- **Câu hỏi bảng con:** Khẳng định nào SAI? A. $\int 5f = 5\int f$; B. $\int(f-g) = \int f - \int g$; C. $\int(f\cdot g) = \int f \cdot \int g$; D. $\int 0\,dx = C$. → C.

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- **Ứng dụng:** Công ty vận hành metro: chi phí biên để phục vụ $x$ nghìn lượt khách là $C'(x) = 3x^2 - 12x + 20$ (triệu đồng), chi phí cố định $C(0) = 50$ triệu. → $C(x) = x^3 - 6x^2 + 20x + 50$.
- **Quick-check:** 2 câu trắc nghiệm chốt kỹ năng (họ nguyên hàm $2\sin x + 3^x$; tìm $F(2)$ biết $F' = \frac{1}{x^2}$, $F(1) = 2$ → $2{,}5$).
- **Exit Ticket:** 1) Viết 2 tính chất cơ bản; 2) Nêu 1 bẫy sai lầm (đưa biến ra ngoài / nguyên hàm của tích); 3) Tự đánh giá M/S/C; 4) Chốt: nếu $a(t) = t^2 + 3t$ và tàu rời ga đứng yên, tốc độ sau 3 giây là bao nhiêu? → 22,5 m/s.
