# Zalo deadline option A — implementation checkpoint, 2026-11-09

> CURRENT AUTHORITY — 2026-11-10: owner requested publication now ("Bạn xuất bản đi, cloud hết quota rồi, tẹo báo cáo nó QA lại sau"). This supersedes the historical no-commit/no-deploy and Claude-before-commit gates below. Publish only the bot project after local gates; automatic sends stay OFF. No live student message, Sheet edit/sharing, source approval provisioning, scheduler activation, main merge or push is included. Claude QA follows publication.

Owner directly confirmed option A in this thread. Checkout: `C:/Users/ADMIN/Downloads/spai-assistant-ph-hs`, branch `preview/zalo-live-test`, baseline `1a6c17a1164191488e15e72bf3f6d99b89c3e374`.

## Permissions and preservation

- Implement deadline menu, publication notifications and a disabled-by-default 07:00 Vietnam digest; tests and local commit after acceptance.
- No push, merge, deploy, real student/parent message, live data write or Google Sheet edit/sharing change.
- Preserve staged `scripts/zalo-webhook-sync.cjs` (index blob `d69ec79bfdc315959937c132f0902c09dc085d09`) and unstaged `tasks/zalo-improvements-2026-11-06.md`.
- Do not touch the primary app checkout or the `.codex/worktrees/ph-hs-phase12-review` lineage. Synthetic test data only.

## Checklist

- [x] Verify repository, branch, baseline, WIP and routing policy.
- [x] Record approved scope and inspect existing menu, web publish handlers, web handoff and Sheet sync boundaries.
- [x] Owner selected teacher-only web configuration without Sheet edits; existing service-account read-only architecture approved, actual sharing changes still unapproved.
- [x] Deadline menu/commands implemented; focused synthetic tests cover linked identity, upload number 11 precedence, source failure, code mappings and safe links.
- [x] Publication/update notices implemented with polling, persistent per-student snapshots, first-sync baseline, semantic-version dedupe and explicit delivery states.
- [x] Vietnam 07:00 digest implemented, bounded message with full-menu fallback, per-student/date claim, server delivery default off.
- [ ] Independent review, exact test counts and local commit limited to this feature.

## Required design constraints

1. Read only configured Sheet ranges server-side using a read-only Google credential. Existing BTVN sync uses the teacher's browser OAuth; that credential is not presently a server-side read solution. No public-sharing requirement or embedded credential.
2. Sheet row/column positions are not identities. Maintain explicit mappings from canonical student codes and stable task IDs; ambiguous or changed headers/duplicates fail closed pending teacher remapping. Do not infer identity by matching row numbers or silently guessing names.
3. Current source lacks publication status, stable task IDs and student codes. Owner selected authenticated teacher web configuration; source stays unchanged. Configuration stays server-only.
4. Use exact assignment IDs already present in homework links to reconcile web and Sheet evidence. Do not conflate a classroom check with an online submission; ambiguous evidence is displayed as such. Submitted/grading/graded/teacher-review attempts are not "chưa nộp". Uncertain photo review says "cần kiểm tra/bổ sung". Optional tasks require explicit recipients/sign-ups; closed/cancelled tasks never create reminders.
5. Read current membership and active bot links immediately before sending. Only the configured bot account and linked student recipient qualify. No parent/group sends. No full-workbook URL in student messages; task URLs must be safe HTTP(S) and exclude links into private workbook tabs.
6. Reuse existing web handoff where a web assignment needs authentication; never put PINs in links. An expired handoff can be renewed through the bot. Menu commands must not consume an upload-list number or erase an active photo session.
7. Queue claims are transactional. Treat network failures as unknown delivery; do not automatically retry an ambiguous send. Explicit failed/unattempted deliveries can retry with bounded backoff; store result metadata without tokens or raw sensitive payloads. Existing `sendStyled` returns void and suppresses delivery errors, so it cannot alone provide authoritative delivery receipts.
8. Digests use Asia/Ho_Chi_Minh (UTC+7) dates, due-today and next-three-day boundaries; scheduler triggers may drift, while per-recipient/date keys prevent repeats. A failed/stale Sheet read must not generate an all-clear message. Schedule source must support the agreed cadence; no external scheduler is provisioned in this task.

## Planned integration boundaries

- `api/_assistant-deadline-sheet.ts`: bounded read-only Sheet reader, parser and mapping validation.
- `api/_assistant-deadline.ts`: current-student projection, evidence reconciliation and formatted menu/digest.
- `api/_assistant-deadline-notify.ts`: publication-version detection, outbox claims/results and scheduled dispatcher.
- `api/_assistant-deadline-config.ts`: teacher-authenticated configuration and preview, with explicit first-sync baseline.
- Integrate existing `api/_assistant-zalo-bot.ts`, `api/_assistant-ph-hs-menu.ts`, `api/_classroom-teacher.ts`, `api/assistant.ts`, `api/classroom.ts` only as needed. Cover upload, online exam and adaptive publication paths; cosmetic edits do not notify.
- Approved: `src/components/features/classroom/DeadlinePanel.tsx`, one integration in `ClassesTab.tsx`, minimal teacher service wrappers.
- Synthetic tests in `api/__tests__/assistant-deadline*.test.ts`, plus existing bot and teacher publish regressions.

## Verification gates

- Before implementation: `node node_modules/vitest/vitest.mjs run api/__tests__/`; `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.api.json`.
- Feature RED/GREEN cases: unauthorized/wrong-class access, shuffled students, moved/duplicate columns, optional applicability, first-sync suppression, repeat/update dedupe, stale reads, concurrent dispatch, unknown-send no retry, withdrawn membership, submitted-but-unapproved evidence, exact Vietnam date boundaries and empty-day behavior.
- Final: all API tests and API typecheck. If `src/` changes: frontend typecheck and `npm run build` too. Report exact passed/failed/skipped counts; preserve accepted v832 fixture failures as explicitly reported baseline rather than repairing unrelated code.
- No real-send or deploy acceptance claimed from fixture tests. Real Bot Platform quota verification and production enablement remain separate, unapproved gates.

## Orchestration preflight — blocked before inference

Skill `dieu-phoi-ai`, policy hash `12ab731a103949d66b35ba7d080d26a690646d817ce63681259e03ddfad572e8`.

- Doctor completed; no worker started.
- Plan job `418a36aa-3f1a-40ea-8754-05e706a0b6fd`, revision 1, status PLANNED, `inference: false`.
- Worker routes `nvidia-glm` and `glm`: `data-policy-blocked` for private project source.
- Independent reviewer routes `reviewer` and `sol`: `route-not-verified`.
- Owner explicitly approved direct Codex implementation and independent Claude review before commit. Do not relabel source, change routing policy, retry blocked workers or use Astra/wallet fallback.

## Baseline results

- All API suites: exit 0, 112 files passed / one skipped; 1,365 tests passed / eight skipped (1,373 total). No exclusions applied to this API-only run. Raw local log: `%TEMP%/zalo-deadline-baseline-vitest.log`.
- API TypeScript: exit 0, no diagnostics.
- Staged webhook-sync blob reread unchanged; original QA note remains unstaged. Only the new checkpoint was added by this task.

## Implemented behavior and limits

- Student menu 11 / `deadline` / `việc cần làm`; upload-list numeric selection takes precedence. Viewing deadlines does not erase photos. The full workbook is never linked. Web assignment instructions use the existing public `description`, never grading instructions/answers. Existing `web` command issues authenticated handoff without a PIN URL.
- Teacher panel lives beside Sheet sync in class assignments/submissions. It reads the already-linked file's `01. DEADLINE` tab only, maps canonical student codes to unique exact names, maps stable task IDs to unique headers, controls draft/published/closed state, optional recipients and web assignment reconciliation. Saving does not edit the Sheet.
- Source reads are native OAuth JWT with only `spreadsheets.readonly`, existing service-account JSON/base64/env (snake/camel JSON supported), no new dependency or credential. Fixed range A1:GR200 and 2 MB response ceiling. Missing/changed mappings, invalid dates and source failures stop reminders; no false all-clear.
- Web upload, online exam and adaptive assignments are polled independently of teacher saves. Closed/locked/other-target tasks disappear; accepted attempts are not missing. Actual photo-review schema and question clarification remain review. A checked Sheet with no linked web submission explicitly requests reconciliation.
- First observation per bot/class/student creates baseline only. Cosmetic title/private grading edits do not notify. Due/public instructions/URL changes and reopen cycles get new generations. Transactions reject stale observations and bound one student's work to 400 notices (401 writes including snapshot).
- Each outbox send revalidates source before transactionally claiming a fresh current student/private link, class owner, roster membership and snapshot generation. Network ambiguity becomes `unknown`; a crashed `sending` job never automatically retries. Explicit rejection retries at most three times. Source outage before claim remains retryable because no send was attempted.
- Morning digest runs only in the 07:00–07:59 Vietnam window, one deterministic student/date job. Message <=1800 characters; full list remains in `deadline`. A changed digest is cancelled rather than sending stale status. This favors freshness over guaranteed delivery during changing data or outages.
- Bounded reads: 100 roster students, 200 regular assignments, 100 adaptive assignments, 2000 documents per submission/progress source, 500 class links, 1000 pending/rejected outbox entries. Over-limit class fails closed; pagination is the upgrade path.

## Scheduler integration — not provisioned or enabled

- Reuse existing function: authenticated `GET /api/assistant?transport=deadline`. Header `Authorization: Bearer <dedicated secret>`; `ZALO_DEADLINE_CRON_SECRET` must be at least 32 characters. No extra serverless function. Response is count-only plus `nextAfter`; caller follows `&after=<nextAfter>` until null, at most three classes per invocation.
- New index definition in `firestore.indexes.json`: assistantDeadlineOutbox classId/state. It has NOT been deployed.
- Both class settings default false. Server gate `ZALO_DEADLINE_ENABLED=true` is additionally required. Initially only `ZALO_DEADLINE_TEST_USER_IDS` can receive. Real delivery requires BOTH `ZALO_DEADLINE_REAL_APPROVED=true` and `ZALO_DEADLINE_QUOTA_VERIFIED=true`. Existing ZALO_BOT_ID/token/allowed-ID binding is verified with getMe.
- For useful new-task notices, a future approved scheduler must call every 5 minutes, including 07:00 Asia/Ho_Chi_Minh, and follow all pages. Native once-daily Hobby scheduling cannot provide that cadence; no hosting-plan upgrade, external scheduler or app automation was created. Maximum 20 jobs per class/invocation; excess drains on later polls. First activation observes a baseline and does not notify historical work.
- Before rollout: owner approves exact existing service-account email/file permission (file-wide View; code reads only deadline range), quota and scheduler source; Claude review passes; deploy index/code through approved workflow; verify synthetic chat on the actual webhook alias. No production readiness claimed here.

## Independent review gate

Verified live Claude task `Zalo bot context review`, session `00d5b8f4-d4ca-4ea8-99ca-71dc2efcecb5`, native task `local_d64a73d8-5a59-4737-a834-9d8840f9fcf7`, project cwd `C:/Users/ADMIN/Downloads/smart-lesson-plan-ai` (review must explicitly read this spai checkout).

Bridge refused before delivery: `CLAUDE_RECIPIENT_CLASS_MISMATCH`, sender bypass versus recipient auto; no explicit crossSessionInbound acceptance. `sent:false`, report `04738a1c-2b6a-4e4d-8f9b-8f0de6194a13`, bridge 1.26.10. No permission setting was changed. Leave diff uncommitted. Owner may manually ask the existing Claude task to review this checkpoint and exact checkout, or align session permissions/explicit inbound acceptance before relay retry. Do not replace the session or bypass the boundary.

Synthetic memory transaction harness is NOT Firestore-emulator proof. No browser E2E, live Sheets auth/read, real Zalo delivery or deployed cron/index verification has occurred. Final gate results are recorded below after completion.

## Final local gates — 2026-11-09

- `node node_modules/vitest/vitest.mjs run api/__tests__/`: exit 0; 118 files passed, one skipped; **1423 tests passed, 8 skipped** (1431 total). New feature suites contain 55 tests; three new bot integration tests. No exclusions or old-fixture repairs. Log `%TEMP%/zalo-deadline-all-api.log`.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.api.json`: exit 0, no diagnostics.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`: exit 0, no diagnostics.
- `npm --prefix C:/Users/ADMIN/Downloads/spai-assistant-ph-hs run build`: exit 0 on final UI source; 5079 modules transformed, 50.35s. Existing large-chunk, browser-externalization and xlsx export warnings remain outside this scope. Log `%TEMP%/zalo-deadline-build.log`.
- `git diff --check`: exit 0. Index JSON parsed successfully. No new serverless function (existing function-count tests passed).
- Branch/HEAD unchanged: preview/zalo-live-test / 1a6c17a1164191488e15e72bf3f6d99b89c3e374. Only preexisting staged file remains scripts/zalo-webhook-sync.cjs, with original blob d69ec79bfdc315959937c132f0902c09dc085d09. This task did not edit the existing QA note.
- **Status: code locally verified, independent Claude review BLOCKED, no commit/push/deploy.** No background worker continues this task after the final reply.

Manual review request: ask the existing Claude `Zalo bot context review` task to read this checkpoint and review ONLY the new deadline files, their tests, and integrations listed above in this exact spai checkout. Include `firestore.indexes.json`. Preserve staged webhook script and existing QA note. Review read-only; do not commit, send live messages, read live student data or deploy. Return PASS or NEEDS_FIX with severity/file:line and missing validation. The relay's refusal is not approval to change permission settings or substitute another chat.

## Publication QA fixes — 2026-11-10

Verified the review findings locally before release. RED log `%TEMP%/zalo-deadline-review-red.log` reproduced eight failing cases; a separate layout RED check also failed before its fix.

- Service-account authority now requires admin-provisioned server-only `assistantDeadlineSources/{classId}` = `{ active: true, teacherId: <current ownerId || legacy teacherId>, spreadsheetId: <approved exact file> }`. Existing teacher-written class Sheet metadata is no longer authority. No approval document, credential or permission was provisioned. Default Firestore rules have no client match for this new collection. Missing/disabled/foreign-owner approval prevents Google reads.
- Fixed the unbalanced Google fields mask; exact parameter regression test added. Validate due/link row labels too. Persist task column bindings on save; column-only movement now blocks runtime until teacher preview/remap/save, rather than silently binding another checkbox column.
- Dedupe uses bot/class/student/task/semantic-version, independent of disappearance/reappearance. Ambiguous outcomes cannot obtain a new generation and resend. Persist actual Sheet task publish revisions; web/adaptive reopen stores noticeRevision. Unrelated task reopen leaves other notice versions unchanged.
- Dispatcher queries a bounded due page ordered by nextAt, never throws on total outbox count. Eligibility precedes the 20-send budget. Unapproved rows rotate five minutes; removed/unmapped/expired rows cancel. New notices/digests enqueue only for allowed recipients. Claims still revalidate current private student link, roster, current owner and snapshot. Notice maximum age = 24 hours.
- One bounded Sheet snapshot per class/run (60-second ceiling), with Firestore source approval/config/membership refreshed before each claim. Digest uses the invocation's scheduled time consistently. Changed digest text cancels the day rather than delivering stale information; guaranteed refresh/replacement remains a later enhancement.
- Numeric 11 remains an upload choice during upload selection, per the approved precedence. Explicit `deadline` always opens the deadline menu without clearing photos. Source errors now explain `web` and `0` recovery.
- Preserved the independently deployed dca55a9 standard portal + PIN behavior in all AI reply paths and its tests. Verified dca55a9 is the only commit beyond the starting baseline; no other release change was overwritten.

Release target: Vercel project `spai-assistant-ph-hs` (`prj_GAgeAt2ilHAwMaesbk75AFZG5EfX`), team `team_G0veCWK3e2zi31AABr6Pfdw9`, alias `zalo-test.congapro60-devs-projects.vercel.app`.
Rollback target captured before release: `dpl_Geuj1QMGDjS7q1BvtBRnFMGN4T4X`, `spai-assistant-ph-amm5icu9n-congapro60-devs-projects.vercel.app` (READY, production). Production env name inspection found no ZALO_DEADLINE variables: delivery remains default OFF.

Still pending before real reminders: admin approves exact file/class/current owner; existing service account receives View on that file if needed; teacher maps students/tasks; outbox composite index (classId/botId/state/nextAt) is deployed; scheduler and Bot Platform quota are verified; owner activates server delivery gates. These are NOT enabled by publishing code. No real messages or live Sheet student data were used in this QA. Synthetic transaction harness is not Firestore emulator proof. Browser/live Zalo E2E deferred to independent QA.

## Verified release gates (before commit)

- API: 118 test files passed / one skipped; **1439 passed, 8 skipped**, exit 0 (`%TEMP%/zalo-deadline-publish-api.log`). Six deadline suites now contain 69 tests. No excluded suites or accepted v832 fixture edits.
- API and frontend TypeScript checks: run against the release source; result recorded by the publication turn.
- Frontend build: exit 0, built in 1m30s (`%TEMP%/zalo-deadline-publish-build.log`). Existing chunk-size warnings unchanged.
- `git diff --check`: exit 0. Existing staged webhook-sync index blob remains d69ec79bfdc315959937c132f0902c09dc085d09; original QA note remains outside this change.
- Deployment is created from a clean git archive of the scoped commit, excluding the two unrelated WIP files and local ignored credentials. The existing bot alias changes only after READY and pre-alias smoke checks. No main merge/push.
