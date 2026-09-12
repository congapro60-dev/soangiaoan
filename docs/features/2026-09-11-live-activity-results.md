# TV / HS — kết quả hoạt động trực tiếp

Phạm vi: thay đổi local trên codex/tv-presenter-followup, không chạy QA/test/build theo yêu cầu người dùng.

## Cách dùng

- GV hoặc TV điều khiển: bật **Hiện kết quả lớp** để công bố kết quả tổng hợp.
- Khi chuyển cue, TV chỉ nhận thống kê khớp responseStepId của hoạt động. Hoạt động không thu phản hồi không hiện bảng kết quả cũ.
- Lựa chọn / lỗi AI / tuyến học tập: biểu đồ cột theo số lượt chọn đã nhận.
- Bài viết / exit ticket: số người gửi; không tự suy ra đúng sai và không chiếu câu trả lời riêng.
- Làm nhóm (cp-group-product): GV thông báo nhóm số 1–12; HS chọn số nhóm đã được phân công. Đây là khai báo của HS, không phải chia nhóm tự động hay xác nhận phân công trên hệ thống.
- TV hiện mỗi nhóm có bao nhiêu thành viên đã chọn nhóm, bao nhiêu người gửi phản hồi hoạt động hiện tại. Đây là tiến độ nộp, không phải đánh giá hợp tác hay mức hiểu.

## Luồng dữ liệu

LiveActivityPublisher chỉ gắn ở nhánh owner đã xác thực (GV và tv-control).
Listener đọc phản hồi đã được máy chủ xác nhận, gom thay đổi và ghi public/stats bằng transaction kiểm tra lại cue đang dạy + quyền công bố.
groupMemberships/{uid} chỉ HS liên kết lớp được ghi chính mình; GV chủ phiên được đọc để tổng hợp.
public/groupProgress chỉ có cue, step và hai map số lượng theo số nhóm giới hạn 1–12; không chứa tên, UID hay bài làm.
TV chỉ đọc public projection. Nhóm hiển thị theo đúng cue/step và cờ công bố.

## Tương tác HS

- Chỉ báo gửi thành công sau xác nhận đồng bộ của đúng bước.
- Gợi ý hiển thị cục bộ; không ghi đè response cùng bước và làm mất lựa chọn tuyến. Lượt dùng gợi ý mới chưa được thu vào telemetry riêng.
- AI Error gộp loại lỗi và giải thích trong cùng giá trị JSON ở phản hồi text; bộ tổng hợp chỉ rút category thuộc danh sách cho phép, không công bố explanation.
- Sau đổi bước, lựa chọn và ô nhập được xóa trên màn hình để tránh gửi nhầm nội dung bước trước. Bài đã gửi vẫn lưu phía máy chủ.

## Nhịp 40 phút

cueStartedAt và cueElapsedSeconds được giữ trên parent/public state. Tạm dừng cộng thời gian đã chạy; tiếp tục dùng mốc mới và cộng tiếp; đổi cờ thống kê giữ nguyên clock. Khi chuyển cue, bắt đầu thời lượng của cue mới. Khoảng phút trên TV và HS là kế hoạch, không phải đánh giá tốc độ học sinh.
Parent/public state được cập nhật cùng transaction. Session cũ thiếu clock dùng mốc cũ cho đến lần điều khiển tiếp theo.

## Triển khai

Lô này cần push mã ứng dụng và deploy firestore.rules cùng phiên bản để clock và luồng chọn nhóm / tiến độ nhóm hoạt động.
Không dùng kết quả kiểm thử của các commit trước làm bằng chứng cho lô này.
Chưa bổ sung chia nhóm tự động, trưng bày bài làm được GV duyệt hoặc đánh giá chất lượng tự động.
