# Chat AI phụ huynh (Phase 3) — 26/10/2026

## Trạng thái: HOÀN THÀNH, đã test thật 10/10 OK — CHƯA bật cho PH ngoài chủ dự án

## Đã làm

- **Model**: `cnt/glm-5.3-flash` qua Vilao (`https://api.vilao.ai/v1/chat/completions`), chuẩn OpenAI SDK.
  80đ/1M vào — 240đ/1M ra, 99% OK. Ghim trong code (`PH_CHAT_MODEL`), KHÔNG đọc env.
- **Key riêng**: `PH_CHAT_VILAO_KEY` (key Vilao `SmartPlan-PhChat`), tách khỏi key chấm bài. Đã set env Preview.
- **Lưu ý reasoning model**: glm-5.3-flash tiêu token cho `reasoning` trước khi sinh `content`.
  Đo thật: max_tokens 50 → content rỗng; 800 → OK. Chốt max_tokens 1200; content rỗng
  + có reasoning_tokens → ném lỗi "AI reasoning-only" → bot trả câu "bận", không gửi tin trống.
- **Chống bịa**: 6 quy tắc bắt buộc trong system prompt; chỉ dùng dữ liệu báo cáo an toàn của đúng
  em đã liên kết (`buildParentSafeReport`); lọc SĐT/mã HS/token khỏi câu trả lời; luôn chốt
  "Nhắn 0 để xem lại menu."
- **Gỡ log chẩn đoán** `[zalo-diag]` (4 chỗ) — RAW body in định danh người gửi ra log.
  Giữ nguyên hành vi: replay nonce → 200, lỗi nonce → 503, lỗi dispatch → câu fallback.

## Test thật (tài khoản Zalo chủ dự án, 26/10)

10 câu qua webhook giả lập, HTTP 200 cả 10, bot trả lời đúng:
- 4 câu chống bịa (hỏi HS khác / điểm chưa có / SĐT thầy / hứa hẹn): không bịa, không lộ.
- Điểm KHÔNG hiện `%`; mọi tin chốt "Nhắn 0 để xem lại menu."
- Gate: tsc exit 0, 177/177 test assistant pass (C1–C10, M1–M12...).

## Bổ sung 26/10 chiều: menu mục 5 theo vai trò (commit `574486a`)

- HS (role=student) mục 5 = "Gợi ý tự học ở nhà" (từ `areasToPractice`, cùng nguồn mục 4),
  không hiện văn bản viết cho người lớn. PH giữ nguyên hành vi cũ.
- Bot xử lý PH và HS chung một nhánh: cùng menu 0–7 + chat AI, dữ liệu theo link của chính em.
- HS không xem được `grade.feedback` qua bot (bản an toàn PH bị lọc mất) — giữ nguyên thiết kế,
  muốn có thì cần bản HS riêng (việc mới).
- Test M13a/b/c; gate 180/180.
- Deploy: `https://giaoandewey-cwkeerdxy-congapro60-devs-projects.vercel.app`, webhook verify `webhook.ok`.

## Gói trau chuốt 26/10 tối (commit `5b7da30`): trình bày + HS feedback + link web

- **Markdown Zalo**: tin menu nhiều dòng gửi `parse_mode: markdown` (in đậm dòng tiêu đề,
  escape `*_~` cho dữ liệu động qua `escMd`). Parse lỗi → tự gửi lại bản thuần đúng 1 lần.
  Tin 1 dòng gửi thuần như cũ. AI trả lời vẫn gửi thuần (an toàn với ký tự AI sinh ra).
- **Typing indicator**: `sendChatAction action: 'typing'` trước khi gọi AI (fire-and-forget).
- **HS xem feedback** (chốt của chủ dự án): `buildParentSafeReport` thêm option `includeFeedback`
  (mặc định false → bản PH giữ nguyên). Bản HS: mục 2 kèm nhận xét GV đã duyệt (~80 ký tự/bài,
  tối đa 5 bài); prompt AI gọi "em" và được dùng feedback đã duyệt trong ngữ cảnh. Feedback CHƯA
  duyệt tuyệt đối không lọt (chỉ lấy từ `validScorePair` = graded + teacherApproved).
- **Link web portal**: nhắn `web`/`link`/`website` → bot gửi link thuần (URL render được):
  PH `https://giaoandewey.vercel.app/ph/<joinCode>`, HS `/lop/<joinCode>`; mục 6 có dòng hướng dẫn.
  Link phải gửi qua `sendStyled(..., false)` — không qua `output()` (hàm này che mọi URL).
- Test mới: M14a–d, C11a–c, zalo-bot markdown + fallback + link thuần.
- Gate: tsc exit 0, **189/189** test assistant, 52/52 test phụ thuộc parentSafeReport.
- Deploy: `https://giaoandewey-p2j10m5kl-congapro60-devs-projects.vercel.app`, webhook `webhook.ok`.
- Cần test Zalo thật: menu in đậm, mục 2 HS có nhận xét, nhắn `web` nhận link bấm được.

## Commits (nhánh feat/assistant-ph-hs-zalo)

- `121eb17` feat: chat AI PH (glm-5.3-flash qua Vilao)
- `ad35cdd` fix: xử lý reasoning model
- `b2cd474` chore: gỡ log chẩn đoán

## Deploy hiện tại

- Preview: `https://giaoandewey-dfup8arbi-congapro60-devs-projects.vercel.app`
- Alias: `zalo-test.congapro60-devs-projects.vercel.app`
- Webhook Zalo: `.../api/assistant?transport=zalo_bot` — verify `webhook.ok`
- Chỉ cho phép: `ZALO_BOT_ALLOWED_USER_IDS=6428d37c9d35746b2d24` (chủ dự án)

## Việc còn lại (bật cho PH thật)

1. Dọn test: xoá link/test của chủ dự án khỏi `channelLinks`, xoá file token `.txt`.
2. Gỡ/đổi `ZALO_BOT_ALLOWED_USER_IDS` (hoặc bỏ env để mọi người đã liên kết dùng được).
3. Trả webhook về production URL sau khi merge code vào production.
4. Tạo lại token Zalo (token đã nằm trong file `.txt` + lịch sử chat).
5. Xoá nhánh/alias preview.
