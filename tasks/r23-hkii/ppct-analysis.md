# PPCT Discover 10-12: HKII

Nguồn chỉ đọc: `C:/Users/ADMIN/Downloads/PPCT THCS-THPT 26-27.xlsx`.

SHA256: `3d8c7ea691161481a6a621c3b2144115bc5617e6c66c5ea4713c5801c8be309e`.

Phạm vi người dùng chốt: **“Chỉ đến kiểm tra và trả bài cuối HKII; phần sau để riêng.”** Dữ liệu chính: `tasks/r23-hkii/ppct-hkii.json`, `grades[].lessons`. Phần sau nằm trong `grades[].post_hkii`, không thuộc học liệu triển khai lượt này. Chỉ Discover cột D:E; không lấy Explore/DGS thay thế.

## Ranh giới

Đầu phạm vi: **tuần 19**, suy từ nguồn: thi cuối HK1 tuần 18, trả/chữa HK1 rồi nội dung mới ở tuần 19; Discover lớp 12 chuyển từ 8 sang 10 tiết. Đây là ranh giới nội dung, chưa phải ngày kết thúc/bắt đầu học kỳ chính thức.

Bằng chứng: `'G_Lich năm học'!B106:C106`, `G10!E167:E176`, `G11!E171:E180`, `G12!D18`, `G12!B183:E194`.

| Khối | Cuối phạm vi chính | Ô nguồn | Tiết nguồn cuối | Căn cứ |
|---|---|---|---:|---|
| 10 | Tuần 38, hàng 341 | `G10!E341` | 276 | Trả bài kiểm tra cuối HK2 |
| 11 | Tuần 36, hàng 346 | `G11!E346:E347` | 267 | Trả bài kiểm tra cuối HK2; E gộp hai hàng nhưng D chỉ một tiết |
| 12 | Tuần 35, hàng 403 | `G12!E403` | 303 | Kiểm tra cuối HK2 (tiếp); không có tiết trả/chữa cuối HK2 trong Discover |

Lớp 12: ba tiết Tự chọn 304-306 tại `D404:D406` đứng **sau** hàng thi cuối nhưng vẫn cùng tuần 35. Theo ranh giới từng hàng, giữ riêng trong `post_hkii`; không kéo lại vào phạm vi chính vì cùng số tuần. Tuần 36 trở đi ghi ôn TNTHPT, không ghi trả bài cuối HK2.

Mỗi khối có hai tiết trả/chữa **HK1 ở tuần 19**, thuộc lịch HKII. Cộng đúng một lần vào phạm vi chính; không cộng thêm `post_cutoff_feedback` của dữ liệu HKI.

## Số tiết đã đối chiếu

**416 tiết có số trong phạm vi chính.** Giữ số nguồn, không đánh lại để lấp khoảng trống.

| Khối | Tiết thật | Số tiết nguồn | Core | Tự chọn | Ôn tập | Kiểm tra | Trả/chữa bài | Trống nội dung |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| 10 | 130 | 144-276, thiếu 256-258 | 55 | 28 | 35 | 4 | 8 | 0 |
| 11 | 130 | 138-267 | 51 | 30 | 37 | 4 | 8 | 0 |
| 12 | 156 | 138-303, thiếu 148-157 | 39 | 39 | 69 | 4 | 5 | 0 |
| Tổng | 416 | | 145 | 97 | 141 | 12 | 21 | 0 |

`review` gồm “Ôn tập”, “Ôn thi”, “Tổng ôn”, “Luyện đề”. Luyện đề khảo sát/TNTHPT là ôn luyện, không phải kỳ kiểm tra chính thức. Chữa/trả bài không thành chủ đề toán mới. `kind=elective` khi E ghi Tự chọn, hoặc E trống nhưng C trong đúng ô gộp ghi Tự chọn.

Không có override HKI được sao chép. Hai ô trống lớp 12 HKI từng được chủ sở hữu chốt riêng không làm căn cứ đổi loại tiết HKII. Trong phạm vi HKII chính, mọi tiết có số đều có nội dung hoặc nhãn Tự chọn hợp lệ sau giải ô gộp.

### Tải theo tuần

| Khối | Tuần: số tiết |
|---|---|
| 10 | 19:8, 20:3, 21:0, 22:8, 23:8, 24:6, 25:8, 26:8, 27:8, 28:0, 29:8, 30:8, 31:8, 32:8, 33:8, 34:8, 35:6, 36:8, 37:8, 38:3 |
| 11 | 19:8, 20:0, 21:8, 22:8, 23:6, 24:8, 25:8, 26:8, 27:8, 28:8, 29:8, 30:8, 31:8, 32:9, 33:8, 34:8, 35:8, 36:3 |
| 12 | 19:10, 20:5, 21:10, 22:10, 23:7, 24:10, 25:10, 26:10, 27:10, 28:10, 29:10, 30:10, 31:10, 32:10, 33:7, 34:10, 35:7 |

Lớp 10 tuần 28 ghi Nghỉ Tết tại `C251:C256`; tuần 21 có khối gộp `C189:E196` trống, chưa đủ bằng chứng gán tên kỳ nghỉ. Lớp 11 tuần 20 có ghi nghỉ đông tại `H184`. Các khoảng B trống như `G11!B192:B199`, `G12!B195:B204` không được fill-down thành một tuần đã biết.

## Điểm cần xử lý khi soạn

| Vấn đề | Ô nguồn | Quy tắc |
|---|---|---|
| Lịch năm học lẫn 2025-2026 và 2026-2027 | `'G_Lich năm học'!H5`, `B6`; tiêu đề các khối | Không gán ngày cụ thể. Giữ số tuần từng khối. |
| Lịch chung ghi thi giữa/cuối HK2 tuần 31/37; lớp 11, 12 ghi 29/35 | Lịch `B184:C184`, `B220:C220`; `G11!E281:E283`, `E339:E340`; `G12!E325:E326`, `E402:E403` | Không ép ba khối theo lịch chung. |
| Lớp 10 nhảy số 255 sang 259 | `D320:D321` | Không tạo tiết 256-258. |
| Lớp 12 nhảy số 147 sang 158 | `D194:D205` | Không tạo tiết 148-157; khối nghỉ đông không chứng minh có 10 tiết bị thiếu. |
| Nhãn Tự chọn nhưng D:E đều trống | G10 `C187:E188`, `C222:E223`, `C318:E319`; G11 `C225:E226`; G12 `C214:E216`, `C250:E252`, `C380:E382` | Giữ `elective_sections_without_numbered_periods`; không tự thêm game hay số tiết. |
| Lớp 11 tuần 32 có 9 tiết thay vì định mức 8 | `B307:E316`, `D9` | Giữ 9 hàng số 232-240. |
| Hai tiết khác nhau cùng chi tiết “Khoảng cách - Tiết 5” | `G11!E304`, `E309` | Giữ tiết 229 và 234; không khử trùng, không tự sửa thành Tiết 6. |
| Ôn tập chương VII trong nhóm Hình học | `G11!C320:E323`; so với ôn xác suất `E246:E247` | Chưa dùng số chương để xác định nội dung toán. Bám các tiết đã học, chờ nguồn bài cụ thể. |
| Phương trình đường thẳng trong không gian bắt đầu ở Tiết 2 | `G12!E233:E235` | Chưa có dòng Discover ghi Tiết 1. Không thêm tiết hoặc khẳng định kiến thức Tiết 1 đã được dạy. |
| Tên “Ba đường conic” rộng hơn chi tiết có thật | `G10!E239`, `E246` | Nguồn chỉ nêu Elip và luyện tập. Không suy rằng hypebol/parabol đã học từ tên chủ đề. |
| Lớp 12 không có trả/chữa bài cuối kỳ | `E402:E410` | Không tạo phiên trả bài giả. Chốt hàng 403, để phần sau riêng. |
| Thứ tự đại số/hình học cùng tuần chưa có thời khóa biểu | Các khối B/C | Chỉ đưa tiết đứng trước vào Tự chọn khi GV xác nhận đã dạy. |

Các điểm này nằm trong `ambiguities` của JSON, gồm mã, tham chiếu và cách xử lý. `topic` hỗ trợ tìm nguồn; **`detail` và ô E đầy đủ mới giới hạn nội dung câu hỏi**. Không suy YCCĐ/LO từ tiêu đề PPCT.

## Ôn tập tích lũy và kiến thức HKI

97 tiết Tự chọn trong phạm vi chính phải triển khai thành game ôn tập tích lũy, bám nội dung đã học đến thời điểm đó.

1. `hki_prerequisites.lessons`: nội dung toán HKI trích lại trực tiếp từ cùng workbook, chỉ đọc; 48/66/66 tiết tương ứng lớp 10/11/12. Hai tiết báo cáo dự án lớp 10 không đủ nội dung toán nên không được dùng làm chủ đề mới.
2. `practice_scopes[].prior_week_lesson_ids`: toàn bộ core HKI hợp lệ và core HKII thuộc tuần trước. Đây là phạm vi mặc định.
3. `elective_scope.same_week_earlier_lesson_ids`: ứng viên cùng tuần đứng trước; cần GV xác nhận đã dạy đúng phần tương ứng. `same_week_order_verified=false`.
4. `same_week_later_lesson_ids`: giữ để kiểm loại trừ; không dùng trong tiết hiện tại. Không đưa kiến thức tuần sau, review chung hoặc kỳ kiểm tra thành “đã học”.

Các nhóm nền HKI gồm: lớp 10 mệnh đề/tập hợp, bất phương trình hai ẩn, lượng giác và hệ thức tam giác, vectơ, thống kê; lớp 11 lượng giác, dãy số/cấp số, thống kê ghép nhóm, quan hệ song song, giới hạn/liên tục, lũy thừa/lôgarit; lớp 12 ứng dụng đạo hàm, vectơ/tọa độ không gian, thống kê, nguyên hàm/tích phân và ứng dụng. Mỗi nhóm vẫn phải tra đúng chi tiết tiết nguồn, không mở toàn chương.

Riêng `G10!E30` của HKI có tiêu đề/chi tiết Việt/tiếng Anh không nhất quán: tiêu đề giá trị lượng giác, chi tiết Việt định lý cosin. Dữ liệu giữ nguyên, gắn cảnh báo; không giải quyết bằng cách đổi nội dung gốc.

## Phần để riêng

Toàn bộ phần còn lại từ tuần 19 đến cuối các sheet có **529 tiết có số**. Phân chia: **416 chính + 113 sau ranh giới**, cộng **15 ô nội dung dự án chưa có số tiết**, không gộp 15 vào tổng số tiết.

| Khối | Phần sau ranh giới | Tiết có số | Loại |
|---|---|---:|---|
| 10 | Hàng 347-377, tuần 39-42, tiết 282-309 | 28 | 6 ôn tập, 6 Tự chọn, 12 trải nghiệm, 4 giao bài hè |
| 11 | Hàng 353-361, tuần 37, tiết 268-275 | 8 | 3 Đạo hàm cấp hai, 3 ôn hình học, 2 Tự chọn |
| 12 | Hàng 404-502, từ cuối tuần 35 đến tuần 43, tiết 304-380 | 77 | 24 Tự chọn, 53 ôn luyện |

Lớp 10 còn khoảng số 277-281 giữa trả bài và tuần 39, không tạo hàng thay thế. `G10!E376:E377` là ô nội dung gộp chung **hai** số tiết D376=308 và D377=309: giữ hai tiết giao bài hè. Không nhầm phần kéo dài ô E với tiết trống.

Lớp 11 có **15 ô E gốc** ghi Hoạt động dự án, tuần 38-40: E362-E367, E371-E376, E380-E382. E367:E368 và E376:E377 gộp, không đếm lại ô con. D362:D370 trống; D371:D379 và D380:D382 ghi **CT LỚP 12**, không phải số. Giữ cả nội dung, ô D và nhãn CT12 trong `post_hkii.unnumbered_activity_rows`, `period_count=null`. Chưa có nội dung toán dự án hoặc số tiết đủ chắc chắn để soạn.

## Hợp đồng dữ liệu cho người soạn

- `grades[].lessons`: chỉ phạm vi được yêu cầu; ID theo hàng nguồn, `sequence` là thứ tự tiết thật, `period` giữ số nguồn.
- `kind`, `effective_kind` bằng nhau. Không có `ownerOverride`; `activity_type=cumulative_practice_game` cho Tự chọn.
- `source`: sheet, tuần, môn/chủ đề, số tiết, nội dung, ghi chú; mỗi ô có `cell`, `anchor`, `range`, `ref`, `raw`, `cached`.
- `source_evidence`: toàn bộ ô đã lưu thuộc A:E/H của ba khối và lịch chung; giữ công thức, cache, kiểu XML, style ID và ô gộp. Số serial ngày giữ dạng XML, không chuyển thành ngày lịch suy đoán.
- `cutoff`: hàng/tuần/tiết cuối và lý do. `post_hkii` chỉ là phụ lục nguồn; không soạn trong lượt này.
- `unnumbered_activity_rows`: hàng nội dung chưa đủ số tiết; phạm vi chính rỗng, phụ lục lớp 11 có 15 ô gốc.

## Kiểm tra đã chạy

- [x] Trích trực tiếp từ XML trong workbook, không dựa vào bản HKI để quyết định HKII.
- [x] Đối chiếu độc lập bằng openpyxl mọi ô B/C/D/E/H từ đầu HKII đến hết nguồn có dữ liệu: **158/138/233 hàng D có số**, không thiếu/nhân đôi.
- [x] Đối chiếu **525 công thức `ROW()-n`** với cache đã lưu. Bốn hàng số còn lại giữ giá trị literal.
- [x] Kiểm ranh giới mới: **130/130/156**; G12 không tự thêm trả bài hoặc ba Tự chọn sau hàng thi.
- [x] Ô D gộp chỉ tạo một tiết; ô E gộp dùng chung nhiều D giữ đủ từng tiết.
- [x] Phạm vi Tự chọn không chứa tuần tương lai; cùng tuần giữ điều kiện GV xác nhận.
- [x] Không sao chép override HKI; giữ đủ 15 ô dự án không số ngoài phạm vi chính.
- [x] SHA256 workbook không đổi; không ghi workbook, không sửa HKI hoặc runtime.

Lệnh tái kiểm tra, có assert chạy cùng extractor:

```powershell
& 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 'C:/Users/ADMIN/.codex/worktrees/6dec/signal-station-site/tasks/r23-hkii/ppct-extract.py'
```

Kiểm tra này xác minh nguồn, ranh giới và dữ liệu trích. Chưa chứng minh chất lượng câu hỏi/game, runtime hay triển khai production.
