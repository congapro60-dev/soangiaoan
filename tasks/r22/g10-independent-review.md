# R22 — Rà soát lớp 10 và xử lý phát hiện

Ngày 2026-10-15. Bản trước sửa được rà độc lập với tác giả lớp 10; sau đó root giao cùng reviewer sửa các lỗi phát hiện. Kết quả cuối là **tự kiểm sau sửa**, không phải một lượt review độc lập mới hoặc review khác hãng. Không gọi model/router bên ngoài.

## Phát hiện và trạng thái

### P1 — Mất dấu gạch chéo làm thay đổi ký hiệu toán: đã sửa

Vị trí hiện tại trong `scripts/content/build-hki-g10.mjs`: dòng 102, 243, 296, 312, 313.

Chuỗi thường như `'A\setminus B'`, `'\le'`, `'\overrightarrow{AB}'` nằm bên trong biểu thức nội suy của `String.raw` vẫn bị JavaScript xử lý escape trước. `String.raw` ở ngoài không bảo vệ chuỗi bên trong.

Tái hiện trên JSON trước sửa:

- Tiết 23, `task-1-1`: `$Asetminus B$` thay cho `$A\setminus B$`.
- Tiết 32, `task-1-1`: `$x+2yle22$`, mất quan hệ bất phương trình.
- Tiết 83, `task-1-1`: `$overrightarrow{AB}+overrightarrow{AD}$`.
- Tiết 85 có lỗi tương tự ở đề và lời giải vectơ hiệu.

Đếm trước sửa: **104 prompt, 17 gói**. KaTeX có thể chấp nhận chuỗi này như tích các chữ, nên chỉ kiểm cú pháp không phát hiện sai nghĩa. Đã đổi các chuỗi nhúng thành tagged raw strings. Kiểm lại không còn mẫu lỗi; MathML có phần tử mũi tên `<mover>` và dấu `≤` thật.

### P2 — Mục tiêu quảng bá rộng hơn phần recheck/exit đo được: đã sửa

Ba ví dụ ban đầu:

- `vectorScale`, dòng 328: mục tiêu có hướng và phân phối nhưng câu hỏi chỉ nhập độ dài.
- `coordinateMidpoint`, dòng 370: mục tiêu có trọng tâm nhưng template chỉ hỏi trung điểm và điểm thẳng hàng.
- `perpendicular`, dòng 423: mục tiêu có cos góc nhưng template chỉ tìm tham số vuông góc.

Đã rà cả **45 concept**, bổ sung nhiệm vụ ở nhánh độc lập `d=2`/`d=3` và mở rộng tương ứng cho 17 concept. Giữ mục tiêu cần dạy, không xóa phần thiếu để làm đẹp báo cáo phủ.

| Concept | Nội dung được bổ sung vào kiểm tra độc lập |
|---|---|
| `numberSets` | Khoảng/đoạn, hai đầu mút, đếm số nguyên, phân loại tập số. |
| `inclusion` | Hợp, phần đúng một, phần ngoài và lý do tránh đếm trùng. |
| `trigValue` | Đủ sin, cos, tan; dấu và điều kiện tan. |
| `supplement` | Đủ ba giá trị của góc bù, giải thích bằng đối xứng. |
| `cosine` | Bình phương cạnh và độ dài cạnh thật bằng căn dương. |
| `cosineAngle` | Cos và kết luận góc nhọn/vuông/tù có căn cứ. |
| `areaSin` | Đường cao, lý do dùng sin và diện tích. |
| `inequality` | Nhận dạng bậc nhất hai ẩn rồi kiểm hai cặp số. |
| `system` | Kiểm đủ điều kiện, giải thích phần giao. |
| `optimize` | Tự lập ràng buộc từ tài nguyên, hàm lợi nhuận, chọn đỉnh tối ưu. |
| `vectorChain` | Chuỗi vectơ, đường khép kín và cặp đối từ trung điểm. |
| `vectorScale` | Hướng, độ dài, phân phối hệ số đến cả hai vectơ. |
| `coordinateOperations` | Tọa độ tổ hợp, bình phương độ dài và độ dài thực sự. |
| `coordinateMidpoint` | Trung điểm, trọng tâm tam giác không suy biến và kiểm thẳng hàng. |
| `dotAngle` | Dời về chung gốc, xử lý vectơ đảo hướng rồi tính tích. |
| `dotCoordinates` | Tích tọa độ, kiểm vuông góc, phân phối và kiểm bằng cách tính trực tiếp. |
| `perpendicular` | Tham số vuông góc và cos góc của cặp vectơ khác không. |

Các bài mở có lời giải và rubric theo từng phần; cần GV đánh giá, không tự ghi đạt khi chỉ nộp. Hai câu recheck/exit khác prompt và số liệu. Các nhánh ngắn `d=0`/`d=1` còn dùng cho chẩn đoán/luyện hỗ trợ và đề thi hiện có; không dùng chúng để chứng minh đã đo đầy đủ mục tiêu ở hai lượt độc lập.

### P2 — Tiết luyện tập bị gắn mục đích hình thành kiến thức: đã sửa

`buildPeriod` nay nhận diện `Luyện tập` trong chi tiết PPCT. Những tiết này dùng `purpose=practice` và hoạt động dẫn dắt `guided`; báo cáo dự án giữ review, nội dung mới giữ formation. Danh mục cuối: **29 formation, 56 practice, 52 review**.

Quỹ 40 phút giữ nguyên: mở đầu 4, dẫn dắt/chốt 8, luyện tập 9, recheck 6, exit 6, mở rộng tùy chọn 4, dự phòng 3. Tăng exit từ 5 lên 6 phút, mỗi câu độc lập có 3 phút khi tiết có hai mục tiêu. Mở rộng ở sau recheck/exit; có thể bỏ trọn để giữ nhịp lớp.

## Toán và đề thi

Đã đọc toàn bộ 45 template, hai nhánh số liệu chẵn/lẻ và các nhánh độ khó; kiểm công thức mệnh đề/tập hợp, lượng giác, hệ bất phương trình, vectơ, tọa độ, thống kê. Các phép kiểm số có sẵn được chạy lại; phép bổ sung có kiểm riêng cho bộ ba Pythagore, cos, phân phối, tọa độ trọng tâm/thẳng hàng và tối ưu đối chiếu vét cạn miền nguyên.

Đã giải lại hai đề, đối chiếu key và rubric:

| Đề | Trắc nghiệm | Đúng/sai | Trả lời ngắn | Tự luận | Tổng |
|---|---|---|---|---|---|
| Giữa HKI | B B A C D C C B | ĐĐSĐ; ĐSĐĐ | 28; 224; 17; 72 | Venn: 11,8,26,4; tam giác: C=90°, BC=20, AC=20√3, S=200√3 | 16 câu, 10 điểm, 80 phút |
| Cuối HKI | B A B C C C C C | ĐĐSĐ; ĐĐĐS | 13; 98; 16; 1539 | Hai mẫu: trung bình 4, phương sai 4/1, độ lệch chuẩn 2/1; hình học: BC=5, S=6, M=(3;2,5) | 16 câu, 10 điểm, 80 phút |

Không phát hiện key sai ở hai đề. Phạm vi giữa kỳ không đưa tổng/hiệu, tọa độ hay tích vô hướng vectơ trước tuần 11–14 vào đề. Đề cuối kỳ không dùng hàm số/phương trình đường thẳng của tuần 19. Đề là bản mới cần GV duyệt; chưa có ma trận kiểm tra chính thức của trường để chứng nhận phù hợp ma trận.

## Kiểm tra đã chạy

```powershell
node scripts/content/build-hki-g10.mjs
node tasks/r22/g10-review-check.mjs
node node_modules/eslint/bin/eslint.js scripts/content/build-hki-g10.mjs tasks/r22/g10-review-check.mjs
```

- Generator: **141 dòng PPCT; 137 gói lớp học; 37 Tự chọn; 2 đề cho 4 tiết kiểm tra; 1.153 kiểm toán số; 1.624 lời giải**. Validator và hash từng gói đạt ngay trong generator.
- Kiểm bổ sung: **45 concept × 34 seed × 5 nhánh = 7.650 trường hợp**, không lỗi; LaTeX và kiểm nghĩa MathML các lỗi escape đạt.
- Không thiếu/trùng dòng PPCT; không tạo tiết nguồn 16/67. Tự chọn chỉ lấy nguồn giới thiệu ở **tuần trước**, không tự gán thứ tự cùng tuần.
- Recheck/exit mỗi mục tiêu có đúng một câu cá nhân ở mỗi pha, khác prompt.
- Hai đề đủ 16 câu, đúng loại câu khi parse TXT, tổng 10 điểm; key đã đối chiếu lời giải độc lập.
- ESLint hai tệp: **0 lỗi, 0 cảnh báo**.
- Kiểm projection HS/TV bằng gói tiết 108: không có `workedSolution`, `answerKey`, `sourceCitation`, nhãn duyệt nguồn hoặc URL Drive.

Tệp dữ liệu cuối: `content/lessons/hki-2026-g10.json`. SHA256: `879942a75a44659f0c762e787670d47607db2ef3123531221c024c257c9abbda`.

## Giới hạn còn lại

- Chưa dạy thử 40 phút trên lớp; quỹ giờ là phương án thiết kế đã kiểm tổng, chưa phải thời gian thực nghiệm.
- Chưa kiểm giao diện thật sau các sửa này; root cần cập nhật catalogue/hash, build và browser QA trên artifact mới.
- Không đổi 17 gói lớp 11 đã có, runtime, registry hay shared catalogue. Không commit, push hoặc deploy.
- Bài dự án tiết 96/97 là đề xuất mới dùng dữ liệu mô phỏng, được ghi rõ; không mô tả đó là dự án đã có trong PPCT.
- Không khẳng định mọi LO học phần rộng đã được chứng nhận chỉ vì các hàng PPCT có gói. 7.650 lượt sinh và validator kiểm cấu trúc/nhánh, không thay đánh giá sư phạm hoặc review độc lập lại bản sửa.
