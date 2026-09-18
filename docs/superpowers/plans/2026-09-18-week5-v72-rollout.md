# Tuần 5 V7.2 rollout implementation plan

**Goal:** Apply the V7.2 activity-first contract to all 24 Week 5 Ban Toán packages for grades 10, 11, and 12, while preserving the hand-authored P31 demo runtime.

## Scope

- Generic adapter: `10-5-32..38`, `11-5-26..33`, `12-5-26..33`.
- Demo: `10-5-31` remains on its custom contract and keeps its V7.2 practice/dashboard behavior.
- Source lesson plans remain content evidence. Runtime keeps source formulas, examples, exercises, quick checks, AI Error, language support, and fallback, but uses the V7.2 activity sequence.

## Checks

- [x] Switch generic Week 5 packages to the 14-activity V7.2 timeline.
- [x] Add Week 5 catalog and all-24 privacy/source-backed preview coverage.
- [x] Make response option wiring recognize V7.2 Week 5 contracts.
- [x] Extend the local classroom smoke harness to Week 5.
- [x] Run lint, unit, Rules/pilot, build, and representative Week 5 browser smoke.
- [ ] Commit and push the verified build to `main` so the web deployment is triggered.
- [ ] Deploy Firestore Rules required by the new V7.2 step IDs.
