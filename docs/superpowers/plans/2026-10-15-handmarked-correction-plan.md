# Công bố bản chấm tay và nộp hộ bài chữa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** GV công bố/ẩn bản chấm tay theo lượt nộp; GV/PH nộp hộ bài chữa; HS/PH xem đúng projection.

**Architecture:** Reuse `_submission-actors` upload grants, `_correction-attempts`, existing classroom projection and shared viewer. Add a narrow hand-marked evidence action and server projection flag. Preserve original submission/grade immutability.

**Tech Stack:** Vercel Node API, Firebase Admin/Firestore/Storage, React/TypeScript, Vitest + Rules emulator.

---

### Task 1: Contract and server projection

**Files:** `src/lib/classroom/types.ts`, `api/_classroom-teacher.ts`, `api/classroom.ts`, tests.

- [x] Add hand-marked evidence/publish fields and sanitized projection.
- [x] Add teacher upload/publish/unpublish actions through existing actor/grant boundary.
- [x] Add tests for hidden/published projection, wrong class, lock, immutable grade.

### Task 2: GV upload and publish controls

**Files:** `src/components/features/classroom/AssignmentPanel.tsx`, shared upload/viewer services/components.

- [x] Add upload action and publish toggle with explicit status.
- [x] Ensure errors preserve selected file and never imply publish on upload.
- [x] Add focused component tests.

### Task 3: HS/PH viewer and correction submitter

**Files:** student/parent workspace components, `src/services/submissionActorsApi.ts`, correction components/tests.

- [x] Render hand-marked evidence only from server projection.
- [x] Add GV/PH correction upload path with provenance and AI review opt-in.
- [x] Keep original score/grade untouched; add regression tests.

### Task 4: Rules, verification, release

**Files:** `firestore.rules`, `storage.rules`, rule tests, `tasks/todo.md`, `HANDOFF.md`.

- [x] Deny client writes to hand-marked evidence/publish fields.
- [x] Run focused tests, full test, lint/API, build, Rules emulator. Full 3146, Rules 309, all passed; Rules deployed.
- [x] Commit/push main source 33b21cd after code gates and native Astra review passed.
- [ ] QA GV/HS/PH browser: CDP timeout; no claim of real-account or mobile/iPad validation for this feature.
