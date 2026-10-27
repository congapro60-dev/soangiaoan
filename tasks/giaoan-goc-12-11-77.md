<!-- Nguồn: Firestore lessonPlans/1761870e-01b4-47d3-9565-68f6500c805c — "Nguyên hàm — Tiết 2" — bài tương tác adaptive-1792832396461 — tải 2026-10-28 (trích từ dump tasks/tmp-giaoan-dump-12-11-77.json) — số ký tự thân giáo án: 28031 -->

# KẾ HOẠCH DẠY HỌC — NGUYÊN HÀM (Tiết 2: Bảng nguyên hàm của một số hàm số sơ cấp)

| Lớp | 12 | Tên bài học | Nguyên hàm — Tiết 2: Bảng nguyên hàm của một số hàm số sơ cấp | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 18 | Năm học | 2024–2025 |

---

## I. THÔNG TIN CHUNG

### 1. Tiêu chuẩn năng lực cốt lõi

- **Năng lực tư duy và lập luận toán học:** Nhận diện phép toán tìm nguyên hàm là phép toán ngược của đạo hàm; suy luận để xác định công thức nguyên hàm từ các công thức đạo hàm đã học.
- **Năng lực giải quyết vấn đề toán học:** Phân tích cấu trúc biểu thức hàm số cần lấy nguyên hàm, lựa chọn công thức phù hợp trong bảng nguyên hàm để tính toán; thiết lập phương trình tìm hằng số $C$.
- **Năng lực mô hình hóa toán học:** Chuyển đổi bài toán chuyển động trong vật lý với vận tốc tức thời và điều kiện ban đầu thành bài toán tìm hàm vị trí qua nguyên hàm.
- **Năng lực giao tiếp toán học:** Diễn đạt chính xác họ nguyên hàm kèm hằng số tích phân $C$, sử dụng đúng ký hiệu toán học $\int f(x) dx = F(x) + C$ và điều kiện của biến số.

### 2. Mục tiêu học tập

Sau tiết học, tôi có thể:

| Mức độ | Mục tiêu |
|---|---|
| **Must (Cơ bản)** | Tôi có thể nhận biết và áp dụng trực tiếp bảng nguyên hàm của các hàm số lũy thừa $x^\alpha$ ($\alpha \neq -1$), $\frac{1}{x}$, hàm số mũ $e^x, a^x$, hàm số lượng giác $\cos x, \sin x$ để tìm nguyên hàm của các hàm số đơn lẻ [Bloom: Nhớ – Hiểu] |
| **Should (Trọng tâm)** | Tôi có thể vận dụng kết hợp tính chất tuyến tính và bảng nguyên hàm để tìm họ nguyên hàm của đa thức, tổng hoặc hiệu các hàm số sơ cấp; xác định hàm số $F(x)$ cụ thể khi biết giá trị tại một điểm $F(x_0) = y_0$ [Bloom: Áp dụng] |
| **Could (Nâng cao)** | Tôi có thể vận dụng nguyên hàm để giải quyết bài toán chuyển động thực tế (tìm quy luật quãng đường từ vận tốc tức thời); phát hiện và giải thích công thức mở rộng $\int f(ax+b) dx$ [Bloom: Phân tích – Sáng tạo] |

### 3. Phân hóa mục tiêu

| Mức Trung bình | Mức Khá | Mức Giỏi |
|---|---|---|
| Tra cứu bảng nguyên hàm, tính được nguyên hàm của các hàm số lũy thừa bậc nguyên, $\frac{1}{x}$, $e^x$, $\sin x$, $\cos x$; giải bài tập SGK trang 12 (Bài 1a, 1b). | Tính họ nguyên hàm của biểu thức kết hợp tổng đại số; tìm hằng số $C$ khi biết $F(x_0) = y_0$; giải bài tập SGK trang 12 (Bài 2, Bài 3). | Biến đổi đưa biểu thức tích phân lượng giác/lũy thừa về dạng chuẩn; giải bài toán thực tiễn chuyển động có điều kiện biên; khái quát hóa công thức cho hàm hợp bậc nhất. |

### 4. Tài liệu dạy học

- SGK Toán 12 (Tập 2, Bộ sách Kết nối tri thức với cuộc sống, trang 8–13).
- Phiếu số 1: "Khám phá bảng nguyên hàm sơ cấp" (in sẵn phân hóa theo 3 mức).
- Phiếu số 2: "Xác định hằng số $C$ và Ứng dụng thực tế".
- Bảng con, bút lông, khăn lau bảng con cho từng học sinh.
- Phần mềm hình học động GeoGebra kiểm chứng trực quan họ đường cong nguyên hàm.

**Căn cứ điều chỉnh từ đánh giá tiết trước:**

- Tiết 1 cho thấy khoảng 30% học sinh còn quên viết hằng số $+ C$ khi viết kết quả họ nguyên hàm $\to$ Đầu mỗi hoạt động đều yêu cầu học sinh đổi bảng kiểm chéo việc ghi hằng số $C$.
- Khoảng 40% học sinh nhầm lẫn giữa tính chất $\int [f(x) \pm g(x)] dx$ với phép nhân $\int [f(x) \cdot g(x)] dx$ $\to$ Nhấn mạnh quy tắc không có nguyên hàm của một tích bằng tích các nguyên hàm ở phần củng cố.
- Học sinh làm việc với lũy thừa số mũ hữu tỉ $\sqrt{x} = x^{1/2}$ còn lúng túng khi cộng thêm 1 đơn vị $\to$ Bổ sung bài tập bước đệm chuyển đổi căn thức về lũy thừa ở phần khởi động.

---

## MINH CHỨNG HQT / CIS

| Minh chứng | HS làm gì → GV thu được gì | Observer nhìn thấy gì (CIS dự giờ) | Vị trí |
|---|---|---|---|
| **[PHÂN HÓA]** | HS làm việc theo 3 mức nhiệm vụ trên Phiếu học tập số 1 và 2 $\to$ GV thu được sản phẩm bài làm phân tầng tương ứng năng lực từng nhóm. | HS cầm các phiếu học tập có mã màu khác nhau; nhóm Giỏi làm thêm phần suy luận hàm hợp; GV xử lý linh hoạt khi HS chọn nhầm mức độ. | Pha 2 (P11–P17); Pha 3 (P24–P30) |
| **[ĐGTX]** | HS giơ bảng con đồng loạt trả lời các câu hỏi kiểm tra nhanh $\to$ GV ghi nhận tỷ lệ đúng/sai (ngưỡng $\ge 80\%$) để quyết định chuyển bước hay giải thích lại. | HS giơ bảng con đồng loạt theo khẩu lệnh; GV quét mắt bao quát lớp và nhận xét ngay phương án sai phổ biến. | Pha 2 (P17–P20); Pha 4 (P34–P38) |
| **[CÔNG DÂN SỐ]** | HS dự đoán hình dạng đồ thị của họ nguyên hàm trước khi dùng GeoGebra kiểm chứng tính tịnh tiến song song $\to$ Rèn luyện tư duy kiểm chứng công nghệ có trách nhiệm. | GV chiếu GeoGebra trượt thanh trượt $C$; HS đối chiếu hình vẽ phác của mình trong vở với họ đường cong trên màn hình. | Pha 3 (P30–P32) |
| **Danielson 1a** | Vận dụng định nghĩa đạo hàm để suy ngược ra bảng nguyên hàm; phát biểu đầy đủ điều kiện miền xác định của $\frac{1}{x}$ và $x^\alpha$. | Bảng phấn chuẩn hóa công thức toán học với các khối điều kiện rõ ràng; bài tập có ví dụ phản chứng. | Pha 2 (P8–P22) |
| **Danielson 1b** | Phân tầng bài tập theo 3 nhánh NB – TH – VD; HS được chọn mức độ bài tập ở phần luyện tập ứng dụng; có kịch bản đổi mức phù hợp. | Học sinh tự tin thao tác với phiếu phù hợp sức học; GV hỗ trợ nhóm yếu bằng câu hỏi gợi mở bậc thang mà không thu hồi phiếu. | Pha 3 (P22–P34) |
| **Danielson 1c** | Công bố rõ mục tiêu Must – Should – Could từ đầu tiết; đối chiếu kiểm tra qua phiếu KWLI và Exit Ticket. | Mục tiêu chiếu rõ trên màn hình; HS tích chọn các mục đã đạt vào cuối tiết học trên phiếu cá nhân. | Pha 1 (P5–P8); Pha 4 (P38–P40) |
| **Danielson 1d** | Sử dụng linh hoạt bảng con cá nhân, phiếu học tập thiết kế riêng và phần mềm mô phỏng hình học trực quan. | HS liên tục tương tác với công cụ học tập trên bàn, không có thời gian nhàn rỗi. | Toàn bộ tiết (P0–P40) |
| **Danielson 1e** | Tiến trình mạch lạc nối tiếp chặt chẽ từ P0 đến P40, không có thời gian chết. | Đồng hồ đếm ngược hiển thị rõ trên màn hình cho từng pha hoạt động; chuyển tiếp tự nhiên, dứt khoát. | Toàn bộ tiến trình (P0–P40) |
| **Danielson 1f** | Phản hồi lập tức các bẫy sai dấu của lượng giác và phép lũy thừa qua kỹ thuật "Vinh danh lỗi sai". | Lỗi sai điển hình được chiếu lên màn hình ẩn danh để cả lớp cùng phân tích nguyên nhân gốc rễ. | Pha 2 (P17–P20) |

*(Minh họa tình huống thực tế: Đoàn tàu cao tốc rời ga chuyển động thẳng với tốc độ biến thiên theo thời gian).*

---

## II. TIẾN TRÌNH HOẠT ĐỘNG (QUY TRÌNH 4 PHA TOÁN TDS)

```mermaid
graph LR
    A[Pha 1: TRẢI NGHIỆM<br/>P0 - P8] --> B[Pha 2: HÌNH THÀNH<br/>P8 - P22]
    B --> C[Pha 3: RÈN LUYỆN<br/>P22 - P34]
    C --> D[Pha 4: SƠ KẾT<br/>P34 - P40]
```

---

### 1. PHA 1: TRẢI NGHIỆM — BÀI TOÁN MỞ ĐẦU VÀ XÁC ĐỊNH MỤC TIÊU (8 phút, P0–P8)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| **P0 – P5** | **── TIỂU BƯỚC 1: KHỞI ĐỘNG VÀ ĐẶT VẤN ĐỀ (5 phút, P0–P5) ──**<br/>**GV dẫn dắt:** Chiếu hình ảnh đoàn tàu cao tốc đang tăng tốc và đặt bài toán thực tế:<br/>*"Một đoàn tàu rời ga chuyển động thẳng với vận tốc tức thời được ghi nhận bởi cảm biến là $v(t) = 3t^2 + 2t$ (m/s). Làm thế nào xác định chính xác quy luật quãng đường $s(t)$ đoàn tàu đi được sau thời gian $t$ giây, biết rằng tại thời điểm xuất phát $t = 0$ thì $s(0) = 0$?"*<br/>GV nêu câu hỏi thiết yếu giữ nguyên suốt tiết: *"Làm thế nào để tìm lại quy luật trạng thái ban đầu khi chỉ biết tốc độ thay đổi tức thời của nó?"*<br/><br/>**HS giơ BẢNG CON ôn kiến thức nền (Kỹ thuật chờ hai nhịp):**<br/>- **[SO SÁNH]** Đạo hàm của quãng đường $s(t)$ có quan hệ gì với vận tốc $v(t)$?<br/>- **[SỐ HỌC]** Hãy tính đạo hàm của các hàm số sau: $(x^3)'$; $(x^2)'$; $(\sin x)'$; $(\cos x)'$; $(e^x)'$; $(\ln \mid x \mid)'$.<br/>- **[PHÁT HIỆN]** Tìm một hàm số $s(t)$ sao cho $s'(t) = 3t^2 + 2t$.<br/>→ Chờ 15 giây. Khẩu lệnh: *"3, 2, 1, giơ bảng!"*<br/>GV quét nhanh bảng con cả lớp: *"Đa số các em đều tìm ra $t^3 + t^2$. Nhưng liệu đây đã là tất cả các hàm số thỏa mãn chưa? Chúng ta cùng đi tìm lời giải trọn vẹn."* | **BÀI TOÁN MỞ ĐẦU:**<br/>Cho $v(t) = 3t^2 + 2t$ (m/s). Tìm $s(t)$ biết $s(0) = 0$.<br/>Mối liên hệ: $s'(t) = v(t) \Leftrightarrow s(t) = \int v(t) dt$.<br/><br/>**BẢNG CON ÔN TẬP:**<br/>- $(x^3)' = 3x^2 \Rightarrow \int 3x^2 dx = x^3 + C$<br/>- $(x^2)' = 2x \Rightarrow \int 2x dx = x^2 + C$<br/>- $(\sin x)' = \cos x$; $(\cos x)' = -\sin x$<br/>- $(e^x)' = e^x$; $(\ln \mid x \mid)' = \frac{1}{x}$ ($x \neq 0$)<br/>$\to$ Công cụ nền tảng để xây dựng bảng nguyên hàm. |
| **P5 – P8** | **── TIỂU BƯỚC 2: XÁC ĐỊNH MỤC TIÊU VỚI KWLI (3 phút, P5–P8) ──**<br/>**GV phát Phiếu KWLI và hướng dẫn:** *"Hãy dành 1 phút để ghi nhanh vào cột K những gì em đã nắm chắc từ tiết 1, và cột W những điều em muốn biết để giải quyết trọn vẹn bài toán đoàn tàu vừa rồi."*<br/>GV gọi ngẫu nhiên 2 HS chia sẻ nhanh mong muốn của mình:<br/>- HS 1: *"Em muốn biết làm sao tính nguyên hàm của mọi hàm lũy thừa mà không phải đoán mò."*<br/>- HS 2: *"Em muốn biết tại sao $s(0) = 0$ lại giúp tìm ra duy nhất một công thức quãng đường."*<br/>GV chiếu bảng mục tiêu **Must – Should – Could**, yêu cầu HS dùng bút dạ đánh dấu mục tiêu cá nhân cần chinh phục trong tiết học này. | **KHUNG KWLI-CHART:**<br/>- **K (Đã biết):**<br/>  + Định nghĩa: $F'(x) = f(x) \Leftrightarrow \int f(x)dx = F(x) + C$.<br/>  + Tính chất: $\int [f(x) \pm g(x)]dx = \int f(x)dx \pm \int g(x)dx$.<br/>  + Tính chất: $\int k f(x)dx = k \int f(x)dx$ ($k \neq 0$).<br/>- **W (Muốn biết):**<br/>  + Bảng công thức chuẩn cho $x^\alpha, \frac{1}{x}, e^x, \sin x, \cos x$.<br/>  + Quy trình tìm hằng số $C$ từ điều kiện ban đầu $F(x_0) = y_0$.<br/>- **L & I:** (Hoàn thiện vào cuối tiết học). |

---

### 2. PHA 2: HÌNH THÀNH — XÂY DỰNG BẢNG NGUYÊN HÀM CỦA CÁC HÀM SỐ SƠ CẤP (14 phút, P8–P22)

```latex
\begin{tikzpicture}[xscale=1.2, yscale=1.0]
    \draw[->] (-0.5,0) -- (4.5,0) node[right] {$x$};
    \draw[->] (0,-0.5) -- (0,3.5) node[above] {$y$};
    \draw[domain=0.35:4.2, smooth, variable=\x, blue, thick] plot ({\x}, {1/\x});
    \node[blue, right] at (2.5,0.7) {$f(x) = \frac{1}{x}$};
    \draw[domain=0.35:4.2, smooth, variable=\x, red!80!black, thick] plot ({\x}, {ln(\x) + 1});
    \node[red!80!black, right] at (2.5,2.2) {$F(x) = \ln x + C$};
    \draw[dashed, gray] (1,0) -- (1,1);
    \node[below] at (1,0) {$1$};
    \node[left] at (0,1) {$C$};
    \fill[black] (1,1) circle (1.5pt);
\end{tikzpicture}
```
*Hình 1: Đồ thị minh họa hàm số $f(x)=\frac{1}{x}$ và một nguyên hàm $F(x)=\ln x + C$ trên khoảng $(0; +\infty)$.*

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| **P8 – P22** | **── BƯỚC 1: KẾT NỐI (3 phút, P8–P11) ──**<br/>GV đặt vấn đề từ bảng đạo hàm:<br/>**[SUY LUẬN]** Ta có $(x^4)' = 4x^3 \Rightarrow \int x^3 dx = \frac{x^4}{4} + C$. Vậy với số mũ tổng quát, $\int x^\alpha dx$ sẽ có dạng như thế nào?<br/>**[PHÁT HIỆN]** Để khi lấy đạo hàm số mũ giảm đi 1 đơn vị trở về $\alpha$, thì biểu thức ban đầu phải có số mũ là bao nhiêu và hệ số mẫu số là bao nhiêu?<br/>*(Kịch bản hạ thang sư phạm: Nếu sau 2 câu hỏi lớp còn lúng túng, GV KHÔNG đọc công thức mà cho trường hợp cụ thể: $\int x^5 dx = ?$; $\int x^7 dx = ?$. HS trả lời $\frac{x^6}{6}$ và $\frac{x^8}{8}$, GV hỏi: "Hai lần vừa rồi giống nhau ở quy luật nào? Nếu thay số bằng chữ $\alpha$ thì công thức là gì?").*<br/>HS: "Dạ là $\frac{x^{\alpha+1}}{\alpha+1} + C$."<br/><br/>**── BƯỚC 2: HÌNH THÀNH KIẾN THỨC (6 phút, P11–P17) ──**<br/>GV phát Phiếu số 1 chia theo cụm bàn đồng mức:<br/>**[🔴 PHÂN HÓA]**<br/>- Nhóm Mức TB làm Nhiệm vụ A (hàm lũy thừa số mũ nguyên dương và $e^x$).<br/>- Nhóm Mức Khá làm Nhiệm vụ B (lũy thừa số mũ âm, hữu tỉ và hàm lượng giác).<br/>- Nhóm Mức Giỏi làm Nhiệm vụ C (hàm phân thức $\frac{1}{x}$ với miền xác định và mở rộng hàm hợp cơ bản).<br/>GV dùng kỹ thuật *Quét Radar*: di chuyển liên tục, hỗ trợ ngắn gọn nhóm TB cách biến đổi căn thức $\sqrt{x} = x^{1/2}$.<br/>**[KHÁI QUÁT]** "Từ kết quả trên phiếu, nhóm Giỏi cho biết công thức $\int x^\alpha dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ có áp dụng được với mọi số thực $\alpha$ hay không? Vì sao?"<br/>HS Giỏi: "Thưa thầy/cô, không áp dụng được khi $\alpha = -1$ vì khi đó mẫu số bằng 0."<br/>**[PHẢN BIỆN]** GV chiếu bài làm của một học sinh: "Bạn Nam viết $\int \frac{1}{x} dx = \ln x + C$. Theo em khẳng định này đúng hoàn toàn chưa? Tại sao?"<br/>HS: "Sai khi $x < 0$. Do tập xác định của $\frac{1}{x}$ là $\mathbb{R} \setminus \{0\}$, nên nguyên hàm phải là $\ln \mid x \mid + C$ để biểu thức trong dấu logarit luôn dương (xem Hình 1)."<br/><br/>**── BƯỚC 3: KIỂM TRA ĐÁNH GIÁ THƯỜNG XUYÊN (3 phút, P17–P20) ──**<br/>**[🟣 ĐGTX]** GV tổ chức mini-check bảng con: "Tìm $\int \sin x dx$ và $\int e^{2x} dx$."<br/>Khẩu lệnh: *"3, 2, 1, giơ bảng!"*<br/>$\to$ GV quan sát phát hiện khoảng 25% lớp viết $\int \sin x dx = \cos x + C$ (quên dấu trừ).<br/>GV dùng kỹ thuật *Vinh danh lỗi sai*: "Rất nhiều bạn bị cuốn vào phản xạ đạo hàm $(\sin x)' = \cos x$. Hãy nhớ: Nguyên hàm là phép toán ngược. Đạo hàm của $\cos x$ là $-\sin x$, nên nguyên hàm của $\sin x$ bắt buộc phải mang dấu trừ!"<br/><br/>**── BƯỚC 4: CHUẨN HÓA KIẾN THỨC (2 phút, P20–P22) ──**<br/>GV chốt bảng nguyên hàm cơ bản lên bảng.<br/>**[SÁNG TẠO]** (Dành cho HS Giỏi): "Nếu $\int f(x)dx = F(x)+C$, bạn nào dự đoán được công thức của $\int f(ax+b)dx$ với $a \neq 0$?"<br/>HS Giỏi: "Thưa thầy/cô, là $\frac{1}{a}F(ax+b) + C$ vì khi đạo hàm hàm hợp sẽ xuất hiện thêm nhân tử $(ax+b)' = a$."<br/>Cả lớp thực hiện thao tác Thumbs up/down tự đánh giá mức độ hiểu bảng nguyên hàm. | **I. BẢNG NGUYÊN HÀM CỦA MỘT SỐ HÀM SỐ SƠ CẤP**<br/><br/>1. **Hàm số lũy thừa và hàm phân thức:**<br/>$$\int 0\, dx = C$$<br/>$$\int 1\, dx = x + C$$<br/>$$\int x^\alpha dx = \frac{x^{\alpha+1}}{\alpha+1} + C \quad (\alpha \neq -1)$$<br/>$$\int \frac{1}{x} dx = \ln \mid x \mid + C \quad (x \neq 0)$$<br/><br/>2. **Hàm số mũ:**<br/>$$\int e^x dx = e^x + C$$<br/>$$\int a^x dx = \frac{a^x}{\ln a} + C \quad (0 < a \neq 1)$$<br/><br/>3. **Hàm số lượng giác:**<br/>$$\int \cos x\, dx = \sin x + C$$<br/>$$\int \sin x\, dx = -\cos x + C$$<br/>$$\int \frac{1}{\cos^2 x} dx = \tan x + C$$<br/>$$\int \frac{1}{\sin^2 x} dx = -\cot x + C$$<br/><br/>**Đáp án PHT số 1:**<br/>- **Mức TB:** $\int (x^4 + 3x^2)dx = \frac{x^5}{5} + x^3 + C$.<br/>- **Mức Khá:** $\int (\sqrt{x} + \frac{1}{x^2})dx = \frac{2}{3}x^{3/2} - \frac{1}{x} + C$.<br/>- **Mức Giỏi:** $\int (3\sin x - 2e^x + \frac{5}{x})dx = -3\cos x - 2e^x + 5\ln\mid x\mid + C$.<br/><br/>⚠ **Lỗi phổ biến cần tránh:**<br/>- Nhầm dấu: $(\sin x)' = \cos x$ nhưng $\int \sin x dx = -\cos x + C$.<br/>- Quên trị tuyệt đối: $\int \frac{1}{x}dx = \ln\mid x\mid + C$, không được viết $\ln x + C$. |

---

### 3. PHA 3: RÈN LUYỆN — LUYỆN TẬP PHÂN HÓA VÀ XÁC ĐỊNH ĐIỀU KIỆN BAN ĐẦU (12 phút, P22–P34)

```latex
\begin{tikzpicture}[xscale=0.9, yscale=0.7]
    \draw[->] (-2.5,0) -- (2.5,0) node[right] {$x$};
    \draw[->] (0,-1.5) -- (0,5.5) node[above] {$y$};
    \draw[domain=-2.1:2.1, smooth, variable=\x, blue!50] plot ({\x}, {\x*\x - 1});
    \node[right, blue!50] at (1.8,2.2) {$C = -1$};
    \draw[domain=-2.1:2.1, smooth, variable=\x, blue] plot ({\x}, {\x*\x + 1});
    \node[right, blue] at (1.8,4.2) {$C = 1$};
    \draw[domain=-1.8:1.8, smooth, variable=\x, red!80!black, thick] plot ({\x}, {\x*\x + 2});
    \node[right, red!80!black] at (1.6,4.8) {$F(x) = x^2 + 2$ ($C=2$)};
    \fill[red!80!black] (1,3) circle (2pt) node[right] {$M_0(1;3)$};
    \draw[dashed, gray] (1,0) -- (1,3) -- (0,3);
    \node[below] at (1,0) {$x_0$};
    \node[left] at (0,3) {$y_0$};
\end{tikzpicture}
```
*Hình 2: Ý nghĩa hình học của hằng số $C$: Các đường cong nguyên hàm tịnh tiến song song theo phương $Oy$; điều kiện qua điểm $M_0(x_0; y_0)$ ghim chặt một đường cong duy nhất.*

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| **P22 – P34** | **── BƯỚC 1: KẾT NỐI VẤN ĐỀ (2 phút, P22–P24) ──**<br/>GV liên kết lại bài toán đoàn tàu ở phần Khởi động:<br/>**[SUY LUẬN]** "Ta đã biết họ nguyên hàm quãng đường là $s(t) = \int (3t^2 + 2t)dt = t^3 + t^2 + C$. Đây là một tập hợp vô số hàm số phụ thuộc vào hằng số $C$. Vậy dữ kiện thực tế $s(0) = 0$ có vai trò gì?"<br/>HS: "Dạ thay $t = 0$ vào công thức để giải tìm ra giá trị cụ thể của $C$."<br/>GV: "Chính xác. Điều kiện đó giúp ta xác định được duy nhất một quy luật chuyển động thực tế."<br/><br/>**── BƯỚC 2: THỰC HÀNH PHÂN HÓA TRÊN PHIẾU SỐ 2 (6 phút, P24–P30) ──**<br/>GV phát Phiếu số 2. Học sinh được quyền **TỰ CHỌN** mức độ bài tập:<br/>- Mức TB: Cho $f(x) = 4x^3 - 2x + 1$, tìm $F(x)$ biết $F(1) = 5$ (SGK tr. 12).<br/>- Mức Khá: Cho $f(x) = 2\cos x - 3e^x$, tìm $F(x)$ biết $F(0) = 1$ (SGK tr. 12).<br/>- Mức Giỏi: Tìm phương trình đường cong $y = F(x)$ đi qua $M(1; 2)$ biết hệ số góc tiếp tuyến tại mọi điểm $x > 0$ là $f(x) = 3x^2 + \frac{2}{x}$ (GV tự thiết kế).<br/><br/>**🔴 KỊCH BẢN SƯ PHẠM XỬ LÝ KHI HỌC SINH CHỌN SAI MỨC ĐỘ:**<br/>**(1) Xử lý HS chọn QUÁ SỨC:**<br/>- *Dấu hiệu nhận biết:* HS cắn bút, lúng túng quá 1 phút không viết được dòng nào, liên tục nhìn bài bạn xung quanh hoặc biểu hiện căng thẳng trước bài toán Mức Giỏi.<br/>- *Cách can thiệp giữ thể diện (KHÔNG thu lại phiếu):* GV tiến lại gần, cúi thấp người nói nhỏ vừa đủ HS nghe: *"Thầy/cô rất khen ngợi tinh thần thử thách bản thân của em. Để có bàn đạp hạ gục bài toán này, em hãy xử lý nhanh bài toán bước đệm ở Mức Khá/TB này trước nhé, coi như đây là bước chuẩn bị vũ khí, làm xong em quay lại xử lý bài này sẽ rất nhẹ nhàng!"*. GV chỉ tay vào câu hỏi phù hợp mà tuyệt đối không thu hồi phiếu Giỏi, giúp HS giữ nguyên sự tự tin trước bạn bè.<br/>**(2) Xử lý HS khá/giỏi chọn DƯỚI SỨC:**<br/>- *Dấu hiệu nhận biết:* HS làm xong bài Mức TB chỉ trong 1–2 phút, ngồi nhàn rỗi, biểu hiện dư dả thời gian.<br/>- *Cách can thiệp nâng thang:* GV KHÔNG yêu cầu đổi phiếu ngay mà **tung câu hỏi mở rộng tại chỗ trước**: *"Em làm rất tốt. Thầy/cô thử thách thêm: Nếu giả thiết đổi thành $x \neq 0$ thay vì $x > 0$ thì dạng họ nguyên hàm có điểm gì cần chú ý về tập xác định?"*. Khi HS suy luận và trả lời trôi chảy, GV khích lệ ngay: *"Tư duy của em ở mức này đã quá vững vàng rồi. Thầy/cô trân trọng mời em chinh phục bài toán Mức Giỏi thực tế này để phát huy hết năng lực nhé!"* và chỉ định nhiệm vụ Mức Giỏi.<br/><br/>**── BƯỚC 3: KIỂM CHỨNG TRỰC QUAN QUA CÔNG NGHỆ (2 phút, P30–P32) ──**<br/>**[🔵 CÔNG DÂN SỐ]** GV trình chiếu phần mềm GeoGebra họ parabol $F(x) = x^2 + C$ (xem Hình 2).<br/>**[SO SÁNH]** "Khi kéo thanh trượt thay đổi giá trị $C$, đồ thị biến đổi ra sao? Điểm chung giữa chúng là gì?"<br/>HS: "Đồ thị giữ nguyên hình dạng parabol, chỉ trượt tịnh tiến lên xuống dọc theo trục tung $Oy$."<br/>GV chốt: "Và điều kiện $F(x_0) = y_0$ chính là chiếc đinh ghim chặt đồ thị đi qua một điểm cố định, biến vô số đường cong thành một đường duy nhất!"<br/><br/>**── BƯỚC 4: CHUẨN HÓA QUY TRÌNH (2 phút, P32–P34) ──**<br/>**[KHÁI QUÁT]** 1 HS nêu lại quy trình 2 bước giải bài toán tìm nguyên hàm có điều kiện ban đầu.<br/>HS: "Bước 1: Tìm họ nguyên hàm tổng quát $F(x) + C$. Bước 2: Thay $x = x_0$ giải phương trình $F(x_0) + C = y_0$ tìm $C$, rồi kết luận hàm số cụ thể." | **II. BÀI TOÁN TÌM NGUYÊN HÀM THỎA MÃN ĐIỀU KIỆN BAN ĐẦU**<br/><br/>**Quy trình chuẩn 2 bước:**<br/>1. **Bước 1:** Tìm họ nguyên hàm tổng quát: $\int f(x) dx = F(x) + C$.<br/>2. **Bước 2:** Thay $x = x_0$, giải phương trình:<br/>$$F(x_0) + C = y_0 \Rightarrow C = y_0 - F(x_0)$$<br/>Kết luận hàm số cụ thể $F(x)$.<br/><br/>**Ý nghĩa hình học:**<br/>Điều kiện $F(x_0) = y_0$ xác định duy nhất một đường cong trong họ các đường cong đồng dạng tịnh tiến song song với nhau theo phương trục $Oy$.<br/><br/>**Đáp án PHT số 2:**<br/>- **Mức TB:**<br/>  $F(x) = \int (4x^3 - 2x + 1)dx = x^4 - x^2 + x + C$.<br/>  $F(1) = 1 - 1 + 1 + C = 5 \Rightarrow C = 4$.<br/>  Vậy $F(x) = x^4 - x^2 + x + 4$.<br/>- **Mức Khá:**<br/>  $F(x) = \int (2\cos x - 3e^x)dx = 2\sin x - 3e^x + C$.<br/>  $F(0) = 2\sin 0 - 3e^0 + C = 1 \Rightarrow -3 + C = 1 \Rightarrow C = 4$.<br/>  Vậy $F(x) = 2\sin x - 3e^x + 4$.<br/>- **Mức Giỏi:**<br/>  $F(x) = \int (3x^2 + \frac{2}{x})dx = x^3 + 2\ln x + C$ (do $x > 0$).<br/>  $F(1) = 1^3 + 2\ln 1 + C = 2 \Rightarrow 1 + C = 2 \Rightarrow C = 1$.<br/>  Phương trình đường cong là: $y = x^3 + 2\ln x + 1$. |

---

### 4. PHA 4: SƠ KẾT — KIỂM TRA NHANH, MỞ RỘNG VÀ EXIT TICKET (6 phút, P34–P40)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| **P34 – P38** | **── TIỂU BƯỚC 1: KIỂM TRA NHANH & MỞ RỘNG (4 phút, P34–P38) ──**<br/>**[🟣 ĐGTX]** Mini-quiz nhóm đôi qua Bảng con (3 câu hỏi phân tầng):<br/>- **[NB]** Câu 1: Tìm họ nguyên hàm của hàm số $f(x) = 5^x + \cos x$.<br/>- **[TH]** Câu 2: Tìm hàm số $f(x)$ biết $f'(x) = 6x^2 - 4x$ và $f(2) = 10$.<br/>- **[VDC]** Câu 3: Một quả bóng được ném thẳng đứng lên từ mặt đất với vận tốc ban đầu $v_0 = 20$ m/s. Bỏ qua sức cản không khí, gia tốc trọng trường là $a(t) = -9,8$ m/s$^2$. Tính độ cao cực đại quả bóng đạt được.<br/>Khẩu lệnh kéo lớp về: *"Hết giờ. Mời cả lớp đặt bút lông xuống, 100% mắt hướng lên màn hình!"*<br/>GV đối chiếu kết quả, đại diện nhóm giải câu 3 trình bày ngắn gọn: $v(t) = -9,8t + 20$; bóng đạt đỉnh khi vận tốc triệt tiêu $v(t) = 0 \Leftrightarrow t \approx 2,04$ s $\to h_{\max} \approx 20,41$ m.<br/><br/>**Mở rộng thực tiễn & Hệ quả:**<br/>GV chiếu ứng dụng trong Kinh tế học: "Trong sản xuất, hàm chi phí cận biên $C'(x)$ thể hiện chi phí phát sinh khi sản xuất thêm một đơn vị sản phẩm. Khi đó tổng chi phí sản xuất $x$ sản phẩm chính là $C(x) = \int C'(x) dx$."<br/>**[HỆ QUẢ]** "Nếu một kỹ sư tính toán kết cấu nhịp cầu hoặc quỹ đạo vệ tinh mà quên mất hằng số $C$ trong điều kiện biên ban đầu, hậu quả sẽ thế nào?"<br/>HS: "Tọa độ vị trí sẽ lệch hoàn toàn; sai lệch độ võng chịu lực có thể dẫn tới sự cố sập gãy công trình."<br/>*Nhiệm vụ neo cho HS hoàn thành sớm:* Tự thiết lập bài toán tìm vị trí từ gia tốc $a(t) = 6t$ và thách đố bạn cùng bàn. | **ĐÁP ÁN MINI-QUIZ:**<br/><br/>1. **[NB]** $\int (5^x + \cos x) dx = \frac{5^x}{\ln 5} + \sin x + C$.<br/><br/>2. **[TH]** $f(x) = \int (6x^2 - 4x)dx = 2x^3 - 2x^2 + C$.<br/>Vì $f(2) = 2(2)^3 - 2(2)^2 + C = 10 \Rightarrow 8 + C = 10 \Rightarrow C = 2$.<br/>Vậy $f(x) = 2x^3 - 2x^2 + 2$.<br/><br/>3. **[VDC]**<br/>- Vận tốc: $v(t) = \int (-9,8)dt = -9,8t + C_1$. Do $v(0) = 20 \Rightarrow C_1 = 20 \Rightarrow v(t) = -9,8t + 20$.<br/>- Độ cao: $h(t) = \int v(t)dt = -4,9t^2 + 20t + C_2$. Do $h(0) = 0 \Rightarrow C_2 = 0$.<br/>- Đạt đỉnh khi $v(t) = 0 \Leftrightarrow t = \frac{20}{9,8} \approx 2,04$ s.<br/>Độ cao cực đại: $h_{\max} = h(2,04) \approx 20,41$ m.<br/><br/>**ỨNG DỤNG & HỆ QUẢ:**<br/>- Kinh tế học: Tổng chi phí $C(x) = \int C'(x)dx$, trong đó hằng số $C$ đại diện cho định phí ban đầu.<br/>- Bỏ quên $C$ đồng nghĩa với bỏ qua trạng thái ban đầu, khiến toàn bộ mô hình dự báo sai lệch. |
| **P38 – P40** | **── TIỂU BƯỚC 2: SƠ KẾT BÀI HỌC & EXIT TICKET (2 phút, P38–P40) ──**<br/>**GV hướng dẫn HS hoàn tất phiếu:** *"Hãy dành 1 phút cuối để điền vào cột L (Learned) và cột I (Interested) trên phiếu KWLI."*<br/>**[KHÁI QUÁT]** GV gọi 1 HS: *"Em hãy đúc kết trong 1 câu: Điểm cốt lõi nhất để không mắc lỗi khi tìm nguyên hàm là gì?"*<br/>HS: *"Phải thuộc chuẩn dấu nguyên hàm lượng giác và luôn luôn viết $+ C$ trước khi thay số tìm điều kiện ban đầu."*<br/>**[SÁNG TẠO]** GV hỏi gợi mở: *"Nếu gặp bài toán $\int (x \cdot e^x) dx$ thì có dùng ngay bảng nguyên hàm sơ cấp được không?"*<br/>HS: *"Không ạ, vì không có nguyên hàm của tích, cần phương pháp mới ở tiết sau."*<br/>Thu phiếu Exit Ticket trong 30 giây cuối khi HS rời lớp. | **TỔNG KẾT TIẾT HỌC:**<br/>1. Thuộc lòng Bảng nguyên hàm các hàm sơ cấp ($x^\alpha, \frac{1}{x}, e^x, a^x, \sin x, \cos x$).<br/>2. Nắm chắc Quy trình 2 bước tìm $F(x)$ qua điều kiện ban đầu $F(x_0) = y_0$.<br/><br/>**EXIT TICKET (Vé ra cửa):**<br/>- ✓ Điều hiểu rõ nhất: ........................<br/>- ? Điều còn thắc mắc: ........................ |

---

## HƯỚNG DẪN VỀ NHÀ (BTVN)

- **HS yếu/TB:** Hoàn thành bài tập 1, 2 trang 12 SGK Kết nối tri thức; học thuộc lòng bảng nguyên hàm cơ bản.
- **HS khá:** Giải bài tập 3, 4 trang 13 SGK; hoàn thành bài toán ứng dụng chi phí cận biên trong SBT bài 1.5.
- **HS giỏi:** Chứng minh công thức tổng quát $\int f(ax+b) dx = \frac{1}{a} F(ax+b) + C$ ($a \neq 0$); giải bài tập nâng cao tính vận tốc con lắc đơn có ma sát.
- **Toàn lớp:** Xem trước bài mới "Phương pháp đổi biến số để tìm nguyên hàm" (trả lời câu hỏi: Làm thế nào để tính $\int 2x(x^2+1)^5 dx$ mà không cần khai triển lũy thừa bậc 5?).

---

## SƠ KẾT / RÚT KINH NGHIỆM

- **Exit ticket của học sinh:**
  + ✓ Điều hiểu rõ nhất: ............................................................................................
  + ? Điều còn băn khoăn: ........................................................................................
- **Ghi nhận của giáo viên sau tiết dạy:**
  + Mức độ đạt được mục tiêu Must của học sinh: ............% (dự kiến $\ge 90\%$).
  + Tỷ lệ học sinh còn nhầm lẫn dấu nguyên hàm lượng giác: ............% (cần tăng cường nhắc lại ở đầu tiết 3).
  + Khả năng tự điều tiết và độ chính xác khi chọn mức độ phiếu bài tập: ...................................

---

## PHỤ LỤC: CÁC PHIẾU HỌC TẬP

### PHIẾU SỐ 1 – KHÁM PHÁ BẢNG NGUYÊN HÀM
*(Sử dụng trong Pha 2: Hình thành kiến thức, P8–P22)*  
Họ và tên: ......................................................... Lớp: ..................... Nhóm mức độ: ...................

#### A. QUY TẮC CHUYỂN ĐỔI NGƯỢC TỪ ĐẠO HÀM
Điền vào chỗ trống để thiết lập công thức nguyên hàm tương ứng:

| Đạo hàm đã học | Phép suy luận ngược | Công thức nguyên hàm |
|---|---|---|
| $(x^3)' = 3x^2$ | Đạo hàm làm giảm bậc đi 1 đơn vị | $\int x^2 dx = \frac{x^3}{3} + C$ |
| $(x^{\alpha+1})' = (\alpha+1)x^\alpha$ | Chia hai vế cho $(\alpha+1)$ với điều kiện $\alpha \neq -1$ | $\int x^\alpha dx = ....................$ |
| $(\ln \mid x \mid)' = \frac{1}{x}$ | Biểu thức logarit xác định với mọi $x \neq 0$ | $\int \frac{1}{x} dx = ....................$ |
| $(-\cos x)' = \sin x$ | Đạo hàm của $\cos x$ có dấu trừ | $\int \sin x dx = ....................$ |

#### B. LUYỆN TẬP PHÂN TẦNG

| Mức độ | Nhiệm vụ yêu cầu | Lời giải chi tiết của học sinh |
|---|---|---|
| **Nhiệm vụ A**<br/>*(Mức TB)* | Áp dụng trực tiếp bảng nguyên hàm, tìm họ nguyên hàm của:<br/>a) $f(x) = x^4 + 3x^2$<br/>b) $g(x) = e^x - \cos x$ | Lời giải: |
| **Nhiệm vụ B**<br/>*(Mức Khá)* | Biến đổi đưa về lũy thừa hoặc tách tổng để tính:<br/>a) $f(x) = \sqrt{x} + \frac{1}{x^2}$<br/>b) $g(x) = 2\sin x + 3^x$ | Lời giải: |
| **Nhiệm vụ C**<br/>*(Mức Giỏi)* | Tìm họ nguyên hàm và chỉ rõ tập xác định:<br/>a) $f(x) = 3\sin x - 2e^x + \frac{5}{x}$<br/>b) Chứng minh: $\int \frac{1}{2x+1} dx = \frac{1}{2} \ln \mid 2x+1 \mid + C$ | Lời giải: |

---

### PHIẾU SỐ 2 – XÁC ĐỊNH HẰNG SỐ $C$ VÀ ĐIỀU KIỆN BAN ĐẦU
*(Sử dụng trong Pha 3: Rèn luyện, P22–P34)*  
Họ và tên: ......................................................... Lớp: .....................

#### A. BÀI TẬP PHÂN HÓA THEO MỨC ĐỘ (HỌC SINH TỰ CHỌN MỨC PHÙ HỢP)

| Nhiệm vụ | Đề bài & Hướng dẫn bước đệm | Lời giải của học sinh |
|---|---|---|
| **Mức TB**<br/>*(SGK tr. 12)* | Tìm nguyên hàm $F(x)$ của hàm số $f(x) = 4x^3 - 2x + 1$, biết $F(1) = 5$.<br/>*Gợi ý:*<br/>- Bước 1: Tính họ $F(x) = \int f(x)dx$.<br/>- Bước 2: Thay $x=1$, cho kết quả bằng 5 để tìm $C$. | Lời giải: |
| **Mức Khá** | Tìm nguyên hàm $F(x)$ của hàm số $f(x) = 2\cos x - 3e^x$, biết $F(0) = 1$.<br/>*Chú ý:* Tính chính xác $\cos 0$ và $e^0$. | Lời giải: |
| **Mức Giỏi** | Một hạt chuyển động có gia tốc tức thời $a(t) = 6t - 4$ (m/s$^2$). Tại thời điểm ban đầu $t = 0$, hạt có vận tốc $v(0) = 3$ m/s và ở vị trí gốc tọa độ $s(0) = 0$. Hãy thiết lập hàm vị trí $s(t)$ của hạt. | Lời giải: |

#### B. PHIẾU EXIT TICKET (Nộp lại cho GV khi kết thúc tiết học)
- Họ và tên: ........................................................................ Lớp: .......................................
- Công thức nguyên hàm em thấy dễ nhớ nhất hôm nay: ...................................................
- Bẫy hoặc lỗi sai em cần nhắc nhở bản thân tránh mắc phải: ............................................
- Câu hỏi hoặc điều em còn thắc mắc muốn hỏi thầy/cô: ...................................................
