# Vòng đời kết quả chấm — Implementation Plan

> **Mục tiêu:** thêm sửa điểm, xóa kết quả chấm và AI chấm lại theo hướng bất biến lịch sử, không làm mất bài nộp của học sinh.

## Task 1: Contract và test đỏ

**Files:**

- Modify: `src/lib/classroom/types.ts`
- Create/Modify: `api/__tests__/classroom-grade-lifecycle.test.ts`
- Create/Modify: `api/__tests__/grade-homework.regrade.test.ts`
- Modify: `src/lib/classroom/manualGrade.test.ts` hoặc tạo test tương ứng
- Modify: `tasks/todo.md`

- [x] Thêm type lịch sử grade và các invariant cần test.
- [x] Test sửa tay lưu snapshot, grade mới chưa duyệt.
- [x] Test xóa grade giữ nguyên evidence bài nộp và không gọi Storage cleanup.
- [x] Test AI regrade thành công lưu grade cũ; AI thất bại giữ grade cũ.
- [x] Test ownership, trạng thái `grading`, điểm ngoài khoảng và payload quá dài.
- [x] Chạy targeted regression tests sau implementation: 9/9 xanh.

## Task 2: Server-side grade lifecycle

**Files:**

- Modify: `api/classroom.ts`
- Modify: `api/grade-homework.ts`
- Modify: `src/lib/classroom/submissionService.ts`
- Modify: `src/services/gradingApi.ts`
- Modify: `firestore.rules` nếu cần explicit deny cho history

- [x] Thêm helper xác thực submission/grade và ghi append-only history.
- [x] Thêm action server `saveSubmissionGrade` và `deleteSubmissionGrade` vào `classroom.ts`.
- [x] Đồng bộ legacy topics + canonical skill evidence trên server.
- [x] Làm AI regrade non-destructive và có guard chống stale write.
- [x] Giữ nguyên `deleteSubmission` hiện có cho thao tác xóa toàn bộ bài.

## Task 3: UI và copy

**Files:**

- Modify: `src/components/features/classroom/AssignmentPanel.tsx`
- Modify: `src/components/features/classroom/GradeReviewModal.tsx`
- Modify: `src/components/features/classroom/student/StudentAssignmentCard.tsx` nếu projection cần xử lý trạng thái
- Modify: `src/lib/classroom/submissionSelection.ts` nếu selection cần phân biệt delete-grade

- [x] Thêm nút `Xóa điểm` tách khỏi `Xóa lượt nộp`.
- [x] Cập nhật copy cảnh báo và trạng thái chờ duyệt bằng tiếng Việt giáo dục.
- [x] Sau mỗi action reload dữ liệu thật, không dựng grade giả từ state cũ.
- [x] Chặn thao tác khi bài đang `grading`, hiển thị lỗi và next action.

## Task 4: Verification

- [x] Targeted unit/API tests xanh.
- [x] Full `npm test -- --run`, `test:rules`, `lint`, `lint:api`, `build`, `git diff --check`.
- [x] Ox Alpha Free/OpenCode audit đã được gọi bằng model `opencode/x-preview-f-free`; provider kết thúc `Endpoint is unavailable`, nên không nhận verdict PASS.
- [ ] Production E2E bằng phiên giáo viên thật; không xóa điểm thật của 11 Columbus, dùng fixture/test submission cho ca phá hủy.
- [ ] Review diff, fetch `origin/main`, merge/push/deploy only after all gates.
