# Classroom Workspace UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the teacher class-management and student assignment portals so the next action is obvious on desktop and mobile, while preserving the existing Firebase submission, grading, retry, and self-grading behavior.

**Architecture:** Keep Firestore/API contracts and upload handlers intact. Add a small pure classroom view-model layer that defines the current attempt and student-facing status, then use it to render a task-first student dashboard and a teacher Class Workspace with explicit navigation between roster, assignments, submissions, and reports. The UI remains mobile-first with one primary action per task, visible loading/error/empty states, and no fixed action bar that covers content.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Vitest, Firebase existing services.

---

### Task 1: Establish the shared classroom presentation contract

**Files:**
- Create: `src/lib/classroom/portalViewModel.ts`
- Test: `src/lib/classroom/portalViewModel.test.ts`
- Modify: `docs/superpowers/plans/2026-08-22-classroom-workspace-ux.md`

- [x] **Step 1: Write failing tests for latest-attempt and status derivation**

  Cover these concrete invariants:

  ```ts
  expect(latestSubmissionByAssignment([old, latest])).toEqual(new Map([['asg-1', latest]]));
  expect(getStudentAssignmentState(assignment, latestSubmitted)).toMatchObject({ status: 'waiting' });
  expect(getStudentAssignmentState(assignment, latestError)).toMatchObject({ status: 'retry' });
  expect(getStudentAssignmentState(assignment, latestGraded)).toMatchObject({ status: 'graded' });
  expect(getStudentAssignmentState(assignment, undefined)).toMatchObject({ status: 'todo' });
  expect(getStudentAssignmentState(undefined, selfSubmitted)).toMatchObject({ status: 'self-submitted' });
  ```

- [x] **Step 2: Run the focused test and verify it fails for the missing module/behavior**

  Run: `npm test -- src/lib/classroom/portalViewModel.test.ts`

- [x] **Step 3: Implement the minimal pure helpers**

  Define `StudentAssignmentStatus` as `todo | waiting | grading | retry | graded`, keep self-submissions out of assigned-task counts, sort by `createdAt` descending, and return the latest document per `assignmentId` without merging old attempts into current state.

- [x] **Step 4: Run the focused test and verify it passes**

  Run: `npm test -- src/lib/classroom/portalViewModel.test.ts`

- [x] **Step 5: Add regression cases for malformed dates and error-as-error**

  Ensure an invalid/missing timestamp does not throw and an `error` submission never becomes an empty `todo` card.

- [x] **Step 6: Re-run the focused test**

  Run: `npm test -- src/lib/classroom/portalViewModel.test.ts`

### Task 2: Rebuild the student dashboard around tasks and mobile actions

**Files:**
- Create: `src/components/features/classroom/student/StudentAssignmentCard.tsx`
- Modify: `src/pages/StudentPortalPage.tsx`

- [x] **Step 1: Add the presentational card with an explicit status-to-action map**

  The card receives the assignment, current submission, derived state, upload callback, and disabled state. Render exactly one primary action: `Nộp ảnh`, `Xem trạng thái`, `Nộp lại`, or `Xem nhận xét`; keep self-submit as a separate secondary action.

- [x] **Step 2: Replace the dashboard list calculations with the shared view-model**

  Build the assigned-task rows from `assignments` and the latest submission map. Keep old submissions accessible only as history data; do not count retries as additional assignments or additional completed work.

- [x] **Step 3: Make the mobile layout task-first**

  Use a compact header, a summary strip, a horizontally scrollable status filter with an accessible selected state, stacked cards at 320–375px, `min-h-11` actions, long-title wrapping, and inline upload/progress/success/error feedback. Remove the fixed bottom camera button so it cannot cover the last card or browser controls.

- [x] **Step 4: Preserve and harden the existing upload handler**

  Keep the existing `Array.from(event.target.files ?? [])` copy-before-reset rule, cap at `MAX_ANH`, and ensure success remains visible after refresh. Retry must pass the original `assignmentId`; self-submit must pass `null`.

- [ ] **Step 5: Run targeted tests and TypeScript validation**

  Run: `npm test -- src/lib/classroom/portalViewModel.test.ts` and `npm run lint`.

### Task 3: Turn teacher classes into a Class Workspace

**Files:**
- Create: `src/components/features/classroom/ClassWorkspaceNav.tsx`
- Modify: `src/components/tabs/ClassesTab.tsx`
- Modify: `src/components/features/classroom/AssignmentPanel.tsx`

- [x] **Step 1: Add a compact workspace navigation component**

  Render class switcher context, class code/sync status, and tabs `Tổng quan`, `Học sinh`, `Bài giao`, `Bài nộp`, `Báo cáo` with keyboard-focusable 44px targets. Keep the existing callbacks for access, roster, assignment, and report actions.

- [x] **Step 2: Replace the large hero/card-first flow with the selected-class workspace**

  Keep create/import/sync actions available in a compact toolbar. Put the selected class and its operational status above the content, then show a queue for submissions needing grading, missing submissions, and load errors before secondary recommendations.

- [x] **Step 3: Make roster and assignment actions reachable without hunting**

  Keep roster search/add/PIN/report actions in the `Học sinh` view and assignment creation/refresh in `Bài giao`. On narrow screens stack controls, wrap labels, and avoid tables that require horizontal scrolling.

- [x] **Step 4: Preserve assignment safety guards while improving scanning**

  Keep the existing distinct-student counts, error banner, retry reload, delete guard, manual grading, teacher approval, and resubmission history. Improve section labels and status chips only; do not change service contracts.

- [ ] **Step 5: Run lint and the classroom unit tests**

  Run: `npm run lint` and `npm test -- src/lib/classroom/portalViewModel.test.ts src/lib/classroom/hanNop.test.ts`.

### Task 4: Verify browser behavior and responsive acceptance criteria

**Files:**
- Create: `docs/BAOCAO_QA_CLASSROOM_UX_2026-08-22.md`
- Modify: `tasks/todo.md`

- [x] **Step 1: Read the repository browser QA guide and protocol**

  Use `.agents/qa/BROWSER_TESTING_GUIDE.md` and `.agents/qa/QA_TESTING_PROTOCOL.md` before live checks.

- [ ] **Step 2: Run the full automated checks**

  Run separately: `npm test`, `npm run lint`, `npm run build`.

- [ ] **Step 3: Run browser checks at desktop and 320–375px widths**

  Verify no horizontal overflow, first CTA visible above the fold, touch targets, long Vietnamese titles, upload progress/success/error/retry, waiting/grading/graded/retry statuses, and teacher navigation to roster/assignments/submissions/reports.

- [x] **Step 4: Record evidence and classify remaining issues**

  The report must list PASS/FAIL, reproduction steps, file locations, severity, and acceptance criteria; a failed production/deployment check remains a blocker rather than being hidden by green unit tests.

### Task 5: Integrate only the verified feature commit

**Files:**
- Modify only files listed by `git status` for this feature branch.

- [ ] **Step 1: Inspect the diff and ensure unrelated worktree files are absent**

  Run: `git status --short` and `git diff --check`.

- [ ] **Step 2: Commit the feature branch**

  Stage exact feature files and commit with: `git commit -m "feat: redesign classroom workspace and student portal"`.

- [ ] **Step 3: Fetch and verify `origin/main` is still the expected fast-forward base**

  Run: `git fetch origin` and compare `git rev-parse origin/main` with the feature base. Do not force-push or overwrite a changed remote branch.

- [ ] **Step 4: Push the verified commit to `main`**

  Run only after all checks pass and the remote is unchanged: `git push origin HEAD:main`.

- [ ] **Step 5: Report commit, remote result, tests, and any explicit blocker**

  Never call the work complete without fresh command output and the QA report path.
