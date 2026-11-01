<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-86 — "Phương sai và độ lệch chuẩn — Tiết 2: Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro" · Soạn ngày 2026-11-01 -->
<!-- Kế thừa: dữ liệu 2 xạ thủ An/Bình từ Tiết 1 (tasks/giaoan-goc-g12.md · tds-g12-80) — đã KIỂM CHỨNG và SỬA SỐ:
     - Giáo án gốc ghi x̄_A = (2·7 + 16·9 + 2·11)/20 = 8,5 — SAI số học (180/20 = 9).
     - s²_A = 1,05 và s²_B = 3,05 đều tính trên x̄ = 8,5 sai; dòng "81,8 − 72,25 = 1,05" sai số học (đúng ra 9,55).
     - Số đã sửa dùng cho Tiết 2: x̄_A = x̄_B = 9; s²_A = 0,8 (s_A ≈ 0,89); s²_B = 2,8 (s_B ≈ 1,67). -->

# KẾ HOẠCH DẠY HỌC — PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN (Tiết 2: Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro)

| Lớp | 12 | Tên bài học | Phương sai và độ lệch chuẩn — Tiết 2: Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** Giải thích vì sao khi hai mẫu số liệu có cùng số trung bình thì phương sai và độ lệch chuẩn là thước đo hợp lý để so sánh mức độ phân tán (độ ổn định/độ rủi ro).
- **Năng lực giải quyết vấn đề toán học:** Thiết lập quy trình 4 bước (tính $c_i$ → $\bar{x}$ → bảng trung gian → $s^2, s$) để đo và so sánh độ rủi ro giữa hai phương án thực tế; ra khuyến nghị phù hợp với khẩu vị rủi ro của người quyết định.
- **Năng lực giao tiếp toán học:** Phản biện khuyến nghị tư vấn thiếu cơ sở (ví dụ khuyên chọn phương án rủi ro cao mà không xét khẩu vị rủi ro của khách hàng); trình bày được ý nghĩa "$s$ nhỏ → dữ liệu tập trung quanh $\bar{x}$ → ổn định hơn".
- **Năng lực mô hình hóa toán học:** Mô hình hóa bài toán đầu tư (lợi suất cổ phiếu ghép nhóm), thể thao (điểm bắn xạ thủ), sản xuất (máy đóng chai) bằng phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Nhắc lại công thức $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar{x}^2$, $s = \sqrt{s^2}$; tính đúng $s^2, s$ cho mẫu ghép nhóm đơn giản ($k \le 3$ nhóm) và kết luận mẫu nào ổn định hơn khi $\bar{x}$ bằng nhau.
- **Should (Trọng tâm - TH):** Tính $s^2, s$ cho cả hai phương án bằng công thức rút gọn, so sánh và khuyến nghị phương án ít rủi ro hơn; giải thích ý nghĩa kết quả trong ngữ cảnh thực tế.
- **Could (Nâng cao - VD/VDC):** Giải bài toán ngược tìm tần số ẩn khi biết $\bar{x}$ (hoặc $s^2$); phân tích tình huống "s lớn không hẳn xấu" — khuyến nghị phụ thuộc khẩu vị rủi ro; nhận biết hạn chế của $s$ khi dữ liệu có giá trị ngoại lai.

---

## II. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) — chủ đề đầu tư cổ phiếu X/Y/Z.
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.
- Máy tính Casio fx-580VN X (chế độ Statistics có cột tần số) để kiểm chứng.

---

## III. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động — Kế thừa dữ liệu 2 xạ thủ, đặt vấn đề "cùng trung bình, khác gì?" (7 phút)
- **Tình huống (kế thừa Tiết 1, số đã kiểm chứng):** Bảng điểm bắn 20 phát của hai xạ thủ (điểm ghi theo nhóm, giá trị đại diện $c_i$):
  - An: nhóm $c = 7$ có 2 phát, $c = 9$ có 16 phát, $c = 11$ có 2 phát.
  - Bình: nhóm $c = 7$ có 7 phát, $c = 9$ có 6 phát, $c = 11$ có 7 phát.
- **Bảng con ôn kiến thức (Kỹ thuật chờ hai nhịp):**
  1. Tính $\bar{x}_A$ và $\bar{x}_B$. (Kết quả: cùng bằng 9!)
  2. Chỉ cần nhìn bảng tần số, đoán xem xạ thủ nào "đều tay" hơn?
  3. Công thức tính $s^2$ của mẫu ghép nhóm ở Tiết 1 là gì?
- **Câu hỏi thiết yếu giữ nguyên suốt tiết:** *"Khi hai phương án có cùng giá trị trung bình, đại lượng nào đo độ rủi ro (mức phân tán) và dùng nó ra quyết định thế nào?"*

### 2. Hoạt động 2: Hình thành — Ý nghĩa đo rủi ro của $s^2, s$ (8 phút)
- **Quy tắc so sánh:** Hai mẫu có cùng đơn vị đo và số trung bình bằng nhau (hoặc xấp xỉ nhau): mẫu có $s^2$ (hay $s$) **nhỏ hơn** phân tán ít hơn, **ổn định hơn, ít rủi ro hơn**.
- **Quy trình 4 bước đo rủi ro:** (1) Tính $c_i$, xác định $n$; (2) Tính $\bar{x}$; (3) Lập bảng trung gian tính $\sum n_i c_i^2$ (hoặc $\sum n_i(c_i-\bar{x})^2$); (4) Tính $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar{x}^2$, $s = \sqrt{s^2}$, so sánh và kết luận.
- **Chú ý then chốt:** $s$ có cùng đơn vị với dữ liệu; $s^2$ luôn không âm; $s = 0 \Leftrightarrow$ tất cả giá trị bằng $\bar{x}$; $s$ lớn không tự động "xấu" — với nhà đầu tư thích mạo hiểm, biến động lớn đi kèm cơ hội thu lợi cao hơn.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI tư vấn:** "Cổ phiếu X và Y đều có lợi suất trung bình 6,8%/tháng. Nhưng độ lệch chuẩn của Y ($3{,}49$) lớn hơn X ($2{,}71$), chứng tỏ Y biến động mạnh, cơ hội thu lợi cao hơn. Vậy cô nên bán hết cổ phiếu X, chuyển toàn bộ sang Y."
- **Nhiệm vụ HS:** Chỉ ra khuyến nghị của AI thiếu cơ sở: kết luận "Y tốt hơn" đòi hỏi biết khẩu vị rủi ro và mục tiêu của khách hàng; $s$ lớn đồng nghĩa rủi ro mất vốn lớn, không phải "cơ hội cao hơn" một chiều.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng — Chủ đề đầu tư (8 phút)
- **Luồng Master (Must):** Cổ phiếu X — 40 phiên, lợi suất (%/phiên) ghép nhóm: $[0;4)$: 6 phiên, $[4;8)$: 20 phiên, $[8;12)$: 14 phiên. Tính $\bar{x}$, $s^2$, $s$ của X. (Đáp án: $\bar{x} = 6{,}8$; $s^2 = 7{,}36$; $s \approx 2{,}71$.)
- **Luồng Support (Should):** Thêm cổ phiếu Y — 40 phiên: $[0;4)$: 12 phiên, $[4;8)$: 8 phiên, $[8;12)$: 20 phiên. Tính $s^2, s$ cho cả X và Y (dùng công thức rút gọn), kết luận cổ phiếu nào ít rủi ro hơn. (Đáp án: Y có $\bar{x} = 6{,}8$; $s^2 = 12{,}16$; $s \approx 3{,}49$; vì cùng $\bar{x}$ và $s_X < s_Y$ nên X ít rủi ro hơn.)
- **Luồng Challenge (Could):** Cổ phiếu Z — 40 phiên: $[0;4)$: 8 phiên, $[4;8)$: $m$ phiên, $[8;12)$: còn lại. Biết $\bar{x}_Z = 6{,}8$. (a) Tìm $m$; (b) tính $s^2, s$ của Z; (c) xếp hạng rủi ro X, Y, Z. (Đáp án: $m = 16$; $s^2_Z = 8{,}96$; $s_Z \approx 2{,}99$; $s_X < s_Z < s_Y$.)

### 5. Hoạt động 5: Post-Check & Đánh giá thường xuyên (3 phút)
- Bảng con/trắc nghiệm máy: nhận biết mẫu ổn định hơn khi cùng $\bar{x}$; tính nhanh $s$ từ $s^2$.

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- **Bài toán bắn súng quay lại:** Tính $s_A \approx 0{,}89$, $s_B \approx 1{,}67$ → An ổn định hơn; mở rộng: huấn luyện viên chọn An thi đấu, chọn Bình "thử chiến thuật mới" (khẩu vị rủi ro).
- **Bài toán kiểm chứng Casio:** nhập dữ liệu X (cột $x$ = $c_i$, cột Freq = $n_i$), đối soát $\sigma x \approx 2{,}71$.
- **Tổng kết + Exit Ticket:** quy trình 4 bước; "s nhỏ → ổn định"; phản tư KWLI.

---

## IV. KIẾN THỨC BẢNG (tóm tắt)
1. Cùng $\bar{x}$ (hoặc xấp xỉ): mẫu có $s^2$ nhỏ hơn → phân tán ít hơn → ổn định hơn / ít rủi ro hơn.
2. $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar{x}^2$; $s = \sqrt{s^2}$ (cùng đơn vị với dữ liệu, $s \ge 0$).
3. Quy trình 4 bước: $c_i, n$ → $\bar{x}$ → bảng trung gian → $s^2, s$ → kết luận theo ngữ cảnh và khẩu vị rủi ro.
