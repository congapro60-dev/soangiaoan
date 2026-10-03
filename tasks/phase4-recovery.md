# Phase 4 Recovery Subset

## Latest UI Resume

- [x] Missing teacherRecoveryBoard renderer wired; hint dialog and tier purchase use recovery request contract.
- [x] Replaced source-string UI assertions with four Node VM behavioral tests executing actual parsed browser functions.
- [x] Serial checks: npm test 53/53 (7893.515 ms), typecheck PASS, build PASS, lint 0 errors / 336 warnings.
- [ ] Full DOM/browser/mobile recovery walkthrough and autosave/reload concurrency coverage.
- [ ] Room-setup practice/competitive selector, pedagogical guided scaffold review, teacher resolution/reduced-score endpoint coverage.
- [ ] Reproduce exact earlier race failure seed; no-eligible-team sequence assumption is a concrete unverified risk, not a confirmed root cause.

- [x] Authenticated recovery actions and teacher recovery/event history in escape route.
- [x] Fingerprint replay/conflict guards for station and race team-JSON mutations.
- [x] Revision-keyed drafts, actual lower-level question, server-derived abandon gates and V7 hint/scoring behavior.
- [x] VM SQLite regression: migrations 0000-0007, tokens, replay/conflict, stale round/revision/deadline, downgrade drafts, help/report, hint replay, student secrets and teacher guides/history.
- [x] Serial verification: npm test 42 passed / 0 failed (29959.5453 ms); npm run typecheck exit 0; npm run build exit 0; npm run lint exit 0 (336 warnings / 0 errors).
- [ ] Diagnose intermittent tests/race.test.mjs:71 sequence assertion observed in one earlier run; focused and final full reruns passed.
- [ ] Extend fingerprint guard to skill/community-answer transactional storage; existing guards preserved this turn.
- [ ] Queryable room_events persistence with migration and atomic mutation/event transaction; current team JSON history requires no new migration or table writes.
- [ ] Arena route/actions, persistence, bracket/timeouts, pause/resume integration.
- [ ] /api/hosts, dispatch proof, host memberships/authorization integration.
- [ ] Participation/rule/pairs/faction configuration and assignment route integration.
- [ ] Recovery/modes/arena/host UI; teacher analytics/CSV; browser/mobile/audio QA; independent review.

Sole writer; no subagents, commit, push or deployment. Route was expanded by the TypeScript formatter from compressed lines to make the guarded branches editable. Old persisted request-cache records have no fingerprint and preserve their legacy replay semantics.
