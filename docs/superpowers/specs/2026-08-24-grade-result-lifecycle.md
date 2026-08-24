# Vòng đời kết quả chấm — 2026-08-24

## Trạng thái

Thiết kế đã được người dùng duyệt. Đây là addendum cho classroom grading, không phải migration dữ liệu production.

## Mục tiêu

Cho giáo viên sửa điểm bằng tay, yêu cầu AI chấm lại hoặc xóa riêng kết quả chấm mà không xóa bài nộp, ảnh, file, ghi chú hay lịch sử của học sinh 11 Columbus.

## Ranh giới dữ liệu

- `submissions/{submissionId}` vẫn là bản ghi bài nộp và không bị xóa khi giáo viên xóa điểm.
- `fileUrls`, `attachments`, `textContent`, `note`, `studentId`, `assignmentId`, `createdAt` và Storage objects được giữ nguyên trong thao tác xóa điểm.
- Kết quả chấm cũ được ghi append-only vào collection server-only `submissionGradeHistory` trước khi sửa, xóa hoặc thay bằng AI.
- Không chạy migration và không đọc/ghi hàng loạt dữ liệu production khi deploy.
- Hồ sơ `studentProfiles.topics` và `studentSkillEvidence` phải được rebuild theo kết quả hiện hành; xóa điểm thì gỡ evidence của submission đó.

## Contract thao tác

### Sửa điểm bằng tay

Server xác thực token giáo viên và quyền sở hữu submission, kiểm tra điểm trong `[0, maxScore]`, giới hạn độ dài text và lưu bản grade cũ vào lịch sử. Grade mới có `editedByTeacher: true` và `teacherApproved: false`; giáo viên phải bấm `Duyệt điểm` lại vì nội dung đã thay đổi.

### Xóa điểm

`deleteSubmissionGrade` chỉ xóa field `grade`, đặt trạng thái về `submitted`, xóa lỗi cũ và gỡ evidence. Submission/document/file vẫn còn để chấm lại hoặc đối chiếu. Nếu submission đang `grading`, thao tác bị từ chối để tránh race.

### Chấm lại bằng AI

Dùng route `grade-homework` hiện có, không tạo Vercel Function mới. Trước khi thay grade cũ, server ghi snapshot lịch sử. Grade AI mới luôn `teacherApproved: false`. Nếu gọi AI hoặc parse thất bại, grade hiện hành cũ vẫn được giữ nguyên; không biến một điểm hợp lệ thành 0 hoặc mất điểm.

## UI

- Giữ `Chấm lại bằng AI` và `Sửa điểm`.
- Thêm `Xóa điểm` riêng với xác nhận rõ: “Xóa kết quả chấm, giữ nguyên bài nộp và file”.
- Giữ `Xóa lượt nộp` là thao tác khác, có cảnh báo xóa document/Storage.
- Sau sửa tay hoặc AI chấm lại, hiển thị rõ `Chờ duyệt`.
- Nội dung nhận xét gửi học sinh phải dùng tiếng Việt giáo dục tự nhiên; không hiển thị ghi chú nội bộ của giáo viên.

## Bảo mật và đồng bộ

- Chỉ giáo viên sở hữu submission được gọi thao tác grade lifecycle.
- History không đọc/ghi được từ client; chỉ Admin SDK dùng trong API.
- Các thao tác cập nhật grade gọi cùng server-side evidence rebuild, không dựa vào hai phép ghi client rời nhau.
- Không thêm endpoint mới; gộp action vào `api/classroom.ts` và dùng `api/grade-homework.ts` hiện có.

## Tiêu chí nghiệm thu

1. Sửa tay lưu history, cập nhật grade và buộc duyệt lại.
2. Xóa điểm giữ nguyên toàn bộ submission/files/Storage, xóa grade hiện hành và gỡ evidence.
3. AI regrade lưu history; thành công tạo grade chưa duyệt; thất bại giữ grade cũ.
4. Cross-teacher, submission đang grading và payload điểm không hợp lệ đều bị từ chối.
5. Student projection không lộ history hoặc teacher-only fields.
6. Unit, rules, lint, build và diff checks đạt; Ox Alpha/OpenCode audit production bằng phiên thật không được ghi PASS nếu provider hoặc auth bị chặn.
