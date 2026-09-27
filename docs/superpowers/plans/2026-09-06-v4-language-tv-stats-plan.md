# V4 Language, TV Presentation, and Live Stats Implementation Plan

> **For agentic workers:** Use this plan task-by-task. Preserve the existing dirty V4 worktree. Do not commit, push, deploy, or re-seed production in this plan.

**Goal:** Make the P31 V4 demo understandable and controllable in a real classroom: student language choices visibly affect approved personal scaffolding, TV presentation uses the full 16:9 stage with safe controls, and teacher-published anonymous statistics appear on TV at the right activity.

**Architecture:** Keep the teacher as the only live-session authority. The public TV route remains read-only; an authenticated `tv-control` route may navigate the owned session. TV content stays Vietnamese and shared. Student language preferences affect only the personal student projection, using a reviewed static language pack with an explicit Vietnamese-anchor fallback. Existing aggregation and public allowlists remain the data boundary; a new TV stats panel consumes only sanitized aggregate fields.

**Tech Stack:** React + TypeScript + Vite + Tailwind v4 + Firebase Auth/Firestore + Vitest + Firebase Rules Emulator + existing `jszip`/download helpers.

---

## Live model decision

The current OpenCode Desk catalog reports these route resolutions at this run:

| Phase | Route | Live model | Use |
|---|---|---|---|
| Plan/exploration | `balanced-code` | `9router-local/cx/gpt-5.5` | Read code, draft plan, small UI/data changes |
| Implementation | `deep-code` | `9router-local/ag/claude-sonnet-4-6` | Realtime state, language projection, Firestore boundary |
| Independent review | `review-code` | `9router-local/cc/claude-opus-5` | Read-only diff/security/realtime review only |
| Small test/read task | `free-fast` | `9router-local/ag/gemini-3-flash` | Focused inspection or test triage |

Observed cost/quota facts: the four routes reported `free: true` and `connected: true`; provider usage/quota was unavailable, so quota remains unknown. Do not use a Claude UI label such as “Opus 4.8 High” as an OpenCode model reference. Use the minimum route effort needed, keep the strongest reviewer read-only, and stop if live capability/tools are unavailable.

## Scope and non-goals

In scope:

- P31 student language support and visible language state.
- P31 student-facing translation/scaffold pack with Vietnamese math anchor.
- Authenticated TV presenter navigation and safe public TV behavior.
- Step-aware anonymous TV statistics.
- Offline preview navigation and synthetic stats preview.
- Local emulator/browser QA and regression gates.

Out of scope:

- Runtime AI translation.
- Showing student names, raw answers, teacher script, PIN, UID, or private evidence on TV/preview.
- Giving unauthenticated public TV write access.
- Production re-seed, Firestore deploy, commit, push, or Vercel deploy.

## Task 1: Establish RED behavior and preserve the current baseline

**Files:**

- Test: `src/lib/liveLesson/v4/languageSupport.test.ts`
- Test: `src/components/liveLesson/StudentLiveView.test.ts`
- Test: `src/components/liveLesson/TvLiveView.test.ts`
- Test: `src/lib/liveLesson/v4/previewBundle.test.ts`
- Test: `src/lib/liveLesson/v4/runtimeDefinition.p31.test.ts`
- Test: `tests/rules/liveLesson.rules.test.ts`

- [ ] Record the current V4 worktree status and keep every existing dirty file. Do not reset or clean.
- [ ] Run the current focused V4 tests and save the output as the baseline:

```powershell
npm run test -- --run src/lib/liveLesson/v4/runtimeDefinition.p31.test.ts src/components/liveLesson/StudentLiveView.test.ts src/components/liveLesson/TvLiveView.test.ts src/lib/liveLesson/v4/previewBundle.test.ts
```

- [ ] Add failing tests for these exact behaviors before implementation:
  - Selecting `en`, `ja`, `ko`, or `zh` changes approved student labels/action/response copy and keeps math notation unchanged.
  - Selecting `vi` restores Vietnamese anchor copy.
  - Public TV projection remains Vietnamese and does not change when one student changes language.
  - `tv` mode cannot update a session; `tv-control` requires the authenticated session owner.
  - P31 `P16` publishes error-category counts; route steps publish M/S/C counts; text steps publish counts only.
  - `showStats=false` hides stats; `showStats=true` with no stats shows an explicit waiting state.
  - Preview model contains all canonical P31 cues and no private fields.
  - P27 generic `cp-postcheck` remains present and Rules allow exactly 11 canonical steps while denying 12.
- [ ] Run each new test and confirm RED before implementation.

## Task 2: Build the reviewed student language pack

**Files:**

- Create: `src/lib/liveLesson/v4/languagePack.ts`
- Test: `src/lib/liveLesson/v4/languagePack.test.ts`
- Modify: `src/lib/liveLesson/v4/types.ts`
- Modify: `src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4.ts`
- Modify: `src/components/liveLesson/StudentLiveView.tsx`
- Modify: `src/components/liveLesson/StudentLiveView.test.ts`
- Modify: `src/lib/liveLesson/v4/languageSupport.ts`

- [ ] Define a static, reviewed pack keyed by `definitionKey`, language, and public student content ID. It must cover P31 labels/actions, response prompts, four approved glossary terms, sentence frames, and route/scaffold labels. Keep formulas and mathematical symbols in a shared Vietnamese/math field.
- [ ] Use this shape:

```ts
type LocalizedStudentCopy = {
  label: string;
  action: string;
  responsePrompt?: string;
  sentenceFrames?: string[];
};

type StudentLanguagePack = {
  definitionKey: string;
  language: V4NonViLanguage;
  reviewed: boolean;
  copyByKey: Record<string, LocalizedStudentCopy>;
};
```

- [ ] Add `getStudentLanguagePack(definitionKey, language)` and `getLocalizedStudentCopy(...)` with fail-closed fallback to Vietnamese. Never call an AI provider in the runtime path.
- [ ] Keep TV content and teacher/board content Vietnamese. Student language selection must not mutate the public TV state.
- [ ] Replace the current hard-coded `fullTranslationAvailable=false` decision with pack validation. If a language lacks a complete reviewed pack, show “Tiếng Việt + <language>” and translate only approved glossary/scaffold fields; do not label it “Dịch đầy đủ”.
- [ ] Show a compact confirmation after selection: selected language, active support mode, and exactly which layers change. Clear it after a bounded duration or on the next cue.
- [ ] Test all five languages, fallback behavior, formula invariance, and no private fields.

## Task 3: Make TV presentation fill the stage and add safe navigation

**Files:**

- Create: `src/components/liveLesson/TvPresenterControls.tsx`
- Test: `src/components/liveLesson/TvPresenterControls.test.tsx`
- Modify: `src/pages/LiveLessonPage.tsx`
- Modify: `src/components/liveLesson/TvLiveView.tsx`
- Modify: `src/components/liveLesson/TvLiveView.test.ts`
- Modify: `src/services/liveLessonService.ts` only if a typed navigation helper is needed

- [ ] Extend mode parsing with `tv-control` without changing public `tv` behavior.
- [ ] In `tv-control`, load the parent session only after Auth is ready and verify `session.teacherUid === auth.currentUser.uid` before rendering write controls.
- [ ] Add `← Trước`, `Tạm dừng/Chạy`, and `Sau →` controls to the presenter TV view. They call the existing typed `updateLiveLessonState` path and update both `currentCueId` and `currentTvScreenId` atomically from the definition.
- [ ] Public `tv` remains read-only. Unauthenticated TV must never show active write controls or be able to mutate Firestore.
- [ ] Add cue transition animation with a CSS key change and `prefers-reduced-motion` fallback. Do not use a timer that can desynchronize the server cue.
- [ ] Keep the 16:9 presentation stage: no internal vertical scroll, dense screens use measured typography, formulas retain readable line breaks, media and body have bounded regions, and no content is clipped. Add DOM-level browser assertions for `scrollHeight <= clientHeight` on the TV stage at P00/P03/P08/P16/P27/P38.
- [ ] Add a visible “Thống kê đang ẩn/chưa có dữ liệu” state instead of an empty unexplained footer.

## Task 4: Add step-aware anonymous TV statistics

**Files:**

- Create: `src/components/liveLesson/TvStatsPanel.tsx`
- Test: `src/components/liveLesson/TvStatsPanel.test.tsx`
- Modify: `src/components/liveLesson/TvLiveView.tsx`
- Modify: `src/components/liveLesson/TvLiveView.test.ts`
- Modify: `src/components/liveLesson/TeacherLiveView.tsx`
- Modify: `src/lib/liveLesson/aggregate.ts` only if a missing public aggregate helper is required

- [ ] Render only sanitized aggregates after `publicState.showStats` is true:
  - `choice`/`boolean`: option labels and counts, with a compact horizontal bar or cards.
  - `ai-error`: Conceptual/Algebraic/Logical/Missing condition counts.
  - `route`: M/S/C counts.
  - `text`/`exit_ticket`: participant/submitted counts only; never raw text.
- [ ] Keep the existing privacy allowlist and `toPublicStats`. Do not add participant IDs or names.
- [ ] In Teacher Live menu, label the action explicitly: `Hiện thống kê trên TV` / `Ẩn thống kê trên TV`. Show the current publication state and current response count.
- [ ] Add tests for empty, choice, AI Error, route, text, hidden, and malformed/unknown counts.
- [ ] Browser QA with three synthetic students: submit P16 categories, toggle publish, verify TV shows counts; toggle hide, verify counts disappear.

## Task 5: Extend the offline preview artifact

**Files:**

- Modify: `src/lib/liveLesson/v4/previewBundle.ts`
- Test: `src/lib/liveLesson/v4/previewBundle.test.ts`
- Modify: `src/components/liveLesson/TeacherLiveView.tsx`

- [ ] Keep the ZIP as the canonical review artifact: `preview.html`, `manifest.json`, and poster/media entries.
- [ ] Add `← Trước`, `Sau →`, and cue counter to `preview.html`; existing cue chips remain available.
- [ ] Add an optional synthetic stats fixture to the preview only. Clearly label it `Dữ liệu minh họa`, never mix it with real Firestore responses.
- [ ] Preview must show TV 16:9 and HS “Việc em cần làm”/response first, with no auth/network requirement.
- [ ] Test ZIP entries, HTML self-containment, cue navigation, stats fixture isolation, formula text, P27 response, and privacy.
- [ ] Browser download smoke: click the Teacher button, wait for a download, inspect ZIP contents and manifest values.

## Task 6: Re-run all gates and prepare OpenCode handoff

**Files:**

- Modify: `docs/superpowers/plans/2026-09-06-v4-language-tv-stats-plan.md` with final evidence only after implementation.

- [ ] Run:

```powershell
npm run lint
npm run lint:api
npm run test -- --run
npx vitest run --config vitest.rules.config.ts
npx vitest run --config vitest.pilot.config.ts
npm run build
git diff --check
```

- [ ] Run Rules and pilot directly against the already-running emulator when the wrapper would bind a duplicate port. A wrapper that fails to start an emulator but exits 0 is not a pass.
- [ ] Re-read the complete diff and confirm unrelated dirty files are untouched.
- [ ] Browser evidence must include TV P00/P03/P08/P16/P27/P38, HS P00/P16/P27, `tv-control` auth behavior, stats publish/hide, language selection, and downloaded ZIP.
- [ ] Do not commit, push, deploy, or re-seed production. The production handoff must explicitly call out the canonical P31 `lessonId`/re-seed requirement and the separate Firestore Rules deploy.

## OpenCode execution policy

Use sequential OpenCode phases with the live routes above:

1. Plan/review: `balanced-code` route or `9router-local/cx/gpt-5.5`, medium effort.
2. Implementation: `deep-code` route or `9router-local/ag/claude-sonnet-4-6`, medium first; high only for Rules/control-flow failures.
3. Independent review: `review-code` route or `9router-local/cc/claude-opus-5`, read-only, high only if the live catalog confirms tools and quota.

Do not select Claude Opus 4.8 High by habit. It is a Claude UI choice, not the observed OpenCode route; current OpenCode state resolves the review route to Claude Opus 5, while routine implementation resolves to GPT-5.5 or Claude Sonnet 4.6. Quota is unknown and must remain reported as unknown.
