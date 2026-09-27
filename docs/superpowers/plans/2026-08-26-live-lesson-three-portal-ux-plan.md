# Live lesson three-portal UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing GV/TV/HS realtime routes practical on a phone, a classroom display, and student devices without changing their privacy boundaries.

**Architecture:** Keep the existing shared `sessionId` and Firestore public/private projections. Add the selected class join code to the generated student link so the student UI can reuse the existing server roster/PIN endpoints without a new Firestore read. Rebuild only the presentation shells: a mobile-first teacher console, a fixed-viewport TV canvas, and a class-context student login form.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Firebase Auth/Firestore, Vercel classroom API, Vitest.

---

### Task 1: Student class-context join flow

**Files:**
- Modify: `src/components/liveLesson/LiveLessonLauncher.tsx`
- Modify: `src/pages/LiveLessonPage.tsx`
- Modify: `src/components/liveLesson/StudentLiveView.tsx`
- Modify: `src/services/studentPortalApi.ts`
- Test: `src/components/liveLesson/LiveLessonLauncher.test.ts`
- Test: `src/pages/LiveLessonPage.test.ts`
- Test: `src/components/liveLesson/StudentLiveView.test.ts`

- [ ] **Step 1: Write failing tests for the new URL and context contract.**

Add tests that require `buildLiveLessonUrls('session-123', 'https://smartplan.test', 'class-123', 'JOIN42')` to put `classId=class-123&joinCode=JOIN42` only on the student URL, and require a student route helper to return both values. Add a student roster helper test that accepts a roster only when `roster.classId === expectedClassId` and returns an error state for a mismatch or missing join code.

- [ ] **Step 2: Run the focused tests and verify the expected RED failures.**

Run:

```powershell
npm test -- src/components/liveLesson/LiveLessonLauncher.test.ts src/pages/LiveLessonPage.test.ts src/components/liveLesson/StudentLiveView.test.ts
```

Expected result: the new URL assertion fails because `buildLiveLessonUrls` currently accepts only `studentClassId`, and the new roster/context helpers do not yet exist.

- [ ] **Step 3: Implement the minimal class-context plumbing.**

Change the URL builder signature to accept an optional `studentJoinCode`, set it only on the student query, and pass `selectedClass.joinCode` from the launcher. Parse `classId` and `joinCode` in `LiveLessonPage` and pass them to `StudentLiveView` as `expectedClassId` and `expectedJoinCode`.

In `studentPortalApi.ts`, reuse `fetchRoster(joinCode)` and add a small typed helper if needed; do not expose PINs or school codes. In `StudentLiveView.tsx`, load the roster when the new link context exists, reject a returned class mismatch before rendering names, replace the class-code and student-code inputs with a class label, a `select` of roster names, and a PIN input, then call the existing `loginStudent(expectedJoinCode, selectedStudentId, pin)`.

The normal new-link form must have exactly one student selector and one PIN input. A missing join code must show “Liên kết cũ thiếu ngữ cảnh lớp. Hãy yêu cầu giáo viên mở phiên mới.” and must not fall back to free-form class entry.

- [ ] **Step 4: Run focused tests and verify GREEN.**

Run the same focused Vitest command. Expected result: all URL, route-context, roster-boundary, and existing anonymous-identity tests pass.

- [ ] **Step 5: Commit the student-flow change.**

```powershell
git add src/components/liveLesson/LiveLessonLauncher.tsx src/pages/LiveLessonPage.tsx src/components/liveLesson/StudentLiveView.tsx src/services/studentPortalApi.ts src/components/liveLesson/LiveLessonLauncher.test.ts src/pages/LiveLessonPage.test.ts src/components/liveLesson/StudentLiveView.test.ts
git commit -m "feat: simplify live student class join"
```

### Task 2: Mobile-first teacher console

**Files:**
- Modify: `src/components/liveLesson/TeacherLiveView.tsx`
- Test: `src/components/liveLesson/TeacherLiveView.test.ts`

- [ ] **Step 1: Write failing tests for the mobile control contract.**

Add pure helper tests for a teacher mobile model that returns the current cue's primary instruction, the current cue index/total, the pause/resume label, and the safe secondary-panel labels. Require `running` to produce `Tạm dừng`, `paused`/`lobby` to produce `Bắt đầu / tiếp tục`, and `closed` to produce disabled controls.

- [ ] **Step 2: Run the focused teacher test and verify RED.**

```powershell
npm test -- src/components/liveLesson/TeacherLiveView.test.ts
```

Expected result: the new helper import/assertions fail because the mobile model is not implemented.

- [ ] **Step 3: Implement the mobile-first shell without changing session mutations.**

Keep `getCueNavigation`, `getTimerSnapshot`, `buildTeacherStatePatch`, response subscriptions, public-stat publishing, evidence saving, and close-session bridge unchanged. Add local UI state for the selected secondary panel. Recompose the JSX into:

```text
fixed/compact header
primary GV nói/làm card
collapsible Bảng / HS / Vở & minh chứng panels
compact response summary
sticky bottom Trước / pause / Sau controls
drawer/menu for cue timeline, TV stats, close session
```

Use large touch targets (`min-h-11` or larger), `sticky` top/bottom regions, `overflow-x-hidden`, and responsive classes so portrait phones are the acceptance target while desktop remains usable. Keep close-session behind a confirmation dialog or confirm step. Do not put teacher-only text into any TV projection.

- [ ] **Step 4: Run focused tests and inspect the changed JSX for accessibility.**

Run the focused teacher test, `npm run lint`, and a static check that every icon-only button has an accessible label and that the primary controls remain present when a secondary panel is closed.

- [ ] **Step 5: Commit the teacher console change.**

```powershell
git add src/components/liveLesson/TeacherLiveView.tsx src/components/liveLesson/TeacherLiveView.test.ts
git commit -m "feat: make live teacher console mobile first"
```

### Task 3: Fit-to-viewport TV presentation

**Files:**
- Modify: `src/components/liveLesson/TvLiveView.tsx`
- Test: `src/components/liveLesson/TvLiveView.test.ts`

- [ ] **Step 1: Write failing tests for the five-metric public presentation model.**

Add a pure helper `getTvStatsItems(stats)` and test that it returns exactly `Tham gia`, `Đã gửi`, `Tuyến M`, `Tuyến S`, and `Tuyến C` in that order with numeric values. Keep the existing public-projection tests that assert teacher cues, board instructions, and AI correction are absent.

- [ ] **Step 2: Run the focused TV test and verify RED.**

```powershell
npm test -- src/components/liveLesson/TvLiveView.test.ts
```

Expected result: the new helper assertion fails because the helper is not present.

- [ ] **Step 3: Implement the fixed presentation canvas.**

Keep the public listener and stats subscription behavior unchanged. Replace the scrollable dashboard shell with a `min-h-[100dvh] h-[100dvh] overflow-hidden` canvas. Use a compact header, a flexible content region, and a single-row five-item stats footer at desktop display widths. Use `clamp()`-equivalent Tailwind sizing and restrained padding; preserve whitespace and readable contrast. Do not add a teacher control or raw response field.

- [ ] **Step 4: Run focused tests and build.**

Run the focused TV test, `npm run lint`, and `npm run build`. Expected result: tests, typecheck, and build pass with only the existing Vite chunk warnings.

- [ ] **Step 5: Commit the TV presentation change.**

```powershell
git add src/components/liveLesson/TvLiveView.tsx src/components/liveLesson/TvLiveView.test.ts
git commit -m "fix: fit live TV presentation to viewport"
```

### Task 4: Integrated verification and release evidence

**Files:**
- Verify: `src/components/liveLesson/*.test.ts`, `src/pages/LiveLessonPage.test.ts`, `src/services/liveLessonService.test.ts`, `api/__tests__/classroom*.test.ts`
- Verify: `docs/superpowers/specs/2026-08-26-live-lesson-three-portal-ux-design.md`

- [ ] **Step 1: Run focused live-lesson tests.**

```powershell
npm test -- src/components/liveLesson src/pages/LiveLessonPage.test.ts src/services/liveLessonService.test.ts
```

- [ ] **Step 2: Run the full verification suite.**

```powershell
npm run lint
npm run lint:api
npm run build
npm test
git diff --check
```

Record the actual test-file/test counts and build exit status; do not report historical counts as current evidence.

- [ ] **Step 3: Run a browser smoke test at the local or production preview.**

Verify these observable behaviors:

1. GV portrait layout shows current `GV nói/làm` and bottom controls without horizontal overflow.
2. TV shows all five statistics in one 16:9 viewport without a vertical scrollbar.
3. A newly generated HS link opens a class label and name selector, not class/student-code inputs.
4. Wrong-class roster context is rejected and teacher-authenticated browser remains protected from anonymous replacement.
5. A selected student with the correct PIN enters and can submit one allowed response; the teacher aggregate updates without exposing raw answers on TV.

- [ ] **Step 4: Dispatch independent spec and quality reviews, fix any findings, and rerun the affected tests.**

The spec review must check all seven acceptance criteria and privacy boundaries. The quality review must inspect mobile touch targets, effect dependencies, error states, and whether the TV can overflow. No release claim is allowed until both reviews are clear and verification commands are fresh.

- [ ] **Step 5: Push and deploy only after release approval evidence.**

Push the feature branch to `origin`, fast-forward/push `main` only as explicitly requested, wait for Vercel `Ready / Production`, and run HTTP plus browser smoke against the production alias. Report the exact commit, deployment URL, status, and any authenticated-E2E limitation.
