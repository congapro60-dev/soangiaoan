# GATE D · Khối 12 — Phương sai và độ lệch chuẩn (Tiết 1) · V8.8

> `adaptive-1792834706906` · **BẢN SỬA 2026-10-25: bám giáo án gốc** `tasks/giaoan-goc-g12.md`
> Chuẩn chung: `tasks/gate-d-3-bai-tuan11.md`. Chênh lệch với bản trước: `tasks/doi-chieu-gate-d-voi-giao-an-goc.md`.
> Quyết định thầy: bảng con → máy HS · không dùng số % bịa · **HS bấm Casio thật, màn hình hướng dẫn chi tiết từng phím**.

## 0. Ánh xạ giáo án gốc → V8.8

| Giáo án gốc | Dải P | Luồng |
|---|---|---|
| Pha 1 Trải nghiệm: xạ thủ An/Bình + KWLI + mục tiêu | P0–P8 | Presenter dẫn + máy HS trả lời nhanh |
| Pha 2 Hình thành: Socratic ra công thức (5') + bảng trung gian 3 nhóm màu (9') | P8–P22 | Presenter reveal + máy HS điền bảng |
| Pha 3 Rèn luyện: KT nhanh + Casio (5') + vận dụng (9') | P22–P36 | Máy HS + **hướng dẫn phím Casio trên màn hình** |
| Pha 4 Sơ kết + mở rộng | P36–P40 | Thẻ thoát hiểm + Presenter |

**Casio (quyết định 4):** học sinh bấm **máy thật của mình**; màn hình tương tác hiện **hướng dẫn từng phím** theo đúng chuỗi của gốc, kèm ảnh mặt phím và bước đang bấm sáng lên. Máy không tự tính thay — chỉ hiện phím cần bấm + kết quả mong đợi để HS tự đối soát.

## 1. Storyboard theo dải P

### P0–P2 · Ổn định + mã phòng
- V1: "Phương sai và độ lệch chuẩn — Toán 12 · Tuần 11 · Tiết 1" + mã phòng.
- Student: mã + SBD → nhóm (3 HS, ≤ 8 nhóm; nhóm lẻ được).
- **Copy chốt:** "Hai người bắn cùng điểm trung bình — ai ổn định hơn? Hôm nay ta đo được câu trả lời."

### P2–P5 · KHỞI ĐỘNG — hai xạ thủ (theo gốc)
- V2 (nguyên văn gốc): bảng kết quả **20 phát súng của An và Bình**:

  | Điểm số | [6; 8) | [8; 10) | [10; 12) | Tổng |
  |---|---|---|---|---|
  | An (nᵢ) | 2 | 16 | 2 | 20 |
  | Bình (nᵢ) | 7 | 6 | 7 | 20 |

  Cả hai x̄ = 8,5. Kèm biểu đồ cột chồng + đường x̄ = 8,5 (Hình 1 gốc: An tập trung quanh tâm).
- **Câu hỏi thiết yếu (nguyên văn gốc):** "Khi hai mẫu số liệu có cùng số trung bình, làm thế nào dùng một đại lượng toán học để đo xem mẫu nào ổn định và có độ phân tán ít hơn?"
- **Ôn nền — chờ hai nhịp (máy thay bảng con):**
  - `[SỐ HỌC]` Giá trị đại diện của nhóm [6; 8) là bao nhiêu? → 7
  - `[SO SÁNH]` Công thức x̄ của mẫu ghép nhóm khác gì mẫu không ghép nhóm? → dùng cᵢ và nhân tần số nᵢ
  - `[GHI NHỚ]` Lớp 10 đo độ phân tán quanh trung bình bằng đại lượng nào? → phương sai
- V4 thu gọn (theo gốc): "Đa số nhớ đúng giá trị đại diện và phương sai lớp 10 — đó là chìa khoá xây công thức hôm nay."
- **Copy chốt:** "Cùng 8,5 điểm — nhưng một người bắn rất đều, một người lúc hay lúc dở."
- `[🟣 ĐGTX]` (vị trí XĐMT): tỉ lệ đúng 3 câu → GV chọn nhịp Pha 2.

### P5–P8 · XÁC ĐỊNH MỤC TIÊU (KWLI + Must–Should–Could, theo gốc)
- Student: điền nhanh **cột K (đã biết)** và **W (muốn biết)** trên máy (60 giây); GV gọi 2 HS đọc cột W (theo gốc: "làm sao tính khi số liệu bị gom nhóm", "phương sai và độ lệch chuẩn thì số nào so sánh trực tiếp với đơn vị ban đầu").
- V2 mục tiêu 3 mức: **Must** tính đúng cᵢ, x̄, s², s với k ≤ 4 · **Should** thuộc 2 công thức + **dùng Casio kiểm tra** · **Could** so sánh độ ổn định 2 mẫu, chứng minh công thức rút gọn.
- `[🟣 ĐGTX]` cột K/W là bằng chứng GV dùng để điều nhịp.

### P8–P13 · Pha 2a — Socratic ra công thức (5')
Reveal **từng bước**, không đọc công thức trước:
- `[PHÁT HIỆN]` "Trong mẫu ghép nhóm ta không biết từng xᵢ. Dùng đại lượng nào đại diện cả nhóm?" → cᵢ = (aᵢ + aᵢ₊₁)/2.
- `[SUY LUẬN]` "Lớp 10 độ lệch là (xᵢ − x̄). Với nhóm i có tần số nᵢ và đại diện cᵢ, bình phương độ lệch của cả nhóm là gì?" → nᵢ(cᵢ − x̄)².
- `[KHÁI QUÁT]` "Tổng quát hoá s² cho k nhóm cỡ mẫu n?" → khó khăn dự kiến: dấu Σ.
- **Hạ thang (nguyên văn gốc):** thay số cụ thể của An — nhóm 1: 2(7 − 8,5)², nhóm 2: 16(9 − 8,5)², nhóm 3: 2(11 − 8,5)² → "muốn trung bình các bình phương độ lệch thì làm phép gì?" → chia 20 → thay số bằng chữ.
- Chốt (hiện sau khi lớp trả lời): x̄ = (1/n)Σnᵢcᵢ · **s² = (1/n)Σnᵢ(cᵢ − x̄)²** · **s² = (1/n)Σnᵢcᵢ² − x̄²** · **s = √s²**.
- Student: điền chỗ trống từng mảnh công thức (máy khoá ô đến khi GV mở).

### P13–P22 · Pha 2b — Bảng trung gian 3 nhóm màu (9') `[🔴 PHÂN HÓA]`
- Khẩu lệnh gốc: "Đồng hồ 7 phút. **Nhóm Xanh** hoàn thành bảng mẫu và tính s², s cho **An**. **Nhóm Vàng** hoàn thành bảng và **áp dụng công thức rút gọn**. **Nhóm Cam** tính độ lệch chuẩn **cả 2 xạ thủ** và trả lời câu so sánh."
- Student: bảng 5 cột điền dần (cᵢ · nᵢ · nᵢcᵢ · (cᵢ − x̄)² · nᵢ(cᵢ − x̄)²); máy kiểm từng cột.
- GV **Quét Radar**: ghé nhóm yếu hoàn thành cột (cᵢ − x̄)² rồi rút nhanh.
- `[PHẢN BIỆN]` (gốc, bạn Hoàng): "Phương sai có đơn vị bình phương (điểm²), nên để so sánh trực quan với điểm số phải dùng độ lệch chuẩn s. Đúng hay sai? Vì sao?" → đúng, vì s = √s² cùng đơn vị với dữ liệu. Chờ 5 giây, hỏi "bằng chứng nào?".
- Đáp án gốc: An: x̄ = 8,5; Σnᵢ(cᵢ−x̄)² = 21 → s²_A = 1,05 → s_A ≈ 1,02. Rút gọn: Σnᵢcᵢ² = 1636 → 81,8 − 72,25 = 1,05 ✔. Bình: Σ = 61 → s²_B = 3,05 → s_B ≈ 1,75 → **s_A < s_B: An ổn định hơn**.
- **Copy chốt:** "Hai đường tính phải gặp nhau ở một số — lệch là có lỗi ở đâu đó."

### P22–P27 · Pha 3a — Kiểm tra nhanh + Casio (5') `[🟣 ĐGTX]` `[🔵 CÔNG DÂN SỐ]`
- **Bài nhanh (chờ hai nhịp):** n = 10, Σnᵢcᵢ² = 250, x̄ = 4 → s² = 250/10 − 16 = **9**, s = **3**. GV thấy tỉ lệ đạt ngay trên V3 (không hiện đúng/sai từng em).
- `[PHẢN BIỆN]` chiếu bài sai ẩn danh: "s² = 9 ⇒ s = ±3" → sai vì s = √s² luôn không âm.
- **Hướng dẫn Casio trên màn hình (HS bấm máy thật của mình)** — 4 bước, mỗi bước sáng phím cần bấm:

  | Bước | Màn hình hiện | HS bấm trên fx-580VN X |
  |---|---|---|
  | 1 | "Vào chế độ thống kê" | `MENU` → `6` (Statistics) → `1` (1-Variable) |
  | 2 | "Bật cột tần số (nếu chưa có cột Freq)" | `SHIFT` → `MENU` → ▼ → `3` → `1: On` |
  | 3 | "Nhập cᵢ vào cột x, nᵢ vào cột Freq" | nhập 7 `=` 2 `=` ; 9 `=` 16 `=` ; 11 `=` 2 `=` |
  | 4 | "Đọc độ lệch chuẩn quần thể σx" | `OPTN` → `3` |

- Kết quả mong đợi: **σx = 1,02469…** — khớp s ≈ 1,02.
- V4 nhấn mạnh (nguyên văn gốc): "Máy tính là công cụ kiểm tra, tư duy lập bảng của con người mới là gốc rễ."
- **Copy chốt:** "Bấm đúng 4 bước — máy xác nhận điều em đã tính bằng tay."

### P27–P36 · Pha 3b — Vận dụng (9')
- Student: bài vận dụng theo mức (GV giao hoặc nhóm chọn):
  - Mức 1: bảng 3 nhóm cho sẵn một mẫu mới → tính s², s; đối soát bằng Casio (lặp lại 4 bước).
  - Mức 2: cho s², yêu cầu tìm Σnᵢcᵢ² (đi ngược công thức rút gọn).
  - Mức 3: thêm một nhóm vào bảng — dự đoán s² tăng hay giảm trước khi tính, rồi kiểm.
- `[🔴 PHÂN HÓA]` Coach: nhóm nào quên nhân nᵢ, nhóm nào làm tròn x̄ quá sớm (lỗi phổ biến ghi trong gốc).
- **Lỗi phổ biến cần chặn (theo gốc):** quên căn khi từ s² sang s · viết s = ±√s² · làm tròn x̄ quá sớm gây tích luỹ sai số ở bước bình phương.
- **Copy chốt:** "Làm tròn x̄ sớm là mở cửa cho sai số vào bảng."

### P36–P40 · Pha 4 — Sơ kết + mở rộng (4')
- `[KHÁI QUÁT]` "Vì sao phải bình phương độ lệch thay vì cộng có dấu?" → dấu triệt tiêu.
- `[SÁNG TẠO]` **SGK tr.80 (đã đối chiếu nguyên văn):** máy đo độ ẩm không khí đo 20 lần; nếu **s > 0,15** thì đưa máy đi sửa. "Em là kỹ thuật viên: sửa hay không? Trình bày 1 dòng căn cứ."
- `[🟢 CÔNG DÂN TOÀN CẦU]`: thiết bị đo dùng chung phục vụ nhiều người — ngưỡng ra quyết định phải từ số liệu, không cảm tính.
- Student: thẻ thoát hiểm (✓ điều nắm chắc · ? điều băn khoăn) + cột **L, I** của KWLI.
- **Copy chốt:** "Phương sai đo độ tản — quyết định sửa máy là ứng dụng của nó."

## 2. Giáo án in — mẫu Ban Toán 16 thành phần (P0→P40)

**KẾ HOẠCH DẠY HỌC** — Tiết hình thành công thức phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm từ tình huống hai xạ thủ cùng điểm trung bình 8,5 nhưng độ ổn định khác nhau; học sinh được dẫn bằng chuỗi câu hỏi Socratic để tự dựng công thức (không đọc trước), rồi luyện bằng bảng trung gian theo ba nhóm mức Xanh–Vàng–Cam và kiểm chứng bằng máy tính Casio fx-580VN X theo hướng dẫn từng phím trên màn hình. Tiết khép bằng tình huống máy đo độ ẩm SGK tr.80 với ngưỡng s > 0,15 để ra quyết định. Chạy trên bài học tương tác V8.8; dạy không mạng theo phiếu in dự phòng.

| Lớp | 12 | Tên bài học | Phương sai và độ lệch chuẩn — Tiết 1 |
|---|---|---|---|
| Môn học | Toán | Giáo viên | Vũ Việt Cường |
| Tuần học | 11 | Năm học | 2026–2027 |

**I. THÔNG TIN CHUNG** *(bảng 1×1)*

**1. Tiêu chuẩn năng lực cốt lõi**
- Tư duy và lập luận toán học: dựng công thức phương sai cho mẫu ghép nhóm từ trường hợp cụ thể; giải thích vì sao bình phương độ lệch.
- Mô hình hoá toán học: lập bảng trung gian 5 cột và tính x̄, s², s.
- Giải quyết vấn đề: chọn công thức phù hợp (định nghĩa / rút gọn); phát hiện lỗi làm tròn sớm.
- Sử dụng công cụ, phương tiện học toán: dùng Casio fx-580VN X kiểm chứng và đối soát kết quả.
- Giao tiếp toán học: nêu ý nghĩa s², s trong ngữ cảnh so sánh độ ổn định.

**2. Mục tiêu học tập** *(bảng 1×1 + "Sau tiết học, tôi có thể:" + bảng 3×2 + Phân hóa)*
Sau tiết học, tôi có thể:

| Cơ bản (Must) | Trọng tâm (Should) | Nâng cao (Could) |
|---|---|---|
| Tính đúng cᵢ, x̄, s², s cho mẫu ghép nhóm có k ≤ 4 | Thuộc và dùng được cả 2 công thức s²; dùng Casio fx-580VN X kiểm tra kết quả | So sánh độ ổn định hai mẫu số liệu; chứng minh công thức rút gọn |

Phân hóa mục tiêu (3 nhóm màu theo gốc): **Xanh (NB)** làm bảng mẫu và tính cho An · **Vàng (TH)** dùng công thức rút gọn · **Cam (VD)** tính cả hai xạ thủ và trả lời câu so sánh.

**3. Tài liệu dạy học**
- SGK Toán 12 tập 1 — **Bài 2 tr.80** (mở đầu: máy đo độ ẩm; ví dụ cân nặng nam/nữ).
- Phiếu học tập số 1 (bảng trung gian 5 cột, 3 màu Xanh–Vàng–Cam); KWLI-Chart.
- Máy tính **Casio fx-580VN X** (HS tự mang; màn hình hướng dẫn 4 bước bấm phím).
- Bài học tương tác V8.8 (`adaptive-1792834706906`): bảng điền từng cột, ô trả lời nhanh thay bảng con.
- Căn cứ điều chỉnh từ đánh giá tiết trước: dùng số liệu thật của lớp về các lỗi — quên nhân tần số nᵢ, viết s = ±√s², làm tròn x̄ quá sớm; tiết này chèn các lỗi đó vào phần phản biện ẩn danh.

**MINH CHỨNG HQT / CIS** *(bảng 3 cột)*

| Minh chứng | HS làm gì → GV thu được gì → mục đích | Vị trí |
|---|---|---|
| `[🟣 ĐGTX]` Ba câu ôn nền + bài nhanh | HS trả lời qua máy (chờ hai nhịp) → GV thấy tỉ lệ hiểu thật để điều nhịp và dừng sửa lỗi ngay | P2–P5, P22–P27 |
| `[🔴 PHÂN HÓA]` Phiếu số 1 ba nhóm màu | Xanh làm bảng mẫu, Vàng dùng công thức rút gọn, Cam so sánh 2 xạ thủ → GV thấy nhóm nào kẹt ở cột nào → mục đích: hỗ trợ đúng chỗ bằng Quét Radar | P13–P22 |
| `[🔴 PHÂN HÓA]` Bài vận dụng 3 mức | HS chọn mức, tự kiểm bằng Casio → GV phân tuyến luyện tiết sau | P27–P36 |
| `[🔵 CÔNG DÂN SỐ]` Hướng dẫn Casio từng phím | HS bấm máy thật theo 4 bước, đối soát σx = 1,02469… → GV thu được kỹ năng dùng công cụ số đúng cách, không ỷ lại máy | P22–P27 |
| `[🟢 CÔNG DÂN TOÀN CẦU]` Tình huống máy đo độ ẩm | HS quyết định sửa/không theo ngưỡng s > 0,15 → GV thu được thái độ quyết định dựa trên số liệu, vì thiết bị phục vụ cộng đồng | P36–P40 |

**II. TIẾN TRÌNH HOẠT ĐỘNG** *(bảng 1×1)*

**3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH** *(bảng 1×1)*

**1. KHỞI ĐỘNG — Hai xạ thủ An và Bình — Thời lượng: 5 phút, P0–P5**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P0–P2 | GV mở phòng; HS nhập mã + SBD; gán nhóm. | Mã phòng, đồng hồ P. |
| P2–P5 | GV chiếu Bảng 1 (An 2-16-2, Bình 7-6-7, cùng x̄ = 8,5) và Hình 1; nêu câu hỏi thiết yếu; HS trả lời 3 câu ôn nền qua máy (chờ hai nhịp). `[🟣 ĐGTX]` | c_[6;8) = 7; x̄ ghép nhóm = (1/n)Σnᵢcᵢ; lớp 10 dùng phương sai. |

**2. XÁC ĐỊNH MỤC TIÊU — Thời lượng: 3 phút, P5–P8**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P5–P8 | HS điền cột K, W của KWLI trên máy (60 giây); GV gọi 2 HS đọc cột W; công bố Must–Should–Could. `[🟣 ĐGTX]` | K: cᵢ, x̄, phương sai lớp 10. W: công thức cho mẫu ghép nhóm, ý nghĩa độ tán. |

**HĐ1 — Hình thành công thức và bảng trung gian — Thời lượng: 14 phút, P8–P22**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P8–P13 | Chuỗi Socratic: `[PHÁT HIỆN]` dùng cᵢ · `[SUY LUẬN]` nᵢ(cᵢ − x̄)² · `[KHÁI QUÁT]` tổng quát hoá; hạ thang bằng số liệu xạ thủ An. HS điền chỗ trống từng mảnh công thức. | x̄ = (1/n)Σnᵢcᵢ; s² = (1/n)Σnᵢ(cᵢ − x̄)²; s² = (1/n)Σnᵢcᵢ² − x̄²; s = √s². |
| P13–P22 | Khẩu lệnh 7 phút; ba nhóm màu làm Phiếu số 1; GV Quét Radar hỗ trợ cột (cᵢ − x̄)²; `[PHẢN BIỆN]` ý kiến bạn Hoàng về đơn vị của s. `[🔴 PHÂN HÓA]` | An: s²_A = 1,05; s_A ≈ 1,02. Bình: s²_B = 3,05; s_B ≈ 1,75 → An ổn định hơn. |

**HĐ2 — Kiểm tra nhanh, Casio và vận dụng — Thời lượng: 14 phút, P22–P36**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P22–P27 | Bài nhanh qua máy (chờ hai nhịp): n = 10, Σnᵢcᵢ² = 250, x̄ = 4 → s² = 9, s = 3. Phản biện bài sai "s = ±3". Hướng dẫn Casio 4 bước trên màn hình, HS bấm máy thật. `[🟣 ĐGTX]` `[🔵 CÔNG DÂN SỐ]` | MENU 6 → 1; SHIFT MENU → ▼ → 3 → 1:On; nhập cᵢ/nᵢ; OPTN → 3; σx = 1,02469… |
| P27–P36 | HS làm bài vận dụng theo mức (tính mới · đi ngược từ s² · dự đoán trước khi thêm nhóm), tự kiểm bằng Casio. GV chặn 3 lỗi phổ biến. `[🔴 PHÂN HÓA]` | Lỗi: quên căn · viết s = ±√s² · làm tròn x̄ quá sớm. |

**4. KIỂM TRA NHANH — MỞ RỘNG — Thời lượng: 4 phút, P36–P40**| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P36–P38 | `[KHÁI QUÁT]` vì sao bình phương; `[SÁNG TẠO]` tình huống máy đo độ ẩm SGK tr.80 với ngưỡng **s > 0,15** — sửa hay không, nêu căn cứ. `[🟢 CÔNG DÂN TOÀN CẦU]` | Máy đo 20 lần; ngưỡng quyết định s > 0,15. |
| P38–P40 | GV chốt 3 dòng (ý nghĩa s², s · hai đường một đích · quyết định từ số liệu); HS gửi thẻ thoát hiểm + cột L, I của KWLI trên máy. | Thẻ thoát hiểm ✓ / ?; hẹn tiết sau luyện tập. |

**6. BTVN**

| Nhóm HS | Bài tập |
|---|---|
| HS yếu/TB | Hoàn thành bảng trung gian 3 nhóm có khung sẵn; tính s², s; học thuộc hai công thức. |
| HS khá | Tính s² bằng cả hai công thức cho bảng 4 nhóm trong SGK; kiểm lại bằng Casio theo 4 bước đã học. |
| HS giỏi | Chứng minh công thức rút gọn từ định nghĩa; giải tình huống máy đo tr.80 với ngưỡng 0,15 và trình bày căn cứ. |
| Toàn lớp | Hoàn thành Phiếu số 1; mang Casio cho tiết sau (luyện tập). |

## 3. Kiểm nhanh trước khi nộp

1. 16 thành phần đủ ✔; dải P: 0–2–5–8–13–22–27–36–38–40 phủ kín ✔.
2. Không phần trăm bịa (bỏ "ngưỡng đạt ≥ 85%" của gốc — thay bằng "GV thấy tỉ lệ thật trên V3") ✔.
3. Nhãn CIS đầu dòng: [🟣]×2, [🔴]×2, [🔵]×1, [🟢]×1 ✔.
4. Bám đúng phạm vi Tiết 1; tình huống máy đo chỉ mở và giao BTVN cho HS giỏi — không lấn Tiết 2 ✔.
5. Công thức xuất DOCX dùng OMML Cambria Math ✔.

## 4. Khác biệt so với giáo án gốc (có chủ ý)

- **Bảng con → máy HS**: giữ chờ hai nhịp; bỏ "ngưỡng 85% HS giơ đúng" vì đó là số bịa, thay bằng tỉ lệ thật hiển thị cho GV.
- **Casio**: HS bấm máy thật; màn hình hướng dẫn 4 bước kèm phím sáng — nội dung phím **giữ nguyên chuỗi của gốc**; thêm đối soát σx = 1,02469…
- **KWLI giấy → KWLI trên máy**; Phiếu số 1 chuyển thành bảng điền từng cột có tự kiểm.
- **Thêm**: mã phòng/nhóm, checkpoint không cộng điểm lần 2, bài vận dụng 3 mức, đồng hồ P-zone.
- **Giữ nguyên**: số liệu hai xạ thủ, toàn bộ câu hỏi nhãn, ý kiến bạn Hoàng, 3 lỗi phổ biến, tình huống máy đo tr.80.
