# Nghiên cứu chấm trên ảnh — 13/10/2026

Yêu cầu: đánh dấu như bút đỏ trên ảnh HS; chạm dấu mở lời chữa; tránh rối và khó đọc.
Chỉ nghiên cứu, chưa được yêu cầu triển khai.

## Kết luận

Khả thi. Chọn lớp đánh dấu bật/tắt phủ trên ảnh gốc, không sửa hay xoá ảnh gốc.
Mặc định đánh dấu gọn: số hoặc khoanh/gạch ngắn cạnh lỗi, không viết cả lời chữa lên ảnh.
Mỗi dấu liên kết một QuestionResult: studentAnswer, errorType, explanation, correction.
HS chạm dấu thì vùng ảnh tương ứng nổi bật, lời chữa mở ở dưới (điện thoại) hoặc cạnh ảnh (màn rộng).
Dùng số/ký hiệu kèm màu để không phụ thuộc riêng màu đỏ. Có danh sách lời chữa thay thế cho chạm ảnh.

## Những điểm quyết định chất lượng

- Hiện có lời chữa theo câu nhưng chưa có page/image ID và tọa độ lỗi; không thể gắn đúng vị trí chỉ bằng số câu.
- Ảnh nghiêng, mờ, cắt trang: AI có thể chỉ sai dòng dù lời chữa đúng. Cần GV soát vị trí, không tự công bố dấu.
- Lưu tọa độ theo tỉ lệ của ảnh gốc cùng định danh ảnh bất biến; đổi zoom/khổ màn hình vẫn đúng vị trí.
- Chỉ gọi là dấu GV khi GV đặt hoặc duyệt. Gợi ý AI phải có nhãn nguồn khi GV xem.
- Dấu chấm, đáp án và lời chữa giữ cùng cổng duyệt điểm; HS xem ảnh gốc ngay sau nộp.
- Thông tin mỗi dấu chỉ gồm lỗi liên quan. Ưu tiên một dấu mỗi lỗi có ích, không đánh đỏ từng chữ/câu đúng.

## Ba phương án

1. GV đặt dấu + chọn câu đã có lời chữa: định vị chắc, ít rủi ro; thêm thao tác GV.
2. AI gợi ý dấu, GV chỉnh và duyệt: nhanh hơn khi định vị tốt; cần thử với bài thật trước.
3. AI vẽ lại ảnh: không khuyến nghị, dễ đổi nét/công thức gốc và khó sửa/xoá dấu độc lập.

## Thử nghiệm trước khi mở rộng

Thử trên vài bài thật gồm rõ/mờ/nhiều trang. Kiểm số dấu đặt đúng vùng, thời gian GV soát so với hiện tại,
HS tìm được lỗi và đọc công thức trên điện thoại, bật/tắt dấu, ảnh cũ không đổi, lời chữa chưa duyệt không lộ.
Chưa có số đo để hứa giảm thời gian. Nếu GV phải sửa vị trí quá nhiều, giữ đặt dấu thủ công.

## Mẫu đã QA 13/10

Đã làm mẫu độc lập (không sửa mã bút đỏ trong app): red-pen-prototype.html trong thư mục visualizations của chat.
Tương tác đúng trang, zoom 150% giữ tọa độ, nút 44px, 390px không tràn ngang; đã sửa cuộn tới lời chữa và quay lại dấu.
Chưa thử AI thật, lưu dấu hay server projection. Dữ liệu mẫu ở HTML nên không chứng minh cổng duyệt an toàn.
Chi tiết và giới hạn: tasks/qa-student-photos-red-pen-20261013.md.
