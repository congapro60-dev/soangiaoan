# Cấp số cộng Home E-learning + Muse Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` to implement this plan task-by-task with spec and quality reviews.

**Goal:** Add a reviewed-media, resumable self-study pilot for Toán 11 Cấp số cộng with three entry purposes: preparation, remediation, and full self-paced learning.

**Architecture:** Reuse `AdaptiveLesson`/Dewey. Muse stays teacher-side media production; SmartPlan stores a versioned, approved media manifest and renders safe native media plus captions/transcripts. Student progress remains server-bound to the assigned lesson/student session. No Muse API call during student learning.

**Tech Stack:** React + TypeScript + Vite, Firebase Firestore/Storage, existing Adaptive/Dewey renderer, Vitest, Firebase Rules emulator.

---

## Scope and constraints

- In scope: pilot content model, media manifest, teacher-reviewed media references, three purpose entry paths, checkpoint/resume, real per-objective completion evidence, assignment integration seam, tests.
- Out of scope: generic LMS, SCORM redesign, automatic Muse connector, paid media generation, SFX in the first pilot, unrelated classroom/Word/SSM changes.
- Media safety: Muse output is untrusted content. No arbitrary Muse HTML/JavaScript. Math graphs, formulas, numbers and exact diagrams remain app-rendered.
- Model: native `gpt-6-astra` effort `xhigh`; no 9router or external model orchestration.

## Worktree and baseline

- Worktree: `C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai`.
- Base: `origin/main` fetched at `6d231ac`.
- Preserve the dirty checkout at `C:\Users\ADMIN\Downloads\smart-lesson-plan-ai`; never reset, stash or copy its WIP.
- Before each task: run the smallest relevant Vitest command. Before handoff: run `npm --prefix <worktree> run lint`, `lint:api`, targeted tests, Rules tests when rules change, and `build`.

## Task 1: Media manifest and safe rendering

**Files:**
- Create: `src/lib/adaptive/media.ts`, `src/lib/adaptive/media.test.ts`.
- Modify: `src/lib/adaptive/types.ts`, `src/lib/adaptive/adaptiveToDewey.ts`, `src/lib/dewey/template.ts`.
- Modify: `src/pages/AdaptiveLessonBuilderPage.tsx` only where the existing lesson draft accepts reviewed media.
- Modify: `storage.rules` only if the pilot upload path has an owner-bound rule; add Rules test fixture if required.

- [ ] Write failing tests for media kinds `image`, `video`, `audio`, required `altText`, optional `transcriptUrl`, `captionUrl`, `objectiveIds`, `unitId`, `purpose`, `version`, and rejection of `javascript:`/data URLs and unapproved status.
- [ ] Verify the tests fail for the absent type/normalizer.
- [ ] Implement the smallest typed `LessonMediaRef` plus `normalizeApprovedMedia` and a renderer descriptor. Keep media outside answer-bearing fields.
- [ ] Render native `<img>`, `<video controls preload="metadata">`, or `<audio controls>` with captions/transcript link and text fallback. Never execute generated markup.
- [ ] Run targeted tests; review output for accessibility and mobile fallback.

## Task 2: Pilot content and three entry purposes

**Files:**
- Modify: `src/lib/adaptive/types.ts` with a literal purpose type and lesson-level entry metadata.
- Modify: `src/lib/adaptive/sampleAdaptiveLesson.ts` for Cấp số cộng.
- Modify: `src/lib/adaptive/adaptiveToDewey.ts` and `src/pages/AdaptiveStudentPortalPage.tsx`.
- Test: `src/lib/adaptive/adaptiveToDewey.test.ts`, new purpose-selection test if needed.

- [ ] Write failing tests proving one lesson exposes `preparation`, `remediation`, and `self_paced` entry paths while `foundation/standard/challenge` remains the support route.
- [ ] Verify RED.
- [ ] Add the pilot media slots: one context visual/clip for preparation, one misconception visual for remediation, and one optional explanation asset for self-paced learning. Keep exact math in existing simulation/text.
- [ ] Implement entry routing: preparation -> `preparation` + diagnostic; remediation -> diagnostic -> targeted unit; self-paced -> full unit sequence. Do not duplicate the lesson.
- [ ] Run targeted tests and manually inspect rendered HTML snapshots.

## Task 3: Checkpoint/resume and truthful completion evidence

**Files:**
- Modify: `src/lib/dewey/adaptiveEngine.ts`, `src/pages/AdaptiveStudentPortalPage.tsx`.
- Modify: `src/services/adaptiveProgressApi.ts`, `api/adaptive-progress.ts`.
- Test: new `src/lib/dewey/adaptiveEngine.test.ts`, existing adaptive API tests.

- [ ] Write failing tests for checkpoint state (purpose, unit, screen, answers, supports used, updatedAt), resume after reload, idempotent save, and completion only after valid exit answers.
- [ ] Verify RED.
- [ ] Replace the forced 40-minute completion path with resumable checkpoints; timer may warn but cannot silently convert a partial session into completed.
- [ ] Remove `mockExitAttempt` as evidence. Persist actual quick-check/exit answers and compute objective states from those answers; partial sessions remain `learning` or `needs_teacher`.
- [ ] Keep existing main authentication/link checks. Verify the adaptive lesson lookup accepts both current `lessonId` and legacy shape only where already supported; do not weaken student identity binding.
- [ ] Run targeted API/unit tests, then Rules tests if progress documents/rules change.

## Task 4: Teacher-reviewed pilot workflow

**Files:**
- Modify: `src/pages/AdaptiveLessonBuilderPage.tsx` and existing preview UI.
- Modify: `src/services/adaptiveLessonService.ts` if versioned approved media needs serialization.
- Test: builder/content completeness tests.

- [ ] Write failing test for publish readiness: media must be approved or absent; every pilot objective must have a knowledge unit, route content, quick check and fallback text.
- [ ] Verify RED.
- [ ] Add a compact review panel showing purpose coverage, media alt/transcript, exact math source, and fallback behavior. No Muse connector or auto-generation in runtime.
- [ ] Block publish on missing safety/accessibility/content errors; keep warnings visible.
- [ ] Run completeness tests and builder tests.

## Task 5: Verification and handoff

- [ ] Run targeted Vitest for Tasks 1-4.
- [ ] Run `npm --prefix "C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai" run lint`.
- [ ] Run `npm --prefix "C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai" run lint:api`.
- [ ] Run `npm --prefix "C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai" run test:rules` when rules changed.
- [ ] Run `npm --prefix "C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai" run build`.
- [ ] Browser-verify teacher preview and all three student entry paths on a local server, including reload/resume and media fallback.
- [ ] Report code, tests, evidence and residual limits. Do not claim Muse media was generated unless the user separately authorizes/account access and the asset is actually reviewed.

## Stop points

- Stop if current `origin/main` differs materially from the plan or if student identity/rules cannot be proven.
- Stop before external Muse connector setup, paid generation, Firebase deploy, push or production publish; those are separate actions.
