# Chuyển toàn bộ luồng AI sang Vilao (+ xKiro cho ảnh) — Design

> Thiết kế chốt với chủ dự án ngày 24/10/2026. Mục tiêu chiến lược: **bỏ dần key Google trả phí** (đắt), chuyển mọi luồng AI (GV, HS, PH) sang Vilao — chất lượng tương đương, chi phí thấp hơn. Thầy đã duyệt thiết kế; spec này là căn cứ cho plan + thi công theo giai đoạn.

## Mục tiêu

Mọi luồng AI của web đi qua **Vilao** (`api.vilao.ai/v1`, OpenAI-compatible — thanh toán bằng key có sẵn: chữ, vision, stream) và **xKiro** (`api.xkiro.com` — chỉ dùng cho **tạo ảnh**, vì Vilao không có model ảnh). Google Gemini chỉ còn là **tầng dự phòng chuỗi chấm** trong 1–2 tuần, sau đó cắt hẳn.

## Quyết thầy đã chốt (24/10)

1. **Tiền**: gộp một ví Vilao lane2 `SmartPlan-lane2` (key đã set env Vercel `GRADING_VILAO_API_KEY`) — không cấp thêm ví; nạp thêm khi cần.
2. **Gemini dự phòng**: sau deploy, giữ Gemini làm tầng cuối chuỗi chấm 1–2 tuần (chỉ đụng khi Vilao + xKiro cùng chết). Ổn định thì cắt nốt, gỡ key Google.
3. **Tạo ảnh**: chuyển sang xKiro — mặc định `openai/gpt-image-2.5` (~250₫/ảnh, giảm giá vĩnh viễn ~−75% so Imagen 4 ~1.000₫/ảnh); hạn mức ảnh free/ngày của xKiro tự áp trước khi trừ ví; cache hash sẵn có giúp ảnh lặp lại 0₫; tên model đặt qua env để đổi sang free (`sensenova/sensenova-u1.5-lite`) không sửa code.
4. **Luồng HS**: HS tự dán key riêng (nhận cả key Gemini-free cá nhân (`AIza…`) lẫn key Vilao (`sk-…`), hệ thống tự nhận diện loại) → **ưu tiên key riêng**; hết quota/lỗi/không có → rơi xuống **key Vilao của thầy qua server** với hạn mức chống lạm dụng.
5. **Settings GV**: giữ tuỳ chọn "key dán riêng" (dán được cả Vilao lẫn Google, ai dán tự chịu phí vicí riêng); mặc định mọi luồng đi ví server Vilao.

## Hiện trạng (bản đồ call-site đã rà 24/10)

| Nhóm | Đường hiện tại | Ghi chú chuyển |
|---|---|---|
| ~40 điểm gọi browser GV | selector provider `src/lib/aiProviders.ts` (vilao đã code sẵn: text/vision/stream ~`:328/:601/:876`) + SDK Google `src/lib/gemini.ts` | gần Vilao-ready; phải bỏ jsonMode + đổi thinkingConfig |
| Relay ví server | `api/_ai-relay-core.ts` (`RELAY_MODELS:18` = 4 model Gemini) + `api/_ai-relay-handler.ts` | đổi backend gọi sang Vilao |
| Chuỗi chấm ảnh 3 tầng | `api/_grading-core.ts` (chain ~`:692`; tier-1 Vilao sẵn, tier-2 xKiro free, tier-3 Gemini REST giữ dự phòng) | giữ nguyên tới G4 |
| Gemini trực tiếp server | `_parent-report.ts` (báo cáo PH, jsonMode `:254/:279`, gọi qua `callGeminiVision` — import `:11`), `_classroom-online.ts` (~`:942`), `generate-simulation.ts` (SDK `@google/genai` `:3/:209/:214`) | đổi sang Vilao, bỏ jsonMode |
| Tạo ảnh | `api/_ai-image-handler.ts` — Imagen SDK `:95-104`, cache hash + Storage + ví giữ nguyên | đổi sang xKiro async job |
| Luồng HS | key riêng localStorage `src/lib/adaptive/studentAiKey.ts`; 3 điểm gọi `AdaptiveStudentPortalPage.tsx` (~`:569/:624/:881`); HS ẩn danh bị chặn khỏi relay (`_ai-relay-handler.ts:71`) | thêm đường server riêng |
| Luồng PH | **không có AI nào** — chỉ xem báo cáo AI do GV trigger (server) | chuyển theo báo cáo PH |
| jsonMode Google (`responseMimeType`) | grading-core `:349`, parent-report `:254/:279`, classroom-online, examOnlineParser `:204` | bỏ trên đường Vilao theo mẫu chuỗi chấm (prompt cứng JSON + `parseLooseJson`) |

Danh sách model Vilao thật + hạn mức free/ngày ảnh xKiro: **probe lúc G0**, ghi kết quả vào phần "Kết quả POC" cuối file này.

## Kiến trúc đích

| Luồng | Đường mới |
|---|---|
| Soạn/đề/chat/phân tích (browser GV) | mặc định **relay server → key Vilao lane2**; stream + vision giữ nhịp UX; key riệng là chế độ tự chọn |
| Chấm ảnh | Vilao → xKiro free → **Gemini (dự phòng, gỡ G4)** |
| Báo cáo PH, chấm lại online, simulate đề | Vilao OpenAI-compatible, không jsonMode |
| Tạo ảnh minh hoạ | xKiro async job (nộp job → poll → tải bytes → Storage), cache như cũ |
| AI HS | key riêng HS ưu tiên (browser-direct); fallback `/api` server (token bài luyện định danh + hạn mức) |

## Thay đổi theo file

### G0 — POC (không sửa code app)

- Khoá Vilao lane2 vào máy (thầy dán vào `.env.local` tạm không commit, hoặc đồng ý kéo env từ Vercel).
- Probe `GET /v1/models` Vilao → chốt danh sách model + giá; thử 1 lần stream + 1 lần vision.
- POC xKiro images: 3–4 ảnh mẫu `gpt-image-2.5` + 1 ảnh `sensenova` (prompt giáo dục kiểu app) → gửi thầy so chất lượng với Imagen; đo thời gian job + hạn mức free/ngày.
- Kết quả ghi vào phần "Kết quả POC" cuối file này.

### G1 — Server sang Vilao

- `_ai-relay-core.ts` + `_ai-relay-handler.ts`: gọi `https://api.vilao.ai/v1/chat/completions` (mẫu adapter OpenAI-compatible có sẵn trong `_grading-core.ts` ~`:719`); `RELAY_MODELS` = danh sách chốt ở G0; key từ `GRADING_VILAO_API_KEY`; stream SSE pass-through; vision giữ.
- `_parent-report.ts` / `_classroom-online.ts` / `generate-simulation.ts`: bỏ đường Google, gọi Vilao; jsonMode → prompt "\nTrả về đúng JSON, không thêm chữ." + parse `parseLooseJson`; fail parse → retry 1 lần.
- Chuỗi chấm `_grading-core.ts`: giữ 3 tầng; tier-1 Vilao là chính; tier-3 Gemini nguyên trạng (dự phòng G4).
- `aiPricing` cập nhật giá Vilao (theo G0) để ví nội bộ quy tiền đúng nguồn.

### G2 — Browser GV mặc định Vilao

- `aiProviders.ts`: mặc định provider `vilao` + chế độ ví; `VILAO_MODELS` (`src/data/models.ts:90-92`, hiện 1 model) bổ sung danh sách G0; đường key-riêng giữ nguyên như chế độ tự chọn.
- Bỏ jsonMode Google trên mọi đường Vilao; `thinkingConfig` (thinkingLevel) → `reasoningEffort` (OpenAI-compatible) — chuỗi chấm đã dùng đúng cách này.
- `gemini.ts` giữ cho key-riêng Google (không xoá sớm); không còn là đường mặc định.

### G3 — Luồng HS + ảnh xKiro

- Helper mới cho HS: thử key riêng theo loại key → không có/lỗi/quota → gọi server mới (hạn mức `STUDENT_AI_DAILY_LIMIT` mặc định ~20 lượt/HS/ngày, `STUDENT_AI_DAY_TOTAL` trần tổng, chỉnh env; định danh theo token bài luyện sẵn có trong link HS).
- Điểm gọi `AdaptiveStudentPortalPage.tsx` đổi sang helper; `studentAiKey.ts` nâng nhận diện 2 loại key; HS ẩn danh vẫn dùng server đường mới (không phải relay GV).
- Route server HS: ưu tiên **gộp action vào dispatcher có sẵn** nếu còn trùng trần 12 function Vercel; tạo route mới chỉ khi còn slot — soi lúc plan.
- `_ai-image-handler.ts`: Imagen → xKiro `/v1/images/generations` (202 + poll job `GET /v1/images/generations/{id}`, trần ~90s — quá hạn trả "thử lại sau", không treo); model env `AI_IMAGE_MODEL` mặc định `openai/gpt-image-2.5`; tỉ lệ 1:1/4:3/3:4/16:9/9:16 khớp xKiro; bỏ `ensureGeminiKey` + `onOwnKeyFailure` khỏi handler này; cache hash + Storage + ví trừ theo ảnh như cũ.

### G4 — Cắt Google (1–2 tuần sau G3, khi số liệu ổn)

- Gỡ tầng Gemini cuối chuỗi chấm; xoá `_gemini-key-pool.ts`, `ensureGeminiKey` (**chỉ** đường server), xoá env Google; dọn UI Settings phần key Google dùng chung.
- `src/lib/geminiKeyRing.ts` + đường key-riêng-Google browser: **giữ** (thầy chốt giữ tuỳ chọn key riêng) — chỉ loại khỏi mặc định.
- Kiểm: `grep generativelanguage|@google/genai` chỉ còn trong file phục vụ key-riêng.

## Rủi ro + xử lý

| Rủi ro | Xử lý |
|---|---|
| Vilao stream rớt | tắt streaming cho luồng chat, trả khối non-stream |
| jsonMode bỏ → output lệch JSON | prompt cứng + `parseLooseJson` + retry 1 lần (mẫu chuỗi chấm đã chứng minh) |
| Ảnh xKiro chậm (chục giây–vài phút) | poll trong trần function; quá hạn báo thử lại; cache hash giảm số ảnh mới |
| Catalog Vilao đổi model | tên model đặt qua env; G0 chốt danh sách cụ thể |
| HS lạm dụng fallback ví | hạn mức/HS/ngày + trần tổng + bật/tắt env |

## Ngoài phạm vi (không làm)

- Không đụng logic chấm/duyệt đã merged (auto-approve + cờ 24/10).
- Không đổi UI ngoài phần bắt buộc (Settings giữ tuỳ chọn key riêng).
- Không migration Firestore; billing ví giữ cơ chế `setAiKeyOwner/hold` hiện có, chỉ đổi bảng giá.
- Không xoá code Google sớm hơn G4.

## Kết quả POC (điền sau G0)

- Catalog Vilao (model hoạt động + giá): —
- Hạn mức ảnh free/ngày xKiro + thời gian job trung bình: —
- Ảnh mẫu so Imagen: —
- Model chốt mặc định (chữ / vision / Ảnh): —
