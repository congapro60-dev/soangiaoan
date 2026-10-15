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

- [x] Write failing tests for media kinds `image`, `video`, `audio`, required `altText`, optional `transcriptUrl`, `captionUrl`, `objectiveIds`, `unitId`, `purpose`, `version`, and rejection of `javascript:`/data URLs and unapproved status.
- [x] Verify the tests fail for the absent type/normalizer.
- [x] Implement the smallest typed `LessonMediaRef` plus `normalizeApprovedMedia` and a renderer descriptor. Keep media outside answer-bearing fields.
- [x] Render native `<img>`, `<video controls preload="metadata">`, or `<audio controls>` with captions/transcript link and text fallback. Never execute generated markup.
- [x] Run targeted tests; review output for accessibility and mobile fallback.

## Task 2: Pilot content and three entry purposes

**Files:**
- Modify: `src/lib/adaptive/types.ts` with a literal purpose type and lesson-level entry metadata.
- Modify: `src/lib/adaptive/sampleAdaptiveLesson.ts` for Cấp số cộng.
- Modify: `src/lib/adaptive/adaptiveToDewey.ts` and `src/pages/AdaptiveStudentPortalPage.tsx`.
- Test: `src/lib/adaptive/adaptiveToDewey.test.ts`, new purpose-selection test if needed.

- [x] Write failing tests proving one lesson exposes `preparation`, `remediation`, and `self_paced` entry paths while `foundation/standard/challenge` remains the support route.
- [x] Verify RED.
- [x] Add the purpose selector and progress metadata. Exact pilot asset slots remain unfilled until teacher-reviewed Muse assets exist.
- [ ] Complete purpose-specific routing: current slice records and labels purpose; preparation/remediation/self-paced still share the existing diagnostic path.
- [x] Run targeted tests and inspect rendered HTML through adapter tests.

## Task 3: Checkpoint/resume and truthful completion evidence

**Files:**
- Modify: `src/lib/dewey/adaptiveEngine.ts`, `src/pages/AdaptiveStudentPortalPage.tsx`.
- Modify: `src/services/adaptiveProgressApi.ts`, `api/adaptive-progress.ts`.
- Test: new `src/lib/dewey/adaptiveEngine.test.ts`, existing adaptive API tests.

- [x] Write failing tests for a minimal checkpoint signal and source validation.
- [x] Verify RED.
- [x] Save a local `in_progress` checkpoint and prevent a timer/iframe completion signal from silently becoming completed.
- [x] Remove the active `mockExitAttempt` completion path; the existing explicit exit-ticket flow remains responsible for valid completion.
- [x] Keep existing main authentication/link checks; no Rules/API weakening.
- [x] Run targeted unit tests. Rules were unchanged.

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

- [x] Run targeted Vitest for Tasks 1-3: 13 files, 90 tests pass.
- [x] Run `npm --prefix "C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai" run lint`.
- [x] Run `npm --prefix "C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai" run lint:api`.
- [ ] Run `npm --prefix "C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai" run test:rules` when rules changed.
- [x] Run `npm --prefix "C:\Users\ADMIN\.codex\worktrees\elearning-muse-pilot\smart-lesson-plan-ai" run build`.
- [ ] Browser-verify teacher preview and all three student entry paths on a local server, including reload/resume and media fallback.
- [ ] Report code, tests, evidence and residual limits. Do not claim Muse media was generated unless the user separately authorizes/account access and the asset is actually reviewed.

## Stop points

- Stop if current `origin/main` differs materially from the plan or if student identity/rules cannot be proven.
- Stop before external Muse connector setup, paid generation, Firebase deploy, push or production publish; those are separate actions.

## Current implementation note

Commits: `ec8bd84` (reviewed media), `1f9e82a` (three-purpose selector), `b5e8fef` and `5cdba60` (truthful checkpoint/source guard and API-compatible imports). The pilot is not production-ready: teacher review UI, approved Muse assets, server checkpoint persistence, and full purpose-specific routing remain.
