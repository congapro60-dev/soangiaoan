# QA brief for Codex — branch `feat/vi-ai-chip-popup` (AI wallet, stages 1–3)

> Paste this whole file into a Codex task, or tell Codex: "Read and follow `C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\vi-ai-chip-popup\tasks\qa-codex-vi-ai.md`".
> Written by Claude Code on 2026-09-30. Reviewer role: report only — do NOT fix, commit or push.

## Goal
Independently QA the three-stage "AI wallet" work and report defects with evidence.

## Working location
- The worktree (call it WT) is `C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\vi-ai-chip-popup`, branch `feat/vi-ai-chip-popup`, `HEAD` must be `46a7be3b51ae378c46a2fba12c7421deb9003267` (this brief file is an untracked extra). If HEAD differs, stop and report.
- If your session cwd is the MAIN checkout `C:\Users\ADMIN\Downloads\smart-lesson-plan-ai`: it is on another branch with UNRELATED uncommitted work from other sessions. Never modify it (no writes, no `git checkout/switch/stash/reset/merge/commit/add`). Work only in WT with absolute paths (`git -C "<WT>" ...`, `Set-Location "<WT>"` inside the same PowerShell command, or `npm --prefix "<WT>"`).

## Context
- Stack: React + TypeScript + Vite + Tailwind v4 + Firebase; Vercel serverless in `api/`; Hobby cap = 12 Serverless Functions (non-underscore files in `api/` deploy as functions, `_`-prefixed are helpers). Vietnamese teacher-assistant app; all UI strings Vietnamese.
- Commits (oldest → newest): `d2894e8` stage 1 (Header wallet chip + popup + per-day spend) · `ed0b66a` stage 2 (teacher-selectable key mode own/wallet/both, wallet page rewrite) · `b8206d2` (Settings: newer model catalogs + buying guide + provider call fixes) · `3596e31` merge of origin/main · `46a7be3` stage 3 (server relay so the prepaid wallet pays for ALL Gemini features).
- Owner's business rules:
  - Wallet is prepaid VND (bank-QR top-up), charged per call at Google list price × USD/VND rate minus voucher %. Charging is live in production since 2026-09-25.
  - Modes: `own` = own key only (blocked when key exhausted/invalid/absent, NEVER silently falls back to the wallet); `wallet` = shared key + wallet, ignore own key; `both` = own key first, wallet only when the OWN KEY fails.
  - Wallet may be charged only after the teacher consented (checkbox), unless in the owner's "shared group"; the owner's account (`exemptUids`) is never charged.
  - With no stored mode, behaviour must equal pre-change behaviour (shared group or consenting teacher = `both`, others = `own`). No existing user's behaviour may change on deploy.
  - Students are anonymous Firebase users and must NEVER spend a teacher's key/wallet through the new relay.
- Files to review (`git -C "<WT>" diff 2eab64f HEAD -- <path>`; `2eab64f` = old base):
  - Money core: `src/lib/admin/aiKeyPolicy.ts` (+ test), `api/_ai-keys.ts`, `api/_ai-usage.ts` (`spendByDay`), `api/_grading-core.ts` (`callGeminiRaw` split out of `callGeminiVision`).
  - Relay: `api/ai-relay.ts`, `api/_ai-relay-core.ts`, `api/_ai-relay-handler.ts`, `vercel.json` (`api/ai-relay.ts` maxDuration 300), `api/__tests__/ai-relay*.test.ts`.
  - Browser routing: `src/lib/aiProviders.ts`, `src/lib/aiRelay.ts`, `src/lib/ai/aiModeStore.ts`, `src/lib/ai/aiKeyGate.ts`, `src/hooks/useAiBillingStatus.ts`, `src/App.tsx`.
  - UI: `src/components/features/aiBilling/{AiWalletChip,AiUsagePopup,AiWalletPanel}.tsx`, `src/lib/ai/{usageToday,aiModeView,aiBanner}.ts`, `src/components/layout/Header.tsx`, `src/components/features/settings/ProviderGuide.tsx`, `src/components/modals/SettingsModal.tsx`.
  - Data: `src/data/models.ts`, `src/data/providerGuide.ts`.
- Notes: `tasks/ke-hoach-vi-ai-chip-popup.md`, top sections of `HANDOFF.md`.
- Known NOT verified (do not try with real accounts): a real relay call by a logged-in teacher; whether Vercel accepts `maxDuration: 300` and the function count (preview `dpl_G2cmzWDQymgt9zo6jZfMTg3NZW9e` was still queued); real vendor API keys; real long-lesson latency.

## Task
1. Run the CI gates in WT and report: `npm run lint`, `npm run lint:api`, `npm run test -- --run`, `npm run build`. `node_modules` in WT is a junction to a sibling worktree — do NOT `npm install`, do NOT delete it. `api/__tests__/ai-gateway-handler.test.ts` is flaky in the full run; if it fails, re-run alone first.
2. MONEY CORE, adversarially (highest priority): any path where a user is charged without consent, NOT charged when they should be, charged twice, or bypasses the balance/cap check; wrong `todayVnd`/`days`; mode-matrix mistakes in `decideAiKey` / `effectiveAiMode` / `onOwnKeyFailure` / `assertSharedAiAllowed`; behaviour change for users with no stored `mode`; regression risk from splitting `callGeminiVision` into `callGeminiRaw` (grading flows must behave identically).
3. RELAY as an attacker: auth (missing/expired/anonymous), model allow-list vs pricing (a model without a price bills 0), prompt/system/image limits, data-URL regex cost and oversize, daily quota (`aiRelayQuota`) race and day reset, 402 vs 429 vs 502 mapping, a blocked (402) call costs no quota, concurrent calls overdrafting the wallet, timeout budget (270 s Gemini timeout in a 300 s function; the browser has no timeout), `req.body` string vs object.
4. BROWSER ROUTING (`src/lib/aiProviders.ts` text/vision/stream Gemini branches, `aiModeStore.ts`): null/unknown mode keeps old behaviour; `assertOwnApiKey` must not throw in relay mode; stream must not duplicate text on fallback; `isOwnKeyFailure` false positives/negatives (a 503 must NOT fall back to the wallet); `callAI` auto-continue with a relayed `truncated: true`; stale mode after the teacher changes it; signed-out state. Also the small fixes in the same file: OpenAI `max_completion_tokens` (openai branch only, 3 places), Claude `claudeText`, DeepSeek max tokens.
5. UI QA in a browser from WT: `npm --prefix "<WT>" run dev -- --port 3111 --strictPort`. Real login is impossible → create TEMPORARY harness pages in WT (`qa-*.html` + `src/qa-*.tsx`) stubbing `auth.currentUser` and `window.fetch` for `/api/classroom` (actions `aiKeyStatus`, `aiStatement`, `setAiMode`) and render `AiWalletChip` (tones: normal, low, empty, own-key-works, not-charged, exempt), `AiWalletPanel` (mode radios; consent checkbox only when not in group and no prior consent; a group member selects wallet without consent), `ProviderCompareTable` / `ProviderGuideCard` for every provider. Check desktop and 375 px: overflow, clipped text, popup positioning (Header has `backdrop-blur`, which makes `fixed` children relative to the header), contrast, keyboard (Escape closes popup, radio roles), Vietnamese typos/diacritics. DELETE all harness files and stop the server afterwards.
6. Fact-check `src/data/providerGuide.ts` and `src/data/models.ts` against official pages (Google AI, Anthropic, OpenAI, xAI, DeepSeek, NVIDIA): model ids, per-1M-token prices, minimum top-ups, "consumer subscriptions do not include API", DeepSeek peak window (01–04 and 06–10 UTC Mon–Fri → 08–11h and 13–17h Vietnam). Flag stale/wrong items with the source URL.
7. Function count: list the non-underscore `api/**/*.ts` files Vercel would deploy as functions, count them, say whether `api/ai-relay.ts` keeps it ≤ 12 (state assumptions, e.g. whether `*-core.ts` are deployed).

## Scope and constraints
- Read anything in WT; browse public web pages; create only temporary `qa-*` files in WT (delete afterwards).
- Do NOT modify tracked files, commit, push, change git config, or touch the main checkout / other worktrees / other branches.
- Never call production, real AI vendors with real keys, payment or login flows. Never paste secrets.
- If reality differs from this brief, stop and report instead of reconciling.
- No style nitpicks: only defects, risks with a concrete failure scenario, or verified-OK statements.

## Reply format
Markdown; Vietnamese UI strings verbatim, everything else English:
1. Summary (≤ 4 lines). 2. Gate results (4 commands, pass/fail, counts). 3. Findings table ranked Blocker / High / Medium / Low — id, severity, `file:line`, what is wrong, concrete failure scenario/evidence, one-line suggested fix. 4. Verified OK (per task number). 5. Could not verify (with reason).
