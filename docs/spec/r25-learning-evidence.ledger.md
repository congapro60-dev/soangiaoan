# R25 ledger

| Task | Yêu cầu | Kiểm | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| R25.1 | Data contract batch + self-assessment | focused contract tests | local pass | lesson-r25.test.mjs |
| R25.2 | Runtime events, idempotency, privacy | lesson runtime/service tests | local pass | lesson-api-integration + r25-review-regression |
| R25.3 | Teacher batch UI + stats | lesson dashboard tests | local pass; browser incomplete | lesson-r25-ui.test.mjs |
| R25.4 | Student result/self-assessment UI | personal/shared/modal tests | local pass; browser incomplete | lesson-r25-ui + lesson-takeover-tools-ui + lesson-r25-modal-review |
| R25.5 | AI provider boundary | provider-off/mock tests | local pass | 150 fake pupils,8 batches, no real provider |
| R25.6 | Full verification | test/typecheck/lint/build/assets | local pass | full1444/1444; final modal20/20; build/assets54/54; native-qa.json |
| R25.7 | Production fake-pupil QA | 375px/desktop, no real pupils | blocked; not deployed | Edge CDP timeout, IAB attach failure; productionv22 |
| R25.8 | Pupil reports | API/private DTO/quotas/trash/shared device | local pass | lesson-pupil-reports.test.mjs; migration0026 local |
| R25.9 | r106 teaching flow | SGK88–89, scoped authoring, finite journey | local pass; classroom pending | r106-formation-repair.md; old saved snapshots preserved |

Final evidence and residual limits: `tasks/r25-final-report.md`. Model instruction superseded: native Astra xhigh, no external routing after owner's change.
