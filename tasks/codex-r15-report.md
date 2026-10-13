# R15 — local implementation and QA, 2026-10-13

R16/R17 production v11 published successfully. R15 local implementation includes teacher learning records, editable/approved evidence-based plans and controlled JSON/CSV export. GiaoAnDewey manual import receiver implemented in an isolated checkout. R15 not published; separate owner release choice pending. R15.4 automatic sync not implemented: requires chosen-class manual pilot and scoped account linkage first.

## What works

- `/hosts` → Hồ sơ học tập. Explicit class/date selection; 50 pupils/page, page filters, objective status and per-pupil evidence timeline. Teachers read compact evidence, not whole-history state; explicit one-session cursor collection reconciles older/stale records.
- Objectives namespace package hash/code; repeated task families/variants never inflate counts. Preview, revoked pupils/hosts, deleted rooms/classes/packages, stale or partial checkpoints excluded. Pending assessed state separate, no zero-score conversion. Source races reject instead of returning stale mastery.
- Suggested plans use literal individual tasks/options from <=30 approved active-class packages; diagnostic/recheck for missing evidence, support/core/extension when available. Missing material explicitly needs teacher addition. Teacher edits, approves, immutable version history, full-history/source fingerprint/CAS, Trash/restore. No automatic assignment, new AI call or discovery task.
- JSON stable source IDs/revisions/scope, no raw answers/PIN/token/private notes. CSV formula-prefix protection. <=50 pupils, <=5000 compact rows; pupil detail <=500 rows; overflow refuses rather than exports partial history.
- Receiver: `/api/classroom` existing endpoint, Firebase teacher session + transactional active class/member/roster authorization. Explicit ID mapping, preview/import/revision/dedup/scoped snapshot retraction. `externalLearningEvidence`/`externalLearningBatches` server only, manual source unverified, no skill/grade cast. Recoverable batch archive/restore CAS.

## Evidence

| Check | Result | Artifact |
|---|---|---|
| Site full final suite | 1359/1359 PASS | codex-r15-tests-final.log |
| Site typecheck/build | PASS | codex-r15-typecheck-final.log / codex-r15-build-final.log |
| Site full lint | 0 errors /392 warnings before final literal-task change | codex-r15-lint.log |
| Site final scoped lint | 0 errors /1 existing passport navigation warning | codex-r15-lint-scoped-final.log |
| Site synthetic150×20 | 9 queries,195064B,p95 around55ms in SQLite; not production latency | codex-r15-focused-final.log / codex-r15-backend-report.md |
| Actual compiled Worker/D1/R2 | owner/foreign/anonymous/pupil, backfill, plans/CAS/Trash/export and missing-pupil approved task PASS;0 external calls | codex-r15-native.json |
| CUA Site | host→records/class/detail; edit/approve/delete/Trash/restore; JSON download; history; KaTeX CSS;375px no horizontal overflow; literal approved diagnostic preview | codex-r15-records-desktop.jpg / codex-r15-records-mobile.jpg / codex-r15-plan-approved-material.jpg |
| Cross-provider review | Gemini Flash low final PASS0 for backend/UI/export | codex-r15-review-material-final-frozen.json / codex-r15-review-ui-final.json / codex-r15-review-export-final-frozen.json |
| Receiver full suite | 2889/2889 PASS,269 files | receiver tasks/r15-parent-full-tests.log |
| Receiver focused | 59/59 PASS; exact actual Worker JSON fixture imported | receiver tasks/r15-receiver-report.md |
| Receiver actual emulator | Admin transaction2/2; Rules4/4 PASS | receiver report/logs/tests/rules |
| Receiver typecheck/build/diff | PASS | receiver tasks/r15-receiver-build.log / r15-parent-api-typecheck.log |
| Receiver CUA | actual panel/API simulated: file→mapping→preview→import→archive→restore;4 records | receiver tasks/r15-receiver-browser-evidence.json / r15-receiver-browser.jpg |

Receiver checkout `C:/Users/ADMIN/.codex/worktrees/r15-game-records-receiver/smart-lesson-plan-ai`, branch `codex/r15-game-learning-receiver`, baseline production `a7b7f93b6accf679ed90dbf1c91f1201fa8ce8e3`. Dirty Downloads/4c87 preserved. Source manifest12files `tasks/r15-receiver-source-manifest.json`. No receiver push/deploy, no real pupil data.

## Remaining gates and ceilings

1. Owner release decision under shared plan19.9; user authorized R16/R17 publication followed by R15 implementation. New R15 release choice pending. Do not claim R15 online yet.
2. Real teacher/student permission QA and one chosen-class manual pilot before claiming integration operational. UI mocked receiver QA does not replace live account proof. No real transfer without teacher mapping/approval.
3. R15.4 one-way authenticated server sync, account challenge/class scope/rotation/revocation/retry; only after pilot. No fake connection toggle or broad Firebase credentials.
4. Retention not chosen: no automatic purge. Downloads outside system cannot be revoked automatically.
5. Receiver <=350KB,<=400 changes including retractions/source writes/batch,<=400 historical rows/source; overflow rejects atomically. Import smaller pupil/time scopes. Roster200 max,source10 andbatch20 cursors.
6. GET pupil passport retains prior own-history reconciliation; teacher dashboard read-only. Any classroom control revision can require explicit collect before certified class snapshot. Plans >500 pupil evidence need later bounded history support, cannot silently approve partial data.
7. Receiver baseline main JS bundle1485KB exceeds historical QA guide1000KB ceiling; build succeeded, no claim broad bundle performance approved. No unrelated optimization in R15.
8. Preexisting adaptive anonymous Rules route flagged by review outside R15 scope; not reused by receiver, no claim exploit verified or fixed. Two new collections Rules proved denied separately.

Migration0023 adds evidence-sync/plans/versions only. Rollback retains these tables and data; no table drops. R16 tombstones remain authoritative, never blindly revert to older Worker after saved deletes.

Intermediate full Site run timed out one workerd test under parallel CPU load (1353pass/1cancelled); final bounded-concurrency fullsuite above passes. Review without class-service/Trash context gave false raw-variant/restore findings; final integrated review supplied actual normalization and routing, PASS. No unchecked finding silently counted as PASS.
