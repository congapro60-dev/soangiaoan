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
