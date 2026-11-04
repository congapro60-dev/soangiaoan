# GATE D · Khối 11 — Mẫu số liệu ghép nhóm (Tiết 1) · V8.8

> `adaptive-1792831747929` · **BẢN SỬA 2026-10-25: bám giáo án gốc** `tasks/giaoan-goc-g11.md`
> Chuẩn chung: `tasks/gate-d-3-bai-tuan11.md`. Chênh lệch với bản trước: `tasks/doi-chieu-gate-d-voi-giao-an-goc.md`.
> Quyết định thầy: bảng con thay bằng máy HS · số % chỉ tham khảo, dùng số thật · **bỏ "K–B–Đ–T"** (không có trong giáo án gốc).

## 0. Ánh xạ giáo án gốc → V8.8, và xử lý ngân sách

| Giáo án gốc | Dải P | Luồng |
|---|---|---|
| HĐ1 Trải nghiệm: 40 số liệu Internet + mục tiêu | P0–P8 | Presenter dẫn + máy HS trả lời nhanh |
| HĐ2 Hình thành (một khối liền): Nội dung 1 khái niệm (11') + Nội dung 2 quy trình (13') | P8–P32 | Presenter reveal + máy HS điền Phiếu số 1, Phiếu số 2 |
| HĐ3 Rèn luyện: KT nhanh 4' + mở rộng AQI 2' | P32–P38 | Máy HS 3 câu trắc nghiệm + Presenter AQI |
| HĐ4 Sơ kết + exit ticket | P38–P40 | Thẻ thoát hiểm điện tử |

**Bỏ "K–B–Đ–T"** (chữ tắt tôi tự đặt ở bản trước). Thay bằng đúng nội dung gốc:
- **4 quy tắc ghép nhóm** (kiến thức, kiểm được): các nhóm **liên tiếp** · **không chồng chéo** · **bao phủ toàn bộ** x_min → x_max · mỗi nhóm là **nửa khoảng [aᵢ; aᵢ₊₁)**.
- **Quy trình 3 bước** (theo Phiếu số 2 của gốc): **①** tìm x_min, x_max, R = x_max − x_min → **②** chọn k, tính độ dài h → **③** lập bảng tần số và kiểm tra tổng tần số = n.
- **4 bước sư phạm** của GV: Kết nối – Hình thành – Kiểm tra – Chuẩn hoá.

**Ngân sách:** core hoạt động 31' + 7' cấu trúc (ổn định 2 + XĐMT 3 + sơ kết 2) + 2' khe mở rộng = 40'. Reserve 7' = buffer + fast-path; không có hoạt động riêng phải cắt.

## 1. Storyboard theo dải P

### P0–P2 · Ổn định + mã phòng
- V1: "Mẫu số liệu ghép nhóm — Toán 11 · Tuần 11 · Tiết 1" + mã phòng + đồng hồ P.
- Student: mã + SBD → nhóm N[x] (2–4 HS, ≤ 8 nhóm). **Copy chốt:** "Hôm nay lớp không nhận công thức trước — lớp tự gom 40 con số trước đã."

### P2–P5 · KHỞI ĐỘNG — 40 số liệu Internet (theo gốc)
- **Nguồn số liệu (thầy chốt 2026-10-25): dùng số mẫu cố định trong app** — giáo án gốc chỉ mô tả "40 số liệu từ 35 đến 235 phút, phân bố rải rác", không có bảng cụ thể, nên app giữ **một bảng mẫu duy nhất** để mọi lớp học cùng một đề:

  `42, 45, 48, 52, 55, 58, 61, 63, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90, 92, 95, 98, 100, 105, 108, 110, 112, 115, 118, 120, 125, 128, 130, 135, 140, 145, 150, 160, 175, 235`

  Đã kiểm: n = 40 · x_min = 42 · x_max = 235 · **R = 193** · tần số theo 6 nhóm 40 phút của gốc = **10, 15, 11, 3, 0, 1** (tổng 40). Nhóm [190; 230) **tần số 0** — giữ lại vì quy tắc "liên tiếp, không bỏ hổng"; đây là chỗ dạy tốt: nhóm rỗng vẫn phải có trong bảng.
- V2: bảng 40 số trên Presenter. **Câu hỏi thiết yếu treo suốt tiết (nguyên văn gốc):** "Làm thế nào để nhìn vào một tập hợp số liệu lớn mà nhận biết ngay được bức tranh tổng thể và xu hướng tập trung của dữ liệu?"
- **Ôn nền — chờ hai nhịp (máy thay bảng con):**
  - `[SO SÁNH]` So sánh x_max và x_min của mẫu → 235 và 42.
  - `[SỐ HỌC]` Tính khoảng biến thiên R = x_max − x_min → 193.
  - `[SUY LUẬN]` Lập bảng tần số đơn lẻ từng giá trị (lớp 10) có nhược điểm gì?
- V3: phân bố 3 câu. V4 thu gọn: bảng tần số đơn lẻ quá dài, nhiều giá trị tần số bằng 1, khó nhìn.
- **Copy chốt:** "Để khắc phục, ta gom các số gần nhau thành từng nhóm — đó là bài hôm nay."

### P5–P8 · XÁC ĐỊNH MỤC TIÊU (theo gốc, Must–Should–Could)
- **Must:** đọc và tính được các đại lượng của nhóm [aᵢ; aᵢ₊₁).
- **Should:** tự lập bảng ghép nhóm từ dãy số liệu thô.
- **Could:** phân tích mất mát thông tin / phản biện cách chia nhóm.
- Student: chọn mức thử thách trên máy (Coach ghi nhận, không xếp loại).
- `[🟣 ĐGTX]` (vị trí XĐMT): tỉ lệ đúng 3 câu ôn nền → GV chọn nhịp cho Nội dung 1.

### P8–P19 · Bước 1–4 sư phạm — KHÁI NIỆM mẫu ghép nhóm (11')
Theo đúng 4 bước của gốc:
- **Bước 1 Kết nối (2'):** V2 hiện dãy khoảng 40 phút: [30;70), [70;110), [110;150), [150;190), [190;230), [230;270). `[PHÁT HIỆN]` "Các khoảng có gì đặc biệt về ngoặc và độ dài?" → nửa khoảng trái đóng, độ dài đều 40. Hạ thang: "70 − 30 = ? 110 − 70 = ? Hai phép trừ nói lên điều gì?"
- **Bước 2 Hình thành (4'):** Student nhận **Phiếu số 1** (3 mức NB/TH/VD). `[KHÁI QUÁT]` "Thế nào là một nhóm số liệu? Ký hiệu [aᵢ; aᵢ₊₁) nói gì về giá trị x thuộc nhóm?" · `[PHẢN BIỆN]` "An nói: giá trị đại diện của [a;b) luôn là số nguyên chính giữa. Đúng hay sai? Cho phản chứng." `[🔴 PHÂN HÓA]` NB: xác định mút và độ dài nhóm cho trước · TH: tính giá trị đại diện · VD: phản biện bài toán mất mát thông tin.
- **Bước 3 Kiểm tra (3'):** máy thay bảng con — viết độ dài nhóm và giá trị đại diện của [60;90) · `[PHẢN BIỆN]` "Bình dùng Internet đúng 90 phút — thuộc [60;90) hay [90;120)? Vì sao?" → **Vinh danh lỗi sai**: GV chọn một bài ghi nhầm [60;90) chiếu lên (ẩn danh), phân tích ngoặc vuông lấy ≥, ngoặc tròn lấy <.
- **Bước 4 Chuẩn hoá (2'):** đóng khung định nghĩa + công thức giá trị đại diện cᵢ = (aᵢ + aᵢ₊₁)/2. `[SÁNG TẠO]` "Nhóm cuối cùng của mẫu số liệu có gì khác?" → nhóm cuối đóng cả hai đầu.
- Visual: trục số tô màu từng nửa khoảng; con trỏ kéo biên cho thấy 90 nhảy sang nhóm sau; invariant: không giá trị nào nằm ngoài mọi nhóm.

### P19–P32 · NỘI DUNG 2 — QUY TRÌNH ghép nhóm (13')
- V2: Phiếu số 2 — dữ liệu khí thải/dữ liệu thật (theo gốc) — **quy trình 3 bước** hiện dần:
  - **①** Tìm x_min, x_max, tính R = x_max − x_min
  - **②** Chọn k (5–10 tham khảo), tính độ dài h
  - **③** Lập bảng tần số, **kiểm tra tổng tần số = n**
- **4 quy tắc ghép nhóm** hiện thành thẻ: liên tiếp · không chồng chéo · bao phủ x_min→x_max · nửa khoảng [aᵢ; aᵢ₊₁).
- Student: điền từng bước (không làm cả bài một lượt): nhập x_min/x_max/R → nhập h → điền bảng tần số; máy tự kiểm tổng tần số và báo **"tổng = n ✔"** hoặc **"thiếu … số"**.
- Cue GV: "hỏng ở đâu thì quay về bước đó, không sửa bảng."
- Fast-path: nhóm xong sớm → "nhiệm vụ neo: mẫu dữ liệu 10 bạn trong tổ, đề xuất cách chia 3 nhóm tối ưu" (nguyên văn gốc).
- `[🔴 PHÂN HÓA]` Coach thấy nhóm dừng ở bước nào.
- **Copy chốt:** "Ba bước — và một cái khoá an toàn: tổng tần số phải bằng n."

### P32–P36 · HĐ3 phần 1 — Kiểm tra nhanh 3 câu (4') `[🟣 ĐGTX]`
- Câu 1 [NB] *(SGK Bài 1 tr.65)*: bảng [20;30), [30;40), [40;50) → giá trị đại diện nhóm thứ hai = 35.
- Câu 2 [TH] *(SBT tr.42)*: cự ly chạy 100 m có x_min = 12,1 s, x_max = 15,5 s; chia 4 nhóm đều bắt đầu từ 12,0 s → h ≥ 3,5/4 = 0,875 → chọn **h = 1,0**, các nhóm [12;13), [13;14), [14;15), [15;16).
- Câu 3 [VDC] *(GV tự thiết kế)*: bảng ghi [10;20), [20;30), **[31;40)** — sai ở đâu, hậu quả gì với HS đạt 30,5? → bỏ hổng (30;31), giá trị 30,5 không thuộc nhóm nào.
- Checkpoint `dewey-ckpt-v1-{lessonId}-{mãHS}` — không cộng điểm lần 2.

### P36–P38 · HĐ3 phần 2 — MỞ RỘNG AQI (2') `[🔵 CÔNG DÂN SỐ]` `[🟢 CÔNG DÂN TOÀN CẦU]`
- V2 (theo gốc): giao diện AQI (AirVisual) theo nhóm màu [0;50) Tốt, [50;100) Trung bình, [100;150) Kém…
- `[HỆ QUẢ]` "Nếu hệ thống quan trắc nhầm mút biên, xếp giá trị 100 từ 'Trung bình' sang 'Kém', hệ quả với người dân và trường học là gì?" → hoang mang, quyết định sinh hoạt ngoài trời và cảnh báo y tế sai lệch.
- **Copy chốt:** "Một dấu ngoặc sai — cả một cộng đồng hành động sai."

### P38–P40 · SƠ KẾT (2')
- Student điền cột **L (Learned)** và **I (Interesting)** của KWLI-Chart trên máy (thay phiếu giấy).
- `[KHÁI QUÁT]` "Nêu lại 4 quy tắc cốt lõi để ghép nhóm một mẫu số liệu thô."
- V2 tổng kết (nguyên văn gốc): 1) ghép nhóm giúp biểu diễn xu hướng tập trung của tập dữ liệu lớn · 2) nhóm [aᵢ; aᵢ₊₁) lấy ≥ ở mút trái, < ở mút phải · 3) cᵢ = (aᵢ + aᵢ₊₁)/2 · 4) các nhóm liên tiếp, không chồng chéo, bao phủ x_min→x_max.

## 2. Giáo án in — mẫu Ban Toán 16 thành phần (P0→P40)

**KẾ HOẠCH DẠY HỌC** — Tiết hình thành khái niệm mẫu số liệu ghép nhóm và quy trình ghép nhóm, xuất phát từ bảng 40 số liệu thời gian dùng Internet của lớp để học sinh thấy bảng tần số đơn lẻ không còn quan sát được; từ đó hình thành nhóm nửa khoảng [aᵢ; aᵢ₊₁), giá trị đại diện, bốn quy tắc ghép nhóm và quy trình ba bước (khoảng biến thiên → chọn độ dài → lập bảng tần số có kiểm tra tổng bằng n). Tiết kết thúc bằng kiểm nhanh ba mức và tình huống AQI để thấy hậu quả thật của một mút biên sai. Chạy trên bài học tương tác V8.8; dạy không mạng theo phiếu in dự phòng.

| Lớp | 11 | Tên bài học | Mẫu số liệu ghép nhóm — Tiết 1 |
|---|---|---|---|
| Môn học | Toán | Giáo viên | Vũ Việt Cường |
| Tuần học | 11 | Năm học | 2026–2027 |

**I. THÔNG TIN CHUNG** *(bảng 1×1)*

**1. Tiêu chuẩn năng lực cốt lõi**
- Tư duy và lập luận toán học: nhận biết khi nào cần ghép nhóm; phân biệt bảng tần số rời rạc với bảng ghép nhóm.
- Mô hình hoá toán học: chuyển dãy số liệu thô thành bảng ghép nhóm có quy tắc.
- Giải quyết vấn đề: xử lý đúng giá trị nằm đúng mút biên; phát hiện bảng sai (hổng khoảng, chồng chéo).
- Giao tiếp toán học: dùng đúng ký hiệu nửa khoảng, phát biểu quy tắc bằng lời.
- Tự học và tự nghiên cứu: khai thác bảng số liệu mở để hình thành quy trình xử lý dữ liệu thống kê.

**2. Mục tiêu học tập** *(bảng 1×1 + "Sau tiết học, tôi có thể:" + bảng 3×2 + Phân hóa)*
Sau tiết học, tôi có thể:

| Cơ bản (Must) | Trọng tâm (Should) | Nâng cao (Could) |
|---|---|---|
| Đọc và tính được các đại lượng của nhóm [aᵢ; aᵢ₊₁): mút, độ dài, giá trị đại diện | Tự lập bảng ghép nhóm từ dãy số liệu thô: tìm x_min, x_max, chọn k, tính h, lập bảng tần số | Phân tích mất mát thông tin khi ghép nhóm; phản biện cách chia nhóm của người khác |

Phân hóa mục tiêu: NB xác định mút và độ dài nhóm cho trước; TH tính giá trị đại diện và lập bảng; VD phản biện bài toán mất mát thông tin.

**3. Tài liệu dạy học**
- SGK Toán 11 — bài Mẫu số liệu ghép nhóm (**SGK Bài 1 tr.65**); **SBT tr.42**.
- **Bảng 40 số mẫu cố định** (đã kiểm n = 40, R = 193, tần số 6 nhóm 40 phút = 10/15/11/3/0/1) — dùng chung mọi lớp, không phụ thuộc số liệu thật của lớp.
- Phiếu số 1 (khám phá cấu trúc mẫu ghép nhóm, 3 mức) · Phiếu số 2 (quy trình ghép nhóm, 3 bước) · KWLI-Chart.
- Bài học tương tác V8.8 (`adaptive-1792831747929`): ô trả lời nhanh thay bảng con, tự kiểm tổng tần số.
- Máy chiếu bảng 40 số liệu + giao diện AQI.
- Căn cứ điều chỉnh từ đánh giá tiết trước: dùng số liệu thật của lớp về lỗi mút biên và lỗi bỏ hổng khoảng — tiết này dành riêng Bước 3 "Vinh danh lỗi sai".

**MINH CHỨNG HQT / CIS** *(bảng 3 cột)*

| Minh chứng | HS làm gì → GV thu được gì → mục đích | Vị trí |
|---|---|---|
| `[🔴 PHÂN HÓA]` Phiếu số 1 ba mức | HS làm theo năng lực (NB mút/độ dài, TH giá trị đại diện, VD phản biện mất mát thông tin) → GV thấy nhóm nào còn nhầm biên → mục đích: hỗ trợ đúng chỗ | P12–P16 |
| `[🟣 ĐGTX]` Trả lời nhanh thay bảng con | HS gửi đáp án qua máy → GV thấy tỉ lệ hiểu thật, dừng lại sửa lỗi biên ngay tại Bước 3 | P2–P5, P15, P32–P36 |
| `[🔴 PHÂN HÓA]` Phiếu số 2 quy trình 3 bước | HS điền từng bước, máy kiểm tổng tần số = n → GV thấy nhóm dừng ở bước nào → mục đích: phân tuyến luyện tiết sau | P19–P32 |
| `[🔵 CÔNG DÂN SỐ]` `[🟢 CÔNG DÂN TOÀN CẦU]` Tình huống AQI | HS phân tích hậu quả xã hội khi hệ thống quan trắc xếp sai mút biên → GV thu được ý thức trách nhiệm dữ liệu | P36–P38 |

**II. TIẾN TRÌNH HOẠT ĐỘNG** *(bảng 1×1)*

**3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH** *(bảng 1×1)*

**1. KHỞI ĐỘNG — 40 số liệu Internet — Thời lượng: 5 phút, P0–P5**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P0–P2 | GV mở phòng, HS nhập mã + SBD, gán nhóm. | Mã phòng, đồng hồ P. |
| P2–P5 | GV chiếu bảng 40 số mẫu cố định, nêu câu hỏi thiết yếu; HS trả lời 3 câu ôn nền qua máy (chờ hai nhịp). `[🟣 ĐGTX]` | x_max = 235; x_min = 42; R = 193; nhược điểm bảng tần số đơn lẻ. |

**2. XÁC ĐỊNH MỤC TIÊU — Thời lượng: 3 phút, P5–P8**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P5–P8 | GV công bố Must–Should–Could; HS chọn mức trên máy. | Mục tiêu gắn Phiếu số 1, số 2. |

**HĐ1 — Khái niệm mẫu số liệu ghép nhóm — Thời lượng: 11 phút, P8–P19**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P8–P10 | Bước 1 Kết nối: chiếu dãy khoảng 40 phút; `[PHÁT HIỆN]` ngoặc và độ dài; hạ thang bằng phép trừ. | [30;70) … [230;270), độ dài đều 40. |
| P10–P14 | Bước 2 Hình thành: HS làm Phiếu số 1 theo mức; `[KHÁI QUÁT]` và `[PHẢN BIỆN]` về giá trị đại diện. `[🔴 PHÂN HÓA]` | Nhóm số liệu, nửa khoảng, giá trị đại diện. |
| P14–P17 | Bước 3 Kiểm tra: hai câu qua máy; Vinh danh lỗi sai với bài ghi nhầm [60;90). `[🟣 ĐGTX]` | Độ dài 30, đại diện 75; 90 thuộc [90;120). |
| P17–P19 | Bước 4 Chuẩn hoá: đóng khung định nghĩa, cᵢ = (aᵢ + aᵢ₊₁)/2; `[SÁNG TẠO]` nhóm cuối đóng hai đầu. | Định nghĩa + công thức. |

**HĐ2 — Quy trình ghép nhóm — Thời lượng: 13 phút, P19–P32**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P19–P32 | HS làm Phiếu số 2 theo 3 bước: ① x_min, x_max, R → ② chọn k, tính h → ③ lập bảng tần số, kiểm tổng = n. Bốn quy tắc ghép nhóm hiện thành thẻ. GV nhắc "hỏng ở đâu quay về bước đó". Xong sớm làm nhiệm vụ neo. `[🔴 PHÂN HÓA]` | Ví dụ mẫu [0;5) 2,5 · 4; [5;10) 7,5 · 6 … tổng n = 20. |

**4. KIỂM TRA NHANH — MỞ RỘNG — Thời lượng: 6 phút, P32–P38**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P32–P36 | Ba câu trắc nghiệm trên máy (cặp đôi); checkpoint riêng, không cộng điểm lần 2. `[🟣 ĐGTX]` | Câu 1: 35 · Câu 2: h = 1,0 với [12;13)…[15;16) · Câu 3: bảng bỏ hổng (30;31), giá trị 30,5 vô chủ. |
| P36–P38 | Chiếu AQI theo nhóm màu; `[HỆ QUẢ]` xếp sai mút biên 100 thì sao? `[🔵 CÔNG DÂN SỐ]` `[🟢 CÔNG DÂN TOÀN CẦU]` | [0;50) Tốt · [50;100) Trung bình · [100;150) Kém. |

**5. SƠ KẾT — Thời lượng: 2 phút, P38–P40**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P38–P40 | HS điền L và I của KWLI trên máy; `[KHÁI QUÁT]` nêu lại 4 quy tắc ghép nhóm; GV chốt 4 dòng tổng kết. | 4 quy tắc + cᵢ + ý nghĩa ghép nhóm. |

**6. BTVN**

| Nhóm HS | Bài tập |
|---|---|
| HS yếu/TB | Đọc bảng ghép nhóm cho sẵn: nêu mút, độ dài, giá trị đại diện của 3 nhóm (SGK Bài 1 tr.65). |
| HS khá | Lập bảng ghép nhóm cho dãy số liệu thô trong SBT tr.42; ghi rõ 3 bước và kiểm tổng tần số. |
| HS giỏi | Cùng một mẫu, lập hai bảng với k khác nhau; phân tích mất mát thông tin của mỗi cách (chuẩn bị phản biện). |
| Toàn lớp | Hoàn thành Phiếu số 2 (nếu chưa xong); xem lại lỗi mút biên đã vinh danh trên lớp. |

## 3. Kiểm nhanh trước khi nộp

1. 16 thành phần đủ ✔; dải P: 0–2–5–8–10–14–17–19–32–36–38–40 phủ kín ✔.
2. Không phần trăm bịa; căn cứ điều chỉnh dùng số liệu thật ✔.
3. Nhãn CIS đầu dòng: [🔴]×2, [🟣]×2, [🔵]+[🟢]×1 ✔.
4. Bám đúng phạm vi Tiết 1; không lấn tiết sau (các số đặc trưng của mẫu ghép nhóm) ✔.
5. Không còn "K–B–Đ–T" — thay bằng 4 quy tắc ghép nhóm + quy trình 3 bước của gốc ✔.

## 4. Khác biệt so với giáo án gốc (có chủ ý)

- **Bảng con → máy HS**: giữ chờ hai nhịp; GV vẫn thấy tỉ lệ lớp.
- **Vinh danh lỗi sai** giữ nguyên nhưng bài sai được chiếu **ẩn danh** trên Presenter thay vì cầm bảng con thật.
- **Phiếu KWLI giấy → KWLI trên máy**; Phiếu số 1, số 2 chuyển thành nhiệm vụ máy (vẫn in bản giấy dự phòng).
- **Thêm**: mã phòng/nhóm, tự kiểm tổng tần số = n, checkpoint không cộng điểm lần 2, nhiệm vụ neo cho em xong sớm, đồng hồ P-zone.
- **Giữ nguyên**: toàn bộ số liệu, câu hỏi nhãn, bài tập SGK/SBT, tình huống AQI, 4 quy tắc ghép nhóm và quy trình 3 bước.
- **Bảng 40 số**: giáo án gốc chỉ mô tả khoảng 35–235; app dùng **một bảng mẫu cố định** (thầy chốt 2026-10-25) để mọi lớp học cùng một đề và kết quả kiểm được (R = 193; tần số 10/15/11/3/0/1). Nhóm [190;230) tần số 0 được giữ có chủ ý — dạy quy tắc "không bỏ hổng".
