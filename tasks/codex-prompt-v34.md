# Prompt Codex — Deploy v34 (27/10/2026)

## Goal

Phát hành v34 "Mã lực mua quyền chọn" lên Site ChatGPT: commit + push toàn bộ thay đổi v34 (server mua bước, client, CSS, test) + đổi nghĩa phần thưởng dice ở campaign, đóng gói archive MỚI `release-20261027-v34.tar.gz`.

## Confirmed facts (đã verify 27/10/2026)

- Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`, branch `codex/universal-content-release`, HEAD = `1e93e92` (v33 đã phát hành, version 33, deployment `appgdep_6adff81976e88191b1a0fc91de31646a`).
- **26 file cần commit** (24 modified + 2 file mới):
  - Core v34: `lib/race.js` (skill `choose`, grant 240đ, `rid` guard), `app/api/escape/route.js` (guard choose/roll, chooseInsert anti-race, reward dice campaign = +100 điểm mã lực), `public/app.js` (stepBuyPanel, shop note, ẩn Xúc xắc kép campaign, bonusPanel dice→điểm, raceHistory label), `public/style.css` (CSS v34).
  - Test: `tests/race-choose.test.mjs` (mới, 15 test), `tests/race.test.mjs`, `tests/community.test.mjs`, `tests/r18-game-activities.test.mjs`, 9 file `tests/lesson-*.test.mjs` (mock chuông v33 — đã live riêng, chỉ để không hồi quy).
  - Tài liệu: `HANDOFF.md`, `tasks/todo.md`, `tasks/codex-prompt-v34.md` (mới — chính file này), `tasks/coordination.md`, `tasks/plan-hoan-thien-game-va-day-hoc.md`.
- Verify đã xong: `node --check public/app.js` sạch; `tests/race-choose.test.mjs` 15/15; full suite **1432/1432 PASS, 0 fail**; `npm run build` pass.
- QA Codex 3 vòng (dot 1 → dot 2 → dot 3): verdict cuối **SẴN SÀNG DEPLOY**.
- Thay đổi lần cuối (C4a, quyết định user): ở campaign chọn phần thưởng 'dice' được **cộng 100 điểm mã lực** (event ghi `points: 100`); duel giữ nguyên cơ chế extraDice.

## Failed attempts / rủi ro đã biết

- KHÔNG tái dùng archive cũ (bài học v28: archive cũ thiếu commit mới → release sai bản).
- Untracked ngoài `tests/race-choose.test.mjs` và `tasks/codex-prompt-v34.md` **KHÔNG commit**. Kiểm `git status` trước và sau: 24 M + 2 untracked là mốc chuẩn; chênh lệch → DỪNG đối chiếu.
- Lần trước 1459 test là số test động theo điều kiện mạng; mốc verify lần này là 1432/1432, 0 fail.

## Các bước

1. Chạy: `node C:/Users/ADMIN/.codex/plugins/cache/openai-curated-remote/sites/1.1.2/scripts/build-site.mjs`
   - Script tự commit + push source, kiểm provenance, đóng gói.
   - Archive mới phải nằm ở `C:\Users\ADMIN\.codex\sites-release\release-20261027-v34.tar.gz`.
2. Báo lại đầy đủ: `version_number` (phải là **34**), `deployment_id`, `commit_sha`, kích thước archive, đường dẫn archive.
3. Nếu workflow báo remote/source khác → DỪNG để đối chiếu, không tự quyết.

## Active constraints

- Không sửa thêm code nào ngoài commit 26 file trên; không đổi audience; không push remote khác remote của Site credential.
- Giữ WIP, log, dữ liệu nhạy cảm khỏi source snapshot.
- `lib/exam/**`, phòng demo `7E42C2`: không đụng.

## Sau deploy

- Điền `version_number`, `deployment_id`, `commit_sha`, kích thước archive vào bảng record V34 trong `HANDOFF.md` (thay dòng "DANG DEPLOY").
- Kiểm độc lập do agent chính thực hiện sau Codex: SHA256 chunk/CSS live khớp archive, HTTP 200, `version_number` = 34 (như v33).
