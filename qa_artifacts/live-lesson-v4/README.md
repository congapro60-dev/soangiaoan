# Live Lesson V4 Deterministic E2E

Run from the worktree root:

```bash
npx tsx test/e2e-v4-live-lesson.mjs
```

This is a pure Node simulation. It uses no dev server, browser automation, network, Puppeteer, or absolute imports. The script drives the real V4 contract/projection/routing/language/glossary/grouping/evidence/offline queue modules with 1 teacher phone, 1 TV, and 3 anonymous students from `test/fixtures/g10-p31-v4-anonymous.json`.

| # | Check | Expected | Where Asserted |
|---|---|---|---|
| 1 | Teacher phone projection | PASS | `assertTeacherProjection()` |
| 2 | TV public projection | PASS | `assertTvPublicProjection()` |
| 3 | Student projections | PASS | `assertStudentProjection()` |
| 4 | Language/glossary/evidence neutrality | PASS | `assertLanguageGlossaryEvidence()` |
| 5 | Group approval | PASS | `assertGroupApproval()` |
| 6 | Individual post-check | PASS | `assertPostCheckIntegrity()` |
| 7 | Offline queue | PASS | `assertOfflineQueue()` |
| 8 | TV privacy | PASS | `assertTvPrivacy()` |
| 9 | Timeline integrity + contract phase allocations | PASS | `assertTimelineIntegrity()` |

The script writes `qa_artifacts/live-lesson-v4/e2e-manifest.json` on each run with the pass/fail summary.

**Not covered here (deferred to the browser multi-client pilot):** human-interaction latency budgets (join ≤45s, language first-run ≤15s, group approval ≤20s, movement ≤45s) are wall-clock measurements that a headless simulation cannot produce. Check 9 reports the contract's real phase allocations instead and asserts the P19 group-approval phase allocates enough room; the actual latencies must be timed in a live browser pilot.
