<!-- Nguồn: Kế thừa và phát triển từ giáo án Tiết 1 (Firestore 53f75b72-c6f7-443d-8985-46d5d8a6ec0a) theo PPCT tds-g10-86 (Tuần 12, Period 88) -->
# KẾ HOẠCH DẠY HỌC — CÁC SỐ ĐẶC TRƯNG ĐO XU THẾ TRUNG TÂM (Tiết 2: Tứ phân vị và Mốt)

| Lớp | 10 | Tên bài học | Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2025–2026 |

## I. THÔNG TIN CHUNG

**1. Tiêu chuẩn năng lực cốt lõi**
- Tư duy và lập luận toán học: Hiểu bản chất chia mẫu số liệu thành 4 phần bằng nhau của tứ phân vị ($Q_1, Q_2, Q_3$); nhận diện ý nghĩa của mốt ($M_o$) trong thực tiễn tiêu dùng/sản xuất.
- Giải quyết vấn đề toán học: Tính toán chính xác tứ phân vị cho mẫu số liệu không ghép nhóm cỡ nhỏ và cỡ vừa; xác định khoảng tứ phân vị và lọc dữ liệu bất thường sơ bộ.
- Giao tiếp toán học: Diễn giải ý nghĩa thực tiễn của $Q_1, Q_2, Q_3, M_o$; phân biệt khi nào một mẫu số liệu không có mốt, có một mốt hoặc nhiều mốt.
- Sử dụng công cụ, phương tiện học toán: Ứng dụng Casio fx-580VN X / fx-880BTG tính nhanh tứ phân vị và mốt để đối chiếu.

**2. Mục tiêu học tập**
Sau tiết học, tôi có thể:
| Mức độ | Mục tiêu |
|---|---|
| Must (Cơ bản) | Tôi có thể tìm đúng trung vị $Q_2$, nửa mẫu dưới và nửa mẫu trên để xác định $Q_1, Q_3$ của dãy số liệu nhỏ ($n \le 12$); xác định mốt $M_o$ khi các tần số rõ ràng. [Bloom: Nhớ – Hiểu] |
| Should (Trọng tâm) | Tôi có thể giải thích quy tắc lấy trung vị của nửa dưới/nửa trên khi $n$ chẵn và khi $n$ lẻ; phân tích ý nghĩa của $Q_1, Q_3$ trong việc chia nhóm 25% thấp nhất, 25% cao nhất. [Bloom: Áp dụng] |
| Could (Nâng cao) | Tôi có thể kết hợp tứ phân vị và mốt để đánh giá cơ cấu phân hóa điểm số/doanh thu; phản biện lỗi sai phổ biến khi tìm tứ phân vị lúc chưa sắp xếp dãy số liệu. [Bloom: Phân tích – Sáng tạo] |

**3. Phân hóa mục tiêu**
| Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|
| Sắp xếp dãy số liệu tăng dần, tính $Q_2 = M_e$, tìm $Q_1, Q_3$ cho dãy $n$ chẵn đơn giản; tìm mốt có tần số lớn nhất. | Thành thạo quy tắc xác định nửa dưới/nửa trên khi $n$ lẻ (không tính $Q_2$ vào hai nửa); giải thích ý nghĩa tứ phân vị qua biểu đồ hộp sơ bộ. | Xử lý mẫu số liệu có nhiều mốt hoặc không có mốt; kết hợp $Q_1, Q_3$ lập luận giải quyết bài toán tối ưu quy mô sản phẩm/cỡ áo trong kinh doanh. |

---

## II. THIẾT BỊ VÀ HỌC LIỆU
- Giáo viên: Màn chiếu TV/Presenter V8.8, hệ thống câu hỏi tương tác, bộ slide dữ liệu mở rộng từ công ty Alpha.
- Học sinh: Máy tính cá nhân/máy tính bảng kết nối phòng học V8.8, vở ghi, máy tính Casio fx-580VN X / fx-880BTG.

---

## III. TIẾN TRÌNH DẠY HỌC (4 PHA TDS)

### PHA 1: KHỞI ĐỘNG (P0–P5, 5 phút)
- **Tình huống nối tiếp Tiết 1:** Công ty Alpha sau khi chốt lương trung vị $M_e = 10$ triệu, phòng nhân sự tiếp tục khảo sát số giờ làm thêm (OT) trong tháng của 11 nhân viên dự án:
  Dãy số liệu ban đầu (chưa sắp xếp): $12, 5, 20, 8, 15, 12, 0, 18, 12, 10, 16$ (giờ).
- **Nhiệm vụ khởi động (chờ 2 nhịp):**
  1. Hãy sắp xếp dãy số giờ OT theo thứ tự không giảm.
  2. Số giờ OT nào xuất hiện nhiều nhất trong tháng? Con số này cho biết điều gì?
  3. Giá trị trung vị $M_e$ của dãy này là bao nhiêu?
- **Chốt vấn đề:** Giá trị xuất hiện nhiều nhất là $12$ giờ (tần số 3) $\rightarrow$ Khái niệm **Mốt** ($M_o$). Để biết 25% nhân viên làm ít nhất và 25% nhân viên cày OT nhiều nhất nằm ở ngưỡng nào $\rightarrow$ Cần công cụ **Tứ phân vị** ($Q_1, Q_2, Q_3$).

### PHA 2: HÌNH THÀNH KIẾN THỨC (P5–P24, 19 phút)
- **HĐ 2.1: Khái niệm và thuật toán tìm Tứ phân vị ($Q_1, Q_2, Q_3$)**
  - Bước 1: Sắp xếp mẫu số liệu theo thứ tự không giảm: $x_1 \le x_2 \le \dots \le x_n$.
  - Bước 2: Tìm trung vị $Q_2 = M_e$.
  - Bước 3: Chia mẫu thành 2 nửa:
    - Nửa dưới: gồm các số liệu bên trái $Q_2$.
    - Nửa trên: gồm các số liệu bên phải $Q_2$.
    *(Lưu ý then chốt: Nếu $n$ lẻ, không tính $Q_2$ vào cả hai nửa; nếu $n$ chẵn, chia đôi chính giữa).*
  - Bước 4: $Q_1$ là trung vị nửa dưới; $Q_3$ là trung vị nửa trên.
- **HĐ 2.2: Khái niệm Mốt ($M_o$)**
  - Giá trị có tần số lớn nhất trong mẫu số liệu.
  - Lưu ý: Có thể có 1 mốt, nhiều mốt, hoặc không có mốt (nếu tất cả giá trị đều có tần số bằng nhau).
- **HĐ 2.3: Phát hiện lỗi sai AI (AI Error of the Week)**
  - Tình huống: AI tính tứ phân vị của dãy $4, 9, 2, 7, 6, 8, 5$ bằng cách lấy ngay số ở giữa khi CHƯA sắp xếp.
  - Học sinh nhận diện lỗi và sửa lại đúng.

### PHA 3: LUYỆN TẬP PHÂN HOÁ (P24–P37, 13 phút)
- **Phiếu học tập 3 mức (PHT):**
  - Mức 1 (TB): Cho dãy điểm kiểm tra 8 học sinh: $6, 7, 7, 8, 8, 9, 9, 10$. Tìm $Q_1, Q_2, Q_3, M_o$.
  - Mức 2 (Khá): Cho dãy thời gian chờ xe buýt (phút) của 9 hành khách: $3, 5, 7, 8, 10, 12, 15, 18, 20$. Tìm các tứ phân vị. Nêu ý nghĩa của $Q_1, Q_3$.
  - Mức 3 (Giỏi): Khảo sát cỡ giày bán ra tại một cửa hàng trong ngày:
    $38 (2 đôi), 39 (5 đôi), 40 (14 đôi), 41 (8 đôi), 42 (3 đôi)$.
    Chủ cửa hàng nên nhập nhiều nhất cỡ giày nào cho đợt tới? Giải thích vì sao mốt là đại diện tối ưu trong trường hợp này.

### PHA 4: VẬN DỤNG & ĐÁNH GIÁ (P37–P40, 3 phút)
- Exit ticket điện tử (3 câu trắc nghiệm nhanh trên máy HS).
- Nhiệm vụ về nhà: Đọc trước bài "Các số đặc trưng đo mức độ phân tán" (Khoảng biến thiên, Khoảng tứ phân vị $\Delta_Q = Q_3 - Q_1$).
