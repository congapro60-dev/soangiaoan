# G10 Discover HKII: bản nháp học liệu

Phạm vi: 130 hàng PPCT từ tuần 19 đến trả bài cuối HKII tại `G10!E341`, tiết 276. Giữ khoảng số 256-258; không tạo hàng thay thế. Không soạn `post_hkii`.

## Đầu ra

- `content/lessons/hkii-2026-g10.json`: 126 bản nháp tiết học, 28 game Tự chọn, metadata hai bộ kiểm tra.
- `tasks/r23-hkii/g10-hkii-midterm-exam.txt/json` và `g10-hkii-final-exam.txt/json`: hai đề 80 phút, mỗi đề 16 câu, 10 điểm; 8 nhiều lựa chọn, 2 đúng-sai, 4 trả lời ngắn, 2 tự luận. Hai bộ phủ đúng bốn tiết kiểm tra 218-219 và 270-271.
- `g10-hkii-midterm-solutions.txt`, `g10-hkii-final-solutions.txt`: lời giải và rubric cho giáo viên.
- `g10-coverage.json`: đối chiếu đủ 130 hàng nguồn với đầu ra duy nhất.
- `g10-source-coverage.json`: phạm vi từng tiểu chủ đề, tiết giới thiệu và nguồn mục tiêu.
- `g10-solutions.json`: 1.449 lời giải nhiệm vụ, dùng cho giáo viên. Tổng 1.656 nhiệm vụ gồm cả phản tư không dùng để đánh giá đạt mục tiêu.

Mọi gói giữ `status=draft`, `teacher_review_required`. Chưa đủ điều kiện dùng trong phiên live khi chưa được duyệt.

## Nội dung và nguồn

34 tiểu chủ đề có mẫu câu hỏi với dữ kiện biến đổi. Đây là tập nhiệm vụ tự soạn bám chi tiết PPCT, không phải bản chép toàn bộ sách giáo khoa hoặc toàn bộ dạng bài có thể có.

Các tiết mới phủ: hàm số/đồ thị/biến thiên; phương trình đường thẳng; hàm bậc hai; vị trí/góc/khoảng cách; dấu tam thức/bất phương trình; hai dạng phương trình căn; đường tròn/tiếp tuyến; elip; quy tắc đếm/hoán vị/chỉnh hợp/tổ hợp; Newton n=4,5; không gian mẫu/xác suất cổ điển/tổ hợp/biến cố đối. Các tiết luyện tập giữ phạm vi kiến thức đã giới thiệu trước đó.

Nguồn kế hoạch học phần được dùng thực tế:

| Tiểu chủ đề | Mục tiêu trích nguyên văn làm căn cứ |
|---|---|
| Hàm số và đồ thị | `r22-g10-u2-lo04` |
| Đồng biến/nghịch biến | `r22-g10-u2-lo05` |
| Phương trình tổng quát, tham số và chuyển đổi | `r22-g10-u2-lo06` |
| Tập hợp nền HKI | `r22-g10-u1-lo01` |
| Trung bình/trung vị nền HKI | `r22-g10-u2-lo03` |
| Tích vô hướng nền HKI | `r22-g10-u2-lo01` |

Kế hoạch học phần cũ hỗ trợ mục tiêu thích hợp; PPCT 2026-2027 quyết định tiết, tuần và chi tiết hiện hành. Mỗi trích dẫn giữ URL nguồn, file, dòng và hash đã kiểm qua assembler. Những mục tiêu còn lại do tác giả diễn giải từ PPCT, có cờ cần GV rà soát; mã `r23-*` là mã nội bộ, không phải mã YCCĐ chính thức.

Giới hạn nguồn được giữ: “Ba đường conic” chỉ có Elip/luyện tập trong Discover, nên không tự mở nội dung hypebol hoặc parabol của chương conic. Parabol trong bài hàm bậc hai vẫn được dạy đúng những tiết nguồn tương ứng. Các tiết trả/chữa bài dùng lỗi minh họa có nhãn, không giả đó là bài làm thật hay thống kê lỗi của lớp.

## Tự chọn

28 game dùng đúng hai tiểu chủ đề đã học ở **tuần trước**. Mỗi game có ít nhất một chủ đề nền HKI; tuần 19 dùng hai chủ đề HKI vì chưa có HKII ở tuần trước. Sau đó chọn thêm một chủ đề HKII đủ điều kiện. Không cần suy thứ tự dạy trong cùng tuần.

`cumulativeScope.rule=previous_weeks_only`; lưu danh sách đủ điều kiện, danh sách được chọn, tiết nguồn và tuần nguồn muộn nhất. Mô tả ghi rõ mỗi lượt chỉ luyện hai mục tiêu được chọn; không xem là đo toàn bộ kiến thức tích lũy.

## Tổ chức tiết học

40 phút: mở đầu 4, hình thành/hướng dẫn 8, luyện tập 10, kiểm tra lại 6, phiếu cuối tiết 5, mở rộng tùy chọn 4, dự phòng 3. Bắt đầu từ bảng trắng và TV/thiết bị chờ; GV dựng hình, bảng, dữ kiện trong tiết. Vở là phương án tiếp tục khi mất mạng.

Mỗi mục tiêu có tuyến hỗ trợ chia bước với H1-H4 không cho đáp số, tuyến cơ bản và tuyến mở rộng có tình huống đổi điều kiện. Mở rộng chỉ sau kiểm tra lại và phiếu cuối tiết, có thể bỏ trọn. Mỗi mục tiêu có hai minh chứng cá nhân khác dữ kiện; bài mở cần GV đọc rubric. Điểm game hoặc vị trí bản đồ không thay minh chứng học tập.

Phân bổ 40 phút đã kiểm bằng cấu trúc dữ liệu; chưa chạy thử trong lớp để xác nhận tốc độ thực tế. Mỗi em thực hiện tuyến được giao, không phải toàn bộ ngân hàng hoặc mọi tuyến.

## Kiểm tra

- Builder chạy 2.977 assert toán: liệt kê tập/cặp/tổ hợp/hoán vị, nhân đa thức độc lập với hệ số Newton, kiểm tọa độ/khoảng cách, dấu tam thức tại các miền, điều kiện nghiệm căn và các đáp án cố định của đề.
- Kiểm đủ 130 hàng, 126 gói, 28 game, hai đề; không lẫn phụ lục sau HKII, không thêm số tiết bị thiếu.
- Mọi gói qua validator chế độ draft và khớp hash; chế độ publish bị chặn khi nguồn chưa được duyệt.
- Kiểm bằng chứng recheck/exit riêng từng mục tiêu, đủ ba tuyến, hỗ trợ bốn gợi ý, dự phòng tối thiểu 3 phút.
- Kiểm hai đề qua bộ chuẩn hóa và parser văn bản: đủ 16 câu, đúng dạng, 80 phút, 10 điểm.
- ESLint trên builder và kiểm tra riêng G10 đạt. Chưa chạy full build hoặc QA giao diện trong phạm vi tác giả này.

Tái tạo và kiểm:

```powershell
node scripts/content/build-hkii-g10.mjs
node tasks/r23-hkii/g10-verify.mjs
node node_modules/eslint/bin/eslint.js scripts/content/build-hkii-g10.mjs tasks/r23-hkii/g10-verify.mjs
```

Chứng cứ này xác minh cấu trúc, nguồn trích và các phép kiểm đã nêu. Chất lượng sư phạm từng câu, mức phù hợp với lớp, ma trận kiểm tra và điều kiện tổ chức vẫn cần giáo viên duyệt.
