# GATE D · Khối 10 — Số gần đúng và sai số (Tiết 1) · V8.8

> `adaptive-1792827090625` · Archetype `KNOWLEDGE_FORMATION` · 40' (core 33' hoạt động + 7' cấu trúc) · reserve 6'
> Chuẩn chung: `tasks/gate-d-3-bai-tuan11.md`. Gate P: `tasks/gate-p-3-bai-tuan11.md` PHẦN 1.
> Nguồn: SGK KNTT Toán 10, bài "Số gần đúng và sai số" (tập/trang đối chiếu sau OCR — PDF scan); giáo án Ban Toán đã sinh, body chờ tải từ Thư viện.

## 0. Đối chiếu ngân sách Gate P → Gate D (trung thực)

- Gate P tính core hoạt động = 34' (A05 4', A06 6'). Ghép vào dải P cứng của mẫu Ban Toán thì HĐ2 (P24–P32) chỉ có 8'.
- **Gate D chốt:** A05 3', A06 5' (hoạt động core = 33'); 2' nhường cho "ổn định lớp + mã phòng" (P0–P2) và sơ kết trọn P38–P40. A07 4' (dải KTNH 6' = A07 4' + A08 2'). Không cắt A06 dưới 5' (protected).
- Reserve 6' = buffer đôn đốc + fast-path DEEP; không có hoạt động riêng nào nằm trong reserve.

## 1. Storyboard theo dải P

### P0–P2 · Ổn định lớp + mã phòng
- Presenter V1: "Số gần đúng và sai số — Toán 10 · Tuần 11 · Tiết 1" + mã phòng. V4: cue đọc danh nhóm chưa vào — "Có nhóm nào chưa đủ người?."
- Student: nhập mã phòng + SBD → gán **nhóm N[x]** (2–4 HS, ≤ 8 nhóm); màn thu thành thẻ "NGHE GV".
- Coach: danh sách nhóm, toàn UNKNOWN (chưa gửi dữ liệu nào — không suy năng lực).

### P2–P5 · A01 KHỞI ĐỘNG — "Con số nào là đúng?" (3')
- V2: ảnh cái bàn + thước dây. Câu hỏi `[PHÁT HIỆN]`: "Thầy đo bàn này được 1,20 m. Con số 1,20 m là ĐÚNG hay chỉ GẦN ĐÚNG? Vì sao?"
- Student: trả lời nhanh 1/3 (Đúng / Gần đúng / Cần đo lại) — thăm dò, không chấm, không hiện đúng/sai.
- V3: số HS chọn mỗi phương án (ẩn danh).
- V4 cue: "Chỉ GẦN ĐÚNG — không thước nào đo ĐÚNG tuyệt đối. Dẫn sang độ chia của thước."
- **Copy chốt chuyển:** "Mọi phép đo đều có sai khác — hôm nay ta đo lường được chính sai khác đó."
- Offline: bỏ biểu quyết, giơ tay đếm.

### P5–P8 · XÁC ĐỊNH MỤC TIÊU (3')
- V2: "Sau tiết học, tôi có thể: (1) phân biệt số đúng / số gần đúng; (2) tính sai số tuyệt đối d và nêu khoảng chứa giá trị đúng; (3) cảnh giác lỗi làm tròn tích luỹ." Student: thẻ NGHE GV.
- `[🟣 ĐGTX]` (vị trí XĐMT): kết quả thăm dò A01 → GV chọn nhịp HĐ1 (nhanh/chậm).
- **Copy chốt:** "Nhiệm vụ: mỗi nhóm đo 4 vật, ghi cả số đọc và độ chia — rồi cả lớp chốt cách ghi số gần đúng."

### P8–P16 · A02 — Đo 4 vật, ghi số đọc + độ chia (8', nhóm)
- Handoff → "Giao task về máy"; Student: "LÀM TRÊN MÁY". **Copy:** "Mỗi nhóm lấy thước, đo 4 vật trên phiếu — bấm GỬI khi xong."
- V2/Student: 4 thẻ vật (chiều dài quyển vở Toán · bề rộng cánh cửa · đường kính đồng xu 5000đ · chiều dài bút chì), mỗi thẻ 3 ô: **số đọc / độ chia d / đơn vị**.
- nonNegotiable: phải ghi đủ độ chia + đơn vị; vai nhóm tự phân (đo · ghi · chỉ huy · báo cáo); 1 HS gửi thay nhóm kèm chọn tên báo cáo viên.
- Coach: đã gửi chưa, ô trống nào. `[🔴 PHÂN HÓA]` nhóm gửi sớm đủ 4/4 kèm độ chia → nhận câu DEEP "so 2 phép đo cùng vật, khác thước". Hypothesis: "chưa tách số đọc và độ chia" — mẹo kiểm: "số đọc trên thước trước khi làm tròn là bao nhiêu?".
- Fast-path: DEEP ngay, không chờ lớp. Offline: phiếu giấy in sẵn, có mạng chụp gửi.
- **Copy chốt thu bài:** "Số đọc trên thước là số gần đúng; độ chia cho biết con số tin được tới đâu."

### P16–P20 · A03 — Công bố + kiểm tra chéo (4')
- Handoff → "Công bố"; Student về NGHE GV, nháp giữ nguyên. V3: bảng 4 vật × số đọc các nhóm (tên nhóm chỉ hiện khi GV bật).
- Câu `[SO SÁNH]`: "Cùng đo quyển vở — nhóm này ghi 29,0 cm, nhóm kia 29,00 cm. Khác nhau ở chỗ nào? Cách nào tin hơn?"
- V4 đáp án thu gọn: "29,0 cm — tin tới mm (d = 1 mm); 29,00 cm — tin tới 0,1 mm (d = 0,1 mm). Số 0 cuối KHÔNG thừa."
- `[🟣 ĐGTX]` nhận xét của HS trên V3 được GV dẫn thẳng vào chốt. `[🔴 PHÂN HÓA]` GV đánh dấu nhóm phát hiện sai cách ghi (chỉ trên máy GV).
- **Copy chốt:** "Cách ghi số nói lên độ tin cậy của phép đo — ghi bao nhiêu chữ số là một quyết định."

### P20–P24 · A04 — Chuẩn hoá: định nghĩa + khoảng (4')
- V2 reveal **theo phần** (chỉ hiện sau khi lớp trả lời chỗ trống):
  1. a là số gần đúng của ā với sai số tuyệt đối d khi |a − ā| ≤ d. Student quick-fill: "ký hiệu sai số tuyệt đối là việc chọn d = …" (chọn: độ chia máy đo / độ dài vật / tuổi HS).
  2. Khoảng chứa giá trị đúng: ā ∈ [a − d; a + d] — con trỏ chạy trên trục khi đổi d (dynamic); invariant hiển thị: giá trị đúng luôn nằm trong khoảng.
- Câu `[KHÁI QUÁT]`: "Vì sao ghi một khoảng [a−d; a+d] thay vì một con số?"
- V4: "Vì không biết chính xác chỗ nằm — chỉ biết chắc nó trong khoảng. Thước chia càng nhỏ, d càng bé, khoảng càng hẹp."
- no-spoiler: ANSWER_KEY trong closure, không có trong DOM trước Reveal (đúng luật fix P0).
- **Copy chốt:** "Số gần đúng luôn đi kèm sai số — thiếu d, con số 'nói dối'."

### P24–P27 · A05 — Ví dụ mẫu (3')
- V2: đo chiều dài lớp được a = 8,24 m, thước chia tới cm. Bước trung gian Student nhập: "d = …?" (Nấc 1 mẹo: "d = độ chia thước"; Nấc 2 sớm-xong: nhập luôn khoảng [8,23; 8,25]).
- Reveal bảng tính từng bước sau bước trung gian. `[🔴 PHÂN HÓA]`: ai làm nấc 2 (chỉ Coach thấy).
- **Copy chốt:** "Mỗi lần đo: tìm a → tìm d → viết khoảng."

### P27–P32 · A06 — Luyện có hướng dẫn (5', cá nhân)
- Handoff: "Giờ đến lượt em tự làm — 3 câu, có hint." Student: LÀM TRÊN MÁY.
  - C1 `[PHÁT HIỆN]`: bút chì đo được 17,8 cm, thước chia 0,1 cm — d = ? (0,1 cm / 1 cm / 0,01 m).
  - C2: viết khoảng chứa giá trị đúng (input định dạng sẵn).
  - C3 `[SO SÁNH]`: An ghi 6,1 m, Bình ghi 6,12 m cùng căn phòng — ai dùng thước chia nhỏ hơn?
- Hint 1→3 mở dần; xong sớm → EXPLORE "1,005 × 1000 trên bảng tính để ra gì?". Coach: 3 câu lưu; `[🔴 PHÂN HÓA]` đúng ≥ 2/3; hypothesis quên đơn vị → kiểm "đơn vị của d là gì?".
- Offline: 3 câu in trên phiếu, gửi ảnh.
- **Copy chốt:** "Ba bước quen: d → khoảng → so độ tin."

### P32–P36 · A07 — KIỂM TRA NHANH: exit 3 câu (4')
- Checkpoint riêng `dewey-ckpt-v1-{lessonId}-{mãHS}` — **không cộng điểm lần 2** (luật fix P0). 1 câu/thẻ, không hiện điểm ngay.
- **Copy:** "3 câu cuối — chọn, gửi, xong nghỉ tay."

### P36–P38 · A08 — MỞ RỘNG: lỗi làm tròn (2') `[🔵 CÔNG DÂN SỐ]`
- V2: 1,005 × 1000 = ? — biểu quyết 2 phương án (1005 / 1004,999…); reveal sau: máy tính hiện 1004,99999… Câu `[PHẢN BIỆN]`: "Máy tính sai à — hay ai sai?"
- V4: "làm tròn nhiều bước → sai số tích luỹ; bảng tính tiền/kho phải quy định làm tròn ở bước cuối."
- **Copy chốt:** "Làm tròn là quyết định của người dùng máy — không phải của máy."

### P38–P40 · SƠ KẾT (2')
- V2: 3 dòng chốt; Student: phiếu thoát (1 icon cảm nhận + 1 câu "điều còn lấn cấn" — không bắt buộc). GV ghi mục "Rút kinh nghiệm" vào máy GV (không công khai).
- **Copy chốt:** "Hẹn tiết sau: biến đổi số gần đúng — sai số đi theo đường nào?"

## 2. Giáo án in — mẫu Ban Toán 16 thành phần (P0→P40)

**KẾ HOẠCH DẠY HỌC** — Tiết học hình thành khái niệm số gần đúng và sai số tuyệt đối thông qua hoạt động đo lường thật: học sinh đo 4 vật bằng thước sẵn có, phát hiện hai cách ghi 29,0 cm và 29,00 cm khác nhau về độ tin cậy, từ đó cần có khái niệm sai số tuyệt đối d và khoảng chứa giá trị đúng. Tiết chạy trên bài học tương tác V8.8 (Presenter – Student – Coach); dạy không mạng theo phiếu dự phòng.

| Lớp | 10 | Tên bài học | Số gần đúng và sai số — Tiết 1 |
|---|---|---|---|
| Môn học | Toán | Giáo viên | Vũ Việt Cường |
| Tuần học | 11 | Năm học | 2026–2027 |

**I. THÔNG TIN CHUNG** *(bảng 1×1)*

**1. Tiêu chuẩn năng lực cốt lõi**
- Sử dụng được công cụ đo thông thường; thu được số gần đúng kèm độ chia của dụng cụ.
- Ước lượng được kết quả đo trước khi đo; đánh giá được độ tin cậy của kết quả.
- Tính toán với số gần đúng; nhận biết được hậu quả của việc làm tròn nhiều bước.
- Hợp tác nhóm: phân vai đo — ghi — chỉ huy — báo cáo; trình bày kết quả.
- Thái độ cẩn thận khi đo đạc và trung thực khi ghi số liệu.

**2. Mục tiêu học tập** *(bảng 1×1 + "Sau tiết học, tôi có thể:" + bảng 3×2 + Phân hóa)*
Sau tiết học, tôi có thể:

| Cơ bản | Trọng tâm | Nâng cao |
|---|---|---|
| Phân biệt số đúng và số gần đúng; ghi kết quả đo kèm độ chia và đơn vị | Tính sai số tuyệt đối d; viết khoảng [a − d; a + d] chứa giá trị đúng | Giải thích hậu quả làm tròn tích luỹ (1,005 × 1000); so độ tin cậy hai phép đo cùng vật |

Phân hóa mục tiêu: HS yếu/TB đạt mức Cơ bản qua phiếu 4 vật + bài luyện C1; HS khá đạt Trọng tâm qua C2–C3; HS giỏi mở rộng qua DEEP/EXPLORE (so hai phép đo khác thước; phân tích lỗi bảng tính).

**3. Tài liệu dạy học**
- SGK Kết nối tri thức Toán 10, bài "Số gần đúng và sai số" (trang đối chiếu sau OCR scan).
- Thước thẳng chia milimét, thước dây, đồng xu 5000đ; phiếu đo 4 vật (bản giấy dự phòng).
- Bài học tương tác V8.8 (`adaptive-1792827090625`): Presenter – Student – Coach, mã phòng.
- Căn cứ điều chỉnh từ đánh giá tiết trước: sau bài kiểm tra giữa kỳ, một số HS có thể còn ghi kết quả đo thiếu độ chia — tiết này nhấn nonNegotiable "ghi đủ d và đơn vị".

**MINH CHỨNG HQT / CIS** *(bảng 3 cột)*

| Minh chứng | HS làm gì → GV thu được gì → mục đích | Vị trí |
|---|---|---|
| `[🔴 PHÂN HÓA]` Phiếu nhóm A02 | NH: đo và ghi 4 ô số đọc + độ chia → GV: nhận diện nhóm thiếu độ chia → mục đích: cấp DEEP hoặc hỗ trợ đúng chỗ | P8–P16 |
| `[🟣 ĐGTX]` Nhận xét A03 | NH: so sánh 29,0 cm và 29,00 cm → GV: bằng chứng "số 0 có nghĩa" được đọc thành lời của HS → mục đích: chốt khái niệm bằng tiếng nói của lớp | P16–P20 |
| `[🔴 PHÂN HÓA]` Ba câu A06 | HS: làm 3 câu tăng dần + dùng hint → GV: phân tuyến luyện tiếp Tiết 2 → mục đích: giao BTVN đúng mức | P27–P32 |
| `[🔵 CÔNG DÂN SỐ]` Biểu quyết A08 | HS: dự đoán 1,005 × 1000 → GV: nối sang rủi ro làm tròn trong bảng tính tiền/kho → mục đích: ý thức dùng công cụ số trung thực | P36–P38 |
| `[🟢 CÔNG DÂN TOÀN CẦU]` — Không phải tiết trọng tâm | — | — |
| Ghi chú tuần: `[🔴]`/[🟣] còn lại của Tuần 10 đặt ở Tiết 2 (chữa bài, luyện tập) để đạt ≥3 minh chứng/tuần mỗi loại. | | |

**II. TIẾN TRÌNH HOẠT ĐỘNG** *(bảng 1×1)*

**3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH** *(bảng 1×1)*

**1. KHỞI ĐỘNG — Con số nào là đúng? — Thời lượng: 5 phút, P0–P2 ổn định lớp + A01 P2–P5**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P0–P2 | GV mở phòng, HS nhập mã + SBD, gán nhóm 2–4 HS (≤ 8 nhóm). | Trình chiếu mã phòng; đọc danh nhóm thiếu. |
| P2–P5 | GV hỏi `[PHÁT HIỆN]` "1,20 m là ĐÚNG hay GẦN ĐÚNG?" — HS trả lời nhanh (máy/giơ tay); GV chốt dẫn: "Mọi phép đo đều có sai khác." | Ảnh bàn + thước dây; V3 đếm nhanh 3 phương án. |

**2. XÁC ĐỊNH MỤC TIÊU — Thời lượng: 3 phút, P5–P8**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P5–P8 | GV nêu "Sau tiết học, tôi có thể …" (3 dòng); HS đọc; GV bấm giao nhiệm vụ nhóm. | 3 mục tiêu buổi học + nhiệm vụ đo 4 vật. |

**HĐ1 — Đo — So sánh — Chuẩn hoá — Thời lượng: 16 phút, P8–P24**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P8–P16 (A02) | Nhóm đo 4 vật, ghi số đọc + độ chia + đơn vị; 1 HS gửi. GV theo Coach, hỏi nhanh nhóm chưa tách số đọc/độ chia. `[🔴 PHÂN HÓA]` | Phiếu 4 vật trên máy HS (offline: phiếu giấy). |
| P16–P20 (A03) | GV công bố bảng nhóm; câu `[SO SÁNH]` 29,0 cm vs 29,00 cm; HS nhận xét; GV chốt "số 0 có nghĩa". `[🟣 ĐGTX]` | Bảng 4 vật × các nhóm (ẩn danh đến khi GV bật tên). |
| P20–P24 (A04) | Reveal theo phần: |a − ā| ≤ d rồi ā ∈ [a − d; a + d]; câu `[KHÁI QUÁT]` "vì sao là một khoảng?"; con trỏ trên trục số khi đổi d. | Công thức hiện sau câu trả lời; không spoiler. |

**HĐ2 — Ví dụ mẫu và luyện có hướng dẫn — Thời lượng: 8 phút, P24–P32**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P24–P27 (A05) | GV trình bày ví dụ 8,24 m chia cm; HS làm bước trung gian "d = ?" (nấc 1/nấc 2); reveal từng bước. | Bảng tính mẫu; nấc hỗ trợ 2 hiện nấc 1. |
| P27–P32 (A06) | HS cá nhân 3 câu (d → khoảng → so sánh `[SO SÁNH]`), hint 1→3; xong sớm làm EXPLORE 1,005 × 1000. `[🔴 PHÂN HÓA]` | 3 câu trên máy; offline: phiếu + ảnh. |

**4. KIỂM TRA NHANH — MỞ RỘNG — Thời lượng: 6 phút, P32–P38**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P32–P36 (A07) | HS làm exit 3 câu (checkpoint riêng, không cộng điểm lần 2); GV theo dõi tỉ lệ hoàn thành, không xếp hạng. | 3 câu chọn; kết quả chỉ GV thấy. |
| P36–P38 (A08) | `[🔵 CÔNG DÂN SỐ]` biểu quyết 1,005 × 1000; câu `[PHẢN BIỆN]` "máy sai à?"; chốt: làm tròn ở bước cuối. | Hai phương án + reveal kết quả máy tính. |

**5. SƠ KẾT — Thời lượng: 2 phút, P38–P40**

| Thời gian thực | Giáo viên và Học sinh | Nội dung |
|---|---|---|
| P38–P40 | GV chốt 3 dòng; HS gửi phiếu thoát (icon + câu lấn cấn); GV ghi rút kinh nghiệm (máy GV). | Ba chốt: số gần đúng — d và khoảng — lỗi làm tròn. |

**6. BTVN**

| Nhóm HS | Bài tập |
|---|---|
| HS yếu/TB | 2 bài cho sẵn số đo: tính d và viết khoảng chứa giá trị đúng (phiếu / practiceSet mức nhận biết). |
| HS khá | 1 bài viết khoảng + 1 bài so hai phép đo cùng vật với thước khác độ chia (kết luận cách nào tin hơn). |
| HS giỏi | Diễn giải vì sao bảng tính nhân 1,005 × 1000 cho 1004,999…; nêu quy tắc làm tròn hạn chế sai số tích luỹ. |
| Toàn lớp | Học thuộc: a gần đúng ↔ d ↔ khoảng [a − d; a + d]; hoàn thành practiceSet đã gắn bài học trong app. |

## 3. Kiểm nhanh trước khi nộp (tự đối chiếu mẫu)

1. 16 thành phần đủ, đúng thứ tự ✔ (dạng bảng 1×1 / 3 cột sẽ giàn lại khi xuất DOCX từ nội dung này).
2. Dải P: 0–2–5–8–16–20–24–27–32–36–38–40 → phủ kín, không hở, không trùng ✔.
3. Không có phần trăm HS bịa ✔ ("một số HS có thể…").
4. Nhãn CIS đầu dòng: [🔴]×2, [🟣]×2 (kể vị trí XĐMT), [🔵]×1; [🟢] ghi "Không phải tiết trọng tâm" ✔ (phần còn lại của tuần đặt ở Tiết 2).
5. Không lấn nội dung Tiết 2 (luyện tập / biến đổi số gần đúng) ✔. Công thức ghi dưới dạng chữ/symbol; khi xuất DOCX sẽ dùng OMML khai font Cambria Math.

## 4. Việc treo (không chặn Gate C, chặn đối chiếu)

- Body giáo án Ban Toán nguyên bài ở Thư viện (cần tab app phiên GV) — đối chiếu câu chữ giáo án in.
- Trang SGK KNTT Toán 10 cụ thể (scan chưa OCR) — chỉ đối chiếu số liệu và bài tập BTVN.
