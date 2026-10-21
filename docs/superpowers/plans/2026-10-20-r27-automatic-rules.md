# R27 Automatic Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** Make a selected valid game rule run automatically through a deterministic operational plan, with visible fallback to Hành trình when invalid.

**Architecture:** Generate a runtime-only plan from normalized package/setup input. Bind its source package hash and rule/setup fingerprints. Keep content approval/source verification independent; fallback is explicit and auditable.

**Tech Stack:** `lib/lesson/session-plan.js`, `lib/lesson/validate-session-plan.js`, lesson service, runtime mode bridge, Node tests.

---

### Task 1: Automatic plan builder

**Files:** `lib/lesson/session-plan.js`, `lib/lesson/validate-session-plan.js`, `tests/r27-auto-rules.test.mjs`

- [ ] Add a builder that accepts a validated package and normalized setup, emits `auto_generated`, source hash, setup fingerprint, and rule fingerprint.
- [ ] Generate only supported mechanics; reject malformed rule/setup and unavailable event requirements.
- [ ] Test every supported rule, deterministic hash, source binding, and malformed fallback.

### Task 2: Session integration

**Files:** `lib/lesson/service.js`, `app/api/lesson-sessions/route.js`, `lib/lesson/serialize.js`

- [ ] Use the auto plan for preview/live room creation when setup requests a rule.
- [ ] Keep package status and source approval unchanged.
- [ ] Return `RULE_FALLBACK` with reason when plan validation fails; show it to teacher/HS.
- [ ] Test room creation, projection, and fallback without bypassing room authorization.

### Task 3: Verification

- [ ] Run focused rule tests, full suite, typecheck, lint, build, assets, and native fake-room QA.
- [ ] Record plan/hash/audit evidence in `tasks/r27-implementation.md`.
- [ ] No production migration/deploy until owner approves after browser QA.
