# HS: giữ nháp và hỗ trợ diễn đạt

Sửa local trên codex/student-drafts-language-support. Không chạy QA/test/build theo yêu cầu chủ sở hữu; chưa push hoặc triển khai.

- Nháp lưu trên thiết bị khi gõ/chọn, khóa gồm session + Firebase uid + response step, phiên bản v1. Khôi phục nháp tối đa 7 ngày; không tự gửi khi khôi phục.
- Chuyển bước không chép nháp bước trước sang bước mới. Nháp cũ có phần xem lại, không cho tự đổi cue hoặc gửi bài bước khác. Nếu localStorage lỗi, giữ nháp trong bộ nhớ của tab và báo rõ giới hạn.
- Bài đã gửi và nháp mới được phân biệt bằng nội dung đã đưa vào hàng đợi. Sửa nháp không được báo là nội dung mới đã gửi thành công.
- Hỗ trợ ngay vùng phản hồi: từ khóa theo hoạt động, định nghĩa Việt + phần dịch đã có, nói thử, khung câu có chỗ trống, tự diễn đạt khi ẩn hỗ trợ. Có khung diễn đạt Việt/Anh cho mục tiêu, lập luận, hoạt động nhóm, post-check, exit ticket.
- Post-check/exit giữ làm độc lập: chỉ khung trình bày chung, không đưa lời giải/ví dụ của câu đang làm.
- Chèn khung vào vị trí con trỏ mà không thay thế phần HS đã viết; quá giới hạn thì báo, không cắt mất bài.
- Cuối tiết hiện mục tiêu cá nhân từ document phản hồi của chính HS (listener đơn, không đọc danh sách phản hồi của lớp). Nếu chưa đọc được máy chủ, nháp riêng được ghi rõ là chưa xác nhận đã gửi. Thiếu mục tiêu không tự bịa.
- Bộ chọn ngôn ngữ nói đúng mức hỗ trợ một phần; JA/KO/ZH chưa có nội dung thì không cho chọn như đã dịch. Preference cũ vẫn có thông báo giữ tiếng Việt. Chế độ full cũ chuyển về bilingual trong luồng HS hiện tại.
- Các nhiệm vụ tuyến/tiêu chí chưa được dịch đầy đủ. Đây không phải bộ dịch toàn bộ bài hay hệ thống tự chẩn đoán nhu cầu ngôn ngữ.

Không thay Firestore Rules; dùng quyền đọc phản hồi riêng đã có. Nháp chỉ lưu trên thiết bị, không đồng bộ nháp qua các máy.
