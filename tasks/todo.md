# Plan: Vẽ hình không gian cho chat Zalo (render ảnh + sendPhoto)

> Chốt bởi chủ dự án 2026-10-28: phương án render ảnh + sendPhoto (không dùng link GeoGebra).

## Nền đã có (đã khảo sát, không phải suy đoán)
- `api/export-lesson.ts:306` — puppeteer-core + @sparticuz/chromium đã chạy được trong serverless Vercel.
- `api/vercel.json` — `api/assistant.ts` maxDuration 90s (đủ: AI 3-5s + chromium 5-10s + upload).
- Zalo `sendPhoto` (docs): nhận `chat_id` + `photo` (URL công khai) + `caption` ≤2000 ký tự.
- Upload Storage + token URL: pattern sẵn ở `api/_assistant-ph-hs-photo.ts:342-347` (save buffer → firebaseStorageDownloadTokens → URL công khai).
- `getAdminStorage()` sẵn ở `api/_exam-core.ts:64`.

## Thiết kế v1

### 1. Hợp đồng AI → hình
- Prompt chat (MATH_FORMAT_RULE mở rộng): khi câu hỏi có hình học ĐÁNG vẽ (chóp, lăng trụ, hộp, trụ, nón, cầu...),
  AI thêm MỘT khối ```geometry {...}``` cuối câu trả lời, JSON theo DSL:
  `{"shape":"pyramid","apex":"S","base":{"type":"square","name":"ABCD","side":"a"},"edges":[{"label":"SA","value":"a√2"}],"note":"SA ⊥ (ABCD)"}`
- Parser tách khối geometry khỏi text; KHÔNG parse được → gửi text như hiện tại (fallback an toàn, không vỡ luồng cũ).

### 2. Renderer SVG thuần Node — `api/_assistant-geometry-svg.ts`
- v1 hỗ trợ: pyramid (đáy vuông/tam giác, SA⊥đáy), lăng trụ đứng, hộp chữ nhật/lập phương, hình trụ, hình nón, hình cầu.
- Chiếu isometric đơn giản, nhãn điểm chữ in đậm, cạnh che nét đứt. KHÔNG cần thư viện ngoài.

### 3. SVG → PNG bằng chromium — `api/_assistant-geometry-render.ts`
- Dynamic import `@sparticuz/chromium` + puppeteer-core CHỈ khi có hình (tin nhắn thường không chịu chi phí cold start).
- `page.setContent(svgHtml)` → `page.screenshot({type:'png'})`. Trang ~600x480.

### 4. Upload + gửi
- Lưu `geometry/{classId}/{uuid}.png` (copy pattern token URL của photo.ts).
- `sendPhoto` với caption = lời giải đã qua `withWebPortalLink` (giữ nguyên chuỗi hiện tại, cắt về ≤2000).
- sendPhoto lỗi → fallback `sendStyled` text như hiện tại (HS vẫn nhận lời giải, chỉ thiếu hình).
- Ảnh upload lỗi → fallback text. Mọi nhánh lỗi KHÔNG làm bot im lặng.

### 5. Vị trí nối
- `api/_assistant-zalo-bot.ts` nhánh chat AI: sau `answerParentQuestion` → parse geometry → nếu có: render + sendPhoto; không có: gửi text như cũ.

## Test plan (viết TRƯỚC khi sửa code — TDD)
- `assistant-geometry-svg.test.ts`: mỗi shape v1 sinh SVG có nhãn đúng điểm, cạnh che dash; DSL sai → trả null (không throw).
- `assistant-geometry-parse.test.ts`: tách khối geometry khỏi reply; khối hỏng/JSON sai → text thuần; reply không có khối → null.
- `assistant-geometry-caption.test.ts`: caption ≤2000, chứa link lớp ĐÚNG (dùng lại `withWebPortalLink`), hint cuối.
- Nhánh zalo-bot: có hình → gọi sendPhoto; sendPhoto throw → fallback sendStyled text.

## Chấp nhận xong khi
1. Test mới + full API suite pass (trừ 4 fail v832 có sẵn), tsc 0 lỗi, build OK.
2. Deploy + bắn câu hỏi hình chóp thật qua webhook → HS (dual-role owner) NHẬN ĐƯỢC ẢNH trong Zalo + caption đúng lớp.
3. Câu hỏi KHÔNG hình học (ví dụ điểm số) → hành vi như cũ, không ảnh hưởng.

## Không làm trong v1 (nêu rõ để tránh phình)
- Không vẽ hình phức tạp (mặt phẳng trong Oxyz, góc nhị diện, đường tròn phương vị...).
- Không cache ảnh theo câu hỏi.
- Không vẽ cho luồng menu/notify — chỉ nhánh chat AI.
