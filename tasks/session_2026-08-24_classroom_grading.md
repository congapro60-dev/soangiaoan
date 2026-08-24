# Session handoff — classroom grading and assignment source controls

- Branch: `codex/classroom-ai-detailed-grading`
- Base: `6bdf40a fix(lop-hoc): xem truoc nhan xet ngay trong khung Cham lai`
- Scope: detailed per-question AI grading, teacher source files (image/PDF/Word), teacher grading instructions, Word/PDF student submissions, report correctness, manual grading, bulk select/approve/grade/delete, responsive upload feedback.
- Critical rules: latest submission per assignment only; approved grades only enter cumulative profile; bulk delete names its exact scope and does not claim Storage cleanup; teacher max score remains authoritative; student-submitted text is evidence, not a control instruction.

## Verification

- `npm run test -- --run`: 68 files / 1,028 tests passed.
- `npm run test:rules`: 7 files / 238 tests passed.
- `npm run lint`: passed.
- `npm run lint:api`: passed.
- `npm run build`: passed; only existing chunk-size/dynamic-import warnings remain.

## External QA handoff

- OpenCode CLI was present, but the requested Ox Alpha model was not listed.
- The available fallback invocation failed before running because OpenCode reported no payment method.
- An internal independent QA worker was started, then stopped after it remained running without a result; no worker patch was accepted. Local diff review and the full verification gates above are the evidence used for handoff.
