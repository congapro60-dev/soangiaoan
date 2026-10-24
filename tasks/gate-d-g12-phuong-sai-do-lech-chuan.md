# GATE D · Khối 12 — Phương sai và độ lệch chuẩn (Tiết 1) · V8.8

> `adaptive-1792834706906` · Archetype `MIXED` (formation công thức + practice quy trình) · 40'
> Chuẩn chung: `tasks/gate-d-3-bai-tuan11.md`. Gate P: `tasks/gate-p-3-bai-tuan11.md` PHẦN 3.
> Nguồn đã đối chiếu nguyên văn: **SGK KNTT Toán 12 – tập 1, Bài 2 "Phương sai và độ lệch chuẩn", mở đầu trang 80** (bản WORD: máy đo độ ẩm 20 lần, s > 0,15 → đưa đi sửa; ví dụ cân nặng nam/nữ; công thức định nghĩa + rút gọn; ý nghĩa đo mức độ phân tán). Giáo án Ban Toán body chờ tải từ Thư viện.

## 0. Đối chiếu ngân sách Gate P → Gate D (trung thực)

- Gate P tính core hoạt động = 34' (C05 4', C06 6', C08 2'). Ghép dải P cứng: HĐ2 (P24–P32) chỉ 8', KTNH (P32–P38) đúng 6'.
- **Gate D chốt:** C05 3', C06 5', C08 3' → **core hoạt động = 33'** + 7' cấu trúc (ổn định 2' + XĐMT 3' + sơ kết 2') = 40'. Reserve 6' nguyên vẹn = buffer đôn đốc + fast-path (không có hoạt động riêng trong reserve). Protected: C04, C05, C06.

## 1. Storyboard theo dải P

### P0–P2 · Ổn định lớp + mã phòng
- V1: "Phương sai và độ lệch chuẩn — Toán 12 · Tuần 11 · Tiết 1" + mã phòng. Student nhập → nhóm N[x] (3 HS, ≤ 8 nhóm; nhóm lẻ được).
- **Copy chốt:** "Hai con số có thể có 'trung bình' giống nhau mà nói hai câu chuyện khác nhau — hôm nay đọc được câu chuyện thứ hai."

### P2–P5 · C01 KHỞI ĐỘNG — "Lớp nào đều hơn?" (3')
- V2: hai biểu đồ lệch chồng lên nhau (điểm 2 lớp, cùng số trung bình 6,5). Câu `[PHÁT HIỆN]`: "Hai lớp cùng trung bình 6,5. Nhìn bằng mắt: lớp nào 'đều' hơn?"
- Student: thăm dò nhanh 1/2 (Lớp A / Lớp B) — V3 đếm, không chấm.
- V4: "Mắt mặt được phần nào, chưa đủ để khẳng định. Cần một con số đo mức độ TẢN — đó là phương sai."
- **Copy chốt chuyển:** "Trung bình nói câu chuyện thứ nhất; hôm nay ta học đọc câu chuyện thứ hai."
- `[🟣 ĐGTX]` (vị trí XĐMT): thăm dò C01 → GV chọn nhịp HĐ1. Offline: hai biểu đồ in.

### P5–P8 · XÁC ĐỊNH MỤC TIÊU (3')
- V2: "Sau tiết học, tôi có thể: (1) giải thích vì sao cần bình phương sai lệch; (2) lập bảng trung gian và tính phương sai, độ lệch chuẩn; (3) tính đúng bằng cả hai công thức và khớp kết quả." Student: thẻ NGHE GV.
- **Copy chốt:** "Tiêu chí 'xong': hai con số từ hai công thức phải khớp nhau."

### P8–P16 · C02 — "Đo độ tản bằng 2 cách" (8', nhóm 3)
- Handoff → "Giao task về máy"; Student: LÀM TRÊN MÁY. **Copy:** "Nhóm mình tính độ tản của hai lớp bằng 2 cách khác nhau — bấm GỬI khi xong."
- V2/Student: dữ liệu 2 mẫu nhỏ (5 số/lớp, đúng tinh thần SGK: cùng trung bình); hai cột hướng dẫn song song: Cách 1 "tổng sai lệch có dấu ÷ n" · Cách 2 "tổng trị tuyệt đối sai lệch ÷ n"; ô nhập kết quả từng cách.
- Làm lộ cách nghĩ: Cách 1 cho 0 ở cả hai lớp (sai lệch cộng lại triệt tiêu) → HS tự thấy thất bại của cách 1; Cách 2 cho khác biệt nhưng bất tiện (khi lấy đạo hàm/khai căn khó).
- Coach: kết quả từng cách; `[🔴 PHÂN HÓA]` nhóm sớm/đúng → DEEP "tìm cách thứ 3" (bình phương). Hypothesis: "quên chia n" — mẹo kiểm: "kết quả của em có đơn vị gì?". Fast-path: DEEP ngay. Offline: phiếu + ảnh.
- **Copy chốt thu:** "Cách 1 chết vì phép cộng triệt tiêu dấu. Vậy cứu nó bằng cách nào?"

### P16–P20 · C03 — "Vì sao phải bình phương?" (4')
- V2: trục sai lệch có dấu +/− (mỗi điểm HS là một mũi tên quanh 6,5); câu `[SUY LUẬN]`: "Cộng thẳng thì dấu triệt tiêu. Bình phương sửa điều đó thế nào — và có cách khác không?"
- Student: chọn 1/2 (Bình phương / Trị tuyệt đối) + nêu 1 dòng lý do (không bắt buộc).
- V4 thu gọn: "Cả hai đều được, nhưng bình phương giữ đạo hàm tính được → hình thành công thức đẹp; SGK chọn sản phẩm bình phương → phương sai s², rồi độ lệch chuẩn s là căn."
- `[🟣 ĐGTX]` lý do của HS được dẫn vào chốt (không phải "thầy nói các em phải bình phương").
- **Copy chốt:** "Bình phương là lựa chọn có lý do — không phải bùa phép."

### P20–P24 · C04 — Chốt công thức định nghĩa (4')
- V2 reveal **theo từng phần** sau khi lớp điền chỗ trống:
  1. s² = (1/n) Σ n_i (x_i − x̄)² — hiện từng mảnh: kí hiệu n_i & x_i & x̄ (Student quick-fill: "x̄ là gì?" chọn);
  2. s = căn của s² (độ lệch chuẩn);
  3. Ý nghĩa (nguyên văn tinh thần SGK tr.80): s², s là các xấp xỉ cho phương sai, độ lệch chuẩn của mẫu gốc; càng lớn càng phân tán.
- Câu `[KHÁI QUÁT]`: "Vì sao lấy căn lần nữa ra s chứ không dừng ở s²?"
- V4: "s² có 'đơn vị bình phương' (điểm²) — lấy căn để về cùng đơn vị với dữ liệu, so sánh trực tiếp được."
- no-spoiler: công thức chỉ hiện sau khi lớp trả lời câu dẫn về bình phương (C03).
- **Copy chốt:** "s² đo tản — s nói cùng ngôn ngữ với dữ liệu."

### P24–P27 · C05 — Hai đường một đích: công thức rút gọn (3')
- V2: hai công thức cạnh nhau (định nghĩa ↔ rút gọn s² = (1/n) Σ n_i x_i² − x̄²); câu `[SO SÁNH]`: "Hai công thức này tương đương hay khác nhau — khi nào chọn cái nào?"
- Nấc 1 (mẹo): "Mở ngoặc (x_i − x̄)² là thấy từ đâu ra x̄²." Nấc 2 (sớm-xong): tự chứng hai dòng trên máy nháp.
- Coach: câu trả lời của HS + ai chứng được. `[🔴 PHÂN HÓA]` ai chọn nấc 2.
- **Copy chốt:** "Định nghĩa để hiểu, rút gọn để tính nhanh — một đích hai đường."

### P27–P32 · C06 — Luyện bảng trung gian (5', cá nhân) — protected
- Handoff: "Giờ từng em tính — bảng 5 cột hiện dần theo từng câu." Student: LÀM TRÊN MÁY.
  - Điền cột 1–2: n_i·x_i cho bảng 3 nhóm (đã ghép sẵn);
  - Điền cột 3–4: n_i·x_i²;
  - Tính x̄ rồi s² (bằng công thức rút gọn);
  - Kiểm chéo nhanh: tính lại bằng định nghĩa — hai kết quả có khớp (chọn Khớp/Không theo con số của em).- Hint 1→3; xong sớm → câu khó (thêm 1 nhóm vào bảng, s² thay đổi thế nào). Coach: cột nào sai nhiều nhất; hypothesis "quên nhân n_i trọng số" — mẹo kiểm: "nếu bỏ cột n_i, kết quả của em lệch về đâu?". Offline: phiếu bảng trống + ảnh.
- **Copy chốt:** "Bảng trung gian là đường an toàn — từng cột một, không nhảy cóc."

### P32–P35 · C07 — Kiểm tra chéo cặp (3') — chuẩn chung
- Note (khác Gate P phrase): Gate P ghi "cặp đôi"; chuẩn chung khóa nhóm 2–4 HS ≤ 8 nhóm — **chốt Gate D: đơn vị gửi bài = nhóm; việc chéo làm theo cặp kết nghĩa giữa 2 nhóm (bản ẩn danh).**
- Student: nhận bảng ẩn danh "Nhóm 3"; chấm: đúng cột n_i x_i² · đúng x̄ · khớp 2 đường + 1 nhận xét chữ bắt buộc; gửi về — nhóm được chấm thấy: "Nhóm 3 nhận xét: …".
- Câu `[PHẢN BIỆN]`: "Nếu hai kết quả không khớp — ai sai: bảng bạn hay công thức bạn chọn?"
- Coach: nhận xét đã gửi/về; `[🔴 PHÂN HÓA]` chất lượng nhận xét. **Copy chốt:** "Không khớp không đáng sợ — đáng sợ là không tra ra chỗ nào lệch."

### P35–P38 · C08 — KIỂM TRA NHANH: exit 3 câu (3')
- Checkpoint riêng `dewey-ckpt-v1-{lessonId}-{mãHS}` — không cộng điểm lần 2. 1 câu/thẻ: (1) chọn công thức dùng khi nào; (2) tính s² cho bảng 2 nhóm; (3) `[KHÁI QUÁT]` đọc kết quả "lớp nào tản hơn" kèm con số.
- **Copy:** "3 câu cuối — nếu hai đường khớp, em đã xong."

### P36–P38 phần MỞ RỘNG (nếu dư — từ reserve 6')
- Gắn vào SGK tr.80 nguyên văn: máy đo độ ẩm đo 20 lần → nếu s > 0,15 đưa đi sửa. Câu `[SÁNG TẠO]`: "Em là kỹ thuật viên: kết quả s của em — sửa hay không? Trình bày 1 dòng."
- `[🔵 CÔNG DÂN SỐ]` + `[🟢 CÔNG DÂN TOÀN CẦU]`: thiết bị đo dùng chung phục vụ nhiều người — ngưỡng ra quyết định phải từ số liệu, không cảm tính.
- Điều kiện quay về: nếu C06/C07 đội giờ → bỏ, hoãn đầu tiết sau; reserve 6' cũng dùng đôn đốc.

### P38–P40 · SƠ KẾT (2')
- V2: 3 dòng chốt (bình phương vì dấu · hai đường một đích · s về cùng đơn vị); Student: phiếu thoát (icon + câu lấn cấn); GV ghi rút kinh nghiệm (máy GV).
- **Copy chốt:** "Hẹn tiết sau: suy ra khoảng đáng tin của trung bình — máy đo 'ổn định' nghĩa là s nhỏ."

## 2. Giáo án in — mẫu Ban Toán 16 thành phần (P0→P40)

**KẾ HOẠCH DẠY HỌC** — Tiết hình thành công thức phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm: xuất phát từ hai mẫu cùng trung bình nhưng khác độ phân tán, học sinh thử đo độ tản bằng hai cách, tự thấy thất bại của cách cộng sai lệch có dấu, từ đó cần bình phương; chuẩn hoá công thức định nghĩa rồi đối chiếu công thức rút gọn (hai đường — một đích); luyện bảng trung gian và kiểm tra chéo; gắn tình huống máy đo độ ẩm SGK tr.80 để ra quyết định từ số liệu. Tiết chạy trên bài học tương tác V8.8 (Presenter – Student – Coach); dạy không mạng theo phiếu dự phòng.

| Lớp | 12 | Tên bài học | Phương sai và độ lệch chuẩn — Tiết 1 |
|---|---|---|---|
| Môn học | Toán | Giáo viên | Vũ Việt Cường |
| Tuần học | 11 | Năm học | 2026–2027 |

**I. THÔNG TIN CHUNG** *(bảng 1×1)*

**1. Tiêu chuẩn năng lực cốt lõi**
- Nhận biết được hạn chế của các số đặc trưng xu thế trung tâm khi hai mẫu cùng trung bình.
- Thiết lập và sử dụng được công thức phương sai s², độ lệch chuẩn s của mẫu số liệu ghép nhóm (cả định nghĩa lẫn rút gọn).
- Lập được bảng trung gian; kiểm tra chéo kết quả bằng hai đường tính.
- Ra quyết định dựa trên ngưỡng số liệu (tình huống máy đo — SGK tr.80).
- Hợp tác nhóm và trung thực khi kết quả hai đường không khớp.

**2. Mục tiêu học tập** *(bảng 1×1 + "Sau tiết học, tôi có thể:" + bảng 3×2 + Phân hóa)*
Sau tiết học, tôi có thể:

| Cơ bản | Trọng tâm | Nâng cao |
|---|---|---|
| Nêu ý nghĩa của s², s: đo mức độ phân tán, càng lớn càng tản | Lập bảng trung gian 5 cột và tính đúng x̄, s² bằng công thức rút gọn; kiểm lại bằng định nghĩa | Chứng minh hai công thức tương đương; dùng ngưỡng s > 0,15 (SGK tr.80) để kết luận đưa máy đi sửa |

Phân hóa mục tiêu: HS yếu/TB đạt Cơ bản qua C04 + bảng trung gian có khung; HS khá đạt Trọng tâm qua C06 kiểm chéo hai đường; HS giỏi mở rộng qua nấc 2 của C05 (chứng minh) và tình huống máy đo.

**3. Tài liệu dạy học**
- SGK Kết nối tri thức Toán 12 – tập 1, Bài 2 "Phương sai và độ lệch chuẩn", tr. 80 (mở đầu: máy đo độ ẩm 20 lần, ngưỡng 0,15).
- Bài học tương tác V8.8 (`adaptive-1792834706906`): mã phòng; phiếu bảng trung gian (dự phòng).
- Căn cứ điều chỉnh từ đánh giá tiết trước: một số HS có thể còn tính trung bình ghép nhóm mà quên nhân tần số n_i — C06 có góc kiểm "bỏ cột n_i thì lệch về đâu".

**MINH CHỨNG HQT / CIS** *(bảng 3 cột)*

| Minh chứng | HS làm gì → GV thu được gì → mục đích | Vị trí |
|---|---|---|
| `[🔴 PHÂN HÓA]` Kết quả 2 cách C02 | NH: tính độ tản theo 2 cách → GV: thấy nhóm nào còn chia quên n, nhóm nào phát hiện triệt tiêu dấu → mục đích: can thiệp đúng chỗ, cấp DEEP | P8–P16 |
| `[🟣 ĐGTX]` Lý do bình phương C03 | HS: chọn và nêu lý do → GV: "vì sao bình phương" thành lời của HS, không phải phán của GV → mục đích: ý nghĩa trước ký hiệu | P16–P20 |
| `[🔴 PHÂN HÓA]` Bảng trung gian C06 | HS: điền từng cột, đối chiếu 2 đường → GV: cột lỗi nhiều nhất, ai khớp 2 đường → mục đích: phân tuyến luyện Tiết 2 | P27–P32 |
| `[🔵 CÔNG DÂN SỐ]` `[🟢 CÔNG DÂN TOÀN CẦU]` Quyết định máy đo (MỞ RỘNG, reserve) | HS: chọn sửa/không và nêu 1 dòng căn cứ → GV: thái độ quyết định từ số liệu vs cảm tính → mục đích: dùng toán phục vụ cộng đồng (thiết bị dùng chung) | P36–P38 |
| Ghi chú tuần: `[🔴]`/`[🟣]` còn lại của Tuần 11 đặt ở Tiết 2 (luyện tập mức 2) để đạt ≥3 minh chứng/tuần mỗi loại. | | |

**II. TIẾN TRÌNH HOẠT ĐỘNG** *(bảng 1×1)*

**3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH** *(bảng 1×1)*

**1. KHỞI ĐỘNG — Lớp nào đều hơn? — Thời lượng: 5 phút, P0–P2 ổn định lớp + C01 P2–P5**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P0–P2 | GV mở phòng; HS nhập mã + SBD; gán nhóm 3 HS (≤ 8 nhóm). | Mã phòng; danh nhóm thiếu. |
| P2–P5 | GV hỏi `[PHÁT HIỆN]` "cùng trung bình 6,5 — lớp nào đều hơn?"; HS thăm dò; chốt: cần con số đo độ tản. `[🟣 ĐGTX]` | Hai biểu đồ lệch chồng nhau; V3 đếm phương án. |

**2. XÁC ĐỊNH MỤC TIÊU — Thời lượng: 3 phút, P5–P8**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P5–P8 | GV nêu 3 mục tiêu; bấm giao nhiệm vụ nhóm. | "Thử đo tản — bình phương — hai đường một đích — bảng trung gian." |

**HĐ1 — Làm lộ cách nghĩ và chuẩn hoá — Thời lượng: 16 phút, P8–P24**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P8–P16 (C02) | Nhóm tính độ tản 2 cách; tự thấy cách cộng có dấu cho 0; GV hỏi nhanh nhóm quên chia n. `[🔴 PHÂN HÓA]` | Hai cột hướng dẫn song song trên máy nhóm. |
| P16–P20 (C03) | `[SUY LUẬN]` "cứu nó bằng cách nào?"; HS chọn + lý do; chốt: bình phương giữ đường tính. `[🟣 ĐGTX]` | Trục sai lệch ± quanh 6,5; mũi tên từng điểm. |
| P20–P24 (C04) | Reveal theo phần s² và s; `[KHÁI QUÁT]` "vì sao lấy căn thêm lần nữa"; ý nghĩa nguyên văn SGK tr.80 (xấp xỉ mẫu gốc, càng lớn càng tản). | Công thức hiện mảnh theo câu trả lời; không spoiler. |

**HĐ2 — Hai đường một đích và luyện bảng trung gian — Thời lượng: 8 phút, P24–P32**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P24–P27 (C05) | `[SO SÁNH]` định nghĩa vs rút gọn; nấc 1 mẹo mở ngoặc, nấc 2 tự chứng; chốt "định nghĩa để hiểu, rút gọn để nhanh". | Hai công thức cạnh nhau; reveal phần không khớp. |
| P27–P32 (C06) | HS cá nhân điền bảng 5 cột rồi x̄, s²; kiểm lại bằng định nghĩa (khớp hay không); hint 1→3. `[🔴 PHÂN HÓA]` | Bảng trống giãn theo bước; cột n_i·x_i² gạch sẵn. |

**4. KIỂM TRA NHANH — MỞ RỘNG — Thời lượng: 6 phút, P32–P38**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P32–P35 (C07) | Chéo cặp kết nghĩa giữa hai nhóm: chấm bảng ẩn danh 3 tiêu chí + nhận xét chữ; câu `[PHẢN BIỆN]` "không khớp — ai sai?". | Bảng nhóm bạn; nhận xét về tới máy nhóm được chấm. |
| P35–P38 (C08 + MỞ RỘNG nếu dư) | Exit 3 câu (checkpoint riêng, không cộng điểm lần 2). Nếu dư reserve: tình huống máy đo SGK tr.80 — `[SÁNG TẠO]` sửa hay không theo s > 0,15; `[🔵 CÔNG DÂN SỐ]` `[🟢 CÔNG DÂN TOÀN CẦU]`. | 3 câu chọn/diền; tình huống máy đo kèm ngưỡng 0,15. |

**5. SƠ KẾT — Thời lượng: 2 phút, P38–P40**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P38–P40 | GV chốt 3 dòng; phiếu thoát; rút kinh nghiệm GV (máy GV). | Bình phương · hai đường một đích · s về cùng đơn vị dữ liệu. |

**6. BTVN**

| Nhóm HS | Bài tập |
|---|---|
| HS yếu/TB | Điền nốt bảng trung gian 3 nhóm (khung sẵn) + tính s², s; học thuộc ý nghĩa s², s. |
| HS khá | Tính s² bằng cả hai công thức cho một bảng 4 nhóm; ghi 2 dòng so sánh độ tiện. |
| HS giỏi | Giải quyết tình huống máy đo SGK tr.80 (s > 0,15 → sửa hay không? trình bày căn cứ); chứng minh s² ≥ 0 và đẳng thức hai công thức. |
| Toàn lớp | Hoàn thành practiceSet đã gắn bài học trong app; nộp phiếu "còn lấn cấn" nếu có. |

## 3. Kiểm nhanh trước khi nộp (tự đối chiếu mẫu)

1. 16 thành phần đủ, đúng thứ tự ✔ (giàn lại đúng dạng bảng khi xuất DOCX).
2. Dải P: 0–2–5–8–16–20–24–27–32–35–38–40 → phủ kín, không hở, không trùng ✔.
3. Không phần trăm HS bịa ✔.
4. Nhãn CIS đầu dòng: [🔴]×3, [🟣]×2 (kể XĐMT), [🔵]+[🟢]×1 (cùng vị trí MỞ RỘNG, đúng 1 vị trí thật) ✔ — đủ "2–3 tiết mỗi tuần" ở mức tiết này là 1 tiết trọng tâm công dân.
5. Không lấn nội dung Tiết 2 (luyện tập) — tình huống máy đo chỉ mở và dành BTVN HS giỏi ✔; công thức khi xuất DOCX dùng OMML (Cambria Math), không để LaTeX thô.

## 4. Việc treo (không chặn Gate C, chặn đối chiếu)

- Body giáo án Ban Toán nguyên bài ở Thư viện (cần tab app phiên GV) — đối chiếu số liệu bảng của giáo án gốc.
- Đã đối chiếu SGK nguyên văn tr.80 ✔ (tình huống máy đo + ví dụ cân nặng nam/nữ); số trang BTVN cụ thể chốt khi ghép bài tập SGK vào Tiết 2.
