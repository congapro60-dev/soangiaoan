# Kế hoạch — Ví AI luôn hiện + chọn nguồn khoá + token web dùng cho mọi tính năng

> Nhánh `feat/vi-ai-chip-popup`, worktree riêng dựng từ `origin/main` `2eab64f`. Không đụng `feat/toan-final-template` (phiên khác đang sửa dở cổng học sinh / chấm bài).

## Chủ dự án đã chốt (2026-09-30)

1. Chip chính hiện **tiền**, không hiện token: ví dụ "Ví 48.200đ · hôm nay −1.300đ". Giá mỗi model đổi theo ngày/tỷ giá nên "số dư token" vô nghĩa; token nằm trong popup.
2. Giáo viên dùng khoá riêng thì popup hiện **còn lại kiểu 9Router** (thanh %, còn bao nhiêu).
3. **Token mua trên web dùng được cho MỌI tính năng AI** (không chỉ chấm bài) — đảo phạm vi quyết định 2026-08-20 (`api-key-backup-co-y`).
4. Giáo viên chọn 1 trong 3: chỉ khoá riêng / chỉ ví web / cả hai (cả hai = khoá riêng chạy trước, hết mới sang ví).

## Sự thật đã đo trong code (đừng đoán lại)

- Đã có: ví VNĐ + nạp QR SePay, mã giảm giá, trần tháng, khoá Gemini riêng lưu máy chủ, đồng ý dùng khoá chung, sao kê từng lượt, cổng 402 (`aiKeyGate`). Tab "Chi phí AI".
- `aiKeyStatus` nhẹ (~6 lần đọc); `aiStatement` đọc TOÀN BỘ `aiUsage` của người đó → chỉ gọi khi mở popup, không gọi mỗi lượt.
- `aiSpend/{uid}_{tháng}` chỉ có tổng THÁNG → chưa có "hôm nay".
- Khoá riêng phía trình duyệt (soạn giáo án, nâng cấp, dự giờ, đề thi…) đếm ở `useTokenTracker` (localStorage, theo model/ngày, có `rpm/rpd/tpm` từ `apiLimits`) — không có tiền, không lên máy chủ.
- Google KHÔNG trả "còn lại" cho khoá API. Chỉ tính được **còn lại so với hạn mức tham chiếu của model** (`rpd`), và chỉ đếm lượt gọi từ trình duyệt này. Phải ghi rõ "ước tính".
- Bảng giá `aiPricing.ts` chỉ có Gemini + GLM 5.2 + Imagen. Claude/OpenAI/Grok/DeepSeek chưa có giá → ví web chưa dùng được cho các nhà cung cấp đó.
- Trần 12 Vercel Function: thêm việc = thêm `action`, không thêm file trong `api/`.

## Giai đoạn

### GĐ1 — Chip + popup (XONG 2026-09-30, chưa merge; không đổi luồng tính tiền)
- [x] `aiSpend` ghi thêm `days.{YYYY-MM-DD}.{costUsd,calls,chargeVnd}` (cộng dồn, cùng lần ghi hiện có ở `recordAiUsage` + `recordImageUsage`); `aiKeyStatus` trả `today`, `todayVnd`, `todayCalls`.
  - verify: test `ai-keys.test.ts` có ca kiểm `days`; `todayVnd` = chargeVnd khi đang trừ ví, = giá gốc quy đổi khi chưa trừ.
- [x] `src/lib/ai/usageToday.ts` (thuần): gom lượt sao kê theo ngày VN; định dạng chip; tính còn lại theo `rpd`.
  - verify: `usageToday.test.ts`.
- [x] `useTokenTracker`: `listTodayTokenUsage()` quét localStorage lượt dùng hôm nay của mọi model (bỏ `vercel-gateway` vì đã tính ở ví).
- [x] `aiKeyGate`: phát sự kiện `ai-billing-updated` sau mỗi phản hồi của 3 đường AI → chip làm mới (gộp 3 giây, tối đa 1 lần/15 giây, bỏ qua khi tab ẩn); thêm làm mới mỗi 90 giây để thấy lượt học sinh tự nộp. Lượt đọc số liệu ví gắn header `X-Ai-Quiet` để không tự kích chính nó.
- [x] `AiWalletChip` (Header, chỉ hiện khi đăng nhập giáo viên) + `AiUsagePopup` (ví web: 4 ô số + "lượt gần đây" có tên lớp/bài/học sinh; khoá riêng: thanh còn lại theo model).
- [x] Nghiệm thu: `npm run lint`, `npm run lint:api`, `npm run test -- --run` (214 file / 2317 test), `npm run build`. Chưa thử với tài khoản giáo viên thật (cần đăng nhập Google).

### GĐ2 — Chọn nguồn khoá + vẽ lại trang ví (XONG phần máy chủ + trang ví 2026-09-30, chưa merge)
- [x] `decideAiKey` nhận `mode: 'own' | 'wallet' | 'both'`. Ánh xạ hành vi hiện tại: `both` = có khoá riêng thì chạy trước, hết mới sang ví (đúng `consent=true` hôm nay); `own` = `consent=false`; `wallet` = MỚI, bỏ qua khoá riêng.
  - Tương thích ngược: chưa có `mode` thì suy từ nhóm/`consent` (`effectiveAiMode`). Chọn ví/cả hai mà chưa đồng ý (ngoài nhóm) thì thực tế vẫn là `own`.
  - Cũng đổi: `onOwnKeyFailure` (chỉ `both` mới tự sang ví), `assertSharedAiAllowed` (GLM: chế độ `own` bị chặn, kể cả người trong nhóm), action mới `setAiMode` (chọn ví lần đầu bắt buộc `accepted: true`, ghi luôn đồng ý), `aiKeyStatus` trả `mode`. `setAiConsent` (đường cũ) còn, đồng ý = `both`, thu hồi = `own`.
- [x] Trang ví `AiWalletPanel` (dùng cả ở tab Chi phí AI lẫn hộp "AI đang tạm dừng") vẽ lại: chọn 1 trong 3 chế độ + hai thẻ nguồn (khoá riêng · ví web) có nhãn Đang dùng / Ưu tiên 1 / Dự phòng / Tắt, theo Quota Tracker của 9Router. Banner và chip đọc `mode`.
- [ ] CHƯA gộp khoá trình duyệt (Cài đặt) vào cùng trang: các tính năng soạn giáo án/nâng cấp/dự giờ/ra đề vẫn dùng khoá nhập trong Cài đặt cho tới GĐ3; trang ví ghi rõ điều này. Gộp một trang duy nhất khi GĐ3 đưa ví vào các tính năng đó.
- [x] Đây là LÕI TÍNH TIỀN đang chạy thật (bật phí từ 25/09) → test ma trận: `aiKeyPolicy.test.ts` (chế độ × khoá ok/hết/hỏng/không có × nhóm/ngoài nhóm × chưa bật phí), `ai-keys.test.ts` (ví bỏ qua khoá riêng, chỉ-khoá-riêng không âm thầm sang ví, GLM, API `setAiMode`), `aiBanner`/`usageToday`/`aiModeView`.

### GĐ3 — Ví web cho MỌI tính năng Gemini (code xong 2026-09-30, chờ thử với khoá thật)
Soạn giáo án / nâng cấp / dự giờ / ra đề gọi Gemini THẲNG từ trình duyệt bằng khoá giáo viên, nên ví không trả được. Đã dựng đường máy chủ:
- [x] `api/ai-relay.ts` — HÀM RIÊNG (không nhồi vào `grade-homework`): giữ nguyên giả định 60 giây của khoá chấm bài, có `maxDuration` 300 trong `vercel.json`. Logic ở `_ai-relay-handler.ts` + `_ai-relay-core.ts`. Gọi `callGeminiRaw` (tách từ `callGeminiVision` ở `_grading-core.ts`) nên dùng NGUYÊN luật khoá/ví/trần của chấm bài.
- [x] Chỉ nhận 3 model có giá (Gemini 3.8 Flash, 3.7 Flash, 3.1 Pro) — model chưa có giá sẽ bị tính 0đ. Ảnh: PNG/JPEG/WebP/GIF, tối đa 8, ≤3,6M ký tự base64. Hạn mức 400 lượt/giáo viên/ngày (`AI_RELAY_DAILY_LIMIT`), bảng `aiRelayQuota`.
- [x] `aiProviders.ts` (text, ảnh, stream): `geminiRouteFor` — `own` → khoá riêng như cũ; `wallet` → relay; `both` → khoá riêng trước, lỗi CỦA KHOÁ (429/quota/khoá hỏng) mới sang relay; quá tải 503 thì KHÔNG sang ví. Chế độ lấy từ `aiModeStore` (chip + trang ví cập nhật). Chưa biết chế độ hoặc web chưa bật phí thì giữ hành vi cũ.
- [x] Ảnh nén dần (1600→1280→1024px) cho lọt trần 4,5MB; banner "chưa có API Key" ẩn khi ví đã trả thay khoá Gemini; `aiKeyGate` bắt 402 của `/api/ai-relay` để mở hộp nạp tiền rồi gửi lại.
- [ ] CHƯA đo/kiểm với thực tế: (1) ~~tổng hàm ≤ 12~~ — lần đầu LỖI (13 hàm, xem `tasks/lessons.md`), đã sửa và có test khoá; Vercel ĐÃ nhận `maxDuration: 300` (preview `9e1e995` xanh, gọi không khoá trả 401/405); (2) một lượt relay thật bằng tài khoản thật (cần đăng nhập Google); (3) giáo án dài thật mất bao lâu.
- Cố ý CHƯA làm: streaming từ relay (hiện trả trọn một lần rồi hiện một cục); Claude/OpenAI/Grok/DeepSeek qua ví; `examOnlineParser.ts` (gọi Gemini trực tiếp).
- Ràng buộc còn nguyên: nhiều lượt cùng lúc qua kiểm số dư trước khi trừ → có thể âm nhẹ (chặn `no_balance` + trần là đủ); người trong nhóm dùng mã 100% (THANG10) → chi phí do chủ dự án gánh.

### GĐ4 — Ví web cho Claude + ChatGPT (code xong 2026-10-01, chưa gọi hãng thật)
- [x] `api/ai-relay.ts` nhận `provider` (`gemini` mặc định | `claude` | `openai`); `_ai-relay-vendors.ts` gọi API hãng, cùng giữ chỗ/trừ ví/trần. Không thêm Function.
- [x] Chỉ model có giá (Sonnet 5.5, Haiku 4.5, Opus 5.5 · GPT-6.1 Sol, 6 Luna, 6 Astra); bảng giá trong `aiPricing.ts`; hãng chỉ bật khi có `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` trên Vercel (`relayVendors` trong `aiKeyStatus`).
- [x] Trình duyệt: `vendorRouteFor`, bọc 3 hàm gọi AI; `getActiveApiKey` trả dấu hiệu "ví trả thay" để gỡ chặn "nhập API Key" (sửa lỗi GĐ3).
- [ ] CHƯA: đặt khoá hãng trên Vercel + gọi thật 1 lượt mỗi hãng; Grok/DeepSeek/NVIDIA vẫn khoá riêng; không stream.

## Ngoài phạm vi
- Không đổi cách ghi `aiUsage`, không bù dữ liệu cũ: "hôm nay" bắt đầu đếm từ lúc triển khai.
- Cổng phụ huynh (ý 3 của chủ dự án): để sau khi cổng học sinh + chấm bài ổn định; xem ghi chú riêng.
- Claude/OpenAI/Grok/DeepSeek qua ví: cần bảng giá + khoá chung của từng nhà (hoặc Vercel AI Gateway) — chưa làm.
