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

### GĐ2 — Chọn nguồn khoá + vẽ lại trang cài đặt (sau GĐ1)
- [ ] `decideAiKey` nhận `mode: 'own' | 'wallet' | 'both'`. Ánh xạ hành vi hiện tại: `both` = có khoá riêng thì chạy trước, hết mới sang ví (đúng `consent=true` hôm nay); `own` = `consent=false`; `wallet` = MỚI, bỏ qua khoá riêng.
  - Tương thích ngược: chưa có `mode` thì suy từ `consent`.
- [ ] Gộp giao diện: một trang "AI của tôi" thay cho hai chỗ nhập khoá rời (Cài đặt = khoá trình duyệt; Ví AI = khoá máy chủ), thiết kế theo Quota Tracker của 9Router (thẻ theo nguồn, công tắc, thanh còn lại).
- [ ] Đây là LÕI TÍNH TIỀN đang chạy thật (bật phí từ 25/09) → test đủ ma trận (3 chế độ × có/không khoá × nhóm/ngoài nhóm × số dư/trần).

### GĐ3 — Ví web cho MỌI tính năng (lớn nhất, làm cuối)
Hiện soạn giáo án / nâng cấp / dự giờ / đề thi gọi Gemini THẲNG từ trình duyệt bằng khoá giáo viên. Muốn ví trả cho chúng thì phải có đường máy chủ:
- [ ] Mở rộng `_ai-gateway-handler.ts` (đã có: xác thực Firebase, chặn ẩn danh, JSON/SSE, ghi lượt, hạn mức ngày) để nhận danh sách model cho phép (Gemini 3.8/3.7 Flash, 3.1 Pro, GLM 5.2) thay vì cố định GLM.
- [ ] `aiProviders.ts` (điểm nghẽn duy nhất của mọi lời gọi phía trình duyệt): khi chế độ = ví (hoặc `both` và khoá riêng hết) → gửi qua đường máy chủ.
- [ ] Ràng buộc cần đo trước khi hứa:
  - Thân request tối đa ~4,5MB trên Vercel → ảnh/PDF phải nén hoặc đẩy Storage.
  - `maxDuration` đang 60 giây → bài sinh dài (Gemini Pro suy nghĩ) có thể quá; cần streaming + đo thật.
  - Nhiều lượt cùng lúc qua kiểm số dư trước khi trừ → có thể âm nhẹ; chặn `no_balance` + trần là đủ, ghi rõ.
  - Người trong nhóm dùng mã 100% (THANG10) → chi phí do chủ dự án gánh.
- [ ] Cập nhật `HANDOFF.md`, memory `api-key-backup-co-y`.

## Ngoài phạm vi
- Không đổi cách ghi `aiUsage`, không bù dữ liệu cũ: "hôm nay" bắt đầu đếm từ lúc triển khai.
- Cổng phụ huynh (ý 3 của chủ dự án): để sau khi cổng học sinh + chấm bài ổn định; xem ghi chú riêng.
- Claude/OpenAI/Grok/DeepSeek qua ví: cần bảng giá + khoá chung của từng nhà (hoặc Vercel AI Gateway) — chưa làm.
