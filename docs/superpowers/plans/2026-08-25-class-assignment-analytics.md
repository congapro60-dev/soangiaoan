# Class Assignment Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung báo cáo tổng hợp theo từng bài giao cho giáo viên, không tính trùng lượt nộp và không làm thay đổi dữ liệu chấm/nộp.

**Architecture:** Chuẩn hóa bài ảnh/AI và đề online về một input thuần cho `classReportModel`. Model chỉ tính trên lượt mới nhất và kết quả chính thức; React panel chỉ đọc dữ liệu, hiển thị metric và xuất CSV. `ClassesTab` chỉ làm nhiệm vụ tải nguồn và thay placeholder báo cáo.

**Tech Stack:** React + TypeScript, Firebase Firestore read-only helpers, Vitest, Tailwind, lucide-react.

---

### Task 1: Model metrics và test TDD

**Files:**
- Create: `src/lib/classroom/classReportModel.ts`
- Create: `src/lib/classroom/classReportModel.test.ts`

- [ ] **Step 1: Viết fixture và test đỏ** cho input roster + assignment submissions, yêu cầu API `buildClassAssignmentReport` trả latest, official, distribution, questionStats, errorStats, topicStats và recommendations.
- [ ] **Step 2: Chạy** `npx vitest run src/lib/classroom/classReportModel.test.ts` và xác nhận fail vì chưa có model.
- [ ] **Step 3: Viết model tối thiểu** với các hàm thuần:
  - `buildClassAssignmentReport(input)`;
  - `normalizeClassReportAssignments(input)` cho hai nguồn;
  - helper chuẩn hóa nhãn và median.
  Dedupe theo `studentKey` + `createdAt`, chỉ đưa `official === true` vào metric chính thức, giữ riêng các counter trạng thái.
- [ ] **Step 4: Chạy lại test** và thêm test biên cho điểm 0, maxScore 0, missing question, duplicate labels và sample dưới ngưỡng.
- [ ] **Step 5: Commit** `feat(classroom): add assignment analytics model`.

### Task 2: Adapter dữ liệu lớp và panel báo cáo

**Files:**
- Create: `src/components/features/classroom/ClassAssignmentReport.tsx`
- Modify: `src/components/tabs/ClassesTab.tsx`
- Test: `src/components/features/classroom/ClassAssignmentReport.test.tsx` (nếu test environment hỗ trợ component hiện có)

- [ ] **Step 1: Tạo loader read-only** trong panel cho `listAssignmentsForClass`/`listSubmissionsForClass` và adapter bài online từ `cls.assignments`, `exams`, `getSubmissions`.
- [ ] **Step 2: Nối panel vào `workspaceView === 'reports'`**, bỏ placeholder; không gọi `showClassReport` cho bài ảnh/AI.
- [ ] **Step 3: Render các phần tổng quan, phân bố điểm, bảng câu, lỗi, chủ đề và khuyến nghị** bằng text tiếng Việt rõ nghĩa; không render `studentAnswer`, `noteForTeacher`, `teacherNote`.
- [ ] **Step 4: Thêm CSV tổng hợp** theo assignment/question/error/topic, không có định danh học sinh.
- [ ] **Step 5: Kiểm thử component/read-only loader** với trạng thái loading, empty, error và fixture có lượt nộp cũ.
- [ ] **Step 6: Commit** `feat(classroom): show per-assignment class reports`.

### Task 3: Rà soát copy, review và verification

**Files:**
- Modify: `HANDOFF.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Rà soát toàn bộ nhãn/khuyến nghị** theo register giáo viên–học sinh và thuật ngữ đánh giá giáo dục; không dùng nhãn kết luận pháp lý như `Giỏi`/`Trung bình` cho phân bố bài tập.
- [ ] **Step 2: Chạy targeted tests, full Vitest, lint, lint:api, build và diff check.**
- [ ] **Step 3: Gọi Ox Alpha Free QA độc lập, xử lý mọi issue P0/P1.**
- [ ] **Step 4: Ghi bằng chứng vào HANDOFF và chạy lại verification sau tài liệu.**
- [ ] **Step 5: Commit** `docs(classroom): record assignment analytics QA`.

### Task 4: Tích hợp main và deploy

**Files:**
- No source changes expected.

- [ ] **Step 1: Kiểm tra worktree sạch, SHAs và base main; không dùng reset/checkout phá dữ liệu.
- [ ] **Step 2: Merge branch vào `main` cục bộ, chạy smoke verification trên kết quả merge.
- [ ] **Step 3: Push `main` lên origin để Vercel deploy; không chạy thao tác ghi dữ liệu production.
- [ ] **Step 4: Kiểm tra deployment Ready/Production và báo cáo URL/commit thực tế; nếu chưa có bằng chứng thì không claim deploy thành công.
