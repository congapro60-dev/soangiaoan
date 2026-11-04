# Chuyển toàn bộ luồng AI sang Vilao (chữ + ảnh) — Design

> Thiết kế chốt với chủ dự án ngày 24/10/2026. Mục tiêu chiến lược: **bỏ dần key Google trả phí** (đắt), chuyển mọi luồng AI (GV, HS, PH) sang Vilao — chất lượng tương đương, chi phí thấp hơn. Thầy đã duyệt thiết kế; spec này là căn cứ cho plan + thi công theo giai đoạn. *Cập nhật sau POC cùng ngày: tạo ảnh cũng đi Vilao (thay phương án xKiro ban đầu) — xem "Kết quả POC".*

## Mục tiêu

Mọi luồng AI của web đi qua **Vilao** (`api.vilao.ai/v1`, OpenAI-compatible — thanh toán bằng 1 key có sẵn: chữ, vision, stream, **và tạo ảnh**). Google Gemini chỉ còn là **tầng dự phòng chuỗi chấm** trong 1–2 tuần, sau đó cắt hẳn. xKiro không nhận vai trò mới — giữ nguyên tier-2 free trong chuỗi chấm như hiện trạng.

## Quyết thầy đã chốt (24/10)

1. **Tiền**: gộp một ví Vilao lane2 `SmartPlan-lane2` (key đã set env Vercel `GRADING_VILAO_API_KEY`) — không cấp thêm ví; nạp thêm khi cần.
2. **Gemini dự phòng**: sau deploy, giữ Gemini làm tầng cuối chuỗi chấm 1–2 tuần (chỉ đụng khi Vilao + xKiro cùng chết). Ổn định thì cắt nốt, gỡ key Google.
3. **Tạo ảnh** *(chốt lại sau POC — trước đó chọn xKiro)*: chuyển sang **Vilao** luôn — mặc định `gpt-image-2` (nhà Reli, **90₫/ảnh**, ~50s; giảm ~91% so Imagen 4 ~1.000₫/ảnh), env `AI_IMAGE_MODEL` đổi được sang `gemini-3.1-flash-image` (Nano-Banana-2, 85₫/ảnh, ~26s) hoặc model khác không sửa code; cache hash sẵn có giúp ảnh lặp lại 0₫. Lý do đơn giản hóa: 1 key · 1 ví · 1 nguồn đối soát cho cả chữ + ảnh; endpoint Vilao đồng bộ (POST → 200 có b64) chứ không phải nộp-job + poll như xKiro.
4. **Luồng HS**: HS tự dán key riêng (nhận cả key Gemini-free cá nhân (`AIza…`) lẫn key Vilao (`sk-…`), hệ thống tự nhận diện loại) → **ưu tiên key riêng**; hết quota/lỗi/không có → rơi xuống **key Vilao của thầy qua server** với hạn mức chống lạm dụng.
5. **Settings GV**: giữ tuỳ chọn "key dán riêng" (dán được cả Vilao lẫn Google, ai dán tự chịu phí ví riêng); mặc định mọi luồng đi ví server Vilao.

## Hiện trạng (bản đồ call-site đã rà 24/10)

| Nhóm | Đường hiện tại | Ghi chú chuyển |
|---|---|---|
| ~40 điểm gọi browser GV | selector provider `src/lib/aiProviders.ts` (vilao đã code sẵn: text/vision/stream ~`:328/:601/:876`) + SDK Google `src/lib/gemini.ts` | gần Vilao-ready; phải bỏ jsonMode + đổi thinkingConfig |
| Relay ví server | `api/_ai-relay-core.ts` (`RELAY_MODELS:18` = 4 model Gemini) + `api/_ai-relay-handler.ts` | đổi backend gọi sang Vilao |
| Chuỗi chấm ảnh 3 tầng | `api/_grading-core.ts` (chain ~`:692`; tier-1 Vilao sẵn, tier-2 xKiro free, tier-3 Gemini REST giữ dự phòng) | giữ nguyên tới G4 |
| Gemini trực tiếp server | `_parent-report.ts` (báo cáo PH, jsonMode `:254/:279`, gọi qua `callGeminiVision` — import `:11`), `_classroom-online.ts` (~`:942`), `generate-simulation.ts` (SDK `@google/genai` `:3/:209/:214`) | đổi sang Vilao, bỏ jsonMode |
| Tạo ảnh | `api/_ai-image-handler.ts` — Imagen SDK `:95-104`, cache hash + Storage + ví giữ nguyên | đổi sang Vilao `/v1/images/generations` (đồng bộ) |
| Luồng HS | key riêng localStorage `src/lib/adaptive/studentAiKey.ts`; 3 điểm gọi `AdaptiveStudentPortalPage.tsx` (~`:569/:624/:881`); HS ẩn danh bị chặn khỏi relay (`_ai-relay-handler.ts:71`) | thêm đường server riêng |
| Luồng PH | **không có AI nào** — chỉ xem báo cáo AI do GV trigger (server) | chuyển theo báo cáo PH |
| jsonMode Google (`responseMimeType`) | grading-core `:349`, parent-report `:254/:279`, classroom-online, examOnlineParser `:204` | bỏ trên đường Vilao theo mẫu chuỗi chấm (prompt cứng JSON + `parseLooseJson`) |

Model ảnh Vilao đã probe xác thực (xem "Kết quả POC"): catalog "Hình ảnh" có 54 model; key POC đã gắn 3 model hoạt động thật.

## Kiến trúc đích

| Luồng | Đường mới |
|---|---|
| Soạn/đề/chat/phân tích (browser GV) | mặc định **relay server → key Vilao lane2**; stream + vision giữ nhịp UX; key riêng là chế độ tự chọn |
| Chấm ảnh | Vilao → xKiro free → **Gemini (dự phòng, gỡ G4)** |
| Báo cáo PH, chấm lại online, simulate đề | Vilao OpenAI-compatible, không jsonMode |
| Tạo ảnh minh hoạ | **Vilao POST `/v1/images/generations`** (đồng bộ, trả `b64_json`) → Storage; model env `AI_IMAGE_MODEL` mặc định `gpt-image-2`; cache như cũ |
| AI HS | key riêng HS ưu tiên (browser-direct); fallback `/api` server (token bài luyện định danh + hạn mức) |

## Thay đổi theo file

### G0 — POC ✅ (xong 24/10, không sửa code app)

- Key POC `SmartPlan-POC` tạo trên Vilao console (browser); plaintext lưu `.env.local` (`VILAO_TEST_API_KEY`, không commit).
- Đã gắn 3 model vào key POC: `gemini-3.8-flash` (chib), `gpt-image-2` (Reli), `gemini-3.1-flash-image` (WOWZ).
- Đã probe: `/v1/models`, call text, stream, vision, 2 ảnh mẫu — **kết quả chi tiết ở phần "Kết quả POC" cuối file**.

### G1 — Server sang Vilao

- `_ai-relay-core.ts` + `_ai-relay-handler.ts`: gọi `https://api.vilao.ai/v1/chat/completions` (mẫu adapter OpenAI-compatible có sẵn trong `_grading-core.ts` ~`:719`); `RELAY_MODELS` = danh sách chốt ở G0; key từ `GRADING_VILAO_API_KEY`; stream SSE pass-through (POC xác nhận chuẩn OpenAI SSE); vision giữ (POC xác nhận đọc ảnh đúng).
- `_parent-report.ts` / `_classroom-online.ts` / `generate-simulation.ts`: bỏ đường Google, gọi Vilao; jsonMode → prompt "\nTrả về đúng JSON, không thêm chữ." + parse `parseLooseJson`; fail parse → retry 1 lần.
- Chuỗi chấm `_grading-core.ts`: giữ 3 tầng; tier-1 Vilao là chính; tier-3 Gemini nguyên trạng (dự phòng G4).
- `aiPricing` cập nhật giá Vilao (theo G0) để ví nội bộ quy tiền đúng nguồn.

### G2 — Browser GV mặc định Vilao

- `aiProviders.ts`: mặc định provider `vilao` + chế độ ví; `VILAO_MODELS` (`src/data/models.ts:90-92`, hiện 1 model) bổ sung danh sách G0; đường key-riêng giữ nguyên như chế độ tự chọn.
- Bỏ jsonMode Google trên mọi đường Vilao; `thinkingConfig` (thinkingLevel) → `reasoningEffort` (OpenAI-compatible) — chuỗi chấm đã dùng đúng cách này.
- `gemini.ts` giữ cho key-riêng Google (không xoá sớm); không còn là đường mặc định.

### G3 — Luồng HS + ảnh Vilao

- Helper mới cho HS: thử key riêng theo loại key → không có/lỗi/quota → gọi server mới (hạn mức `STUDENT_AI_DAILY_LIMIT` mặc định ~20 lượt/HS/ngày, `STUDENT_AI_DAY_TOTAL` trần tổng, chỉnh env; định danh theo token bài luyện sẵn có trong link HS).
- Điểm gọi `AdaptiveStudentPortalPage.tsx` đổi sang helper; `studentAiKey.ts` nâng nhận diện 2 loại key; HS ẩn danh vẫn dùng server đường mới (không phải relay GV).
- Route server HS: ưu tiên **gộp action vào dispatcher có sẵn** nếu còn trùng trần 12 function Vercel; tạo route mới chỉ khi còn slot — soi lúc plan.
- `_ai-image-handler.ts`: Imagen → Vilao `POST /v1/images/generations` **đồng bộ** (POC: 200 + `data[0].b64_json`, hoặc `url` tuỳ model); model env `AI_IMAGE_MODEL` mặc định `gpt-image-2` (90₫/ảnh), có thể đổi `gemini-3.1-flash-image` (85₫, nhanh hơn) bằng env; **đặt `maxDuration` ≥ 120s cho function tạo ảnh** (ảnh mất 26–52s; POC đã dính phí 90₫ cho call bị ngắt khi client timeout — function phải chờ đủ); tỉ lệ khung ảnh map sang `size` theo model; bỏ `ensureGeminiKey` + `onOwnKeyFailure` khỏi handler này; cache hash + Storage + ví trừ theo ảnh như cũ.

### G4 — Cắt Google (1–2 tuần sau G3, khi số liệu ổn)

- Gỡ tầng Gemini cuối chuỗi chấm; xoá `_gemini-key-pool.ts`, `ensureGeminiKey` (**chỉ** đường server), xoá env Google; dọn UI Settings phần key Google dùng chung.
- `src/lib/geminiKeyRing.ts` + đường key-riêng-Google browser: **giữ** (thầy chốt giữ tuỳ chọn key riêng) — chỉ loại khỏi mặc định.
- Kiểm: `grep generativelanguage|@google/genai` chỉ còn trong file phục vụ key-riêng.

## Rủi ro + xử lý

| Rủi ro | Xử lý |
|---|---|
| Vilao stream rớt | tắt streaming cho luồng chat, trả khối non-stream |
| jsonMode bỏ → output lệch JSON | prompt cứng + `parseLooseJson` + retry 1 lần (mẫu chuỗi chấm đã chứng minh) |
| Ảnh Vilao chậm (26–52s) + bị tính tiền cả khi client ngắt | `maxDuration` ≥ 120s cho function ảnh; cache hash giảm số ảnh mới; client hiển thị "đang vẽ…" thay vì timeout nhanh |
| Catalog Vilao đổi model | tên model đặt qua env; G0 chốt danh sách cụ thể |
| HS lạm dụng fallback ví | hạn mức/HS/ngày + trần tổng + bật/tắt env |

## Ngoài phạm vi (không làm)

- Không đụng logic chấm/duyệt đã merged (auto-approve + cờ 24/10).
- Không đổi UI ngoài phần bắt buộc (Settings giữ tuỳ chọn key riêng).
- Không migration Firestore; billing ví giữ cơ chế `setAiKeyOwner/hold` hiện có, chỉ đổi bảng giá.
- Không xoá code Google sớm hơn G4.

## Kết quả POC (G0 — đo thật 24/10/2026, key `SmartPlan-POC`)

### Text · vision · stream — `gemini-3.8-flash` (chib, 400₫/1M vào · 1.600₫/1M ra · min 3₫/req)

| Thử | Kết quả |
|---|---|
| `GET /v1/models` | 200 — **chỉ trả model đã gắn vào key** (kiểm soát được phạm vi model từng key) |
| Call text (câu trivial) | ✅ Đúng câu trả lời — 9s khi để mặc định (model tự suy luận **532 reasoning tokens** cho câu 3-token) |
| `reasoning_effort: 'low'` | ✅ Có hiệu lực — cùng câu hỏi còn **0,7s**; luồng soạn/chat cần clamp effort theo mức |
| Stream `stream: true` | ✅ Chuẩn OpenAI SSE (`data: {...chunk}` + `data: [DONE]`), nội dung stream đủ |
| Vision ảnh PNG (OCR "2+3=5") | ✅ Trả đúng `2+3=5` — 3,8s, định dạng OpenAI `image_url` + data URL |
| Điểm lạ | Response báo `model: "gemini-3.8-flash-high"` dù gọi `gemini-3.8-flash` — upstream reroute của nhà bán, chấp nhận được |

### Tạo ảnh — Vilao tab "Hình ảnh" (54 model) — key đã test 2 model

| Model (API id) | Nhà | Giá | Thời gian đo | Trả về | Nhận xét |
|---|---|---|---|---|---|
| `gpt-image-2` | Reli | **90₫/req** | 50s | `b64_json` PNG 1024×1024 | Dòng ChatGPT Images; mô tả bán "tạo & sửa ảnh ổn định", 4.1★(8) |
| `gemini-3.1-flash-image` (Nano-Banana-2) | WOWZ | **85₫/req** | **26s** | `url` JPG (CDN) | Dòng Gemini image; nhanh gấp đôi; vẽ chữ yếu hơn |
| `gpt-image-2` (Vilao Official) | imx | 500₫/req | 49s | — | Cùng model dòng gpt-image nhưng đắt 5,5× — không chọn |
| `grok-imagine-image` | mgr | 40₫/req | 8,7s | — | Bán ghi rõ "ảnh đẹp chữ kém" — không đủ tin cậy |

- Endpoint: `POST /v1/images/generations` **đồng bộ** (khác xKiro kiểu 202 + poll); model chưa đăng ký vào key → 403 rõ ràng.
- Ảnh mẫu gửi thầy so: `poc-image-gpt.png` vs `poc-image-nano.png` (cùng prompt lớp học Tiểu học) — **thầy chọn `gpt-image-2` làm mặc định** (ảnh đẹp đồng đều, nét sạch).
- Không có hạn mức free/ngày cho ảnh trên Vilao (trả theo req); hạn mức free sensenova chỉ có trên xKiro — không cần vì 85–90₫/ảnh đã quá rẻ so Imagen ~1.000₫.

### Học phí POC

- Tổng tiêu POC: **277₫** (số dư 49.129₫ → 48.852₫) = 3 call chữ/vision min 3₫ × 3 + ảnh 90₫ × 2 (1 lần thành công, 1 lần client timeout nhưng server vẫn hoàn thành + tính tiền) + Nano-Banana 85₫.
- Bài học đã ghi vào G3: function tạo ảnh phải đặt `maxDuration` đủ dài, client không được cắt sớm.

### Model chốt

- **Chữ/vision/stream**: `gemini-3.8-flash` (đăng ký chib) — rẻ (400/1.600₫ per 1M), nhanh sau khi clamp effort; danh sách model khác (`RELAY_MODELS`, `VILAO_MODELS`) chốt lúc plan G1/G2 theo catalog 878 model.
- **Ảnh**: `gpt-image-2` mặc định + `AI_IMAGE_MODEL` env đổi được.
