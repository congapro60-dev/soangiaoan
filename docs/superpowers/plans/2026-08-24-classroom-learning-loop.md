# Classroom Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đóng vòng bài tập → profile → practice có thể làm/chấm/lưu, đồng thời bảo vệ assignment đang hoạt động bằng các thay đổi tương thích ngược.

**Architecture:** Mở rộng profile bằng evidence refs optional, thêm practice collections và actions vào các API hiện có, dùng assignment projection server-side cho cổng học sinh, và thêm recovery cho trạng thái grading cũ. Không thêm Vercel function và không thay đổi contract submission.

**Tech Stack:** React + TypeScript + Vite + Firebase Firestore/Storage + Firebase Admin + Vercel function hiện có + Vitest + Firestore emulator.

---

### Task 1: Khóa logic profile evidence

**Files:**
- Modify: `src/lib/classroom/types.ts`
- Modify: `src/lib/classroom/profileMerge.ts`
- Test: `src/lib/classroom/profileMerge.test.ts`

- [ ] **Step 1: Viết test đỏ** cho ba hành vi: bỏ qua topic không được đánh giá, nộp lại cùng assignment không tăng evidence, strengths được lưu ở mức solid có bằng chứng.
- [ ] **Step 2: Chạy** `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" exec vitest run src/lib/classroom/profileMerge.test.ts` và xác nhận test mới fail vì API/logic hiện tại chưa có.
- [ ] **Step 3: Thêm type optional** `ProfileEvidenceRef` và mở rộng `ProfileTopic`/`ApplyEvidenceInput` mà không xóa `evidenceSubmissionIds`.
- [ ] **Step 4: Implement** merge/remove theo `assignmentId` khi có, giữ legacy fallback khi không có; không downgrade/xóa topic chỉ vì topic vắng trong bài mới; thêm `strengths` vào evidence với `solid`.
- [ ] **Step 5: Chạy lại test profile** và toàn bộ test classroom liên quan.

### Task 2: Nối approval/manual grade với profile mới

**Files:**
- Modify: `src/lib/classroom/submissionService.ts`
- Modify: `api/classroom.ts`
- Test: `api/__tests__/classroom-core.test.ts`, `api/__tests__/classroom-delete-handlers.test.ts`

- [ ] **Step 1: Viết test đỏ** cho approve/manual grade/delete bằng `assignmentId` và strengths.
- [ ] **Step 2: Chạy test mục tiêu**, xác nhận fail hoặc thiếu assertion cần thiết.
- [ ] **Step 3: Truyền đúng metadata** từ submission/assignment vào `applyEvidence`, giữ teacher approval là cổng duy nhất.
- [ ] **Step 4: Cập nhật delete evidence** để xóa đúng evidence ref của submission mà không xóa topic do assignment khác.
- [ ] **Step 5: Chạy test API mục tiêu và lint API.**

### Task 3: Practice set/attempt backend

**Files:**
- Modify: `src/lib/classroom/types.ts`
- Modify: `src/lib/classroom/gradingPrompt.ts`
- Modify: `api/grade-homework.ts`
- Modify: `src/services/gradingApi.ts`
- Test: `api/__tests__/grade-homework.dispatch.test.ts`, `src/lib/classroom/gradingPrompt.test.ts`

- [ ] **Step 1: Viết test đỏ**: practice response không có solution; submitPractice kiểm ownership, lưu attempt và trả kết quả có trạng thái.
- [ ] **Step 2: Chạy test mục tiêu và ghi nhận failure đúng nguyên nhân.**
- [ ] **Step 3: Tách public practice question khỏi private practice key; thêm `practiceSets`, `practiceKeys`, `practiceAttempts` types.
- [ ] **Step 4: Implement** action `practice` lưu set/key; action `submitPractice` đọc key bằng Admin SDK, chấm có giới hạn quota self, lưu attempt và thêm formative evidence an toàn.
- [ ] **Step 5: Chạy unit/API tests và kiểm response không chứa solution.**

### Task 4: Student practice UI không làm ảnh hưởng upload

**Files:**
- Modify: `src/pages/StudentPortalPage.tsx`
- Modify: `src/components/features/classroom/student/StudentPortalDashboard.tsx`
- Modify: `src/services/gradingApi.ts`
- Test: UI/component tests hiện có hoặc test helper mới trong `src/lib/classroom/`

- [ ] **Step 1: Viết test cho answer input, submit, reload state và solution chỉ hiện sau kết quả.**
- [ ] **Step 2: Chạy test đỏ.**
- [ ] **Step 3: Thêm state riêng cho practice, không dùng chung `uploadRef`, `targetRef`, `dangNop` hoặc submission state.
- [ ] **Step 4: Implement input trả lời, gọi submitPractice, hiển thị feedback và trạng thái đang chấm; giữ nguyên `xuLyChonFile` và `submitHomework`.
- [ ] **Step 5: Chạy test/UI lint và kiểm tra mobile layout bằng local browser sau preflight.**

### Task 5: Student-safe assignment projection

**Files:**
- Modify: `api/classroom.ts`
- Modify: `src/pages/StudentPortalPage.tsx`
- Modify: `src/lib/classroom/types.ts`
- Modify: `firestore.rules`
- Test: `tests/rules/lopHoc.rules.test.ts`, API tests classroom

- [ ] **Step 1: Viết test đỏ** cho projection không chứa answer/rubric/instructions và chỉ trả assignment mở của đúng student link.
- [ ] **Step 2: Implement action `studentAssignments` trên route classroom hiện có; không tạo function mới.
- [ ] **Step 3: Chuyển client assignment load sang action mới; giữ query submissions/profile hiện có.
- [ ] **Step 4: Chạy rules/API tests; chỉ siết direct assignment read sau khi client path đã qua test, tránh làm assignment đang giao trắng màn hình.

### Task 6: Recovery submission bị kẹt grading

**Files:**
- Modify: `api/grade-homework.ts`
- Modify: `src/lib/classroom/portalViewModel.ts`
- Test: `api/__tests__/grade-homework.dispatch.test.ts`, `src/lib/classroom/portalViewModel.test.ts`

- [ ] **Step 1: Viết test đỏ**: `grading` mới không bị retry; `grading` quá 10 phút chuyển thành error/retryable.
- [ ] **Step 2: Implement stale-grading recovery trước khi lấy batch; giữ giới hạn batch và quota.
- [ ] **Step 3: Hiển thị thông báo retry rõ ràng cho học sinh.
- [ ] **Step 4: Chạy test mục tiêu.**

### Task 7: QA và handoff

**Files:**
- Modify: `tasks/todo.md`
- Create: `tasks/session_2026-08-24-classroom-learning-loop.md`

- [ ] **Step 1: Chạy `npm run test`, `npm run lint`, `npm run lint:api`, `npm run build`.**
- [ ] **Step 2: Chạy rules suite với Java 21 và test các query thật của student portal.
- [ ] **Step 3: Cho OpenCode Ox Alpha audit read-only diff, tập trung regression 11 Columbus, privacy, profile semantics và practice loop.
- [ ] **Step 4: Chạy browser/E2E tối thiểu: đăng nhập học sinh, mở assignment, upload/nộp lại; không tạo dữ liệu test production nếu chưa có cleanup plan.
- [ ] **Step 5: Chỉ sau khi mọi gate đạt mới báo cáo trạng thái; không push/deploy nếu user chưa ra lệnh mới.
