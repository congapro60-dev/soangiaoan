# Bộ lọc lịch sử lượt nộp giáo viên Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho giáo viên xem mặc định lượt nộp mới nhất, mở rộng sang toàn bộ lịch sử khi cần, mà không xóa hoặc chấm nhầm các lượt đang ẩn.

**Architecture:** Thêm một helper thuần trong `submissionSelection.ts` để chọn projection `latest | all`. `BaiNopTheoLop` giữ mode cục bộ, render projection tương ứng và truyền đúng các ID đang hiển thị cho thao tác chọn tất cả. Các helper selection hiện có tiếp tục là hàng rào: chấm/duyệt chỉ nhận lượt hiện hành; xóa chỉ nhận ID giáo viên đã chọn.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest, Firebase contracts hiện có.

---

### Task 1: Khóa contract projection bằng test đỏ

**Files:**
- Modify: `src/lib/classroom/submissionSelection.test.ts`
- Modify: `src/lib/classroom/submissionSelection.ts`

- [x] **Step 1: Viết test cho hai chế độ hiển thị**

Thêm test chứng minh `latest` trả đúng một submission mới nhất mỗi học sinh, còn `all` giữ đủ cả bản cũ và mới:

```ts
it('chọn projection lượt mới nhất hoặc toàn bộ lịch sử theo mode', () => {
  const all = [
    submission('new', 'student-1', '2026-08-24T12:00:00.000Z'),
    submission('old', 'student-1', '2026-08-23T12:00:00.000Z'),
    submission('other', 'student-2', '2026-08-24T11:00:00.000Z'),
  ];

  expect(submissionsForHistoryMode(all, 'latest').map(item => item.id)).toEqual(['new', 'other']);
  expect(submissionsForHistoryMode(all, 'all').map(item => item.id)).toEqual(['new', 'old', 'other']);
});
```

- [x] **Step 2: Chạy test để xác nhận RED**

Run: `npm test -- src/lib/classroom/submissionSelection.test.ts`

Expected: FAIL vì helper `submissionsForHistoryMode` chưa tồn tại.

- [x] **Step 3: Viết implementation tối thiểu**

Thêm:

```ts
export type SubmissionHistoryMode = 'latest' | 'all';

export const submissionsForHistoryMode = (
  submissions: readonly SubmissionDoc[],
  mode: SubmissionHistoryMode,
): SubmissionDoc[] => mode === 'latest'
  ? currentSubmissionsForAssignment(submissions)
  : [...submissions];
```

- [x] **Step 4: Chạy test targeted GREEN**

Run: `npm test -- src/lib/classroom/submissionSelection.test.ts`

Expected: tất cả test trong file PASS.

### Task 2: Thêm bộ lọc vào danh sách bài nộp giáo viên

**Files:**
- Modify: `src/components/features/classroom/AssignmentPanel.tsx`

- [x] **Step 1: Thêm state và projection hiển thị trong `BaiNopTheoLop`**

Import `useState` đã có, import `SubmissionHistoryMode` và `submissionsForHistoryMode`; đặt mode mặc định `latest`, tạo `baiNopHienThi`, và tính summary/checkbox từ projection hiển thị. `currentSubmissionsForAssignment(baiNop)` vẫn là nguồn duy nhất cho bulk chấm/duyệt.

- [x] **Step 2: Thêm control có nhãn tiếng Việt rõ ràng**

Hiển thị hai nút `Chỉ lượt mới nhất (n)` và `Hiện cả lịch sử (m)`, có `aria-pressed`. Nút thứ hai cho phép giáo viên quay lại xem bản cũ mà không xóa dữ liệu.

- [x] **Step 3: Giới hạn “Chọn tất cả” vào các dòng đang thấy**

Đổi callback chọn tất cả để nhận `submissionIds` của `baiNopHienThi`; khi ở chế độ mới nhất, không thêm ID của lượt cũ vào selection. Render danh sách bằng `baiNopHienThi`, còn `chuaNop` và distinct-student count vẫn dựa trên toàn bộ `baiNop`.

- [x] **Step 4: Chạy typecheck và test targeted**

Run: `npm test -- src/lib/classroom/submissionSelection.test.ts && npm run lint`

Expected: test và TypeScript PASS.

### Task 3: Regression và QA tích hợp

**Files:**
- Modify: `tasks/todo.md`
- Modify: `docs/superpowers/plans/2026-08-25-teacher-submission-history-filter-plan.md`

- [x] **Step 1: Kiểm tra diff đúng phạm vi**

Run: `git diff --check` và `git status --short`; chỉ có thay đổi classroom, test và tài liệu kế hoạch/spec cùng phần sửa renderer đã chờ từ trước.

- [x] **Step 2: Chạy toàn bộ kiểm thử và build**

Run lần lượt: `npm test`, `npm run lint`, `npm run lint:api`, `npm run build`.

Expected: exit code 0; không có test fail hoặc TypeScript error.

- [x] **Step 3: QA độc lập**

Nếu `opencode` và model `opencode/x-preview-f-free` khả dụng, gửi diff/acceptance criteria cho Ox Alpha review. Nếu provider không khả dụng, ghi rõ blocker và không dùng verdict chưa chạy.

- [ ] **Step 4: Commit đúng các file liên quan**

Run:

```text
git add src/components/features/classroom/AssignmentPanel.tsx src/lib/classroom/submissionSelection.ts src/lib/classroom/submissionSelection.test.ts src/components/features/classroom/QuestionResultsList.tsx src/components/features/classroom/QuestionResultsList.test.tsx tasks/todo.md docs/superpowers/specs/2026-08-25-teacher-submission-history-filter-design.md docs/superpowers/plans/2026-08-25-teacher-submission-history-filter-plan.md docs/superpowers/plans/2026-08-25-classroom-math-render-duplicate-plan.md
git commit -m "feat(classroom): filter submission history safely"
```

- [ ] **Step 5: Push trực tiếp lên `origin/main` sau khi kiểm tra remote không đổi**

Run `git fetch origin`, xác nhận `origin/main` vẫn là `b0a9a47`, rồi `git push origin HEAD:main`. Không force-push và không stage thay đổi từ checkout giáo án đang bẩn.

## Verification notes

- Targeted projection test: `6/6` pass sau vòng RED (`1 failed / 5 passed` vì helper chưa tồn tại).
- Full unit: `83 files / 1.131 tests` pass.
- Rules: `7 files / 242 tests` pass trên Firestore emulator.
- `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check`: pass; build chỉ ghi nhận warning chunk/dynamic import baseline.
- Production smoke trước deploy xác nhận dữ liệu 11Columbus còn nguyên, có các dòng mới/cũ; chưa thể xác nhận control mới trên production trước khi deploy.
- Ox Alpha Free/OpenCode đã được gọi đúng model `opencode/x-preview-f-free`, variant `max`, nhưng provider trả `Endpoint is unavailable`; không dùng verdict PASS từ lượt này.
