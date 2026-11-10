# Zalo live QA fixes — 2026-11-10

- [x] Reproduce live: `8`, `0`, `1` opens assignment instead of menu item; today's passed deadline has no overdue label; menu 10 omits deadline.
- [x] Inspect exact checkout `preview/zalo-live-test` at `68f25eb`; preserve staged `scripts/zalo-webhook-sync.cjs` and unstaged `tasks/zalo-improvements-2026-11-06.md`.
- [x] Add regression tests first: selection exit and concurrent photo preservation, exact Vietnam deadlines, help and message readability. RED: 9 failures, 222 passes.
- [x] Fix selection, time and scoped response formatting; preserve all photos and full list.
- [x] Gates: focused 232 passed; full API 1449 passed, 8 skipped; API and web TypeScript passed; Vite build passed; git diff --check passed. Final API-only edits were rerun through all API tests and API TypeScript; frontend build/typecheck passed on unchanged frontend.
- [x] Prepare independent Claude QA after quota returns; this document is the handoff.

## QA review

- `8` stores `awaitingPick`, numeric selection wins over normal menu commands. `0`/`menu` now transactionally removes only a matching class/student empty list selection. An open assignment, assistance/revision, received images, pending uploads, even expired images, remain untouched. A concurrent incoming image forces a transaction retry and remains stored. Verify PH and HS as well as menu 11 priority in a live test.
- Photo list due status and label use the same `submissionDeadlineState` as the web, including date-only and exact timestamp handling. No homework data or date stored changes. Verify the Vietnamese-time boundary and late status using a synthetic assignment.
- Student help mentions `11`/`deadline`; graded items put score and shortened feedback on one line and point to web for full feedback; exact case/whitespace duplicate strengths and practice topics are collapsed, preserving all distinct items. Confirm readability on phone and desktop, including messages longer than one Zalo limit.
- No real photo upload, grading call, submission, student message, Sheet permission, scheduler/index, env change, push or main merge as part of the local implementation. Claude review remains pending; local test doubles do not prove Firestore transaction behavior in the emulator or Zalo live chat. The shared Zalo account remains linked to a real student, so do not submit a real assignment as a test.
- Original feature baseline `68f25eb`; tracked unrelated staged blob `d69ec79bfdc315959937c132f0902c09dc085d09` and unstaged note remain untouched. Review only this fix diff, `api/_assistant-ph-hs-photo.ts`, `api/_assistant-zalo-bot.ts`, `api/_assistant-ph-hs-menu.ts` and corresponding tests.

The existing source approval, exact Sheet service-account permission, teacher mappings, scheduler, index and real-send approval are separate activation prerequisites. Do not expose workbook contents, send students real notifications, or pretend those settings exist. Publication only when authorized; preserve current bot release and unrelated work.
