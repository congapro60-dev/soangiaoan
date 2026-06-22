# HANDOFF — Soạn giáo án / học phân hoá

**Cập nhật gần nhất**: 2026-06-19  
**Repo**: `soangiaoan` — `https://github.com/congapro60-dev/soangiaoan`  
**Branch chuẩn**: `main`  
**Production URL để QA UI**: `https://giaoandewey.vercel.app`  
**Mục đích**: file handoff ngắn gọn cho Cline / Claude Code / Antigravity / kỹ sư tiếp theo. Chi tiết lịch sử cũ đã được nén; nếu cần truy vết đầy đủ hãy dùng `git log`, `git show`, các test report, hoặc lịch sử commit.

---

## 1. Trạng thái hiện tại

### 1.0c Cập nhật phiên 2026-06-22 — Tài liệu Chức năng Web (11 File Tiếng Việt)

- **Mô tả:** Đã hoàn thành 100% việc biên soạn và cam kết 11 file tài liệu kỹ thuật viết bằng tiếng Việt mô tả cấu trúc, cách hoạt động, luồng dữ liệu và kịch bản QA chi tiết cho từng tab chức năng của hệ thống.
- **Vị trí lưu trữ:**
  - Danh mục tài liệu: `docs/features/` (gồm các tệp từ `01-dashboard.md` đến `11-templates-skeletons.md`).
  - Đặc tả Thiết kế: `docs/superpowers/specs/2026-06-22-features-documentation-design.md`.
  - Kế hoạch Thực hiện: `docs/superpowers/plans/2026-06-22-features-documentation.md`.
- **Mục đích sử dụng:** Giúp các Agent AI thế hệ tiếp theo hoặc kỹ sư mới nắm bắt nhanh chóng cấu trúc component, hooks, DB schema, logic phân tích prompt AI, kịch bản QA thủ công và các lỗi (bug) lịch sử từng được xử lý để tránh xảy ra lỗi regression (lỗi lặp lại).

### 1.0 Cập nhật phiên 2026-06-19 — Text-to-Slide Automation & Đối chiếu Roadmap AI

Bối cảnh: review bản kế hoạch `ai_features_integration_plan.md` (do Antigravity soạn). Kết luận đối chiếu với code thật:

- **Text-to-Slide Automation** (Phase A) — luồng dán văn bản thô → AI sinh cấu trúc slide JSON → preview → xuất PPTX. KHÔNG đụng pipeline giáo án (`Coordinator.ts`), tái dùng 100% engine `downloadPPTX` cũ.
  - Mới: `src/components/modals/TextToSlideModal.tsx` — modal nhập text độc lập.
  - Sửa: `src/utils/exportUtils.ts` — thêm `generateTextToSlideData()` (prompt + parse JSON, có guard `slidesData[0].type === 'walt'`).
  - Sửa: `src/components/tabs/CreatorTab.tsx` — nút "Tạo Slide nhanh từ Văn bản thô" (chế độ single), feed kết quả vào `slidePreview` + `SlidePreviewBoard` sẵn có.
  - Đã runtime test thành công bằng bot_test.js và verify bằng file PPTX xuất ra.

- **Model Delegation cho FormatAgent** (Phase B) — Ép sử dụng các model tiết kiệm chi phí (`gemini-2.5-flash`, `claude-haiku-4-5-20251001`, `gpt-4o-mini`) trong `FormatAgent.ts` thông qua tham số `modelOverride`. callAIStream được nâng cấp để chấp nhận param này.

- **Tích hợp GeoGebra** (Phase C) — Thêm engine `geogebra` vào `DiagramRenderer.tsx` và `LessonContentBoard.tsx` (nhận diện block ```geogebra). Render an toàn bằng cách tạo iframe srcDoc với sandbox hạn chế (`sandbox="allow-scripts allow-pointer-lock"`), không sử dụng `allow-same-origin` tránh nguy cơ XSS.

- **Export GeoGebra ra Word** (Phase D) — Thêm hàm `rasterizeGeogebraToPng` trong `krokiRender.ts` sử dụng cơ chế postMessage liên miền. Iframe GeoGebra tự xuất PNG base64 gửi ngược về trang chính, sau đó chèn trực tiếp ảnh PNG (`ImageRun`) vào luồng tạo file Word trong `renderWordCore.ts`.

- **Typecheck & Build**: Đã chạy build thành công 0 errors, toàn bộ 4 Phase đều đã sẵn sàng merge/commit.

**Làm rõ roadmap (tránh "đập đi xây lại" thứ đã có):**
- **AI Grading (Mục 5 trong plan) ĐÃ TỒN TẠI**, không cần làm mới. Code thật: `src/components/tabs/GradingTab.tsx` + `src/utils/gradingUtils.ts` (`callAIWithVision`, chấm theo rubric, batch/smart grading, plagiarism, class analysis).
- **Delegation Architecture (Mục 1 trong plan) KHÔNG áp dụng cho Planning/Content** — đã thử và revert phiên 2026-06-17 (xem 1.0 cũ bên dưới). Nếu tối ưu chi phí, chỉ an toàn ở FormatAgent.
- **GeoGebra (Mục 3) phụ thuộc HTML Sandbox (Phase 3A) chưa code** — nhúng applet AI-sinh trực tiếp vào DOM = rủi ro XSS. Phải có sandbox iframe trước (xem mục 5.1).

### 1.0b Cập nhật phiên 2026-06-17 & 2026-06-18 — Khôi phục Pipeline Giáo án & Điều tra Lỗi Worksheet

#### Đã hoàn tất (merged to main)

**Khôi phục pipeline soạn giáo án về bản ổn định (3 bước)**

Bối cảnh: Phiên trước Anti thêm Critic/Fix agent và bỏ FormatAgent (commit `8897a66`). Pipeline mới gây ra các lỗi nghiêm trọng trên production: nội dung giáo án bị lặp, lộ thẻ `<lesson_content>` XML, bảng vỡ format. Claude thử restore FormatAgent (commit `6c399b3`) nhưng bỏ luôn `onStreamChunk` → app trắng màn hình khi đang soạn. Đã revert (`ebb0c79`), sau đó khôi phục đúng cách trong phiên này.

**3 file đã sửa:**
- `src/lib/agents/Coordinator.ts`: Đổi lại pipeline `Planning → Content → Format` (bỏ Critic/Fix). Bỏ `FAST_MODEL_MAP` — Planning dùng cùng model với Content để đảm bảo chất lượng dàn ý.
- `src/lib/agents/ContentAgent.ts`: Khôi phục prompt cũ dùng thẻ `<draft_content>` (không phải `<lesson_content>`), tập trung chiều sâu chuyên môn — FormatAgent lo phần format.
- `src/components/tabs/CreatorTab.tsx`: Khôi phục `<SimulatedProgress />` hiển thị % real-time khi loading, text "Hệ thống AI đang xử lý... X%" + "Vui lòng không đóng trang này".

**Lý do không thêm Critic/Fix trở lại**: Critic/Fix là ý tưởng đúng nhưng phải đặt giữa Content và Format (không thay thế Format). Chưa implement vì cần test cẩn thận. Pipeline hiện tại ổn định.

#### ✅ Đã fix thêm trong phiên 2026-06-18 (merged to main)

**P0 — Phiếu tại lớp bảng vỡ khi xuất Word** — ĐÃ SỬA (`src/utils/worksheetUtils.ts`):
- **Nguyên nhân đã xác định**: Prompt cũ sinh bảng **3 cột** ("Bài tập | Lựa chọn A | Lựa chọn B"). `getCellWidth()` trong `renderWordCore.ts:275` chia 30%/30%/40% → cột "Bài tập" chỉ ~2.7cm, quá hẹp → chữ xếp dọc, file 30 trang toàn bảng vỡ.
- **Cách fix**: Đổi prompt sang **bảng đúng 2 cột** — tiêu đề bài tập đặt trên dòng heading `**Bài X: [đề bài]**`, bảng bên dưới chỉ gồm Cột A (45%) và Cột B (55%). Thêm lệnh cấm tường minh "TUYỆT ĐỐI KHÔNG tạo bảng 3 cột" kèm ví dụ mẫu trong prompt.

**P1 — BTVN thiếu cấu trúc "Cốt lõi & Chinh phục"** — ĐÃ SỬA (`src/utils/worksheetUtils.ts`):
- **Nguyên nhân đã xác định**: Prompt cũ chỉ liệt kê 4 loại câu hỏi đánh số 1/2/3/4 liên tiếp → AI sinh số thứ tự lộn xộn, không có phân hóa 2 mức.
- **Cách fix**: Cập nhật prompt theo đúng cấu trúc đã thiết kế:
  - **I. NHIỆM VỤ CỐT LÕI** (8 điểm — bắt buộc): Trắc nghiệm (6 câu) + Đúng/Sai (2 câu, 4 ý mỗi câu) + Trả lời ngắn (2 câu)
  - **II. GÓC PHÁT TRIỂN NĂNG LỰC** (9-10 điểm — tự chọn): Tự luận vận dụng cao (2 câu thực tế đời sống)

#### ✅ Đã fix thêm trong phiên 2026-06-18 (commit `5e2fa49`)

**3 lỗi TypeScript sẵn có** — ĐÃ SỬA (build & `tsc --noEmit` đều PASS, 0 errors):
- `src/components/features/testing/MathOcrUploader.tsx` — gỡ prop `zoom` không hợp lệ
- `src/components/tabs/TestingTab.tsx` — bổ sung `settings`, `showToast` khi dùng `MathOcrUploader`
- `src/utils/promptBuilder.ts` — sửa import type `Settings`

(Lưu ý đường dẫn: `MathOcrUploader.tsx` nằm ở `features/testing/`, `promptBuilder.ts` ở `utils/` — KHÔNG phải `features/creator/` hay `lib/` như một số tài liệu cũ ghi sai.)

#### Tồn đọng — CHƯA fix

**P3 — Gemini API quota**:
- Trong phiên test local, Gemini free tier bị hết quota (lỗi 429 RESOURCE_EXHAUSTED + 503 UNAVAILABLE). Đây là lý do soạn giáo án thất bại khi test, không phải lỗi code.
- Giải pháp: Nâng lên Gemini paid tier hoặc dùng API key khác khi test nặng.

---

### 1.1 Cập nhật phiên 2026-06-15 & 2026-06-16 — Hoàn tất Native OMML Export, Fix Markdown & Lập Workflow Mới
- **Quản trị rủi ro & Workflow Agent**:
  - Đã thêm Superpower Skill mới tại `.agents/skills/strict-approval-workflow/SKILL.md`.
  - **Quy tắc mới bắt buộc**: Mọi Agent trước khi code sửa lỗi/thêm tính năng phải phân tích 4 yếu tố (Rủi ro, Ảnh hưởng chéo, Ưu điểm, Nhược điểm) và **CHỜ** user phê duyệt bằng "magic word" (vd: "code đi") mới được phép viết code.
- **Nâng cấp Kiến trúc Export Word (Native OMML)**:
  - Loại bỏ hoàn toàn cơ chế cạo HTML/DOM cũ kỹ gây vỡ công thức Toán, giải quyết dứt điểm lỗi file Word rỗng khi không mở tab Preview.
  - Tích hợp thành công lõi render Word Native OMML (`renderWordCore.ts` sử dụng `mathml2omml` và `katex`) từ repo `edu-lesson-automation`.
  - Các tệp xuất Word giờ đây biến đổi trực tiếp Markdown/LaTeX thành Equation chuẩn của Microsoft Word (cho phép giáo viên chỉnh sửa số liệu, phương trình 100%).
- **Chuyển đổi hoàn toàn kiến trúc Export sang Local-first**:
  - Loại bỏ sử dụng API Server (`exportLessonViaAPI`) cho xuất Word/PDF, giải quyết triệt để lỗi Timeout 502/504 với giáo án dài (như mẫu Claude).
  - In PDF tại trình duyệt (`window.print()`) kèm clone thẻ DOM, xử lý `@media print` CSS cô lập nội dung, bảng PDF tỷ lệ vàng 3-3-4.
- **Xử lý Crash và Nâng cấp PPTX**:
  - **Xóa mã độc:** Xóa triệt để các thuộc tính `anim: { type: 'fade' }` không hợp lệ gây crash tiến trình `pptxgenjs`. Dọn dẹp dead code `renderFormulaToBase64`.
  - **Prompt Mới:** Cải tiến Prompt AI để tự động tách bảng 3 cột của giáo án, đưa hoạt động GV/HS xuống mục "Speaker Notes".
  - **Regression:** Bổ sung tham số kích thước `w, h` vào thuộc tính `addImage` trong `exportUtils.ts` để sửa lỗi Type Regression. Sửa lỗi thiếu field `cognitiveLevel` trong interface `ExamQuestion`.
- **Ổn định hệ thống sinh Bài học phân hoá (Adaptive Lesson)**:
  - **Regex cạo rác JSON**: Viết hàm bóc tách an toàn để loại bỏ các thẻ Markdown dư thừa (```json) trước khi `JSON.parse` trong các luồng `useLessonCreator`, `adaptiveFromLessonPlan`, và `personalizationEngine`, chống nổ Crash triệt để.
  - **Nới lỏng Schema (Fault-tolerance)**: Hạ cấp toàn bộ các rule Validation khắt khe (phải có đúng 5 câu pre-test, 3 mục tiêu...) từ `error` xuống `warning` trong `validateAdaptiveContentJson`. Từ nay hệ thống sẽ tận dụng kết quả AI và không còn "chặn đứng" toàn bộ bài học khi thiếu vài trường phụ.
- **Vá lỗi Hiển thị Markdown & Image Rendering (Hotfix)**:
  - Cập nhật hàm `cleanMarkdownOutput` để tự động chèn dòng trống trước bảng, cứu sống các giao diện bảng Markdown bị AI sinh thiếu dòng trống.
  - Tích hợp `krokiRender.ts` vào `renderWordCore.ts` để rasterize tự động các khối TikZ, Mermaid và thẻ `<svg>` thành ảnh PNG (`ImageRun`) khi xuất file `.docx`. Việc xuất Word không còn bị in ra mã code thô của sơ đồ nữa. Placeholder chỉ hiển thị khi có sự cố lấy ảnh.
  - Sửa lỗi sập giao diện (regression) từng khiến mã TikZ bị tuột ra ngoài bảng. Mọi đoạn code TikZ nay được gộp đúng vào trong ô của bảng bằng `<br/>`.
- **Nâng cấp Hệ thống Phiếu học tập & Bài tập về nhà (Worksheets)**:
  - **Sửa lỗi định dạng & thiết kế**: Đã loại bỏ hoàn toàn tính năng xuất phiếu học tập sang `.doc` (HTML cũ gây vỡ công thức Toán). Cả 2 loại phiếu (Tại lớp & Về nhà) nay đều xuất thẳng ra chuẩn `.docx` (dùng `exportToWordA4`) đảm bảo công thức Toán OMML hiển thị sắc nét.
  - **Prompt AI sư phạm chuẩn 2025**:
    - *Phiếu tại lớp*: Bắt buộc phân rã nội dung bài tập thành bảng 2 cột phân hóa (Cột A: Scaffolding có gợi ý từng bước; Cột B: Bỏ trống hoàn toàn cho học sinh tự bơi). Kèm theo khung WALT/WILF, khoảng trống dài `...............` để điền tay, và Vé ra cửa.
    - *Bài tập về nhà*: Bắt buộc xuất theo đúng ma trận 2025 (Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận), kèm FAQ, lỗi sai thường gặp, đáp án chi tiết.
  - **Cập nhật UI Soạn thảo & Thư viện**: Đã loại bỏ nút "Hướng dẫn ôn tập" cũ và thay bằng 2 nút tách biệt "Tạo Phiếu học tập" và "Tạo Bài tập về nhà" trên thanh `CreatorToolbar` và màn hình `ViewPlanModal`.
- Các thay đổi này đã được test qua (`npm run test` 58/58) và chuẩn bị merge lên `main` thành công.

### 1.1 Kết luận nhanh
- Đã giải quyết toàn bộ 8/8 lỗi Export URGENT do người dùng báo cáo (PPTX, DOCX, PDF, Bài học phân hoá).
- Đặc biệt, DOCX đã hỗ trợ xuất Image thay vì mã code thô đối với các khối đồ họa TikZ/Mermaid/SVG.
- Hệ thống Export nay cực kỳ ổn định, an toàn và nhanh gọn (hoàn toàn chạy offline trên máy khách).
- Clone Template / Markdown Skeleton đã hoàn tất qua **Phase 2A → 2E**.
- Từ Phase 3A trở đi vẫn là **kế hoạch chưa code**.

### 1.2 Quy ước phối hợp
- Cline/code agent: audit code thật → code lát cắt nhỏ → chạy build/test → cập nhật HANDOFF → commit/push khi người dùng yêu cầu.
- Quy ước workflow mới từ người dùng: sau khi đã code/sửa ở local và cần đưa thay đổi lên repo, ưu tiên cập nhật trực tiếp lên `main`/merge vào `main` luôn; không giữ thay đổi ở nhánh phụ/PR lâu nếu người dùng không yêu cầu review riêng.
- Anti/Antigravity: QA độc lập/manual review. Không tự coi QA thủ công là xong nếu chưa có report Anti.
- Scope hiện tại chỉ cam kết **Markdown Skeleton**: heading / bảng / placeholder. Không hứa giữ 100% layout DOCX như font, margin, header/footer/logo.
- Draft/save trong quá trình AI sinh nên dùng soft validation. Export/final-save dùng confirm/hard warning; chỉ hard-block khi nội dung rỗng hoặc cấu trúc hỏng tới mức không export được.

---

## 2. Các phase Skeleton đã hoàn tất

### 2.1 Phase 2A — Clone Template / Skeleton MVP
**Mục tiêu**: lấy cấu trúc mẫu ở mức heading / bảng / placeholder và đưa vào prompt AI.

**Đã làm**:
- Thêm `src/lib/documentSkeleton.ts` với parser HTML/Markdown/text cho heading, bảng, placeholder.
- Mở rộng `TemplateFile.skeleton` trong `src/types.ts`, backward-compatible với template cũ.
- `src/utils/fileUtils.ts`: upload `sample`, `lesson_doc`, `test`, `matrix` tự sinh skeleton khi có text.
- `TemplatesTab.tsx` và `TestingTab.tsx`: preview skeleton MVP.
- `useLessonCreator.ts` và `examUtils.ts`: inject `MARKDOWN SKELETON BẮT BUỘC GIỮ` vào prompt.
- Soft validator sau khi AI sinh giáo án/đề.

**QA Anti**: PASS static review, build/typecheck, prompt integration, UI localhost, backward compatibility.

### 2.2 Phase 2B — Reliability & UX Hardening
**Mục tiêu**: tăng độ tin cậy validator và hiển thị rõ cho user.

**Đã làm**:
- Sửa đếm bảng từ đếm dòng có `|` sang nhận diện **cụm bảng liền kề** (`countMarkdownTableClusters`).
- `validateMarkdownAgainstSkeleton` trả về issue có cấu trúc: `level`, `type`, `message`.
- Có validation score 0.0–1.0.
- UI hiển thị issue theo badge/màu; preview read-only rõ hơn.
- Thêm `src/lib/documentSkeleton.test.ts` cover table cluster, structured issues, empty output, guardrail cases.

**Verification gần nhất**: unit tests, build, typecheck/lint, local/prod smoke và Puppeteer e2e đều PASS theo báo cáo phiên 2026-06-11.

### 2.3 Phase 2C — Manual Skeleton Editor
**Đã làm**:
- Thêm `recalculateSkeletonFromMarkdown` để parse lại skeleton sau khi giáo viên sửa markdown.
- Thêm handler state `updateTemplateFileSkeleton` trong `useAppState.ts`, truyền qua `App.tsx` xuống `TemplatesTab.tsx`.
- `TemplatesTab.tsx`: textarea edit skeleton, nút Lưu / Hủy / Khôi phục tự động.
- `TestingTab.tsx`: checkbox dismiss warning, reset sau mỗi lần sinh kết quả mới.
- Build PASS.

### 2.4 Phase 2D — Export / Final Save Guardrails
**Đã làm**:
- Thêm `getSkeletonGuardrailDecision` trong `documentSkeleton.ts`.
- Luồng quyết định: error → block; warning → confirm; draft → soft.
- `CreatorTab.tsx`: guardrail cho xuất PDF / Word / LaTeX.
- `TestingTab.tsx`: guardrail cho lưu Thư viện / tải PDF / xuất Word / xuất LaTeX.
- `guardrailUtils.ts` hỗ trợ xác nhận bằng SweetAlert2.
- Build/test PASS.

### 2.5 Phase 2E — RAG / Worksheet từ PDF-DOCX & Context Budget
**Đã làm**:
- Thêm `src/lib/contextBudget.ts` với `truncateToContextBudget(text, maxLength)` mặc định khoảng 30.000 ký tự.
- `useLessonCreator.ts`: cắt gọn `lessonDocs`, `distContent`; toast cảnh báo nếu bị cắt; prompt tách `<format_skeleton>` và `<reference_context>`.
- `examUtils.ts`: cắt gọn requirement dài và `testContent` trong audit mode.
- Build/test PASS.

---

## 3. File/code quan trọng cần biết

### Skeleton / template / guardrail
- `src/lib/documentSkeleton.ts`: parser, validator, scoring, table cluster, guardrail decision, recalc skeleton.
- `src/lib/documentSkeleton.test.ts`: unit/regression tests cho skeleton.
- `src/lib/contextBudget.ts`: cắt gọn context dài.
- `src/types.ts`: `TemplateFile.skeleton` và các type liên quan.
- `src/utils/fileUtils.ts`: đọc file upload và sinh skeleton.
- `src/utils/examUtils.ts`: prompt/validate đề thi.
- `src/utils/exportUtils.ts`, `src/utils/guardrailUtils.ts`: export và confirm guardrail.
- `src/hooks/useLessonCreator.ts`: prompt giáo án, validation, context budget.
- `src/hooks/useAppState.ts`: cập nhật skeleton vào state/Firestore.
- `src/components/tabs/TemplatesTab.tsx`: preview + manual editor skeleton.
- `src/components/tabs/TestingTab.tsx`: upload đề/matrix, skeleton warnings, dismiss, export guardrails.
- `src/components/tabs/CreatorTab.tsx`: export guardrails cho giáo án.

### Adaptive learning / student portal
- `src/pages/AdaptiveLessonBuilderPage.tsx`
- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/lib/adaptive/*`
- `src/lib/dewey/*`
- `firestore.rules`

### Export/renderer/AI provider
- `api/render-word-core.ts`
- `src/utils/wordExportA4.ts`
- `src/utils/examWordExport.ts`
- `src/lib/gemini.ts`
- `api/gemini-relay.ts`
- `src/lib/aiProviders.ts`

### QA docs/tools
- `QA_TESTING_PROTOCOL.md`
- `.agents/skills/qa-testing/SKILL.md`
- `live_dom_test.js`

---

## 4. Verification commands nên chạy

```bash
npm run test
npm run build
npm run lint
npm run test:e2e
```

Ghi chú:
- `npm run lint` trong repo hiện chạy TypeScript typecheck (`tsc --noEmit`).
- `test:e2e` dùng Puppeteer và cần dev/prod target sẵn sàng tuỳ cấu hình script.
- Vite chunk-size warning là warning cũ, không phải blocker nếu build exit code 0.

---

## 5. Roadmap tiếp theo

### 5.1 Phase 3A — Dynamic Simulation/Game HTML Sandbox (chưa code)
**Chỉ bắt đầu khi Skeleton/RAG đã ổn định.**

Yêu cầu an toàn bắt buộc:
- HTML/JS do AI sinh phải chạy trong `<iframe sandbox="allow-scripts">`.
- Không dùng `allow-same-origin` nếu không có lý do rất rõ.
- CSP nghiêm ngặt; không cho AI truy cập localStorage/sessionStorage/API hệ thống.
- Không chèn HTML/JS AI sinh trực tiếp vào DOM app chính.

Đề xuất lát cắt MVP:
1. Tạo renderer sandbox độc lập cho simulation HTML.
2. Thêm sanitizer/allowlist tối thiểu.
3. Test XSS regression.
4. Chỉ sau đó mới tích hợp vào lesson builder/student portal.

### 5.2 Phase 3B — SlideJ/PPTX, Handwriting, Offline/SCORM (chưa code)
Rủi ro chính:
- SCORM cần manifest XML chuẩn và test trên Moodle/Canvas trước rollout.
- PPTX/SlideJ cần xác định rõ renderer/export library, tránh phụ thuộc layout DOCX.
- Handwriting/OCR cần budget token/file-size và chính sách lưu dữ liệu học sinh.

---

## 6. Nợ kỹ thuật / rủi ro còn cần chú ý

- DOCX fidelity cao vẫn chưa thuộc scope Skeleton: header/footer/logo/font/margin có thể lệch.
- Build warning chunk lớn vẫn tồn tại; nên tối ưu sau khi các flow chính ổn định.
- Firestore rules/localStorage fallback không thay thế được backend security đầy đủ cho dữ liệu nhạy cảm.
- File upload TestingTab lịch sử có giới hạn ở một số luồng; cần QA bằng tài liệu thật.
- Export Word/PDF với SVG/LaTeX/native equation vẫn có các giới hạn cũ, xem test regression liên quan `wordExportA4` và exam export.

---

## 7. Production/Vercel checklist khi có lỗi

- Domain đúng: `https://giaoandewey.vercel.app`.
- Nếu API save lỗi:
  - GET trả 405: bình thường nếu route chỉ nhận POST.
  - POST 400: kiểm tra payload thiếu field.
  - POST 403: kiểm tra quyền/classCode/session.
  - POST 404: kiểm tra route Vercel/root directory.
  - POST 500: kiểm tra env vars Firebase Admin và logs Vercel.
- Vercel cần đúng Root Directory, env vars Firebase, Git settings và deployment mới nhất.

---

## 8. Lịch sử nén các mốc lớn trước Skeleton

- 2026-06-10: đánh giá chiến lược tích hợp — nên ưu tiên ổn định Skeleton trước game/simulation/SlideJ/offline.
- 2026-06-10: hoàn thiện Phase 2, tích hợp NVIDIA NIM và tối ưu performance.
- 2026-06-09: xử lý nợ kỹ thuật, cập nhật UI Phase 2 và dữ liệu thật cho lớp học.
- 2026-06-08: server-side Word/PDF export, visual aids, custom API, progress bar AI, UI/UX theo Google Stitch + Smart Matrix/AI Co-pilot.
- 2026-06-04: export giáo án Word/PDF theo “Mẫu claude”.
- 2026-05-30/28/27: hotfix QA cổng học tập phân hoá, batch fixes, GitHub Actions typecheck/dependencies, Firebase undefined, kiến trúc Hybrid PA2+PA1+PA3.
- 2026-05-25: refactor “Soạn đề kiểm tra”: DOCX import giữ ảnh/base64, Word `.docx` thật, UI A4, SVG prompt, PDF/print tối ưu.
- 2026-05-20: P0/P1/P2/P3 QA fixes, retest regression fixes và direct testing fixes.
- 2026-05-14: e2e production cho cổng học sinh, xác minh API save/progress và cấu hình Vercel.

---

## 9. Prompt ngắn cho agent tiếp theo

```text
Đọc HANDOFF.md trước. Trạng thái hiện tại:
- Pipeline soạn giáo án đã ổn định: Planning → Content → Format (3 bước). KHÔNG thêm Critic/Fix mà không test kỹ. KHÔNG áp Delegation/model-rẻ cho Planning/Content (đã revert).
- Build & typecheck PASS, 0 lỗi TypeScript. 3 lỗi TS cũ đã fix ở commit 5e2fa49 — đừng fix lại.
- Text-to-Slide vừa thêm (working tree, chưa commit) — CẦN test runtime bằng Gemini paid key trước khi tin tưởng.
- AI Grading ĐÃ CÓ SẴN (GradingTab.tsx + gradingUtils.ts) — đừng tạo mới.
- GeoGebra cần HTML Sandbox (Phase 3A) làm trước — chưa code.
- Gemini free tier hay bị 429 khi test nặng — dùng paid key.
- Phase 2A–2E Skeleton đã hoàn tất; Phase 3A trở đi chưa code.
QUAN TRỌNG: audit code thật trước khi tin HANDOFF/plan — tài liệu có thể drift. Xác minh file/dòng còn tồn tại trước khi sửa.
Quy tắc: code lát cắt nhỏ, chạy npm run build, cập nhật HANDOFF, commit/push khi người dùng yêu cầu. KHÔNG bao giờ xóa onStreamChunk khỏi ContentAgent.
```
