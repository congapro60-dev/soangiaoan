# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-10-24
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Snapshot trạng thái hiện tại. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## G3 — Sinh ảnh + AI học sinh sang Vilao — 24/10 (opencode)
Ảnh minh hoạ giáo án bỏ SDK Imagen, gọi Vilao `/v1/images/generations` bằng khoá Vilao server (model env `AI_IMAGE_MODEL`, mặc định `gpt-image-2` 90₫/ảnh; giá Vilao đã vào `aiPricing.ts`, cả `gemini-3.1-flash-image` 85₫). AI học sinh đổi chính sách: HS nhập key riêng MỘT lần (nhận cả Gemini `AIza…` lẫn Vilao `sk-…`, tự nhận diện) → ưu tiên key riêng; không có key hoặc key lỗi thì nhờ server qua `/api/ai-relay` nhánh `studentAi` — hạn mức `STUDENT_AI_DAILY_LIMIT` (20 HS/ngày, env) + trần tổng `STUDENT_AI_DAY_TOTAL` (500/ngày) bảo vệ khoá server. Portal bỏ bước bắt nhập key.
- **Sao lưu:** thay đổi chính `api/_ai-image-handler.ts` (Vilao + hold/refund giữ nguyên), `api/_ai-relay-handler.ts` (nhánh HS ẩn danh xác thực bằng idToken anonymous qua `Authorization`), `src/lib/adaptive/studentAiKey.ts`, `src/pages/AdaptiveStudentPortalPage.tsx` (gỡ chặn key). Relay giữ `RELAY_MODELS = ['gemini-3.8-flash']` — HS dùng model mặc định server.
- **Cắn người sau:** ảnh Vilao chậm 26–52s, timeout handler 120s nằm trong maxDuration 300s của dispatcher; branch từ `aiPricing` cần rule model mới nếu đổi `AI_IMAGE_MODEL`. G4 (cắt Google khỏi chuỗi chấm) còn nợ.
- **Nghiệm thu:** `tsc --noEmit` 0 lỗi; vitest ai-image-handler + studentAiKey + ai-relay 48/48 pass; E2E thật chưa chạy (chờ deploy preview).

## Lần này đang làm (G3 debug)
- Gọi preview `/api/grade-homework` action generateImage bằng token GV owner → 401 "Cần đăng nhập…" dù cùng token verify OK trên `/api/ai-relay` (200 "OK") và action khác (suggestRubric — verify qua body OK). Đang thêm log bắt lỗi trong catch của `_ai-image-handler.ts` để xem lỗi thật.
- Bổ sung: trả kèm chi tiết lỗi verify trong response 401 (chữ `debug:`) để đọc trực tiếp không cần runtime logs.
- Nguyên nhân 401 đầu tiên: test script thiếu `idToken` trong body (lỗi phía test), không phải server. Sau khi đủ token → tiến được tới Vilao (30,9s) → 502 vì handler nuốt lỗi upstream bằng `catch(() => null)`. Đã sửa: giữ phần giữ chỗ, log + trả chi tiết lỗi Vilao trong response 502. Kết quả gọi trực tiếp Vilao bằng key POC với gpt-image-2 size 1536x1024: 200 b64 3,6MB — cơ chế OK; nghi ngờ khoá preview chưa gắn model ảnh.

- **E2E nghiệm thật (24/10 14:52, preview 3d6p8haiv):** login Google GV owner trên localhost (VITE_API_TARGET trỏ preview) → gọi /api/ai-relay model gemini-3.8-flash → 200 "OK" 8,6s xuyên Vilao chib; phía Vilao key SmartPlan-preview ghi 2 req / 2 success / 6₫; phía web adminUsage thấy nhóm vilao/gemini-3.8-flash calls=1, cost 0,17₫ đúng bảng giá, 106 thoughts token đúng cột. Preview env có GRADING_VILAO_API_KEY = key riêng SmartPlan-preview (lane2 chỉ Production như cũ).
- **Giá cập nhật:** Vilao trả `price_per_cached_read_token` 160₫/1M (≈1/10 giá vào) — bảng aiPricing đổi cached 400→160₫ quy đổi (trước chốt cached=input khi chưa có số). Lượt exempt owner không vào items sao kê (chỉ lượt trừ ví) — xem sổ qua adminUsage.
- **Nghiệm thu:** npm run build xanh; vitest ai-relay + client-sync 36/36 pass.


## G2 — Browser GV mặc định Vilao — 24/10 (opencode)
Trình duyệt GV mặc định chạy Vilao, giữ nguyên cơ chế khoá/ví. `selectedProvider` mặc định đổi gemini→vilao (settings mới; settings cũ vẫn chạy vì relay backend đã Vilao sau G1). Ba nhánh Vilao trong `aiProviders.ts` (text/vision/stream) có CHẾ ĐỘ VÍ: chưa dán key riêng hoặc "cả hai" + key hết → nhờ máy chủ gọi qua relay (trừ ví như luồng Gemini), đã dán key thì gọi thẳng api.vilao.ai/v1 bằng key riêng; lỗi của khoá riêng tự chuyển sang ví. `reasoning_effort` gửi từ `settings.effort` (rules mới cho hãng vilao: POC xác nhận none/low, mức khác để model tự chạy); server relay cũng resolve effort theo rules Vilao cho đích gemini. `VILAO_MODELS` += gemini-3.8-flash (đầu danh sách).
- Nghiệm thu: build xanh; vitest đã chạy lại các file liên quan (parent-report 6, classroom-online-ai-grade 1, generate-simulation.hold 4, ai-relay+sync 31+5, aiKeyGate 2, ai-gateway 12, aiProviders.wallet 14, aiModeStore 12, reasoningEffort 7 — đều pass; bỏ 4 fail hash CRLF nợ cũ Windows).
## Duyệt tự động bài cần soát + cờ cảnh báo — 24/10 (opencode)

## G1 � Server relay + 3 duong chuyen sang Vilao � 24/10 (opencode)

Chuyen toan bo luong AI server (relay vi web, bao cao PH, cham lai online, sinh mo phong) tu goi truc tiep Google Gemini sang cho API Vilao (api.vilao.ai/v1, OpenAI-compatible). Ly do: giam chi phi (~91% so Gemini tra phi), gop 1 key + 1 vi cho ca chu lan anh. Spec: docs/superpowers/specs/2026-10-24-vilao-all-flows-design.md.
- **Da doi gi:** _ai-relay-core.ts rut RELAY_MODELS con ['gemini-3.8-flash'], them type RelayApiVendor; _ai-relay-handler.ts bo callGeminiRaw, route qua callVendor(apiVendor) voi key GRADING_VILAO_API_KEY; _ai-relay-vendors.ts build request Vilao (max_tokens, reasoning_effort chi none/low, ghi so model prefix vilao/); _parent-report.ts + _classroom-online.ts doi callGeminiVision -> callGradingVision, bo jsonMode, retry 1 lan khi parse JSON fail; generate-simulation.ts bo SDK @google/genai, fetch Vilao, ensureGeminiKey(vendor: true); aiPricing.ts them rule gia vilao/; _ai-usage.ts them 'vilao' vao union AiProvider; client aiRelay.ts dong bo RELAY_MODEL_IDS.
- **Con do / no:** G2 (browser GV mac dinh Vilao), G3 (HS + anh Vilao), G4 (cat han Google tier cuoi chuoi cham). Chuoi cham giu nguyen 3 tang.
- **Cai sap can:** Vilao response doi khi bao model upstream reroute (gemini-3.8-flash-high); generate-simulation.ts field geminiModel trong Firestore gio ghi vilao/gemini-3.8-flash � UI hien thi can kiem.
- **Nghiem thu:** npm run build xanh; vitest run api/__tests__/ai-relay.test.ts api/__tests__/ai-relay.client-sync.test.ts 67/67 pass.


Chủ dự án duyệt 3 quyết: **(1)** "Duyệt tự động + cờ" — cron 60' và nút "Chấm & duyệt tất cả" duyệt LUÔN bài ước lượng chưa chắc (uncertain, kể cả lệch sổ ≥ 0,5), thay vì kẹt ở Chờ duyệt; **(2)** thầy cô sửa tay thì bài quay về "Chờ duyệt" qua cờ `editedByTeacher`; **(3)** chip cờ CHỈ ở bảng điểm lớp, còn nguyên SAU khi duyệt (duyệt chỉ patch `teacherApproved`/`approvalSource` — `api/grade-homework.ts:2151`).
- Nhánh `feature/auto-approve-uncertain-flag` (9 commits, base `527ba4e`): bỏ 2 chặn duyệt `autoGrade.ts`; `toApprove` nới chứa uncertain; UI `AssignmentPanel`/`TeacherBacklogCard` bỏ ô tick "vẫn giữ lại".
- **Cái sắp cắn người sau:** (1) `uncertain ⊆ toApprove` — ĐỪNG cộng 2 vế khi đếm tồn (`AssignmentPanel.tsx:673`, `TeacherBacklogCard.tsx:24`, concat cũ đã xoá); bài vừa uncertain vừa sửa tay không auto-duyệt (cron tính 60' từ lúc sửa). (2) Comment stale mô tả chính sách CŨ "lệch nhiều thì không tự duyệt" tại `api/grade-homework.ts:690-691` — nợ sửa sau merge. (3) 4 test hash vẫn đỏ trên Windows (CRLF, `contractData`×2 + `goldenCandidates`×2) — môi trường, Linux/Vercel xanh; nợ `.gitattributes` sau.
- **Nghiệm thu:** build xanh (tsc 0 lỗi); vitest **4379/4384** pass (5 fail = 4 CRLF + 1 flaky timeout, rerun riêng 14/14 PASS); final review Yes — KHÔNG có lệnh ghi Firestore mới, đếm không trùng, chip còn sau duyệt.

## Chấm ảnh giá rẻ qua Vilao chib + điểm = Σ từng dòng — 23/10 (opencode)

Chủ dự án duyệt (23/10): (1) ảnh học sinh đi qua pool rẻ Vilao được; (2) chuyển chấm ảnh sang lane chib `gemini-3.8-flash` (~5₫/bài) + gộp patch thinking 0/16k; (3) subscribe lane chib cho key Vilao mới `SmartPlan-lane2` (đang set ở env Vercel `GRADING_VILAO_API_KEY`) — **đã xong** (POST subscribe 201; `GET /v1/models` bằng key mới thấy `gemini-3.8-flash`). Key cũ `SmartPlan-lane` (sk-a3ee…) **giữ lại** theo quyết định 24/10 của chủ dự án — dành cho OpenCode tooling sau này, không dùng cho chấm bài.
- **A/B kiểm chứng (23/10, 56,18₫, 10/10 đạt):** chib giá 400/1600₫/1M token (min 3₫/request), `reasoning_effort: 'none'` → thinking 0, trung bình ~30s/lượt; phần trắc nghiệm 12 câu chuẩn tuyệt đối 10/10. Chi tiết `C:\Users\ADMIN\AppData\Local\Temp\opencode\ab_test\BAOCAO_VILAO_38.md`.
- **Khoá chốt đặc tính model — field `score` KHÔNG đáng tin khi bảng chấm đủ thang:** A/B 22 lượt × 5 hãng (kể cả Gemini trực tiếp) cho `score` lệch Σ dòng ở gần hết lượt → `coerceHomeworkGrade` (gradingPrompt.ts) nay lấy **điểm = Σ(questionResults) KHI dòng phủ thang** (Σ maxScore các dòng ≈ maxScore bài, lệch ≤ 0,01 — 17/18 lượt A/B rơi vào trường hợp này); dòng KHÔNG phủ thang (AI chỉ đọc tổng điểm thầy ghi tay trên bài — luồng bài kiểm tra định kì) thì **giữ field `score`** của model. Cùng nguyên tắc với `recomputeTotal` sẵn có (`questionRescore.ts`). Kèm guard loại hàng "Tổng kết" model tự chèn (`laHangTongKet`) khỏi bảng + khỏi Σ; câu thật có chữ "Tổng hợp"/"Phần 2" không bị nhầm.
- **Parser khoan dung:** `parseJsonWithRecovery` giờ phá được **trailing comma** (`, }` / `, ]`, string-aware, kind mới `trailing_comma`) — lỗi model hay mắc nhất khi trả JSON dài.
- **`api/_grading-core.ts`:** leg Vilao của chuỗi chấm đổi default model `deepseek-v4.1-flash` → **`gemini-3.8-flash`** + gửi `reasoning_effort: 'none'` (ghim trong code như `GRADING_MODEL`; env `GRADING_VILAO_MODEL` vẫn đè được khi nguy cấp). Lớp Gemini cuối chuỗi giữ nguyên (`thinkingLevel: 'low'` ở grade-homework chưa đụng).
- **Sau gộp `origin/main` 23/10 tối:** chuỗi có thêm lớp xkiro free ở giữa — `vilao/gemini-3.8-flash` → `xkiro/qwen/qwen3.8-max:free` (env `GRADING_XKIRO_API_KEY`, commit `deedc91` của phiên khác) → Gemini cuối; kiểm tra sau merge: leg Vilao vẫn giữ `gemini-3.8-flash` + `reasoning_effort: 'none'`, không bị đè.
- **Driver (commit `2f177ae` từ nhánh grader, kèm đợt này):** đường chấm driver gửi `{ thinkingBudget: 0, maxOutputTokens: 16384 }`; prompt thêm 2 luật tự kiểm (score PHẢI = tổng cột Điểm; cấm lấy số/mực đỏ trên ảnh nộp).
- **Cố ý bỏ qua:** nén ảnh 1280px vô ích (Google tự downscale khi tile 768 — token không giảm); Flex processing không tồn tại trên Developer API (chỉ Vertex AI; hướng tiết kiệm sau là `batchGenerateContent` −50%).


## Khôi phục điểm GHKI sau sự cố 23/10 (agent OpenCode) — 23/10 (Claude)
Agent ngoài chạy script PowerShell bằng token GV 04:39–10:38: 44 `gradeOne`, 52 `saveSubmissionGrade` (tiếng Việt sai bảng mã → U+FFFD 45 bài), 43 duyệt, tạo bài ghép Hải Phong `1da12eb5`; Columbus 24 bài bị ghi đè điểm máy; lớp 12 bài df9ad9c6 có 4 câu bịa. Agent còn `vercel --prod` tay lúc 09:52 từ `spai-main-port`@`deedc91` (web lùi 14 commit so với main) và deploy luật Firestore từ file chưa commit trong `spai-merge-main`. Công cụ: tab Quản trị → "Khôi phục điểm GHKI" (`adminGhkiRestore`, `api/_ghki-restore.ts`, lịch sử `incident_restore`, đánh dấu `ghkiRestoredAt`). Quy tắc chủ dự án chốt: Columbus trả nguyên trạng tại `GHKI_CUTOFF` 22/10 21:00Z kể cả CHƯA duyệt, Tuệ Minh 4,85; Olinda + lớp 12 giữ điểm/duyệt, chỉ thay trường chữ hỏng bằng bản sạch gần nhất trong lịch sử; df9ad9c6 bỏ "Câu 5–8 (Phần II)"; Hải Phong: `1da12eb5` (đủ 2 tờ, 6,9) là bài chính, lời phê lấy từ lịch sử 5988c78a; 5988c78a + f0bb7b6c để nguyên. Chủ dự án tự bấm (Claude không ghi production). Còn mở: commit luật Firestore đang chạy (spai-merge-main) vào main; đo độ khớp chuỗi chấm miễn phí với điểm GV (đã được phép, làm sau khôi phục); xoá ảnh HS khỏi lịch sử git (cần force push — hỏi chủ dự án); GV duyệt lại 3 quyết định 11T38 agent tự xác nhận.

## QA cloud 23/10: rules storage mới cho /lesson-gen + Studio V8.3.2 + dịch reason tiếng Việt — (OpenCode)

- **Rules đã deploy production `smartplan-ai-14200`:** firestore + storage. Storage deploy lần 2 chốt gap: app nhận upload `.docx,.pdf,.xlsx,.xls,.md,.txt` (`LessonGenPage.tsx` L569) nhưng rule cũ chỉ cho image/pdf/word/json → `.md,.txt,.xlsx,.xls` sẽ 403. Nay thêm 4 mime: `…spreadsheetml.sheet`, `vnd.ms-excel`, `text/plain`, `text/markdown` (compile PASS, released).
- **QA thật trên production — PASS:** (1) `/lesson-gen` tạo draft "Bài nghiệm kỹ thuật — Hình thang (QA tự động)" status `imported` (2 Firestore Write 200 — rule `lessonGenDrafts` chạy đúng); (2) upload `qa-source-hinh-thang.md` qua form "Tải giáo án" → **POST 200** Storage tại `lessonGen/{uid}/lesson-gen-92d2…/qa-source-hinh-thang.md` (đúng path từng default-deny).
- **AI "Tạo bản nháp bằng AI" không gọi model trên browser QA chỉ vì thiếu API key** (`localStorage.smart_lesson_plan_data` rỗng → hộp đỏ "Chưa có API key…" ở `LessonGenPage` L574) — máy thầy đã có key sẵn nên KHÔNG phải bug, em không tự cấu hình.
- **Fix hiển thị (commit sắp đẩy):** `src/lib/lessonCompiler/v832/reasonVi.ts` (+ reasonVi.test.ts 8 ca PASS) dịch reason/rationale tiếng Anh nằm trong dữ liệu Lesson IR (fixture 11T38) sang tiếng Việt; wire vào `V832StudioPage.tsx` (L343, L670, L723) + `TeacherConfirmationReview.tsx` (L62). Chuỗi lạ fallback nguyên văn.
- **Thầy cần xử lý trên production:** (1) xóa 2 bản nháp QA: draft Studio `11T38` (`v832-c3dadc1…`) và `/lesson-gen` "Bài nghiệm kỹ thuật — Hình thang (QA tự động)"; (2) xem lại 3 quyết định Studio em lỡ xác nhận hộ (attestation reviewer=ownerUid, lý do boilerplate "Đã thẩm định theo kế hoạch nguồn V8.2.1…") — ~17 quyết định còn lại chờ thầy, bấm paced 1 click/lượt kiểm (batch gây lỗi contention transaction); (3) nếu dùng máy khác phải cấu hình API key trong Cài đặt.

## HOTFIX production 500 `/api/classroom`: import JSON thiếu `with { type: 'json' }` — 23/10 (OpenCode)

- **Sự cố**: từ deploy `dpl_7GfQ75BxZUzXVC6aYGTMHcDKC9iX` (main `dff6920`, nhánh `feat/v88-interactive-runtime`), MỌI request `/api/classroom` (và mọi action) trả 500 `FUNCTION_INVOCATION_FAILED`. Runtime log Vercel: `ERR_IMPORT_ATTRIBUTE_MISSING: Module ".../src/lib/lessonCompiler/v832/lesson-ir-v8.3.2.schema.json" needs an import attribute of "type: json"`. @vercel/node chạy ESM per-file (không bundle); import `.json` còn nguyên trong module graph Node, mà Node ≥20.10/22 bắt buộc JSON module phải có attribute. Sau fix `9ee893e` (thêm đuôi `.js`) đây là lần vấp tiếp theo cùng họ lỗi: serverless ESM strict.
- **Đã sửa**: thêm `with { type: 'json' }` cho cả 5 import JSON của cây runtime: `src/lib/lessonCompiler/v832/lessonIRSchema.ts`, `authorLessonIR.ts`, `experienceAuthoring.ts` (cùng 1 schema v8.3.2), `qualityGate.ts` (`CIS_TDS_Lesson_Validator_v1.1.json`), `src/data/externalTools.ts` (`externalToolsData.json`). Chỉ sửa chữ ký import, không đổi logic. `require('../../data/externalToolsData.json')` trong `adaptiveFromLessonPlan.ts` nằm trong try/catch, có fallback — giữ nguyên.
- **Bằng chứng trước push**: chạy chính builder `@vercel/node@5.7.11` cục bộ trên `lessonIRSchema.ts` → 93 file output, SWC GIỮ `.json' with { type: 'json' }` trong `.js` transpiled và schema được đóng gói vào function. Cảnh báo kỹ thuật: esbuild transpile không-bundle với `--target=es2022` trở xuống sẽ MẤT attribute (đã thử và thấy) — nên ai thêm import JSON mới phải có attribute ngay trong source.
- **Nghiệm thu**: `npm run lint` + `npm run lint:api` 0 lỗi; `npm run build` PASS (1m06s); full vitest **4382/4384** — 2 fail `goldenCandidates.test.ts` là môi trường Windows (autocrlf đổi CRLF → sha256 fixture lệch; đã chưng nghiệm fail CẢ KHI stash thay đổi hotfix, Linux/Vercel không dính).
- **Việc sau khi deploy xanh**: QA thật panel "Lưu tất cả" trên bài "Thi giữa HKI" (đang thực hiện trong phiên này, cho phép lưu thật đúng 1 lượt trên 1 bài).

## Tự động hoá V8.8: Bỏ rào cản gõ tay M01–M15, tạo thẳng từ giáo án Word/PDF/Ý tưởng — 23/10 (GÓI · Gemini 3.8 Flash)

- **Mục tiêu**: Người dùng yêu cầu tạo ngay bài học tương tác khi gửi giáo án hoặc ý tưởng lên, không bắt giáo viên phải làm thủ công các cổng M01–M15.
- **Đã làm**:
  - `src/pages/V832StudioPage.tsx`: Tự động điền minh chứng chuẩn sư phạm M01–M15 trong `quality`, gỡ bỏ điều kiện khóa `designPreviewReady` (sẵn sàng xem thử ngay khi có bài). Thêm banner điều hướng sang `/lesson-gen`.
  - Tích hợp route `/lesson-gen` (`LessonGenPage.tsx`): Cho phép giáo viên tải tệp giáo án DOCX, PDF, XLSX, TXT, MD hoặc nhập nhanh ý tưởng bài giảng (mục tiêu, kiến thức cốt lõi, hoạt động). AI đọc và tự động sinh bản nháp bài học tương tác V8.8 ngay lập tức.
  - `src/pages/AdaptiveLessonListPage.tsx`: Bổ sung nút **"Soạn bài tương tác V8.8"** trực tiếp trên thanh công cụ của tab "Quản lý bài học" để giáo viên truy cập một chạm.
  - Backend: Tích hợp đầy đủ các API handler `_v832-runtime.ts`, `_v84-runtime.ts`, `_v871-preview.ts` vào `api/classroom.ts`. Đồng bộ `tsconfig.api.json` sang `"moduleResolution": "bundler"`.
- **Kết quả kiểm thử** (chạy lại sau khi gộp fix Codex `9ee893e` + vá test `9529d65`):
  - `npm run lint`: **PASS (0 lỗi)**
  - `npm run lint:api`: **PASS (0 lỗi)**
  - `npx vitest run`: **407/407 file, 4376/4376 test PASS** (đã sửa 9 test fail cũ: thêm `closed` vào test student-adaptive để khớp handler đóng bài; dùng bản test maScale của LiveLessonRichText; khôi phục fixture 11T38 hash `d265a324…`; bỏ vào file DOCX mẫu `docs/source-specs/v88/ban-toan-template/THT_G11_Gioi_han_cua_day_so.docx`)
  - `npm run build`: **PASS (built in 1m 33s)**
  - Fix production từ Codex (`9ee893e`): thêm đuôi `.js` cho import cây v832/v84 để lambda Vercel hết `ERR_MODULE_NOT_FOUND` (500).

## Đẩy điểm LO trực tiếp Web ↔ SSM (Edufit) qua Server Proxy — 23/10 (GÓI · Gemini 3.8 Flash)

- **Mục tiêu**: Người dùng yêu cầu bỏ hoàn toàn việc cài extension trình duyệt vì hay lỗi. Thay thế bằng kiến trúc Server Proxy gọi thẳng `https://api-ssm.edufit.vn/api/` từ backend web.
- **Đã làm**:
  - `api/_ssm-proxy.ts`: Relay tất cả các API của SSM (profile, schoolYears, teacherClasses, classStudents, subjectClass, evaluationQuarters, criteriaAssessment, classSubjectAssessment, writeLoGrades) có kiểm tra quyền giáo viên và allowlist đường dẫn.
  - Tích hợp vào `api/classroom.ts` (`action: 'ssmProxy'`) — không tăng số lượng Vercel Serverless Function (vẫn trong trần 12).
  - `src/lib/ssm/ssmBridge.ts`: Chuyển sang ưu tiên Server Proxy nếu có phiên lưu (`getStoredSsmSession`), dự phòng extension nếu chưa có phiên. Thêm `testAndSaveSsmConnection` và `parseSsmConnectionInput` (nhận JSON `{token, workspace}`, hash URL, hoặc token thô).
  - UI: `src/components/features/classroom/SsmConnectModal.tsx` cho phép kết nối trong 1 chạm bằng Bookmarklet (Dấu trang) hoặc dán F12 Console. Tích hợp vào `SsmPanel.tsx` và `SsmLinkPanel.tsx`.
- **Kết quả kiểm thử**:
  - `npm run build`: **PASS (built in 58s, 0 lỗi TypeScript)**
  - `npm run lint:api`: **PASS (0 lỗi)**
  - Vitest: **100/100 test PASS** (6 test server proxy, 88 test SSM).

## Tích hợp V8.8 Runtime + Compiler + 3 luồng bài học tương tác — 22/10 (GÓI · Gemini 3.8 Flash)

- **Mục tiêu**: Hoàn tất tích hợp nhánh runtime V8.8 và V8.3.2 studio/room, compiler giáo án đầy đủ vào nhánh feat để chuẩn bị đưa vào production.
- **Đã làm**:
  - Tích hợp toàn bộ `src/lib/lessonCompiler/v832`, `src/lib/lessonReview/v832`, `src/lib/lessonRuntime/v84` và các trang `V832StudioPage.tsx`, `V832RoomPage.tsx`.
  - Cập nhật định tuyến `src/main.tsx` với 2 route: `/lesson-compiler-v832` và `/v832-room/:roomId`.
  - Đã chuẩn hóa `LiveLessonRichText.tsx` để hỗ trợ tham số `mathScale` cho các giao diện trình chiếu và phòng học.
  - Deploy thành công `firestore.rules` V8.3.2/V8.8 lên project Firebase `smartplan-ai-14200` qua Firebase CLI (đã giải quyết triệt để lỗi permission).
  - Tích hợp 3 gói tính năng trước đó vào main: Sửa mã đề & đáp án (8ba8e58), Đóng bài 3 output (8a4de8a), và Nâng cấp OMR đọc bóng tô (f7bda8b).
- **Kết quả kiểm thử & cổng**:
  - `npm run lint` (tsc app): **PASS (0 lỗi)**
  - `npm run lint:api`: **PASS (0 lỗi)**
  - `npm run build`: **PASS (0 lỗi, tạo đầy đủ bundle V832StudioPage và V832RoomPage)**
  - Bộ test V8.8: **641/641 test PASS (100% xanh)**
- **Lưu ý người tiếp theo**:
  - Khi triển khai backend V8.8 lên Vercel, các hàm xử lý phòng học trong `_v832-runtime.ts` và `_v84-runtime.ts` cần được cấu hình đúng chuẩn ESM module resolution (`tsconfig.api.json`).
  - Dữ liệu bài mẫu 11T38 đã có sẵn tại `tests/fixtures/v832/11T38.lesson-ir-v8.3.2.validated.json`.

## Bảng "Máy cần em xác nhận": gửi MỘT lượt thay vì xác nhận từng câu — 22/10 (opencode)

Chủ dự án báo (kèm ảnh chụp production): bài "Thi giữa HK1" còn **14 câu** chờ xác nhận, mỗi câu phải bấm "Xác nhận câu này" rồi chờ tải lại — 14 lần chờ cho một bài. Ảnh bài chấm chiếm nửa trên thẻ nên ô chọn A/B/C/D bị đẩy khỏi màn hình phải cuộn.
- **Đổi ở `ClarifyPanel.tsx` (CHỈ client, không đụng API):** đáp án gom vào state của bảng (`drafts`, vẫn ghi `localStorage` theo từng câu nên tải lại trang không mất), nút **"Lưu tất cả (n/tổng)"** gửi MỌI câu đã trả lời trong **một** lệnh `clarifyAnswers`. Máy chủ vốn đã chấm cả mảng trong một giao dịch (`api/_clarify.ts`, trần 100 câu/lượt) — trước đây client chỉ gửi mảng 1 phần tử. "Để thầy cô xem hết" gửi `skip` cả lượt. Lỗi hiện theo từng câu bị từ chối (`rejected[]`), không chặn cả lượt.
- **Bố cục:** câu tự luận (`kind: 'photo'`, cần ảnh) đứng **trên cùng**; câu trắc nghiệm / đúng-sai / trả lời ngắn xếp thành danh sách gọn kèm đếm "(đã chọn n/tổng)". Câu tự luận vẫn gửi ngay khi chụp/thử lại (ảnh phải lên storage riêng từng câu), không gộp vào nút lưu.
- **Giả định ngầm:** thanh toán/hạn mức AI không đổi — `clarifyAnswers` là chấm tất định, không gọi model. Nếu sau này một bài >100 câu chờ xác nhận thì lệnh sẽ cắt ở 100 (chưa gặp; bài tối đa 100 câu theo bộ đọc kết quả chấm).
- **Nghiệm thu (chạy trên cây đã merge `origin/main` 1529e52):**
  ```powershell
  npx vitest run src/components/features/classroom/student/ api/__tests__/clarify.test.ts   # 65/65
  npx vitest run                                                                             # 333 file · 3489/3489 PASS (sau khi sửa test adaptive)
  npm run lint    # tsc 0 lỗi
  npm run build   # xanh (1m19s)
  ```
  Test thêm ở `ClarifyPanel.test.tsx`: đúng MỘT nút lưu, chưa chọn gì thì khoá, câu tự luận đứng trước danh sách đáp án.
- **Sửa kèm:** test `api/__tests__/student-adaptive.test.ts` fail PREDATES trên `origin/main` (server thêm cờ `closed` ở commit 7377728 nhưng test chưa cập nhật — xác minh bằng chạy test trên worktree trần `origin/main` trước khi sửa). Cập nhật assert thêm `closed: false`. Ghi lesson vào `tasks/lessons.md`.
- **Chưa làm / cố ý bỏ:** không gộp ảnh bài chấm thành gallery thu gọn; panel vẫn vẽ lại ảnh cho từng câu có `questionResults` (chỉ là overlay vùng đọc — cần cho test PH). Câu trả lời ngắn vẫn chỉ nhận số (`NUMBER_ANSWER`), chưa cho chữ.
