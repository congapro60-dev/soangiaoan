# Nộp bài đã chấm cho học sinh chưa nộp — Design Specification

## 1. Mục tiêu
Cho phép Giáo viên (GV) nộp trực tiếp bài làm đã chấm tay (ảnh/PDF có điểm/bút đỏ) cho học sinh trong danh sách **Chưa nộp** (`chuaNop`), AI tự động quét điểm ghi tay của giáo viên (`teacherMarkedScore`), thiết lập điểm số chính thức, tự duyệt và đồng bộ ngay vào báo cáo, thống kê và hồ sơ học sinh.

## 2. Bối cảnh & Hiện trạng
- Hiện tại: GV chỉ có thể nộp bản chấm tay (`HandMarkedWork`) hoặc sửa điểm (`GradeReviewModal`) khi bài nộp của học sinh đã tồn tại (`s` trong `baiNop`).
- Ở danh sách học sinh chưa nộp (`chuaNop` trong `AssignmentPanel.tsx`): chỉ có nút **"Nộp hộ"** (`ActorSubmissionUpload`). Nút này tạo submission thô và chờ AI chấm thông thường (`teacherApproved: false`), không nhận diện bài đã chấm tay sẵn.
- Yêu cầu người dùng: Thêm nút **"Nộp bài đã chấm"** ngay tại học sinh chưa nộp. Khi gửi lên, AI tự quét điểm số/chữ đỏ GV ghi trên giấy, gán làm điểm bài làm, tự duyệt điểm, đưa vào thống kê điểm TB, tiến độ và báo cáo lớp/học sinh.

## 3. Kiến trúc & Luồng dữ liệu (Architecture & Data Flow)

### 3.1. Giao diện (UI) — `AssignmentPanel.tsx` & `ActorSubmissionUpload.tsx`
1. Tại hàng học sinh chưa nộp (`chuaNop.map(hs => ...)`):
   - Bên cạnh nút `"Nộp hộ"` (`button text-indigo-700`), bổ sung nút **"Nộp bài đã chấm"** (`button border-emerald-300 bg-emerald-50 text-emerald-800`).
   - State `proxyHandMarked: boolean` được lưu khi bấm nút.
2. `ActorSubmissionUpload.tsx`:
   - Thêm prop `handMarked?: boolean`.
   - Tiêu đề modal: `"Nộp bài đã chấm tay"` (thay vì `"Nộp bài hộ học sinh"`).
   - Nút submit: `"Nộp bài đã chấm"` (thay vì `"Nộp bài"`).
   - Khi gửi gọi `submitActorSubmission` với trường `handMarked: true`.

### 3.2. API Backend — `api/_submission-actors.ts`
- Trong `handleSubmissionActorAction` (`action === 'submitActorSubmission'`):
  - Nhận `body.handMarked === true` (chỉ cho phép khi `actor.role === 'teacher'`).
  - Ghi nhận `handMarkedPaper: true` vào document `submissions/{submissionId}`.

### 3.3. AI Grading Engine — `api/grade-homework.ts`
1. Trong `gradeContextFor` hoặc `gradeOneSubmission`:
   - Kích hoạt `teacherMarkedPaper: true` khi `Boolean(previous.handMarkedPaper)`.
   - Prompt `buildHomeworkGradingPrompt` tự động bổ sung chỉ dẫn đọc tổng điểm viết tay `teacherMarkedScore`.
2. Khi AI phân tích xong:
   - Nếu `ctx.teacherMarkedPaper && parsed.grade.teacherMarkedScore`:
     - Điểm chính thức `grade.score = parsed.grade.teacherMarkedScore.score`.
     - `grade.maxScore = parsed.grade.teacherMarkedScore.maxScore`.
   - Nếu AI không thấy điểm tổng viết tay: sử dụng điểm AI chi tiết từng câu làm fallback.
   - Với `previous.handMarkedPaper === true`:
     - Tự động gán `grade.teacherApproved = true` và `grade.approvalSource = 'teacher'`.
     - Đồng bộ minh chứng ngay bằng `syncApprovedGradeEvidence(db, ...)`.
     - Tự động kích hoạt `handMarkedPublished: true` trên submission.

### 3.4. Báo cáo & Thống kê
- Vì submission được lưu với trạng thái `graded`, `grade.score` và `teacherApproved: true`:
  - `AssignmentPanel`: Chuyển học sinh từ danh sách `chuaNop` sang `baiNop`, hiển thị điểm số, badge "Đã duyệt" và đếm vào `soHsDaNop`.
  - `ClassesTab`: `tienDoThat` tăng số bài đã nộp, `showClassReport` tính điểm TB và sĩ số nộp.
  - `StudentReport`: Đếm vào số bài đã nộp, tính điểm vào Điểm trung bình, hiển thị trong danh sách bài đã chấm và cập nhật chủ đề vào hồ sơ tích lũy.

## 4. Ngăn ngừa xung đột (Conflict Prevention)
- Tính năng chạy trong worktree độc lập `nop-bai-da-cham` trên branch `feat/nop-bai-da-cham`.
- Không can thiệp vào các branch hay worktree khác (`feat/toan-final-template`, `vi-ai-chip-popup`, `feat-nang-luc-hoso`).
- Đảm bảo an toàn phân quyền: Chỉ giáo viên (`actor.role === 'teacher'`) mới được gắn cờ `handMarked: true`.
