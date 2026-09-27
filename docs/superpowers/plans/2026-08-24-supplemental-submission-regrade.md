# Bổ sung ảnh sau khi chấm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép học sinh bổ sung ảnh còn thiếu sau khi đã nộp/chấm, tạo revision mới ghép toàn bộ evidence cũ + mới và chấm lại trọn bài mà không phá lịch sử.

**Architecture:** Lượt bổ sung là một submission mới có `supplementOf`. Client chỉ upload file mới; server xác thực parent cùng học sinh/lớp/bài, tạo revision chứa danh sách file đã ghép, rồi luồng `gradeOne` hiện có chấm revision đó như một bài đầy đủ. Delete submission sẽ không dọn Storage URL còn được revision khác tham chiếu.

**Tech Stack:** React + TypeScript + Firebase Firestore/Storage + Vercel `/api/classroom` và `/api/grade-homework` + Vitest + Firestore emulator.

---

### Task 1: Chốt contract và spec

**Files:**
- Modify: `docs/superpowers/specs/2026-08-24-skill-mastery-bridge-design.md`
- Create: `docs/superpowers/plans/2026-08-24-supplemental-submission-regrade.md`
- Modify: `tasks/todo.md`

- [x] **Step 1: Ghi addendum đã duyệt** — nêu rõ revision mới, ghép ảnh server-side, chấm lại toàn bộ, giữ lịch sử, assignment phải còn mở, không tự duyệt điểm.
- [x] **Step 2: Tự rà spec/plan** — bảo đảm `supplementOf`, `createSupplementSubmission`, file ghép và phạm vi delete/grade dùng cùng một tên contract.

### Task 2: Viết test đỏ cho pure contract và backend invariants

**Files:**
- Modify: `src/lib/classroom/types.ts`
- Modify: `src/lib/classroom/submissionSelection.test.ts` hoặc tạo test helper riêng nếu cần
- Create/Modify: `api/__tests__/classroom-supplement.test.ts`
- Modify: `api/__tests__/classroom-delete-handlers.test.ts`
- Modify: `tests/rules/lopHoc.rules.test.ts` nếu rules có thêm field

- [ ] **Step 1: Test ghép revision** — parent có `[old-1, old-2]`, incoming có `[new-1]`; kết quả revision phải giữ đúng thứ tự và không trùng URL.
- [ ] **Step 2: Test quyền tạo revision** — parent khác học sinh/lớp/giáo viên/bài giao trả `403`, parent đúng tạo submission `submitted` không có `grade`.
- [ ] **Step 3: Test delete không dọn file dùng chung** — xóa parent khi child còn tham chiếu URL cũ thì parent bị xóa nhưng URL chung không bị dọn; URL chỉ thuộc parent vẫn được dọn.
- [ ] **Step 4: Chạy test đỏ**

```powershell
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" exec vitest run api/__tests__/classroom-supplement.test.ts api/__tests__/classroom-delete-handlers.test.ts
```

Expected: FAIL vì chưa có field/action/helper mới.

### Task 3: Triển khai contract, server action và Storage safety

**Files:**
- Modify: `src/lib/classroom/types.ts`
- Modify: `src/lib/classroom/submissionService.ts`
- Modify: `api/classroom.ts`
- Modify: `api/grade-homework.ts` nếu cần chỉ để giữ validation/lineage khi grade
- Modify: `firestore.rules`

- [x] **Step 1: Thêm `supplementOf?: string` vào `SubmissionDoc` và input submit.** Submission thường giữ nguyên; supplement gửi `action: 'createSupplementSubmission'`.
- [x] **Step 2: Tạo server action `createSupplementSubmission`.** Xác thực anonymous student link, parent cùng `studentId/classId/teacherId/assignmentId`, chỉ nhận file mới từ submission đang tạo, ghép `fileUrls`/`attachments`/`textContent`, tạo revision `submitted` không có grade.
- [x] **Step 3: Giữ action idempotent và fail-closed.** Không cho overwrite document đã có; không tin `studentId/teacherId/classId` từ client nếu lệch link; không trả answer key/private teacher note.
- [x] **Step 4: Sửa delete Storage.** Trước khi dọn URL của submission, đọc các submission khác cùng phạm vi và loại URL còn được tham chiếu; chỉ xóa document nếu Storage cleanup an toàn.
- [x] **Step 5: Mở rộng Firestore create schema đúng một field lineage** và vẫn cấm client gắn `grade`/đổi định danh.
- [x] **Step 6: Chạy test xanh cho backend trước khi sửa UI.**

### Task 4: Luồng học sinh bổ sung và chấm lại

**Files:**
- Modify: `src/pages/StudentPortalPage.tsx`
- Modify: `src/components/features/classroom/student/StudentAssignmentCard.tsx`
- Modify: `src/components/features/classroom/student/StudentPortalDashboard.tsx`
- Modify: `src/lib/classroom/portalViewModel.ts` nếu cần đổi label/action

- [x] **Step 1: Truyền `supplementOf` từ card.** Với assignment đã `graded` hoặc `waiting`, nút hiển thị `Bổ sung ảnh và chấm lại`; retry do lỗi vẫn là nộp lại thường.
- [x] **Step 2: Giữ target assignment + parent submission trong queue.** Không cho trộn queue thường với queue bổ sung hoặc khác assignment; sign-out/thành công/xóa hết queue phải reset cả hai ref.
- [x] **Step 3: Gọi submit revision.** Sau upload file mới, server trả revision đã ghép toàn bộ evidence; lỗi vẫn giữ queue để retry.
- [x] **Step 4: Sau thành công, cho `Tự chấm lại toàn bộ` hoặc `Gửi thầy cô chấm`.** Gọi `gradeOne` bằng revision ID; không tự đặt `teacherApproved`.
- [x] **Step 5: Hiển thị rõ trong queue rằng ảnh cũ + ảnh mới sẽ được chấm lại toàn bộ.**
- [x] **Step 6: Chạy targeted UI/typecheck tests.**

### Task 5: Regression QA và handoff

**Files:**
- Modify: `tasks/todo.md`
- Modify: `tasks/session_2026-08-24-classroom-learning-loop.md`

- [x] **Step 1: Chạy targeted tests** cho supplement, delete, selection, upload queue và portal view model.
- [x] **Step 2: Chạy full unit, rules, frontend/API lint, `git diff --check`.**
- [x] **Step 3: Chạy `npm run build` và ghi nhận chunk warnings nếu chỉ là baseline.**
- [ ] **Step 4: Nhờ Ox Alpha Free/OpenCode CLI audit read-only combined diff; đối chiếu độc lập, không tin báo cáo nếu chưa có lệnh/test output.**
- [ ] **Step 5: Browser E2E với tài khoản hợp lệ nếu được xác nhận tại thời điểm nhập; tối thiểu kiểm tra card đã chấm → bổ sung ảnh → queue → submit/regrade.**
- [ ] **Step 6: Cập nhật checklist và báo cáo chính xác; không push/deploy nếu chưa có lệnh riêng.**
