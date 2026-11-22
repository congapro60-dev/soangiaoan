# Handoff

## 2026-11-22 — Bot chạy Cloud Run, chấm ảnh, model chấm
- Hosting: Vercel khoá từ 14/11. Bot = Cloud Run `spai-assistant-ph` (asia-east1, project smartplan-ai-14200), deploy `python scripts/cloudrun-deploy.py`; env thường ở `cloudrun-env.json` (gitignore), secret ở Secret Manager tiền tố `BOT_`.
- b3a8ede: `server/background.ts` = waitUntil cho Cloud Run; route assistant/deadline-digest giữ phản hồi tới khi chấm/báo xong (≤280s). Gốc lỗi "Chưa tải đủ ảnh" 18/11.
- Ảnh nộp lưu `sentAt` (giờ Zalo) và sắp theo đó; 5e2e826: câu "Upstream…" của nhà cung cấp → chuyển lớp dự phòng; 21a7a92: chữ "(error)/(graded)", "(0.0MB)".
- Model chấm: `GRADING_VILAO_MODEL=spd/gemini-3.8-flash-high` (chib/gemini-3.8-flash không khả dụng). Bot revision 00009-8kl; web `giaoandewey-00007-ssg`.
- Test: API 1543 pass/8 skip; tsc 0. QA thật trên Zalo 19/11: hết "Chưa tải đủ ảnh", thứ tự ảnh đúng.
- Chưa có: Cloud Scheduler gọi `/api/deadline-digest` lúc 07:00 VN (chỉ GitHub poller vài giờ/lần); Antigravity trong chuỗi chấm (403 chưa rõ, giao Codex).

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
