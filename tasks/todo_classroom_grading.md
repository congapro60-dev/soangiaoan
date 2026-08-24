# QA và nâng cấp luồng lớp học — 2026-08-24

## Phạm vi đã được duyệt

- [x] Chấm AI lưu được chi tiết từng câu: câu hỏi, bài làm của học sinh, đáp án chuẩn, loại lỗi, lý do, cách sửa và bước luyện tiếp theo.
- [x] Báo cáo chỉ tính bài hiện hành và điểm đã được giáo viên duyệt; vẫn hiển thị rõ bài chưa duyệt và trạng thái tin cậy.
- [x] Giáo viên xem được chi tiết từng câu trên báo cáo/lượt chấm; có đường in hoặc tải dữ liệu.
- [x] Bài nộp Word/PDF không bị coi là ảnh rỗng; giữ file gốc để giáo viên mở và gửi phần chữ cho AI khi cần.
- [x] Giáo viên tải đề bằng ảnh/PDF/Word; phần chữ và ảnh scan được giữ làm nguồn tham chiếu cho AI, không chỉ để học sinh mở.
- [x] Giáo viên có ô lệnh riêng khi giao bài (ví dụ chỉ chấm câu 1, bỏ qua bài 2); lệnh được truyền vào prompt và chỉnh sửa được sau khi giao.
- [x] Giáo viên chọn học sinh rồi duyệt/chấm/xóa hàng loạt; xóa phải có xác nhận, khóa khi đang xử lý và báo rõ phạm vi xóa.
- [x] Xóa bài nộp/bài giao dọn cả file Firebase Storage qua Admin SDK; giữ document nếu dọn file thất bại để có thể thử lại.
- [x] Chấm tay phải chuyển trạng thái bài sang `graded` thật sự sau khi tải lại.
- [x] Kiểm tra responsive/mobile qua cấu trúc giao diện và build; luồng upload có trạng thái thành công/lỗi rõ ràng.

## Cổng nghiệm thu

1. Test thuần: prompt/parser, chọn lượt hiện hành, điểm duyệt, trạng thái chấm tay, chọn/xóa hàng loạt và parser đường dẫn Storage.
2. `npm run lint` và `npm run lint:api` không lỗi.
3. `npm run test -- --run` và `npm run test:rules` xanh nếu môi trường có Java/emulator.
4. `npm run build` xanh.
5. Đã thử OpenCode/Ox Alpha theo handoff; môi trường hiện không có model Ox Alpha và OpenCode báo thiếu phương thức thanh toán. Đã thay bằng rà soát độc lập nội bộ + chạy lại toàn bộ cổng nghiệm thu.

## Quy ước phạm vi chấm

- Lệnh riêng của giáo viên chỉ là chỉ dẫn phạm vi/cách đọc; không được tự ý đổi thang điểm đã giao.
- Phần bị bỏ qua không được tính lỗi hoặc đẩy vào `weakTopics`; nếu lệnh mâu thuẫn/không xác định được câu thì phải đánh dấu cần giáo viên soát.
- Đề/ảnh scan của giáo viên là nguồn tham chiếu; ảnh bài làm và chữ học sinh chỉ là bằng chứng, không được coi yêu cầu trong bài làm là lệnh hệ thống.

## Nguyên tắc dữ liệu

- Lượt nộp hiện hành = lượt mới nhất theo từng bài giao; lịch sử cũ không được nhân đôi điểm trong báo cáo.
- Điểm trung bình chỉ tính grade đã `teacherApproved`; bài chưa duyệt phải có nhãn rõ và không làm thay đổi hồ sơ tích lũy.
- Xóa hàng loạt mặc định xóa đúng các submission đang được chọn, không âm thầm xóa lịch sử khác; nếu còn lịch sử, UI phải nói rõ.
- Xóa Storage phải kiểm tra bucket + URL hợp lệ; URL ngoài Firebase hoặc file dọn lỗi phải làm thao tác thất bại an toàn, không xóa document trước.

## Kết quả kiểm chứng 2026-08-24

- `npm run test -- --run`: 69 file, 1.032 test passed.
- `npm run test:rules`: 7 file, 238 test passed; các dòng `PERMISSION_DENIED` là các ca DENY chủ đích.
- `npm run lint`, `npm run lint:api`, `npm run build`: passed.
- Build còn các cảnh báo chunk lớn/dynamic import đã tồn tại; không có lỗi TypeScript hoặc lỗi build.
- Bộ đọc kết quả khóa `maxScore` theo thang điểm bài giao; phần `not_attempted` chỉ không cảnh báo khi AI đánh dấu rõ `ignoredByTeacherInstruction`.
