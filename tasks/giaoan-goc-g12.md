<!-- Nguồn: Firestore lessonPlans/d3a85b76-318a-4879-bd78-41b10f9e620f · Phương sai và độ lệch chuẩn — Tiết 1 · bài tương tác adaptive-1792834706906 · tải 2026-10-24 -->

# KẾ HOẠCH DẠY HỌC — Phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm (Tiết 1: Hình thành công thức và quy trình tính)

| Lớp | 12 | Tên bài học | Phương sai và độ lệch chuẩn — Tiết 1: Công thức và quy trình tính | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | Nguyễn Văn A | Tuần học | 18 | Năm học | 2024–2025 |

## I. THÔNG TIN CHUNG

**1. Tiêu chuẩn năng lực cốt lõi**
- Tư duy và lập luận toán học: So sánh, quy nạp từ công thức phương sai không ghép nhóm sang công thức mẫu ghép nhóm.
- Giải quyết vấn đề toán học: Thiết lập quy trình bảng tính trung gian và tính chính xác phương sai, độ lệch chuẩn của mẫu ghép nhóm.
- Sử dụng công cụ, phương tiện học toán: Vận dụng máy tính cầm tay để kiểm chứng, đối soát kết quả tính tay.
- Giao tiếp toán học: Diễn đạt bằng lời ý nghĩa độ biến thiên, giải thích sự khác biệt giữa hai mẫu số liệu có cùng số trung bình.

**2. Mục tiêu học tập**
Sau tiết học, tôi có thể:

| Mức độ | Mục tiêu |
|---|---|
| Must (Cơ bản) | Tôi có thể xác định đúng giá trị đại diện $c_i$ của từng nhóm, tính đúng số trung bình $\bar{x}$, và thực hiện từng bước lập bảng trung gian để tính phương sai $s^2$, độ lệch chuẩn $s$ của mẫu số liệu ghép nhóm đơn giản ($k \le 4$ nhóm). [Bloom: Nhớ – Hiểu] |
| Should (Trọng tâm) | Tôi có thể áp dụng thành thạo hai công thức tính phương sai ($s^2 = \frac{1}{n} \sum n_i (c_i - \bar{x})^2$ và công thức rút gọn $s^2 = \frac{1}{n} \sum n_i c_i^2 - \bar{x}^2$), sử dụng máy tính cầm tay để kiểm chứng kết quả và nhận xét sơ bộ về mức độ phân tán của mẫu dữ liệu. [Bloom: Áp dụng] |
| Could (Nâng cao) | Tôi có thể so sánh độ phân tán giữa hai mẫu số liệu ghép nhóm có cùng số trung bình để giải quyết bài toán ra quyết định thực tế, đồng thời chứng minh được công thức rút gọn và giải thích tác hại của sai số làm tròn sớm. [Bloom: Phân tích – Đánh giá] |

**3. Phân hóa mục tiêu**

| Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|
| Điền khuyết bảng tính trung gian, tính $c_i$, $\bar{x}$, $s^2$, $s$ theo công thức định nghĩa cho mẫu $k=4$ nhóm (SGK Bài 1 tr. 90). | Tự lập bảng hoàn chỉnh, tính $s^2$ theo công thức rút gọn, dùng máy tính cầm tay kiểm tra kết quả (SGK Bài 2 tr. 90). | So sánh độ phân tán 2 mẫu số liệu đối kháng, chứng minh công thức biến đổi tương đương $\sum n_i (c_i - \bar{x})^2 = \sum n_i c_i^2 - n\bar{x}^2$ (SGK Bài 4 tr. 91). |

**4. Tài liệu dạy học**
- SGK Toán 12 (Bộ Kết nối tri thức với cuộc sống), tr. 87–91.
- Phiếu học tập số 1 — Tính phương sai và độ lệch chuẩn mẫu ghép nhóm (in sẵn 3 mức NB – TH – VD).
- Bảng con, bút lông bảng cho từng học sinh.
- Máy tính cầm tay Casio fx-580VN X hoặc tương đương.

**Căn cứ điều chỉnh từ đánh giá tiết trước:**
- Khoảng 30% HS còn nhầm lẫn khi tìm giá trị đại diện của nhóm $[a; b)$ $\rightarrow$ Khởi động bằng 3 câu hỏi bảng con củng cố dứt điểm công thức $c_i = \frac{a+b}{2}$.
- Nhiều HS thao tác bấm máy tính thống kê lớp 10 bị sót cột tần số $\rightarrow$ Tích hợp hướng dẫn bật cột tần số (Frequency: On) ở Pha 3.
- Một số HS có thói quen làm tròn số trung gian dẫn đến kết quả cuối bị lệch $\rightarrow$ Cài đặt câu hỏi **[HỆ QUẢ]** về sai số tích lũy.

## MINH CHỨNG HQT / CIS

| Minh chứng | HS làm gì $\rightarrow$ GV thu được gì | Observer nhìn thấy gì (CIS dự giờ) | Vị trí |
|---|---|---|---|
| **[PHÂN HÓA]** | HS tự chọn phiếu học tập số 1 theo 3 màu (Xanh: NB, Vàng: TH, Cam: VD) $\rightarrow$ GV thu được bài làm phù hợp năng lực từng nhóm. | HS trên từng bàn cầm phiếu màu khác nhau; nhóm hoàn thành sớm tự chuyển sang nhiệm vụ Could. | Pha 2 (P13–P22); Phiếu số 1 |
| **[ĐGTX]** | Cả lớp giơ bảng con đồng loạt trả lời các câu hỏi trắc nghiệm nhanh $\rightarrow$ GV đo được tỷ lệ đạt (ngưỡng 85%) để quyết định chuyển bước. | Cả lớp đồng loạt giơ bảng con theo hiệu lệnh "3, 2, 1"; GV quét mắt và phản hồi ngay. | Pha 3 (P22–P27) |
| **[CÔNG DÂN SỐ]** | HS tính tay trước, sau đó dùng chức năng thống kê đơn biến của máy tính cầm tay để đối soát dữ liệu, không ỷ lại máy tính. | HS đặt máy tính sang bên cạnh khi lập bảng tính tay, chỉ bật máy kiểm tra khi đã có kết quả trên giấy. | Pha 3 (P22–P27) |
| **[CÔNG DÂN TOÀN CẦU]** | HS phân tích dữ liệu nhiệt độ trung bình tháng của hai thành phố Hà Nội và London $\rightarrow$ nhận xét về tính ổn định khí quyển. | Bảng số liệu khí hậu quốc tế chiếu trên màn hình; HS thảo luận về biến đổi khí hậu và rủi ro thời tiết. | Pha 4 (P36–P38) |
| Danielson 1a | Định nghĩa và công thức phương sai, độ lệch chuẩn được chuẩn hóa bằng ký hiệu toán học chính xác, có ví dụ đối chiếu. | Bảng lớp ghi rõ hai công thức tính $s^2$, có giải thích tường minh từng đại lượng $n, n_i, c_i, \bar{x}$. | Pha 2 (P8–P13 & P13–P22) |
| Danielson 1b | Phân hóa 3 nhánh rõ rệt: nhóm cần thang đỡ có bảng điền khuyết; nhóm khá làm việc độc lập; nhóm giỏi làm bài chứng minh. | Kịch bản có kịch bản "hạ thang" cụ thể bằng số khi HS bí công thức tổng quát. | Pha 2 (P8–P13 & P13–P22) |
| Danielson 1c | Công bố chuẩn Must – Should – Could ngay sau khởi động; HS đánh dấu mức độ tự tin trên phiếu KWLI. | Mục tiêu 3 mức chiếu trên slide; HS dùng bút chì tích chọn mục tiêu cá nhân. | Pha 1 (P5–P8) |
| Danielson 1d | Sử dụng kết hợp bảng con, phiếu học tập 3 màu và máy tính cầm tay làm công cụ kiểm chứng số liệu. | Tất cả công cụ học tập được chuẩn bị sẵn trên bàn từ đầu tiết, không mất thời gian di chuyển. | Pha 1 đến Pha 4 (P0–P40) |
| Danielson 1e | Tiến trình 4 pha học tập phân bổ thời gian chặt chẽ từ P0 đến P40, không có thời gian chết. | Đồng hồ đếm ngược chạy trên góc màn hình theo từng chặng thời gian. | Pha 1 đến Pha 4 (P0–P40) |
| Danielson 1f | Vòng phản hồi liên tục qua bảng con nhịp hai và Exit Ticket cuối giờ để chốt điểm nghẽn học tập. | Phiếu Exit Ticket thu lại cuối giờ với hai câu hỏi phản tư cụ thể. | Pha 4 (P38–P40) |

## II. TIẾN TRÌNH HOẠT ĐỘNG

### PHA 1: TRẢI NGHIỆM — KHỞI ĐỘNG VÀ XÁC ĐỊNH VẤN ĐỀ (8 phút, P0–P8)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P0–P5 | **1. Khởi động — Tình huống thực tế:**<br/>**GV chiếu tình huống thực tế:** Bảng phân bố điểm bắn sau 20 phát súng của hai xạ thủ An và Bình trong đợt tập huấn (Xem Bảng 1 và Hình 1 bên dưới).<br/>GV nêu *Câu hỏi thiết yếu* giữ nguyên suốt tiết: *"Khi hai mẫu số liệu có cùng số trung bình, làm thế nào dùng một đại lượng toán học để đo xem mẫu nào ổn định và có độ phân tán ít hơn?"*<br/><br/>**HS giơ bảng con ôn kiến thức nền (Kỹ thuật chờ hai nhịp):**<br/>- **[SỐ HỌC]** Câu 1: Giá trị đại diện của nhóm $[6; 8)$ là bao nhiêu?<br/>- **[SO SÁNH]** Câu 2: Công thức tính số trung bình $\bar{x}$ của mẫu số liệu ghép nhóm khác gì so với mẫu không ghép nhóm?<br/>- **[GHI NHỚ]** Câu 3: Ở lớp 10, để đo độ phân tán của mẫu số liệu quanh số trung bình, ta dùng đại lượng nào?<br/>GV hô: *"3, 2, 1, giơ bảng!"*. GV quét radar nhanh, nhận xét: "Đại đa số nhớ đúng giá trị đại diện và phương sai lớp 10. Đây chính là chìa khóa để chúng ta xây dựng công thức cho mẫu ghép nhóm hôm nay." | **BÀI TOÁN MỞ ĐẦU:**<br/>Điểm trung bình của hai xạ thủ:<br/>$\bar{x}_A = 8,5$; $\bar{x}_B = 8,5$.<br/>*Câu hỏi thiết yếu:* Đại lượng nào đo độ ổn định khi số trung bình bằng nhau?<br/><br/>**BẢNG CON ÔN TẬP:**<br/>1. Giá trị đại diện của $[a; b)$:<br/>$$c = \frac{a+b}{2} \Rightarrow c_{[6; 8)} = 7$$<br/>2. Số trung bình mẫu ghép nhóm:<br/>$$\bar{x} = \frac{1}{n}\sum_{i=1}^k n_i c_i$$<br/>3. Phương sai không ghép nhóm (lớp 10):<br/>$$s^2 = \frac{1}{n}\sum_{i=1}^n (x_i - \bar{x})^2$$ |
| P5–P8 | **2. Xác định vấn đề và mục tiêu học tập:**<br/>**GV phát phiếu KWLI-Chart:** Yêu cầu HS dành 1 phút điền cột K (Đã biết) và cột W (Muốn biết).<br/>GV gọi ngẫu nhiên 1 HS trung bình và 1 HS khá chia sẻ câu trả lời cột W.<br/>- HS 1: "Em muốn biết làm sao tính được độ lệch chuẩn khi số liệu bị gom thành nhóm mà không có từng số cụ thể."<br/>- HS 2: "Em muốn biết giữa phương sai và độ lệch chuẩn thì số nào dùng để so sánh trực tiếp với đơn vị ban đầu."<br/><br/>**GV trình chiếu khung chuẩn mục tiêu Must – Should – Could:**<br/>Yêu cầu HS tự đánh dấu mục tiêu thử thách bản thân trong tiết học hôm nay.<br/>GV nhấn mạnh trọng tâm: Xây dựng bảng tính trung gian và làm chủ quy trình tính phương sai $s^2$, độ lệch chuẩn $s$. | **MỤC TIÊU TIẾT HỌC (KWLI):**<br/>- **K (Đã biết):** Giá trị đại diện $c_i$, số trung bình $\bar{x}$, phương sai lớp 10.<br/>- **W (Muốn biết):** Công thức $s^2, s$ mẫu ghép nhóm, ý nghĩa độ phân tán.<br/>- **Must:** Tính đúng $c_i, \bar{x}, s^2, s$ ($k \le 4$).<br/>- **Should:** Thuộc 2 công thức, dùng Casio kiểm tra.<br/>- **Could:** So sánh độ ổn định 2 mẫu số liệu, chứng minh công thức rút gọn. |

Bảng 1: Kết quả 20 phát bắn của hai xạ thủ (Nguồn: GV tự thiết kế)

| Điểm số | $[6; 8)$ | $[8; 10)$ | $[10; 12)$ | Tổng số phát bắn |
|---|:---:|:---:|:---:|:---:|
| Xạ thủ An (tần số $n_i$) | 2 | 16 | 2 | 20 |
| Xạ thủ Bình (tần số $n_i$) | 7 | 6 | 7 | 20 |

```tikz
\begin{tikzpicture}[xscale=0.8, yscale=0.3]
\draw[->] (0,0) -- (8,0) node[right] {Nhóm điểm};
\draw[->] (0,0) -- (0,18) node[above] {Tần số};
\draw (1,0) rectangle (2.5,2);
\draw (3,0) rectangle (4.5,16);
\draw (5,0) rectangle (6.5,2);
\node at (3.75,17) {Xạ thủ An};
\node at (1.75,-1.5) {$[6;8)$};
\node at (3.75,-1.5) {$[8;10)$};
\node at (5.75,-1.5) {$[10;12)$};
\draw[dashed, red] (0,8.5) -- (7.5,8.5) node[right] {$\bar{x}=8,5$};
\end{tikzpicture}
```
*Hình 1: Phân bố tần số điểm bắn tập trung cao quanh giá trị trung tâm của xạ thủ An*

---

### PHA 2: HÌNH THÀNH — CÔNG THỨC VÀ QUY TRÌNH TÍNH (14 phút, P8–P22)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P8–P13 | **1. Xây dựng công thức tính phương sai và độ lệch chuẩn:**<br/>**GV dẫn dắt Socratic:**<br/>- **[PHÁT HIỆN]** "Trong mẫu số liệu ghép nhóm, chúng ta không biết chính xác từng giá trị $x_i$. Vậy ta dùng đại lượng nào để đại diện cho tất cả các giá trị trong nhóm $[a_i; a_{i+1})$?"<br/>$\rightarrow$ Chờ 3 giây, gọi ngẫu nhiên. HS: "Dùng giá trị đại diện $c_i = \frac{a_i + a_{i+1}}{2}$."<br/>- **[SUY LUẬN]** "Ở lớp 10, độ lệch của mỗi giá trị so với số trung bình là $(x_i - \bar{x})$. Vậy với nhóm thứ $i$ có tần số $n_i$ và giá trị đại diện $c_i$, độ lệch bình phương tương ứng của cả nhóm sẽ là gì?"<br/>$\rightarrow$ Chờ 3 giây. HS: "Là $n_i (c_i - \bar{x})^2$."<br/>- **[KHÁI QUÁT]** "Từ đó, em hãy tổng quát hóa công thức tính phương sai $s^2$ cho toàn bộ $k$ nhóm số liệu ghép nhóm có cỡ mẫu $n$?"<br/>$\rightarrow$ Dự kiến khó khăn: Lớp lúng túng khi viết dấu tổng $\sum$.<br/>*Kịch bản hạ thang:* Nếu sau 2 câu hỏi HS chưa nêu được, GV không đọc công thức. GV hạ thang: "Xét mẫu xạ thủ An: Nhóm 1 có $n_1=2, c_1=7, \bar{x}=8,5 \Rightarrow 2\cdot(7-8,5)^2$. Nhóm 2: $16\cdot(9-8,5)^2$. Nhóm 3: $2\cdot(11-8,5)^2$. Muốn tính trung bình các bình phương độ lệch này, ta làm phép tính gì?". HS tính ra $\frac{2(7-8,5)^2 + 16(9-8,5)^2 + 2(11-8,5)^2}{20}$. GV hỏi tiếp: "Giờ thay các số cụ thể đó bằng chữ $n_i, c_i, n$, ta được công thức nào?" | **1. Định nghĩa và công thức tính:**<br/>Cho mẫu số liệu ghép nhóm gồm $k$ nhóm $[a_i; a_{i+1})$ với tần số $n_i$, giá trị đại diện $c_i$, cỡ mẫu $n = \sum_{i=1}^k n_i$.<br/><br/>Số trung bình:<br/>$$\bar{x} = \frac{1}{n} \sum_{i=1}^k n_i c_i$$<br/>Phương sai mẫu ghép nhóm:<br/>$$s^2 = \frac{1}{n} \sum_{i=1}^k n_i (c_i - \bar{x})^2$$<br/>Hoặc công thức rút gọn:<br/>$$s^2 = \frac{1}{n} \sum_{i=1}^k n_i c_i^2 - \bar{x}^2$$<br/>Độ lệch chuẩn:<br/>$$s = \sqrt{s^2}$$ |
| P13–P22 | **2. Hình thành quy trình tính toán qua bảng trung gian:**<br/>**[🔴 PHÂN HÓA]** GV phát Phiếu học tập số 1 (HS tự chọn màu phiếu hoặc làm theo nhóm đồng mức đã chia sẵn từ đầu bàn).<br/>- *Khẩu lệnh chuyển hoạt động:* "Đồng hồ đếm ngược 7 phút. Các em mở Phiếu học tập số 1. Nhóm Xanh hoàn thành bảng mẫu và tính $s^2, s$ cho xạ thủ An. Nhóm Vàng hoàn thành bảng và thử áp dụng công thức rút gọn. Nhóm Cam tính độ lệch chuẩn cả 2 xạ thủ và trả lời câu hỏi so sánh. 7 phút làm việc, bắt đầu!"<br/>GV thực hiện kỹ thuật **Quét Radar**: di chuyển bao quát 80% lớp, ghé hỗ trợ nhóm yếu hoàn thành cột $(c_i - \bar{x})^2$ rồi rút nhanh.<br/>- **[PHẢN BIỆN]** GV chiếu ý kiến của bạn Hoàng: "Bạn Hoàng cho rằng: Vì phương sai có đơn vị là bình phương của đơn vị số liệu (ví dụ: $\text{điểm}^2$), nên để so sánh trực quan với điểm số ban đầu, ta phải dùng độ lệch chuẩn $s$. Ý kiến này đúng hay sai? Vì sao?"<br/>$\rightarrow$ Chờ 5 giây, hỏi "Bằng chứng nào?". HS trả lời: "Đúng, vì $s = \sqrt{s^2}$ có cùng đơn vị đo với số liệu gốc." | **2. Quy trình tính toán theo bảng:**<br/>**Đáp án PHT số 1:**<br/>- *Nhóm Xanh (NB - Xạ thủ An):*<br/>$c_1 = 7; c_2 = 9; c_3 = 11$.<br/>$\bar{x}_A = \frac{2\cdot 7 + 16\cdot 9 + 2\cdot 11}{20} = 8,5$.<br/>$\sum n_i(c_i - \bar{x})^2 = 2(7-8,5)^2 + 16(9-8,5)^2 + 2(11-8,5)^2 = 4,5 + 4 + 12,5 = 21$.<br/>$$s_A^2 = \frac{21}{20} = 1,05 \Rightarrow s_A = \sqrt{1,05} \approx 1,02$$<br/>- *Nhóm Vàng (TH - Công thức rút gọn):*<br/>$\sum n_i c_i^2 = 2\cdot 7^2 + 16\cdot 9^2 + 2\cdot 11^2 = 98 + 1296 + 242 = 1636$.<br/>$$s_A^2 = \frac{1636}{20} - (8,5)^2 = 81,8 - 72,25 = 1,05$$<br/>- *Nhóm Cam (VD - Xạ thủ Bình):*<br/>$\sum n_i(c_i - \bar{x})^2 = 7(-1,5)^2 + 6(0,5)^2 + 7(2,5)^2 = 15,75 + 1,5 + 43,75 = 61$.<br/>$$s_B^2 = \frac{61}{20} = 3,05 \Rightarrow s_B = \sqrt{3,05} \approx 1,75$$<br/>So sánh: $s_A < s_B \Rightarrow$ Xạ thủ An bắn ổn định hơn xạ thủ Bình. |

---

### PHA 3: RÈN LUYỆN — LUYỆN TẬP VÀ VẬN DỤNG KIỂM CHỨNG (14 phút, P22–P36)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P22–P27 | **1. Kiểm tra nhanh và kiểm chứng bằng công cụ số:**<br/>**[🟣 ĐGTX]** GV yêu cầu HS lấy bảng con làm nhanh bài toán kiểm tra độ hiểu:<br/>**[VẬN DỤNG]** Cho mẫu số liệu ghép nhóm có $n=10$, $\sum n_i c_i^2 = 250$, $\bar{x} = 4$. Tính phương sai $s^2$ và độ lệch chuẩn $s$.<br/>Áp dụng **Kỹ thuật chờ hai nhịp**: Nhịp 1 chờ 15 giây HS tự tính. Nhịp 2 hô: "3, 2, 1, giơ bảng!". GV quét bảng: Ngưỡng đạt yêu cầu $\ge 85\%$.<br/>- **[PHẢN BIỆN]** GV chiếu bài làm sai của một HS ẩn danh: "Tính ra $s^2 = 9 \Rightarrow s = \pm 3$". GV hỏi: "Bạn sai ở đâu?". HS phát hiện ngay: Độ lệch chuẩn $s = \sqrt{s^2}$ luôn không âm, không có dấu âm.<br/><br/>**[🔵 CÔNG DÂN SỐ]** Hướng dẫn kiểm chứng bằng công cụ số:<br/>GV yêu cầu HS bật máy tính Casio fx-580VN X:<br/>`MENU 6 (Statistics) -> 1 (1-Variable)` (Đảm bảo đã bật `SHIFT MENU -> Giảm -> 3 -> 1: On` để mở cột tần số).<br/>HS nhập bảng điểm xạ thủ An vào 2 cột $x$ (nhập $c_i$) và $Freq$ (nhập $n_i$). Bấm `OPTN -> 3`. Đối soát kết quả: Màn hình hiện $\sigma x = 1,02469...$ trùng khớp với $s \approx 1,02$.<br/>GV nhấn mạnh quy tắc: "Máy tính là công cụ kiểm tra, tư duy lập bảng của con người mới là gốc rễ." | **3. Kiểm tra và kiểm chứng số liệu:**<br/>Bài nhanh bảng con:<br/>$$s^2 = \frac{250}{10} - 4^2 = 25 - 16 = 9$$<br/>$$s = \sqrt{9} = 3$$<br/><br/>⚠ Lỗi phổ biến:<br/>- Quên căn bậc hai khi chuyển từ phương sai $s^2$ sang độ lệch chuẩn $s$.<br/>- Viết $s = \pm \sqrt{s^2}$ (sai vì $s \ge 0$).<br/>- Làm tròn số trung bình quá sớm dẫn đến tích lũy sai số lớn ở bước bình phương. |
| P27–P32 | **2. Chuẩn hóa quy trình 4 bước và đào sâu tư duy:**<br/>**[KHÁI QUÁT]** GV gọi 1 HS nêu lại quy trình 4 bước tính phương sai và độ lệch chuẩn của một mẫu số liệu ghép nhóm bất kỳ.<br/>- **[SÁNG TẠO]** (Dành cho HS giỏi): "Nếu tất cả các giá trị đại diện $c_i$ đều được cộng thêm một hằng số $k$ (nghĩa là tịnh tiến toàn bộ mẫu số liệu), thì phương sai và độ lệch chuẩn thay đổi thế nào? Vì sao?"<br/>$\rightarrow$ Chờ 5 giây. HS giỏi suy luận: Khi $c_i$ tăng $k$ thì $\bar{x}$ cũng tăng $k$, hiệu $(c_i - \bar{x})$ không đổi $\Rightarrow s^2$ và $s$ không đổi.<br/>GV chốt lại ý nghĩa thực tế: Phương sai và độ lệch chuẩn dùng để đo mức độ phân tán của số liệu quanh số trung bình. Giá trị này càng nhỏ thì dữ liệu càng tập trung, độ ổn định càng cao.<br/>HS thực hiện đánh giá Thumbs up/down về mức độ đạt mục tiêu Must và Should. | **4. Khái quát quy trình 4 bước:**<br/>- *Bước 1:* Xác định giá trị đại diện $c_i$ của từng nhóm và cỡ mẫu $n$.<br/>- *Bước 2:* Tính số trung bình $\bar{x}$.<br/>- *Bước 3:* Lập bảng tính $\sum n_i (c_i - \bar{x})^2$ hoặc $\sum n_i c_i^2$.<br/>- *Bước 4:* Tính $s^2$ và lấy căn bậc hai để tìm $s = \sqrt{s^2}$.<br/><br/>*Ý nghĩa:* Phương sai và độ lệch chuẩn càng nhỏ $\Rightarrow$ số liệu càng ít biến thiên, độ ổn định càng cao. |
| P32–P36 | **3. Luyện tập cặp đôi — Xử lý câu hỏi trắc nghiệm củng cố:**<br/>GV yêu cầu các cặp đôi thảo luận nhanh và ghi đáp án 3 câu vào bảng con.<br/>- **[NB]** Câu 1 (SGK tr. 90): Cho nhóm số liệu $[20; 30)$ có tần số $n_1 = 5$. Giá trị đại diện $c_1$ là:<br/>- **A.** 20<br/>- **B.** 25<br/>- **C.** 30<br/>- **D.** 50<br/>- **[TH]** Câu 2 (SGK tr. 90): Một mẫu số liệu ghép nhóm có $s^2 = 2,56$. Độ lệch chuẩn $s$ bằng:<br/>- **A.** 1,6<br/>- **B.** 6,55<br/>- **C.** 5,12<br/>- **D.** 0,64<br/>- **[VDC]** Câu 3 (GV tự thiết kế): Mẫu số liệu $X$ có $\bar{x} = 50, s_X = 2$; mẫu số liệu $Y$ có $\bar{y} = 50, s_Y = 5$. Kết luận nào sau đây đúng?<br/>- **A.** Dữ liệu mẫu $Y$ phân tán ít hơn mẫu $X$.<br/>- **B.** Dữ liệu mẫu $X$ đồng đều và ổn định hơn mẫu $Y$.<br/>- **C.** Hai mẫu có độ phân tán như nhau vì cùng số trung bình.<br/>- **D.** Không thể so sánh được.<br/>Hết 2 phút, GV hô hiệu lệnh giơ bảng con, nhận xét nhanh. | **ĐÁP ÁN BẢNG CON CẶP ĐÔI:**<br/>1. **B** ($c_1 = \frac{20+30}{2} = 25$)<br/>2. **A** ($s = \sqrt{2,56} = 1,6$)<br/>3. **B** ($s_X < s_Y \Rightarrow$ mẫu $X$ phân tán ít hơn, đồng đều hơn). |

---

### PHA 4: SƠ KẾT — ĐÁNH GIÁ VÀ MỞ RỘNG THỰC TIỄN (4 phút, P36–P40)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P36–P38 | **1. Mở rộng thực tiễn (Bài toán khí hậu):**<br/>**[🟢 CÔNG DÂN TOÀN CẦU]** GV chiếu bảng số liệu nhiệt độ trung bình các tháng trong năm tại Hà Nội và London (Xem Bảng 2 bên dưới). Cả hai thành phố đều có nhiệt độ trung bình năm xấp xỉ $20^\circ\text{C} - 24^\circ\text{C}$ ở một số thời kỳ khảo sát, nhưng độ lệch chuẩn nhiệt độ tại London thấp hơn nhiều so với Hà Nội.<br/>- **[HỆ QUẢ]** "Nếu một doanh nghiệp nông nghiệp muốn đầu tư trồng cây nhiệt đới nhạy cảm với nhiệt độ lạnh cực đoan mà chỉ nhìn vào nhiệt độ trung bình cả năm mà bỏ qua độ lệch chuẩn thì hậu quả kinh tế sẽ thế nào?"<br/>HS: "Doanh nghiệp có thể phá sản vì vào mùa đông nhiệt độ thực tế xuống quá thấp gây chết cây, dù nhiệt độ trung bình cả năm vẫn đạt."<br/>*Nhiệm vụ neo cho HS hoàn thành sớm:* Hãy thiết kế một bảng ghép nhóm 3 nhóm sao cho có phương sai bằng 0. | **BÀI TOÁN THỰC TIỄN KHÍ HẬU:**<br/>Nhiệt độ trung bình năm có thể tương đương nhau, nhưng thành phố có độ lệch chuẩn nhiệt độ cao sẽ có thời tiết biến thiên khắc nghiệt hơn.<br/><br/>**Hệ quả:** Trong kinh doanh và nông nghiệp, bỏ qua độ lệch chuẩn sẽ dẫn đến đánh giá sai rủi ro cực đoan. |
| P38–P40 | **2. Tổng kết, phản tư KWLI và Exit Ticket:**<br/>**GV điều phối sơ kết nhanh:**<br/>- HS hoàn thành cột L (Những điều đã học được) và cột I (Ý tưởng / Thắc mắc mới) trên phiếu KWLI-Chart.<br/>- Gọi ngẫu nhiên 1 HS trả lời câu hỏi **[KHÁI QUÁT]**: "Khi nào thì phương sai của một mẫu số liệu bằng 0?" (HS: Khi tất cả các giá trị đại diện của các nhóm đều bằng số trung bình, tức là số liệu hoàn toàn không có sự biến thiên).<br/>- **Exit Ticket (30 giây cuối):** HS hoàn thành hai dòng trong phiếu nhỏ và nộp lại khi rời lớp:<br/>  ✓ Điều em hiểu rõ nhất hôm nay: ........................<br/>  ? Thắc mắc lớn nhất em cần giải đáp ở tiết sau: ........................ | **TỔNG KẾT TIẾT HỌC:**<br/>- Công thức gốc: $s^2 = \frac{1}{n}\sum n_i(c_i - \bar{x})^2$<br/>- Công thức tính nhanh: $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar{x}^2$<br/>- Độ lệch chuẩn: $s = \sqrt{s^2}$ (cùng đơn vị với số liệu gốc).<br/>- Phương sai $s^2 = 0 \Leftrightarrow$ tất cả giá trị bằng nhau.<br/><br/>**EXIT TICKET:** Nộp phiếu trước khi ra khỏi phòng học. |

Bảng 2: Thống kê số tháng theo khoảng nhiệt độ trung bình tháng trong năm (Nguồn: Dữ liệu khí tượng thủy văn trích dẫn mô phỏng)

| Nhóm nhiệt độ ($^\circ\text{C}$) | $[10; 16)$ | $[16; 22)$ | $[22; 28)$ | $[28; 34)$ |
|---|:---:|:---:|:---:|:---:|
| Thành phố Hà Nội (số tháng) | 2 | 3 | 3 | 4 |
| Thành phố London (số tháng) | 5 | 7 | 0 | 0 |

---

## HƯỚNG DẪN VỀ NHÀ (BTVN)
- **HS yếu/TB:** Hoàn thành Bài 1 và Bài 2 (SGK tr. 90); ghi lại các bước tính trung gian vào vở.
- **HS khá:** Làm Bài 3 và Bài 4 (SGK tr. 91); bấm máy tính cầm tay để kiểm tra lại toàn bộ kết quả.
- **HS giỏi:** Chứng minh công thức rút gọn: $\frac{1}{n}\sum_{i=1}^k n_i (c_i - \bar{x})^2 = \frac{1}{n}\sum_{i=1}^k n_i c_i^2 - \bar{x}^2$ bằng cách khai triển hằng đẳng thức $(c_i - \bar{x})^2$ và áp dụng tính chất của $\bar{x}$.
- **Toàn lớp:** Đọc trước mục "Ý nghĩa của phương sai và độ lệch chuẩn trong thực tiễn" để chuẩn bị cho tiết luyện tập tiếp theo.

## SƠ KẾT / RÚT KINH NGHIỆM
- Exit ticket thu được:
  - ✓ [Điều hiểu rõ nhất]: __________________________________________________
  - ? [Điều còn băn khoăn]: __________________________________________________
- Ghi nhận của giáo viên sau tiết dạy:
  - Về phân bổ thời gian: ............................................................................................................
  - Về kỹ năng tính toán của học sinh: .....................................................................................
  - Điều chỉnh cho tiết 2: .............................................................................................................

---

## PHỤ LỤC: PHIẾU HỌC TẬP

### PHIẾU HỌC TẬP SỐ 1 – TÍNH PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN
*(Phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm – Tiết 1)*

**Họ và tên:** ................................................................... **Lớp:** 12A...... **Nhóm:** ............

#### A. MỨC NHẬN BIẾT (Dành cho nhóm Xanh)
Cho mẫu số liệu điểm bắn của xạ thủ An:

| Nhóm điểm | Tần số ($n_i$) | Giá trị đại diện ($c_i$) | $n_i \cdot c_i$ | $c_i - \bar{x}$ | $(c_i - \bar{x})^2$ | $n_i (c_i - \bar{x})^2$ |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| $[6; 8)$ | 2 | 7 | 14 | $7 - 8,5 = -1,5$ | 2,25 | $2 \cdot 2,25 = 4,5$ |
| $[8; 10)$ | 16 | ..... | ..... | ..... | ..... | ..... |
| $[10; 12)$ | 2 | ..... | ..... | ..... | ..... | ..... |
| **Tổng** | **$n = 20$** | | **$\sum =$ .......** | | | **$\sum =$ .......** |

- Tính số trung bình: $\bar{x} = \frac{\sum n_i c_i}{n} = \frac{..........}{20} = ...........$
- Tính phương sai: $s^2 = \frac{\sum n_i(c_i - \bar{x})^2}{n} = \frac{..........}{20} = ...........$
- Tính độ lệch chuẩn: $s = \sqrt{s^2} = ...........$

#### B. MỨC THÔNG HIỂU (Dành cho nhóm Vàng)
Sử dụng công thức rút gọn: $s^2 = \frac{1}{n}\sum_{i=1}^k n_i c_i^2 - \bar{x}^2$ để tính lại phương sai của xạ thủ An.

| Nhóm điểm | Tần số ($n_i$) | Giá trị đại diện ($c_i$) | $c_i^2$ | $n_i \cdot c_i^2$ |
|---|:---:|:---:|:---:|:---:|
| $[6; 8)$ | 2 | 7 | 49 | 98 |
| $[8; 10)$ | 16 | ..... | ..... | ..... |
| $[10; 12)$ | 2 | ..... | ..... | ..... |
| **Tổng** | **$n = 20$** | | | **$\sum n_i c_i^2 =$ ...........** |

*Lời giải chi tiết:*
- Tính phương sai: $s^2 = \frac{\sum n_i c_i^2}{n} - \bar{x}^2 = \frac{\ldots\ldots\ldots}{20} - (8,5)^2 = \ldots\ldots\ldots$
- Tính độ lệch chuẩn: $s = \sqrt{s^2} = \ldots\ldots\ldots$

#### C. MỨC VẬN DỤNG (Dành cho nhóm Cam)
1. Lập bảng và tính độ lệch chuẩn điểm bắn của xạ thủ Bình ($s_B$).
2. So sánh $s_A$ và $s_B$. Xạ thủ nào có phong độ thi đấu ổn định hơn? Tại sao?

*Lời giải chi tiết:*
- Tính các đại lượng cho xạ thủ Bình: $\sum n_i(c_i - \bar{x}_B)^2 = \ldots\ldots\ldots \Rightarrow s_B^2 = \ldots\ldots\ldots \Rightarrow s_B = \ldots\ldots\ldots$
- So sánh: Vì $s_A \ldots\ldots\ldots s_B$ nên xạ thủ $\ldots\ldots\ldots$ có phong độ bắn ổn định hơn.