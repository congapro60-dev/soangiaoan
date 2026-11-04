<!-- Nguồn: Firestore lessonPlans/16266b7f-10af-4da1-aa3f-5885a5339d19 · Mẫu số liệu ghép nhóm — Tiết 1 · bài tương tác adaptive-1792831747929 · tải 2026-10-24 -->

# KẾ HOẠCH DẠY HỌC — MẪU SỐ LIỆU GHÉP NHÓM (Tiết 1: Khái niệm và quy trình ghép nhóm)

| Lớp | 11 | Tên bài học | Mẫu số liệu ghép nhóm — Tiết 1: Khái niệm và quy trình ghép nhóm | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 20 | Năm học | 2024 – 2025 |

## I. THÔNG TIN CHUNG

**1. Tiêu chuẩn năng lực cốt lõi**
- Tư duy và lập luận toán học: So sánh mẫu số liệu không ghép nhóm và ghép nhóm; phân tích tính hợp lý khi chọn số nhóm và độ dài nhóm.
- Mô hình hóa toán học: Chuyển đổi dữ liệu phát thải $\text{CO}_2$ bình quân và thời gian thực tế thành bảng tần số ghép nhóm.
- Giải quyết vấn đề toán học: Xử lý số liệu thực tiễn, phân chia khoảng và kiểm soát điều kiện biên không trùng lặp.
- Giao tiếp toán học: Sử dụng chuẩn xác các thuật ngữ nửa khoảng $[a_i; a_{i+1})$, giá trị đại diện, độ dài nhóm, tần số tích lũy.
- Tự học và tự nghiên cứu: Khai thác học liệu số và bảng số liệu mở để hình thành quy trình xử lý dữ liệu thống kê.

**2. Mục tiêu học tập**
Sau tiết học, tôi có thể:

| Mức độ | Mục tiêu |
|---|---|
| Must (Cơ bản) | Tôi có thể nhận biết cấu trúc mẫu số liệu ghép nhóm, đọc đúng tần số, xác định độ dài nhóm $L = a_{i+1} - a_i$ và tính giá trị đại diện $c_i = \dfrac{a_i + a_{i+1}}{2}$ của từng nhóm $[a_i; a_{i+1})$. [Bloom: Nhớ – Hiểu] |
| Should (Trọng tâm) | Tôi có thể thực hiện đủ 4 bước để chuyển đổi một mẫu số liệu thô cho trước thành bảng phân bố tần số ghép nhóm với các nhóm có độ dài bằng nhau. [Bloom: Áp dụng] |
| Could (Nâng cao) | Tôi có thể phân tích ảnh hưởng của việc mất thông tin gốc khi ghép nhóm và đề xuất lựa chọn số nhóm $k$, độ dài nhóm $h$ tối ưu trong các bài toán thực tiễn về khí hậu, kinh tế. [Bloom: Phân tích – Sáng tạo] |

**3. Phân hóa mục tiêu**

| Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|
| Xác định các đầu mút, tính giá trị đại diện và độ dài nhóm theo bảng cho sẵn (SGK Bài 1 tr. 65). | Tự tìm $x_{\min}, x_{\max}$, xác định khoảng biến thiên và lập bảng ghép nhóm với $k$ cho trước (SGK Bài 2 tr. 65). | Phản biện tính hợp lý của việc chia nhóm quá dày hoặc quá thưa; xử lý triệt để bẫy điểm mút biên $x_k = a_{i+1}$ (SGK Bài 3 tr. 66). |

**4. Tài liệu dạy học**
- Sách giáo khoa Toán 11 tập 2 (tr. 61 – 66).
- Phiếu số 1 — Khám phá cấu trúc mẫu số liệu ghép nhóm (in sẵn theo 3 mức độ).
- Phiếu số 2 — Quy trình ghép nhóm số liệu phát thải $\text{CO}_2$ toàn cầu (kèm KWLI-Chart & Exit Ticket).
- Bộ bảng con, bút dạ lông, thước kẻ cho mỗi học sinh.
- Màn hình TV chiếu bảng số liệu phát thải khí nhà kính toàn cầu (nguồn World Bank).

**Căn cứ điều chỉnh từ đánh giá tiết trước:**
- Khoảng 30% học sinh còn lúng túng khi xác định nửa khoảng $[a; b)$ ở lớp 10, hay nhầm lẫn việc lấy hay không lấy giá trị tại mút $b$ $\rightarrow$ Thiết kế câu hỏi phản biện trực tiếp về điểm mút ngay trong HĐ2.
- Kỹ năng đếm dữ liệu lớn dễ sót $\rightarrow$ Rèn luyện thao tác gạch kiểm (tally mark) và công thức kiểm tra tổng tần số $\sum m_i = n$.
- Học sinh có xu hướng thụ động chờ giáo viên giải $\rightarrow$ Sử dụng triệt để kỹ thuật chờ hai nhịp và gọi ngẫu nhiên qua vòng quay số.

---

## MINH CHỨNG HQT / CIS

| Minh chứng | HS làm gì $\rightarrow$ GV thu được gì | Observer nhìn thấy gì (CIS dự giờ) | Vị trí |
|---|---|---|---|
| **[PHÂN HÓA]** | HS chọn và thực hiện phiếu học tập số 1 theo 3 nhánh năng lực NB–TH–VD $\rightarrow$ GV thu được sản phẩm bài làm khớp đúng trình độ của từng nhóm học sinh. | Folder tài liệu đặt giữa mỗi bàn có 3 ngăn rõ ràng; HS chủ động rút phiếu đúng màu, GV di chuyển hỗ trợ nhóm cơ bản bằng câu hỏi hạ thang. | HĐ2 (P8–P32); Phiếu số 1 |
| **[ĐGTX]** | HS đồng loạt viết đáp án giá trị đại diện và phân loại điểm biên lên bảng con $\rightarrow$ GV đo lường được tỉ lệ hiểu bài tức thời, can thiệp nếu sai quá 20%. | 100% HS giơ bảng con đồng loạt sau khẩu lệnh đếm "3, 2, 1"; GV dừng lại chọn ngẫu nhiên một bảng có lỗi sai để phân tích công khai. | HĐ2 (P8–P32); HĐ3 (P32–P38) |
| **[CÔNG DÂN TOÀN CẦU]** | HS phân tích dữ liệu thực tế về lượng phát thải $\text{CO}_2$ của 20 quốc gia đại diện các châu lục $\rightarrow$ GV thu được bảng tần số ghép nhóm và ý thức về trách nhiệm môi trường. | Màn hình chiếu bảng số liệu phát thải quốc tế (World Bank); HS làm việc trên dữ liệu thật, đối chiếu sự chênh lệch phát thải giữa các nhóm nước. | HĐ2 (P8–P32); Phiếu số 2 |
| **[PHẢN TƯ]** | HS tự điền 2 cột L, I trên phiếu KWLI và hoàn thành Exit ticket $\rightarrow$ GV thu nhận mức độ đạt chuẩn và các câu hỏi còn tồn đọng để điều chỉnh bài dạy. | 2 phút cuối tiết, cả lớp trật tự điền phiếu thoát lớp (Exit ticket) và nộp vào khay thu bài trước khi rời phòng học. | HĐ4 (P38–P40) |
| Danielson 1a | Định nghĩa nhóm $[a_i; a_{i+1})$, độ dài nhóm $L = a_{i+1}-a_i$, giá trị đại diện $c_i = \dfrac{a_i+a_{i+1}}{2}$ được chuẩn hóa bằng công thức toán học và ví dụ kiểm chứng. | Bảng lớp ghi chuẩn xác các công thức đóng khung; HS ghi chép đầy đủ vào vở. | HĐ2 (P8–P32) |
| Danielson 1b | Phân hóa theo 3 nhánh NB–TH–VD, có phương án hạ thang câu hỏi khi HS gặp bế tắc về quy tắc nửa khoảng. | GV sử dụng câu hỏi gợi ý bậc thang cho học sinh gặp khó khăn ở nhóm hỗ trợ. | HĐ2 (P8–P32) |
| Danielson 1c | Công bố mục tiêu Must – Should – Could rõ ràng, HS tự đánh giá bằng ký hiệu tay vào giữa và cuối tiết học. | Mục tiêu chiếu cố định góc bảng; HS giơ ngón tay cái (thumbs up/down) phản hồi tiến độ. | HĐ1 (P0–P8); HĐ2 (P8–P32) |
| Danielson 1d | Sử dụng kết hợp bảng con cá nhân, phiếu học tập 3 màu và màn hình số liệu chiếu biểu đồ. | Học sinh thao tác luân phiên giữa bảng con, bút dạ và phiếu học tập in sẵn. | Toàn bộ tiến trình (HĐ1 – HĐ4) |
| Danielson 1e | Phân bổ thời gian logic, chính xác từng phút theo chuỗi thời gian 40 phút không gián đoạn. | Đồng hồ đếm ngược chạy trên màn hình phụ; các hoạt động chuyển tiếp nhịp nhàng. | Toàn bộ tiến trình (HĐ1 – HĐ4) |
| Danielson 1f | Đánh giá thường xuyên thông qua kỹ thuật chờ hai nhịp, vinh danh lỗi sai và câu hỏi hệ quả. | GV chiếu một bài làm sai điểm biên, cho cả lớp phát hiện và sửa sai tích cực. | HĐ2 (P8–P32); HĐ3 (P32–P38) |

---

## II. TIẾN TRÌNH HOẠT ĐỘNG

### HOẠT ĐỘNG 1: PHA TRẢI NGHIỆM — BÀI TOÁN MỞ ĐẦU VÀ XÁC ĐỊNH MỤC TIÊU (8 phút, P0–P8)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P0 – P8 | ── **PHẦN 1: BÀI TOÁN MỞ ĐẦU (5 phút)** ──<br/>**GV chiếu bảng số liệu thô về thời gian sử dụng Internet hàng ngày (đơn vị: phút) của 40 học sinh lớp 11A:**<br/>*(Bảng gồm 40 số liệu dao động từ 35 đến 235 phút, phân bố rải rác).*<br/>GV nêu câu hỏi thiết yếu giữ nguyên suốt tiết:<br/>*"Làm thế nào để nhìn vào một tập hợp số liệu lớn mà nhận biết ngay được bức tranh tổng thể và xu hướng tập trung của dữ liệu?"*<br/><br/>**HS giơ BẢNG CON ôn tập 3 câu kiến thức nền:**<br/>- **[SO SÁNH]** So sánh giá trị lớn nhất ($x_{\max}$) và nhỏ nhất ($x_{\min}$) trong mẫu số liệu trên?<br/>- **[SỐ HỌC]** Tính khoảng biến thiên: $R = x_{\max} - x_{\min}$.<br/>- **[SUY LUẬN]** Nếu lập bảng phân bố tần số đơn lẻ cho từng giá trị ở lớp 10, bảng này sẽ có nhược điểm gì?<br/>*(Áp dụng Kỹ thuật chờ hai nhịp: Nhịp 1 đọc đề xong chờ 10 giây tính toán, nhịp 2 hô "3, 2, 1, giơ bảng!").*<br/><br/>GV gọi ngẫu nhiên 1 HS: "Bảng tần số đơn lẻ sẽ có bao nhiêu hàng? Có quan sát nhanh được học sinh dùng nhiều hay ít không?"<br/>$\rightarrow$ HS trả lời: Quá dài, nhiều giá trị chỉ có tần số bằng 1, rất khó nhìn.<br/>$\rightarrow$ GV chốt: "Để khắc phục nhược điểm này, ta gom các số liệu gần nhau thành từng nhóm. Đó là nội dung bài học hôm nay."<br/><br/>*(Hình ảnh minh họa: Học sinh quan sát bảng số liệu thống kê thời gian sử dụng Internet trên màn hình lớp học).*<br/><br/>── **PHẦN 2: XÁC ĐỊNH MỤC TIÊU VÀ NHIỆM VỤ HỌC TẬP (3 phút)** ──<br/>**GV phát Phiếu số 2 (có chứa bảng KWLI-Chart ở đầu trang).**<br/>**HS điền nhanh cột K và W trong 60 giây:**<br/>- **K (Đã biết):** Giá trị lớn nhất, nhỏ nhất, bảng tần số rời rạc lớp 10.<br/>- **W (Muốn biết):** Gom nhóm như thế nào cho công bằng? Số nằm ở biên thì tính vào nhóm nào?<br/>GV gọi ngẫu nhiên 2 HS đọc cột W của mình.<br/><br/>**GV công bố mục tiêu 3 mức độ (Must – Should – Could):**<br/>- *Must:* Đọc và tính được các đại lượng của nhóm $[a_i; a_{i+1})$.<br/>- *Should:* Tự lập bảng ghép nhóm từ dãy số liệu thô.<br/>- *Could:* Phân tích việc chọn số nhóm và bẫy mất mát dữ liệu gốc.<br/>HS dùng bút dạ đánh dấu mức mục tiêu mình quyết tâm đạt được trong tiết học này. | **BẢNG CON ÔN TẬP:**<br/><br/>$$x_{\max} = 235; \quad x_{\min} = 35$$<br/><br/>Khoảng biến thiên:<br/>$$R = x_{\max} - x_{\min} = 235 - 35 = 200 \text{ (phút)}$$<br/><br/>$\rightarrow$ Nhận xét: Bảng tần số từng giá trị rời rạc bị phân tán, không thấy được xu hướng tập trung của mẫu số liệu lớn.<br/><br/>$\rightarrow$ **Giải pháp: Gom nhóm số liệu.**<br/><br/>---<br/><br/>**KHUNG KWLI-CHART:**<br/><br/>- **K (Know):** $x_{\max}, x_{\min}$, tần số $m_i$, cỡ mẫu $n$.<br/>- **W (Want):** Quy tắc chia nhóm? Tránh trùng mút biên?<br/>- **L (Learned):** *(Điền cuối tiết)*<br/>- **I (Interesting):** *(Điền cuối tiết)*<br/><br/>**Mục tiêu trọng tâm tiết học:**<br/>Nắm vững khái niệm nhóm $[a_i; a_{i+1})$, giá trị đại diện $c_i$, độ dài nhóm $L$ và quy trình 4 bước ghép nhóm số liệu. |

---

### HOẠT ĐỘNG 2: PHA HÌNH THÀNH KIẾN THỨC — KHÁI NIỆM VÀ QUY TRÌNH GHÉP NHÓM (24 phút, P8–P32)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P8 – P32 | ════ **NỘI DUNG 1: KHÁI NIỆM MẪU SỐ LIỆU GHÉP NHÓM (11 phút)** ════<br/>── **Bước 1: Kết nối (2 phút)** ──<br/>GV dẫn dắt từ ví dụ khởi động: "Thay vì để từng số, ta chia thời gian từ 35 đến 235 phút thành các khoảng 40 phút: $[30; 70), [70; 110), [110; 150), [150; 190), [190; 230), [230; 270)$."<br/>- **[PHÁT HIỆN]** "Các khoảng trên có điểm gì đặc biệt về ký hiệu ngoặc và độ dài?"<br/>$\rightarrow$ Chờ 3 giây, gọi ngẫu nhiên: Đều là nửa khoảng lấy dấu ngoặc vuông bên trái, độ dài mỗi khoảng đều bằng $40$.<br/>*(Dự phòng hạ thang: Nếu HS chưa nhận ra, GV hỏi: $70 - 30 = ?; 110 - 70 = ?$ Hai phép trừ này nói lên điều gì?).*<br/><br/>── **Bước 2: Hình thành (4 phút)** ──<br/>GV phát Phiếu học tập số 1 (3 mức độ phân hóa đồng mức để sẵn trong folder bàn học).<br/>*(Khẩu lệnh: "4 phút làm việc cá nhân hoàn thành Phiếu số 1, bắt đầu!").*<br/>- **[KHÁI QUÁT]** Thế nào là một nhóm số liệu? Ký hiệu nửa khoảng $[a_i; a_{i+1})$ có ý nghĩa gì đối với giá trị $x$ thuộc nhóm?<br/>- **[PHẢN BIỆN]** Học sinh An cho rằng: "Giá trị đại diện của nhóm $[a; b)$ luôn phải là một số nguyên nằm chính giữa". Ý kiến này đúng hay sai? Lấy một ví dụ phản chứng.<br/>**[🔴 PHÂN HÓA]** HS làm phiếu theo năng lực: Nhóm NB làm bài xác định mút và độ dài nhóm cho trước; Nhóm TH tính giá trị đại diện; Nhóm VD phản biện bài toán mất mát thông tin.<br/><br/>── **Bước 3: Kiểm tra (3 phút)** ──<br/>GV yêu cầu cả lớp dùng bảng con viết nhanh đáp án:<br/>- Viết độ dài nhóm và giá trị đại diện của nhóm $[60; 90)$.<br/>- **[PHẢN BIỆN]** "Học sinh Bình có thời gian dùng Internet đúng bằng 90 phút. Bình thuộc nhóm $[60; 90)$ hay nhóm $[90; 120)$? Vì sao?"<br/>*(Áp dụng Vinh danh lỗi sai: GV chọn một bảng con ghi nhầm $[60; 90)$, phân tích ký hiệu ngoặc vuông $[$ lấy dấu $\ge$, ngoặc tròn $)$ lấy dấu $<$).*<br/><br/>── **Bước 4: Chuẩn hóa (2 phút)** ──<br/>- **[KHÁI QUÁT]** GV chuẩn hóa định nghĩa, công thức đóng khung trên bảng.<br/>- **[SÁNG TẠO]** (Dành cho HS giỏi): "Nhóm cuối cùng của mẫu số liệu đôi khi người ta viết là đoạn $[a_k; a_{k+1}]$ thay vì nửa khoảng. Tại sao lại làm như vậy?"<br/>$\rightarrow$ HS giỏi: Để lấy được cả giá trị lớn nhất $x_{\max}$ nếu giá trị đó trùng đúng mút trên cùng.<br/>HS tự đánh giá ngón tay cái (Thumbs up: hiểu rõ quy ước nửa khoảng; Thumbs down: còn phân vân).<br/><br/>════ **NỘI DUNG 2: QUY TRÌNH GHÉP NHÓM MẪU SỐ LIỆU THỰC TẾ (13 phút)** ════<br/>── **Bước 1: Kết nối (2 phút)** ──<br/>GV chiếu bảng số liệu thực tế về **Lượng phát thải khí nhà kính bình quân đầu người năm 2022 (tấn $\text{CO}_2$ tương đương/người/năm)** của 20 quốc gia đại diện:<br/>*(Số liệu: 1,2; 1,8; 2,4; 3,1; 4,5; 5,2; 6,8; 7,2; 8,0; 9,5; 10,1; 12,4; 13,5; 14,2; 15,0; 16,8; 18,2; 20,5; 22,1; 24,0 — Nguồn: World Bank).*<br/>- **[MÔ HÌNH HÓA]** "Dữ liệu phát thải này biến thiên từ bao nhiêu đến bao nhiêu? Làm sao để gom thành 5 nhóm công bằng?"<br/><br/>── **Bước 2: Hình thành (5 phút)** ──<br/>GV hướng dẫn 4 bước ghép nhóm mẫu số liệu:<br/>- Bước 1: Tìm $x_{\min}, x_{\max}$ và tính $R = x_{\max} - x_{\min}$.<br/>- Bước 2: Chọn số nhóm $k$ và độ dài nhóm $h > \dfrac{R}{k}$.<br/>- Bước 3: Xác định các nửa khoảng $[a_i; a_{i+1})$ sao cho $a_1 \le x_{\min}$ và $a_{k+1} > x_{\max}$.<br/>- Bước 4: Đếm tần số $m_i$ của từng nhóm.<br/>**[🟢 CÔNG DÂN TOÀN CẦU]** HS thảo luận cặp đôi hoàn thành Phiếu số 2: Lập bảng ghép nhóm cho số liệu $\text{CO}_2$ với 5 nhóm bằng nhau bắt đầu từ mút $a_1 = 0$.<br/>*(GV dùng kỹ thuật Quét Radar bao quát lớp, nhắc nhở các bàn dùng phương pháp gạch kiểm tally mark).*<br/><br/>── **Bước 3: Kiểm tra (4 phút)** ──<br/>**[🟣 ĐGTX]** GV yêu cầu kiểm tra điều kiện bảo toàn: $\sum_{i=1}^k m_i = n$.<br/>GV mời đại diện 1 nhóm TH lên bảng điền bảng tần số ghép nhóm.<br/>- **[PHẢN BIỆN]** Một nhóm đưa ra kết quả tần số các nhóm lần lượt là: 4, 4, 3, 5, 3 (tổng là 19). GV hỏi: "Điều gì đã xảy ra? Vì sao tổng lại thiếu 1 quốc gia?"<br/>$\rightarrow$ HS phát hiện: Bỏ sót giá trị biên 15,0 (nằm ở ranh giới giữa $[10; 15)$ và $[15; 20)$ do nhầm lẫn quy ước dấu ngoặc).<br/><br/>── **Bước 4: Chuẩn hóa (2 phút)** ──<br/>GV chốt lại bảng tần số chuẩn hóa.<br/>- **[SÁNG TẠO]** "Nếu ta chỉ chia số liệu này thành $k=2$ nhóm hoặc chia quá nhiều thành $k=20$ nhóm thì bức tranh thống kê sẽ ra sao?"<br/>$\rightarrow$ HS khá/giỏi: Nếu $k=2$ thì quá thô, mất thông tin phân bố; nếu $k=20$ thì trở về bảng tần số rời rạc, không còn tác dụng tổng hợp.<br/>$\rightarrow$ GV kết luận quy tắc kinh nghiệm: Thường chọn $k$ từ 5 đến 8 nhóm với cỡ mẫu vừa ($n \le 100$). | **I. ĐỊNH NGHĨA MẪU SỐ LIỆU GHÉP NHÓM**<br/><br/>1. **Khái niệm:** Mẫu số liệu ghép nhóm là mẫu số liệu được trình bày dưới dạng các nhóm số liệu liên tiếp dạng $[a_i; a_{i+1})$.<br/><br/>2. **Các đại lượng đặc trưng của nhóm $[a_i; a_{i+1})$:**<br/>- **Đầu mút:** $a_i$ là đầu mút trái, $a_{i+1}$ là đầu mút phải.<br/>- **Độ dài nhóm:**<br/>$$L = a_{i+1} - a_i$$<br/>- **Giá trị đại diện:**<br/>$$c_i = \dfrac{a_i + a_{i+1}}{2}$$<br/>- **Tần số $m_i$:** Số lượng giá trị thuộc nửa khoảng $[a_i; a_{i+1})$ ($a_i \le x < a_{i+1}$).<br/><br/>**Đáp án PHT 1:**<br/>- **NB:** Nhóm $[40; 60)$ có mút trái 40, mút phải 60, $L = 60 - 40 = 20$, $c_1 = 50$.<br/>- **TH:** Nhóm $[60; 90)$ có $L = 30$, giá trị đại diện: $$c = \dfrac{60+90}{2} = 75$$<br/>- **VD:** Giá trị 90 thuộc $[90; 120)$ vì $[a; b) = \{x \mid a \le x < b\}$. Ý kiến bạn An sai vì nếu khoảng $[0; 5)$ thì đại diện là $2{,}5$.<br/><br/>⚠ **Lỗi phổ biến:**<br/>- Nhầm giá trị đại diện là hiệu hai mút thay vì trung bình cộng.<br/>- Đếm trùng giá trị mút biên vào cả hai nhóm liền kề.<br/><br/>---<br/><br/>**II. QUY TRÌNH GHÉP NHÓM MẪU SỐ LIỆU**<br/><br/>**Quy trình 4 bước:**<br/>1. Tìm $x_{\min}, x_{\max}$ và khoảng biến thiên $R = x_{\max} - x_{\min}$.<br/>2. Chọn số nhóm $k$ và tính độ dài $h \ge \dfrac{R}{k}$ (làm tròn lên thích hợp).<br/>3. Xác định các nhóm: $[a_1; a_2), [a_2; a_3), \dots, [a_k; a_{k+1})$.<br/>4. Đếm tần số $m_i$ từng nhóm. Kiểm tra: $$\sum_{i=1}^k m_i = n$$<br/><br/>**Bài toán thực tế phát thải $\text{CO}_2$ ($n=20$):**<br/>- $x_{\min} = 1{,}2$; $x_{\max} = 24{,}0 \implies R = 22{,}8$.<br/>- Chia thành $k=5$ nhóm, chọn độ dài $h = 5$.<br/>- Các nhóm: $[0; 5), [5; 10), [10; 15), [15; 20), [20; 25)$.<br/><br/>**BẢNG PHÂN BỐ TẦN SỐ GHÉP NHÓM:**<br/>| Nhóm (tấn/người) | Đại diện $c_i$ | Tần số $m_i$ |<br/>|---|---|---|
| $[0; 5)$ | 2,5 | 4 |<br/>| $[5; 10)$ | 7,5 | 6 |<br/>| $[10; 15)$ | 12,5 | 4 |<br/>| $[15; 20)$ | 17,5 | 3 |<br/>| $[20; 25)$ | 22,5 | 3 |<br/>| **Tổng** | — | **$n = 20$** | |

```tikz
\begin{tikzpicture}[scale=0.9]
    % Trục số biểu diễn nửa khoảng
    \draw[thick, ->] (0,0) -- (10,0) node[right] {$x$};
    \draw[thick] (2,-0.1) -- (2,0.1) node[below=4pt] {$a_i$};
    \draw[thick] (7,-0.1) -- (7,0.1) node[below=4pt] {$a_{i+1}$};
    \draw[ultra thick, blue] (2,0) -- (7,0);
    \node[blue] at (2,0) {\textbf{[}};
    \node[blue] at (7,0) {\textbf{)}};
    % Độ dài
    \draw[<->, dashed] (2,0.5) -- (7,0.5) node[midway, above] {$L = a_{i+1} - a_i$};
    % Giá trị đại diện
    \filldraw[red] (4.5,0) circle (2pt) node[above=4pt] {$c_i = \frac{a_i + a_{i+1}}{2}$};
\end{tikzpicture}
```

```tikz
\begin{tikzpicture}[scale=0.85]
    % Biểu đồ cột biểu diễn phân bố tần số ghép nhóm CO2
    \draw[thick, ->] (0,0) -- (11,0) node[right] {Phát thải (tấn)};
    \draw[thick, ->] (0,0) -- (0,7) node[above] {Tần số (số QG)};
    
    % Các vạch trục y
    \foreach \y in {1,2,3,4,5,6}
        \draw (0.1,\y) -- (-0.1,\y) node[left] {\y};
        
    % Cột 1: [0; 5) -> m=4
    \draw[fill=blue!40] (0,0) rectangle (2,4);
    \node at (1,-0.5) {\footnotesize $[0; 5)$};
    \node[above] at (1,4) {4};
    
    % Cột 2: [5; 10) -> m=6
    \draw[fill=blue!50] (2,0) rectangle (4,6);
    \node at (3,-0.5) {\footnotesize $[5; 10)$};
    \node[above] at (3,6) {6};
    
    % Cột 3: [10; 15) -> m=4
    \draw[fill=blue!40] (4,0) rectangle (6,4);
    \node at (5,-0.5) {\footnotesize $[10; 15)$};
    \node[above] at (5,4) {4};
    
    % Cột 4: [15; 20) -> m=3
    \draw[fill=blue!30] (6,0) rectangle (8,3);
    \node at (7,-0.5) {\footnotesize $[15; 20)$};
    \node[above] at (7,3) {3};
    
    % Cột 5: [20; 25) -> m=3
    \draw[fill=blue!30] (8,0) rectangle (10,3);
    \node at (9,-0.5) {\footnotesize $[20; 25)$};
    \node[above] at (9,3) {3};
\end{tikzpicture}
```

---

### HOẠT ĐỘNG 3: PHA RÈN LUYỆN — LUYỆN TẬP VÀ MỞ RỘNG THỰC TIỄN (6 phút, P32–P38)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P32 – P38 | ── **PHẦN 1: KIỂM TRA NHANH TRÊN BẢNG CON (4 phút)** ──<br/>GV chiếu 3 câu hỏi trắc nghiệm nhanh phân hóa:<br/>- **Câu 1 [NB] (SGK Bài 1 tr. 65):** Cho bảng nhóm $[20; 30), [30; 40), [40; 50)$. Xác định giá trị đại diện của nhóm thứ hai?<br/>- **Câu 2 [TH] (SBT tr. 42):** Cự ly chạy 100m của học sinh có $x_{\min} = 12{,}1\text{ s}$, $x_{\max} = 15{,}5\text{ s}$. Nếu chia 4 nhóm có độ dài bằng nhau bắt đầu từ mút $12{,}0\text{ s}$ thì độ dài mỗi nhóm $h$ bằng bao nhiêu?<br/>- **Câu 3 [VDC] (GV tự thiết kế):** Một bảng thống kê ghi các nhóm: $[10; 20), [20; 30), [31; 40)$. Bảng ghép nhóm này sai ở đâu và dẫn đến hậu quả gì khi có một học sinh đạt giá trị $30{,}5$?<br/><br/>HS làm việc theo cặp trong 2 phút, viết kết quả lên bảng con.<br/>Lệnh: "3, 2, 1, giơ bảng!". GV quét kết quả toàn lớp.<br/><br/>── **PHẦN 2: MỞ RỘNG & THỰC TIỄN (2 phút)** ──<br/>GV chiếu giao diện chỉ số chất lượng không khí (AQI) từ ứng dụng quan trắc môi trường thế giới (AirVisual) — dữ liệu hiển thị theo nhóm màu: $[0; 50)$ Tốt, $[50; 100)$ Trung bình, $[100; 150)$ Kém...<br/>- **[HỆ QUẢ]** "Nếu một hệ thống quan trắc nhầm lẫn mút biên, xếp giá trị ô nhiễm 100 từ nhóm 'Trung bình' sang nhóm 'Kém', hệ quả xã hội đối với người dân và trường học sẽ ra sao?"<br/>$\rightarrow$ HS: Có thể gây hoang mang, ảnh hưởng đến các quyết định sinh hoạt ngoài trời hoặc cảnh báo y tế bị sai lệch.<br/><br/>*Nhiệm vụ neo cho HS xong sớm:* Tự thiết lập mẫu dữ liệu 10 bạn trong tổ về thời gian tự học và đề xuất cách chia 3 nhóm tối ưu. | **ĐÁP ÁN BẢNG CON KIỂM TRA:**<br/><br/>- **Câu 1 [NB]:** Nhóm $[30; 40)$ có giá trị đại diện: $$c_2 = \dfrac{30 + 40}{2} = 35$$<br/>- **Câu 2 [TH]:** Ta có $R = 15{,}5 - 12{,}0 = 3{,}5$. Khi chia 4 nhóm: $$h \ge \dfrac{3{,}5}{4} = 0{,}875$$ $\implies$ Chọn độ dài chẵn $h = 1{,}0$ với các nhóm: $[12; 13), [13; 14), [14; 15), [15; 16)$.<br/><br/>- **Câu 3 [VDC]:** Các nhóm không liên tiếp (bỏ hổng khoảng $(30; 31)$). Giá trị $30{,}5$ không thuộc vào nhóm nào, vi phạm tính bao phủ toàn diện của mẫu số liệu.<br/><br/>**Ý NGHĨA THỰC TIỄN:**<br/>Mọi hệ thống chỉ số phân cấp (AQI, mức cảnh báo bão, thang điểm tín dụng) đều phải dùng các nhóm liên tiếp không hở mút để đảm bảo tính liên tục của dữ liệu thực tế. |

---

### HOẠT ĐỘNG 4: PHA SƠ KẾT — ĐÁNH GIÁ VÀ PHẢN TƯ EXIT TICKET (2 phút, P38–P40)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P38 – P40 | **GV yêu cầu HS hoàn thiện 2 cột L, I của bảng KWLI-Chart:**<br/>- **L (Learned):** Ghi 1 điều quan trọng nhất em đã học được hôm nay.<br/>- **I (Interesting):** 1 điều em thấy thú vị hoặc 1 thắc mắc chưa giải quyết xong.<br/><br/>GV gọi ngẫu nhiên 1 HS trả lời nhanh câu hỏi **[KHÁI QUÁT]**: "Nêu lại 4 bước cốt lõi để ghép nhóm mẫu số liệu thô?"<br/><br/>**HS hoàn thành Exit ticket 30 giây ở góc phiếu và nộp lại khi ra khỏi lớp:**<br/>- ✓ Điều em nắm chắc nhất: ....................<br/>- ? Điều em còn băn khoăn nhất: .................... | **TỔNG KẾT BÀI HỌC:**<br/><br/>1. Mẫu số liệu ghép nhóm giúp biểu diễn xu hướng tập trung của tập dữ liệu lớn.<br/>2. Nhóm $[a_i; a_{i+1})$ lấy dấu $\ge$ ở mút trái, $<$ ở mút phải.<br/>3. Giá trị đại diện của nhóm: $$c_i = \dfrac{a_i + a_{i+1}}{2}$$<br/>4. Quy tắc ghép nhóm: Các nhóm phải liên tiếp, không chồng chéo, bao phủ toàn bộ khoảng giá trị từ $x_{\min}$ đến $x_{\max}$. |

---

## HƯỚNG DẪN VỀ NHÀ (BTVN)
- **HS yếu/TB:** Hoàn thành Bài 1, Bài 2a (SGK tr. 65); ôn lại cách xác định điểm mút của nửa khoảng.
- **HS khá:** Hoàn thành Bài 2b, Bài 3 (SGK tr. 65, 66); thu thập số liệu chiều cao của các thành viên trong gia đình hoặc tổ học tập và lập bảng tần số ghép nhóm.
- **HS giỏi:** Đọc mục "Em có biết?" về công thức chọn số nhóm Sturges $k \approx 1 + 3{,}322 \log n$; giải thích tại sao khi cỡ mẫu $n$ tăng rất lớn thì số nhóm chỉ cần tăng theo hàm logarit.
- **Toàn lớp:** Xem trước nội dung Tiết 2: "Các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm" (Số trung bình và Mốt).

---

## SƠ KẾT / RÚT KINH NGHIỆM
- **Exit ticket:**
  - ✓ Điều em nắm chắc nhất: __________________________________________________
  - ? Điều em còn thắc mắc: __________________________________________________
- **Ghi nhận của giáo viên sau tiết dạy:**
  - Tỉ lệ học sinh đạt chuẩn Must (tính giá trị đại diện và độ dài nhóm): ............%
  - Lỗi sai phổ biến còn tồn đọng trong quá trình xử lý mút biên: ....................................................
  - Kế hoạch bù đắp/điều chỉnh đầu tiết sau: ................................................................................

---

## PHỤ LỤC: HỌC LIỆU VÀ PHIẾU HỌC TẬP

### PHIẾU SỐ 1 – KHÁM PHÁ CẤU TRÚC MẪU SỐ LIỆU GHÉP NHÓM
*Mẫu số liệu ghép nhóm (Tiết 1 – Dùng trong Hoạt động 2)*  
Họ và tên: ............................................................ Lớp: ................. Tổ: ............

#### A. TÌM HIỂU KHÁI NIỆM (Nhóm đồng mức)

| Nhãn nhiệm vụ | Yêu cầu & Gợi ý | Lời giải của học sinh |
|---|---|---|
| **Mức 1 [NB]** | Cho nhóm số liệu $[40; 60)$.<br/>- Xác định đầu mút trái, đầu mút phải.<br/>- Tính độ dài nhóm $L = a_{i+1} - a_i$.<br/>- Tính giá trị đại diện $c_i = \dfrac{a_i + a_{i+1}}{2}$. | Đầu mút trái: ................ Đầu mút phải: ................<br/><br/>Độ dài nhóm $L =$ ................................................<br/><br/>Giá trị đại diện $c =$ ............................................. |
| **Mức 2 [TH]** | Cho bảng các nhóm điểm: $[0; 2), [2; 4), [4; 6), [6; 8), [8; 10]$.<br/>- Nhận xét về độ dài của các nhóm trên.<br/>- Tính giá trị đại diện của từng nhóm.<br/>- Điểm $6{,}0$ thuộc về nhóm nào? | Nhận xét độ dài: .................................................<br/><br/>Các giá trị đại diện: $c_1 = \dots; c_2 = \dots; c_3 = \dots$<br/><br/>Điểm $6{,}0$ thuộc nhóm: .................................... |
| **Mức 3 [VD]** | Một người nói: "Khi ghép nhóm, ta thay thế mọi giá trị thực tế trong nhóm bằng giá trị đại diện $c_i$, điều này làm mất đi tính chính xác tuyệt đối ban đầu".<br/>Em đồng ý hay phản đối? Nêu lợi ích bù lại của việc ghép nhóm. | Ý kiến của em: ...................................................<br/><br/>Lợi ích lớn nhất của việc gom nhóm:<br/>...........................................................................<br/>........................................................................... |

---

### PHIẾU SỐ 2 – QUY TRÌNH GHÉP NHÓM DỮ LIỆU KHÍ THẢI TOÀN CẦU
*Mẫu số liệu ghép nhóm (Tiết 1 – Dùng trong Hoạt động 1, Hoạt động 2 & Hoạt động 4)*  
Họ và tên: ............................................................ Lớp: ................. Nhóm: .........

#### A. PHIẾU KWLI
- **K (Đã biết từ lớp 10):** ....................................................................................................................
- **W (Muốn biết trong bài này):** ........................................................................................................
- **L (Học được sau bài học):** ..........................................................................................................
- **I (Điều thú vị / Băn khoăn nhất):** ..................................................................................................

#### B. THỰC HÀNH QUY TRÌNH 4 BƯỚC GHÉP NHÓM
**Số liệu:** Lượng phát thải $\text{CO}_2$ (tấn/người/năm) của 20 quốc gia:  
$1{,}2;\; 1{,}8;\; 2{,}4;\; 3{,}1;\; 4{,}5;\; 5{,}2;\; 6{,}8;\; 7{,}2;\; 8{,}0;\; 9{,}5;\; 10{,}1;\; 12{,}4;\; 13{,}5;\; 14{,}2;\; 15{,}0;\; 16{,}8;\; 18{,}2;\; 20{,}5;\; 22{,}1;\; 24{,}0$.

| Các bước | Hướng dẫn thao tác | Kết quả thực hiện |
|---|---|---|
| **Bước 1** | Tìm $x_{\min}, x_{\max}$ và tính khoảng biến thiên $R$. | $x_{\min} =$ ............; $x_{\max} =$ ............ $\implies R =$ ............ |
| **Bước 2** | Chia thành $k = 5$ nhóm bằng nhau, bắt đầu từ $a_1 = 0$. Tính độ dài $h$. | Độ dài nhóm: $h =$ ............................................... |
| **Bước 3 & 4** | Lập bảng tần số ghép nhóm và kiểm tra tổng tần số. | Hoàn thành bảng bên dưới: |

**BẢNG TẦN SỐ GHÉP NHÓM THỰC HÀNH:**

| Nhóm phát thải $[a_i; a_{i+1})$ | Gạch kiểm (Tally mark) | Tần số ($m_i$) | Giá trị đại diện ($c_i$) |
|---|---|---|---|
| $[0; 5)$ | | | |
| $[5; 10)$ | | | |
| $[10; 15)$ | | | |
| $[15; 20)$ | | | |
| $[20; 25)$ | | | |
| **Tổng** | — | **$n =$** | — |

*Kiểm tra:* Tổng các tần số có đúng bằng 20 không? $\square$ Có $\square$ Không (nếu không, hãy rà soát lại các điểm biên $5{,}0; 10{,}0; 15{,}0; 20{,}0$).

---

#### C. EXIT TICKET (Cắt nộp cuối giờ)
- Họ và tên: ................................................................................. Lớp: ................................
- ✓ Kỹ năng em tự tin nhất hôm nay: ......................................................................................
- ? Câu hỏi hoặc điều em còn chưa rõ nhất: ..........................................................................