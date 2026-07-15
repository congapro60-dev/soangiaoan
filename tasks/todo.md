# Task Board

> Created per session. Checked off as completed.

---

## PLAN CHỜ DUYỆT: Đề kiểm tra đẹp + Slide PPT chuẩn GV Toán — 2026-07-14

### A. Đề kiểm tra "form xấu" — chẩn đoán
1. KHUNG ĐỀ (Sở/Trường | Kỳ thi/Môn/Thời gian/Mã đề) phó mặc AI sinh markdown → mỗi lần một kiểu,
   không ra 2 khối trái-phải chuẩn công văn.
2. Word export (render-word-core): A/B/C/D chỉ xếp cột khi ≤52 ký tự & không có display math
   → câu dài thành 4 dòng rời; ĐÁP ÁN không tự sang trang; "--- HẾT ---" không căn giữa đặc biệt.
3. Preview MD A4 đã ổn — bệnh chính ở cấu trúc markdown + Word render.

### Kế hoạch A (chuẩn hoá ở tầng RENDER, không phó mặc AI)
- [ ] A1. Postprocessor "khung đề": nhận diện header block → bảng 2 cột không viền chuẩn MOET
      (Word + CSS preview); thiếu trường thì lấy từ form nhập nhanh (lưu settings)
- [ ] A2. render-word-core: option-grid cho phép inline math (OMML trong cell); nới ngưỡng 2 cột;
      đậm "Câu N."; chống ngắt trang giữa câu; ĐÁP ÁN pageBreakBefore trang mới; HẾT căn giữa
- [ ] A3. Siết prompt header trong examUtils.getGeneratePrompt (phối hợp, không thay thế render)
- [ ] A4. Golden test preprocessExamMarkdownForWord + nghiệm thu 1 đề thật

### B. Slide PPT ngắn/công thức lỗi — chẩn đoán
1. MỘT call sinh toàn bộ JSON → đụng trần output token → model tự rút còn 9-10 slide;
   prompt tự mâu thuẫn ("12–18 slides" nhưng quy tắc 6 ghi "Tối đa 15").
2. Prompt CẤM LaTeX (PPTX không render) → công thức thành text a/b, P(A|B) → ít + lỗi;
   toast "đang render công thức Toán" thực tế không render gì (downloadPPTX chỉ addText).
3. Không persona GV Toán, không bám cấu trúc 5 hoạt động giáo án.

### Kế hoạch B ✅ XONG (code + verify — chờ user nghiệm thu bằng key thật)
- [x] B1. Two-pass thật (exportUtils.ts): `buildSlideOutlinePrompt` (1 call, persona GV Toán,
      14-22 slide nội dung, ép worked example = 2 slide, luyện tập 3 mức 🌶️) → `runWithConcurrency`
      chạy `buildSlideSectionPrompt` cho từng section (concurrency 2) → merge; fallback
      `DEFAULT_SLIDE_OUTLINE` (5 hoạt động) nếu outline call lỗi/parse hỏng — không bao giờ tệ hơn cũ
- [x] B2. Công thức thật — CHỌN kỹ thuật SVG foreignObject + KaTeX MathML (tái dùng nguyên xi kỹ
      thuật đã chạy ổn định trong handwritingCanvas.ts) THAY VÌ html2canvas như plan gốc — không
      phụ thuộc font ngoài qua data URI (rủi ro không resolve được). `mathToImage.ts`:
      `renderLatexToPng` ($$ display), `extractDisplayFormulas`/`replaceInlineFormulasWithText`
      ($ inline → Unicode xấp xỉ, không hiện backslash thô). Ảnh công thức gộp vào `imageUrls`
      của ĐÚNG sub-slide sau khi chia Phần 1/2 (không lệch slide); panel ảnh chia đều chiều cao
      theo số ảnh (chống tràn khi có ≥2 ảnh/slide)
- [x] B3. SlidePreviewBoard: thêm khối xem trước KaTeX (ReactMarkdown+remarkMath+rehypeKatex,
      pattern đã dùng ở ChatTab) dưới mỗi textarea có công thức — giữ textarea editable nguyên bản
- [x] B4. CreatorTab: `slideGenStatus` state nhận onProgress từ generateSlideData, thay
      SimulatedProgress giả bằng "Đang soạn xong phần k/n: HĐ..." thật khi đang sinh slide
- [x] Prompt gỡ lệnh cấm LaTeX cũ, cho phép $.../​$$...$$ thật trong points (root cause #2)
- [x] Cập nhật generationPromptQuality.test.ts theo kiến trúc mới (test cũ assert '12–18 slides'
      literal đã lỗi thời)
- [x] Phát hiện phụ: vitest quét trùng thư mục `soangiaoan/` (bản sao cục bộ, .gitignore, KHÔNG
      track git) → thêm exclude vào vitest.config.ts, không rớt file thật nào (đối chiếu `vitest list`)
- [x] Verify: tsc 0 lỗi · 120/120 test PASS (mathToImage 8 test mới) · build PASS
- [x] Verify RUNTIME THẬT trong browser (không mock): `renderLatexToPng` tạo PNG hợp lệ
      (178×67px, data:image/png;base64...) VÀ xác nhận ảnh có nội dung thật (3919/86022 pixel
      không trắng khi render "x²+y²=r²") — bắt được lỗi "ảnh rỗng" mà unit test (jsdom, không
      Canvas/Image thật) không thể phát hiện
- [ ] CHƯA verify được: sinh slide đầy đủ bằng AI thật end-to-end (local dev không chạy
      /api/gemini-relay — chỉ có trên Vercel; các node MiniMax/Conduit của free-router bị chặn
      từ sandbox trình duyệt này) và mở file .pptx thật bằng PowerPoint (không có sẵn trong môi
      trường) → CẦN USER nghiệm thu: bấm "Tạo Slide" trên app thật (đã có key hoặc free-router),
      kiểm slide count 16-24, công thức hiện đúng, mở PPTX xem layout không vỡ

---

## Active Task: A1 — Tách đáp án + chấm server-side (chống xem đáp án DevTools) — 2026-07-14

- [x] api/exam-scoring-core.ts (computeAutoScoreCore + gradeSubmissionCore + stripAnswerKey) + 9 test
- [x] api/exam-admin-core.ts (khởi tạo Firebase Admin dùng chung)
- [x] api/exam-public.ts (GET code/examId → đề đã lược correctAnswer/explanation) + vercel.json
- [x] api/grade-exam.ts (POST submissionId → chấm bằng đáp án gốc, nhúng đáp án khi allowReview)
- [x] useExams: findPublicExamByCode/getPublicExamById/gradeExamSubmission + waitForAuth; gỡ findExamByCode chết
- [x] StudentExamPage: đọc đề qua API, nộp câu trả lời thô + chấm server (fail-safe: lỗi thì teacher-verify)
- [x] StudentResultPage + AnswerReviewPage: đọc đề đã lược, đáp án xem lại lấy từ bài nộp; StudentAnswer thêm correctAnswer/explanation
- [x] ExamConfig/TeacherGrading: waitForAuth trước getExamById (rules teacher-only)
- [x] firestore.rules: exams read teacher-only (rules get() nội bộ vẫn đọc được nên submission không hỏng)
- [x] tsc 0 lỗi · 170 test PASS · build PASS
- [x] Fix build Vercel: gộp thành 1 hàm api/exam.ts + helper _exam-core.ts (dưới giới hạn 12 function)
- [x] DEPLOY: Vercel ● Ready (94fd534) → smoke-test /api/exam GET+POST trả JSON 404 (admin creds OK,
      hàm chạy) → deploy rules teacher-only THÀNH CÔNG
- [x] A1 XONG — đề leak đáp án qua DevTools đã đóng ở gốc (rules teacher-only + API lược đáp án)
- Ghi chú: bài nộp CŨ (chấm client trước đây) không có đáp án nhúng → xem lại không tô đáp án đúng
  (chỉ mất highlight lịch sử, điểm vẫn đúng). Không cần migrate.
- CẦN USER nghiệm thu thật: tạo 1 đề → mở link học sinh làm → kiểm điểm hiện đúng + mở DevTools
  Network xem /api/exam KHÔNG có correctAnswer.

---

## Task cũ: Làm cứng hệ Thi online (vòng 2, phần 🔴) — 2026-07-14

Nguồn: `docs/BAOCAO_RASOAT_Vong2_va_DeXuat_NangCap_2026-07-14.md`. Phạm vi = giảm thiểu thực dụng
(client + rules + xác minh phía giáo viên). Chấm server-side + tách answer key = giai đoạn sau.

- [x] examScoring: `verifySubmissionScore` + 4 golden test (examScoring.verify.test.ts)
- [x] StudentExamPage: enforce startAt/endAt (intro + guard + trần thời gian làm theo endAt);
      maxAttempts chặn mức trình duyệt (localStorage `exam_attempts_<examId>`); sidebar tô "đã làm"
      đúng với câu Đ/S 4 ý; học sinh nộp luôn ở status 'submitted'
- [x] StudentResultPage: enforce showResultWhen ('never' ẩn hẳn; 'all_done' hiện khi quá endAt hoặc
      đã 'graded'); "chờ chấm tự luận" chỉ hiện khi đề có tự luận
- [x] ExamsTab reloadSubmissions: tự xác minh điểm mỗi lần giáo viên mở theo dõi — lệch thì tính lại
      từ đáp án gốc + toast cảnh báo; tự chuyển submitted→graded khi đủ điểm mọi câu
      (showToast giữ qua ref để tránh loop refetch)
- [x] AnswerEditModal: dùng verifySubmissionScore — sửa bug recalc làm mất aiScore tự luận
- [x] firestore.rules: học sinh không set được 'graded'; totalScore kẹp 0..maxScore — ĐÃ DEPLOY
- [x] tsc 0 lỗi · 161/161 test PASS (thêm 4) · build PASS · commit + push
- CÒN LẠI (giai đoạn sau, cần duyệt): chấm server-side + tách answer key khỏi doc exam
  (chặn xem đáp án qua DevTools) — thay đổi kiến trúc lớn

Ghi chú giới hạn (đã báo user): chống gian lận triệt để vẫn cần chấm server-side — đợt này là
giảm thiểu: học sinh sửa điểm sẽ bị phát hiện & tính lại ngay khi giáo viên mở trang theo dõi.

---

## Template (copy for each new task)

```
## [Task Name] — [Date]

### Plan
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

### Verification
- [ ] npm run build passes
- [ ] Feature works end-to-end
- [ ] Edge cases handled

### Result
_Summary after completion_
```

---

## Active Task: Fix lỗi rà soát toàn app — 2026-07-13 (nhánh fix/audit-rasoat-2026-07-13)

Nguồn: `docs/BAOCAO_RASOAT_Code_ToanBo_2026-07-13.md`. Phạm vi đợt 1 = 4 lỗi nghiêm trọng + 5 lỗi logic sửa nhỏ. Đợt 2 (nâng cấp) ghi cuối báo cáo.

### Nhóm A — Nghiêm trọng
- [x] A1: `useAppState.updateSettings` strip thêm `deepseekApiKey` khi ghi userSettings
- [x] A2: Persist Lớp học — classes vào local cache + đọc/ghi field `classes` trong doc `userSettings/<uid>` (rules sẵn có) + effect debounce sync, guard `cloudClassesReadyRef` chống ghi đè lúc mới login
- [x] A3: CreatorTab nút "Lưu tất cả" bulk gọi thẳng `saveBulkPlans` (guardrail content chỉ áp cho single)
- [x] A4: AdaptiveLearningTab — `isRenderableLesson` validate bài từ Firestore, thiếu dữ liệu thì giữ bản mẫu + báo lỗi; fallback `routes[1] || routes[0]`
### Nhóm B — Logic
- [x] B1: `deleteFile`/`updateTemplateFileSkeleton` tính `nextFiles` từ `data` TRƯỚC setData
- [x] B2: CreatorTab guardrail lấy skeleton từ `data.templates` (file sample) || lessonDocs — thay 4 chỗ
- [x] B4: AdaptiveLearningTab — `lessonId: lessonToSave.id`; confirm trước "Khôi phục mẫu"; catch health-check
- [x] B5: TestingTab — try/catch localStorage; truncate audit qua `truncateToContextBudget` (KHÔNG truncate shuffle vì sẽ mất câu hỏi); xoá dòng removeItem lặp
- [x] B6: GradingTab — `createdAt` ổn định qua `draftCreatedAtRef`
- [x] Quick: AIToolsTab check `result` null trước `.trim()`
### Verification
- [x] `npx tsc --noEmit` 0 lỗi · `npm run test` 153/153 PASS · `npm run build` PASS
- [x] E2E preview: tạo lớp "Lớp 10A9 Test" → F5 → lớp vẫn còn (trước fix là mất) · console không lỗi mới
- [x] Commit trên nhánh `fix/audit-rasoat-2026-07-13` — KHÔNG push main khi chưa có lệnh
### Đợt 2A — Nâng cấp ✅ XONG (commit 0b54479)
- [x] Thi online đa provider: parseMarkdownToOnlineExam(settings) route qua callAI, giữ Gemini JSON-mode khi có key; banner dùng getActiveApiKey
- [x] AI Tutor: lưu hội thoại localStorage (60 tin) + auto-scroll + nút "Xóa hội thoại" thật; gỡ nút lịch sử/tùy chọn/đính kèm chết
- [x] ClassesTab: Giao bài/Báo cáo/3 chấm → disabled + tooltip "đang phát triển"
- [x] ExamsTab: bỏ avatar giả + progress bar vô nghĩa; AIToolsTab: nút Cài đặt mở Settings modal thật
- [x] Verify: tsc 0 lỗi · 153/153 test · build PASS · preview kiểm tab AI Tutor OK

### Đợt 2B ✅ XONG
- [x] Adaptive nhiều bài học: KHÔNG cần làm — tab 'adaptiveLessons' đã dùng AdaptiveLessonListPage + Builder embedded (App.tsx:398-427); AdaptiveLearningTab chỉ còn là màn thống kê người học (đã vá crash ở A4)
- [x] Demo login → signInAnonymously (token thật, rules cho ghi) + fallback mock user kèm cảnh báo khi Anonymous chưa bật trong Firebase Console
- [x] "Giao bài" thật: chọn đề từ useExams → lưu ClassAssignment vào class (types.ts) → copy link thi, cảnh báo nếu đề chưa phát hành; persist qua sync classes sẵn có
- [x] "Báo cáo" thật: gom submissions các đề đã giao, lọc theo tên lớp HS nhập khi thi, bảng nộp/điểm TB trong Swal
- [x] Xoá code chết useApiUsage.ts + ApiUsagePanel.tsx (không ai import, trackUsage không bao giờ được gọi) — hệ usage còn lại duy nhất useTokenTracker
- [x] Verify: tsc 0 lỗi · 153/153 test · build PASS · preview: demo fallback toast đúng, Giao bài/Báo cáo hiện đúng dialog trạng thái rỗng
- LƯU Ý USER: bật Anonymous trong Firebase Console → Authentication → Sign-in method để chế độ dùng thử lưu được dữ liệu thật

### Đợt 3 — Hoãn có chủ đích (chưa làm)
- [ ] rehype-sanitize thay rehypeRaw: rủi ro vỡ `<br/>` trong bảng + HTML KaTeX — cần test render riêng
- [ ] AbortSignal xuyên xuống aiProviders (mọi provider) để nút hủy dừng request đang bay — refactor lớn
- [ ] Code-split: 2 chunk >1MB đều đã lazy-load (pdf-export, export-utils) nên giá trị thấp
- [ ] Tiến độ streaming thật thay SimulatedProgress

---

## Task cũ: Loại giáo án "Giáo án ban Toán" (KHDH v13) — 2026-07-09 ✅ Pha 1+2 XONG (nhánh feat/toan-lesson-type, chờ lệnh push)

Plan đã duyệt: `C:\Users\ADMIN\.claude\plans\pure-meandering-cloud.md`. Chi tiết: HANDOFF mục 1.0j.
- [x] Pha 1: builtinFormat 'toan' + sub-picker 3 kế hoạch + prompts (src/prompts/toanFormats.ts) + persist — 9 test hợp đồng
- [x] Pha 2: styleProfile 'toan' trong renderWordCore (banner màu, bảng 3 cột 11/54/35%, nhãn [NHÃN] xanh) + toanStyleRules.ts — 6 test golden+regression
- [x] Verify: tsc 0 lỗi · 147/147 test · build PASS · preview demo OK
- [ ] User nghiệm thu bằng key AI thật (3 kế hoạch → xuất Word mở kiểm)
- [ ] TODO: mirror api/render-word-core.ts (bot-push) · Pha 3 phiếu học tập · bulk mode

---

## Task cũ: Fix QA đợt 9 (BAOCAO_QA_BaiHocPhanHoa_2026-07-07.md) — 2026-07-07 ✅ HOÀN TẤT (đã push main)

Nhánh: `fix/qa-dot9-conic`. Sửa TẬN GỐC theo Phần D của báo cáo (không vá riêng bài Conic).

### Nhóm 1 — D1: Module mathText (fix F1, F2, một phần F9)
- [x] Tạo `src/lib/adaptive/mathText.ts`: tokenizeMath (vùng math/text, vá `$` lẻ), transforms chạy trên token, assertClean, sanitizeDisplayText, toPlainText (heading builder)
- [x] Tạo `src/lib/adaptive/mathText.test.ts` với golden strings từ báo cáo (15 test)
- [x] Rewire `adaptiveToDewey.ts`: giữ tên hàm, đổi ruột — không đổi call site; xoá regex cũ
- [x] Portal React (`MathText`/`MathBlock`) sanitize trước ensureMathWrapped — đường render pretest F1 thật
- [x] Verify: `npm run test` PASS

### Nhóm 2 — D2: localStorage theo học sinh (fix F3, F4, F13)
- [x] `adaptiveEngine.ts`: key `dewey-notebook-v3-<lessonId>-<studentCode>`
- [x] Truyền studentCode: portal → `renderDeweyLesson` → `renderHtmlShell` → `getAdaptiveEngineScript`
- [x] F4: xác nhận chuỗi "Olympia" đã hết trong code (ghost storage) — không cần sửa thêm

### Nhóm 3 — Lỗi nhỏ render/UX
- [x] F5: fallback pack label → "Nhận biết/Thông hiểu/Vận dụng"
- [x] F12: TOC đánh số liên tục (kể cả Luyện tập/Vận dụng/Tổng kết)
- [x] F7 (D4): `navTo` cập nhật `#final-score` khi vào screen-summary
- [x] F6 (D5): wheel-rescue listener + bỏ `scroll-behavior:smooth` (không thêm overscroll-contain — giữ chain tự nhiên)
- [x] F9: builder heading dùng mathText.toPlainText

### Nhóm 4 — D6: pipeline minh bạch lỗi (F8, F10, F11)
- [x] `visual_cards_failed` ghi rõ nguyên nhân (message + nhận diện 429)
- [x] Lỗi relay personalization throw kèm body response (soi được 429 vs env var)
- [x] TikZ: validate qua Kroki lúc sinh + retry 1 lần kèm lỗi Kroki cho AI sửa (`checkTikzWithKroki` — chuyển `buildTikzKrokiUrl` sang `krokiRender.ts` thuần)

### Nhóm 5 — D1#4: sạch từ nguồn
- [x] `repairMathDeep` cuối `runAdaptivePipeline` (bỏ qua HTML/URL/TikZ/id)

### Verification
- [x] `npx tsc --noEmit` 0 lỗi + `npm run test` 131/131 PASS + `npm run build` PASS
- [x] Script render hậu kiểm (D7#4): 11/11 PASS
- [x] Cập nhật `tasks/adaptive_qa_bugs.md` (mục ĐỢT 9), HANDOFF.md (1.0i), `tasks/lessons.md` (5 quy tắc D7)
- [x] KHÔNG push main khi chưa có lệnh — đang ở nhánh `fix/qa-dot9-conic`

### Result
12/13 lỗi xử lý xong bằng 6 fix kiến trúc (D1–D6) + 2 quy trình (golden tests, repair-at-source). Còn lại cần NGƯỜI: F6/F13/F3 retest thủ công sau deploy; E9 Phần 2 + E10 nghiệm thu cần user tạo BÀI MỚI; quota Gemini 429 là vận hành (nâng billing key).

### Ghi chú
- F8/F10 phần quota 429 là VẬN HÀNH (nâng billing) — ngoài phạm vi code
- F13 (E5) retest thủ công sau khi F3 deploy; E9/E10 cần user TẠO BÀI MỚI

---

## Task cũ: Nối hình ảnh & mô phỏng vào bài Dewey ("bài toàn chữ") — 2026-06-22

Nguồn: `docs/BAOCAO_DoiChieu_App_vs_Gemini.md` + báo cáo Gemini. Gốc bệnh: hình/mô phỏng
sống ở đường render B (cổng React) nhưng bài học chính render ở đường A (Dewey HTML iframe);
template Dewey bỏ qua các slot `illustrationHtml`/`simulationHtml`/`engage.illustration`.
Phạm vi đã chốt: **cả 3 Phase**, tikzCode **render qua Kroki**.

### Phase 1 — Vá hiển thị (rủi ro thấp)
- [x] `template.ts` `renderSocraticStep`: render `step.illustrationHtml` (raw) dưới prompt
- [x] `template.ts` `renderKnowledgeUnit`: render `unit.simulationHtml` thành iframe sandbox (`renderUnitSimulation`)
- [x] `template.ts` `renderEngageIllustration`: gallery chạy sẵn qua nhánh non-image (data thô)
- [x] `htmlShell.ts`: CSS cho `.vc-gallery` + `.unit-simulation` + `.step-illustration`
- [x] `adaptiveToDewey.ts`: map `engage.visualCards` → `engage.illustration` (gallery)
- [x] `adaptiveToDewey.ts`: map `unit.simulationSpec.html?.srcDoc` → `unit.simulationHtml`
- [x] `adaptiveToDewey.ts`: tham số optional `assets` (map theo unitId) cho HTML Firestore
- [x] `AdaptiveStudentPortalPage.tsx`: `loadDeweyAssets` pre-fetch Firestore sim HTML → truyền `assets`
- [x] `npm run build` 0 lỗi

### Phase 2 — Khôi phục sinh mô phỏng tương tác (Gemini-style)
- [x] system prompt cứng: cấm `<img>`/`<image>` URL ngoài trong visual cards
- [x] call chuyên dụng `buildUnitSimulationPrompt` xuất HTML thô → `sanitizeGeneratedSimulationHtml` → `unit.simulationSpec` (htmlMiniApp); có cờ `options.generateSimulations`
- [x] geometry3d giữ đường React (bỏ qua sinh sim HTML cho unit 3D)
- [x] `npm run build` 0 lỗi

### Phase 3 — tikzCode (Kroki) + QA
- [x] tikzCode → `buildTikzKrokiUrl` (URL Kroki `tikz/svg`) → `<img>` trong `illustrationHtml`
- [x] TC4–TC8 vào `docs/features/07-adaptive-learning.md`
- [x] `npm run build` 0 lỗi

### Result
- 3 chỗ rò rỉ đã nối: visualCards→engage gallery; simulationSpec/Firestore→unit iframe; tikz→Kroki img.
- Pipeline sinh thêm mô phỏng tương tác vanilla-JS (call HTML thô, fault-isolated, cờ tắt được).
- Template Dewey nay render `illustrationHtml` + `simulationHtml` (trước đây bỏ qua dù type có sẵn).
- Build sạch 0 lỗi TS qua cả 3 lần kiểm. Cần nghiệm thu chạy thật 1 bài để xác nhận trực quan.

---


## Completed Sessions

### Puppeteer E2E Live DOM Test — 2026-05-27

- [x] Task 1: Install Puppeteer Dependency
- [x] Task 2: Create E2E Test Script `live_dom_test.js`
- [x] Task 3: Configure E2E script in `package.json`
- [x] Task 4: Run E2E Test and Verify Browser Launches
- [x] **Verification**: E2E test runs successfully against Production Vercel using `domcontentloaded` wait strategy. Safely clicks "Chế độ dùng thử", enters Dashboard, and performs sidebar navigation flow.

### QA Audit + Bug Fixes — 2026-04-21

- [x] Full codebase QA audit (18 issues found)
- [x] BUG-001: Firebase session persistence fix
- [x] BUG-002: persistSession try/catch
- [x] BUG-003: Remove console.log from gemini.ts
- [x] BUG-004: File upload size limit (20MB)
- [x] BUG-005: Bulk generation cancel button
- [x] BUG-006: API key banner shows active provider
- [x] BUG-007: Empty states in LibraryTab
- [x] BUG-008: handleRename syncs to Firestore

### Grading AI Improvements — 2026-04-21

- [x] Inline student name editing (double-click)
- [x] Custom max score input
- [x] ETA countdown during batch grading
- [x] Weakness aggregation panel (GradingWeaknessPanel)
- [x] Per-student print/PDF report

### Superpowers + CLAUDE.md Setup — 2026-04-21

- [x] Install obra/superpowers (14 skills)
- [x] Create CLAUDE.md with Anthropic internal workflow
- [x] Create tasks/lessons.md with current learned patterns
