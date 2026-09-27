# Classroom learning loop — session handoff — 2026-08-24

## Workspace

- Worktree: `C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading`
- Branch: `codex/classroom-ai-detailed-grading`
- Base commit: `c787b70`
- No push, merge, or deploy was performed.

## Completed scope

- Preserved and enriched profile evidence across legacy IDs and assignment-aware refs. Same-assignment resubmission replaces the prior evidence instead of stacking; deletion is keyed by exact submission ID; strengths and practice evidence are retained without creating topics or changing levels.
- Added the student practice loop: generated hint-only public set, private answer key, canonical `q1..qN` IDs, key-authoritative scoring, atomic quota reservation, attempt locking/idempotent replay, stale recovery, and formative evidence.
- Added student-safe assignment/submission projections. Secrets and teacher-only notes are removed before the student receives data; Firestore rules deny the raw student reads and all direct practice collection access.
- Added stale grading recovery coverage and the required submissions composite index.

## Verification evidence

- `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" exec vitest run --reporter=dot`: 74 files, 1,088 tests passed.
- `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test:rules`: 7 files, 240 tests passed.
- `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint`: passed.
- `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint:api`: passed.
- `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run build`: passed. Vite emitted existing-style warnings about externalized `stream`, dynamic imports, and chunks over 500 kB; no build error.
- `git diff --check`: passed; Git only reported normal LF/CRLF conversion warnings.
- OpenCode CLI `opencode/x-preview-f-free` (Ox Alpha Free), variant `max` with thinking: the current focused audit was attempted after implementation but ended with `Provider finish_reason: network_error`; no current combined PASS verdict is claimed. An earlier camera-only audit was PASS WITH NOTES and is not evidence for the new supplement feature.

## Important residuals

- Practice quota is intentionally reserved before the AI call; failed AI/output calls do not refund it.
- Answer-leak protection is fail-closed for direct normalized/numeric leaks but is not a semantic-equivalence proof.
- No authenticated browser E2E or production deployment was run in this session.
- Teacher/self existing grading paths still use their pre-existing non-atomic quota flow; they were outside this classroom practice hardening scope.

## P0 camera upload queue addendum

- Approved spec addendum: `docs/superpowers/specs/2026-08-24-skill-mastery-bridge-design.md` now requires camera/gallery selections to accumulate before one submit, with preview/count, remove, retry-preserving queue, and no cross-assignment mixing.
- Implementation: `src/lib/classroom/uploadQueue.ts`, `src/lib/classroom/uploadQueue.test.ts`, `StudentPortalPage.tsx`, and `StudentPortalDashboard.tsx`. First capture now queues; `Chụp/chọn thêm` reopens the same input; `Nộp ... tệp` invokes the existing `submitHomework` contract.
- Verified after the queue change: targeted queue tests `3/3`, full unit `73 files / 1,081 tests`, rules `7 files / 240 tests`, frontend/API typecheck, and Vite build all pass.
- Browser local loaded `/lop` and reached the class-code screen. Authenticated 11 Columbus E2E still requires action-time confirmation before entering the supplied student credentials; do not transmit them or push/deploy until that gate and final review are complete.

## P0 supplemental revision addendum

- Approved addendum: after a `waiting`/`graded` assignment submission, the student can choose `Bổ sung ảnh và chấm lại`; the queue records both assignment and parent submission.
- Implementation: `supplementOf` creates a new server-side revision; server validates the student link, assignment ownership/open state, parent lineage, owned Storage URLs, 12-file/text limits, and leaves the parent grade/history untouched. The new revision can be self-graded or sent to the teacher; self-grading calls the existing `gradeOne` path on the merged revision and does not approve it.
- Deletion safety: teacher deletion queries other submissions before Storage cleanup so URLs still referenced by a child revision are preserved.
- Verification after the addendum: focused supplement/delete/revision `17/17`, full unit `74/1,088`, rules `7/240`, frontend/API typechecks, production build, and diff check passed.

## Next safe action

Before any push/deploy, an authenticated browser E2E against the intended environment remains the only product-flow check not run; deployment remains deliberately pending explicit approval. Ox re-audit should be retried when the provider network is available.
