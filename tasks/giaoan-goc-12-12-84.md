<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-84 — "Nguyên hàm — Tiết 5: Nguyên hàm của hàm số mũ" · Soạn lại 03/11/2026 chuẩn V8.8 Master Teacher -->
<!-- Kế thừa: tính chất tuyến tính từ Tiết 3 (`12-12-82`); công thức lũy thừa và ln từ Tiết 4 (`12-12-83`). -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 5: Nguyên hàm của hàm số mũ)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 5: Nguyên hàm của hàm số mũ | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

> **Chuẩn V8.8 Master Teacher:** Trục dữ liệu thực nghiệm xuyên suốt (Lãi kép — cuộc đua 2 ngân hàng BlueBank vs GreenBank), câu hỏi phân tầng có hint, teacherCue định hướng học sinh yếu, reveal giấu đáp án, Exit Ticket cô đọng.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Hình thành công thức $\int a^x dx = \frac{a^x}{\ln a} + C$ bằng kiểm chứng đạo hàm $\left(\frac{a^x}{\ln a}\right)' = a^x$; nhận ra $e^x$ là trường hợp riêng $a = e$ vì $\ln e = 1$; phân biệt hàm số mũ $a^x$ (biến ở số mũ) với hàm số lũy thừa $x^{\alpha}$ (biến ở cơ số).
- **Năng lực giải quyết vấn đề toán học:** Từ mô hình lãi kép của 2 ngân hàng, tính nguyên hàm của hàm số mũ để lập công thức tích lũy; kết hợp tính chất tuyến tính (Tiết 3) và điều kiện ban đầu.
- **Năng lực giao tiếp toán học:** Phản biện khẳng định sai "mọi hàm số mũ đều có đạo hàm bằng chính nó"; giải thích tại sao chỉ $e^x$ mới có tính chất đó.
- **Năng lực mô hình hóa toán học:** Mô hình hóa tăng trưởng tiền gửi theo cấp số nhân; so sánh lãi ghép liên tục ($e$) và lãi ghép từng kỳ ($a$) bằng con số thực tế sau 10 năm.

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Viết đúng 2 công thức $\int e^x dx = e^x + C$ và $\int a^x dx = \frac{a^x}{\ln a} + C$ ($a > 0, a \neq 1$); tính $\int 5^x dx$, $\int (x^2 + e^x) dx$.
- **Should (Trọng tâm - TH):** Tính $\int (2e^x + 3^x) dx$; tìm nguyên hàm thỏa mãn $F(0) = 3$ với $f(x) = e^x - 2^x$; kiểm chứng kết quả bằng đạo hàm.
- **Could (Nâng cao - VD/VDC):** Giải bài toán doanh thu quỹ đầu tư $R'(t) = 3 \cdot 2^t$, $R(0) = 0$ → $R(3) \approx 30{,}30$ triệu; tính $\int \frac{e^x + 2^x}{2} dx$ kèm kiểm chứng; so sánh lãi ghép liên tục và ghép từng kỳ.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT (THEMATIC DATASET)

**Tình huống: Lan gửi 10 triệu đồng — cuộc đua số dư giữa 2 ngân hàng trong 10 năm.**

| Ngân hàng | Cách tính lãi | Mô hình số dư (triệu đồng) |
|---|---|---|
| **BlueBank** | 6%/năm, ghép **mỗi năm** | $B(t) = 10 \cdot (1{,}06)^t$ |
| **GreenBank** | 6%/năm, ghép **liên tục** | $A(t) = 10 \cdot e^{0{,}06t}$ |

- **Sau 10 năm:** $B(10) = 10 \cdot 1{,}06^{10} \approx 17{,}91$ triệu (lãi $\approx 7{,}91$ triệu); $A(10) = 10 \cdot e^{0{,}6} \approx 18{,}22$ triệu (lãi $\approx 8{,}22$ triệu).
- **Kết luận:** GreenBank hơn $0{,}31$ triệu — lãi ghép liên tục ($e$) luôn mạnh hơn ghép từng kỳ cùng mức lãi suất danh nghĩa.
- **Cầu nối tích phân:** tốc độ tăng số dư BlueBank $B'(t) = 10\ln(1{,}06)\cdot(1{,}06)^t$; nguyên hàm của $(1{,}06)^t$ là $\frac{(1{,}06)^t}{\ln 1{,}06} + C$ — chính là công thức hàm số mũ.

**Bẫy kiểm chứng (dùng ở AI Error):** AI khẳng định "hàm số mũ có đạo hàm bằng chính nó (giống $e^x$) nên $\int (1{,}06)^t dt = (1{,}06)^t + C$" — sai vì chỉ $e^x$ mới có đạo hàm bằng chính nó; kiểm chứng: $\left((1{,}06)^t + C\right)' = (1{,}06)^t \ln 1{,}06 \neq (1{,}06)^t$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống:** Lan có 10 triệu đồng và muốn gửi tiết kiệm 10 năm. BlueBank lãi 6%/năm ghép mỗi năm, GreenBank lãi 6%/năm ghép liên tục. Số dư của cả 2 đều tăng theo **hàm số mũ**. Để lập công thức dự báo số dư, cần tính nguyên hàm của hàm số mũ — làm thế nào?
- **Câu hỏi tương tác (máy HS):**
  1. `[NHẬN DIỆN]` Nguyên hàm của $(1{,}06)^t$ là: (A) $(1{,}06)^t + C$ (giống $e^x$); (B) $\frac{(1{,}06)^t}{\ln 1{,}06} + C$; (C) $t\cdot(1{,}06)^{t-1} + C$? → Đáp án B.
  2. `[SO SÁNH]` $2^x$ và $x^2$ khác nhau ở điểm nào? Vì sao không dùng công thức lũy thừa $\frac{x^{\alpha+1}}{\alpha+1}$ (Tiết 4) để tính $\int 2^x dx$?
- **TeacherCue (lớp yếu):** Nhắc trước: hàm số mũ là "biến ở trên cao" (số mũ), hàm lũy thừa là "biến ở dưới đất" (cơ số); 2 nhóm hàm có 2 công thức riêng — đừng trộn lẫn.

### 2. Hoạt động 2: Hình thành kiến thức — Công thức nguyên hàm hàm số mũ (6 phút)
- **Công thức 1:** $\int e^x dx = e^x + C$.
- **Công thức 2:** $\int a^x dx = \frac{a^x}{\ln a} + C$ với $a > 0, a \neq 1$.
  - Kiểm chứng: $\left(\frac{a^x}{\ln a}\right)' = \frac{1}{\ln a}\cdot a^x \ln a = a^x$ ✓.
  - $e$ là trường hợp riêng $a = e$ vì $\ln e = 1$ → $e^x$ có đạo hàm bằng chính nó.
- **GV làm mẫu — nguyên hàm số dư BlueBank (3 bước):**
  - Bước 1: Nhận diện $(1{,}06)^t$ là hàm số mũ ($a = 1{,}06 > 0$, $a \neq 1$).
  - Bước 2: Chọn công thức 2: $\int (1{,}06)^t dt = \frac{(1{,}06)^t}{\ln 1{,}06} + C$.
  - Bước 3: Kiểm chứng đạo hàm: $\left(\frac{(1{,}06)^t}{\ln 1{,}06}\right)' = \frac{1}{\ln 1{,}06}\cdot(1{,}06)^t\ln 1{,}06 = (1{,}06)^t$ ✓.
- **TeacherCue:** Nhấn mạnh bước 3 — kiểm chứng đạo hàm là "chìa khoá vạn năng" của bài nguyên hàm; thấy sai ngay là biết phải chia $\ln a$.
- **Chú ý then chốt (Bẫy kinh điển):** Không phải hàm số mũ nào cũng có đạo hàm bằng chính nó — chỉ $e^x$; không dùng công thức lũy thừa Tiết 4 cho hàm số mũ.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:** AI giúp Lan lập công thức dự báo lãi: "Hàm số mũ có đạo hàm bằng chính nó (giống $e^x$), nên $\int (1{,}06)^t dt = (1{,}06)^t + C$."
- **Nhiệm vụ HS:**
  1. Đạo hàm kiểm tra: $\left((1{,}06)^t + C\right)' = (1{,}06)^t \ln 1{,}06 \approx 0{,}058\cdot(1{,}06)^t \neq (1{,}06)^t$ — AI thiếu hệ số $\frac{1}{\ln 1{,}06}$.
  2. Bằng chứng: chỉ $e^x$ có đạo hàm bằng chính nó ($\ln e = 1$); với $a \neq e$ thì $(a^x)' = a^x \ln a \neq a^x$.
  3. Sửa đúng: $\int (1{,}06)^t dt = \frac{(1{,}06)^t}{\ln 1{,}06} + C$ — nếu dùng công thức sai của AI, mọi bảng dự báo lãi sẽ lệch hệ số.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng kèm hint (8 phút)
- **Luồng Master (Must) —_hint: nhận diện hàm số mũ rồi chia ln a; e^x giữ nguyên:**
  1. Viết 2 công thức kèm điều kiện; tính $I = \int 5^t dt$. → $I = \frac{5^t}{\ln 5} + C$.
  2. Tính $\int (t^2 + e^t) dt$ (mô hình tăng trưởng hỗn hợp). → $t^3/3 + e^t + C$.
- **Luồng Support (Should) —_hint: tách theo tuyến tính trước, mỗi phần chọn đúng công thức:**
  1. Tính $\int (2e^t + 3^t) dt$. → $2e^t + \frac{3^t}{\ln 3} + C$.
  2. Tìm $F(t)$ của $f(t) = e^t - 2^t$ biết $F(0) = 3$. → $F(t) = e^t - \frac{2^t}{\ln 2} + 2 + \frac{1}{\ln 2}$.
- **Luồng Challenge (Could) —_hint: tìm C từ R(0) = 0 trước rồi mới thay số; kiểm chứng bằng đạo hàm:**
  1. Quỹ đầu tư có doanh thu $R'(t) = 3\cdot 2^t$ (triệu đồng/ngày), $R(0) = 0$. Tính $R(3)$. → $R(t) = \frac{3(2^t - 1)}{\ln 2}$; $R(3) = \frac{21}{\ln 2} \approx 30{,}30$ triệu.
  2. Tính $I = \int \frac{e^t + 2^t}{2} dt$ và kiểm chứng bằng đạo hàm. → $\frac{e^t}{2} + \frac{2^t}{2\ln 2} + C$ ✓.

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- **ĐGTX máy:** Số dư BlueBank sau t năm là $10(1{,}06)^t$. Lãi tích lũy sau 10 năm = $B(10) - B(0) = 10\cdot 1{,}06^{10} - 10 \approx 7{,}91$ triệu; kiểm chứng ngược: đạo hàm của $\frac{(1{,}06)^t}{\ln 1{,}06}$ là $(1{,}06)^t$ ✓ (hoàn nguyên).
- **Câu hỏi bảng con:** Cho 5 hàm ($x^3$, $3^x$, $e^x$, $\sqrt{x}$, $5^x$), phân loại nhanh: hàm số mũ hay hàm số lũy thừa, và chọn công thức tương ứng (Tiết 4 hay Tiết 5).

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- **Ứng dụng — Cuộc đua 2 ngân hàng:** Sau 10 năm: BlueBank $B(10) \approx 17{,}91$ triệu; GreenBank $A(10) = 10e^{0{,}6} \approx 18{,}22$ triệu. GreenBank hơn $0{,}31$ triệu nhờ ghép liên tục — cơ sở toán học của việc $e$ xuất hiện trong tài chính.
- **Quick-check:** 2 câu chốt (khẳng định sai của An về $3^x$; phân biệt $2^x$ và $x^2$).
- **Exit Ticket:** 1) Viết 2 công thức kèm điều kiện; 2) Nêu 1 bẫy (quên chia $\ln a$ / trộn lẫn hàm mũ — lũy thừa); 3) Tự đánh giá M/S/C; 4) Chốt ngữ cảnh: sau 10 năm ngân hàng nào thắng, hơn bao nhiêu? → GreenBank, hơn $\approx 0{,}31$ triệu.
