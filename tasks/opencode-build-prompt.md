Implement the full approved objective in this existing Site checkout. Read docs/mat-ma-da-gioi-scope.md first, then inspect the source and implement as much of the full scope as fits, in coherent tested phases. Do not commit or push. Preserve existing changes and V7 compatibility. Do not use copyrighted code or assets from outside games.

Required outcome:
- Rename user-facing product to Mật Mã Đa Giới with old storage/report compatibility.
- Preserve and enrich five maps using the exact names and stories in docs/mat-ma-da-gioi-scope.md. Keep ancient map playable and add the seven new worlds named there.
- Separate three participation styles (group/shared device, individual/per learner, pairs/two names and shared device with role rotation) from the nine rules modes in the canonical scope document. Duel means classroom competition, not standalone solo play. Support 26 learners (13 pairs), retain the existing 40-unit upper capacity for compatibility, and allow host-configured learner roster. Enforce deterministic pairing/late join and temporary defeat only.
- Add additive Ngũ Ấn arena event beside regatta: deterministic duel brackets with bye, mascot actions driven by Math answers, timeout/retry/idempotency, rewards once, no permanent elimination, return to map.
- Add hard-question recovery: tiered hints, pre-lock difficulty downgrade, middle-station abandon, teacher-help request, local/server drafts, clear penalties/rewards. Preserve Math core and context layer.
- Add event/request idempotency, payload hash, round/revision conflict handling, server deadlines, event queue, pause/resume and reconnect behavior.
- Add account-based root owner and room-scoped delegated hosts using existing ChatGPT identity headers; migrations, grant/revoke/audit and legacy admin compatibility. Never let the first visitor claim root.
- Add teacher board data for canonical answers, explanations, histories, rankings by learner/team/faction, reset/remove/delete management.
- Add per-map/mode meme catalog, non-autoplay SFX/music/mute controls, reduced motion/visual effects, keyboard/focus/live regions and non-color state cues.
- Add unit/integration/stress tests and run real checks. Update docs with verified/pending state.

Implementation rules:
- Use existing JS/Cloudflare Workers/D1 patterns; keep route behavior backward compatible where possible.
- Do not claim a feature is complete unless code and test evidence prove it.
- If the whole scope cannot fit, finish a coherent phase with tests, leave the next phase explicit in tasks/todo.md and docs, and never fake completion.
- Partial phases are working checkpoints, not final delivery. The goal remains active until every canonical requirement is implemented and verified.
- At the end report exact changed files, commands/results, verified limits and remaining work.
