# R25 Automatic Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** Automatically assess eligible exit evidence, retain uncertainty for review, and let teachers regrade one pupil/task without a batch approval gate.

**Architecture:** Keep deterministic checkers in the lesson runtime. Extend the existing assessment job boundary for automatic provider proposals, then apply safe results through a server-authorized event. Store automatic marks separately from teacher overrides and expose only the pupil's own result.

**Tech Stack:** Cloudflare Worker, D1/Drizzle, existing lesson runtime/service, React/Next UI, Node test runner.

---

### Task 1: Assessment state contract

**Files:** `lib/lesson/runtime.js`, `lib/lesson/evidence.js`, `lib/lesson/serialize.js`, `tests/r25-auto-assessment.test.mjs`

- [ ] Add statuses `ai_assessed` and `needs_review`; preserve `assessed` for teacher overrides.
- [ ] Add a failing test proving AI marks do not grant mastery and teacher marks supersede them.
- [ ] Add a failing test proving uncertain output increments `needsReview`, not `passed` or `notPassed`.
- [ ] Implement the smallest reducer/evidence changes; retain replay and stale-submission guards.
- [ ] Run `node --experimental-vm-modules --test tests/r25-auto-assessment.test.mjs` and require all pass.

### Task 2: Automatic batch worker boundary

**Files:** `lib/lesson/assessment-ai.js`, `app/api/lesson-sessions/assessment/route.js`, `drizzle/0027_lesson_auto_assessments.sql`, `db/schema.ts`, `tests/lesson-assessment-ai.test.mjs`

- [ ] Add a deterministic batch fingerprint and automatic mode to the existing job table/route.
- [ ] Accept only the latest eligible exit submission; reject changed answers, branches, and teacher marks.
- [ ] Persist provider result with source/model/fingerprint/audit fields; replay must not call the provider again.
- [ ] Map provider/network/parse/low-confidence failures to `needs_review` without overwriting the answer.
- [ ] Test fake provider, provider off, retry, concurrency, 150 pupils, no secrets, and no peer projection.

### Task 3: Teacher regrade and student result

**Files:** `app/lessons/lesson-dashboard.tsx`, `components/lesson/LearningEvidencePanel.tsx`, `app/play/page.tsx`, `app/shared/page.tsx`, `tests/lesson-r25-ui.test.mjs`

- [ ] Replace the batch consent/apply gate with automatic status polling and a compact “Xem/chấm lại” record action.
- [ ] Keep teacher feedback/edit controls per pupil/task; record previous automatic result and actor.
- [ ] Show class totals with `passed`, `notPassed`, `pending`, `needsReview`, `incomplete`, `notSubmitted`.
- [ ] Show only the pupil's own result and Must/Should/Could self-assessment.
- [ ] Run focused UI tests, typecheck, lint, build, and asset verification.

### Task 4: Verification

- [ ] Replay migrations 0000–0027 locally.
- [ ] Run the full suite with bounded concurrency, native fake-provider QA, and no real pupil/provider data.
- [ ] Record evidence in `tasks/r25-final-report.md` and the shared checklist. Do not deploy until browser QA and owner release approval pass.
