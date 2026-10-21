# R26 Automatic Library Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** Make the legacy game launch surface use all authored lesson packages through the existing session pipeline.

**Architecture:** Reuse the catalogue/package API and authored lesson wizard. Add a single launch adapter/deep link from the legacy game entry; never duplicate lesson runtime or package data. Defaults come from the package and remain editable.

**Tech Stack:** Existing Next/React lesson library, lesson service/session API, authored catalogue tests.

---

### Task 1: Catalogue and filters

**Files:** `app/page.tsx`, `public/game-setup.js`, `components/lesson/LessonCreationWizard.tsx`, existing catalogue route/tests

- [ ] Add a visible `Tạo phòng game` entry that loads authored lesson metadata, not the legacy game-only list.
- [ ] Filter by grade, week, purpose, and title; show draft/teacher-review labels.
- [ ] Test catalogue count, filters, empty state, and no duplicate package source.

### Task 2: One-click launch adapter

**Files:** existing authored lesson launch component, `app/api/lesson-sessions/route.js`, focused UI tests

- [ ] Selecting a package opens the existing room configuration with recommended defaults.
- [ ] Opening a room calls the existing session pipeline directly; do not require a separate draft save.
- [ ] Preserve package hash/version and approval guards; no content mutation during launch.
- [ ] Test idempotent launch and invalid/deleted package rejection.

### Task 3: Verification

- [ ] Run catalogue/session focused tests, full test, typecheck, lint, build, and assets.
- [ ] Native fake room smoke test; no production room or pupil data.
- [ ] Record `tasks/r26-implementation.md`; release remains blocked until browser QA.
