# Công bố bản chấm tay và nộp hộ bài chữa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** GV công bố/ẩn bản chấm tay theo lượt nộp; GV/PH nộp hộ bài chữa; HS/PH xem đúng projection.

**Architecture:** Reuse `_submission-actors` upload grants, `_correction-attempts`, existing classroom projection and shared viewer. Add a narrow hand-marked evidence action and server projection flag. Preserve original submission/grade immutability.

**Tech Stack:** Vercel Node API, Firebase Admin/Firestore/Storage, React/TypeScript, Vitest + Rules emulator.

---

### Task 1: Contract and server projection

**Files:** `src/lib/classroom/types.ts`, `api/_classroom-teacher.ts`, `api/classroom.ts`, tests.

- [ ] Add hand-marked evidence/publish fields and sanitized projection.
- [ ] Add teacher upload/publish/unpublish actions through existing actor/grant boundary.
- [ ] Add tests for hidden/published projection, wrong class, lock, immutable grade.

### Task 2: GV upload and publish controls

**Files:** `src/components/features/classroom/AssignmentPanel.tsx`, shared upload/viewer services/components.

- [ ] Add upload action and publish toggle with explicit status.
- [ ] Ensure errors preserve selected file and never imply publish on upload.
- [ ] Add focused component tests.

### Task 3: HS/PH viewer and correction submitter

**Files:** student/parent workspace components, `src/services/submissionActorsApi.ts`, correction components/tests.

- [ ] Render hand-marked evidence only from server projection.
- [ ] Add GV/PH correction upload path with provenance and AI review opt-in.
- [ ] Keep original score/grade untouched; add regression tests.

### Task 4: Rules, verification, release

**Files:** `firestore.rules`, `storage.rules`, rule tests, `tasks/todo.md`, `HANDOFF.md`.

- [ ] Deny client writes to hand-marked evidence/publish fields.
- [ ] Run focused tests, full test, lint/API, build, Rules emulator.
- [ ] QA GV/HS/PH read-only, commit/push main only after all gates.
