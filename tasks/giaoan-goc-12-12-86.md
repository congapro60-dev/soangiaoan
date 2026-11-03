<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-86 — "Phương sai, độ lệch chuẩn — Tiết 5: Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro" · Soạn lại 03/11/2026 chuẩn V8.8 Master Teacher -->
<!-- Kế thừa: quy trình 4 bước tính s², s từ Tiết 1-2 (`12-11-80`, `12-11-81`); khái niệm phân tán từ các số đặc trưng. -->

# KẾ HOẠCH DẠY HỌC — THỐNG KÊ (Tiết 5: Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro)

| Lớp | 12 | Tên bài học | Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

> **Chuẩn V8.8 Master Teacher:** Trục dữ liệu thực nghiệm xuyên suốt (Quỹ tư vấn đầu tư — 3 cổ phiếu X/Y/Z cùng lợi suất trung bình 6,8%/phiên), câu hỏi phân tầng có hint, teacherCue định hướng học sinh yếu, reveal giấu đáp án, Exit Ticket cô đọng.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Giải thích vì sao khi hai mẫu có số trung bình bằng nhau thì phương sai/độ lệch chuẩn là thước đo độ phân tán — rủi ro; quy trình 4 bước tính $s^2$, $s$ của mẫu ghép nhóm.
- **Năng lực giải quyết vấn đề toán học:** Từ bảng lợi suất ghép nhóm của 3 cổ phiếu X/Y/Z, tính $s^2$, $s$ và xếp hạng rủi ro; phát hiện ngược bảng ($m$ ẩn) từ điều kiện $x̄$ cho trước.
- **Năng lực giao tiếp toán học:** Phản biện khuyến nghị tư vấn thiếu điều kiện ("bán hết A chuyển toàn bộ sang B"); diễn giải s lớn không tự động "xấu" — phụ thuộc khẩu vị rủi ro.
- **Năng lực mô hình hóa toán học:** Mô hình hóa quyết định đầu tư thực tế: khớp cổ phiếu với khẩu vị rủi ro của từng nhà đầu tư (thận trọng — cân bằng — mạo hiểm).

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Phát biểu quy tắc so sánh (cùng x̄ → s nhỏ hơn ổn định hơn); tính $s^2 = 12{,}16$, $s \approx 3{,}49$ cho cổ phiếu Y từ bảng ghép nhóm cho trước.
- **Should (Trọng tâm - TH):** Thực hiện trọn quy trình 4 bước cho cổ phiếu Z (tìm $m = 16$ từ $x̄ = 6{,}8$ rồi tính $s^2 = 8{,}96$, $s \approx 2{,}99$); xếp hạng rủi ro X < Z < Y.
- **Could (Nâng cao - VD/VDC):** Khuyến nghị đầu tư theo khẩu vị rủi ro của 3 nhà đầu tư khác nhau; phản biện khuyến nghị "chuyển toàn bộ" thiếu điều kiện; đánh giá khi nào cần chuẩn hóa trước khi so sánh.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT (THEMATIC DATASET)

**Tình huống: Chị Hương có 100 triệu đồng định đầu tư. Quỹ nghiên cứu cung cấp bảng lợi suất ghép nhóm (%/phiên) của 3 cổ phiếu trong 40 phiên:**

| Cổ phiếu | $[0;4)$ | $[4;8)$ | $[8;12)$ | $n$ | $x̄$ (%/phiên) | $s^2$ | $s$ |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **X** | 6 | 20 | 14 | 40 | **6,8** | **7,36** | **≈ 2,71** |
| **Y** | 12 | 8 | 20 | 40 | **6,8** | **12,16** | **≈ 3,49** |
| **Z** | 8 | 16 | 16 | 40 | **6,8** | **8,96** | **≈ 2,99** |

- **Kiểm chứng trung bình:** cả 3 bảng đều cho $\Sigma n_i c_i = 272$ → $x̄ = 272/40 = 6{,}8$ ✓ (điều kiện để so sánh s hợp lệ).
- **Xếp hạng rủi ro:** $s^2_X = 7{,}36 < s^2_Z = 8{,}96 < s^2_Y = 12{,}16$ → X ít rủi ro nhất, Y rủi ro nhất.
- **Ý nghĩa:** Y ít khi ở giữa (chỉ 8/40 phiên tại [4;8)) mà dồn về hai đầu — biến động mạnh; X dồn về giữa (20/40) — ổn định.

**Bẫy kiểm chứng (dùng ở AI Error):** AI khuyên "cùng lợi suất trung bình nhưng s của Y lớn hơn → bán hết X chuyển toàn bộ sang Y" — khuyến nghị **thiếu điều kiện**: chưa xét khẩu vị rủi ro, mục tiêu, khả năng chịu mất vốn của chị Hương.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống:** Chị Hương có 100 triệu, cân nhắc 3 cổ phiếu X/Y/Z. Bảng lợi suất cho thấy cả 3 đều có lợi suất trung bình 6,8%/phiên — "như nhau"? Chọn cổ phiếu nào?
- **Câu hỏi tương tác (máy HS):**
  1. `[NHẬN DIỆN]` Hai cổ phiếu cùng lợi suất trung bình 6,8%. Muốn đánh giá cổ phiếu nào "an toàn" hơn, em cần tính gì? (A) Chỉ cần nhìn lợi suất trung bình; (B) Tính phương sai/độ lệch chuẩn; (C) Không thể so sánh? → Đáp án B.
  2. `[SO SÁNH]` Nhìn bảng Y: chỉ 8/40 phiên ở giữa ([4;8)) nhưng 20/40 phiên ở đầu [8;12). Điều đó nói lên điều gì về "tính cách" của Y?
- **TeacherCue (lớp yếu):** Nhắc trước: trung bình nói "điểm rơi phổ biến", phương sai nói "độ dao động quanh điểm rơi" — cùng trung bình nhưng dao động khác nhau là 2 câu chuyện khác nhau.

### 2. Hoạt động 2: Hình thành kiến thức — Quy trình 4 bước đo rủi ro (6 phút)
- **Quy tắc:** Hai mẫu cùng đơn vị đo, $x̄$ bằng nhau (hoặc xấp xỉ): mẫu có $s^2$ (hay $s$) nhỏ hơn → phân tán ít hơn → ổn định hơn, ít rủi ro hơn.
- **Quy trình 4 bước** (làm mẫu cho cổ phiếu X):
  - Bước 1: $c = [2; 6; 10]$, $n = 40$.
  - Bước 2: $x̄ = \frac{6\cdot2 + 20\cdot6 + 14\cdot10}{40} = \frac{272}{40} = 6{,}8$ (%/phiên).
  - Bước 3: Lập bảng trung gian: $\Sigma n_ic_i^2 = 6\cdot4 + 20\cdot36 + 14\cdot100 = 2144$.
  - Bước 4: $s^2 = \frac{2144}{40} - 6{,}8^2 = 53{,}6 - 46{,}24 = 7{,}36$ → $s = \sqrt{7{,}36} \approx 2{,}71$ (%/phiên).
- **TeacherCue:** Nhấn mạnh bước 3 — bảng trung gian là nơi sai số hay phát sinh (nhầm $c_i^2$ thành $c_i$); nhắc học sinh lập bảng đủ 3 cột $n_i$, $c_i$, $n_ic_i^2$.
- **Chú ý then chốt (Bẫy kinh điển):** $s = \sqrt{s^2} \ge 0$ (không có $s = -\sqrt{s^2}$); chỉ so sánh trực tiếp khi $x̄$ bằng nhau/xấp xỉ và cùng đơn vị đo.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI tư vấn:** "Cổ phiếu Y có cùng lợi suất trung bình 6,8% với X nhưng độ lệch chuẩn lớn hơn (3,49 > 2,71), chứng tỏ Y biến động mạnh, cơ hội thu lợi cao hơn. Vậy chị nên **bán hết X, chuyển toàn bộ sang Y**."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: khuyến nghị **thiếu điều kiện** — chưa xét khẩu vị rủi ro, mục tiêu đầu tư, khả năng chịu mất vốn của chị Hương.
  2. Bằng chứng: $s^2_Y = 12{,}16 > s^2_X = 7{,}36$ nghĩa là rủi ro cao hơn (phiên xấu có thể gần 0%), không phải "tốt hơn" một chiều.
  3. Kết luận hợp lý: nhà đầu tư thận trọng giữ X; chỉ người chấp nhận rủi ro mới cân nhắc Y — và không bao giờ "chuyển toàn bộ" (quy tắc phân tán danh mục).

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng kèm hint (8 phút)
- **Luồng Master (Must) —_hint: đi đúng 4 bước, lập bảng trung gian đủ 3 cột:**
  1. Tính $s^2$ và $s$ của cổ phiếu Y (bảng: 12/8/20). → $s^2 = 12{,}16$, $s \approx 3{,}49$.
  2. So sánh rủi ro X và Y khi cùng $x̄ = 6{,}8$. → X ổn định hơn ($7{,}36 < 12{,}16$).
- **Luồng Support (Should) —_hint: dùng điều kiện x̄ = 6,8 giải ngược m; xếp hạng theo s²:**
  1. Tìm $m$ của cổ phiếu Z (bảng 8/$m$/16) biết $x̄_Z = 6{,}8$. → $m = 16$.
  2. Tính $s^2_Z$, $s_Z$ và xếp hạng rủi ro X, Y, Z. → $s^2_Z = 8{,}96$, $s_Z \approx 2{,}99$; $X < Z < Y$.
- **Luồng Challenge (Could) —_hint: khuyến nghị phải đủ 3 điều kiện (khẩu vị — mục tiêu — chịu mất vốn); s lớn không tự động xấu:**
  1. Ba nhà đầu tư: bác Long (sắp nghỉ hưu, thận trọng), chị Hương (tích lũy, cân bằng), bạn Nam (trẻ, chấp nhận rủi ro cao). Khuyến nghị cổ phiếu X/Y/Z cho từng người và giải thích. → Long: X; Hương: X/Z theo tỷ trọng; Nam: cân nhắc Y (không toàn bộ).
  2. Hai xạ thủ cùng điểm trung bình 9: An có $s_A \approx 0{,}89$, Bình có $s_B \approx 1{,}67$. Huấn luyện viên chọn người thi chính thức và người "thử chiến thuật đánh liều"? → An chính thức (ổn định); Bình khi cần bứt phá và chấp nhận rủi ro.

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- **ĐGTX máy:** Một mẫu ghép nhóm có $n = 40$, $x̄ = 6{,}8$, $\Sigma n_ic_i^2 = 2336$. Tính $s^2$, $s$. → $s^2 = 58{,}4 - 46{,}24 = 12{,}16$; $s \approx 3{,}49$ — trùng cổ phiếu Y; hoàn nguyên bảng trung gian ✓.
- **Câu hỏi bảng con:** Nhận định Đúng/Sai: (a) "s = −√s² khi s² > 0"; (b) "x̄ khác nhau nhiều vẫn so sánh s trực tiếp"; (c) "s nhỏ hơn → ổn định hơn khi x̄ bằng nhau".

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- **Ứng dụng — Chốt quyết định của chị Hương:** Với 100 triệu: thận trọng → X (s² nhỏ nhất 7,36); cân bằng → phân bổ X/Z; mạo hiểm → cân nhắc thêm Y nhưng không "chuyển toàn bộ" (quy tắc phân tán danh mục).
- **Quick-check:** 2 câu chốt (so sánh s² = 7,36 vs 12,16; nhận định sai của AI tư vấn).
- **Exit Ticket:** 1) Phát biểu quy tắc so sánh khi x̄ bằng nhau; 2) Nêu 1 bẫy (so sánh s khi x̄ khác xa / quên √ / "s lớn luôn xấu"); 3) Tự đánh giá M/S/C; 4) Chốt ngữ cảnh: cổ phiếu nào ít rủi ro nhất? → X ($s^2 = 7{,}36$, $s \approx 2{,}71$).
