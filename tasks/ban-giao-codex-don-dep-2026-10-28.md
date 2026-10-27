# Bàn giao Codex — Dọn dẹp & đưa bot Zalo vào dùng thật (28/10) — bản 2

> Bản 2 sửa theo đối chiếu của Codex ngày 28/10. Bản 1 đặt sai thứ tự (thu hồi key trước khi test
> sau rotate = tự bắn vào chân) và ghi sai số commit.
>
> Trạng thái xuất phát: commit `7c2fc83`, nhánh `preview/zalo-live-test`.
> Bot live tại webhook `https://zalo-test.congapro60-devs-projects.vercel.app/api/assistant?transport=zalo_bot`
> (alias **đã trỏ deployment `h8xsqgsvs`** — deployment `7nexdrwdz` và `kqixbxy52` không còn phục vụ webhook).
> HS lớp 11 Columbus đang test = dùng thật từ giờ.

## Cập nhật 28/10 (sau khi Lô B + Lô A đã chạy xong)

- **Key mới**: `smartplan-bot-chat-20261028` (`sk-36d6…3e7c`, 67 ký tự), hành vi khi giá tăng =
  "Tiếp tục dùng (tính giá mới)". Đã đăng ký model `cnt/glm-5.3-flash` (80₫ vào / 240₫ ra) —
  key tạo ra **mặc định không có model nào**, gọi API trả 403 cho tới khi đăng ký xong.
  Model này bật chính sách **"output rỗng vẫn tính phí"**; đã tick đồng ý vì key cũ dùng đúng model/giá đó.
- **Key cũ** `smartplan-bot-chat-20261027` (`sk-3d64…00de`): **đã thu hồi vĩnh viễn**. Gọi thử →
  **401**, tức đã chết thật (không chỉ ẩn khỏi danh sách). Codex có thể kiểm chứng độc lập bằng cách
  gọi `POST https://api.vilao.ai/v1/chat/completions` với key cũ và đọc mã HTTP.
- **Env**: `PH_CHAT_VILAO_KEY` đã ghi lại ở cả `production` và `preview`, giờ là type **Sensitive**
  (thêm qua CLI). `npx vercel env pull` trả `[SANITIZED]` — **bình thường**, không dùng để khôi phục.
- **Deploy**: `spai-assistant-ph-h8xsqgsvs-congapro60-devs-projects.vercel.app`, READY, alias đã trỏ đúng.
- **Đã xoá toàn bộ bản sao bí mật trên máy** (chi tiết ở bảng dưới, cột "Trạng thái").
  Hiện còn **0** file khớp pattern `zalo_|VILAO-KEYS|env-backup|vkey`.
- **B4 (test AI trả lời thật) — ĐÃ XANH toàn luồng** (xác minh 28/10 21:13):
  - Cách làm: pull `ZALO_BOT_WEBHOOK_SECRET` ra file tạm → `POST` webhook đúng URL alias với secret
    đúng + payload `message.text.received` của tài khoản chủ → HTTP 200 `{"ok":true}` → xoá file tạm ngay.
  - Đối chứng **trước/sau** trên trang Nhật ký sử dụng Vilao: trước khi bắn = **1 entry** cho key
    `smartplan-bot-chat-20261028`; sau khi bắn (reload trang) = **2 entry**.
  - Entry mới: `cnt/glm-5.3-flash`, `path.completions`, `status.success`, **2.813 token vào / 305 ra**,
    5₫, client **`node`**, ghi lúc **52s** trước thời điểm đọc. Entry cũ 2.810/295 cũng client `node`.
  - Vì sao đây là bằng chứng toàn luồng chứ không phải test tay: client `node` = serverless Vercel,
    prompt ~2.8k token = đúng prompt hệ thống của bot (bundle báo cáo PH/HS), và thời điểm khớp POST.
    Lần gọi tay trước đó (PowerShell) chỉ 129 in / 102 out — khác hẳn về hình dạng.
  - Còn lại duy nhất: xác nhận **tin trả lời hiện trong khung chat Zalo** của chủ tài khoản
    (API Zalo Bot không có endpoint đọc lại tin đã gửi; `sendMessage` lỗi bị nuốt im lặng).
- Webhook POST thiếu secret → **401** đúng.

## Số liệu đã kiểm chứng (thay cho con số sai ở bản 1)

- So với `origin/main` đang lưu trên máy: **main đi trước 21 commit, nhánh bot đi trước 27 commit**
  (`git rev-list --left-right --count origin/main...HEAD` → `21  27`).
  Bản 1 ghi "285 commit" là **sai**, không dùng con số đó nữa.
- Base chung: `65271ec`.
- File bí mật từng có trên máy — **trạng thái hiện tại: đã xoá hết** (giữ bảng làm biên bản):

  | File | Nội dung nhạy cảm | Trạng thái |
  |---|---|---|
  | `Downloads\zalo_bot_token.txt` | token Zalo 84 ký tự | **đã xoá 28/10** |
  | `%TEMP%\opencode\zalo_webhook_secret.txt` | secret 48 hex | **đã xoá 28/10** |
  | `%TEMP%\opencode\zalo_preview_secret.txt` | secret 32 hex (cũ) | **đã xoá 28/10** |
  | `%TEMP%\opencode\VILAO-KEYS.md` | **4 khóa `sk-…`** | **đã xoá 28/10** |
  | `%TEMP%\opencode\spai-env-backup.md` | mô tả env, đường dẫn nguồn | **đã xoá 28/10** |
  | `%TEMP%\opencode\vkey.txt` | — | **đã không còn** (Codex xác nhận) |
  | `%TEMP%\opencode\spai-new-vkey.txt` | key Vilao mới (dùng 1 lần) | **đã xoá 28/10** |

  Kèm 2 script đọc file secret (`zalo_smoke.mjs`, `zalo_test_10.mjs`) — đã xoá cùng lúc.
  Nghiệm thu: `Get-ChildItem` trên `%TEMP%\opencode` và `Downloads`, lọc `zalo_|VILAO-KEYS|env-backup|vkey` → **0 kết quả**.
  Lưu ý: đã xoá cả `spai-new-vkey.txt` nên **không còn bản sao key mới trên máy** — nếu cần dùng lại
  thì lấy từ Vilao console (tạo key khác) chứ đừng `vercel env pull`.

## Quy tắc chung cho Codex

- Không tự push, không merge vào `main`, không xoá nhánh, không đổi env, không deploy — trừ khi được chủ dự án bật đèn xanh đúng lô.
- Không in giá trị secret/key/token ra stdout/log/commit. Cần kiểm thì in **độ dài** hoặc **số lượng**.
- npm: `npm --prefix "C:\Users\ADMIN\Downloads\spai-assistant-ph-hs" run <script>` (PowerShell, không `cd /d`).
- `vercel` trần bị chặn → dùng `npx vercel ...`.
- Alias **bắt buộc** full domain team: `npx vercel alias set <deployment-url> zalo-test.congapro60-devs-projects.vercel.app`.
  Truyền `zalo-test` trần tạo nhầm `zalo-test.vercel.app` và webhook vẫn chạy code cũ (sự cố 27/10, đã gặp thật).
- Sau deploy/alias: xác minh bằng **test hành vi** trên đúng URL webhook. Ping 200 không đủ (cả 2 deployment đều 200).

---

## Thứ tự chuẩn để thay key (đảo lại so với bản 1)

1. Tạo key mới · 2. Cập nhật env · 3. Redeploy bản đang dùng · 4. Kiểm tra AI trả lời thật ·
5. Thu hồi key cũ · 6. Xoá bản sao bí mật trên máy.

Lý do đảo: bản 1 cho thu hồi key cũ trước bước redeploy/test → nếu env mới chưa ăn, bot chết giữa lúc HS đang dùng,
và không còn key cũ để quay lại.

## LÔ B — Rotate key AI (ĐÃ CHẠY XONG, còn 1 cổng chưa đóng)

Điều kiện vào lô: chủ dự án đã tạo key mới trên Vilao và dán vào chỗ an toàn (không qua chat/log).

- B1. ✅ Xác nhận key mới còn sống: `GET https://api.vilao.ai/v1/models` với Bearer key mới → phải thấy `cnt/glm-5.3-flash`.
  Model ghim ở `api/_assistant-ph-hs-chat.ts:123`, endpoint dòng 124 — cả hai **không** đọc env.
  **Ghi chú thực tế**: `/v1/models` trả **rỗng** khi key chưa đăng ký model nào — đừng dùng nó làm cổng chặn.
  Cách kiểm đúng: gọi thật `POST /v1/chat/completions` với `cnt/glm-5.3-flash`; 403 = chưa gắn model,
  200 = sống. Gắn model phải qua UI: card model → "Đăng ký" → modal cảnh báo billing → tick đồng ý → xác nhận.
- B2. ✅ Cập nhật env cả `production` và `preview`:
  ```
  npx vercel env rm PH_CHAT_VILAO_KEY production --yes
  npx vercel env add PH_CHAT_VILAO_KEY production
  npx vercel env rm PH_CHAT_VILAO_KEY preview --yes
  npx vercel env add PH_CHAT_VILAO_KEY preview
  ```
  **Không** dùng `vercel env pull` rồi push lại (CLI sanitize thành `[SANITIZED]` → sập bot, sự cố 27/10).
  Nạp key bằng cách **pipe từ file** (`$k | npx vercel env add ...`) để key không lọt vào argv/cmdline.
- B3. ✅ Redeploy và trỏ alias đúng domain team (lệnh ở Quy tắc chung) → `h8xsqgsvs`.
- B4. ✅ **Test hành vi toàn luồng** (đã xanh 28/10 21:13): POST webhook đúng secret + payload
  `message.text.received` của tài khoản chủ → 200 → Nhật ký Vilao tăng **1 → 2 entry** cho key mới,
  entry mới `status.success`, 2.813 in / 305 out, client `node`. Chi tiết + cách đối chứng ở mục
  "Cập nhật 28/10" phía trên.
  **Lưu ý cho lần sau**: đừng dùng `GET /v1/models` làm cổng chặn (rỗng khi key chưa gắn model);
  và đừng tin "webhook trả 200" — 200 chỉ nghĩa là đã nhận, phải đối chiếu **số request/token tăng**
  bên Vilao mới chứng minh AI thật đã chạy.
- B5. ✅ Đã thu hồi key cũ `sk-3d64…` trên Vilao → gọi thử **401**.
- B6. ✅ Đã xoá `VILAO-KEYS.md` + `spai-env-backup.md` (đang chứa 4 key `sk-` + đường dẫn nguồn khôi phục).

## LÔ A — Xoá bản sao bí mật trên máy (ĐÃ CHẠY XONG)

| # | File | Trạng thái |
|---|---|---|
| A1 | `C:\Users\ADMIN\Downloads\zalo_bot_token.txt` | ✅ đã xoá |
| A2 | `%TEMP%\opencode\zalo_webhook_secret.txt` | ✅ đã xoá |
| A3 | `%TEMP%\opencode\zalo_preview_secret.txt` | ✅ đã xoá |
| A4 | `%TEMP%\opencode\zalo_smoke.mjs`, `zalo_test_10.mjs` | ✅ đã xoá |
| A5 | `%TEMP%\opencode\VILAO-KEYS.md`, `spai-env-backup.md`, `spai-new-vkey.txt` | ✅ đã xoá |
| A6 | `%TEMP%\opencode\zalo_bot_webhook.html`, `scan-vilao-keys.mjs` | ✅ đã xoá (đã kiểm: chỉ chứa Sentry DSN công khai) |

Nghiệm thu: `Get-ChildItem` trên 2 thư mục, không còn tên nào ở trên → đã đạt, **0 kết quả**.
Bot **không** đọc token/secret từ file — Vercel giữ trong env, nên xoá không ảnh hưởng bot (đã kiểm lại: webhook vẫn 401 khi thiếu secret).
Token Zalo xem lại được trong Zalo Bot Creator. Webhook secret nếu cần thì tạo mới + `setWebhook` lại (Lô C3).

## LÔ C — Hạ tầng: GIỮ NGUYÊN alias trong lúc HS dùng

Quyết định (theo khuyến nghị Codex, tách bạch 2 việc):

- C1. **Giữ alias `zalo-test…` như hiện tại** cho tới khi hết đợt kiểm thử. Không chuyển domain lúc này —
  đổi domain = phải `setWebhook` lại = rủi ro rơi tin đúng lúc HS đang thi.
- C2. **Tích hợp bot vào `main` là việc riêng, làm sau** khi kiểm thử xong. Không gộp với C1.
  Khi làm: chạy full suite trước; đối chiếu 4 test fail `src/lib/lessonCompiler/v832/` (golden-hash, CRLF Windows)
  bằng cách chạy trên `origin/main` trần để chứng minh fail có sẵn.
- C3. Nếu buộc phải đổi webhook secret: tạo secret mới → `npx vercel env add ZALO_BOT_WEBHOOK_SECRET` →
  `setWebhook` với `secret_token` mới → `getWebhookInfo` xác nhận URL. Ping không secret phải trả **401**.
- C4. Thêm `.gitattributes` với `tests/fixtures/** -text` để chấm dứt 4 test v832 fail trên Windows (nợ từ 23/10).

## LÔ D — Bot trong nhóm lớp 11 Columbus (CHƯA LÀM, cần thiết kế)

Codex cảnh báo đúng: nới `chat_type != PRIVATE` đơn thuần **không đủ an toàn** — nhóm lớp có nhiều HS,
bất kỳ ai trong nhóm cũng gửi được `/start`, và bot trả lời trong nhóm sẽ lộ **điểm, nhận xét, mã PIN**
cho cả nhóm. Trước khi viết code phải chốt với chủ dự án:

1. Bot trong nhóm **chỉ nhận tin dạng lệnh chung** (vd đăng thông báo), hay cần trả lời riêng từng HS?
2. Nếu cần trả lời riêng: phải chuyển sang **chat riêng 1-1** (bot gửi tin nhắn trực tiếp cho HS đó),
   không trả lời trong nhóm. Zalo Bot API có `chat_id` riêng cho từng user.
3. Câu hỏi về PIN/điểm trong nhóm → bot chỉ trả lời "nhắn riêng cho thầy/cô" hoặc chuyển sang 1-1.

Không sửa `api/_assistant-zalo-bot.ts` (phần validate ~dòng 244) cho tới khi 3 điểm trên được chốt.

## LÔ E — Dọn dữ liệu test

- E1. `channelLinks` của chủ dự án (`6428d37c9d35746b2d24`) — **giữ** khi còn cần vai dual-role
  (env `ZALO_BOT_DUAL_ROLE_USER_IDS=6428d37c9d35746b2d24`). Chỉ xoá khi chủ dự án xác nhận hết nhu cầu test.
- E2. `botPinAttempts`: chỉ xoá doc của user giả `990000000001` nếu còn sót. **Không** xoá doc của HS thật.
- E3. `ZALO_BOT_ALLOWED_USER_IDS` hiện **không tồn tại** trong env → đúng trạng thái mong muốn. Không tạo biến này.

## LÔ F — Theo dõi mỗi ngày (10 phút)

- F1. `channelLinks` có `role == 'student'` tạo trong ngày (đếm link mới).
- F2. Doc `botPinAttempts` phát sinh (bao nhiêu người lạ chạm bot).
- F3. `npx vercel logs <deployment-url> --since 1d` → tìm `ZALO_BOT_UNAVAILABLE`, `getMe failed`, `nonce claim failed`.
- F4. HS kêu "bot không trả lời": đối chiếu thời điểm với `lastStrangerReplyAt` và nonce `zalo_bot_<sha256>` của giờ đó.
  Tin cũ hơn 5 phút bị từ chối 400 (stale) và Zalo không giao lại.

## Định nghĩa "xong"

- Lô B: bot trả lời AI thật sau khi đổi key (B4 xanh) **và** key cũ đã thu hồi (B5).
  → **đạt**: B4 xanh toàn luồng (Nhật ký Vilao 1→2 entry, `status.success`, client `node`), B5 → 401.
- Lô A: 6 đường dẫn không còn tồn tại, `Get-ChildItem` chứng minh. → **đạt**, 0 kết quả.
- Lô C: giữ alias; merge main là việc riêng, chưa làm.
- Lô D: 3 câu hỏi thiết kế được chủ dự án trả lời trước khi động vào code.
