# Zalo bot improvements — approved 2026-11-06

User authorized implementation and verification of the seven-part plan. Work only in `Downloads/spai-assistant-ph-hs`, branch `preview/zalo-live-test`. Preserve pre-existing staged `scripts/zalo-webhook-sync.cjs`. Never publish secrets or send test messages to students/groups.

- [x] Local: reliable image intake: photo_url payload, concurrent transfers, duplicate events, finish during transfer, preserve accepted files on failure.
- [x] Local: supplement versus replace: immutable history, ownership, concurrency, approved score protection, proxy restrictions; consistent web rules.
- [x] Local: complete newest-first assignment list: bounded messages, stable numbering, numbers >9, compact portal links after selection.
- [x] Local: public teacher requirement: create/edit, bot and student/parent display; private grading instructions remain private.
- [x] Local: structured photo review: wrong/uncertain assignment, unreadable and possibly missing work; actionable safe replies, no invented certainty.
- [x] Local: secure bot-to-web handoff: short-lived, one-use, chat confirmation, exact role/student/class, revocation, no PIN URLs.
- [ ] Message consistency, privacy, focused regressions, TypeScript/build, independent review and controlled live acceptance.

Baseline: 8f5a4a6; focused photo/bot/parent notification tests 156/156 passed before edits. Passing fixtures do not prove Zalo live acceptance. No deploy until integrated code and gates pass. Keep current alias/domain.

## Verified local evidence

- Core integration: six API suites, 281/281 passed (photo, bot, regrade, grading, handoff, actor writes).
- Actual Firestore + Storage emulator Rules: all 12 suites, 322/322 passed. Live Rules snapshot was merged first; existing Ptimer, handRaises and pulses policy preserved. Live release re-read unchanged before release preparation.
- Student browser: actual local anonymous Auth, Firestore Rules and classroom handler; exact assignment/public instructions, wrong-chat/replay denial, unlink/reload denial. `scripts/qa-zalo-student.ts`, emulator child exit 0.
- Parent browser: synthetic API interception only; eight acceptance checks, 390px layout, supplement/replace controls, expired handoff. `scripts/qa-zalo-improvements.cjs`, exit 0.
- Both TypeScript configs passed; production build passed. Separate agents reviewed photo/regrade, auth/rules, web revision entrypoints and official report preservation. Same model family; do not represent this as cross-family review.
- Review fixes: expired/wrong-child bot cookie no longer blocks a valid parent PIN; regrade uses token correctly, hides unapproved numeric grades, reserves quota transactionally; web resubmission carries its previous attempt; class reports retain approved score during pending revision; uncertain upload commit cannot delete an already accepted image; oversized converted PDF rejects rather than silently truncates.
- The broad suite excludes only the two accepted v832 hash-fixture files. Initial final sweep found five stale photo-flow fixtures lacking owner IDs and one CPU-contention timeout; fixtures corrected, both affected suites rerun 38/38 passed. Fresh broad sweep in progress, timeout 15s to avoid build contention.
- AI orchestration gateway currently refuses dispatch: `unresolved-worker-slot: live-job`. No wallet fallback or Astra; no cross-family inference claimed.

## Release still required

- Commit only this task; preserve staged `scripts/zalo-webhook-sync.cjs` blob `d69ec79bfdc315959937c132f0902c09dc085d09`.
- Stage the linked `spai-assistant-ph-hs` production deployment without assigning domains; inspect runtime. Deploy only merged Firestore Rules to `smartplan-ai-14200` using verified `congapro60@gmail.com`.
- Keep `zalo-test.congapro60-devs-projects.vercel.app`; do not merge main or change webhook domain.
- Controlled live acceptance in the owner's private Bot Cuong Vu chat. No student/group messages or real-student grading mutations. Local checks alone do not close this gate.
