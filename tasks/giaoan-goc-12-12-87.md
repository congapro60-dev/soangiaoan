<!-- Nguồn: PPCT Chuẩn Bộ GD&ĐT Toán 12 · tds-g12-87 — "Phương sai và độ lệch chuẩn — Tiết 3: Luyện tập" · Soạn ngày 2026-11-03 -->
<!-- Kế thừa: Tiết 1-2 (`12-11-80`, `12-12-86`) về công thức ghép nhóm và đo độ rủi ro. -->
<!-- Tinh hoa V8.8: Dữ liệu thực nghiệm xuyên suốt, hướng dẫn sát cho lớp yếu, câu hỏi tương tác phân tầng. -->

# KẾ HOẠCH DẠY HỌC — PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN (Tiết 3: Luyện tập)

| Lớp | 12 | Tên bài học | Luyện tập phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm | Môn học | Toán (Thống kê) |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2024–2025 |

---

## I. MỤC TIÊU BÀI HỌC

### 1. Năng lực toán học cốt lõi
- **Năng lực tư duy và lập luận toán học:** So sánh mức độ phân tán và độ rủi ro giữa hai tập dữ liệu ghép nhóm có cùng số trung bình ($\bar{x}_A = \bar{x}_B = 35$ phút); giải thích ý nghĩa thực tiễn của phương sai nhỏ (ổn định, ít rủi ro) và phương sai lớn (biến động mạnh, rủi ro cao).
- **Năng lực giải quyết vấn đề toán học:** Vận dụng linh hoạt 2 công thức tính phương sai của mẫu ghép nhóm ($s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar{x}^2$ và $s^2 = \frac{1}{n}\sum n_i(c_i - \bar{x})^2$); lập bảng tính tần số và giá trị đại diện chuẩn xác; tính căn bậc hai để đưa về độ lệch chuẩn cùng đơn vị đo (phút).
- **Năng lực giao tiếp toán học:** Nhận diện và phản biện lỗi sai phổ biến của AI và học sinh khi tính phương sai mẫu ghép nhóm: quên trừ đi $\bar{x}^2$, hoặc lấy nhầm đầu mút khoảng thay vì giá trị đại diện $c_i$.
- **Năng lực mô hình hóa toán học:** Ứng dụng phương sai và độ lệch chuẩn vào bài toán thực tiễn: lựa chọn ứng dụng giao hàng phù hợp theo nhu cầu (khách cần đúng giờ họp chọn dịch vụ có độ lệch chuẩn thấp).

### 2. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản - NB):** Xác định đúng giá trị đại diện $c_i$ của 5 nhóm thời gian; tính đúng số trung bình $\bar{x} = 35$ phút và phương sai $s^2_A = 72$; suy ra độ lệch chuẩn $s_A \approx 8{,}49$ phút.
- **Should (Trọng tâm - TH):** Hoàn thành bảng tính phương sai cho ứng dụng B ($s^2_B = 200 \implies s_B \approx 14{,}14$ phút); so sánh độ phân tán của hai dịch vụ và đưa ra kết luận tư vấn có căn cứ toán học.
- **Could (Nâng cao - VD/VDC):** Phân biệt thao tác kiểm tra bằng máy tính cầm tay (chọn $\sigma_x$ chia cho $n$ thay vì $s_x$ chia cho $n-1$); phân tích tình huống khi hai mẫu có số trung bình khác nhau (giới thiệu hệ số biến thiên $CV = s/\bar{x}$).

---

## II. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối hệ thống SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm bảng số liệu 50 đơn hàng của 2 dịch vụ giao hàng.
- Bảng con học sinh dùng kiểm tra nhanh và tương tác ĐGTX.
- Máy tính cầm tay Casio fx-580VN X (chế độ Thống kê 1 biến có tần số).

---

## III. DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT (THEMATIC DATASET)

Khảo sát thời gian giao hàng (tính bằng phút) của **50 đơn hàng** trong khung giờ cao điểm giữa hai dịch vụ giao đồ ăn công nghệ: **GiaoNhanh (Dịch vụ A)** và **SieuToc (Dịch vụ B)**:

| Khoảng thời gian (phút) | $[10; 20)$ | $[20; 30)$ | $[30; 40)$ | $[40; 50)$ | $[50; 60)$ | Tổng |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Giá trị đại diện $c_i$** | **15** | **25** | **35** | **45** | **55** | — |
| **Số đơn hàng Dịch vụ A ($n_i$)** | 2 | 10 | 26 | 10 | 2 | **50** |
| **Số đơn hàng Dịch vụ B ($n_i$)** | 10 | 10 | 10 | 10 | 10 | **50** |

### Kết quả kiểm chứng toán học (Độc lập & Tuyệt đối):
- **Dịch vụ A:**
  - Số trung bình: $\bar{x}_A = \frac{2\cdot 15 + 10\cdot 25 + 26\cdot 35 + 10\cdot 45 + 2\cdot 55}{50} = \frac{1750}{50} = 35$ (phút).
  - Tổng bình phương: $\sum n_i c_i^2 = 2\cdot 225 + 10\cdot 625 + 26\cdot 1225 + 10\cdot 2025 + 2\cdot 3025 = 64850$.
  - Phương sai: $s^2_A = \frac{64850}{50} - 35^2 = 1297 - 1225 = 72$ (phút$^2$).
  - Độ lệch chuẩn: $s_A = \sqrt{72} = 6\sqrt{2} \approx 8{,}49$ (phút).
- **Dịch vụ B:**
  - Số trung bình: $\bar{x}_B = \frac{10\cdot (15 + 25 + 35 + 45 + 55)}{50} = \frac{1750}{50} = 35$ (phút).
  - Tổng bình phương: $\sum n_i c_i^2 = 10\cdot (225 + 625 + 1225 + 2025 + 3025) = 71250$.
  - Phương sai: $s^2_B = \frac{71250}{50} - 35^2 = 1425 - 1225 = 200$ (phút$^2$).
  - Độ lệch chuẩn: $s_B = \sqrt{200} = 10\sqrt{2} \approx 14{,}14$ (phút).

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1: Khởi động & Đặt vấn đề (7 phút)
- **Tình huống thực tế:** Bạn Lan chuẩn bị có một cuộc họp quan trọng lúc 12h00 trưa tại văn phòng. Lúc 11h15 (còn đúng 45 phút), Lan muốn đặt cơm trưa. Có hai ứng dụng A và B đều quảng cáo: *"Thời gian giao hàng trung bình chỉ 35 phút"*.
- **Câu hỏi tư duy:**
  1. `[QUAN SÁT]` Thời gian trung bình của cả hai dịch vụ đều là 35 phút, vậy Lan chọn ứng dụng nào cũng như nhau, đúng hay sai?
  2. `[ĐỐI CHIẾU]` Nhìn vào bảng số liệu: Dịch vụ nào có số đơn bị giao muộn trên 50 phút nhiều hơn?
  3. `[KẾT NỐI]` Chỉ số thống kê nào giúp Lan đo lường mức độ "đều tay/ổn định" của thời gian giao hàng?

### 2. Hoạt động 2: Ôn tập quy trình & Công cụ tính toán (8 phút)
- **Quy trình 4 bước tính phương sai mẫu ghép nhóm:**
  - Bước 1: Xác định giá trị đại diện $c_i = \frac{a_i + a_{i+1}}{2}$.
  - Bước 2: Tính số trung bình $\bar{x} = \frac{1}{n}\sum n_i c_i$.
  - Bước 3: Tính phương sai theo 1 trong 2 công thức:
    * Công thức 1: $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar{x}^2$ (khuyên dùng khi tính máy tính).
    * Công thức 2: $s^2 = \frac{1}{n}\sum n_i(c_i - \bar{x})^2$ (ý nghĩa độ lệch).
  - Bước 4: Lấy căn bậc hai: $s = \sqrt{s^2}$ (độ lệch chuẩn, đơn vị đo quay về phút).
- **GV làm mẫu dịch vụ A:** Tính $\sum n_i c_i^2 = 64850 \implies s^2_A = 72 \implies s_A \approx 8{,}49$ phút.

### 3. Hoạt động 3: Phát hiện lỗi sai AI (AI Error of the Week) (3 phút)
- **Tình huống AI giải:**
  Cho bảng số liệu của Dịch vụ A ($n=50, \bar{x}=35, \sum n_i c_i^2 = 64850$).
  AI tính: *"Phương sai của dịch vụ A là $s^2 = \frac{64850}{50} = 1297$. Suy ra độ lệch chuẩn $s = \sqrt{1297} \approx 36{,}01$ phút."*
- **Nhiệm vụ HS:**
  1. Phát hiện lỗi: AI quên bước trừ đi $\bar{x}^2$ trong công thức $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar{x}^2$.
  2. Chứng minh phi lý: Thời gian giao hàng dao động trong khoảng $[10; 60)$ phút mà độ lệch chuẩn tính ra $36$ phút (lớn hơn cả số trung bình $35$ phút) là hoàn toàn sai lệch thực tế!
  3. Sửa đúng: $s^2 = 1297 - 35^2 = 1297 - 1225 = 72 \implies s \approx 8{,}49$ phút.

### 4. Hoạt động 4: Luyện tập phân hoá 3 luồng (8 phút)
- **Luồng Master (Must):**
  - Bài 1: Tính phương sai $s^2_B$ và độ lệch chuẩn $s_B$ của dịch vụ B theo mẫu bảng tần số đã cho.
  - Bài 2: So sánh $s_A$ và $s_B$, rút ra dịch vụ nào có thời gian giao hàng ổn định hơn.
- **Luồng Support (Should):**
  - Bài 1: Bạn Lan cần cơm trưa trước 12h00 (trong vòng 45 phút). Hãy đếm số đơn hàng giao trong vòng 40 phút của dịch vụ A và B; kết hợp độ lệch chuẩn để đưa ra lời khuyên cho Lan.
  - Bài 2: Cho bảng số liệu ghép nhóm năng suất của 2 phân xưởng may: Xưởng 1 có $\bar{x}_1 = 50, s_1 = 3$; Xưởng 2 có $\bar{x}_2 = 50, s_2 = 7$. Đánh giá tay nghề của công nhân 2 xưởng.
- **Luồng Challenge (Could):**
  - Bài 1: Dùng máy tính Casio fx-580VN X kiểm tra: Phân biệt kết quả $\sigma_x$ (chia $n$) và $s_x$ (chia $n-1$). Vì sao trên máy tính xuất hiện cả hai chỉ số?
  - Bài 2: Nếu hai tập dữ liệu có số trung bình khác nhau (ví dụ: lương công ty A trung bình 15 triệu, $s=3$ triệu; lương công ty B trung bình 50 triệu, $s=5$ triệu), so sánh độ lệch chuẩn trực tiếp có thỏa đáng không? (Giới thiệu $CV = s/\bar{x}$).

### 5. Hoạt động 5: Post-Check Cá nhân & ĐGTX (3 phút)
- Câu hỏi trắc nghiệm máy trên Student Live View:
  Một mẫu ghép nhóm có $n = 40$, $\bar{x} = 20$, $\sum n_i c_i^2 = 16400$. Phương sai $s^2$ bằng bao nhiêu?
  A. $16400$  B. $410$  C. $10$  D. $400$
  $\to$ Đáp án C ($s^2 = \frac{16400}{40} - 20^2 = 410 - 400 = 10$).

### 6. Hoạt động 6: Vận dụng thực tế & Tổng kết (8 phút)
- Thảo luận chung: Quyết định của Lan — chọn Dịch vụ A vì độ lệch chuẩn nhỏ ($8{,}49$ phút), $76\%$ đơn hàng hoàn thành dưới 40 phút, rủi ro trễ họp là tối thiểu.
- Chốt kiến thức bảng: 4 bước tính, 2 công thức tương đương, bẫy quên trừ $\bar{x}^2$, và ý nghĩa độ phân tán.
- Thẻ thoát hiểm (Exit Ticket).

---

## V. KIẾN THỨC BẢNG (TÓM TẮT)
1. **Giá trị đại diện:** $c_i = \frac{a_i + a_{i+1}}{2}$.
2. **Số trung bình:** $\bar{x} = \frac{1}{n}\sum_{i=1}^k n_i c_i$.
3. **Phương sai (2 cách tính):**
   - Cách 1: $s^2 = \frac{1}{n}\sum_{i=1}^k n_i c_i^2 - \bar{x}^2$ (nhớ trừ $\bar{x}^2$).
   - Cách 2: $s^2 = \frac{1}{n}\sum_{i=1}^k n_i(c_i - \bar{x})^2$.
4. **Độ lệch chuẩn:** $s = \sqrt{s^2}$ (cùng đơn vị đo với dữ liệu).
5. **Quy tắc so sánh rủi ro (khi $\bar{x}$ xấp xỉ bằng nhau):**
   - $s$ càng nhỏ $\implies$ Dữ liệu càng tập trung quanh trung bình $\implies$ Độ rủi ro thấp, độ ổn định cao.
   - $s$ càng lớn $\implies$ Dữ liệu càng phân tán $\implies$ Độ rủi ro cao, biến động mạnh.
