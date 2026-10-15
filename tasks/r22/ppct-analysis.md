# PPCT Toán Discover 10–12, phạm vi HKI

Nguồn: `C:/Users/ADMIN/Downloads/PPCT THCS-THPT 26-27.xlsx`.

SHA256: `3d8c7ea691161481a6a621c3b2144115bc5617e6c66c5ea4713c5801c8be309e`.

Chỉ đọc workbook. Người dùng đã chốt **Discover**, cột D:E của G10, G11, G12. Explore/DGS không thuộc danh mục triển khai. JSON chuẩn: `tasks/r22/ppct-hki.json`.

## Phạm vi và số tiết

**415 tiết thật, tuần 1–18**. Một ô D có số/công thức trả số là một tiết; phần kéo dài của ô gộp không tạo thêm tiết. `period` giữ số trong nguồn; `sequence` giữ thứ tự tiết thật; ID dùng hàng nguồn, ví dụ `g10-discover-r008`.

| Khối | Tiết thật | Số tiết đầu–cuối trong nguồn | Chính khóa | Tự chọn nguồn | Ôn tập | Kiểm tra | Trả/chữa bài | Khác |
|---|---:|---|---:|---:|---:|---:|---:|---|
| 10 | 141 | 1–143, thiếu 16 và 67 | 50 | 37 | 48 | 4 | 1 | 1 giới thiệu |
| 11 | 137 | 1–137 | 66 | 32 | 34 | 4 | 1 | 0 |
| 12 | 137 | 1–137 | 66 | 15 | 48 | 4 | 2 | 2 tiết trống nội dung |

Chính khóa lớp 10 gồm hai tiết **Báo cáo dự án Toán 10**, `G10!E117:E118`; nguồn chưa nêu dự án hoặc nội dung toán. JSON giữ `kind=core`, thêm `activity_type=project_presentation`, `practice_eligible=false`. Không lấy nhãn báo cáo dự án làm chủ đề toán để sinh câu hỏi.

Người dùng xác nhận ngày **2026-10-15**: lớp 12 tiết **121, tuần 16** và **129, tuần 17** triển khai thành game ôn tập tích lũy. JSON giữ `kind=unspecified`, E gốc trống; thêm `ownerOverride`, `effective_kind=elective`, `elective_scope`. Tổng Tự chọn triển khai: **86** = 37 + 32 + 17; nguồn ghi rõ Tự chọn: **84**.

## Mốc HKI

Mốc nội dung chọn **hết tuần 18**, gồm kiểm tra cuối HK1 và tiết Tự chọn còn lại trong tuần. Đây là ranh giới nội dung suy từ PPCT, không phải ngày kết thúc học kỳ chính thức đã được xác nhận.

| Bằng chứng | Ô nguồn |
|---|---|
| Lịch chung ghi tuần 18, kiểm tra cuối HK1 | `'G_Lich năm học'!B106:C106` |
| Lớp 10 kiểm tra cuối HK1, hai tiết 140–141 | `G10!E167:E168` |
| Lớp 11 kiểm tra cuối HK1, hai tiết 134–135 | `G11!E171:E172` |
| Lớp 12 kiểm tra cuối HK1, hai tiết 135–136 | `G12!E179:E180` |
| Discover lớp 12: kỳ 1 có 8 tiết/tuần, kỳ 2 có 10 tiết/tuần | `G12!D18` |
| Tuần 19 lớp 12 có 10 tiết thật, số 138–147 | `G12!B183:D194` |

Tuần 19 bắt đầu nội dung mới: lớp 10 Hàm số và Phương trình đường thẳng (`G10!E173:E176`); lớp 11 Hàm số mũ và Hai đường thẳng vuông góc (`G11!E177:E180`); lớp 12 Xác suất có điều kiện và Phương trình mặt phẳng (`G12!E185:E189`). Những bài này nằm ngoài danh mục tuần 1–18.

Hai tiết trả/chữa bài HK1 của mỗi khối nằm tuần 19, giữ riêng trong `post_cutoff_feedback`, không cộng vào 415 tiết: `G10!E171:E172`, `G11!E175:E176`, `G12!E183:E184`.

Không dùng lịch cũ trong kế hoạch học phần để kéo phạm vi đến tuần 20. Lũy thừa/lôgarit lớp 11 và nguyên hàm/tích phân lớp 12 **đã xuất hiện trước tuần 18** trong PPCT hiện tại; không loại chỉ vì thường được xếp HKII ở lịch khác.

## Ôn tập tích lũy

Mỗi tiết Tự chọn, gồm hai tiết lớp 12 được người dùng xác nhận, có `elective_scope` dẫn đến `practice_scopes` của đúng khối/tuần.

1. `prior_week_lesson_ids`: các tiết nội dung toán đã có ở tuần trước; đây là phạm vi mặc định.
2. `same_week_earlier_lesson_ids`: tiết toán cùng tuần đứng trước tiết Tự chọn trong PPCT. Chỉ sử dụng khi GV xác nhận đã dạy phần tương ứng.
3. `same_week_later_lesson_ids`: tiết toán cùng tuần đứng sau; không đưa vào tiết Tự chọn này.

PPCT không cung cấp thời khóa biểu thực tế. `same_week_order_verified=false`; thứ tự hàng nguồn không tự chứng minh thứ tự dạy đại số/hình học trong lớp. Các trường `topic` chỉ hỗ trợ tìm nguồn; **phạm vi câu hỏi phải bám `detail` của từng tiết**, không lấy toàn bộ nội dung một chương chỉ vì tên chương đã xuất hiện.

Không đưa tiết kiểm tra, trả bài, giới thiệu, tên dự án hoặc tiết ôn chung trở thành một chủ đề toán mới. Tiết ôn chung không làm tăng danh sách kiến thức đã học. JSON không tạo YCCĐ/LO.

## Bất nhất giữ nguyên

| Điểm cần biết | Bằng chứng | Cách xử lý |
|---|---|---|
| Lịch chung còn ngày 2025–2026, tiêu đề khối ghi 2026–2027 | `'G_Lich năm học'!H5`, `'G_Lich năm học'!B6`, `G10!B1`, `G11!B7`, `G12!B7` | Dùng số tuần; không tự sửa hoặc suy ngày năm 2026–2027. |
| Lớp 10 thiếu số 16 | `G10!D28:D30`: 15 rồi 17 | Giữ 141 tiết thật; không tạo tiết 16. |
| Lớp 10 thiếu số 67 | `G10!D85:D86`: 66 rồi 68 | Giữ ID theo ô; không đánh lại số. |
| Lớp 10 tuần 3 có 9 tiết, gồm 4 Tự chọn | `G10!B26:E35`; định mức tại `G10!D3` là 8 | Giữ đủ 9 hàng có số; không tự xóa tiết. |
| Lớp 12 tiết 121/129 có E trống, C gộp ghi Ôn thi HK I | `G12!D163:E164`, `G12!D172:E173` | Giữ nguồn trống; áp dụng override của người dùng thành ôn tập tích lũy. |
| Lớp 10 tiêu đề/chi tiết/bản tiếng Anh không khớp | `G10!E30` | Chi tiết Việt ghi Định lý cosin; giữ nguyên cả nguồn để đối soát. Không chỉ dựa vào tiêu đề giá trị lượng giác. |
| Hai tiết báo cáo dự án không có nội dung dự án | `G10!E117:E118` | Giữ hàng; không suy mục tiêu hoặc sinh câu hỏi từ nhãn dự án. |

## Cấu trúc dữ liệu và kiểm tra

Mỗi tiết giữ sheet, hàng, tuần, số tiết, loại, nội dung đầy đủ, tham chiếu ô gốc. Mỗi tham chiếu gồm `cell`, `anchor`, `range`, `raw`, `cached`; ô gộp vẫn truy ngược được. Bản trích nguyên liệu nằm trong `tasks/r22/sources/ppct-raw.json`.

Đã chạy `ppct-extract.py` thành công:

- Đối chiếu độc lập toàn bộ ô D với XML đã lưu trong workbook: **141/137/137**, không thiếu hoặc nhân đôi hàng.
- Công thức `ROW()-n` khớp số cached của từng tiết.
- Kiểm tra riêng `G10!D11:D13` chỉ xuất một tiết.
- Mỗi khối có tuần 1–18, đủ hai tiết kiểm tra cuối HK1 ở tuần 18.
- Phạm vi Tự chọn không chứa tuần tương lai; hai override lớp 12 giữ nguyên ô nguồn trống.
- SHA256 workbook không đổi sau xử lý.

Lệnh kiểm tra lại:

```powershell
& 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 'C:/Users/ADMIN/.codex/worktrees/6dec/signal-station-site/tasks/r22/ppct-extract.py'
```

Thêm `--refresh` để trích lại workbook hiện tại. Không có thao tác lưu/sửa workbook, commit, push hoặc deploy.
