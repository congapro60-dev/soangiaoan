# P31 Activity First Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Rebuild the P31 GV–TV–HS experience around teacher-led learning activities and shared classroom state, using the stronger V7.1 design principles from the shared conversation while preserving the actual P31 mathematics, 40-minute lesson, and existing Firebase runtime.

**Architecture:** Keep one canonical P31 contract as the source for content, timing, response steps, language support, and public/private projection rules. Derive three role-specific views from that state: GV coordinates and interprets evidence, TV shows one clear public classroom focus plus anonymized aggregate evidence, and HS performs one meaningful action with optional scaffold. Refactor repeated rendering into small activity primitives and locked visual tokens instead of adding slide-specific CSS patches.

**Tech Stack:** React + TypeScript + Vite, Firebase Auth/Firestore, existing V4 live-lesson services, Vitest, Firebase Emulator Suite, Puppeteer.

---

## Design decisions carried over from the shared V7.1 conversation

- The unit is an activity sequence, not a deck of duplicated screens.
- Each screen has one primary idea, one primary action, and one visible product.
- TV and HS use separate layouts; TV is public and calm, HS is interactive and personal.
- The canonical student objectives use “Tôi có thể…” and the exact same text returns at the end for self-assessment.
- Student language preference is independent from teacher language and from the shared classroom state.
- Hints, glossary, sentence frames, and challenge are differentiated support; they do not reveal the answer automatically.
- Teacher evidence can include per-student status and revision count; TV only receives aggregate, redacted data.
- A response step may show a toolbar action only when that action has a purpose for the current activity.
- “PASS” requires content, data, and visual regression evidence together. Unit tests alone are insufficient.

P31-specific constraints remain binding: do not teach or draw graphical regions in period 31; do not infer ability from language or submission count; keep the initial personal-goal step before the teacher’s common synthesis; leave time for writing, speaking, group movement, and teacher interpretation.

## Task 1: Freeze the activity contract and regression matrix

**Files:**
- Modify: `docs/superpowers/plans/2026-09-13-p31-classroom-ready.md`
- Modify: `tasks/todo.md`
- Modify: `tasks/lessons.md`
- Test: `src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4.test.ts`
- Test: `src/lib/liveLesson/v4/runtimeDefinition.p31.test.ts`

- [x] Record the new acceptance matrix: P31 activity sequence, role ownership, one-action rule, exact objectives, public/private fields, and the 3 viewport classes.
- [x] Remove obsolete “slide-first” acceptance wording from the active plan while preserving historical QA notes.
- [x] Add the lesson learned that a visually polished slide deck can still fail classroom use when it does not expose a usable activity state, response product, and teacher decision.
- [x] Add tests that assert P31 keeps the personal-goal step before common synthesis, has no graphical-region requirement, and exposes only the canonical response checkpoints.
- [x] Run the focused contract/runtime tests and record the result before modifying the renderers.

## Task 2: Make P31 content activity-first

**Files:**
- Modify: `src/data/liveLessonPackages/p31ClassroomDesign.ts`
- Modify: `src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4.ts`
- Modify: `src/lib/liveLesson/v4/languagePack.ts`
- Modify: `src/lib/liveLesson/v4/taskRouting.ts`
- Test: `src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4.test.ts`
- Test: `src/lib/liveLesson/v4/languagePack.test.ts`
- Test: `src/lib/liveLesson/v4/taskRouting.test.ts`

- [x] Keep the 2400-second P31 sequence but express every block as `purpose → teacher move → student product → public cue → optional response → next decision`.
- [x] Rewrite the three common objectives as student-readable “Tôi có thể…” statements. Keep personal goals as a distinct earlier response and map the final reflection to the exact common statements.
- [ ] Keep P00 context, P03 guiding question, P05 personal goal, P08 model/meaning, P16 AI-error reasoning, P19 teacher-approved route choice, P20 group product, P27 individual post-check, P32 quick check, P35 repair/extension, and P38 exit reflection. Do not add an extra slide merely to fill the timeline.
- [x] Give each activity one answerable product. Split any compound prompt into ordered substeps or separate response fields rather than asking one input to hold multiple claims.
- [x] Keep route M/S/C differentiated by scaffold and task demand, with one shared success criterion and the same individual post-check. Do not use route selection as an ability label.
- [x] Make hints progressive and bounded. A hint may reduce language or working-memory load, but must not contain the target answer.
- [x] Keep mathematical expressions in a single canonical location in the TV copy and avoid repeating a hero expression in the prompt when the expression is already visible.
- [x] Update localized copy so VI remains the anchor, EN/JA support the same activity and data, and translation does not replace mathematical notation.
- [x] Run the focused content, language, routing, and contract tests.

## Task 3: Add one role-specific activity presentation model

**Files:**
- Create: `src/lib/liveLesson/v4/activityPresentation.ts`
- Create: `src/lib/liveLesson/v4/activityPresentation.test.ts`
- Modify: `src/lib/liveLesson/v4/index.ts`
- Modify: `src/lib/liveLesson/v4/types.ts` only if a missing activity view field is required

- [ ] Define pure view models for the current cue: public TV focus, student task, teacher control/evidence, and available toolbar actions.
- [ ] Ensure the TV model contains only public allowlisted fields and one primary message; teacher script, answer key, names, UIDs, and raw responses stay out.
- [ ] Ensure the student model exposes only the current task, the current student’s own draft/submission, glossary/scaffold, and the exact response fields for that activity.
- [ ] Ensure the teacher model exposes the current script, board plan, answer key, evidence signal, response status, and next-action choices.
- [ ] Add tests for every P31 cue class: no-response context, personal goal, choice, text, route, group progress, post-check, and exit reflection.

## Task 4: Refactor the TV presenter around a single classroom focus

**Files:**
- Modify: `src/components/liveLesson/TvLiveView.tsx`
- Modify: `src/components/liveLesson/TvStatsPanel.tsx`
- Modify: `src/components/liveLesson/TvPresenterControls.tsx`
- Modify: `src/components/liveLesson/liveClassroom.css`
- Test: `src/components/liveLesson/TvLiveView.test.ts`
- Test: `src/components/liveLesson/TvStatsPanel.test.tsx`
- Test: `src/components/liveLesson/TvPresenterControls.test.tsx`

- [x] Render a stable TV shell: lesson identity/timer, activity label, one focal title or model, one short instruction/action line, and a reserved evidence panel.
- [x] Use a 16:9 stage with safe margins and readable type at 1280×720 and 1920×1080. Keep content within the stage; do not shrink type to fit a long script.
- [ ] Render formulas through the shared rich-text renderer. Never print raw LaTeX, duplicate a hero formula, or put teacher explanation on the public screen.
- [ ] Show `Prev`, `Next`, and `Back`/`Next` semantics through the existing teacher-controlled state. Enable `Results` only when the current activity has a response step and the teacher has made public stats visible.
- [x] Show aggregate bars/cards for choices, AI-error categories, routes, and group progress. Label them as class discussion evidence, not rankings or correctness unless the contract explicitly permits that aggregate.
- [ ] Reset/hide stale result panels immediately on cue change or when the teacher hides stats.
- [ ] Add visual tests for long Vietnamese text, formula lines, empty stats, group progress, and narrow 1280×720 rendering.

## Task 5: Refactor the HS experience around one action and progressive support

**Files:**
- Modify: `src/components/liveLesson/StudentLiveView.tsx`
- Modify: `src/components/liveLesson/StudentActivityGuide.tsx`
- Modify: `src/components/liveLesson/StudentWritingSupport.tsx`
- Modify: `src/components/liveLesson/StudentGoalReflection.tsx`
- Modify: `src/components/liveLesson/liveClassroom.css`
- Test: `src/components/liveLesson/StudentLiveView.test.ts`
- Test: `src/components/liveLesson/LiveLessonRichText.test.ts`

- [x] Lock the page order to `header → current activity → main task → response → support → personal evidence`, with no fixed footer or keyboard covering the active input.
- [ ] Make the current student action explicit: choose, write, check, explain, select a route, or submit one product. Separate multiple claims into separate controls.
- [ ] Preserve drafts by session + participant + cue/step. A language change, reload, reconnect, or cue transition must not move a draft to another activity or participant.
- [ ] Keep language support contextual: glossary, one sentence frame, and one bounded hint at a time. Do not add a second “lesson” below the task.
- [x] Show the student’s own goal and final reflection using the same canonical objective text. The student can see personal evidence and next support; classmates’ names and answers never appear.
- [ ] Disable or clearly explain unavailable controls during lobby, paused, closed, or already-submitted states.
- [ ] Add responsive tests/screens for mobile, split-screen tablet, English/JA support, long formula, hint open, keyboard open, and goal reflection.

## Task 6: Make teacher evidence actionable and private

**Files:**
- Modify: `src/components/liveLesson/TeacherLiveView.tsx`
- Modify: `src/services/liveLessonService.ts`
- Modify: `src/lib/liveLesson/types.ts`
- Create: `src/lib/liveLesson/teacherActivityStats.ts`
- Create: `src/lib/liveLesson/teacherActivityStats.test.ts`
- Test: `src/components/liveLesson/TeacherLiveView.test.ts`
- Test: `src/services/liveLessonService.test.ts`

- [ ] Build per-participant activity rows from the existing response stream using stable participant IDs and the class roster mapping already used by the live session. Show submitted/not submitted, current assessment state, hint/tool use where recorded, and revision count.
- [x] Auto-assess choices and canonical P31 checks only when the contract supplies a key. Keep free-form explanations as “Cần GV xem” until the teacher marks them.
- [ ] Add a private comparison after exit reflection: evidence from the post-check/exit ticket versus the student’s self-assessment. Flag only actionable mismatches such as “tự đánh giá thành thạo nhưng còn thiếu điều kiện”.
- [ ] Keep the public publisher aggregate-only. Add privacy tests that reject names, participant IDs, raw response text, answer keys, and teacher script in every TV projection.
- [ ] Keep current Firestore write semantics, revision history, and session isolation. Do not make stats derived from submission count imply ability.

## Task 7: Replace the offline preview with a faithful activity review bundle

**Files:**
- Modify: `src/lib/liveLesson/v4/previewBundle.ts`
- Modify: `src/components/liveLesson/TeacherLiveView.tsx`
- Test: `src/lib/liveLesson/v4/previewBundle.test.ts`
- Test: `src/lib/liveLesson/v4/offlinePack.test.ts`

- [x] Generate the TV and HS preview from the same runtime definition used by runtime.
- [x] Include a clearly labelled public preview and a separate GV guide with script, answer key, timing, route cards, and intervention cues. Never put private data in the public preview.
- [ ] Derive preview stats from response type/options and label them as illustrative only; remove cue-ID hardcoding and fake goal categories.
- [ ] Include `responseType`, options, activity purpose, timing, support, and expected product in the manifest so a reviewer can understand what the classroom does at each step.
- [ ] Keep the bundle offline and self-contained. Add a statement that it is a content preview, not a screenshot of the live DOM.
- [ ] Test privacy, canonical source identity, cue count/order, and output names/content.

## Task 8: Run the full classroom verification loop

**Files:**
- Modify: `scripts/qa/p31-classroom.mjs`
- Create: `scripts/qa/p31-visual-review.md`
- Create: `artifacts/p31-classroom/` only as generated QA output

- [x] Run isolated Firebase Auth/Firestore emulators plus local Vite; assert all browser requests stay on the local harness.
- [x] Drive one teacher/control, one public TV, and three independent HS contexts through P00, P03, P05, P08, P16, P19, P20, P27, P32, P35, and P38.
- [ ] Verify the user-visible sequence: student goal before teacher synthesis, one response product per activity, route persistence, group progress, post-check isolation, exit reflection, and objective self-assessment.
- [x] Capture TV at 1920×1080 and 1280×720, HS at tablet/mobile, and teacher private evidence at the final activity. Review representative images with actual visual inspection.
- [x] Assert no overflow/clipping, no duplicate hero content, no public PII/raw response text, no stale stats after cue change, and no cross-student draft leakage.
- [x] Run focused tests, full lint, `lint:api`, full unit tests, Rules tests, pilot tests, and build. Treat any current failure as unresolved until its root cause is fixed or explicitly documented.

## Task 9: Handoff gate

- [ ] Update the active plan and lessons with exact evidence and known limits.
- [ ] Confirm the worktree contains no unrelated changes before staging.
- [ ] Do not claim independent review, production deployment, Firestore deployment, or `main` push unless those actions were actually performed and verified.
- [ ] Only after all gates pass, use the finishing-branch workflow to decide commit/push/hand-off.
