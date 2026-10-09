# HANDOFF — signal-station-site
## 2026-10-08 — current source download checkpoint

- Repo/branch unchanged; all dirty WIP preserved. No commit/push/deploy/remote migration.
- GET `/api/lessons/sources?id=<id>&download=original` now returns verified original DOCX/PDF bytes; owner-scoped before R2 read, failed-parser originals allowed, SHA-256 checked before response. Metadata GET unchanged.
- Headers: original MIME, Content-Length from verified bytes, RFC5987 Unicode attachment name, no-store, nosniff. Regression covers missing/corrupt original, owner isolation, learner bearer rejection and Unicode/apostrophe names.
- Final local gates: full 466/466, typecheck/lint/build/diff-check exit 0. Build retains KaTeX asset duplication and route classification warnings. Antigravity `ag/claude-sonnet-4-6` review APPROVE; rejected its incorrect claim about encodeURIComponent apostrophe and kept R2 pre-read size guard.
- Antigravity desktop screenshot confirms Opus/Sonnet 5.5, Gemini 3.8. Current 9Router ag catalog exposes Claude 4.6, Gemini 3.8, GPT-OSS. Actual calls to `ag/claude-opus-5-5` and `ag/claude-sonnet-5-5` return upstream404; valid 5.5 IDs remain unresolved. Gemini3.8/Sonnet4.6 calls succeeded directly through 9Router.
- A configuration search exposed API key strings in tool log; user notified to revoke/replace exposed credentials. Do not print provider config/keys again.
- Still required: OCR, authenticated Teacher Studio UI E2E/session creation, presenter handshake, mobile/TV classroom rehearsal, production persistence/QA and broader P1/P7 content.

## 2026-10-08 — P5 lesson proposal checkpoint

- Added `lib/lesson/proposal.js`: conservative deterministic proposal from extracted source signals. Recognizes Toán 11 Dãy số, collaboration language, map/rule/participation, six-step 40-minute arc and uncertainty codes. Output always `needs_review`; no answers, LO approval, mastery or live execution.
- Added owner-scoped `GET /api/lessons/proposal?sourceId=...`; pending/failed/foreign sources rejected. Teacher Studio shows `Tạo đề xuất tự động` after ready DOCX/PDF and local proposal preview for Markdown/text.
- Pure/route proposal tests pass; current full suite `472/472 PASS`; latest typecheck/lint/build/diff-check pass. Build keeps existing KaTeX duplicate-file and route-classification warnings.
- Antigravity Gemini 3.8 review of next AI architecture: bound output to one lesson unit, store generation state in D1, verify normalized citations, poll long jobs; no AI endpoint or credential added yet.
- Remaining P5: choose server AI endpoint/provider, D1 generation state, bounded structured AI response/citation verification, apply result to typed editor, timeout/quota/replay tests.
- Final bounded review `ag/claude-sonnet-4-6`: APPROVE after filename/u_n false-positive repair and extraction-hash guard. Key-order stability relies on source service's stored JSON round-trip; no source payload is logged.

## 2026-10-03 current checkpoint

- Astra bounded concurrency re-review PASS: arena actor/target atomic CAS, monotonic host epochs, room-create live authority guard.
- Security and privacy: campaignPublic strips configured learner roster; public mode challenges expose action/used but never answer/steps.
- UI: setup exposes group/pair/individual, 9 rules, boat/arena; noncampaign mode screen is Vietnamese with objective/progress and MCQ/true-false controls; teacher mode board and mode CSV routing added.
- Full gate before latest UI-only changes: npm test 106/106, typecheck, lint, build, diff check. After current UI/serializer changes, run full gate again before any publish.
- New server mode history records team/unit/controller/action/challenge/input/gameNow/wallAt/result with bounded retention.
- Still not complete: late join/leave/community-open-close/tick route synchronization, full browser mode/arena walkthrough, teacher analytics depth, root env identity, production D1 and Site deployment.
- Production remains unchanged and no commit/push/deploy performed.


**Cập nhật**: 2026-10-02 · **Branch**: current worktree

## 1. Trạng thái hiện tại

## 2026-10-02 current verified checkpoint

- Product/map/media, recovery route/UI, nine-rule `mode-engine` plus route integration, arena API/UI, and account-host API/dashboard are present in the current worktree.
- Full gate after the latest direct fixes: `npm test` **89/89 pass**; `npm run typecheck` pass; `npm run build` pass; `npm run lint -- --quiet` pass; `git diff --check` pass.
- New focused evidence: `tests/mode-route-integration.test.mjs`, `tests/arena-integration.test.mjs`, `tests/hosts-integration.test.mjs` (**11/11**), `tests/host-dashboard.test.mjs`, and recovery VM tests. Arena test includes SQLite actor-target failure injection and replay/conflict; hosts test includes forged stored-root, same-clock lifecycle and body-size regressions.
- Browser local evidence: historical map `Ngũ Ấn Long Thành`, individual room join/start, hints 1–3, downgrade 200→100, guided solve 50%, teacher-help, report-question and teacher replacement. Saved screenshot: `.sites-runtime/qa/recovery-assisted-score.jpg`.
- Antigravity read-only review found and fixed arena actor-target partial-CAS and shield secrecy defects. Desk orchestration itself remains fail-closed because live `supportsTools` is `null`; direct CLI workers were used only with explicit model refs and disjoint file scopes.

### Still unverified / not published

- Production Site is still V7; no save/deploy/publish performed.
- Browser arena full 26-player walkthrough, browser noncampaign mode walkthrough, mobile/reduced-motion arena, and production D1 concurrency remain unverified.
- Fast typed draft flush before help/report and immediate student rerender after teacher replacement need one final browser regression after the latest UI worker patch.
- Account host dashboard exists; authenticated `create-room`/escape authorization is not yet wired to account memberships. Sites root variables (`SITE_OWNER_EMAIL`, `SITE_OWNER_USER_ID`) and real dispatch identity are not provisioned/proven.
- Teacher mode analytics/CSV and full mode-specific classroom dashboard remain incomplete.

## Latest direct integration gate

- Mode route integration is present: additive `modeConfig`, server `modeState`, `mode-issue`/`mode-progress`/`mode-tick`/`mode-state`, allowlisted student mode view, replay/conflict/stale revision tests, and noncampaign UI objective/action screens. `tests/mode-route-integration.test.mjs` passes.
- Latest full gate after direct fixes: `npm test` **90/90 pass**; `npm run typecheck` pass; `npm run build` pass; `npm run lint -- --quiet` pass; `git diff --check` pass.
- Antigravity arena review was applied: actor-target mutation proof, eventId/round replay guards, original effect replay, dynamic opponent shield, and `tests/arena-integration.test.mjs` with SQLite failure injection.
- Antigravity host review was applied: stored-root forgery blocked, env-root-only system scope, same-clock receipt lifecycle, actual body-size enforcement, and host focused suite now **11/11 pass**.
- Desk task creation remains fail-closed because its live capability ledger reports `supportsTools=null` for Antigravity models. Direct CLI Antigravity reviews/builds were used with disjoint scopes; no commit/push/deploy.
- Account room authority integration is now wired server-side: authenticated root/system host creates account-owned rooms; owner/cohost/observer actions are checked from live membership; revoked hosts are denied immediately; legacy `owner_account_id IS NULL` rooms retain bearer compatibility; account-owned rooms reject old bearer bypass. `tests/account-room-access.test.mjs` covers these paths.
- `/hosts` dashboard is present with invite acceptance in URL fragments, root/host/room member controls and no local token persistence. Full dashboard/API browser walkthrough remains pending.
- The latest direct gate after the account integration: `npm test` **104/104 pass**, `npm run typecheck` pass, `npm run build` pass, `npm run lint -- --quiet` pass, `git diff --check` pass.

Latest recovery UI resume: preserved existing route/reset edits; defined the missing teacherRecoveryBoard renderer already called by teacher(), removed unused legacy save helper, wired hint purchase to request-hint with nudge/method/guided tiers, and made the recovery hint button open the dialog rather than submit a default tier. No mode-engine/schema/auth edits in this resume.

Latest serial evidence: npm test PASS 53/53, 7893.515 ms; npm run typecheck PASS; npm run build PASS (vinext unknown route classification notice); npm run lint PASS, 0 errors / 336 warnings. No quota or terminal error in this run. Earlier EPERM/timeouts are not current failures.

tests/recovery-ui.test.mjs now extracts actual function declarations with the TypeScript parser and executes them in Node VM. It asserts serialized API round/stage/questionRevision/revision/requestId, hint-dialog behavior, downgrade cancellation without mutation, teacher control rendering/escaping and removal after resolution, and draft identity changes. These are behavioral function tests, NOT includes-string tests. Full DOM event dispatch, reload/autosave races, teacher endpoint round-trip and browser/mobile layout are not covered by these tests and remain QA gaps.

Remaining recovery gaps from prior implementation: practice/competitive selection is server-supported but not exposed in room setup; guided scaffold is generic and needs pedagogical/browser review; full teacher-resolution/reduced-score API regressions remain to expand. Race sequence risk remains unverified: selectTurn does not advance when no team is eligible, whereas tests/race.test.mjs:71 assumes advancement after 11 seconds. Current full suite passed; this does not establish the failed seed's root cause.

Phase 4 recovery/event subset (2026-10-02): escape route now handles authenticated save-draft/request-hint/downgrade-question/teacher-help/report-question/abandon-station. Existing draft/hint/submit/choose-level names remain. Team JSON stores recovery, revision-keyed drafts, request fingerprints and teacher event history atomically via team CAS. No room_events table or writes: queryable event storage is deferred rather than introducing a non-atomic second write.

Guard coverage: station mutations and roll/abandon/bonus/bonus-draft/mascot/reward/pact. Same new request ID/payload replays; different payload returns REQUEST_ID_CONFLICT. Optional team revision/deadline are checked for new requests; round defaults to legacy round 1. Persisted pre-change cache entries lack fingerprints and retain legacy replay behavior. Skill/community-answer remain on their existing guards, not the new fingerprint contract.

Final serial evidence: npm test PASS 42/42 (29959.5453 ms); npm run typecheck PASS; npm run build PASS (vinext unknown route classification notice); npm run lint PASS with 0 errors / 336 warnings. New tests/phase4-route.test.mjs uses actual VM + SQLite migrations 0000-0007. An earlier run failed tests/race.test.mjs:71 turn sequence assertion; focused rerun and final full run passed, cause not established.

Pending exactly: arena routes/actions, arena persistence/brackets/pause-resume integration; /api/hosts, dispatch proof and host membership enforcement; participation/rule/pairs/faction route configuration and assignments; recovery/mode/arena/host browser UI; teacher analytics/CSV extensions; browser/mobile/audio QA and independent review. None is claimed complete. No commit, push, deploy or subagents this turn.

Phase 0, Phase 1 cycle-1 repair và Phase 3 pure gameplay contracts đã được triển khai trong worktree, chưa commit/push. Phase 3 thêm module thuần cho participation/rules, recovery, idempotent room events và Ngũ Ấn arena.

Các map cũ vẫn giữ canonical ids, legacy image names và report/storage keys. Không sửa V7 route/scoring/regatta, dữ liệu hiện có, auth hoặc production API gameplay. Phase 3 chưa được coi là route integration/auth/browser complete.

## 2. Đang dở / đừng đụng

Browser walkthrough, screenshot/console/audio QA and independent cross-review remain pending. Request cache/event history currently grows for the round; define retention or normalized event persistence before high-volume deployment. After downgrade, draft/submit clients must supply questionRevision; existing UI does not yet expose downgrade.

## 3. Cái sắp cắn người sau

`public/campaign-data.js`, `public/feedback.js` và bảy SVG là generated artifacts; chạy generator sau khi sửa nguồn. Pure Phase 3 modules hiện dùng deterministic assignment, revision-aware drafts, request fingerprints và reward-once caches; route serializers/auth/host persistence chưa có.

## 4. Lệnh nghiệm thu

```bash
npm test
npm run typecheck
npm run build
npm run lint
```

## 5. File/khái niệm cốt lõi

- `lib/product-content.js`: nguồn brand/story/theme/route/media-adjacent metadata.
- `lib/campaign.js`: server campaign/math API, import `PRODUCT_THEMES`.
- `lib/media-catalog.js`: pure categories/settings/dedupe/event diff contract.
- `scripts/generate-world-assets.mjs`: generator cho campaign export, feedback runtime và 7 SVG mới.
- `public/app.js`: legacy runtime integration boundary.
- `public/feedback.js`: generated browser feedback/audio runtime.
- `tests/phase1-product.test.mjs`: parity, legacy, route, media regressions.
- `lib/game-modes.js`, `lib/recovery.js`, `lib/room-events.js`, `lib/arena.js`: Phase 3 pure contracts.
- `tests/phase3-gameplay.test.mjs`: focused Phase 3 contract coverage.

## 6. Lịch sử

Phase 0 baseline verified before this implementation. Phase 3 pure contracts are implemented but final gate and independent review are pending. Later work remains: auth/host memberships, route/API integration, teacher analytics, browser/deployment audit.

## 2026-10-08 — proposal result validator checkpoint

- Added `lib/lesson/proposal-result.js`: bounded candidate allowlist, source snapshot binding, complete segment citations, normalized quote verification, package validator, hard mastery policy, `needs_review` output.
- `POST /api/lessons/proposal` validates a future AI candidate without allowing it to approve itself. Stream/body limits and owner/source hash guards active.
- Final local gate: `npm test` 478/478, typecheck pass, lint pass, build pass, diff-check pass. Existing KaTeX duplicate filename and route classification warnings remain; no commit/push/deploy.
- P5 remaining: choose public AI endpoint/provider; implement D1 generation state, timeout/quota/polling, real model output and typed-editor apply; OCR and full browser/rehearsal/production gates remain.
- Final boundary review requested confirmation only; current code confirms: integrity log occurs before throw/response, slotMinutes uses Number.isInteger and rejects strings, stream limit counts received bytes before decode, citation Object.keys allowlist rejects extras, quote normalization rejects empty/whitespace. Compression is not enabled by this route; request bytes are bounded before JSON parse.
- Final Antigravity confirmation in tasks/lesson-proposal-result-confirmed-review.txt: VERDICT APPROVE. Added API regressions for string slotMinutes and oversized stream cancellation; full478 and lint pass after tests.

## 2026-10-08 — generation job/provider slice

- Added migration 0012 + `lesson_generation_jobs` D1 table. Start is owner scoped, request idempotent, source tuple bound; run claims once; poll timeout marks `interrupted`; late result cannot commit; failures persist safe code.
- Added generic `generation-provider.js`: explicit env config, HTTPS endpoint restriction, API key server-only, untrusted source prompt, 60s timeout, streamed byte cap, JSON-only response.
- Added GET capabilities, POST start/run, GET poll on `/api/lessons/proposal`; Teacher Studio starts job, polls, displays failure/interrupted states, applies needs_review package to editor only.
- Full provider/job/migration adversarial tests added. No provider env configured, so no real AI network call. No deployment.

## 2026-10-08 — final job/provider/UI checkpoint

- Full current gate: 488/488 tests, typecheck, lint, build, diff-check pass.
- D1 `0012_lesson_generation_jobs` migration and snapshot generated; generation tests cover idempotency, quota, concurrency claim, timeout/interrupted late result, source drift, migration/FK/index metadata.
- Generic provider adapter tested against OpenAI-compatible JSON, HTTPS/env-only credentials, prompt injection boundary, timeout/quota/truncated/malformed output.
- Teacher Studio now has AI settings (subject/grade/minutes), start/run, queued/running polling, source-bound reload, retry request identity, needs_review apply-to-editor, failed/interrupted messaging. No provider env configured in current runtime; no real AI call or deploy.

## 2026-10-08 — workerd + UI final validation

- Added real workerd D1/R2 generation canary: one uploaded source, three concurrent start requests collapse to one job, three run requests collapse to one provider call, needs_review result reloads after worker boundary, foreign owner denied, provider secret absent from projection, FK check clean.
- Added UI async tests for duplicate click, source switch cancellation, request identity retry, foreign result apply rejection; subject/grade mismatch now produces validator error.
- Full current gate: `npm test` 494/494, typecheck/lint/build/diff-check pass. Provider canary direct 9Router: short `OK` probe works; full generation payload timed out at 60s, so real lesson generation remains unproven. No deploy.

## 2026-10-08 — outline/repair hardening

- Astra read-only audit found/fixed the critical outline path: `lesson-outline-v1` was previously sent directly to package normalizer; generation service now assembles server IDs, reciprocal links, evidence, hints, budget and source citations before validation.
- Outline phase classification now treats experience/guided diagnostics as precheck while preserving group participation. Task schema carries inputSchema, branch, participation, scaffold metadata; provider prompt requires per-objective coverage.
- Repair receives prior candidate + structured validator errors; only one repair call, preserving objectives/hints/citations. Provider JSON fence/SSE handling hardened.
- Real Antigravity canary: model returned outline in ~13–17s; validator correctly rejected remaining choice/coverage issues, persisted as needs_review. No fake approval or automatic answer repair.
- Full current gate: `npm test` 499/499, typecheck/lint/build/diff-check pass. No deploy.

## 2026-10-08 — outline-through-service regression

- Added missing integration test: provider-format lesson-outline-v1 → generation service → native assembler → existing validator → owner-scoped needs_review persistence. This catches the earlier wiring defect that isolated tests missed.
- Current full gate: npm test 500/500, typecheck/lint/build/diff-check pass. No deploy.
- Next: live candidate evidence + repair preservation, valid AI draft, OCR/browser rehearsal/production remain required; full goal is not complete.
