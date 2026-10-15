# SmartPlan Production Fixes Handoff Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Repair confirmed production defects from deployment `6d231ac8c02e605a42db29208a015c0976b2f279` without touching unrelated WIP in the original checkout.

**Architecture:** Work from a clean worktree rooted at the production commit. Keep UI fixes local to their components. Keep scoring and Firestore fixes covered by focused regression tests and emulator tests. Do not deploy from this worktree.

**Tech Stack:** React + TypeScript + Vite + Firebase Firestore Rules + Vitest.

---

## Protected context

- Original checkout: `C:/Users/ADMIN/Downloads/smart-lesson-plan-ai` contains unrelated dirty WIP. Do not reset, stash, rebase, or edit it.
- Fix worktree: `C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai`.
- Baseline commit: `6d231ac8c02e605a42db29208a015c0976b2f279`.
- No production writes, deploy, commit, or push authorized by this plan.

## Confirmed defects

- `ViewPlanModal` omits `plan.content`; live preview is blank.
- True/False answers are stored as `Đ,S,Đ,S`, while server scoring only parses JSON.
- `lessonPlans` list rule allows any authenticated account to enumerate private plans.
- `personalizationCache` is publicly readable and writable.
- Online exam password is collected but never enforced by the API/student flow.
- Password protection must also cover the `examId` result/review lookup path; a locked-code response must not reveal an exam ID that enables an unproved lookup.
- Creator navigation resets unsaved editor state.
- Template upload updates only React state and is lost after reload.
- Saved exam editor path fills the prompt but does not replace the selected result.
- Header feature search is a no-op.
- Adaptive publishing treats missing required lesson content as warnings only.
- Saved/generated Vietnamese math content needs a separate content-quality pass; do not silently alter teacher-authored material.

## Implementation order

### Task 1: Preview rendering

- [x] Add a component test proving a plan's markdown appears in `ViewPlanModal`.
- [x] Render `plan.content` with the existing markdown/math plugins.
- [x] Keep export controls unchanged; make the header responsive with wrapping/scroll-safe layout.
- [x] Run the focused modal test and TypeScript check.

### Task 2: True/False scoring

- [x] Add failing tests for CSV answer keys: all four correct, one correct, empty/invalid payload.
- [x] Normalize both CSV (`Đ,S,Đ,S`) and JSON into the same `{a,b,c,d}` representation.
- [x] Reject missing sub-answer keys instead of counting `undefined === undefined`.
- [x] Run `api/__tests__/exam-scoring-core.test.ts` and API typecheck.

### Task 3: Firestore security

- [x] Add emulator tests proving a different authenticated user cannot list/read a private `lessonPlans` document.
- [x] Replace the broad `lessonPlans allow list` rule with an owner/public-safe condition compatible with every client query.
- [x] Deny direct client access to `personalizationCache`; the client already falls back to in-memory cache.
- [x] Run `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run test:rules`; `10` files, `309/309` pass. Intentional unrelated `[LỖ HỔNG]` sentinels remain outside the repaired cases.

### Task 4: Online exam password

- [x] Add API regression tests for locked-code, unproved `examId`, and proved result lookup.
- [x] Add a minimal server-side password verification path without returning the stored password.
- [x] Update student UI to request password only when the server says it is required.
- [x] Require a matching submitted/graded `proofSubmissionId` for password-protected `examId` result/review lookup; strip the locked exam ID.
- [x] Run exam API tests; password helper and public-result suite pass.

### Task 5: State durability and editor routing

- [x] Preserve the current editor when clicking the active Creator tab or another tab with unsaved content.
- [x] Persist template file updates through the existing `updateTemplate` Cloud save path.
- [ ] Verify template reload behavior in a live authenticated browser session.
- [x] Make saved-exam editor load the selected exam result, not only `initialContent`.
- [x] Wire feature search to an actual filtered navigation result.
- [x] Port true/false scoring parity to `src/utils/examScoring.ts`; focused server/client parity suite passes.

### Task 6: Adaptive publishing gate

- [x] Add a failing validator/publish test for missing objective, knowledge, pre-check, and exit-check content.
- [x] Classify required structural gaps as blocking errors.
- [ ] Preserve non-blocking advisory warnings for optional quality suggestions.
- [x] Run adaptive validator/publish readiness tests; focused file passes `4/4`.

## Deferred handoff items

- Validate generated Vietnamese math content against source curriculum before release; current stored “Mệnh đề” artifact contains an incorrect equivalence explanation.
- Fix generated exam metadata defaulting to stale school year `2024-2025` when current date is October 2026.
- Fix Word export pagination: orphan `ĐÁP ÁN` heading and awkward answer-table continuation.
- Reduce production entry chunk (`index` observed around 1.53 MB) below the project 1 MB budget.
- Re-run production GV/HS permission QA with real sessions after Rules deployment; source fixes alone do not prove deployed Rules.
- Investigate the remaining unit-test timeout in `api/__tests__/parent-portal.test.ts`; do not raise timeout blindly.
- Re-check current dirty WIP in the original checkout before any integration or deployment decision.

## Verification gate

- [x] `git diff --check`.
- [x] Focused regression tests for each changed behavior.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run lint`.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run lint:api`.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run test`: `297` files, `3153/3153` pass.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run test:rules`: `309/309` pass.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run build` succeeds; existing large chunks remain (`index` ~1.53 MB).
- [ ] Read final diff; confirm no unrelated WIP or generated artifacts are included.
- [ ] Stop before deploy; hand this plan and verification evidence to Claude for independent review.

## Independent QA feedback

- Claude found the original password bypass via `examId` and client/server true/false scoring drift.
- Follow-up fixes now omit the locked exam ID, require a matching submitted/graded proof submission for protected `examId` lookups, and align client scoring with server parsing.
- Focused follow-up: `33/33` exam/server/client scoring tests pass; app/API typecheck pass. Final Claude recheck is pending because Claude Desktop reconnect is currently blocked by permission-class mismatch.
