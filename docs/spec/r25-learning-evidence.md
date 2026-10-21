# R25 — Bằng chứng học tập cuối tiết

## Mục tiêu

Cho GV xử lý phiếu ra cửa sau tiết học, xem thống kê đạt/chưa đạt, cho HS xem kết quả cá nhân và tự đánh giá Must/Should/Could. Phản tư không tính vào kết quả kiến thức.

## Phạm vi

- Batch AI chấm các bài mở/phiếu ra cửa đang `pending`, có nút GV bấm, consent rõ, retry/idempotency, audit.
- AI chỉ tạo đề xuất `criteriaMet`/feedback; GV duyệt hoặc sửa trước khi ghi kết quả.
- Thống kê cuối tiết: tổng số HS, đã nộp, đạt, chưa đạt, chờ GV/AI.
- HS thấy kết quả của chính mình; không thấy đáp án, rubric nội bộ, hay kết quả bạn khác.
- HS gửi tự đánh giá ba mức Must/Should/Could; dữ liệu lưu trong session và hiện cho GV, không tự ghi thành mastery.

## Ngoài phạm vi

- Không tự cấp mastery/năng lực từ AI.
- Không chấm lại bài trắc nghiệm đã tự động chấm.
- Không gửi AI khi provider bị tắt/chưa consent.
- Không đồng bộ GiaoAnDewey trong lô này.

## Tiêu chí nghiệm thu

1. API `assessment` với `action:preview/propose` chỉ chọn submission pending hợp lệ, giới hạn kích thước, không lộ token/đáp án mẫu.
2. Provider-off trả trạng thái rõ, không đổi submission.
3. Provider đề xuất không tự đổi kết quả; GV approve/reject/sửa được.
4. Retry cùng request ID không nhân đôi đánh giá/audit.
5. Thống kê chịu đúng mẫu số và loại bài chưa nộp.
6. Student projection chỉ trả kết quả của learner đó + tự đánh giá của learner đó.
7. `SELF_ASSESS` kiểm đúng ba mức, mỗi mức một giá trị hợp lệ, chống giả learnerId.
8. Full test, typecheck, lint, build; route/privacy tests; fake 150 learner fixture.

## Ràng buộc

Giữ WIP; không đụng V7; không AI thật trong test; không đổi approval guard của game plan. Theo chỉ đạo mới ngày 19/10: dùng native Astra xhigh và subagents, bỏ điều phối AI/9router. Chưa phát hành lô R25.

## Contract chốt sau review

- `selfAssessments[learnerId] = {must, should, could, updatedAt}`; mỗi mức enum `not_started|working|met`, ghi từ `actor.id`, không nhận learnerId từ payload.
- `SELF_ASSESS` payload `{levels:{must,should,could}}`; student-only; event replay/idempotency theo event receipt.
- `ASSESS_BATCH_APPLY` payload `{requestId, assessments:[{submissionId,criteriaMet,feedback}]}`; teacher-only; max 100; chỉ pending; cùng request replay không nhân đôi; kết quả GV duyệt mới đổi submission.
- Stats: `total` = roster present; `submitted` = unique present learners có exit submission, không tính reflection/practice; lấy bài mới nhất mỗi câu. `passed` chỉ khi đủ mọi câu và đúng; `pendingTeacher` có bài chờ chấm; `incomplete` chưa đủ câu, không có bài chờ chấm; `notPassed` đã chấm đủ nhưng chưa đạt. Tỉ lệ đạt trên số đã nộp, ghi rõ mẫu số.
- AI prompt gửi task text + answer + tiêu chí rubric.criteria hiển thị trong preview GV duyệt. Không gửi answerKey/lookFor, ID nội bộ hoặc khóa truy cập. Thay tên/ID khớp roster không bảo đảm xóa mọi thông tin cá nhân trong câu trả lời tự do; GV cần xem dữ liệu trước khi gửi. Provider off/thiếu consent trả lỗi, không đổi state. AI output luôn proposal chờ GV apply.
- Retry job failed dùng atomic status transition; ready replay không gọi provider lần hai; running không khởi chạy trùng.
