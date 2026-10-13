# R15 backend — 13/10/2026

Implemented in existing Site WIP. No commit, push, deployment, AI call, real student mutation.

## Files

- `lib/lesson/class-service.js`: shared namespaced summary; unpack durable state; preview/package tombstone guard; family hint assistance; source-CAS withdrawal/regrade reconciliation; checkpoint only after full session sync; pupil passport exact source tuple before/after all projections.
- `lib/lesson/learning-records.js`: teacher-owned compact roster (50/page), member detail (500 + truncation), summary latest task family per package across sessions (preserves previous mastery/retry policy), date bounds, session/member/host validity rechecks, explicit one-session cursor backfill; exposes class/member snapshot for export/plan race protection.
- `lib/lesson/learning-plan-service.js`: rule-based persisted drafts; teacher text edits; explicit approval; exact source + revision CAS; immutable last30 revisions in response; stale full-history fingerprint independent of displayed date range; empty/truncated/uncollected sources cannot approve; saved delete/restore through generic Trash.
- `app/api/lesson-classes/route.js`: records/detail/backfill/plans/export wiring. Teacher GET records performs no DB writes; pupil bearer cannot select any teacher action. Same-origin POST bound. No raw answers/private comments/PIN/token in response.
- `app/api/trash/route.js`: restores kind `learning-plan` using scoped service.
- `db/schema.ts`, `drizzle/0023_r15_learning_records.sql`, journal/snapshot: three additive tables; `lesson_evidence_sync`, `lesson_learning_plans`, `lesson_learning_plan_versions`.
- `tests/r15-learning-records.test.mjs`, `tests/lesson-classes.test.mjs`, `tests/lesson-leagues.test.mjs`, `tests/r16-class-deletion.test.mjs`: regression/new migration fixtures.

## Verification

- `node --experimental-vm-modules --test tests/lesson-classes.test.mjs tests/r15-learning-records.test.mjs`: 26/26 PASS at final passport source CAS fix.
- `node --experimental-vm-modules --test tests/lesson-class-binding.test.mjs tests/lesson-launch-attendance.test.mjs tests/lesson-leagues.test.mjs tests/r16-class-deletion.test.mjs`: 50/50 PASS.
- `npm run typecheck`: PASS.
- `npx eslint lib/lesson/learning-records.js lib/lesson/learning-plan-service.js lib/lesson/class-service.js app/api/lesson-classes/route.js app/api/trash/route.js`: PASS, zero errors.
- 150 students × 20 lessons synthetic Node SQLite: 9 bounded queries, 195064 bytes, observed p95 39–90ms (last isolated final sample 55ms). Not production D1/classroom evidence. Reads compact evidence and SQL source fields; no durable full state loaded into JS on dashboard.

Reproductions: objective/task collisions; variant/retry non-inflation; pending distinct; assistance/group/Should/recheck; withdrawn submissions; reassessment; owner/foreign teacher/pupil bearer/revoked teacher/class/member; partial sync CAS cannot project; source revision during read; package approved→draft/deleted/content hash/preview during pupil passport read; plan approve CAS during regrade; stale draft vs immutable approved history; Trash ownership/restore; 500 truncation refusing plan mutation; time filters.

## Deliberate ceilings

- Teacher records show only evidence from a full-session checkpoint matching current source revision. Any control revision may require explicit **collect** before reliable projection. Existing per-member live sync is preserved; it does not certify a full-class snapshot.
- Collection is at most one session/request; separate batches max100 writes. A failed partial sync remains invisible until a successful collect.
- Detail 500 rows; plans require untruncated full history. Teacher can still read the separate complete compact objective summary. Summary cap10000 latest family rows; larger scope refuses rather than silently truncates.
- Suggestions select the type of next activity; teacher must choose/add approved material. No AI prediction or automatic assignment. Students without any known objective get an explanatory empty draft, which cannot approve.
- GET pupil passport retains its old own-history lazy reconciliation for compatibility. New teacher dashboard never invokes mass history sync during reads. Changed source rejects 409 rather than returning stale mastery.
- Additive migration rollback keeps evidence/plan/version rows. An older Worker ignores new tables; do not drop tables during rollback.
- Real Worker/browser/full-suite/build/cross-provider release review delegated to parent. No production certification claimed here.

## R15.2 final acceptance improvement

Supersedes generic-suggestion ceiling above. Rule drafts now read at most 30 distinct approved active-class packages (no durable raw state loaded into JS), fill known missing-evidence objectives, select existing individual precheck/recheck/support/core/extension tasks according to evidence status, require objective + activity membership. Literal task ID, prompt, options retained; existing approved formula text unchanged. Pending still asks teacher to grade first. Missing material asks teacher to add it; no fabricated exercise. Assembled activity max1500/recheck max1000; oversized tasks skipped without truncating content. Existing time budget used (1–60 minutes). No UI/API body field change.

Plans bind both individual evidence source snapshot and approved class package identity/hash snapshot; withdrawal cannot approve a missing-evidence plan, unrelated student events do not change that missing-member fingerprint. Known-objective missing member can approve after teacher review. Truly unknown/empty class stays explanatory unapprovable draft.

Changed only `lib/lesson/learning-records.js`, `lib/lesson/learning-plan-service.js`, `tests/r15-learning-records.test.mjs`. Final focused class + R15 tests30/30 PASS; new cases missing-evidence literal diagnostic, namespace collision, achieved extension, supported/pending, unrelated learner revision, material withdrawal SQL race, literal options, oversized candidates. Final synthetic sample9queries/195064bytes/p95 103ms under concurrent machine load. Parent must rebuild/check exact new candidate; prior full-suite/browser proof does not cover this final improvement.
