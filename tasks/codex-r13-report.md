# R13 — bản đồ gọn, từng câu/thẻ trong popup

Trạng thái: hoàn tất sửa giao diện và nghiệm thu local. Chưa phát hành.

## Thay đổi
- Bản đồ giữ tên học sinh, tiến độ cổng, một nút Lắc xúc xắc/Làm nhiệm vụ. Hai menu gom luật, Khám phá, phản hồi và tùy chọn camera; danh sách cổng/thẻ thu gọn.
- Mỗi popup hiện một nhiệm vụ. Trước/Tiếp chỉ đổi phần hiển thị; giữ mọi TaskInput mounted theo task ID, nên nháp chưa kịp lưu/gợi ý/suy nghĩ nhóm còn nguyên. Matching/classification/ordering vẫn là một nhiệm vụ có cùng checker.
- Câu thường, luyện lại và sự kiện được ưu tiên riêng. Thiết bị chung dùng cùng popup/pager, tách identity học sinh/hoạt động/lượt. Đổi học sinh vẫn theo hành vi cũ: editor riêng được reset, chỉ nháp đã lưu được khôi phục; không tuyên bố giữ nháp chưa lưu qua đổi người/đóng tab.
- Khám phá chỉ một thẻ đọc; Trước/Tiếp, bấm marker mở đúng thẻ, nhận mảnh giữ cơ chế R12. Không thêm câu hỏi hoặc nguồn nội bộ.
- Popup giữ footer chuyển câu ở ngoài vùng cuộn của câu. Nội dung dài cuộn trong hộp, không thu font/cắt công thức. Focus/Tab/Escape/background inert; pause/wait ưu tiên hộp hướng chú ý GV.
- 2D có marker; 3D dùng cùng menu HTML chọn cổng/thẻ và cùng popup. Cổng 3D trên canvas là cảnh quan, không tuyên bố có raycasting để bấm mọi cổng.

## Kiểm chứng đang cập nhật
- 1221 test đạt ứng viên trung gian. Kiểm cuối có thêm test nối callback chọn cổng.
- RED/GREEN `codex-r13-gate-red.log` / `codex-r13-gate-green.log`: bản trước thiếu callback thất bại, bản sửa 13/13 đạt.
- Review Flash core PASS `codex-r13-final-review-2026-10-13T03-17-04-948Z.json`; map PASS `codex-r13-map-final-review-2026-10-13T03-26-46-479Z.json`. Timeout và bản findings ban đầu giữ nguyên artifact; góp ý được đối chiếu bằng code/repro, không tính timeout là PASS.
- Browser trung gian: Câu 1/2 sang 2/2 và về, nháp 123 còn nguyên; duy nhất một câu; footer thấy trên 375px. Phát hiện lề body 8px và nút hidden bị CSS override, đã sửa. Đang QA build cuối.
- Chỉ UI, không sửa backend/học liệu/đáp án. Manifest nối R12, giữ 196 baseline source ngoài phạm vi. Native HTTP phải gắn đúng hash cuối.

## Giới hạn
- Local dữ liệu giả; chưa chứng minh thiết bị/lớp thật, 150 HS/40 phút, chấp nhận thẩm mỹ 3D hoặc duyệt học liệu theo năm/nguồn. Hai citation Gemini lịch sử vẫn có gate riêng.
- R10–R13 chưa phát hành. Production version7 giữ nguyên; duyệt phát hành theo kế hoạch chung 19.9.

QA phát hiện ngoài phạm vi: `content/lessons/g11-sequences-p1.json:337` biến thể luyện có 12 hàng nhưng label tại dòng 350 giữ 25 hàng. Bản R12 đã có đúng lỗi này; chưa sửa học liệu/đáp án theo yêu cầu giữ nội dung. Cần chủ hệ thống duyệt riêng bản sửa label.

Bản đầy đủ 1222/1222 tests đạt; sau chỉnh vùng menu/focus thêm 52 map tests + 39 UI tests đạt. Typecheck/build đạt; lint toàn ứng viên 0 lỗi/392 warnings còn sẵn; scoped lint 0 lỗi/0 warnings. Broader CUA worker và ảnh lưu riêng trong `codex-r13-browser-checks.json`; không lấy QA hash cũ làm bằng chứng runtime cuối.

## Chốt bằng chứng
201 source byte-match. Worker `31f903ab69b2a63eae3aa93b3abd902adadc8250d189f3af57d88011fe0dd653`, native 109 HTTP và browser server cùng hash. Bằng chứng `tasks/codex-r13-evidence.json`. CUA cuối 375: page 812/812/375, một câu, nháp 23 còn nguyên, footer thấy, Escape focus Menu; chọn cổng bằng chạm mở một câu luyện. Broad CUA 3D/thẻ/nhận mảnh/shared/pause trước hai chỉnh nhỏ cuối (chiều cao menu, focus fallback); không gán broad evidence cho hash cuối. Ảnh tiền tố `r13-approved-candidate-*` thuộc hash cuối.
