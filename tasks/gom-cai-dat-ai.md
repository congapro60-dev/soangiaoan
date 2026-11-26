# Gom cài đặt AI về Cài đặt (chủ máy duyệt 26/11/2026)

## Mục tiêu
Một chỗ duy nhất (Cài đặt → thẻ AI) để chọn cách AI chạy + dán khoá; dễ hiểu cho mọi GV; không mất khoá, không đổi hành vi có sẵn ngoài những gì liệt kê.

## Hiện trạng (khảo sát 26/11)
- Khoá trình duyệt: settings.geminiApiKey/geminiApiKeys/ownApiKeys… (localStorage; Gemini/Claude/OpenAI/Grok/DeepSeek không lên Firebase). Dùng cho soạn bài/công cụ gọi thẳng từ trình duyệt (aiProviders.ts, gemini.ts, examOnlineParser).
- Khoá máy chủ: teacherAiKeys/{uid}.geminiKey (1 khoá) + vilaoKey + mode + consent + cap. Dùng cho chấm bài, bài luyện, lớp học, ảnh, mô phỏng, relay.
- UI: SettingsModal (một trang cuộn dài) + AiWalletPanel ở Chi phí AI (chọn chế độ, khoá Gemini máy chủ, khoá Vilao) + AiKeyGateModal (compact).

## Logic mới
1. Chế độ (Ví web / Khoá của tôi / Cả hai) = teacherAiKeys.mode như cũ, chỉ chuyển chỗ chọn sang Cài đặt.
2. Máy chủ giữ DANH SÁCH khoá Gemini (`geminiKeys[]`, mỗi khoá có trạng thái riêng); `geminiKey` vẫn giữ = khoá đầu dùng được (tương thích code cũ).
   - Chọn khoá: khoá đầu tiên đang dùng được. Khoá hỏng/hết hạn mức → đánh dấu khoá đó (nghỉ 60 phút) → thử khoá kế ngay trong lượt → hết khoá mới theo chế độ (Cả hai → ví; Khoá của tôi → chặn).
3. Công tắc `gradeWithWallet` (mặc định tắt): bật thì lượt có dữ liệu học sinh dùng ví (khi chế độ cho phép ví). Thay cho "hướng B" (gỡ).
4. Ô dán khoá ở Cài đặt ghi đồng thời: danh sách trình duyệt (như cũ) + gửi lên máy chủ (saveAiKeys). Một ô, hai đường.
5. Chuyển dữ liệu: khoá máy chủ cũ (geminiKey) → phần tử đầu của geminiKeys. Khoá trình duyệt cũ chưa có trên máy chủ → hiện nút "Dùng các khoá này cả cho chấm bài" (không tự gửi lên máy chủ khi GV chưa bấm Lưu).
6. Khoá Vilao riêng, tự chuyển hãng, Custom API → mục "Nâng cao" thu gọn. Chi phí AI chỉ còn ví/nạp/mã/trần/sao kê + đường dẫn sang Cài đặt.

## Không được đổi
- Ví, trần chi tiêu, mã giảm giá, sao kê, chủ dự án miễn trừ, khoá học sinh (studentAiKeys), kho khoá chung của admin (geminiKeyPool), relay, Drive, Zalo/Telegram, chia sẻ lớp, chọn model/mức suy nghĩ, các banner "Chưa có API Key".

## Kiểm chứng
- Test máy chủ: chọn khoá theo danh sách, khoá 1 hết → khoá 2 → ví; chế độ own hết → chặn; gradeWithWallet; chuyển geminiKey cũ.
- Test client hiện có (settingsSecrets, geminiKeyRing, ownKeyRotation, aiModeView, aiBanner, aiKeyGate…) phải qua.
- npm run build; mở web bằng tài khoản chủ máy: Cài đặt thẻ AI, Chi phí AI, chấm thử 1 bài.
