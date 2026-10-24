# GATE D · Khối 11 — Mẫu số liệu ghép nhóm (Tiết 1) · V8.8

> `adaptive-1792831747929` · Archetype `PRACTICE_REVIEW` · 40' · Trọng tâm: quy trình 4 bước thành kỹ năng
> Chuẩn chung: `tasks/gate-d-3-bai-tuan11.md`. Gate P: `tasks/gate-p-3-bai-tuan11.md` PHẦN 2.
> Nguồn: SGK KNTT Toán 11 – tập 1, bài về mẫu số liệu ghép nhóm (tập/trang đối chiếu sau OCR — PDF scan); giáo án Ban Toán đã sinh, body chờ tải từ Thư viện.

## 0. Đối chiếu ngân sách Gate P → Gate D — xử lý cảnh báo vượt ngân sách

Gate P tự phát hiện core ≈ 40' > coreBudget 33'. **Gate D xử lý bằng 3 động tác:**

1. **B09 (biểu quyết lựa chọn số nhóm) chuyển sang reserve** — chạy ở khe 2' P36–P38 nếu kịp; nếu đội giờ thì bỏ, trả 2' cho B07 (copy có sẵn khi bỏ).
2. Rút minutes hoạt động cho khít dải P cứng: B02 7→6, B04 5→4, B05 4→2, B06 7→5 (B05 2' vì B04 đã nêu khái niệm trước đó; B06 5' được bù bởi fast-path).
3. Đếm lại trung thực: **core hoạt động = 31'** (B01 3 + B02 6 + B03 3 + B04 4 + B05 2 + B06 5 + B07 4 + B08 4) + 7' cấu trúc (ổn định lớp 2' + XĐMT 3' + sơ kết 2') + 2' khe MỞ RỘNG = 40'. Reserve 7' = B09 (2') + buffer 5'. Protected: B04, B05, B06 (chỗ sinh bằng chứng quy trình).

## 1. Sửa một đỏm của Gate P (trung thực)

Gate P ghi "cặp đôi là đơn vị tương tác chính". Ràng buộc ≤ 8 nhóm (chuẩn chung) mâu thuẫn khi sĩ số 26 → 13 cặp. **Gate D chốt:** đơn vị gửi bài = **nhóm 2–4 HS** (sĩ số ≤ 16: nhóm đôi; 17–26: nhóm 3–4, vẫn ≤ 8 nhóm); bên trong nhóm các thành viên cùng làm trên một bản; kiểm tra chéo B07 vẫn **giữa hai nhóm** (bản ẩn danh).

## 2. Storyboard theo dải P

### P0–P2 · Ổn định lớp + mã phòng
- V1: "Mẫu số liệu ghép nhóm — Toán 11 · Tuần 11 · Tiết 1" + mã phòng. Student nhập mã + SBD → nhóm N[x].
- **Copy chốt:** "Hôm nay lớp không học 'công thức' trước — lớp tự gom 26 con số trước đã."

### P2–P5 · B01 KHỞI ĐỘNG — "Bảng 26 số làm người ta mệt" (3')
- V2: bảng 26 điểm kiểm tra (số liệu thật của lớp/SGK, không phần trăm bịa). Câu `[PHÁT HIỆN]`: "Nhìn 10 giây: lớp mình làm bài tốt tới đâu? Có cách nào tóm gọn 26 số mà không mất xu hướng?"
- Student: thăm dò nhanh 1/3 (Đọc được ngay / Khó nhìn / Cần gom lại) — V3 đếm phương án, không chấm.
- V4: "Từ 26 số về một bảng vài dòng — gọi là GHÉP NHÓM. Hình trong đầu: đồi cỏ ('xu hướng') còn lại, cây riêng lẻ bỏ đi."
- **Copy chốt chuyển:** "26 số → một bảng nhỏ. Bắt tay thử nhé."
- `[🟣 ĐGTX]` (vị trí XĐMT): thăm dò B01 → GV chọn nhịp HĐ1. Offline: bảng in trong phiếu.

### P5–P8 · XÁC ĐỊNH MỤC TIÊU (3')
- V2: "Sau tiết học, tôi có thể: (1) tự chia mẫu số liệu thành các nhóm nửa khoảng; (2) chạy đúng quy trình 4 bước; (3) chỉ ra chỗ sai khi bạn chia sai biên." Student: thẻ NGHE GV.
- **Copy chốt:** "Kiểm tra của tiết này là kiểm tra chéo — em phải nhìn ra lỗi biên của nhóm bạn."

### P8–P14 · B02 — "Thử tự chia nhóm theo cách nhóm mình" (6', nhóm)
- Handoff → "Giao task về máy"; Student: LÀM TRÊN MÁY. **Copy:** "Nhóm mình chọn số nhóm k, chọn biên — bấm GỬI khi xong. Nhớ: nhóm nửa khoảng."
- V2/Student: 26 số xếp hàng; nhập **k** (khung gợi ý 5–10), **biên đầu mỗi nhóm** với giá trị đại diện tự tính; hai cột (biên | tần số) cập nhật sống theo ô nhập.
- Coach: bảng cách chia từng nhóm (k, biên, tần số). `[🔴 PHÂN HÓA]` nhóm gửi sớm hợp lệ → DEEP "tìm cách chia thứ 3". Hypothesis: "chọn L không gọn, nhóm cuối lẻ" — mẹo kiểm: "hỏi nhóm: nhóm cuối kết thúc ở đâu?".
- Fast-path: DEEP ngay. Offline: phiếu + ô vuông.
- **Copy chốt thu:** "Cùng 26 số, mỗi nhóm một cách gom — giờ so nhé."

### P14–P17 · B03 — Công bố so sánh 2 cách chia (3')
- Handoff → "Công bố"; Student NGHE GV, bản nhóm giữ nguyên. V3: hai bảng cạnh nhau (ẩn danh đến khi GV bật).
- Câu `[SO SÁNH]`: "Hai cách chia — bảng nào dễ đọc hơn? Xu hướng 'đa số điểm cao' còn giữ được không?"
- V4 thu gọn: "k quá nhiều → mất tóm gọn; k quá ít → xoá chi tiết. SGK tham khảo k từ 5 tới 10."
- `[🟣 ĐGTX]` nhận xét HS được dẫn thẳng vào chốt. no-spoiler: đánh giá "đẹp hơn" thuộc về HS, không phải máy.
- **Copy chốt:** "Không có cách chia duy nhất đúng — có cách gợi nhớ."

### P17–P21 · B04 — Chốt: nhóm nửa khoảng + giá trị đại diện (4')
- V2 reveal theo phần: (1) ký hiệu nhóm **[a; a + L)** — tô màu, invariant: biên trái thuộc nhóm, biên phải thuộc nhóm sau (điểm số trôi khi kéo biên); (2) giá trị đại diện x_i = điểm giữa nhóm; (3) Student quick-fill 1 câu: số 10,5 rơi vào nhóm nào, cho [8; 10,5) và [10,5; 13)? — reveal sau trả lời.
- Câu `[KHÁI QUÁT]`: "Vì sao phải định nghĩa nửa khoảng [a; a+L) thay vì [a; a+L]?"
- V4: "Trừ việc trùng lặp không sót. Riêng nhóm cuối đóng cả hai đầu — cho đủ max."
- `[🔴 PHÂN HÓA]`: HS trả lời đúng chỗ biên → GV đánh dấu nhóm chính xác tên (máy GV).
- **Copy chốt:** "Quy tắc biên: trái thuộc, phải không — riêng nhóm cuối, cả hai."

### P21–P23 · B05 — Quy trình 4 bước (2')
- V2: 4 thẻ lộn xộn (K: chọn k & khoảng · B: chốt biên nửa khoảng · Đ: tính giá trị đại diện · T: lập bảng tần số). Student chọn thứ tự đúng 1 lần; reveal + câu nhớ **"K–B–Đ–T: Khoảng, Biên, Đại diện, Bảng"**.
- **Copy chốt:** "Quy trình này chạy được trên giấy lẫn máy — thuộc K–B–Đ–T."

### P23–P28 · B06 — Luyện từng bước (5', cá nhân) — protected
- Handoff: "Giờ từng em làm 3 nhiệm vụ rời — một nhiệm vụ một bước." Student: LÀM TRÊN MÁY.
  - N1 `[PHÁT HIỆN]` (đọc bảng): bảng tần số 3 nhóm cho sẵn — tần số nhóm [12; 15) là bao nhiêu?
  - N2 (lập biên): min = 6, max = 21, k = 5 → điền biên nhóm thứ 3 (hint: "L = (max−min)/k").
  - N3 (đủ K–B–Đ–T): mẫu 12 số 6–21 → dựng bảng hoàn chỉnh (điền tần số từng nhóm).
- Hint 1→3; xong sớm → nhiệm vụ khó "k = 7 cho mẫu 30 số". Coach: từng bước lưu riêng. `[🔴 PHÂN HÓA]` đúng ≥ 2/3 nhiệm vụ. Hypothesis: "hiểu [a; b] đóng hai đầu" — mẹo kiểm: "số 10 là đầu của nhóm nào?". Offline: phiếu + ảnh.
- **Copy chốt:** "Ba nhiệm vụ = ba bước đầu của K–B–Đ–T; bước thứ tư là ghép lại."

### P28–P32 · B07 — Kiểm tra chéo giữa hai nhóm (4')
- Student: LÀM TRÊN MÁY — nhận bảng ẩn danh "Nhóm 4"; chấm 3 tiêu chí (k hợp lý · biên đúng quy tắc nửa khoảng · bảng tần số đúng) + **bắt buộc** 1 nhận xét chữ ("1 điều làm tốt + 1 điều nên sửa"); gửi về — nhóm được chấm thấy trên máy mình: "Nhóm 2 nhận xét: …".
- Câu dẫn `[PHẢN BIỆN]`: "Tìm 1 chỗ cách bạn chọn biên mà em không đồng ý — đưa lý do."
- Coach: nhận xét đã gửi/về; `[🔴 PHÂN HÓA]` chất lượng nhận xét là bằng chứng hiểu sâu. Không chấm điểm nhận xét.
- **Copy chốt:** "Chấm được lỗi của bạn nghĩa là em thuộc quy trình."

### P32–P36 · B08 — KIỂM TRA NHANH: exit 3 câu (4')
- Checkpoint riêng `dewey-ckpt-v1-{lessonId}-{mãHS}` — không cộng điểm lần 2.
- Câu 1: sơ đồ nửa khoảng đúng/sai theo hình; Câu 2: giá trị đại diện của một nhóm; Câu 3 `[KHÁI QUÁT]`: nhóm cuối đóng hai đầu — vì sao?
- **Copy:** "3 câu viết nhẹ trước khi tan."

### P36–P38 · MỞ RỘNG — B09 biểu quyết (2') — **TIÊU RESERVE, chạy nếu kịp**
- V2: mẫu 100 số — 3 phương án k (5 / 10 / 25) — biểu quyết cả lớp; câu `[SÁNG TẠO]`: "Nếu em là người trình bày báo cáo, em chọn k thế nào — vì sao?"
- V4: "k = 25 → bảng dài như bảng gốc; k = 5 → thô quá. Người chọn k phải nghĩ đến NGƯỜI ĐỌC."
- `[🔵 CÔNG DÂN SỐ]`: báo cáo thống kê công khai (dân số, giá cả, điểm thi) — chọn số nhóm vì người đọc, không vì đẹp biểu đồ.
- **Điều kiện quay về:** nếu B06/B07 đội giờ → bỏ B09; khi bỏ, Student thấy: "Câu biểu quyết hoãn đầu tiết sau — 1 phút."
- **Copy chốt:** "Số nhóm là quyết định của người làm báo cáo — làm vì người đọc."

### P38–P40 · SƠ KẾT (2')
- V2: 3 dòng chốt (K–B–Đ–T · quy tắc biên · k vì người đọc); Student: phiếu thoát (icon + câu lấn cấn); GV ghi rút kinh nghiệm (máy GV).
- **Copy chốt:** "Hẹn tiết sau: từ bảng ghép nhóm tính trung bình — và tự hỏi khi nào trung bình 'nói dối'."

## 3. Giáo án in — mẫu Ban Toán 16 thành phần (P0→P40)

**KẾ HOẠCH DẠY HỌC** — Tiết luyện quy trình: học sinh tự gom một bảng 26 số liệu thành các mẫu số liệu ghép nhóm theo cách mình chọn, đối chiếu hai cách chia của hai nhóm, rồi chuẩn hoá khái niệm nhóm nửa khoảng và quy trình 4 bước (K–B–Đ–T). Trọng tâm là đưa quy trình thành kỹ năng có thể nhìn ra lỗi biên của người khác qua kiểm tra chéo. Tiết chạy trên bài học tương tác V8.8 (Presenter – Student – Coach); dạy không mạng theo phiếu dự phòng.

| Lớp | 11 | Tên bài học | Mẫu số liệu ghép nhóm — Tiết 1 |
|---|---|---|---|
| Môn học | Toán | Giáo viên | Vũ Việt Cường |
| Tuần học | 11 | Năm học | 2026–2027 |

**I. THÔNG TIN CHUNG** *(bảng 1×1)*

**1. Tiêu chuẩn năng lực cốt lõi**
- Xử lý được mẫu số liệu có kích thước lớn bằng cách ghép nhóm.
- Thực hiện được quy trình 4 bước chọn k — chốt biên — tính đại diện — lập bảng tần số.
- Phê phán được cách chia nhóm của người khác (kiểm tra chéo) và bảo vệ được cách của mình.
- Hợp tác nhóm: cùng gõ một bản; vai báo cáo thay phiên.
- Thái độ trung thực với số liệu; tôn trọng cách tổ chức dữ liệu của người khác.

**2. Mục tiêu học tập** *(bảng 1×1 + "Sau tiết học, tôi có thể:" + bảng 3×2 + Phân hóa)*
Sau tiết học, tôi có thể:

| Cơ bản | Trọng tâm | Nâng cao |
|---|---|---|
| Đọc được bảng tần số của mẫu ghép nhóm; nêu quy tắc nửa khoảng [a; a+L) | Chạy đủ quy trình K–B–Đ–T cho một mẫu thực tế; xử lý đúng nhóm cuối đóng hai đầu | Tìm cách chia thứ ba hợp lý hơn; giải thích việc chọn số nhóm k phục vụ người đọc báo cáo |

Phân hóa mục tiêu: HS yếu/TB đạt Cơ bản qua N1–N2 và phiếu nhóm; HS khá đạt Trọng tâm qua N3 + B07; HS giỏi mở rộng qua DEEP (cách chia thứ ba) và B09 (k cho mẫu 100 số).

**3. Tài liệu dạy học**
- SGK Kết nối tri thức Toán 11 – tập 1, bài về mẫu số liệu ghép nhóm (trang đối chiếu sau OCR scan).
- Bảng 26 điểm kiểm tra (phiếu in dự phòng); bài học tương tác V8.8 (`adaptive-1792831747929`) với mã phòng.
- Căn cứ điều chỉnh từ đánh giá tiết trước: một số HS có thể còn nhầm bảng thống kê tần số với bảng ghép nhóm — tiết này phân biệt ngay ở B01.

**MINH CHỨNG HQT / CIS** *(bảng 3 cột)*

| Minh chứng | HS làm gì → GV thu được gì → mục đích | Vị trí |
|---|---|---|
| `[🔴 PHÂN HÓA]` Bảng nhóm B02 | NH: chọn k + biên + tần số cho 26 số → GV: thấy ngay cách chia của từng nhóm → mục đích: cấp DEEP hoặc can thiệp đúng nhóm | P8–P14 |
| `[🟣 ĐGTX]` Nhận xét B03 | NH: so sánh hai bảng cạnh nhau bằng lời → GV: "dễ đọc" được HS nói ra, không phải máy → mục đích: chốt tiêu chí chọn k | P14–P17 |
| `[🔴 PHÂN HÓA]` Nhận xét chéo B07 | NH: chấm 3 tiêu chí + nhận xét chữ → GV: bằng chứng hiểu sâu hơn bài kiểm tra trắc nghiệm → mục đích: phân tuyến luyện Tiết 2 | P28–P32 |
| `[🔵 CÔNG DÂN SỐ]` Biểu quyết B09 | HS: chọn k cho mẫu 100 số → GV: thái độ "làm báo cáo vì người đọc" → mục đích: đạo đức trình bày dữ liệu | P36–P38 (reserve — bỏ nếu đội giờ) |
| `[🟢 CÔNG DÂN TOÀN CẦU]` — Không phải tiết trọng tâm | — | — |
| Ghi chú tuần: `[🔴]`/`[🟣]` còn lại của Tuần 11 đặt ở Tiết 2 (chữa bài, luyện tập mức 2) để đạt ≥3 minh chứng/tuần mỗi loại. | | |

**II. TIẾN TRÌNH HOẠT ĐỘNG** *(bảng 1×1)*

**3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH** *(bảng 1×1)*

**1. KHỞI ĐỘNG — Bảng 26 số làm người ta mệt — Thời lượng: 5 phút, P0–P2 ổn định lớp + B01 P2–P5**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P0–P2 | GV mở phòng; HS nhập mã + SBD; gán nhóm 2–4 HS (≤ 8 nhóm). | Mã phòng; danh nhóm thiếu. |
| P2–P5 | GV hỏi `[PHÁT HIỆN]` về cách tóm gọn 26 số; HS thăm dò; chốt dẫn vào ghép nhóm. `[🟣 ĐGTX]` | Bảng 26 số hiện trên Presenter; V3 đếm phương án. |

**2. XÁC ĐỊNH MỤC TIÊU — Thời lượng: 3 phút, P5–P8**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P5–P8 | GV nêu 3 mục tiêu; bấm giao nhiệm vụ nhóm. | "Tự chia — so — chuẩn hoá — chạy quy trình — chéo." |

**HĐ1 — Tự chia nhóm và chuẩn hoá — Thời lượng: 15 phút, P8–P23**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P8–P14 (B02) | Nhóm chọn k + biên, công bố tần số sống; GV theo Coach, hỏi nhóm có biên lẻ. `[🔴 PHÂN HÓA]` | Bảng 26 số tương tác trên máy nhóm. |
| P14–P17 (B03) | GV công bố hai bảng; câu `[SO SÁNH]` "bảng nào dễ đọc hơn?"; chốt k 5–10 tham khảo. `[🟣 ĐGTX]` | Hai bảng cạnh nhau, ẩn danh tới khi bật tên. |
| P17–P21 (B04) | Reveal theo phần nhóm [a; a+L), giá trị đại diện; `[KHÁI QUÁT]` "vì sao nửa khoảng?"; quick-fill biên. | Tô màu biên; điểm số trôi khi kéo biên (invariant). |
| P21–P23 (B05) | Lớp sắp 4 thẻ K–B–Đ–T; reveal thứ tự đúng + câu nhớ. | 4 thẻ lộn xộn trên Presenter + chọn thứ tự trên máy. |

**HĐ2 — Luyện từng bước và kiểm tra chéo — Thời lượng: 9 phút, P23–P32**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P23–P28 (B06) | HS cá nhân N1–N3 (đọc bảng → lập biên → đủ K–B–Đ–T), hint 1→3; xong sớm làm nhiệm vụ khó. `[🔴 PHÂN HÓA]` | Ba nhiệm vụ rời trên máy; offline: phiếu + ảnh. |
| P28–P32 (B07) | Hai nhóm chéo bản ẩn danh: 3 tiêu chí + nhận xét chữ bắt buộc; câu `[PHẢN BIỆN]` bảo vệ cách chọn biên. | Bản nhóm B nhận nhóm A; nhận xét về tới máy nhóm A. |

**4. KIỂM TRA NHANH — MỞ RỘNG — Thời lượng: 6 phút, P32–P38**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P32–P36 (B08) | Exit 3 câu (checkpoint riêng, không cộng điểm lần 2); GV theo dõi hoàn thành, không xếp hạng. | 3 câu chọn/diền; kết quả chỉ GV thấy. |
| P36–P38 (B09, reserve) | Biểu quyết k cho mẫu 100 số; `[SÁNG TẠO]` "em chọn k thế nào vì sao"; `[🔵 CÔNG DÂN SỐ]` chốt "vì người đọc". Nếu đội giờ: bỏ, hoãn đầu tiết sau. | Ba phương án k + reveal ý kiến lớp. |

**5. SƠ KẾT — Thời lượng: 2 phút, P38–P40**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P38–P40 | GV chốt K–B–Đ–T + quy tắc biên; phiếu thoát; rút kinh nghiệm GV (máy GV). | Ba chốt + hẹn Tiết 2 (trung bình số liệu ghép nhóm). |

**6. BTVN**

| Nhóm HS | Bài tập |
|---|---|
| HS yếu/TB | Hoàn thành N1–N2 tương tự trên một mẫu 3 nhóm; học thuộc "K–B–Đ–T" + quy tắc biên. |
| HS khá | Chạy đủ 4 bước cho bảng 5 nhóm trong SGK; ghi rõ bước nào quyết định tần số nào. |
| HS giỏi | Cùng một mẫu, lập hai bảng với k khác nhau; viết 5 dòng so sánh ưu nhược điểm (chuẩn bị cho B09 tiết sau). |
| Toàn lớp | Hoàn thành practiceSet đã gắn bài học trong app; xem lại nhận xét chéo của nhóm bạn. |

## 4. Kiểm nhanh trước khi nộp (tự đối chiếu mẫu)

1. 16 thành phần đủ, đúng thứ tự ✔ (giàn lại đúng dạng bảng khi xuất DOCX).
2. Dải P: 0–2–5–8–14–17–21–23–28–32–36–38–40 → phủ kín, không hở, không trùng ✔.
3. Không phần trăm HS bịa ✔.
4. Nhãn CIS đầu dòng: [🔴]×3, [🟣]×2 (kể XĐMT), [🔵]×1; [🟢] "Không phải tiết trọng tâm" ✔ (phần còn lại của tuần ở Tiết 2).
5. Không lấn nội dung Tiết 2 (số đặc trưng của mẫu ghép nhóm) ✔; công thức OMML khi xuất DOCX (Cambria Math).

## 5. Việc treo (không chặn Gate C, chặn đối chiếu)

- Body giáo án Ban Toán nguyên bài ở Thư viện (cần tab app phiên GV) — đối chiếu câu chữ và số liệu bảng 26 số.
- Trang SGK KNTT Toán 11 cụ thể (scan chưa OCR) — đối chiếu số trang + bài tập BTVN.
