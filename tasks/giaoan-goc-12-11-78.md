<!-- Nguồn: Firestore lessonPlans/80820147-a5df-42a1-8653-df385c3108f0 — "Khoảng biến thiên và khoảng tứ phân vị — Tiết 1" — bài tương tác adaptive-1792833009074 — tải 2026-10-28 (trích từ dump tasks/tmp-giaoan-dump-12-11-78.json) — số ký tự thân giáo án: 26211 -->

# KẾ HOẠCH DẠY HỌC — KHOẢNG BIẾN THIÊN VÀ KHOẢNG TỨ PHÂN VỊ (Tiết 1: Mẫu số liệu ghép nhóm)

| Lớp | 12 | Tên bài học | Khoảng biến thiên và khoảng tứ phân vị — Tiết 1: Mẫu số liệu ghép nhóm | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 10 | Năm học | 2024–2025 |

## I. THÔNG TIN CHUNG

**1. Tiêu chuẩn năng lực cốt lõi**

- Tư duy và lập luận toán học: So sánh độ phân tán của hai tập dữ liệu ghép nhóm; giải thích ý nghĩa thực tiễn của khoảng biến thiên và khoảng tứ phân vị trong đo lường độ biến động.
- Mô hình hóa toán học: Chuyển đổi bảng dữ liệu ghép nhóm thực tế (thời gian tự học, lượng phát thải khí nhà kính) thành các số đặc trưng đo độ phân tán để ra quyết định.
- Giải quyết vấn đề toán học: Xác định nhóm chứa tứ phân vị, áp dụng chuẩn xác công thức nội suy tìm $Q_1, Q_3$ và tính khoảng tứ phân vị $\Delta_Q$.
- Giao tiếp toán học: Trình bày và sử dụng chuẩn xác thuật ngữ thống kê ghép nhóm (đầu mút khoảng, độ dài nhóm, tần số tích lũy, nhóm chứa tứ phân vị).

**2. Mục tiêu học tập**

Sau tiết học, tôi có thể:

| Mức độ | Mục tiêu |
|---|---|
| Must (Cơ bản) | Tôi có thể nhận biết công thức, tính đúng khoảng biến thiên $R = a_{m+1} - a_1$ và tìm được nhóm chứa các tứ phân vị $Q_1, Q_3$ từ bảng tần số ghép nhóm. [Bloom: Nhớ – Hiểu] |
| Should (Trọng tâm) | Tôi có thể tính toán chính xác giá trị $Q_1, Q_3$ bằng công thức nội suy, xác định khoảng tứ phân vị $\Delta_Q = Q_3 - Q_1$ và giải thích ý nghĩa của chúng khi so sánh độ phân tán. [Bloom: Áp dụng] |
| Could (Nâng cao) | Tôi có thể phân tích ảnh hưởng của giá trị ngoại lai đến $R$ và $\Delta_Q$; tự điều chỉnh dữ liệu hoặc xác định tham số trong bảng ghép nhóm khi biết trước khoảng tứ phân vị. [Bloom: Phân tích – Sáng tạo] |

**3. Phân hóa mục tiêu**

| Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|
| Xác định $R$ từ bảng số liệu; xác định vị trí và nhóm chứa $Q_1, Q_3$ dựa trên bảng có sẵn tần số tích lũy (SGK Toán 12 Cánh Diều Bài 1 tr. 84). | Lập bảng tần số tích lũy, tính chính xác $Q_1, Q_3, \Delta_Q$ và đối sánh độ đồng đều giữa 2 mẫu số liệu (SGK Bài 2 tr. 85). | Phân tích tính bền vững của $\Delta_Q$ so với $R$ khi có dữ liệu ngoại lai; giải bài toán tìm ẩn số $x$ trong bảng ghép nhóm khi biết $\Delta_Q$ (SBT Bài 4 tr. 62). |

**4. Tài liệu dạy học**

- SGK Toán 12 (Tập 1, Chương III: Các số đặc trưng đo độ phân tán của mẫu số liệu ghép nhóm, tr. 81–86).
- Phiếu số 1 — "Xác định khoảng biến thiên và khoảng tứ phân vị mẫu số liệu ghép nhóm" (in sẵn cho 3 mức độ NB, TH, VD).
- Thẻ KWLI, bảng con, bút lông cho học sinh; máy chiếu trình chiếu bảng số liệu thực tế.

**Căn cứ điều chỉnh từ đánh giá tiết trước:**

- 85% học sinh đã tính thành thạo số trung bình và trung vị $M_e = Q_2$ của mẫu số liệu ghép nhóm.
- 30% học sinh còn nhầm lẫn giữa tần số của nhóm $m_p$ với tần số tích lũy $C$ đứng trước nhóm đó $\rightarrow$ Thiết kế bảng phụ tô màu phân biệt rõ $C$ và $n_p$ trong bài giảng.
- Một số học sinh lúng túng khi xác định độ dài nhóm $h = a_{p+1} - a_p$ $\rightarrow$ Cho kiểm tra chéo bằng bảng con ở đầu pha hình thành kiến thức.

## MINH CHỨNG HQT / CIS

| Minh chứng | HS làm gì $\rightarrow$ GV thu được gì | Observer nhìn thấy gì (CIS dự giờ) | Vị trí |
|---|---|---|---|
| **[PHÂN HÓA]** | HS tự chọn và hoàn thành phiếu bài tập theo 3 mức NB – TH – VD; GV thu được sản phẩm giải toán phân hóa theo đúng năng lực cá nhân. | HS cầm và làm việc trên 3 loại phiếu màu khác nhau (Xanh lá - NB, Vàng - TH, Cam - VD) đặt ở khay học tập giữa bàn. | HĐ4 (P15 – P32); Phiếu số 1 |
| **[ĐGTX]** | HS giơ bảng con đồng loạt; GV thu được tỷ lệ nắm công thức nội suy và nhóm chứa để kịp thời điều chỉnh nhịp dạy. | 100% HS đồng loạt giơ bảng con xác định nhóm chứa $Q_1, Q_3$; GV quan sát tỷ lệ đúng trước khi chuẩn hóa. | HĐ4 (P15 – P32) |
| **[CÔNG DÂN TOÀN CẦU]** | HS phân tích dữ liệu phát thải $CO_2$ quốc tế để tính độ phân tán, liên hệ tính công bằng sinh thái. | Bảng dữ liệu quốc tế về phát thải $CO_2$ (từ Ngân hàng Thế giới WB) chiếu trên TV; HS nhận xét về khoảng cách phát thải giữa các nhóm nước. | HĐ1 (P0 – P5) & HĐ5 (P32 – P38) |
| Danielson 1a | Khái niệm mút khoảng, tần số tích lũy, công thức $R$ và nội suy $\Delta_Q$ được phát biểu chính xác kèm ví dụ đối chứng. | Bảng ghi rõ ràng, kí hiệu chuẩn thống kê, có chú thích các biến số trong công thức. | HĐ3 (P8 – P15) & HĐ4 (P15 – P32) |
| Danielson 1b | Phân chia nhiệm vụ 3 mức đồng thời có hệ thống gợi ý bậc thang (scaffolding) cho học sinh trung bình. | GV di chuyển đến bàn HS yếu, dùng bảng gợi ý từng bước để hỗ trợ, không giải thay. | HĐ4 (P15 – P32) |
| Danielson 1c | Công bố bảng mục tiêu Must – Should – Could rõ ràng; HS tự đối soát và phản tư mức độ đạt được cuối tiết. | Bảng mục tiêu dán góc bảng; HS đánh dấu tích trên phiếu KWLI cuối tiết. | HĐ2 (P5 – P8) & HĐ6 (P38 – P40) |
| Danielson 1d | Sử dụng linh hoạt bảng con, máy chiếu bảng số liệu thực tế và phiếu phân tầng. | Mỗi bàn có khay học liệu, HS luân phiên thao tác trên bảng con và phiếu học tập. | Toàn bộ tiết học |
| Danielson 1e | Mạch tiến trình học tập mạch lạc, phân bổ thời gian liền mạch, điều phối qua đồng hồ bấm giờ. | Đồng hồ bấm giờ trực quan trên màn hình đếm lùi thời gian từng hoạt động. | Toàn bộ tiến trình dạy học |
| Danielson 1f | Đánh giá thường xuyên qua kĩ thuật bảng con hai nhịp và Exit Ticket để thu thập dữ liệu điều chỉnh tiết sau. | GV thu phiếu Exit Ticket ở cửa lớp khi HS kết thúc tiết học. | HĐ6 (P38 – P40) |

Một nhóm học sinh trung học đa văn hóa đang cùng thảo luận quanh bàn tròn, trên bàn có máy tính xách tay hiển thị biểu đồ môi trường toàn cầu trong lớp học hiện đại.

## II. TIẾN TRÌNH HOẠT ĐỘNG

### 1. KHỞI ĐỘNG — Bài toán mở đầu (5 phút, P0–P5)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P0 – P5 | **GV chiếu bảng số liệu phát thải $CO_2$ bình quân đầu người (tấn/người/năm) của 40 quốc gia.**<br/><br/>GV: "Quan sát bảng số liệu ghép nhóm về lượng phát thải $CO_2$. Giả sử hai khu vực có cùng mức phát thải trung vị là 5,2 tấn/người. Liệu ta có thể khẳng định độ phân bổ mức độ phát thải của các nước ở hai khu vực này là như nhau hay không?"<br/><br/>GV công bố *câu hỏi thiết yếu* giữ nguyên suốt tiết: *"Khi các số đo xu thế trung tâm bằng nhau, làm thế nào để đo lường mức độ phân tán hoặc sự chênh lệch của mẫu số liệu ghép nhóm?"*<br/><br/>**HS giơ BẢNG CON ôn kiến thức nền (Kỹ thuật chờ hai nhịp):**<br/>- **[SO SÁNH]** Ở lớp 10 với số liệu không ghép nhóm, khoảng biến thiên $R$ và khoảng tứ phân vị $\Delta_Q$ được tính như thế nào?<br/>- **[SỐ HỌC]** Cho mẫu số liệu rời rạc: $2, 4, 5, 7, 9, 11, 20$. Tìm $R$ và xác định giá trị ngoại lai nếu có.<br/>- **[SUY LUẬN]** Công thức xác định trung vị $M_e$ của mẫu số liệu ghép nhóm $[a_p; a_{p+1})$ đã học ở bài trước là gì?<br/><br/>$\rightarrow$ Chờ 15 giây, hô "3, 2, 1, giơ bảng!", quan sát chéo 3 giây, gọi ngẫu nhiên HS giải thích. | **BẢNG CON ÔN TẬP:**<br/><br/>1. Số liệu không ghép nhóm:<br/>- Khoảng biến thiên: $$R = x_{\max} - x_{\min}$$<br/>- Khoảng tứ phân vị: $$\Delta_Q = Q_3 - Q_1$$<br/>2. Với dãy số: $2, 4, 5, 7, 9, 11, 20$:<br/>$$R = 20 - 2 = 18$$<br/>3. Công thức trung vị ghép nhóm trong $[a_p; a_{p+1})$:<br/>$$M_e = a_p + \frac{\frac{n}{2} - C}{n_p} \cdot h$$<br/>*(trong đó: $C$ là tần số tích lũy nhóm trước, $n_p$ là tần số nhóm chứa trung vị, $h = a_{p+1} - a_p$)*.<br/><br/>$\rightarrow$ **Đây là công cụ nền tảng để xây dựng công thức tứ phân vị hôm nay.** |

### 2. XÁC ĐỊNH MỤC TIÊU (3 phút, P5–P8)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P5 – P8 | **GV phát phiếu KWLI và điều phối:**<br/>- GV: "Các em có 90 giây điền vào cột K (Những gì đã biết về độ phân tán) và cột W (Những gì muốn biết về cách tính khi số liệu bị ghép thành từng nhóm khoảng)."<br/>- GV gọi ngẫu nhiên 2 HS chia sẻ nhanh cột W.<br/>- GV trình chiếu bảng mục tiêu Must – Should – Could, yêu cầu HS dùng bút chì đánh dấu vào mục tiêu bản thân quyết tâm đạt được trong tiết học.<br/><br/>**[🟢 CÔNG DÂN TOÀN CẦU]** HS phân tích bối cảnh dữ liệu phát thải $CO_2$ ghép nhóm quốc tế $\rightarrow$ GV thu nhận nhận thức ban đầu của HS về việc dữ liệu ghép nhóm giúp lượng hóa sự bất bình đẳng sinh thái toàn cầu $\rightarrow$ Giáo dục tư duy dữ liệu toàn cầu. | **BÀI 1: KHOẢNG BIẾN THIÊN VÀ KHOẢNG TỨ PHÂN VỊ CỦA MẪU SỐ LIỆU GHÉP NHÓM (Tiết 1)**<br/><br/>**KHUNG KWLI-CHART:**<br/>- **K (Đã biết):** $R = x_{\max} - x_{\min}$; $\Delta_Q = Q_3 - Q_1$; công thức $M_e = Q_2$.<br/>- **W (Muốn biết):** Không biết từng giá trị cụ thể thì lấy giá trị lớn nhất, nhỏ nhất thế nào? Tính $Q_1, Q_3$ ra sao từ các nhóm $[a_i; a_{i+1})$?<br/>- **L & I:** (Dành điền vào cuối tiết). |

### 3. HÌNH THÀNH KIẾN THỨC — Khoảng biến thiên (7 phút, P8–P15)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P8 – P15 | **── BƯỚC 1: KẾT NỐI (2 phút) ──**<br/>- GV chiếu bảng ghép nhóm thời gian dùng Internet mỗi ngày của 50 HS (SGK tr. 82): $[0; 60): 6$ HS; $[60; 120): 14$ HS; $[120; 180): 18$ HS; $[180; 240): 12$ HS (phút).<br/>- **[PHÁT HIỆN]** "Trong mẫu ghép nhóm này, giá trị nhỏ nhất của mẫu chắc chắn không nhỏ hơn bao nhiêu, và giá trị lớn nhất chắc chắn không vượt quá bao nhiêu?"<br/>- HS: "Không nhỏ hơn 0 và không vượt quá 240."<br/>*(Dự phòng nếu HS bí: "Nhóm đầu tiên bắt đầu từ số nào và nhóm cuối cùng kết thúc ở số nào?")*.<br/><br/>**── BƯỚC 2: HÌNH THÀNH (2 phút) ──**<br/>- **[SUY LUẬN]** "Nếu ta xấp xỉ giá trị nhỏ nhất bằng đầu mút trái của nhóm đầu tiên và giá trị lớn nhất bằng đầu mút phải của nhóm cuối cùng, khoảng chênh lệch giữa chúng là bao nhiêu?"<br/>- **[KHÁI QUÁT]** "Từ đó, em hãy phát biểu công thức khoảng biến thiên $R$ cho mẫu gồm $m$ nhóm $[a_1; a_2), \dots, [a_m; a_{m+1})$?"<br/><br/>**── BƯỚC 3: KIỂM TRA (2 phút) ──**<br/>- Bảng con nhanh: Bảng thu nhập của cơ sở sản xuất có nhóm thấp nhất $[5; 10)$ và nhóm cao nhất $[35; 40)$ (triệu đồng). Tính $R$.<br/>- **[PHẢN BIỆN]** Một học sinh phát biểu: "Khoảng biến thiên của mẫu này là $R = 35 - 10 = 25$ triệu vì lấy mút trái trừ mút phải." Em đồng ý không? Bằng chứng nào?<br/>$\rightarrow$ Chờ $\ge 5$ giây, gọi ngẫu nhiên HS phản biện.<br/><br/>**── BƯỚC 4: CHUẨN HÓA (1 phút) ──**<br/>- GV chuẩn hóa công thức và nêu hạn chế của $R$.<br/>$\rightarrow$ Dự kiến khó khăn: HS lấy nhầm tần số trừ nhau hoặc lấy nhầm mút nhóm $\rightarrow$ GV nhấn mạnh vị trí $a_{m+1}$ và $a_1$. | **1. Khoảng biến thiên (Range)**<br/><br/>**a) Định nghĩa:**<br/>Cho mẫu số liệu ghép nhóm gồm $m$ nhóm:<br/>$$[a_1; a_2), [a_2; a_3), \dots, [a_m; a_{m+1})$$<br/>Khoảng biến thiên của mẫu số liệu ghép nhóm, kí hiệu là $R$, là hiệu số giữa đầu mút phải của nhóm cuối cùng và đầu mút trái của nhóm đầu tiên:<br/>$$R = a_{m+1} - a_1$$<br/>**b) Ý nghĩa:**<br/>- Đo độ phân tán của mẫu số liệu ghép nhóm.<br/>- $R$ càng lớn thì độ phân tán của số liệu càng lớn.<br/>- *Hạn chế:* Bị ảnh hưởng rất mạnh bởi các giá trị ngoại lai.<br/><br/>**Đáp án bài tập nhanh:**<br/>$$R = 40 - 5 = 35\text{ (triệu đồng)}$$<br/>⚠ *Lỗi phổ biến:* Lấy nhầm mút trái nhóm cuối trừ mút phải nhóm đầu ($35 - 10$) hoặc lấy hiệu giữa hai tần số lớn nhất và nhỏ nhất. |

### 4. HÌNH THÀNH KIẾN THỨC — Khoảng tứ phân vị (17 phút, P15–P32)

```latex
\begin{tikzpicture}[scale=0.9]
\draw[thick, ->] (0,0) -- (11,0) node[right] {Dữ liệu};
\draw[thick] (1,-0.2) node[below] {$a_1$} -- (1,0.2);
\draw[thick] (10,-0.2) node[below] {$a_{m+1}$} -- (10,0.2);
\draw[fill=blue!20] (3.25,-0.15) rectangle (7.75,0.15);
\draw[thick, red] (3.25,-0.3) node[below] {$Q_1$} -- (3.25,0.3);
\draw[thick] (5.5,-0.3) node[below] {$M_e (Q_2)$} -- (5.5,0.3);
\draw[thick, red] (7.75,-0.3) node[below] {$Q_3$} -- (7.75,0.3);
\node at (5.5,0.6) {\small Chứa 50\% số liệu quan sát trung tâm};
\draw[<->, thick] (3.25,1.1) -- (7.75,1.1) node[midway, above] {\small $\Delta_Q = Q_3 - Q_1$};
\draw[<->, thick] (1,-0.8) -- (10,-0.8) node[midway, below] {\small $R = a_{m+1} - a_1$};
\end{tikzpicture}
```
*(Sơ đồ trực quan minh họa vị trí của $R$ và $\Delta_Q$ trên trục dữ liệu)*

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P15 – P32 | **── BƯỚC 1: KẾT NỐI (3 phút) ──**<br/>- GV: "Ở bài trước, ta tìm vị trí trung vị $M_e = Q_2$ bằng mốc $\frac{n}{2}$. Vậy tứ phân vị thứ nhất $Q_1$ chia 25% dữ liệu đầu, mốc vị trí tương ứng là gì?"<br/>- **[SUY LUẬN]** HS: "Là $\frac{n}{4}$".<br/>- GV: "Tương tự, tứ phân vị thứ ba $Q_3$ nằm ở mốc vị trí nào?" $\rightarrow$ HS: "$\frac{3n}{4}$".<br/>- **[PHÁT HIỆN]** "Nhìn vào công thức $M_e = a_p + \frac{\frac{n}{2} - C}{n_p} \cdot h$, hãy dự đoán công thức tìm $Q_1$ và $Q_3$ sẽ thay đổi đại lượng nào?"<br/>- HS: "Thay $\frac{n}{2}$ bằng $\frac{n}{4}$ đối với $Q_1$ và $\frac{3n}{4}$ đối với $Q_3$."<br/>*Kỹ thuật xử lý:* Nếu sau 2 câu hỏi lớp vẫn chưa rút ra được: GV KHÔNG đọc công thức. Hạ thang — cho trường hợp số cụ thể $n = 40 \Rightarrow \frac{n}{4} = 10; \frac{3n}{4} = 30$, HS làm ra kết quả rồi mới hỏi: "Thay số 10 và 30 bằng biểu thức chứa $n$ thì viết được gì?".<br/><br/>**── BƯỚC 2: HÌNH THÀNH (8 phút) ──**<br/>- *Khẩu lệnh chuyển hoạt động:* "Mỗi bàn mở khay tài liệu, lấy đúng màu Phiếu số 1 của nhóm mình. Cả lớp có đúng 6 phút làm việc nhóm đồng mức. Bắt đầu!"<br/><br/>**[🔴 PHÂN HÓA]** HS làm việc trên Phiếu số 1 theo 3 nhánh độc lập $\rightarrow$ GV thu được sản phẩm bài giải ở 3 mức độ nhận thức $\rightarrow$ Giúp HS tiếp cận kiến thức vừa sức.<br/>+ **Nhóm NB (Phiếu Xanh):** Bảng có sẵn cột tần số tích lũy $cf$. Xác định nhóm chứa $Q_1$ (mốc $\frac{n}{4}$), nhóm chứa $Q_3$ (mốc $\frac{3n}{4}$) và điền số vào công thức nội suy cho sẵn.<br/>+ **Nhóm TH (Phiếu Vàng):** Tự lập bảng tần số tích lũy, tính $Q_1, Q_3$ và suy ra $\Delta_Q = Q_3 - Q_1$.<br/>+ **Nhóm VD (Phiếu Cam):** Tính $\Delta_Q$ cho hai xí nghiệp may và đối sánh mức độ đồng đều thu nhập.<br/>- *Kỹ thuật Quét Radar:* GV di chuyển bao quát lớp, hỗ trợ nhóm NB xác định $C$ (tần số tích lũy nhóm đứng trước), rút nhanh sang nhóm TH/VD.<br/>- **[KHÁI QUÁT]** Gọi 1 HS đại diện nhóm TH phát biểu quy trình 3 bước tính $\Delta_Q$.<br/><br/>**── BƯỚC 3: KIỂM TRA (4 phút) ──**<br/><br/>**[🟣 ĐGTX]** HS làm bài tập nhanh trên bảng con với mẫu $n = 40$ $\rightarrow$ GV thu nhận tỷ lệ chính xác về nhóm chứa và giá trị $C$ $\rightarrow$ Điều chỉnh tốc độ giảng dạy trước khi sang bài tập mở rộng.<br/>- Kỹ thuật Chờ hai nhịp: 10 giây tính nhẩm $\rightarrow$ "3, 2, 1, giơ bảng!". Nếu $\ge 85\%$ đúng thì đi tiếp; nếu $< 85\%$ dừng lại 1 phút mời 1 HS giải thích cách tra cứu tần số tích lũy.<br/>- **[PHẢN BIỆN]** Chiếu bài giải có lỗi sai: Học sinh thay mẫu số $n_p$ bằng tần số tích lũy của nhóm. GV: "Quan sát bài trên màn hình, phát hiện lỗi sai chí mạng và giải thích tại sao?"<br/>$\rightarrow$ Chờ 5 giây, gọi HS chỉ rõ sự khác nhau giữa tần số nhóm $n_p$ và tần số tích lũy $C$.<br/><br/>**── BƯỚC 4: CHUẨN HÓA (2 phút) ──**<br/>- GV chuẩn hóa công thức nội suy và định nghĩa khoảng tứ phân vị $\Delta_Q = Q_3 - Q_1$.<br/>- **[SO SÁNH]** "Vì sao $\Delta_Q$ khắc phục được nhược điểm của khoảng biến thiên $R$ khi mẫu có số liệu bất thường?"<br/>- HS: "Vì $\Delta_Q$ chỉ đo độ phân tán của 50% số liệu ở chính giữa, loại bỏ 25% giá trị nhỏ nhất và 25% giá trị lớn nhất."<br/>- **[SÁNG TẠO]** Dành cho HS giỏi: "Nếu tăng tất cả các giá trị trong mẫu lên 2 đơn vị, hoặc nhân đôi tất cả các giá trị thì $R$ và $\Delta_Q$ thay đổi như thế nào?"<br/>- HS thực hiện thumbs up/down tự đánh giá mức độ hiểu công thức. | **2. Khoảng tứ phân vị (Interquartile Range - $\Delta_Q$)**<br/><br/>**a) Công thức tính tứ phân vị:**<br/>- Nhóm $[a_p; a_{p+1})$ chứa tứ phân vị thứ nhất $Q_1$ (nhóm đầu tiên có tần số tích lũy $\ge \frac{n}{4}$):<br/>$$Q_1 = a_p + \frac{\frac{n}{4} - C}{n_p} \cdot h$$<br/>trong đó: $n$ là cỡ mẫu; $n_p$ là tần số nhóm chứa $Q_1$; $C$ là tần số tích lũy của nhóm trước nhóm chứa $Q_1$; $h = a_{p+1} - a_p$.<br/><br/>- Nhóm $[a_k; a_{k+1})$ chứa tứ phân vị thứ ba $Q_3$ (nhóm đầu tiên có tần số tích lũy $\ge \frac{3n}{4}$):<br/>$$Q_3 = a_k + \frac{\frac{3n}{4} - C'}{n_k} \cdot h'$$<br/>trong đó: $n_k$ là tần số nhóm chứa $Q_3$; $C'$ là tần số tích lũy của nhóm trước nhóm chứa $Q_3$; $h' = a_{k+1} - a_k$.<br/><br/>**b) Khoảng tứ phân vị:**<br/>$$\Delta_Q = Q_3 - Q_1$$<br/>**c) Ý nghĩa:**<br/>- Đo độ phân tán của nửa giữa mẫu số liệu.<br/>- $\Delta_Q$ càng lớn thì số liệu càng phân tán.<br/>- Không bị ảnh hưởng bởi các giá trị ngoại lai.<br/><br/>**Đáp án Phiếu số 1:**<br/>- **Mức NB:** $Q_1 = 30 + \frac{10 - 8}{16} \cdot 30 = 33,75$; $Q_3 = 60 + \frac{30 - 24}{12} \cdot 30 = 75 \Rightarrow \Delta_Q = 41,25$.<br/>- **Mức TH:** Nhóm chứa $Q_1$ là $[15; 20)$; $Q_1 = 15 + \frac{12,5 - 6}{12} \cdot 5 \approx 17,71$; Nhóm chứa $Q_3$ là $[25; 30)$; $Q_3 = 25 + \frac{37,5 - 36}{10} \cdot 5 = 25,75 \Rightarrow \Delta_Q = 8,04$.<br/>- **Mức VD:** Xí nghiệp A có $\Delta_{Q(A)} = 2,86$; Xí nghiệp B có $\Delta_{Q(B)} = 5,67 \Rightarrow$ Thu nhập của Xí nghiệp A đồng đều hơn.<br/><br/>⚠ *Lỗi phổ biến:* Nhầm $C$ là tần số tích lũy của CHÍNH nhóm chứa tứ phân vị thay vì nhóm TRƯỚC ĐÓ. |

### 5. KIỂM TRA NHANH — MỞ RỘNG (6 phút, P32–P38)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P32 – P38 | **(4 phút) Kiểm tra nhanh nhóm đôi (Bảng con phân hóa):**<br/>Cho mẫu số liệu ghép nhóm điểm đánh giá năng lực của 60 thí sinh (SGK tr. 85): $[0; 20): 4$; $[20; 40): 10$; $[40; 60): 22$; $[60; 80): 16$; $[80; 100): 8$.<br/>- **[NB]** Xác định khoảng biến thiên $R$ và nhóm chứa $Q_1$.<br/>- **[TH]** Tính khoảng tứ phân vị $\Delta_Q$ của mẫu số liệu.<br/>- **[VDC]** Nếu bổ sung thêm 2 thí sinh có điểm cực thấp trong khoảng $[0; 20)$, giá trị nào trong hai đại lượng $R$ và $\Delta_Q$ sẽ ít bị biến động hơn? Vì sao?<br/>$\rightarrow$ Cặp đôi trao đổi trong 2,5 phút, ghi đáp án vào bảng con và giơ bảng đồng loạt.<br/><br/>**(2 phút) Mở rộng & Hệ quả thực tế:**<br/>- **[HỆ QUẢ]** "Một quản đốc nhà máy sợi chỉ nhìn vào khoảng biến thiên $R$ của đường kính sợi dệt mà kết luận chất lượng sợi không đạt, ra quyết định dừng toàn bộ dây chuyền để hiệu chỉnh tốn hàng trăm triệu đồng. Tuy nhiên khi kiểm tra lại bằng $\Delta_Q$, thấy $\Delta_Q$ rất nhỏ. Quản đốc đã mắc sai lầm gì khi chọn số đặc trưng?"<br/>- HS: "Do có vài sợi lỗi ngẫu nhiên đẩy $R$ tăng vọt, trong khi 50% số sợi cốt lõi vẫn đạt chuẩn. Cần dùng $\Delta_Q$ để phản ánh chính xác chất lượng số đông."<br/>- *Nhiệm vụ neo cho HS xong sớm:* Tự lập bảng tần số 4 nhóm sao cho khi nhân đôi tần số tất cả các nhóm thì giá trị của $R$ và $\Delta_Q$ không thay đổi. | **KIỂM TRA NHANH & MỞ RỘNG:**<br/><br/>1. **Đáp án Kiểm tra nhanh:**<br/>- **[NB]:** Khoảng biến thiên: $$R = 100 - 0 = 100$$ Cỡ mẫu $n = 60 \Rightarrow \frac{n}{4} = 15$.<br/>Tần số tích lũy: $cf_1 = 4; cf_2 = 14; cf_3 = 36$.<br/>Do $14 < 15 \le 36$ nên nhóm chứa $Q_1$ là $[40; 60)$.<br/>- **[TH]:**<br/>$$Q_1 = 40 + \frac{15 - 14}{22} \cdot 20 \approx 40,91$$<br/>Ta có $\frac{3n}{4} = 45$. Do $36 < 45 \le 52$ nên nhóm chứa $Q_3$ là $[60; 80)$.<br/>$$Q_3 = 60 + \frac{45 - 36}{16} \cdot 20 = 71,25$$<br/>Khoảng tứ phân vị:<br/>$$\Delta_Q = Q_3 - Q_1 = 71,25 - 40,91 = 30,34$$<br/>- **[VDC]:** $\Delta_Q$ hầu như không bị ảnh hưởng vì mốc vị trí $\frac{n}{4}$ thay đổi không đáng kể trong nhóm chứa, trong khi $R$ rất dễ bị phụ thuộc vào sự xuất hiện của giá trị ngoại lai.<br/><br/>2. **Ứng dụng thực tế:** $\Delta_Q$ là thước đo ổn định và đáng tin cậy hơn $R$ trong quản lý chất lượng công nghiệp. |

### 6. SƠ KẾT & EXIT TICKET (2 phút, P38–P40)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P38 – P40 | **Khẩu lệnh kéo lớp về:** "Hết giờ. Mời cả lớp đặt bút xuống, 100% hướng mắt lên màn hình."<br/><br/>GV yêu cầu HS hoàn thành nhanh 2 cột còn lại của phiếu KWLI:<br/>- **L (Learned):** Tôi đã tính được đại lượng nào hôm nay?<br/>- **I (Interested):** Tôi muốn khám phá thêm điều gì ở tiết 2?<br/><br/>- **[KHÁI QUÁT]** Gọi ngẫu nhiên 1 HS: "Nhắc lại quy trình 3 bước tìm tứ phân vị của mẫu số liệu ghép nhóm?"<br/>- **Exit Ticket:** HS hoàn thành phiếu ra cửa trong 30 giây:<br/>"✓ Điều em nắm chắc nhất: ...................."<br/>"? Điều em còn băn khoăn về công thức: ............"<br/>- GV đứng tại cửa lớp thu lại toàn bộ phiếu Exit Ticket. | **TỔNG KẾT BÀI HỌC:**<br/><br/>1. Khoảng biến thiên:<br/>$$R = a_{m+1} - a_1$$<br/>2. Khoảng tứ phân vị:<br/>$$\Delta_Q = Q_3 - Q_1$$<br/>3. Quy trình tính tứ phân vị $Q_p$ ($p \in \{1, 3\}$):<br/>- **Bước 1:** Lập cột tần số tích lũy $cf$.<br/>- **Bước 2:** Xác định mốc $\frac{k \cdot n}{4}$ để tìm nhóm chứa tứ phân vị.<br/>- **Bước 3:** Áp dụng công thức nội suy tương ứng. |

## HƯỚNG DẪN VỀ NHÀ (BTVN)

- **HS yếu/TB:** Hoàn thành Bài 1, Bài 2a SGK Toán 12 Cánh Diều tr. 84, 85; học thuộc công thức tính $R, Q_1, Q_3$.
- **HS khá:** Hoàn thành toàn bộ Bài 2, Bài 3 SGK tr. 85; so sánh và giải thích ý nghĩa độ phân tán giữa hai mẫu số liệu ở Bài 3.
- **HS giỏi:** Hoàn thành Bài 4, Bài 5 SBT tr. 62; tìm hiểu trước mục "Em có biết?": Quy tắc hàng rào $1,5 \cdot \Delta_Q$ xác định giá trị ngoại lai của John Tukey.
- **Toàn lớp:** Ôn lại quy trình bấm máy tính cầm tay tìm tần số tích lũy và chuẩn bị bài tập cho Tiết 2: Luyện tập khoảng biến thiên và khoảng tứ phân vị.

## SƠ KẾT / RÚT KINH NGHIỆM

- **Exit Ticket:**
  - ✓ [Điều hiểu rõ nhất]: __________________________________________________
  - ? [Băn khoăn/thắc mắc]: __________________________________________________
- **Ghi chép phản tư của giáo viên sau tiết dạy:**
  - Tỉ lệ HS xác định đúng tần số tích lũy $C$ trước nhóm chứa tứ phân vị: .......... % (n = ...... HS).
  - Tình huống phát sinh và hướng khắc phục ở tiết luyện tập: ...................................................................................................................................................

---

## PHỤ LỤC: PHIẾU HỌC TẬP

### PHIẾU SỐ 1 – XÁC ĐỊNH KHOẢNG BIẾN THIÊN VÀ KHOẢNG TỨ PHÂN VỊ
Khoảng biến thiên và khoảng tứ phân vị — Tiết 1: Mẫu số liệu ghép nhóm (Dùng trong HĐ4)  
Họ và tên: ............................................................ Lớp: ............. Nhóm: ....................

#### A. TÓM TẮT KIẾN THỨC CỐT LÕI

- Khoảng biến thiên: $R = a_{m+1} - a_1$ (với nhóm đầu là $[a_1; a_2)$, nhóm cuối là $[a_m; a_{m+1})$).
- Tứ phân vị thứ nhất: $Q_1 = a_p + \frac{\frac{n}{4} - C}{n_p} \cdot h$ (với $[a_p; a_{p+1})$ là nhóm chứa $Q_1$).
- Tứ phân vị thứ ba: $Q_3 = a_k + \frac{\frac{3n}{4} - C'}{n_k} \cdot h'$ (với $[a_k; a_{k+1})$ là nhóm chứa $Q_3$).
- Khoảng tứ phân vị: $\Delta_Q = Q_3 - Q_1$.

---

#### B. NHIỆM VỤ PHÂN HÓA

##### NHÁNH 1: MỨC NHẬN BIẾT (Phiếu Xanh lá)

Cho mẫu số liệu ghép nhóm về thời gian tự học (phút/ngày) của 40 học sinh:

| Thời gian | $[0; 30)$ | $[30; 60)$ | $[60; 90)$ | $[90; 120)$ |
|---|---|---|---|---|
| Tần số ($n_i$) | 8 | 16 | 12 | 4 |
| Tần số tích lũy ($cf$) | 8 | 24 | 36 | 40 |

| Nhiệm vụ | Yêu cầu & Gợi ý | Lời giải của học sinh |
|---|---|---|
| **Nhiệm vụ 1** | Tính khoảng biến thiên $R$.<br/>*(Gợi ý: Lấy mút phải nhóm cuối trừ mút trái nhóm đầu)* | $R = \dots\dots\dots - \dots\dots\dots = \dots\dots\dots$ |
| **Nhiệm vụ 2** | Tìm nhóm chứa $Q_1$ và tính $Q_1$.<br/>*(Gợi ý: Tính $\frac{n}{4} = \frac{40}{4} = 10$. Dò vào dòng $cf$ xem 10 nằm ở nhóm nào)* | - Nhóm chứa $Q_1$ là: $[.........; .........)$<br/>- Các thông số: $a_p = .....; C = .....; n_p = .....; h = .....$<br/>- $Q_1 = ..... + \frac{10 - .....}{.....} \cdot ..... = .........$ |
| **Nhiệm vụ 3** | Tìm nhóm chứa $Q_3$ và tính $\Delta_Q$.<br/>*(Gợi ý: Tính $\frac{3n}{4} = 30$)* | - Nhóm chứa $Q_3$ là: $[.........; .........)$<br/>- $Q_3 = ..... + \frac{30 - .....}{.....} \cdot ..... = .........$<br/>- $\Delta_Q = Q_3 - Q_1 = .........$ |

---

##### NHÁNH 2: MỨC THÔNG HIỂU (Phiếu Vàng)

Khảo sát thời gian hoàn thành một bài trắc nghiệm (đơn vị: phút) của 50 thí sinh:

| Thời gian | $[10; 15)$ | $[15; 20)$ | $[20; 25)$ | $[25; 30)$ | $[30; 35)$ |
|---|---|---|---|---|---|
| Số thí sinh | 6 | 12 | 18 | 10 | 4 |

| Nhiệm vụ | Yêu cầu | Lời giải của học sinh |
|---|---|---|
| **Nhiệm vụ 1** | Lập thêm dòng tần số tích lũy vào bảng số liệu trên. | Điền trực tiếp vào bảng trên. |
| **Nhiệm vụ 2** | Tính khoảng biến thiên $R$ và nêu ý nghĩa. | - Công thức: $R = a_6 - a_1 = ..... - ..... = .....$ (phút).<br/>- Ý nghĩa: Đo độ phân tán giữa thời gian làm bài lớn nhất và nhỏ nhất của thí sinh. |
| **Nhiệm vụ 3** | Tính tứ phân vị thứ nhất $Q_1$, thứ ba $Q_3$ và khoảng tứ phân vị $\Delta_Q$. | - Cỡ mẫu $n = 50 \Rightarrow \frac{n}{4} = 12,5$; $\frac{3n}{4} = 37,5$.<br/>- Nhóm chứa $Q_1$ là $[15; 20) \Rightarrow Q_1 = 15 + \frac{12,5 - 6}{12} \cdot 5 \approx 17,71$.<br/>- Nhóm chứa $Q_3$ là $[25; 30) \Rightarrow Q_3 = 25 + \frac{37,5 - 36}{10} \cdot 5 = 25,75$.<br/>- Khoảng tứ phân vị: $\Delta_Q = Q_3 - Q_1 = 25,75 - 17,71 = 8,04$. |

---

##### NHÁNH 3: MỨC VẬN DỤNG (Phiếu Cam)

Để đánh giá độ đồng đều về mức lương của công nhân, hai xí nghiệp may A và B thống kê thu nhập hàng tháng (đơn vị: triệu đồng) của 100 công nhân mỗi đơn vị:

| Mức lương | $[6; 8)$ | $[8; 10)$ | $[10; 12)$ | $[12; 14)$ | $[14; 16)$ |
|---|---|---|---|---|---|
| Xí nghiệp A | 15 | 30 | 35 | 15 | 5 |
| Xí nghiệp B | 25 | 15 | 20 | 25 | 15 |

| Nhiệm vụ | Yêu cầu | Lời giải của học sinh |
|---|---|---|
| **Nhiệm vụ 1** | So sánh khoảng biến thiên $R_A$ và $R_B$. Nêu nhận xét ban đầu. | - Ta có: $R_A = 16 - 6 = 10$; $R_B = 16 - 6 = 10$.<br/>- Nhận xét: Cả 2 xí nghiệp có khoảng biến thiên như nhau nên $R$ chưa giúp phân biệt được độ đồng đều thu nhập. |
| **Nhiệm vụ 2** | Tính khoảng tứ phân vị $\Delta_{Q(A)}$ và $\Delta_{Q(B)}$ của từng xí nghiệp. | - Xí nghiệp A: $Q_{1(A)} = 8 + \frac{25-15}{30} \cdot 2 \approx 8,67$; $Q_{3(A)} = 10 + \frac{75-45}{35} \cdot 2 \approx 11,71 \Rightarrow \Delta_{Q(A)} \approx 3,04$.<br/>- Xí nghiệp B: $Q_{1(B)} = 6 + \frac{25-0}{25} \cdot 2 = 8,00$; $Q_{3(B)} = 12 + \frac{75-60}{25} \cdot 2 = 13,20 \Rightarrow \Delta_{Q(B)} = 5,20$. |
| **Nhiệm vụ 3** | Dựa trên $\Delta_Q$, xí nghiệp nào có mức thu nhập đồng đều hơn cho số đông công nhân? Vì sao chỉ dựa vào $R$ thì không thấy được điều này? | - Do $\Delta_{Q(A)} < \Delta_{Q(B)}$ nên mức lương của 50% công nhân ở nhóm giữa của Xí nghiệp A tập trung và đồng đều hơn.<br/>- Đại lượng $R$ chỉ phụ thuộc 2 mút ngoài cùng nên bị ảnh hưởng bởi giá trị biên, không phản ánh cấu trúc phân bố bên trong. |
