# Tuần 6 V7.2 Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Apply the V7.2 activity-first classroom model to every Week 6 lesson package for grades 10, 11, and 12 while treating the lesson plans and source snapshot as mathematical/content evidence rather than a screen-by-screen script.

**Scope:** 24 source keys: `10-6-39..46`, `11-6-34..41`, and `12-6-34..41`. Include both mandatory and elective lessons. Keep each lesson's actual subject focus, examples, exercises, quick checks, language demands, and AI Error; derive the classroom activity sequence from those inputs.

**Architecture:** Keep one generic V4/V7.2 adapter for all source packages. It will turn the six reviewed source activities into a stable classroom state sequence with goal formation, AI-error verification, differentiated route, group product, individual post-check, quick check, and exit reflection. Public TV content is generated from a public activity view, teacher script/answer keys remain private, and HS response controls are created from the actual source checkpoint rather than generic A/B/C/D placeholders.

**Tech Stack:** React + TypeScript + Vite, Firebase Auth/Firestore, existing V4 adapter and runtime, Vitest, Firebase Emulator Suite, Puppeteer.

---

## Source boundary

- The PPCT establishes identity, week, period, subject, sequence, and curriculum boundary.
- `banToan-w5-w6.snapshot.json` supplies reviewed source content and AI-error evidence.
- `screenPlan` supplies teacher/student intent and fallback constraints; its references to Slido, QR, or a paper artifact are source context, not mandatory implementation.
- Runtime design may shorten, reorder, split, or reword activity prompts when that improves a 40-minute interactive lesson. It must preserve the mathematics, product, evidence signal, and fallback.
- Period 31 remains the custom P31 contract. Week 6 packages use the generic V7.2 adapter and must not inherit P31's budget-specific copy or no-region constraint unless their source says so.

## Task 1: Freeze the 24-package inventory and source contract

**Files:**
- Create: `src/lib/liveLesson/v4/week6Catalog.ts`
- Create: `src/lib/liveLesson/v4/week6Catalog.test.ts`
- Modify: `src/lib/liveLesson/v4/lessonAdapter.ts`
- Modify: `src/lib/liveLesson/v4/lessonAdapter.test.ts`
- Modify: `tasks/todo.md`

- [x] Export the exact 24 source keys and metadata from the canonical snapshot, grouped by grade and mandatory/elective mode.
- [x] Assert every key has source content counts (2 examples, 6 exercises, 2 quick checks), six source activities, and an AI Error.
- [x] Assert no Week 6 package resolves to the custom P31 contract.
- [x] Assert package identity uses `grade-week-period`, not title matching.
- [ ] Record any PPCT/source discrepancy as a data warning with the affected key; do not silently discard a lesson.

## Task 2: Build the V7.2 activity projection from source activities

**Files:**
- Modify: `src/lib/liveLesson/v4/lessonAdapter.ts`
- Create: `src/lib/liveLesson/v4/v72ActivityProjection.ts`
- Create: `src/lib/liveLesson/v4/v72ActivityProjection.test.ts`

- [x] Map source phases to runtime beats: opening, guiding question, personal goal, formation/diagnostic, AI Error, route choice, group product, individual post-check, quick check, repair/extension, exit reflection.
- [ ] Use the source `teacher`, `student`, `prompt`, and `fallback` as inputs to activity state; public TV receives a concise public focus and action, never raw teacher instructions or third-party tool assumptions.
- [x] Use each lesson's formulas/examples/quick checks to build the TV anchor and HS task. Do not substitute generic “công cụ Toán học” text when source evidence exists.
- [x] Derive a student-readable objective set as `MUST · Tôi có thể…`, `SHOULD · Tôi có thể…`, and `COULD · Tôi có thể…` from the source focus and products. Keep the exact strings for the final self-assessment.
- [ ] Keep one primary action and one primary product per activity. Split compound source prompts into ordered controls or a response plus a separate explanation field.
- [ ] Use the source AI Error's category, wrong solution, correction, proof, teacher prompt, and student product. Never invent an answer key from the title.
- [x] Use route M/S/C for all lessons as a support choice; keep `selfChoice` as curriculum metadata and do not label ability by route or language.
- [ ] Make the common post-check source-specific. It must use a fresh datum/example from the package, not a generic P31 or trig prompt.
- [ ] Provide an honest paper/offline fallback for every activity.

## Task 3: Make runtime response controls source-aware

**Files:**
- Modify: `src/lib/liveLesson/v4/runtimeDefinition.ts`
- Modify: `src/lib/liveLesson/v4/types.ts` only when a response field is genuinely missing
- Create: `src/lib/liveLesson/v4/v72ResponseCatalog.ts`
- Create: `src/lib/liveLesson/v4/v72ResponseCatalog.test.ts`

- [x] Replace fallback A/B/C/D choices for generic diagnostic/quick-check steps with source options or text responses that match the actual task.
- [x] Add explicit AI Error category options plus a separate private explanation payload for every Week 6 package.
- [x] Store response type/options in the preview manifest and teacher-private view.
- [ ] Keep language preference separate from response values; changing VI/EN/JA must not alter grading keys or saved data.
- [ ] Add automatic correctness only where the package exposes a stable key. Mark explanations as `Cần GV xem`.

## Task 4: Improve V7.2 role views for all packages

**Files:**
- Modify: `src/components/liveLesson/TvLiveView.tsx`
- Modify: `src/components/liveLesson/TvStatsPanel.tsx`
- Modify: `src/components/liveLesson/StudentLiveView.tsx`
- Modify: `src/components/liveLesson/StudentActivityGuide.tsx`
- Modify: `src/components/liveLesson/TeacherLiveView.tsx`
- Modify: `src/components/liveLesson/liveClassroom.css`

- [x] Preserve the stable TV shell and HS slot structure proven by P31. Do not duplicate guide nodes when language, cue, or realtime state changes.
- [ ] Ensure TV at 1280×720 and 1920×1080 shows one focal public idea, readable formulas, source-specific activity action, and aggregate evidence.
- [x] Ensure HS at mobile/tablet shows one current task, one response product, bounded scaffold, glossary, language support, and its own draft only.
- [x] Ensure teacher private evidence rows show per-HS status, auto-assessment where valid, and `Cần GV xem` otherwise. Do not expose raw text or PII to TV.
- [ ] Keep objective/self-assessment text exact across opening and exit for every package.

## Task 5: Build the Week 6 review/export path

**Files:**
- Modify: `src/lib/liveLesson/v4/previewBundle.ts`
- Modify: `src/components/liveLesson/TeacherLiveView.tsx`
- Create: `src/lib/liveLesson/v4/week6ReviewBundle.test.ts`

- [x] Generate a single offline ZIP for each package from the same runtime contract: public TV/HS preview, manifest, and private GV guide.
- [x] Include source key, grade, week, period, timing, activity purpose, response type/options, objective strings, route cards, AI Error correction/proof, and paper fallback.
- [x] Mark preview aggregate numbers as illustrative; never present them as real class data.
- [x] Validate public bundle privacy for every 24 package; teacher guide may contain answer keys but no student data.

## Task 6: Verify all 24 packages and representative browser flows

**Files:**
- Modify: `scripts/qa/p31-classroom.mjs` or create `scripts/qa/week6-v72-classroom.mjs`
- Create: `artifacts/week6-v72/` as generated QA output

- [x] Run contract/data tests for all 24 packages.
- [x] Browser smoke one formation package per grade through GV → TV → 3 HS; include language choice, route, practice response, public stats, and privacy.
- [x] Capture TV 1280×720/1920×1080 and HS mobile/tablet for representative packages; check no duplicate activity nodes and no overflow.
- [x] Run full `lint`, `lint:api`, unit tests, Rules tests, pilot tests, and build.
- [x] Record source limitations and any lessons where a human teacher must decide the activity variant.

## Task 7: Release boundary

- [ ] Do not push/deploy/reseed until all 24 package validations and representative browser evidence pass.
- [ ] Keep Week 6 work isolated from the custom P31 contract and the other 47 package identities.
- [ ] Use the finishing-branch workflow only after the final evidence is captured.
