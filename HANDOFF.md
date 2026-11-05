# Handoff

## 2026-11-05 — Zalo menu hint duplication
- Branch: preview/zalo-live-test.
- User approved push of the menu fix. Push target: origin/preview/zalo-live-test. No manual deployment requested.
- Root cause: fitZaloList already appends MENU_HINT; menuSectionText appended it again.
- Fix: api/_assistant-ph-hs-menu.ts returns body unchanged when it ends with MENU_HINT.
- Regression: api/__tests__/assistant-ph-hs-menu.test.ts checks sections 1–8 for student and parent: exactly one hint, at end.
- Red test reproduced duplicate (2 instead of 1) before fix.
- Verification: API suite 1267 passed, 8 skipped; API TypeScript exit 0; npm run build exit 0.
- Existing unrelated modification: scripts/zalo-webhook-sync.cjs; left untouched.
- Remaining: review/commit/PR/deploy with approval; verify on live Zalo after release.
