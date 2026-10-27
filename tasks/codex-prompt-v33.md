# Prompt Codex — Deploy v33 (27/10/2026)

## Goal

Phát hành v33 lên Site ChatGPT: commit + push các file sửa P1 v33 + fix responsive luồng HS, đóng gói archive MỚI `release-20261027-v33.tar.gz`.

## Confirmed facts (đã verify)

- Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`, branch `codex/universal-content-release`, HEAD = `ee6b95f` (v32 đã phát hành).
- **12 file cần commit** (10 modified + 2 file mới):
  1. `lib/lesson/assessment-ai.js` — P1: `AI_INVALID_PROPOSAL` vào danh sách trắng `friendlyAutomaticFailure`
  2. `lib/lesson/runtime.js` — P1: `feedback` vào `autoSub.aiAssessment` (runtime.js:1433)
  3. `components/lesson/TaskInput.tsx` — P1: banner HS nhánh `needs_review` + render `aiAssessment.feedback` (nhánh ok/wrong) + type
  4. `public/style.css` — responsive: media 760px `.gamecols{grid-template-columns:minmax(0,1fr)}` + `.gamecols>*{min-width:0}`
  5. `tests/lesson-themed-route-ui.test.mjs` — 2 guard mock TaskImage
  6. `HANDOFF.md` — record V33 + dọn lịch sử
  7. `tasks/archive/handoff-history-v27-v30-2026-10-25.md` — archive mới (V27–V30 cắt từ HANDOFF)
  8. `tasks/todo.md` — đặc tả v34 mã lực + lộ trình 3 track + nợ QA v32
  9. `tasks/codex-prompt-v33.md` — chính prompt deploy này (file mới)
  10. `tasks/coordination.md` · 11. `tasks/lessons.md` · 12. `tasks/plan-hoan-thien-game-va-day-hoc.md`
- Verify đã xong: tsc 0 lỗi; `npm run build` pass; test 1393/1416 (23 fail = nợ v32 có sẵn); responsive luồng HS 12 đo sw=iw ở 375/390/430, 0 console error; trang chủ 6/6 viewport sạch.
- Đã xóa sạch phòng QA trên UI GV — "Phiên của tôi" trống.

## Failed attempts / rủi ro đã biết

- KHÔNG tái dùng archive cũ (bài học v28: archive cũ thiếu commit mới → release sai bản).
- Untracked `tasks/qa-*` (zip + dirs) và `tasks/gameplay-learning-research-20261026.md` **KHÔNG commit** trong dot này. Đã kiểm: release v32 `ee6b95f` không chứa các mục này — untracked không bị quét vào commit.

## Các bước

1. Chạy: `node C:/Users/ADMIN/.codex/plugins/cache/openai-curated-remote/sites/1.1.2/scripts/build-site.mjs`
   - Script tự commit + push source, kiểm provenance, đóng gói.
   - Archive mới phải nằm ở `C:\Users\ADMIN\.codex\sites-release\` (đặt tên theo version ngày, ví dụ `release-20261027-v33.tar.gz`).
2. Báo lại đầy đủ: `version_number`, `deployment_id`, `commit_sha`, kích thước archive, đường dẫn archive.
3. Nếu workflow báo remote/source khác → DỪNG để đối chiếu, không tự quyết.

## Active constraints

- Không sửa thêm code nào ngoài 12 file trên; không đổi audience; không push remote khác remote của Site credential.
- Giữ WIP, log, dữ liệu nhạy cảm khỏi source snapshot.
- `lib/exam/**`, phòng demo `7E42C2`: không đụng.

## Sau deploy (Codex ghi vào HANDOFF.md record V33)

- Điền `version_number`, `deployment_id`, `commit_sha`, kích thước archive vào bảng record V33 trong `HANDOFF.md`.
- Kiểm độc lập: tải chunk liên quan từ live, đối chiếu SHA256 với chunk trong archive (như v32 đã làm).
