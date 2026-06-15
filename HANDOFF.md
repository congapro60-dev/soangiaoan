# HANDOFF — Soạn giáo án / học phân hoá

**Cập nhật gần nhất**: 2026-06-11  
**Repo**: `soangiaoan` — `https://github.com/congapro60-dev/soangiaoan`  
**Branch chuẩn**: `main`  
**Production URL để QA UI**: `https://giaoandewey.vercel.app`  
**Mục đích**: file handoff ngắn gọn cho Cline / Claude Code / Antigravity / kỹ sư tiếp theo. Chi tiết lịch sử cũ đã được nén; nếu cần truy vết đầy đủ hãy dùng `git log`, `git show`, các test report, hoặc lịch sử commit.

---

## 1. Trạng thái hiện tại

### 1.0 Cập nhật phiên 2026-06-15 & 2026-06-16 — Hoàn tất Native OMML Export & Ổn định Adaptive Lesson
- **Nâng cấp Kiến trúc Export Word (Native OMML)**:
  - Loại bỏ hoàn toàn cơ chế cạo HTML/DOM cũ kỹ gây vỡ công thức Toán.
  - Tích hợp thành công lõi render Word Native OMML (`renderWordCore.ts` sử dụng `mathml2omml` và `katex`) từ repo `edu-lesson-automation`.
  - Các tệp xuất Word giờ đây biến đổi trực tiếp Markdown/LaTeX thành Equation chuẩn của Microsoft Word (cho phép giáo viên chỉnh sửa số liệu, phương trình 100%).
- **Chuyển đổi hoàn toàn kiến trúc Export sang Local-first**:
  - Loại bỏ sử dụng API Server (`exportLessonViaAPI`) cho xuất Word/PDF, giải quyết triệt để lỗi Timeout 502/504.
  - In PDF tại trình duyệt (`window.print()`) kèm clone thẻ DOM, xử lý `@media print` CSS cô lập nội dung, bảng PDF tỷ lệ vàng 3-3-4.
- **Xử lý Crash và Nâng cấp PPTX**:
  - Cải tiến Prompt AI để tự động tách bảng 3 cột của giáo án, đưa hoạt động GV/HS xuống mục "Speaker Notes".
  - Bổ sung tham số kích thước `w, h` vào thuộc tính `addImage` trong `exportUtils.ts` để sửa lỗi Type Regression.
  - Sửa lỗi thiếu field `cognitiveLevel` trong interface `ExamQuestion` (types.ts).
- **Ổn định hệ thống sinh Bài học phân hoá (Adaptive Lesson)**:
  - **Regex cạo rác JSON**: Viết hàm bóc tách an toàn để loại bỏ các thẻ Markdown dư thừa (```json) trước khi `JSON.parse` trong các luồng `useLessonCreator`, `adaptiveFromLessonPlan`, và `personalizationEngine`, chống nổ Crash triệt để.
  - **Nới lỏng Schema (Fault-tolerance)**: Hạ cấp toàn bộ các rule Validation khắt khe (phải có đúng 5 câu pre-test, 3 mục tiêu...) từ `error` xuống `warning` trong `validateAdaptiveContentJson`. Từ nay hệ thống sẽ tận dụng kết quả AI và không còn "chặn đứng" toàn bộ bài học khi thiếu vài trường phụ.
- Các thay đổi này đã được test qua (`npm run test` 58/58) và commit thẳng lên `main` thành công.

### 1.1 Kết luận nhanh
- Đã giải quyết toàn bộ 8/8 lỗi Export URGENT do người dùng báo cáo (PPTX, DOCX, PDF, Bài học phân hoá).
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
Đọc HANDOFF.md trước. Trạng thái hiện tại: Phase 2A–2E của Clone Template / Markdown Skeleton đã hoàn tất; Phase 3A trở đi chưa code. Nếu làm tiếp, audit code thật trước, code lát cắt nhỏ, chạy npm run test/build/lint, cập nhật HANDOFF, rồi mới commit/push khi người dùng yêu cầu. Không mở rộng sang game/simulation/SCORM nếu chưa xử lý sandbox/security tương ứng.
```
