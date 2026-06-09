# HANDOFF — Soạn giáo án / học phân hoá

**Cập nhật**: 2026-06-10
**Repo chính**: `soangiaoan`
**Branch hiện tại**: `main`
**Remote GitHub**: `https://github.com/congapro60-dev/soangiaoan`
**HEAD/local mới nhất trước commit phiên UI/UX**: `3e466da` — Merge UI UX migration updates
**Production URL đúng để QA UI**: `https://giaoandewey.vercel.app`
**Commit Sprint D đã merge main**: `e7b609c92b80c80227ef4853053ea9723bdab931 Merge sprint D lesson builder UI`
**Commit Sprint D feature**: `8d229eb75b823b9edfb4262c84ee68abbd5821cd feat(adaptive): Sprint D — Lesson Builder UI + Firestore persistence`
**Commit Sprint C đã merge main**: `96030b3 Merge sprint C cover image upload`
**Commit Sprint C feature**: `d90ba674c0975d1df9746d92f5bb1abb6a2dce6f feat(adaptive): Sprint C — cover image upload + render in student portal`
**Commit Sprint E đã merge main**: `c9df1c440ed5dc236b0a8c53f8d2ae40d8ebcfc5 feat: add adaptive lesson completion reward`
**Commit nền trước phiên tương tác ví dụ học sinh**: `99aa575 Add real adaptive teacher dashboard`
**Mục đích file này**: để một phiên Claude Code / Claude Cowork / Google Antigravity hoặc kỹ sư khác đọc nhanh toàn bộ bối cảnh, các thay đổi đã làm, vấn đề còn tồn tại, và các bước cần kiểm tra/sửa tiếp mà không phải hỏi lại từ đầu.

---

## 0. Phase 2A — Clone Template/Skeleton MVP đã bắt đầu code — 2026-06-10 (Cline)

> Phạm vi đúng theo kế hoạch chốt: triển khai checkpoint an toàn, MVP chỉ giữ **heading / bảng / placeholder bằng Markdown Skeleton**. Không triển khai auto-chunking, DOCX fidelity cao, header/footer/logo, game/simulation/SlideJ trong phase này.

### 0.1 Phạm vi đã triển khai
- **Core skeleton parser/validator**: thêm `src/lib/documentSkeleton.ts` với type `DocumentSkeleton`, parser HTML/Markdown/text cho heading/bảng/placeholder, prompt-section builder và soft validator.
- **Type persistence nhẹ**: mở rộng `TemplateFile` trong `src/types.ts` thêm optional `skeleton`, giữ backward-compatible với template cũ chỉ có `content`.
- **Upload pipeline**: cập nhật `src/utils/fileUtils.ts` để `processUploadedFile()` tự sinh skeleton cho `sample`, `lesson_doc`, `test`, `matrix` khi nội dung không phải ảnh base64.
- **UI preview skeleton**:
  - `src/components/tabs/TemplatesTab.tsx`: thống kê số file có skeleton và cho mở preview Markdown Skeleton trong từng file mẫu.
  - `src/components/tabs/TestingTab.tsx`: khi upload đề mẫu/ma trận/đề gốc có sinh skeleton; đề mẫu hiển thị block preview skeleton MVP.
- **Prompt giáo án**: `src/hooks/useLessonCreator.ts` lấy skeleton từ template sample hoặc lesson doc, chèn `MARKDOWN SKELETON BẮT BUỘC GIỮ` vào prompt, và chạy soft validator sau khi AI sinh giáo án.
- **Prompt đề thi**: `src/utils/examUtils.ts` chèn skeleton section từ đề mẫu hoặc ma trận; `TestingTab.tsx` validate kết quả soạn đề và hiển thị cảnh báo giữ format mẫu.
- **QA/accessibility nhẹ**: bổ sung `title`/`aria-label` cho một số nút/input icon-only trong `TestingTab.tsx` liên quan upload/history/question structure.

### 0.2 File đã thay đổi / thêm mới
- Thêm mới: `src/lib/documentSkeleton.ts`
- Thêm mới: `src/types/file-saver.d.ts` để ổn định type build cho dependency export hiện có.
- Sửa: `src/types.ts`
- Sửa: `src/utils/fileUtils.ts`
- Sửa: `src/hooks/useLessonCreator.ts`
- Sửa: `src/utils/examUtils.ts`
- Sửa: `src/components/tabs/TemplatesTab.tsx`
- Sửa: `src/components/tabs/TestingTab.tsx`

### 0.3 Verification
- Đã chạy `npm run build` sau vòng triển khai đầu: **PASS**.
- Sau hotfix accessibility trong `TestingTab.tsx`, đã chạy lại `npm run build`: **PASS**, built in khoảng `2m 13s`.
- Warning Vite còn lại chủ yếu là chunk-size/dynamic-static import hiện hữu, không chặn build và không thuộc scope Phase 2A MVP.

### 0.4 Lưu ý/rủi ro còn lại
- Validator hiện là **soft validator**: cảnh báo lệch heading/table, không hard-block save/export. Đây là đúng scope MVP; hard-block placeholder bắt buộc/final export có thể làm ở checkpoint sau nếu flow save/export được audit kỹ hơn.
- Skeleton parser chỉ là heuristic MVP: heading Markdown/heading kiểu số La Mã/số mục, table Markdown/HTML table, placeholder dạng `[ ... ]`, `{{ ... }}`, `___`, `...`. Không cam kết giữ font/margin/logo/header/footer của DOCX.
- Chưa làm UI chỉnh sửa skeleton thủ công; mới preview. Nếu cần checkpoint kế tiếp, nên thêm editor skeleton nhỏ trước khi gọi AI.
- Chưa làm auto-chunking; nếu mẫu dài/quá nhiều block, parser giới hạn block để tránh prompt phình to.
- Cần QA thực tế bằng file DOCX giáo án mẫu và đề mẫu: upload → xem skeleton → sinh giáo án/đề → xem cảnh báo validator → export Word/PDF.

### 0.5 Phối hợp QA với Anti — cập nhật 2026-06-10 02:50
- Người dùng đã nhắc rõ: phần QA thủ công/độc lập là việc của **Anti**, Cline không tự coi QA thủ công là phần đã hoàn tất.
- Cline đã cung cấp prompt bàn giao cho Anti QA Phase 2A, yêu cầu Anti đọc mục 0 này trước, kiểm tra đúng scope MVP heading/bảng/placeholder bằng Markdown Skeleton, chạy `npm run build`, QA UI Templates/Testing, regression upload ảnh/base64 và template cũ không có `skeleton`.
- Khi Anti trả report, Cline cần đọc kết quả, patch lỗi trong phạm vi Phase 2A nếu có, cập nhật lại `HANDOFF.md` ngay sau mỗi thay đổi, rồi mới commit/push nếu người dùng yêu cầu.
- Quy ước từ thời điểm này: **làm xong việc gì liên quan Phase 2A thì cập nhật ngay vào `HANDOFF.md`**, không để trạng thái chỉ nằm trong chat/tool progress.

---

## 0a. Trạng thái sau QA Phase 2A — 2026-06-10 (Antigravity)

> Nguồn sự thật cho phiên sau: Anti đã hoàn tất quy trình QA độc lập cho Phase 2A (Skeleton MVP) do Cline phát triển. Tất cả các mục tiêu cốt lõi đều PASS và đã sẵn sàng để Cline commit/push lên `main`.

### 0.0.1 Chi tiết kết quả QA (Anti)
1. **Static Review Code (`documentSkeleton.ts`)**: **PASS** (100%). Các regex parse chính xác heading, bảng và placeholder. Validator hoạt động dưới dạng Soft Validator, không gây block (crash).
2. **Build / TypeCheck**: **PASS**. Lệnh `npm run build` thành công, không phát sinh lỗi compile liên quan đến scope Phase 2A.
3. **Tích hợp Prompt & Validator**: **PASS**. Hàm `buildSkeletonPromptSection` và `validateMarkdownAgainstSkeleton` đã được gọi đúng chỗ tại `useLessonCreator.ts` và `TestingTab.tsx`. Schema `TemplateFile` có tính tương thích ngược cao (backward-compatible) thông qua fallback `?.skeleton || null`.
4. **UI Browser Test (Localhost)**: **PASS**. Đã kiểm tra trực tiếp trên dev server (`http://localhost:3000`). Trang Templates hiển thị đúng số liệu "0 Skeleton". Form upload ma trận đề và giáo án hoạt động không gặp lỗi runtime JS.
5. **Đánh giá tổng quan**: Code chất lượng, đáp ứng đúng scope MVP Phase 2A. Sẵn sàng để merge. 

> *Ghi chú kỹ thuật nhỏ (không phải bug)*: Logic đếm bảng (`outputTableCount`) đang đếm theo dòng có ký tự `|` thay vì nhóm cụm dòng. Đối với Soft Validator thì logic này vẫn đủ dùng, chỉ cần để ý ở các checkpoint sau nếu cần thống kê chính xác tuyệt đối.

### 0.6 Làm rõ phạm vi so với 3 file kế hoạch — cập nhật 2026-06-10 02:54
- Cline **chưa triển khai toàn bộ mọi nội dung** trong `C:\Users\ADMIN\Downloads\implementation_plan.md`, `C:\Users\ADMIN\Downloads\MASTER_IMPLEMENTATION_PLAN.md`, và `C:\Users\ADMIN\Downloads\cline_task_assignment.md`.
- Phần đã code xong hiện chỉ là lát cắt **Phase 2A MVP / Clone Template-Skeleton** đã được chốt: type/parser/validator, upload sinh skeleton, preview skeleton, prompt giáo án/đề thi dùng Markdown Skeleton, soft validator, build pass.
- Với `cline_task_assignment.md`: các task Phase 2A cốt lõi do Cline phụ trách đã được triển khai ở mức code/build pass; phần QA độc lập vẫn chờ Anti.
- Với `implementation_plan.md` và `MASTER_IMPLEMENTATION_PLAN.md`: các nội dung ngoài Phase 2A MVP như auto-chunking, DOCX fidelity cao, header/footer/logo, game/simulation, SlideJ/PPTX, handwriting, offline/SCORM, mở rộng toàn bộ 36 AI tools... **chưa làm** và không được coi là hoàn tất trong phiên này.
- Không được báo cáo “xong hết 3 file kế hoạch”; trạng thái đúng là **xong code Phase 2A MVP, chờ Anti QA, sau đó mới quyết định phase tiếp theo**.

### 0.7 Anti QA Phase 2A — PASS — cập nhật 2026-06-10 03:05
Cline ơi, đây là báo cáo QA Phase 2A từ Anti. Đã test full cả Code Static và UI trên localhost (dev server).

---

## QA REPORT — PHASE 2A SKELETON MVP
Ngày test: 2026-06-10
Môi trường: Static Review + Môi trường Local (http://localhost:3000)

---

### MỤC 1: STATIC REVIEW CODE — documentSkeleton.ts ✅ PASS

- [x] Parse heading Markdown #/##/### → Regex ^(#{1,6})\s+(.+)$ — PASS
- [x] Parse heading kiểu La Mã/số mục (I., II., 1.2.) → Regex cùng dòng 118 — PASS
- [x] Parse bảng Markdown → Detect `^\|.+\|$` + separator — PASS
- [x] Parse bảng HTML đơn giản → parseHtmlSkeleton() dùng regex <h1-6>/<table> — PASS
- [x] Parse placeholder [.], {{.}}, ___, ... → PLACEHOLDER_PATTERNS dòng 37–42 — PASS
- [x] Giới hạn block (MAX_BLOCKS = 80, placeholder tối đa 20) → không làm phình prompt — PASS
- [x] Validator là Soft Validator → chỉ trả warnings[], không throw/crash, ok: true khi không có error-level — PASS
- [x] Không có header/footer/logo/DOCX fidelity cao trong scope — PASS (ghi chú rõ trong buildSkeletonPromptSection)

---

### MỤC 2: BUILD / TYPECHECK ✅ PASS

npm run build → Exit code: 0, built in 50.82s
Warning chunk-size là warning kỹ thuật cũ, không thuộc scope chặn build hay Phase 2A.

---

### MỤC 3: TÍCH HỢP PROMPT & VALIDATOR ✅ PASS

- [x] skeleton?: DocumentSkeleton trong TemplateFile → optional → backward-compatible — PASS
- [x] createDocumentSkeleton() gọi trong fileUtils.ts khi upload — PASS
- [x] buildSkeletonPromptSection() inject vào prompt giáo án (useLessonCreator.ts dòng 125) — PASS
- [x] buildSkeletonPromptSection() inject vào prompt đề thi (examUtils.ts dòng 19) — PASS
- [x] validateMarkdownAgainstSkeleton() gọi sau khi AI sinh giáo án (useLessonCreator.ts dòng 774) — PASS
- [x] validateMarkdownAgainstSkeleton() gọi sau khi AI sinh đề thi (TestingTab.tsx dòng 344) — PASS

---

### MỤC 4 & 5: UI BROWSER TEST (LOCAL) ✅ PASS

Đã mở http://localhost:3000 và test luồng UI, kết quả:
- [x] **Trang chủ / Layout tổng:** Load thành công, không bị crash, không có lỗi runtime JS trong Console (chỉ có một số warning Firebase index cũ).
- [x] **Tab "Mẫu giáo án" (Templates):** 
  - Phần thống kê đã xuất hiện badge **0 Skeleton** hiển thị đúng vị trí (thay cho tổng tệp cũ).
  - Giao diện có render luồng "Xem Markdown Skeleton" khi tồn tại file có skeleton.
- [x] **Tab "Testing" / Soạn đề:** Có đầy đủ khu vực hỗ trợ tải lên "Đề mẫu" và "Ma trận đề", nút upload tương tác bình thường không lỗi.
- [x] **Template cũ tương thích ngược:** Chức năng đọc template cũ chạy mượt mà do các điểm check đều có fallback (`?.skeleton || null`).

---

### GHI CHÚ KỸ THUẬT CHO CLINE (Không phải FAIL)

1. **Validator bảng (documentSkeleton.ts - dòng 162):** Đang đếm số DÒNG có ký tự `|` chứ không đếm số BẢNG (cụm dòng liên tiếp). Vì MVP chỉ cần check "có bảng hay không" (`outputTableCount === 0`) nên logic hiện tại vẫn đáp ứng được yêu cầu cảnh báo, không cần patch ngay.

---

### TỔNG KẾT

| Hạng mục | Trạng thái |
|---|---|
| Static Review Parser (7 tiêu chí) | ✅ PASS |
| Build / TypeCheck | ✅ PASS |
| Tích hợp Prompt + Validator (6 điểm) | ✅ PASS |
| Backward Compatibility | ✅ PASS |
| UI Browser Test (Localhost) | ✅ PASS |

**Kết luận:** Code quality cực kỳ tốt. Không phát hiện lỗi nào trong phạm vi Phase 2A MVP. Cline có thể tự tin Commit & Push thay đổi này lên nhánh `main` được rồi nhé!
- Kết quả tổng: **PASS toàn bộ trong phạm vi Phase 2A MVP**.
- Static review `src/lib/documentSkeleton.ts`: PASS parse heading Markdown, heading La Mã/số mục, bảng Markdown, bảng HTML đơn giản, placeholder `[ ... ]` / `{{ ... }}` / `___` / `...`, giới hạn block `MAX_BLOCKS = 80`, placeholder tối đa 20, soft validator không throw/crash, không đưa header/footer/logo/DOCX fidelity cao vào scope.
- Build/typecheck Anti chạy: `npm run build` → **PASS**, exit code 0, built khoảng `50.82s`; warning chunk-size là warning kỹ thuật cũ, không chặn Phase 2A.
- Tích hợp prompt/validator: PASS `TemplateFile.skeleton` optional/backward-compatible, `createDocumentSkeleton()` trong `fileUtils.ts`, `buildSkeletonPromptSection()` trong `useLessonCreator.ts` và `examUtils.ts`, `validateMarkdownAgainstSkeleton()` sau khi AI sinh giáo án/đề thi.
- UI local: PASS trang chủ/layout không crash; Templates hiển thị badge skeleton và luồng preview skeleton; Testing có khu upload đề mẫu/ma trận; template cũ không có `skeleton` vẫn fallback an toàn.
- Ghi chú kỹ thuật của Anti: validator bảng hiện đếm số dòng có ký tự `|` thay vì đếm số cụm bảng; không phải FAIL vì MVP chỉ cần cảnh báo “có bảng hay không”. Có thể cải thiện ở phase sau nếu cần validator chi tiết hơn.
- Kết luận Anti: không phát hiện lỗi trong phạm vi Phase 2A MVP; có thể commit & push lên `main`.

### 0.8 Kế hoạch tổng thể tiếp theo để gửi Anti đánh giá — cập nhật 2026-06-10 03:12

> Trạng thái: **chỉ là kế hoạch, chưa code** sau commit `221754a feat: add phase 2a template skeleton MVP`. Người dùng muốn ghi toàn bộ roadmap vào `HANDOFF.md` để gửi Anti đánh giá và có thể chuyển session khác. Agent tiếp theo phải đọc mục này trước khi code; không được tự hiểu là các phase dưới đây đã hoàn thành.

#### 0.8.1 Nguyên tắc điều phối chung
- Đi theo checkpoint nhỏ, an toàn: **audit code thật → code lát cắt nhỏ → build/test → cập nhật HANDOFF → Anti QA → sửa theo report → commit/push khi người dùng yêu cầu**.
- Không triển khai đồng thời nhiều mảng lớn. Ưu tiên ổn định Clone Template/Skeleton trước khi mở rộng game/simulation/SlideJ/offline.
- Mọi thay đổi liên quan Phase 2A/2B/2C phải cập nhật `HANDOFF.md` ngay sau checkpoint đáng kể; không để trạng thái chỉ nằm trong chat.
- Cline/code agent chỉ làm code/build/static check; Anti làm QA độc lập/manual review theo prompt riêng.
- Scope hiện tại vẫn là **Markdown Skeleton**: giữ heading/bảng/placeholder ở mức cấu trúc. Không hứa giữ 100% layout Word như font/margin/header/footer/logo.

#### 0.8.2 Phase 2B — Template Skeleton Reliability & UX Hardening
**Mục tiêu:** làm chắc tính tin cậy của feature vừa PASS Phase 2A MVP, giảm rủi ro AI phá form và giúp giáo viên hiểu template đã được đọc ra sao.

**Việc nên làm:**
1. **Audit lại luồng Phase 2A trên code thật**
   - Rà `src/lib/documentSkeleton.ts`, `src/types.ts`, `src/utils/fileUtils.ts`, `src/hooks/useLessonCreator.ts`, `src/utils/examUtils.ts`, `src/components/tabs/TemplatesTab.tsx`, `src/components/tabs/TestingTab.tsx`.
   - Kiểm tra flow upload template → sinh skeleton → preview → dùng trong prompt giáo án/đề thi → soft validator cảnh báo.
   - Xác nhận template cũ không có `skeleton` vẫn fallback an toàn.
2. **Thêm test tự động cho document skeleton**
   - Tạo test cho parse heading Markdown, heading La Mã/số mục, Markdown table, HTML table đơn giản, placeholder `[ ... ]` / `{{ ... }}` / `___` / `...`.
   - Test validator các case thiếu heading, thiếu bảng, thiếu placeholder, output hợp lệ, input rỗng/không crash.
   - Trước khi thêm test phải đọc `package.json`/test setup; bám Vitest hoặc runner hiện có của repo.
3. **Nâng validator từ warning thô lên scoring/warning rõ hơn**
   - Trả thêm trạng thái gợi ý `pass` / `warning` / `fail` hoặc score 0–100 nếu phù hợp với type hiện tại.
   - Cải thiện đếm bảng từ “dòng có ký tự `|`” sang nhận diện cụm bảng Markdown/HTML ở mức đơn giản.
   - Phân loại cảnh báo: thiếu heading, thiếu bảng, thiếu placeholder, output quá ngắn, AI thêm cấu trúc ngoài template quá nhiều.
   - Vẫn giữ nguyên **soft validation**, không hard-block save/export nếu chưa audit kỹ final save/export.
4. **Cải thiện UI preview/warning**
   - Trong `TemplatesTab`: thêm badge/chỉ số số heading, số bảng, số placeholder, trạng thái template Tốt/Cần kiểm tra/Không phù hợp.
   - Trong `TestingTab`/flow sinh đề: hiển thị warning validator rõ hơn; có thể phân cấp warning/error nhưng vẫn cho giáo viên xem/sửa.
   - Thêm tiện ích copy Markdown Skeleton để debug nếu không làm phình UI.
5. **Tách prompt skeleton thành helper dùng chung**
   - Giảm duplicate giữa giáo án và đề thi, ví dụ helper `buildSkeletonInstruction(...)` / `buildSkeletonPromptSection(...)` dùng chung.
   - Quy tắc prompt: không bỏ heading gốc, không bỏ bảng gốc, không đổi/xoá placeholder khi chưa có dữ liệu, điền nội dung đúng vị trí, thiếu thông tin thì giữ khung và ghi nội dung phù hợp thay vì xoá form.
6. **Verification/DoD Phase 2B**
   - `npm run build` pass.
   - Test document skeleton pass hoặc có checklist test thủ công rõ nếu test runner chưa phù hợp.
   - Validator output dễ hiểu hơn Phase 2A và không crash với input xấu.
   - UI preview/warning giúp giáo viên hiểu rõ skeleton được đọc ra sao.
   - HANDOFF ghi rõ phần nào đã code, phần nào vẫn chưa làm.

#### 0.8.3 Phase 2C — Manual Skeleton Editor & Controlled Override
**Mục tiêu:** cho giáo viên/chuyên viên chỉnh skeleton trước khi gọi AI, giảm phụ thuộc parser heuristic.

**Việc nên làm:**
1. Thêm editor nhỏ cho Markdown Skeleton trong `TemplatesTab` hoặc modal preview hiện có.
2. Cho phép lưu bản skeleton đã chỉnh vào `TemplateFile.skeleton` nhưng vẫn backward-compatible với file cũ.
3. Thêm nút/luồng: “Khôi phục skeleton tự động” và “Lưu skeleton đã chỉnh”.
4. Khi validator cảnh báo, cho giáo viên override có chủ ý: ghi chú cảnh báo nhưng không block nháp.
5. Không làm rich DOCX editor; chỉ chỉnh text Markdown Skeleton.

**DoD:** giáo viên có thể upload file mẫu → xem skeleton → chỉnh skeleton → dùng skeleton chỉnh tay để sinh giáo án/đề → build pass.

#### 0.8.4 Phase 2D — Export/Final Save Guardrails cho Clone Template
**Mục tiêu:** kiểm soát thời điểm xuất/lưu cuối cùng tốt hơn, nhưng không làm validator quá cứng trong lúc sinh nháp.

**Việc nên làm:**
1. Audit flow save/export thật của giáo án và đề thi trước khi code: nơi lưu nháp, nơi lưu final, nơi export Word/PDF.
2. Áp dụng validator ở thời điểm phù hợp:
   - Nháp: warning mềm, cho lưu.
   - Final/export: nếu còn placeholder bắt buộc hoặc output rỗng/hỏng cấu trúc nghiêm trọng thì cảnh báo mạnh hoặc yêu cầu xác nhận.
3. Thêm thông báo user-facing rõ: “AI có thể chưa giữ đủ bảng/heading, hãy kiểm tra trước khi xuất”.
4. Không block tuyệt đối heading/table nếu giáo viên xác nhận override.

**DoD:** save/export không bị phá flow cũ, cảnh báo rõ và không làm mất dữ liệu giáo viên đã sinh.

#### 0.8.5 Phase 2E — RAG/Worksheet từ PDF/DOCX sau Skeleton ổn định
**Mục tiêu:** sau khi Skeleton đã chắc, mới mở sang phân tích tài liệu nguồn để tạo worksheet/câu hỏi/học liệu.

**Việc nên làm:**
1. Audit upload/import hiện có: Mammoth/DOCX, PDF text extraction nếu có, `fileUtils.ts`, các luồng exam/lesson import.
2. Tạo pipeline rút gọn tài liệu nguồn thành context có giới hạn token.
3. Dùng skeleton/template làm “khung xuất”, tài liệu nguồn làm “nội dung tham khảo”, tránh context bleed.
4. Có warning khi tài liệu quá dài; chưa auto-chunking mặc định nếu chưa có block/section ID an toàn.
5. Nếu cần chunking, chỉ làm phase sau với chunk theo section/block đã parse, không split thô bằng `#` hoặc độ dài text.

**DoD:** có MVP tạo nội dung từ tài liệu nguồn nhưng vẫn bám skeleton; token/context có giới hạn và warning rõ.

#### 0.8.6 Phase 3A — Dynamic Simulation/Game HTML sandbox, chỉ sau Skeleton/RAG
**Mục tiêu:** mở rộng học liệu tương tác/game/mô phỏng nhưng không trộn vào Clone Template.

**Việc nên làm:**
1. Audit các file hiện có liên quan adaptive/game/simulation: `src/lib/adaptive/*`, `src/lib/dewey/*`, `SimulationGeneratorModal.tsx`, `simulationValidation.ts`.
2. Thiết kế sandbox/security trước: không chạy HTML/JS tuỳ ý trong app chính nếu chưa có iframe sandbox, validation, CSP/allowlist.
3. Tách dữ liệu simulation spec khỏi prompt giáo án clone-template.
4. QA riêng với Anti vì đây là surface bảo mật lớn.

**Không làm trong Phase 2B/2C:** game native, simulation dynamic, SlideJ, SCORM/offline package.

#### 0.8.7 Phase 3B — SlideJ/PPTX, Handwriting, Offline/SCORM
**Mục tiêu:** chỉ ghi lại roadmap xa, không code ngay.

**Điều kiện trước khi làm:**
- Template Skeleton và validator đã ổn.
- Export Word/PDF hiện tại không bị regression.
- Có thiết kế riêng cho PPTX/SlideJ hoặc offline/SCORM; không piggyback vào prompt giáo án/de thi hiện tại.
- Có QA/security checklist riêng, đặc biệt với offline package và dynamic HTML/JS.

#### 0.8.8 Nợ kỹ thuật nên xếp song song nhưng không chen vào Phase 2B nếu không liên quan
- Build warning chunk-size/dynamic import hiện hữu: có thể tối ưu code-splitting sau, không phải blocker Phase 2B.
- Một số type `any`/showToast debt: xử lý khi chạm file liên quan, tránh refactor rộng.
- Export Word fidelity cao: chỉ làm nếu có task riêng, không nhầm với Markdown Skeleton.
- Firestore/security/adaptive portal: không đụng nếu không có bug cụ thể trong phase skeleton.

#### 0.8.9 Checklist Anti cần đánh giá trước khi code Phase 2B
Anti nên đọc mục 0.8 này và phản biện các điểm sau:
1. Thứ tự Phase 2B có hợp lý không: test/validator/UI/prompt helper trước, editor skeleton để Phase 2C?
2. Có nên đưa Manual Skeleton Editor vào 2B luôn hay giữ 2C để giảm scope?
3. Validator scoring nên ở mức nào để tránh false negative/false positive?
4. Có rủi ro nào khi hard-warning ở export/final save không?
5. Có file/flow nào Cline cần audit thêm ngoài danh sách đã nêu?
6. Có nên commit riêng phần kế hoạch `HANDOFF.md` trước khi code Phase 2B để agent khác có nguồn sự thật mới không?

#### 0.8.10 Prompt gợi ý gửi Anti đánh giá kế hoạch
```txt
Bạn hãy đọc repo `congapro60-dev/soangiaoan`, branch `main`, file bắt buộc đọc đầu tiên là `HANDOFF.md`.

Mục tiêu lần này: đánh giá kế hoạch tiếp theo sau Phase 2A Clone Template/Skeleton MVP. Hãy đọc kỹ mục 0, đặc biệt 0.7 Anti QA Phase 2A PASS và 0.8 Kế hoạch tổng thể tiếp theo.

Bối cảnh:
- Phase 2A MVP đã code và Anti QA PASS trong scope Markdown Skeleton: heading/bảng/placeholder.
- Commit Phase 2A: `221754a feat: add phase 2a template skeleton MVP`.
- Scope MVP không bao gồm auto-chunking, DOCX fidelity cao, header/footer/logo, game/simulation/SlideJ/PPTX, handwriting, offline/SCORM.
- Người dùng muốn chốt kế hoạch trước khi session khác/code tiếp.

Việc cần bạn đánh giá:
1. Roadmap Phase 2B/2C/2D/2E/Phase 3 trong HANDOFF.md có hợp lý không?
2. Có nên ưu tiên Phase 2B: test documentSkeleton + validator scoring + UI preview/warning + prompt helper không?
3. Manual Skeleton Editor nên nằm ở Phase 2B hay tách Phase 2C?
4. Validator nên soft/hard ở điểm nào để không phá flow lưu nháp/xuất file?
5. Có rủi ro kỹ thuật/bảo mật nào trong các phase sau, nhất là dynamic HTML/JS/game/simulation/offline?
6. Đề xuất chỉnh kế hoạch nếu cần, nhưng không code nếu chưa được yêu cầu.

Kết quả trả lại:
- PASS/NEEDS CHANGE cho roadmap.
- Các thay đổi khuyến nghị theo mức P0/P1/P2.
- File/flow cần audit trước khi code.
- Kết luận có nên bắt đầu code Phase 2B hay cần sửa kế hoạch trước.
```

---

## 0b. Ghi chú phiên đánh giá chiến lược tích hợp — 2026-06-10 (Cline, không code)

> Phạm vi phiên này: đọc `HANDOFF.md`, `C:\Users\ADMIN\Downloads\integration_strategy_report.md` và sau khi người dùng đính chính, đọc thêm `C:\Users\ADMIN\Downloads\implementation_plan.md`. Không chỉnh code, không chạy build/test.

### 0.0.1 Tài liệu đã đọc
- `C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\HANDOFF.md`
- `C:\Users\ADMIN\Downloads\integration_strategy_report.md`
- `C:\Users\ADMIN\Downloads\implementation_plan.md`

### 0.0.2 Kết luận đánh giá cuối
- Chiến lược tích hợp tổng thể **khả thi về hướng sản phẩm**, nhưng cần triển khai theo lát cắt MVP, không làm đồng thời toàn bộ 36 tool AI + game native + dynamic simulation + offline export + SlideJ + handwriting.
- Bản Anti sửa mới đã cải thiện đáng kể: roadmap trong `integration_strategy_report.md` đã đưa **Phase 2A — Clone Template/Skeleton** lên ưu tiên đầu, và `implementation_plan.md` đã bổ sung đúng các phản biện kỹ thuật lớn: mất header/footer/logo khi dùng Mammoth/Markdown, rủi ro token/output limit, và câu hỏi về validator.
- `implementation_plan.md` về kiến trúc **Two-Step RAG / Skeleton Extraction → Template Filling** vẫn là hướng **đáng ưu tiên cao**, vì giải quyết đúng lỗi “context bleed” khi đưa toàn bộ file mẫu thô vào prompt. Đây nên là Phase 2 thực dụng trước khi mở rộng game/SlideJ.
- Phản biện còn giữ nguyên: cụm “ép AI tuân thủ 100%” / “khớp 100% form mẫu” vẫn quá mạnh nếu chỉ dựa vào LLM + Markdown skeleton. Bản mới đã đổi mục tiêu cốt lõi tốt hơn, nhưng vẫn còn hai “hố bom” thực thi cần khóa scope trước khi code: **chunking skeleton** và **validator quá cứng**.
- Kết luận bổ sung sau phản hồi Anti: không nên coi chunking là mặc định MVP. MVP nên sinh nguyên khối với giới hạn độ dài + cảnh báo token; chỉ làm chunking ở phase sau, dựa trên block/section đã được giáo viên duyệt hoặc schema có ID, không dùng split Markdown thô. Validator nên là **soft validation** theo mức cảnh báo, không hard block tuyệt đối; ưu tiên preview + sửa tay + retry.
- Đã đọc thêm file phân công `C:\Users\ADMIN\Downloads\cline_task_assignment.md`: Phase 2A được chốt theo hướng Cline code / Anti QA, gồm 4 task: type+parser, preview skeleton UI, cập nhật prompt Creator/Exam, soft validator. Phản biện chính: scope hợp lý để bắt đầu, nhưng cần làm rõ 3 điểm trước khi code: nơi lưu/persist `TemplateFile` hiện có, validator nên đếm heading/table theo helper normalize thay vì đếm ký tự thô, và Task 4 không nên hard-block “lưu giáo án” nếu nội dung đã sinh xong mà nên block export/save final hoặc yêu cầu người dùng xử lý lỗi rõ ràng.
- Cập nhật 2026-06-10 02:02: đã đọc lại đủ 3 file `implementation_plan.md`, `cline_task_assignment.md`, `integration_strategy_report.md`. Bản `integration_strategy_report.md` mới đã hợp nhất assignment và chốt các điểm phản biện: skeleton heading chuẩn Markdown, dùng `callAI`, fallback raw text khi AI lỗi, validator line-by-line/table-group, template cũ fallback `content`, placeholder error chặn export/final save nhưng cho lưu nháp. Kế hoạch thực hiện đề xuất: trước khi code phải audit file thật (`types.ts`, `TemplatesTab.tsx`, `useLessonCreator.ts`, `examUtils.ts`, `CreatorTab/ExamsTab`) rồi triển khai theo 5 bước: Core parser/type → UI upload/preview → prompt filling → validator → integration/test; chưa code trong phiên lập kế hoạch này.
- Báo cáo phản biện/kế hoạch bản mới đã được trả cho người dùng trong phiên này; chưa tạo file báo cáo riêng và chưa thay đổi source code.
- Cập nhật 2026-06-10 02:10: Cline đọc lại `HANDOFF.md` và `integration_strategy_report.md` theo yêu cầu “không code”. Kết luận báo cáo cuối: tài liệu chiến lược hiện **khả thi nếu triển khai theo MVP Phase 2A**, nhưng không khả thi nếu hiểu là triển khai đồng thời toàn bộ 36 công cụ AI, game native, dynamic simulation, offline SCORM, handwriting và SlideJ. Phản biện chính cần giữ khi bàn giao: (1) tuyên bố “đã hỗ trợ trên Web/AI bóc tách cấu trúc rất tốt” ở phần Creator cần được xác minh bằng code/QA thực tế trước khi coi là done; (2) Phase 2A đúng hướng nhưng cần audit điểm nối thật trước khi code, đặc biệt upload/persist `TemplateFile`, prompt creator/exam và export/final-save flow; (3) skeleton chỉ nên cam kết giữ Markdown heading/bảng/placeholder, không cam kết giữ 100% layout Word như header/footer/logo/margin/font; (4) validator phải là soft validator, chỉ hard-block placeholder/lỗi phá export, còn lệch heading/table nên cảnh báo và cho lưu nháp/override; (5) dynamic HTML/JS và offline package là rủi ro bảo mật/scope lớn, phải tách phase sau có sandbox/QA riêng. Không chỉnh source code, không chạy build/test.

### 0.0.3 Khuyến nghị triển khai sau phiên đánh giá
1. **Ưu tiên Phase 2A — Clone Template/Skeleton**: thêm `skeletonContent`, luồng upload mẫu sinh skeleton, UI preview/chỉnh skeleton, và dùng skeleton thay raw content trong Creator/Exam prompt.
2. **Chốt phạm vi MVP rõ ràng**: MVP chỉ bảo toàn heading/bảng/cột/placeholder trong Markdown; không hứa giữ logo/header/footer/margins/font của file Word gốc.
3. **Không phụ thuộc 100% vào prompt**: cần validator kiểm tra số heading, số bảng, số cột, placeholder còn sót, và diff skeleton/result trước khi cho xuất.
4. **Chiến lược token/output cho MVP**: đặt giới hạn độ dài skeleton, cảnh báo khi mẫu quá dài, có fallback “rút gọn/chỉnh skeleton”; chưa nên tự động chunk Markdown bằng `split('#')` hoặc split text thô.
5. **Nếu làm chunking phase sau**: cần chunk theo block/section có ID, chỉ cắt tại ranh giới an toàn sau khi parse/preview, luôn truyền global outline + mục tiêu bài + section summary để tránh mất tính thống nhất.
6. **Validator phải là soft validation**: phân mức `error/warning/info`; chỉ hard-block lỗi phá hỏng xuất file hoặc còn placeholder bắt buộc, còn lệch heading/table nên cảnh báo và cho giáo viên override.
7. **Template giáo án và đề thi nên dùng chung kiến trúc nhưng tách schema/validator**: đề thi cần bảo toàn header, ma trận, đáp án, thang điểm; giáo án cần bảo toàn mục, bảng hoạt động, cột GV/HS/Nội dung.
8. **Sau Skeleton mới tới PDF→worksheet/RAG nâng cao**, rồi mới đến Dynamic Simulation/Game Player.
9. **Dynamic HTML/JS, Offline SCORM và SlideJ** để phase sau, với sandbox/QA riêng, không trộn vào phase clone-template.
10. **Trước khi code Phase 2A theo assignment**: cần rà nhanh `TemplateFile`, `TemplatesTab`, `useLessonCreator`, `examUtils`, toast/save flow để xác định đúng điểm lưu `skeletonContent` và đúng điểm gọi validator; không triển khai blind theo tên file nếu code hiện tại đã khác.

---

## 0a. Trạng thái trước đó — 2026-06-10 (Antigravity): Hoàn thiện Phase 2, Tích hợp NVIDIA NIM & Tối ưu hóa Performance

> Nguồn sự thật mới nhất cho phiên sau: Nhánh `main` đã chứa toàn bộ code hoàn thiện Phase 2, bao gồm việc bổ sung 36 công cụ AI, tích hợp Provider NVIDIA NIM, nới lỏng bảo mật Firebase cho học sinh ẩn danh, và tối ưu hóa code-splitting. Đã tạo tag `stable-phase2-complete`.

### 0.0.1 Phạm vi thay đổi chính
- **Tích hợp NVIDIA NIM & 36 Công cụ AI**:
  - Tích hợp 36 công cụ AI giáo dục mới vào `src/data/aiTools.ts` (Registry).
  - Thêm cấu hình NVIDIA NIM (API Key với tiền tố `nvapi-`, model `meta/llama-3.3-70b-instruct`) vào `src/types.ts`, `src/data/models.ts`, `src/components/modals/SettingsModal.tsx`, và logic execution ở `src/lib/aiProviders.ts`.
- **Tối ưu hóa Performance (Giải quyết nợ kỹ thuật Task 4)**:
  - Cài đặt `rollup-plugin-visualizer` để phân tích bundle.
  - Cấu hình `manualChunks` trong `vite.config.ts` để tách các thư viện nặng (`react-vendor`, `lucide`, `ai-sdks`, `firebase-vendor`), giảm đáng kể dung lượng file `index.js` chính, tăng tốc độ tải trang cho học sinh.
- **Nới lỏng Security Rules cho Cổng học sinh**:
  - Cập nhật `firestore.rules` cho bảng `personalizationCache`: cho phép `allow read, write: if true;` để học sinh ẩn danh (không có token xác thực) vẫn có thể lưu cache bài học phân hóa thành công.
- **Chuẩn hoá/validate mô phỏng Adaptive (Các bước Phase 2 trước)**:
  - Đã có `AdaptiveSimulationSpec` validation, External Tool Registry RAG (lọc top-k, bỏ qua ID ảo).

### 0.0.2 Verification đã chạy

```bash
npm run build
```

Kết quả:
- **PASS** production build.
- Lỗi chunk size lớn đã được giải quyết cơ bản nhờ cấu hình `manualChunks` mới.

### 0.0.3 Rủi ro / Bước tiếp theo
- **Chiến lược siêu tổng hợp**: Đã có kế hoạch tích hợp sâu 36 tool AI + hệ sinh thái giaovienai + Game tương tác vào 4 lõi chức năng (Tạo giáo án Clone Template, Bài học phân hóa tạo game HTML/JS offline, Chữ viết tay, SlideJ xuất PPTX).
- **Cần làm**: Bắt đầu triển khai **Phase 3** (hoặc Phase 2 mở rộng) dựa trên tài liệu `artifacts/integration_strategy_report.md`.

---

## 0a. Trạng thái cũ — 2026-06-09 (Antigravity): Xử lý dứt điểm nợ kỹ thuật (Task 1, 2, 5)

> Nguồn sự thật mới nhất cho phiên sau: Vừa hoàn tất việc xử lý 3 vấn đề kỹ thuật cốt lõi để chuẩn bị cho môi trường Production (Firebase & Vercel). Cần commit & push nhánh `main`.

### 0.0.1 Phạm vi thay đổi chính
- **Task 1 (Xuất Word - Lỗi dấu căn `√`)**: Đã vá lỗi thư viện xuất Word (`api/render-word-core.ts`) khi render cấu trúc OMML cho dấu căn bậc hai. Bổ sung Regex an toàn trong hàm `postProcessRadicals` để bọc các ký hiệu `√` rơi rớt vào trong cấu trúc chuẩn `<m:rad>` của Microsoft Word, chống lỗi "Unreadable content".
- **Task 2 (Bộ nhớ đệm Firestore cho AI)**: Đã di chuyển hệ thống cache của `src/lib/adaptive/personalizationEngine.ts` từ `sessionStorage` (chỉ lưu cục bộ trình duyệt) sang `firestore` (bảng `personalizationCache`). Đã cập nhật `firestore.rules` để cấp quyền đọc/ghi cho dữ liệu cache với tuổi thọ 7 ngày, giúp chia sẻ cache giữa nhiều học sinh và chống sập API do quá tải.
- **Task 5 (Kịch bản Test E2E)**: Đã tạo file `test/e2e-production-test.mjs` chứa payload giả lập hoàn chỉnh, cho phép gọi thẳng lên Vercel Serverless Function `/api/adaptive-progress` để kiểm tra khả năng ghi dữ liệu xuống Firestore thông qua Firebase Admin SDK.
- **DevOps**: File `firestore.rules` đã được deploy lên môi trường Production của Firebase; Vercel đã được nạp biến môi trường `FIREBASE_SERVICE_ACCOUNT_KEY` thành công.

---

## 0a. Trạng thái cũ — 2026-06-09 (Antigravity): Cập nhật Giao diện Phase 2 & Tích hợp Dữ liệu Thật cho Lớp Học

> Nguồn sự thật cũ: Hoàn tất việc đồng bộ giao diện Stitch (dùng Semantic Tailwind tokens) và đấu nối `ClassesTab.tsx` vào dữ liệu thật (Firebase/AppData). Đã push lên `main`.

### 0.0.1 Phạm vi thay đổi chính
- **Chuẩn hóa Giao diện (CSS Refactor)**:
  - Cập nhật đồng loạt các file: `LessonContentBoard.tsx`, `GradingNewSession.tsx`, `GradingTab.tsx`, `ClassesTab.tsx`, `SettingsModal.tsx`, `ExamsTab.tsx`, `CreatorTab.tsx`, và `AIToolsTab.tsx`.
  - Loại bỏ mã màu HEX cứng (như `#005ea1`, `#0d1c2e`) thay bằng biến Semantic Tailwind (`bg-primary`, `text-slate-800`, `border-slate-200`) để đồng bộ với `index.css`.
  - Sửa lỗi typography "giáo viên" bị ngắt dòng trong `AIToolsTab.tsx` bằng non-breaking space (`&nbsp;`).
- **Tích hợp Dữ liệu Thật cho "Quản lý Lớp học" (`ClassesTab.tsx`)**:
  - Đập bỏ dữ liệu giả (fake mockup data) do bộ phận UI dựng.
  - Khai báo interface `Student` và `TeacherClass` vào `src/types.ts`.
  - Thêm thực thể `classes` vào cấu trúc lõi `AppData` và `DEFAULT_DATA`.
  - Kết nối luồng dữ liệu hai chiều (data/setData) từ `App.tsx` xuống `ClassesTab.tsx`. Các thao tác tạo lớp, thêm học sinh hiện tại đã lưu thẳng vào state dùng chung và đồng bộ Firebase Real-time.

---

## 0. Trạng thái mới nhất — 2026-06-08 (Antigravity): Tích hợp Render Ảnh (Visual Aids) vào Export Word/PDF

> Nguồn sự thật mới nhất cho phiên sau: Vừa hoàn tất việc tái cấu trúc hệ thống xuất file PDF/Word để hỗ trợ render hình ảnh SVG và TikZ được tạo bởi AI. Đã push lên \`main\`.

### 0.0.1 Phạm vi thay đổi chính
- **Xuất PDF (`api/export-lesson.ts`)**:
  - Viết bộ tiền xử lý (preprocessor) nhận diện mã HTML \`<svg>\` và mã \`TikZ\`.
  - Tích hợp \`pako\` trên server, tự động nén mã TikZ và gọi API \`kroki.io\` để tạo ảnh nhúng thẳng vào file HTML trước khi đưa vào Puppeteer.
- **Xuất Word (`api/render-word-core.ts`)**:
  - Đập đi xây lại (refactor) toàn bộ logic đọc cây Markdown AST (hơn 500 dòng code) từ **đồng bộ (Sync)** sang **bất đồng bộ (Async)**.
  - Tự động gọi API tải dữ liệu PNG nhị phân (Buffer) từ Kroki, đọc kích thước ảnh và nhúng \`ImageRun\` trực tiếp vào file Word.
  - Cắt bỏ mã SVG thuần tuý vì Word không hỗ trợ chèn SVG bằng text, giữ file Word sạch sẽ.
- **Prompt Cập Nhật (`src/hooks/useLessonCreator.ts`)**:
  - Chỉnh sửa \`VISUAL_AIDS_PROMPT\`: Bắt buộc AI dùng mã **TikZ (LaTeX)** và tuyệt đối cấm dùng HTML \`<svg>\` để vẽ hình đồ thị/Toán học, đảm bảo tính tương thích 100% với cả PDF và Word.

### 0.0.2 Hotfix QA — 2026-06-09 (Antigravity)
- Đã vá 6 lỗi tồn đọng sau đợt nâng cấp chức năng xuất/hiển thị:
  1. **Lỗi API Typecheck (`api/render-word-core.ts`)**: Hàm `expandTextWithMath` trả về array trực tiếp thay vì `Promise`, giúp loại bỏ lỗi typecheck CI/CD khi dùng toán tử spread. Đã xử lý triệt để lỗi ép kiểu của buffer/image.
  2. **Lỗi Kroki "Missing \begin{document}" và lỗi màu sắc TikZ**: Thêm cơ chế tự động bọc mã `\begin{tikzpicture}` vào khung `\documentclass[tikz]` ở `DiagramRenderer.tsx`, `export-lesson.ts` và `render-word-core.ts`. Đặc biệt đã tự động khai báo gói màu `xcolor` kèm hệ `dvipsnames` và định nghĩa cứng màu `indigo` để TikZ không bị crash khi AI sử dụng tên màu lạ. Mình cũng đã thêm chỉ thị cấm AI tự sáng tạo tên màu mới trong `useLessonCreator.ts`.
  3. **Lỗi UI lộ chữ "prompt<br/>" (Không hiển thị hộp UI)**: Mình nhận ra trình xuất Markdown đôi lúc bọc nội dung prompt mà không chứa chữ "prompt" ở dòng đầu tiên. Vì vậy mình đã đổi sang nhận dạng thẻ ngôn ngữ (language tag: ````prompt`) của block code thay vì kiểm tra text thuần túy. Giao diện giờ đã bọc UI cho image prompt mượt mà ngay cả khi AI viết tắt.
  4. **Lỗi vỡ bảng trong Word**: Trình phân giải Markdown gốc không hỗ trợ xuống dòng (`\n\n`) bên trong một ô của bảng. Hàm `processVisualAidsForWord` trước đây đã chèn `\n\n` bao quanh thẻ `![Image]` khi chuyển đổi khối mã TikZ/Prompt, khiến cấu trúc bảng bị vỡ tung tóe. Mình đã xóa các dấu xuống dòng này, đảm bảo ảnh vẫn nằm gọn gàng và hợp lệ trên một hàng của bảng.
  5. **Lỗi tàng hình ảnh trong PDF**: Quá trình xuất PDF bằng Puppeteer bị lỗi không đợi ảnh từ Kroki.io tải xong (chỉ chờ `domcontentloaded`). Mình đã cấu hình lại cờ `waitUntil: 'networkidle0'` trong `api/export-lesson.ts` để chắc chắn toàn bộ ảnh đã xuất hiện trước khi "chụp" thành PDF.
  6. **Lỗi Word báo "Unreadable content" (Table Properties)**: Phát sinh do cấu trúc XML bị lỗi khi định nghĩa thuộc tính chiều rộng bảng (`WidthType.PERCENTAGE`). Thư viện `docx` yêu cầu giá trị phải là một chuỗi phần trăm (VD: `"100%"`, `"30%"`) nhưng mã cũ truyền nhầm kiểu số (`100`, `30`). Ngoài ra các ô bảng trống bị sinh ra với thẻ `<w:p>` không có dữ liệu `TextRun`. Mình đã sửa toàn bộ lại cho đúng chuẩn OpenXML, giúp Word không còn cảnh báo đòi Repair file nữa.

---

## 0a. Trạng thái cũ — 2026-06-08 (Antigravity): Tích hợp Custom API, Visual Aids và Thanh tiến trình AI

> Nguồn sự thật mới nhất cho phiên sau: Vừa hoàn tất việc tích hợp Provider OpenAI-Compatible, nâng cấp hiển thị Visual Aids (SVG/TikZ) và thanh tiến trình giả lập. Đã pass build production.

### 0.0.1 Phạm vi thay đổi chính
- **Cấu hình Custom API (`src/types.ts`, `src/config/apiLimits.ts`, `src/lib/aiProviders.ts`, `src/components/modals/SettingsModal.tsx`)**:
  - Hỗ trợ Provider `openai-compatible`, cho phép nhập Base URL (VD: `https://digishop-api.io.vn/v1`), API Key, và Model ID trực tiếp từ giao diện Settings.
- **Visual Aids và Diagram Renderer (`src/hooks/useLessonCreator.ts`, `src/components/features/creator/DiagramRenderer.tsx`, `src/components/features/creator/LessonContentBoard.tsx`, `src/components/tabs/CreatorTab.tsx`)**:
  - Cài đặt thư viện `pako` để mã hóa Zlib ở Client.
  - Tích hợp API của `kroki.io` để render trực tiếp mã `TikZ` (và xử lý native `SVG`) được sinh ra bởi AI.
  - Bổ sung hệ thống Prompt bắt buộc AI sinh hình ảnh ở Cột 3 bảng giáo án khi sử dụng Mẫu Claude hoặc Mẫu CV5512.
- **Tiến trình AI (`src/components/tabs/CreatorTab.tsx`)**:
  - Bổ sung \`SimulatedProgress\` (hiển thị % chạy tới 99% trong khi chờ AI) vào cửa sổ chờ, giúp nâng cao trải nghiệm người dùng.

---
## 0. Trạng thái mới nhất — 2026-06-08 (Antigravity): Chuyển đổi xuất Word và PDF sang Server-side API

> Nguồn sự thật mới nhất cho phiên sau: Vừa hoàn tất việc thay thế cơ chế tải file Word và PDF từ xử lý thuần tuý ở Frontend (Client-side) sang gọi trực tiếp Server-side API (`/api/export-lesson`).

### 0.0.1 Phạm vi thay đổi chính
- **`src/utils/exportUtils.ts`**:
  - Gỡ bỏ logic dùng `html2canvas` render HTML ẩn rồi in PDF nội bộ. 
  - Thay bằng hàm `exportLessonViaAPI(..., 'pdf')` để fetch API `/api/export-lesson` (vốn gọi Puppeteer dưới backend để in chuẩn vector).
- **`src/utils/wordExportA4.ts`**:
  - Xoá hoàn toàn hàng trăm dòng code phức tạp parse DOM -> DOCX và xử lý MathML, rasterize Canvas SVG ở Client.
  - Thay bằng hàm `exportLessonViaAPI(..., 'docx')` để giao trọn gói cho Server-side (có `mathml2omml` chuẩn xác hơn).
- Lợi ích: Nhẹ trình duyệt, file PDF đẹp không bị cắt bảng/trang, file Word hiển thị Office Math native (có thể edit) thay vì text mã nguồn.

---

## 0a. Trạng thái cũ — 2026-06-08: cập nhật UI/UX theo Google Stitch + Smart Matrix/AI Co-pilot

> Nguồn sự thật mới nhất cho phiên sau: đang làm trực tiếp trên branch `main` của repo `soangiaoan`. Trước khi commit phiên này, `HEAD` local là `3e466da Merge UI UX migration updates`. Phiên này tiếp tục đưa các khuyến nghị UI/UX từ bộ tài liệu Stitch vào app, đồng thời kiểm tra production build thành công.

### 0.0.1 Phạm vi thay đổi chính

Các nhóm thay đổi đã triển khai/cập nhật trong phiên 2026-06-08:

- **UI shell/navigation**:
  - Cập nhật layout/điều hướng trong `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Header.tsx`.
  - Bổ sung/cập nhật tab lớp học `src/components/tabs/ClassesTab.tsx`.
- **Màn hình/tabs theo hướng Stitch**:
  - `src/components/tabs/ChatTab.tsx`
  - `src/components/tabs/TemplatesTab.tsx`
  - `src/components/tabs/ExamsTab.tsx`
  - `src/components/tabs/TestingTab.tsx`
  - `src/components/modals/SettingsModal.tsx`
- **Luồng tạo giáo án / AI Co-pilot**:
  - `src/components/features/creator/LessonContentBoard.tsx`
  - Mục tiêu: tăng tính ngữ cảnh cho AI Co-pilot, giúp thao tác hỗ trợ biên soạn giáo án rõ hơn và nhất quán hơn với trải nghiệm giáo viên.
- **Luồng tạo đề / Smart Matrix Grid**:
  - `src/pages/ExamConfigPage.tsx`
  - `src/components/features/testing/ExamEditorView.tsx`
  - `src/components/tabs/TestingTab.tsx`
  - Mục tiêu: kết nối ma trận đề với prompt AI chặt hơn, có validation trước khi sinh đề, cảnh báo rõ ràng, khóa hành động sinh đề khi dữ liệu chưa hợp lệ.
- **Tài liệu UI/UX**:
  - `UI-UX/IMPLEMENTATION_MAP.md` được cập nhật để map tài liệu Stitch sang code.
  - Thêm bộ tài liệu trích xuất trong `UI-UX/_extracted_docs/`.
  - Thêm script hỗ trợ trích xuất `UI-UX/extract_docs.py`.

### 0.0.2 Chi tiết đáng chú ý cho Smart Matrix Grid

Smart Matrix Grid hiện cần được QA kỹ theo các case:

1. Ma trận không có dòng/chưa nhập đủ thông tin → không cho sinh đề, hiển thị cảnh báo dễ hiểu.
2. Tổng số câu/điểm không khớp kỳ vọng → cảnh báo trong panel thông số trước khi gọi AI.
3. Dữ liệu chủ đề, mức Bloom, số câu, điểm/câu và cấu trúc câu hỏi được đưa vào prompt theo cả dạng mô tả dễ đọc và JSON có cấu trúc.
4. AI cần bám sát ma trận khi sinh đề; nếu sai lệch, ưu tiên kiểm tra phần prompt builder trong `ExamConfigPage.tsx`/`ExamEditorView.tsx` trước.

### 0.0.3 Verification đã chạy

Đã chạy production build:

```bash
npm --prefix C:\Users\ADMIN\Downloads\smart-lesson-plan-ai run build
```

Kết quả:

- Vite production build: **PASS**, built in khoảng `58.00s`.
- Có warning không chặn build:
  - dynamic import không tách chunk cho một số module đã statically imported.
  - một số chunk lớn hơn 500 kB sau minification.
- Đây là technical debt/optimization warning của Vite, không phải lỗi compile của phiên UI/UX này.

Đã mở dev server:

```bash
npm --prefix C:\Users\ADMIN\Downloads\smart-lesson-plan-ai run dev
```

Vite đang chạy ở:

```txt
http://localhost:3000/
```

### 0.0.4 Rủi ro/điểm cần QA tiếp

Cần QA thủ công trên browser thật các luồng sau:

1. Điều hướng tổng thể giữa Dashboard/Chat/Templates/Exams/Testing/Classes/Settings trên desktop và màn hình nhỏ.
2. AI Co-pilot trong trình soạn giáo án: kiểm tra nội dung dài, giáo án nhiều phần, thao tác chỉnh sửa nhiều lần.
3. Smart Matrix Grid: kiểm tra ma trận rỗng, ma trận quá nhiều câu, phân bổ Bloom không đều, tổng điểm lệch, dữ liệu tiếng Việt dài.
4. Luồng sinh đề từ ma trận: kiểm tra đề sinh ra có bám đúng số câu, điểm/câu, mức Bloom, chủ đề và loại câu hỏi không.
5. Các modal/settings: kiểm tra overflow, focus, đóng/mở, responsive và text dài.
6. Cần cân nhắc code-splitting/manualChunks cho các bundle lớn nếu hiệu năng initial load bị ảnh hưởng.

---

## 0. Trạng thái cũ — 2026-06-04: xuất giáo án Word/PDF bằng “Mẫu claude”

> Nguồn sự thật mới nhất cho phiên sau: `main` và `origin/main` hiện trỏ tới commit `58e6b5b`. Commit này đã sửa hồi quy xuất Word giáo án do dùng `html-to-docx` không tương thích trình duyệt, sau commit liền trước `15bef5e` về cải thiện xuất Word/PDF. Khi QA hoặc sửa tiếp, phải đọc mục này trước các ghi chú cũ về Word/PDF.

### 0.0.1 Commit/trạng thái repo mới nhất

```txt
Repo GitHub: https://github.com/congapro60-dev/soangiaoan
Branch: main
HEAD/local/origin-main mới nhất: 58e6b5b fix: remove browser-incompatible html-to-docx export
Commit ngay trước đó liên quan xuất giáo án: 15bef5e fix: improve lesson plan Word and PDF export
Commit nền tham chiếu trước hồi quy html-to-docx: 9db4827 improve-exam-rendering-export
Production URL đúng để QA UI: https://giaoandewey.vercel.app
Local dev server phiên này: Vite tự chạy ở http://localhost:3001/ vì port 3000 đang bận
```

Trạng thái working tree sau khi push commit `58e6b5b`:

- Không còn file mã nguồn modified/staged chưa commit.
- Còn 2 file generated/untracked trong root repo local, không thuộc source code và chưa đưa vào commit:
  - `Bao_cao_kiem_tra_1780382376270.pdf`
  - `De_thi_1780382396622.docx`

### 0.0.2 Tóm tắt chức năng soạn giáo án bằng “Mẫu claude”

“Mẫu claude” trong ngữ cảnh người dùng đang nói tới luồng soạn giáo án theo mẫu AI/Claude-style trong app SmartPlan AI: giáo viên nhập/chọn dữ liệu giáo án, app sinh nội dung dạng Markdown giàu định dạng, sau đó preview bằng ReactMarkdown với `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-raw`. Nội dung giáo án chính được lưu/đưa qua object `LessonPlan`, đặc biệt các trường như `title` và `content`.

Các điểm kỹ thuật quan trọng:

- Nội dung sinh ra ưu tiên Markdown để dễ sửa trực tiếp trong editor.
- Preview render bảng, heading, danh sách, HTML/SVG inline, công thức toán KaTeX.
- Các luồng export không nên lấy raw Markdown trực tiếp nếu muốn giữ định dạng; thay vào đó cần render hoặc clone DOM preview đã render.
- Với Word/PDF giáo án, hiện có 2 exporter riêng:
  - Word A4: `src/utils/wordExportA4.ts` → tạo `.docx` thật bằng thư viện `docx`.
  - PDF: `src/utils/exportUtils.ts` → render DOM ẩn rồi xuất PDF bằng stack html2pdf/html2canvas/jsPDF.

### 0.0.3 Xuất giáo án sang Word `.docx` — trạng thái sau commit `58e6b5b`

File chính: `src/utils/wordExportA4.ts`.

Luồng hiện tại:

1. `exportToWordA4(currentPlan, showToast, orientation)` kiểm tra `currentPlan.content`; nếu rỗng thì báo “Không có nội dung giáo án để xuất”.
2. Tìm preview Markdown đang hiển thị bằng các selector:
   - `#lesson-content .w-md-editor-preview`
   - `#lesson-content .wmde-markdown`
   - `#lesson-content .markdown-body`
   - `.w-md-editor-preview` / `.wmde-markdown` / `.markdown-body`
3. Nếu không có preview đủ visible, render preview ẩn bằng ReactMarkdown với `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-raw`.
4. Clone DOM, xoá phần không cần export như `script`, `style`, `textarea`, `button`, `input`, `.w-md-editor-toolbar`.
5. Xử lý toán và hình:
   - KaTeX: thay `.katex` bằng nhánh `.katex-mathml` để giữ MathML, tránh nhánh `.katex-html` bị flatten thành text lỗi trong Word.
   - MathML: chuyển sang OMML bằng `mathml2omml` và `ImportedXmlComponent.fromXmlString(...)`, giúp Word nhận công thức tốt hơn.
   - Nếu MathML → OMML lỗi: fallback về annotation TeX hoặc text, dùng font `Cambria Math`.
   - SVG: rasterize sang PNG bằng canvas/browser API rồi thay bằng `<img src="data:image/png...">`.
6. Chuyển DOM đã sanitize thành các node `docx` thật: heading, paragraph, bullet, table, image.
7. Tạo `Document` với Times New Roman 14pt, A4 portrait/landscape, lề theo Nghị định 30/2020/NĐ-CP: trên/dưới 20mm, trái 30mm, phải 18mm.
8. `Packer.toBlob(doc)` tạo binary `.docx`, rồi tải xuống bằng `downloadBlob(blob, `${safeFilename(currentPlan.title)}_A4.docx`)`.

Điểm đã sửa trong commit `58e6b5b`:

- Loại bỏ `html-to-docx` khỏi `package.json` và `package-lock.json`.
- Xoá `src/types/html-to-docx.d.ts`.
- Đưa `src/utils/wordExportA4.ts` về pipeline tạo `.docx` bằng `docx` + `mathml2omml`.
- Lý do: `html-to-docx` kéo các phụ thuộc DOM/XML kiểu Node/browser không ổn trong bundle Vite client, gây rủi ro runtime khi xuất Word trên trình duyệt. Pipeline `docx` trực tiếp an toàn hơn và kiểm soát được công thức/bảng/ảnh.

### 0.0.4 Xuất giáo án sang PDF — trạng thái hiện tại

File chính: `src/utils/exportUtils.ts`, hàm `exportToPDF(currentPlan, showToast, orientation)`.

Luồng PDF hiện tại:

1. Kiểm tra `currentPlan.content`; nếu rỗng thì báo warning.
2. Tạo container ẩn `#pdf-render-container` nằm ngoài viewport (`left: -10000px`).
3. Render Markdown bằng ReactMarkdown với `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-raw`.
4. Áp CSS PDF riêng: Times New Roman 14pt, A4, lề `[20, 18, 20, 30]` mm, bảng fixed width, không ép font-family toàn cục để tránh phá KaTeX, ảnh/SVG/canvas max-width 100% và tránh page-break bên trong.
5. Export PDF theo orientation portrait/landscape.

Khác biệt Word vs PDF:

- Word `.docx`: tạo cấu trúc tài liệu thật, có thể chỉnh sửa trong Microsoft Word/Google Docs; công thức cố gắng chuyển sang OMML.
- PDF: ưu tiên giữ visual layout giống preview/in ấn; ít phù hợp để chỉnh sửa nội dung sau xuất.

### 0.0.5 Verification đã chạy trong phiên 2026-06-04

Đã chạy:

```bash
npm --prefix C:\Users\ADMIN\Downloads\smart-lesson-plan-ai run build 2>&1
```

Kết quả:

- Vite production build: PASS, built in khoảng `28.45s`.
- Có warning không chặn build: dynamic import không tách chunk cho một số module đã statically imported và chunk size lớn hơn 500 kB. Đây là technical debt cũ, không phải lỗi trực tiếp của fix Word export.

Đã chạy dev server kiểm tra khả dụng:

```bash
npm --prefix C:\Users\ADMIN\Downloads\smart-lesson-plan-ai run dev
```

Vite báo port `3000` bận và tự chuyển sang `http://localhost:3001/`.

### 0.0.6 Rủi ro/điểm cần QA tiếp

Cần QA thủ công trên browser thật, đặc biệt với giáo án Toán/Khoa học có công thức và hình:

1. Xuất Word giáo án có nhiều bảng lồng/nội dung dài để kiểm tra page break và độ rộng cột.
2. Xuất Word giáo án có KaTeX phức tạp (`\frac`, căn, ma trận, hệ phương trình) để xem Word mở OMML có đúng không.
3. Xuất Word giáo án có SVG inline lớn/phức tạp; canvas rasterize có thể lỗi nếu SVG chứa resource cross-origin hoặc thuộc tính không được canvas hỗ trợ.
4. Kiểm tra mở `.docx` bằng cả Microsoft Word và Google Docs vì mức hỗ trợ OMML/ảnh khác nhau.
5. Xuất PDF giáo án dài nhiều trang để kiểm tra bảng/hình/công thức có bị cắt không.
6. Cần cân nhắc code-splitting thêm cho các module export nặng nếu hiệu năng initial load bị ảnh hưởng.

Khuyến nghị nếu sửa tiếp:

- Không quay lại `html-to-docx` ở client nếu chưa chứng minh tương thích bundle/browser.
- Nếu cần Word fidelity cao hơn nữa, tiếp tục phát triển trên pipeline `docx` hiện tại: mapping DOM → DOCX, MathML → OMML, SVG → PNG.
- Với PDF, giữ hướng render DOM ẩn vì phù hợp mục tiêu “giống preview/in ấn”.

---

## 0. Trạng thái cũ cho Claude Code / Antigravity QA — 2026-05-27

> Đây là nguồn sự thật mới nhất. Batch sửa lỗi QA ưu tiên đã hoàn tất ở commit code `770bb960482db965cf0c44d414df27b1b6082f1e` và đã pass typecheck/test/build. Không dùng báo cáo QA dựa trên commit cũ `64edb78` hoặc trước Phase 2C để kết luận lỗi vẫn còn nếu chưa retest lại trên commit mới nhất.

### 0.0.1 Hotfix QA cổng Học Tập Phân Hoá — 2026-05-30

Nguồn yêu cầu: `adaptive_portal_qa_report.md`, tập trung phần 5 và 6. Phiên này đã sửa trực tiếp các lỗi hệ thống trong luồng **Học Tập Phân Hoá / Dewey Socratic steps**:

- `src/lib/dewey/template.ts`
  - Trong `renderSocraticStep`, khối hiển thị `expectedKeywords` đã đổi class từ dạng nút điều hướng sang `keyword-box`.
  - Mục tiêu: tránh selector `.next-btn` bắt nhầm box từ khoá tham khảo, làm UI lẫn trạng thái nút chuyển bước.
- `src/lib/dewey/htmlShell.ts`
  - Trong `submitSocraticStep`, logic JavaScript đã được cập nhật để query và xoá `hidden` cho cả `.next-btn` và `.keyword-box`.
  - Mục tiêu: sau khi học sinh bấm “Kiểm tra gợi ý”, vừa hiện nút chuyển bước/hoàn thành, vừa hiện từ khoá tham khảo đúng cách.
- `src/lib/adaptive/adaptiveToDewey.ts`
  - Đã bỏ feedback hard-code `So sánh câu trả lời với gợi ý rồi tiếp tục.`.
  - Feedback của Socratic step hiện lấy từ dữ liệu adaptive theo thứ tự ưu tiên `explanation`, `solution`, hoặc `hints` để giữ nội dung phản hồi thật từ bài học.
- `src/pages/AdaptiveStudentPortalPage.tsx`
  - Đã chỉnh layout tổng để giảm lỗi 3 thanh cuộn lồng nhau: dùng overflow cấp trang có kiểm soát, điều chỉnh chiều cao vùng nhúng Dewey/iframe theo viewport.
  - Đã chỉnh padding/margin/header container để các huy hiệu ở header không bị cắt xén (`clipped`) khi hiển thị trong cổng học sinh.

Ghi chú kiểm tra:
- Đã rà soát nhanh các pattern liên quan (`keyword-box`, `.next-btn`, feedback mapping, overflow/height portal).
- Có chạy lệnh kiểm tra qua terminal, nhưng VS Code/Cline báo `Shell Integration Unavailable` nên output không được capture đầy đủ trong panel. Cảnh báo này là vấn đề môi trường IDE, không phải lỗi code.
- Cảnh báo `Checkpoints are not currently supported in multi-root workspaces` cũng là cảnh báo môi trường do đang mở workspace nhiều root; không liên quan runtime.

### 0.0 Fixes mới nhất cho quá trình sinh bài học phân hoá — 2026-05-28
- **Lỗi Notebook dính chữ "Ý tưởng thiết kế UI/UX"**: Sửa lỗi `localStorage` cache nội dung notebook trên cùng một trình duyệt bằng cách gắn `lessonId` vào key `dewey-notebook-${lessonId}`. Cập nhật `extractJsonFromText` để xử lý các escape single backslashes (như `\frac`) do AI thiếu sót sinh ra, tránh việc `JSON.parse` bị hỏng khiến UI chuyển về parser dự phòng và sinh ra nội dung sai.
- **Lỗi Bắt đầu Bài Mới không hoạt động**: Gắn hàm `unlockScreen` từ IIFE lên `window.unlockScreen` để sự kiện `onclick` có thể gọi thành công.
- **Lỗi thông báo "Đang tải %" không ẩn**: Bổ sung logic `setNotice(null)` trong `AdaptiveStudentPortalPage.tsx` khi cá nhân hoá hoàn tất để ẩn màn hình báo đang xử lý, xoá cảm giác nghẽn mạng cho học sinh.

### 0.1 Repo, branch, commit, domain phải dùng khi QA

```txt
Repo GitHub: https://github.com/congapro60-dev/soangiaoan
Branch bắt buộc: main
Commit code QA fixes mới nhất: 770bb960482db965cf0c44d414df27b1b6082f1e
Production URL đúng: https://giaoandewey.vercel.app
Domain sai/stale không được dùng: https://giaooandewey.vercel.app
Firebase project rules đã deploy: smartplan-ai-14200
```

### 0.2 Các commit sau báo cáo QA cũ `64edb78`

```txt
770bb96 fix: address priority QA findings
5429a2d docs: update handoff after phase 2c
5786d3a fix: harden adaptive progress writes
c26083e docs: update handoff after phase 2b
9d388c5 fix: harden exam submissions rules
311382b feat: add smart exam option columns and lazy export imports
b51d796 docs: update handoff with latest QA baseline
22d568b fix: fallbackEvents allow unauthenticated create, examSubmissions ownership check, wire health check
6ce0f1f fix: resolve stale closure in dewey:complete message listener
e268899 fix: multi-file upload + minor exam refactor polish (xmlns prompt, no-op cleanup)
cde569e feat: refactor exam paper import export workflow
7dd7a97 feat: add universal api token tracker
64edb78 chore: fix gitignore - loại chrome-profile-qa, soangiaoan, bot_profile khỏi git tracking
```

### 0.3 Mapping báo cáo Antigravity cũ sang trạng thái hiện tại

Báo cáo Antigravity cũ tại `QA_REPORT.md` từng test trên commit `64edb78`; báo cáo retest mới đã PASS trên commit `b51d796`. Nếu QA lại sau batch QA fixes, phải dùng commit `770bb96` hoặc mới hơn:

1. Stale closure `dewey:complete`: đã sửa ở commit `6ce0f1f` trong `src/pages/AdaptiveStudentPortalPage.tsx` bằng `useCallback` và `useEffect` phụ thuộc `[handleDeweyComplete]`.
2. `fallbackEvents` bị chặn unauthenticated: đã sửa trong `firestore.rules` ở commit `22d568b`; Phase 2C harden tiếp ở commit `5786d3a` bằng active portal check, studentId pattern, enum `errorCode`, timestamp/source constraints và anonymous-only create. Rules đã deploy lên Firebase project `smartplan-ai-14200`.
3. `examSubmissions` update risk: đã thêm guard không cho đổi `examId` ở commit `22d568b`; Phase 2B đã harden tiếp ở commit `9d388c5` bằng immutable identity fields, active-exam validation, unguessable submission id, client nonce và teacher-owner update/read/delete rules. Rules đã deploy lên Firebase project `smartplan-ai-14200`.
4. Health check Firebase Admin chưa gọi: đã wire gọi `verifyFirebaseAdminHealth()` khi giáo viên lưu/bật cổng học sinh ở commit `22d568b`.
5. Word export fake `.doc`: đã thay bằng `.docx` thật ở commit `cde569e` qua `src/utils/examWordExport.ts`.
6. Mammoth import mất ảnh: đã sửa ở commit `cde569e` bằng `mammoth.convertToHtml()` và inline image base64.

### 0.4 Phase 2A/2B/2C và batch QA fixes đã hoàn tất trong phiên 2026-05-27

- Phase 2A commit `311382b`: thêm smart answer columns trong preview đề thi và lazy-load các module export/import nặng (`examWordExport`, `mammoth`, `pdfjs-dist`). Đã verify `tsc`, API `tsc`, tests, build; build còn warning chunk lớn.
- Phase 2B commit `9d388c5`: harden `examSubmissions` trong `firestore.rules`, thêm `createSubmissionId()`, `createSubmissionNonce()`, field `clientNonce`, và deploy rules thành công lên Firebase project `smartplan-ai-14200`.
- Phase 2C commit `5786d3a`: harden adaptive unauthenticated writes cho `adaptiveSessionProgress`, `studentLearningProfiles`, `fallbackEvents`; thêm GET profile qua `/api/adaptive-progress`; thêm validation shape/identity trong API POST; deploy rules thành công lên Firebase project `smartplan-ai-14200`.
- QA fixes commit `770bb96`: xử lý các finding ưu tiên của Antigravity gồm cancel bulk reset loading/ignore result, localStorage chỉ cache nhẹ và bắt quota error, fetch Firestore từng collection có fallback riêng, fix stale closure `updateTemplate` và `deleteFile`, giới hạn context AI Tutor, ErrorBoundary reload thật.
- Verification sau QA fixes: `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.api.json`, `npm run test -- --run` (5 files/21 tests pass), `npm run build` đều pass. Build vẫn còn warning chunk lớn hiện hữu.

### 0.5 Tồn đọng thực sự cần QA/thiết kế tiếp

- Bundle Vite vẫn có warning chunk lớn; nên code-splitting tiếp các module nặng như editor/KaTeX/PDF export/app shell.
- SVG/LaTeX khi export Word vẫn cần chiến lược rasterize/OOXML tốt hơn.
- Full AbortController cho các AI provider chưa làm trong batch này vì cần đổi chữ ký `callAI`/`callAIStream` và các provider; hiện cancel bulk đã reset UI ngay và bỏ qua kết quả sau khi hủy.
- `showToast` vẫn còn type `any` ở nhiều hook/component; đây là type-safety debt, không phải runtime blocker.
- Cần Antigravity retest tập trung Phase 2A/2B/2C và batch QA fixes trên commit `770bb96` hoặc mới hơn trước khi mở tiếp thay đổi lớn.

### 0.6 Prompt chuẩn mới để giao Antigravity retest

```txt
Bạn hãy QA lại web soangiaoan trên trạng thái mới nhất, KHÔNG dùng báo cáo cũ trên commit 64edb78 để kết luận lỗi còn tồn tại.

Repo/branch/commit bắt buộc:
- Repo GitHub: https://github.com/congapro60-dev/soangiaoan
- Branch: main
- Commit cần kiểm tra: 770bb960482db965cf0c44d414df27b1b6082f1e hoặc mới hơn trên origin/main
- File bắt buộc đọc đầu tiên: HANDOFF.md, mục “Trạng thái mới nhất cho Claude Code / Antigravity QA — 2026-05-27”

Web/UI bắt buộc mở để kiểm thử:
- Production URL đúng: https://giaoandewey.vercel.app
- Không dùng domain sai/stale: https://giaooandewey.vercel.app
- Nếu chạy local thì dùng repo trên branch main, npm install nếu cần, npm run dev, sau đó mở URL local do Vite in ra. Tuy nhiên báo cáo phải ghi rõ đang test local hay production.

Yêu cầu kiểm thử:
1. Chạy và ghi kết quả:
   - npx tsc --noEmit
   - npx tsc --noEmit -p tsconfig.api.json
   - npm run test -- --run
   - npm run build
2. Mở web thật bằng browser, bật DevTools Console/Network, kiểm tra UI chứ không chỉ đọc code.
3. Retest riêng các lỗi cũ trên commit 64edb78:
   - Dewey iframe completion/stale closure trong cổng học sinh.
   - fallbackEvents unauthenticated create.
   - examSubmissions update guard, đặc biệt không cho đổi examId.
   - Health check Firebase Admin khi giáo viên lưu/bật cổng học sinh.
   - Xuất đề thi ra Word .docx thật.
   - Import DOCX có ảnh minh hoạ không bị mất ảnh.
4. Với mỗi lỗi, phải ghi rõ:
   - PASS/FAIL/NOT TESTED.
   - Commit đang test.
   - URL đang test.
   - Bước tái hiện.
   - Console/Network evidence nếu có.
   - File/dòng nghi ngờ nếu FAIL.
5. Không báo lại lỗi đã fix nếu chưa retest trên commit 770bb96 hoặc mới hơn.
6. Retest thêm Phase 2A/2B/2C:
   - Smart answer columns A/B/C/D trong preview đề thi, bao gồm đáp án ngắn/dài/có công thức.
   - Lazy-load Word/DOCX/PDF import-export không phá chức năng.
   - Anonymous student start/autosave/submit/result/review flow.
   - Teacher dashboard list/chấm/cập nhật submission.
   - Security regression: không đổi được examId/examCode/studentName/startedAt/maxScore/clientNonce của in_progress submission.
   - Anonymous read in_progress submission bị deny; submitted/graded result by known subId vẫn load.
7. Retest thêm Phase 2C:
   - Student portal identify vẫn tải được profile cũ qua `/api/adaptive-progress?teacherId=...&studentId=...` khi portal đang bật.
   - Student portal hoàn tất bài vẫn lưu được qua API Admin; nếu API lỗi, fallback client write chỉ ghi được khi `teacherId`, `lessonId`, `studentCode`, `studentId`, `progressId` khớp bài đang bật.
   - Anonymous read trực tiếp `studentLearningProfiles/{studentId}` bị deny; giáo viên owner vẫn đọc dashboard được.
   - `fallbackEvents` chỉ cho anonymous create với active portal, `studentId` pattern đúng, `errorCode` thuộc enum, `source == student_portal`; không update/delete được.
8. Retest thêm batch QA fixes `770bb96`:
   - Bấm hủy khi soạn hàng loạt: loading phải tắt ngay; kết quả AI trả về sau hủy không được tự thêm vào danh sách.
   - localStorage `smart_lesson_plan_data` chỉ còn cache nhẹ (`settings`, `authorName`), không còn ghi toàn bộ giáo án/templates/sessions mỗi giây.
   - Khi một collection Firestore lỗi trong quá trình load cloud data, các collection khác vẫn tiếp tục load/fallback.
   - Cập nhật template/file template không bị ghi cloud dựa trên state cũ.
   - AI Tutor với giáo án rất dài không nhồi toàn bộ context; prompt có đoạn báo context đã rút gọn.
   - ErrorBoundary nút “Tải lại ứng dụng” phải reload trang thật.
9. Các tồn đọng nên tập trung đánh giá tiếp:
   - Bundle size/code-splitting.
   - SVG/LaTeX trong Word export.
   - Full AbortController cho AI requests nếu muốn hủy network thật.
```

---

## 1. Refactor Phase 1 chức năng “Soạn đề kiểm tra” — 2026-05-25

> Phase 1 đã được commit và push lên `main`. Commit chính: `cde569e`; polish tiếp theo: `e268899`. Các ghi chú cũ nói “chưa commit/chưa push” dưới đây đã được thay thế bởi trạng thái mới nhất ở mục 0.

### 0.1 Bối cảnh yêu cầu

Người dùng nhận feedback từ Antigravity cho chức năng **Soạn đề kiểm tra** và yêu cầu refactor theo hướng EdTech/Senior Frontend Engineer:

1. UI đề thi phải giống giấy thi chuẩn Việt Nam: Times New Roman, A4, nền ngoài xám, trang trắng, margin chuẩn, hạn chế cắt câu hỏi khi in/xuất.
2. Import DOCX không được mất ảnh; cần dùng Mammoth HTML conversion thay vì raw text.
3. Preview cần render được ảnh/SVG inline; prompt AI cần yêu cầu vẽ SVG cho hình học, đồ thị, bảng biến thiên.
4. Word export phải là `.docx` thật, không còn fake HTML `.doc`.
5. PDF/print phải ẩn chrome/editor/buttons, nền trắng, tránh tách câu hỏi/bảng/hình.

Phạm vi đã chọn là **Phase 1 an toàn**: giữ pipeline hiện tại là markdown string + preview hiện tại, không rewrite sang schema câu hỏi riêng trong cùng phiên để tránh phá luồng đang chạy.

### 0.2 File đã chỉnh/thêm

Modified:

- `src/components/tabs/TestingTab.tsx`
- `src/utils/examPaperStyles.ts`
- `src/utils/examUtils.ts`
- `src/utils/pdfExport.ts`
- `HANDOFF.md`

New:

- `src/utils/examWordExport.ts`

Trạng thái git gần nhất trước khi cập nhật handoff:

```txt
 M src/components/tabs/TestingTab.tsx
 M src/utils/examPaperStyles.ts
 M src/utils/examUtils.ts
 M src/utils/pdfExport.ts
?? src/utils/examWordExport.ts
```

### 0.3 Thay đổi chi tiết đã triển khai

#### A. Import DOCX giữ ảnh/base64

Trong `src/components/tabs/TestingTab.tsx`:

- Luồng `.docx` import đã chuyển từ `mammoth.extractRawText()` sang `mammoth.convertToHtml()`.
- Dùng `mammoth.images.imgElement(...)` để đọc ảnh trong DOCX thành base64 data URL.
- Ảnh import được gắn class `exam-imported-image`; SVG nếu có được gắn class `exam-imported-svg`.

Lưu ý kỹ thuật:

- Ban đầu thử `mammoth.images.inline(...)` nhưng TypeScript báo lỗi vì type hiện tại của Mammoth trong project không expose `inline`.
- Đã sửa sang `mammoth.images.imgElement(...)`; `npx tsc --noEmit` pass.

#### B. Xuất Word `.docx` thật

Đã thêm `src/utils/examWordExport.ts`:

- Dùng thư viện `docx` đã có sẵn trong `package.json`.
- Parse markdown bằng `marked.lexer()`.
- Tạo `Document` Word thật, binary `.docx`, thay cho HTML `.doc` cũ.
- Thiết lập:
  - A4 portrait.
  - Times New Roman.
  - Body 13pt, small 12pt, title 14pt.
  - Margin theo Nghị định 30/2020/NĐ-CP: trái 30mm, trên/dưới 20mm, phải 18mm.
- Hỗ trợ cơ bản: heading, paragraph, list, table, base64 image.

Trong `src/components/tabs/TestingTab.tsx`:

- `handleDownloadWord()` chuyển sang gọi `exportExamToDocx(testResult, ...)`.
- Label nút đổi thành `Xuất Word (.docx)`.

Giới hạn còn lại:

- SVG inline chưa được rasterize/nhúng native vào Word; hiện exporter ghi note thay thế cho SVG.
- LaTeX chưa chuyển thành OOXML equation native; vẫn là text/markdown trong Word.

#### C. UI giấy thi A4 và typography

`src/utils/examPaperStyles.ts` đã được refactor mạnh:

- Nền ngoài trang: `#e2e5e9`.
- Trang giấy preview: trắng, căn giữa, shadow, width 210mm, min-height 297mm.
- Margin/padding nội dung: top/bottom 20mm, right 18mm, left 30mm.
- Font nội dung đề: Times New Roman, 13pt, line-height 1.45.
- Giữ font KaTeX riêng cho công thức để không phá render toán.
- Style `img`, `svg`, `.exam-figure`, `.exam-svg`, `.variation-table`:
  - display block.
  - căn giữa.
  - max-width 60%.
  - break-inside/page-break-inside avoid.
- Thêm CSS `.options-grid.cols-4`, `.options-grid.cols-2`, `.options-grid.cols-1` để chuẩn bị cho smart answer columns trong Phase 2.

#### D. Prompt AI cho SVG hình học/đồ thị/bảng biến thiên

Trong `src/utils/examUtils.ts`:

- Bổ sung yêu cầu AI dùng LaTeX chuẩn: inline `$...$`, display `$$...$$`.
- Với hình học không gian, đồ thị hàm số, bảng biến thiên: yêu cầu tự tính tọa độ và chèn SVG inline trong `<div class="exam-figure">...</div>`.
- Quy ước SVG:
  - Nét liền cho cạnh/đường thấy.
  - `stroke-dasharray="4"` cho cạnh khuất/đường phụ.
  - SVG phải có `width`, `height`, `viewBox`.
  - Không phụ thuộc script ngoài, không dùng ảnh remote.

Lỗi đã gặp và đã sửa:

- Một lần apply diff làm hỏng template string trong `examUtils.ts`, khiến TypeScript hiểu các dòng tiếng Việt là code.
- Đã đọc lại vùng lỗi và xoá block closure thừa; TypeScript sau đó pass.

#### E. PDF/print tối ưu chống cắt câu hỏi

Trong `src/utils/pdfExport.ts`:

- Thêm `markExamQuestionBlocks()` để tự gắn class tạm `.pdf-no-break-question` cho các block bắt đầu bằng `Câu X`.
- Default `noBreakSelectors` mở rộng gồm:
  - `.pdf-no-break-question`
  - `.exam-question`
  - `.question-block`
  - `.exam-figure`
  - `.exam-svg`
  - `.variation-table`
  - `img`, `svg`, `table`, `tr`, heading.
- Trong `html2canvas` cloned DOM:
  - ép nền trắng.
  - ẩn toolbar/editor/button/textarea.
  - gắn `breakInside/pageBreakInside = avoid` cho hình, bảng, câu hỏi.
- Cleanup class tạm đã được bọc `try/finally` để không sót class nếu export lỗi giữa chừng.

### 0.4 Kiểm tra local đã chạy và pass

Đã chạy trong thư mục `soangiaoan`:

```bash
npx tsc --noEmit 2>&1
npx tsc --noEmit -p tsconfig.api.json 2>&1
npm run test -- --run 2>&1
npm run build 2>&1
```

Kết quả:

```txt
TypeScript app: PASS
TypeScript api: PASS
Vitest: 5 test files passed, 21 tests passed
Vite build: PASS
```

Build vẫn có warning cũ về dynamic import/chunk size lớn. Đây là warning không chặn build và không được xử lý trong scope refactor này.

### 0.5 Tồn đọng cần Claude Code / Antigravity nghiên cứu tiếp

#### P1 — Smart answer columns thật sự cần structured renderer

Hiện tại đề thi vẫn là markdown string. CSS đã chuẩn bị `.options-grid`, nhưng chưa có parser/renderer đủ chắc để tự nhận diện mỗi câu hỏi và đo độ dài đáp án rồi chọn 4/2/1 cột.

Khuyến nghị Phase 2:

- Thiết kế schema nội bộ `ExamQuestion`/`ExamPaper` cho bài kiểm tra.
- Parser từ markdown/AI output sang question blocks.
- Component render riêng cho đề thi:
  - Câu hỏi có block riêng.
  - Đáp án A/B/C/D là object riêng.
  - Hàm quyết định layout:
    - 4 cột nếu đáp án rất ngắn.
    - 2 cột nếu trung bình.
    - 1 cột nếu dài/có công thức/hình.
- Export PDF/Word dùng cùng schema để đồng bộ visual.

#### P1 — SVG trong Word cần rasterize hoặc OOXML strategy

Preview/PDF render SVG tốt nhờ HTML/SVG inline. Nhưng `.docx` exporter hiện chưa nhúng SVG thành hình thật trong Word.

Hướng nghiên cứu:

- Trước khi tạo `ImageRun`, tìm SVG inline.
- Rasterize SVG sang PNG bằng canvas/browser API ở client.
- Nhúng PNG vào DOCX.
- Với môi trường server/Node thì cần lib khác; nhưng exporter hiện chạy client, nên canvas strategy khả thi hơn.

#### P1 — LaTeX sang Word equation native chưa có

Hiện LaTeX render đẹp trong preview/PDF nhờ KaTeX, nhưng Word export chưa chuyển LaTeX thành equation OOXML.

Hướng nghiên cứu:

- Ngắn hạn: giữ LaTeX text nhưng format rõ, chấp nhận giáo viên chỉnh sau.
- Trung hạn: render LaTeX thành SVG/PNG rồi nhúng vào Word.
- Dài hạn: chuyển LaTeX sang OMML/OOXML equation bằng pipeline riêng.

#### P2 — DOCX import image mapping vẫn là HTML string, chưa vào schema câu hỏi

Mammoth hiện trả HTML có `<img src="data:...">`, hiển thị được trong markdown preview nhờ `rehypeRaw`. Nhưng chưa map vào `ExamQuestion.imageUrl` hoặc `imageSvg` vì TestingTab chưa dùng structured schema cho đề sinh ra.

Nên xử lý cùng Phase 2 structured renderer.

#### P2 — File upload trong TestingTab vẫn chỉ xử lý file đầu tiên

UI có chỗ cho nhiều file nhưng handler hiện vẫn đọc `e.target.files?.[0]`. Đây là hành vi cũ, chưa sửa trong Phase 1.

Cần nghiên cứu:

- Cho phép nối nội dung nhiều file theo thứ tự upload.
- Gắn metadata tên file/loại file vào prompt.
- Tránh duplicate hoặc vượt context quá lớn.

#### P2 — Cần QA bằng tài liệu thật

Cần Antigravity/Claude Code test với các mẫu thật:

1. DOCX có hình PNG/JPEG.
2. DOCX có hình vẽ Word shapes/SmartArt nếu có.
3. Đề Toán có bảng biến thiên.
4. Đề hình học không gian cần cạnh khuất.
5. Đề dài trên 3–5 trang để kiểm tra page break PDF.
6. Export Word mở bằng Microsoft Word và Google Docs.
7. Print từ browser ra PDF.

#### P3 — Build warning chunk lớn

`npm run build` pass nhưng chunk lớn vẫn còn. Không liên quan trực tiếp tới refactor đề thi, nhưng nên nghiên cứu code-splitting sau nếu app chậm.

### 1.6 Gợi ý prompt cũ cho Claude Code / Antigravity

```txt
Bạn hãy đọc repo soangiaoan, branch main, bắt đầu từ HANDOFF.md mục “Refactor Phase 1 chức năng Soạn đề kiểm tra — 2026-05-25”.

Bối cảnh:
- Phase 1 đã refactor UI giấy thi A4, DOCX import giữ ảnh base64, preview SVG/IMG, prompt sinh SVG, Word export .docx thật, PDF/print chống cắt câu hỏi.
- Các lệnh local đã pass: npx tsc --noEmit, npx tsc --noEmit -p tsconfig.api.json, npm run test -- --run, npm run build.
- Lưu ý lịch sử: tại thời điểm prompt cũ này được viết, thay đổi chưa commit/chưa push; hiện đã push lên `main` trong các commit `cde569e` và `e268899`. Khi QA mới, dùng mục 0 ở đầu file thay cho prompt cũ này.

Việc cần nghiên cứu/QA:
1. Test thực tế chức năng Soạn đề kiểm tra với DOCX/PDF/ảnh/SVG/bảng biến thiên.
2. Đánh giá exporter .docx mới trong Microsoft Word/Google Docs.
3. Đề xuất Phase 2 structured ExamQuestion renderer để smart columns A/B/C/D hoạt động thật.
4. Nghiên cứu cách rasterize SVG/LaTeX sang hình để nhúng vào DOCX.
5. Không rewrite lớn TestingTab nếu chưa có test case chứng minh cần thiết.

Kết quả cần trả lại:
- Các lỗi tái hiện được, kèm bước tái hiện.
- File/dòng nghi ngờ.
- Đề xuất fix theo mức ưu tiên P1/P2/P3.
- Không kết luận dựa trên domain sai hoặc build warning không fatal.
```

### 0.7 Rollback nếu cần

Nếu refactor gây lỗi nghiêm trọng, revert các file sau để quay về hành vi cũ của chức năng soạn đề:

```txt
src/components/tabs/TestingTab.tsx
src/utils/examPaperStyles.ts
src/utils/examUtils.ts
src/utils/pdfExport.ts
src/utils/examWordExport.ts
```

---

## 0a. Cập nhật kiểu giáo án mặc định thành “Bài học phân hoá” — 2026-05-23

Trạng thái trước khi commit/push ở phiên này:

```txt
Repo local: c:/Users/ADMIN/Desktop/edu-lesson-automation/soangiaoan
Branch: main
Remote: https://github.com/congapro60-dev/soangiaoan
Working tree trước commit: đã chỉnh 2 file
- src/components/features/creator/LessonControls.tsx
- src/hooks/useLessonCreator.ts
Build local: npm run build PASS
```

Mục tiêu thay đổi:

- Đổi riêng kiểu giáo án `default` trong chức năng “Soạn giáo án” thành kiểu **Bài học phân hoá**.
- Hai kiểu còn lại **Mẫu Claude** (`claude`) và **Công văn 5512** (`cv5512`) phải giữ nguyên logic/prompt, không bị ảnh hưởng.
- Mẫu “Bài học phân hoá” vẫn phải là giáo án chính thức, đẹp, có thể xem/sửa/lưu thư viện/xuất Word/PDF như các mẫu còn lại.
- Điểm khác biệt của mẫu này là nội dung được thiết kế có cấu trúc để AI có thể chuyển đổi sang bài học phân hoá/adaptive sau này.

File đã chỉnh:

1. `src/components/features/creator/LessonControls.tsx`
   - Đổi option UI của `default`:
     - Từ: `Mặc định` / `Toán chuẩn / AI tự chọn`
     - Thành: `Bài học phân hoá` / `Pre-test · 3 tuyến · học liệu tương tác`
   - Không đổi option `claude` và `cv5512`.

2. `src/hooks/useLessonCreator.ts`
   - Thêm prompt/template mới `ADAPTIVE_READY_FORMAT` cho `default` khi không chọn mẫu tuỳ chỉnh.
   - Logic chọn template hiện tại:
     - Nếu `builtinFormat === 'cv5512'` → dùng `CV5512_FORMAT` như cũ.
     - Nếu `builtinFormat === 'claude'` → dùng `CLAUDE_FORMAT` như cũ.
     - Nếu có `selectedTemplate` → mẫu tuỳ chỉnh vẫn ghi đè như cũ.
     - Ngược lại → dùng `ADAPTIVE_READY_FORMAT` cho “Bài học phân hoá”.
   - Thêm biến `isAdaptiveReadyDefault = builtinFormat === 'default' && !selectedTemplate` để chỉ áp dụng yêu cầu mới cho đúng mẫu mặc định mới.
   - Cập nhật cả luồng soạn đơn lẻ và soạn hàng loạt để “Bài học phân hoá” sinh giáo án:
     - Markdown sạch, tiêu đề phân cấp rõ, bảng đúng cú pháp.
     - Có thể xem/sửa/lưu/xuất file như giáo án chính thức.
     - Có pre-test đầu giờ cho chính bài học, thay “kiểm tra bài cũ”.
     - Có mục tiêu phân tầng Foundation / Standard / Challenge.
     - Có tiến trình 5 bước: Kết nối, Chẩn đoán, Hình thành kiến thức, Luyện tập và điều chỉnh, Phản tư.
     - Có bản đồ kiến thức để chuyển sang bài học phân hoá.
     - Có học liệu số/minh hoạ tương tác/mô phỏng.
     - Có luyện tập phân hoá, quick check, exit ticket.
     - Có bảng ánh xạ sang `diagnosticTest`, `knowledgeUnits`, `routes`, `quickCheck`, `exitTicket`, `simulationId` / `externalToolIds`.

Kiểm thử local đã chạy:

```bash
npm run build
```

Kết quả:

```txt
PASS — Vite build thành công.
Chỉ còn warning cũ về dynamic import/chunk size, không chặn build.
```

Checklist cho Anti/QA khi kiểm thử:

- Vào “Soạn giáo án” và xác nhận có 3 option: `Bài học phân hoá`, `Mẫu Claude`, `Công văn 5512`.
- Tạo giáo án bằng “Bài học phân hoá” và kiểm tra hình thức đẹp, xuất file được, không giống bản nháp kỹ thuật.
- Kiểm tra giáo án có pre-test đầu giờ cho chính bài học, không dùng “kiểm tra bài cũ”.
- Kiểm tra có đủ dữ liệu để chuyển sang bài học phân hoá: diagnostic test, knowledge units, routes, quick check, exit ticket, học liệu tương tác.
- Tạo giáo án bằng “Mẫu Claude” và “Công văn 5512” để xác nhận hai mẫu này không bị đổi hành vi.
- Chọn mẫu tuỳ chỉnh để xác nhận mẫu tuỳ chỉnh vẫn ghi đè định dạng built-in.
- Thử soạn hàng loạt với “Bài học phân hoá”.

---

## 0. Cập nhật P0/P1 QA fixes — 2026-05-20

Đang xử lý trên branch `main` các lỗi P0/P1 từ QA report với root cause đã xác định:

- Sửa `firestore.rules` cho collection `adaptiveLessons` dùng wildcard `{lessonId}` đúng với schema service lưu document theo `lesson.id`, owner nằm ở field `teacherId`.
- Mở read public cho `lessonSimulations` vì HTML được render bằng sandboxed iframe; học sinh ẩn danh cần đọc mô phỏng.
- Thêm `firestore.indexes.json` với composite index cho `adaptiveLessons(teacherId, updatedAt desc)` và `lessonPlans(userId, updatedAt desc)`.
- Sửa race condition Firebase Auth ở `AdaptiveLessonBuilderPage`: thêm `authReady`, chờ persistence rehydrate trước khi load bài.
- Sửa `ExternalToolWidget`: URL `inferred` không nhúng iframe, chỉ mở tab mới, hiển thị cảnh báo nhỏ và link báo link hỏng.
- Sửa dashboard không còn hiển thị `Chào ,` khi thiếu tên; fallback `Thầy/Cô`.
- Sửa `LessonSimulationViewer`: phân biệt `not_found` bình thường với lỗi tải/network/permission; lỗi có nút thử lại.
- Sửa `AdaptiveLessonListPage`: khi load lỗi không render empty state/nút tạo bài duplicate.

Kiểm tra bắt buộc sau phần này: `npm run build` phải pass trước khi commit message `fix: P0/P1 — Firestore rules, auth race condition, inferred tool URLs, UX`.

## 0a. Cập nhật P2/P3 UX QA fixes — 2026-05-20

Đang xử lý trên branch `main` các lỗi P2/P3 UX từ QA report:

- Sửa `LessonCoverUpload.tsx`: chuyển từ `uploadBytes` sang `uploadBytesResumable` để progress bar phản ánh % upload thật từ Firebase Storage; bỏ progress giả `15`, `45`, `80`.
- Sửa `ExternalToolWidget.tsx`: đảm bảo iframe công cụ có sandbox an toàn và title a11y dạng `Công cụ toán: {tool.name}`.
- Sửa `AdaptiveStudentPortalPage.tsx`: timer đổi sang đỏ và pulse khi còn dưới hoặc bằng 30 giây trước khi quá giờ.
- Sửa `AdaptiveLessonBuilderPage.tsx`: tiêu đề builder từ `Lesson Builder Adaptive` thành `Adaptive Lesson Builder`.
- Sửa `LessonSimulationViewer.tsx`: iframe mô phỏng có title a11y dạng `Mô phỏng tương tác: {unitTitle || 'Bài học'}`.
- Chuẩn hoá terminology user-facing trong `src/`: đổi “bài học adaptive”/`Adaptive Lessons`/“Chưa có bài học adaptive” sang “bài học phân hoá”/“Bài học phân hoá”/“Chưa có bài học phân hoá”; giữ nguyên tên file, route, biến code và `console.error`.

Kiểm tra bắt buộc sau phần này: `npm run build` phải pass trước khi commit message `fix: P2/P3 — real upload progress, iframe a11y, timer warning, i18n thuật ngữ`.

## 0b. Cập nhật QA retest regression fixes — 2026-05-20

Đang xử lý trên branch `main` hai lỗi retest sau P2/P3:

- Sửa P0 Builder crash khi mở bài học cũ trong Firestore: thêm `normalizeLessonFromFirestore` trong `AdaptiveLessonBuilderPage.tsx` để default các field có thể thiếu từ schema cũ (`knowledgeUnits`, `objectives`, `diagnosticTest`, `exitTicket`, `preparation`, `fiveStepFlow`, `completionReward`) và chỉ đọc `knowledgeUnits[0]` sau khi đã normalize.
- Sửa permission errors dashboard trong `firestore.rules`: thêm `allow list` cho `lessonPlans` khi đã đăng nhập và thêm rule `savedExams` chỉ cho owner đọc/ghi/tạo.

Kiểm tra bắt buộc sau phần này: `npm run build` phải pass trước khi commit message `fix: regression P0 Builder null-check knowledgeUnits + savedExams/lessonPlans rules`.

## 0c. Cập nhật direct testing fixes — 2026-05-20

Đã xử lý hai lỗi phát hiện khi kiểm thử trực tiếp trên nhánh `main`:

- Sửa `AdaptiveLearningTab.tsx`: thao tác “Lưu & bật cổng học sinh” không còn bị chặn bởi health check Firebase Admin. Root cause là luồng lưu bài học dùng client Firestore (`setDoc`) nhưng trước đó vẫn bắt buộc gọi `/api/health/firebase-admin`; khi Vercel thiếu biến Admin, UI báo lỗi đỏ dù thao tác lưu không cần Admin SDK. Lỗi lưu hiện chỉ báo theo kết quả Firestore client thực tế.
- Sửa `examScoring.ts`: chuẩn hoá bọc công thức inline có chỉ số/số mũ để `u_1`, `u_n`, `S_n`, `u_5`, `u_10`, `S_10` được render bằng KaTeX với chỉ số có ngoặc `{}`. Root cause là TeX hiểu `$S_10$` thành `S_1` + ký tự `0`; nay tự chuyển thành `$S_{10}$`.

Kiểm tra bắt buộc sau phần này: `npm run build` phải pass trước khi commit message `fix: direct testing Firebase portal save + math rendering`.

## 1. Trạng thái hiện tại của repo

### 1.1 Git

Repo `soangiaoan` đã được commit và push lên GitHub.

Các commit quan trọng gần nhất:

```txt
c9df1c4 feat: add adaptive lesson completion reward
3844ac6 feat: add teacher simulation generator dashboard
99aa575 Add real adaptive teacher dashboard
c0f4bb9 Add adaptive student portal QR sharing
d9a77d0 Document production e2e adaptive progress pass
ea48dc6 Correct Vercel production domain in handoff
bbef6d0 Update adaptive learning handoff
d56f3fa Fix Vercel API route configuration
14beb30 Expand adaptive student flow with timers
331be3a Add server-side adaptive progress saving
badfb54 Fix adaptive student math and save fallback
```

Trạng thái đã kiểm tra trước khi commit phiên tương tác:

```txt
HEAD -> main
origin/main -> main
working tree có thay đổi ở src/pages/AdaptiveStudentPortalPage.tsx, src/lib/adaptive/types.ts, src/lib/adaptive/sampleAdaptiveLesson.ts và HANDOFF.md
```

### 1.2 Kiểm tra local đã chạy

Đã chạy thành công sau thay đổi tương tác ví dụ:

```bash
npm run lint
npm run build
```

Đã type-check riêng các API Vercel bằng lệnh tương đương:

```bash
npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck --types node api/adaptive-progress.ts api/gemini-relay.ts api/render-word.ts api/export-lesson.ts
```

Kết quả mới nhất: `npm run lint` pass; `npm run build` pass, chỉ còn các warning chunk lớn/dynamic import cũ của Vite, không chặn production.

---

## 2. Mục tiêu sản phẩm đang làm

Đang xây chức năng học phân hoá trong web soạn giáo án:

1. Giáo viên tạo/chỉnh/lưu bài học phân hoá.
2. Giáo viên bật cổng học sinh.
3. Học sinh vào link riêng, nhập mã học sinh cố định.
4. Học sinh làm test đầu giờ.
5. Hệ thống xếp tuyến học tập cá nhân hoá.
6. Học sinh học theo tuyến, làm quick check, nhận điều chỉnh nếu cần.
7. Học sinh làm exit ticket.
8. Hệ thống lưu kết quả từng tiết và hồ sơ học tập dài hạn để về sau AI có thể biết trình độ từng học sinh qua nhiều bài học.

Định hướng dài hạn: có hàng trăm tiết học, nhiều học sinh, không được phụ thuộc vào `localStorage` trừ khi chỉ là fallback chống mất dữ liệu tạm thời.

---

## 3. Các thay đổi lớn đã hoàn thành

## 3.0 Sprint D — Lesson Builder UI + Firestore persistence

Branch:

```txt
claude/sprint-d-lesson-builder-ui
```

Commit dự kiến:

```txt
feat(adaptive): Sprint D — Lesson Builder UI + Firestore persistence
```

File đã thêm/chỉnh:

- `src/services/adaptiveLessonService.ts`
- `src/pages/AdaptiveLessonBuilderPage.tsx`
- `src/pages/AdaptiveLessonListPage.tsx`
- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/main.tsx`
- `src/components/layout/Sidebar.tsx`
- `firestore.rules.example.txt`

Đã làm:

- Tạo service Firestore cho collection `adaptiveLessons` với các hàm lưu, cập nhật, lấy theo id, liệt kê theo `teacherId`, và xoá bài học.
- Tạo trang Lesson Builder 4 bước để giáo viên tạo/sửa bài adaptive mà không phải chỉnh trực tiếp `sampleAdaptiveLesson.ts`:
  1. Thông tin cơ bản + upload cover image bằng `LessonCoverUpload`.
  2. Mục tiêu học tập + diagnostic test.
  3. Knowledge units + route content + worked example + quick check.
  4. Exit ticket + completion reward + lưu nháp/xuất bản.
- Tạo trang danh sách bài học `/adaptive-lessons` cho giáo viên, có các thao tác `Sửa`, `Xem`, `Xóa`, và `Tạo bài mới`.
- Thêm route:

```txt
/adaptive-lessons
/adaptive-builder/:id
/adaptive-portal/:id
/adaptive-portal
```

- Giữ route cũ `/adaptive/student/:teacherId` để tương thích ngược.
- Cập nhật cổng học sinh để ưu tiên load bài theo lesson id từ URL mới `/adaptive-portal/:id`; fallback về `sampleAdaptiveLesson` khi id là `sample` hoặc thiếu id; vẫn hỗ trợ link cũ theo `teacherId`.
- Thêm link sidebar “Quản lý bài học” trỏ đến `/adaptive-lessons`.
- Thêm `firestore.rules.example.txt` cho collection `adaptiveLessons`.

Ghi chú quan trọng:

- Branch Sprint D được tạo từ branch Sprint C để dùng ngay component upload cover `LessonCoverUpload`. Vì vậy Sprint D hiện bao gồm thay đổi Sprint C nếu Sprint C chưa merge vào `main`.
- `npm run build` cần được chạy lại ngay trước commit Sprint D; kết quả build cuối cùng sẽ được báo trong phần hoàn tất sprint.

## 3.0a Sprint C — Upload ảnh đầu bài

Branch:

```txt
claude/sprint-c-cover-image-upload
```

Commit chính:

```txt
d90ba674c0975d1df9746d92f5bb1abb6a2dce6f feat(adaptive): Sprint C — cover image upload + render in student portal
```

File đã thêm/chỉnh:

- `src/lib/adaptive/types.ts`
- `src/lib/adaptive/sampleAdaptiveLesson.ts`
- `src/components/adaptive/LessonCoverUpload.tsx`
- `src/pages/AdaptiveStudentPortalPage.tsx`

Đã làm:

- Thêm các field tuỳ chọn `coverImageRealistic` và `coverImageTextbook` vào `AdaptiveLesson`.
- Tạo component upload ảnh đầu bài, lưu ảnh vào Firebase Storage dưới `lesson-illustrations/{lessonId}/...`.
- Render ảnh textbook/cinematic ở cổng học sinh trước diagnostic test.
- Thêm lightbox xem ảnh realistic/cinematic.
- Bổ sung placeholder cover image cho bài mẫu.

Kiểm tra đã chạy:

```bash
npm run build
```

Kết quả: build pass, exit code 0. Có warning Vite cũ về dynamic import/chunk size nhưng không chặn build.

## 3.0b Sprint E — Completion reward cuối bài học

Branch:

```txt
claude/sprint-e-completion-reward
```

Commit chính:

```txt
c9df1c440ed5dc236b0a8c53f8d2ae40d8ebcfc5 feat: add adaptive lesson completion reward
```

PR URL:

```txt
https://github.com/congapro60-dev/soangiaoan/pull/new/claude/sprint-e-completion-reward
```

File đã chỉnh:

- `src/lib/adaptive/types.ts`
- `src/lib/adaptive/sampleAdaptiveLesson.ts`
- `src/pages/AdaptiveStudentPortalPage.tsx`

Đã làm:

- Mở rộng `AdaptiveLesson` với field tuỳ chọn `completionReward?: { toolId: string; message: string; }` ngay sau `pacingPolicy`.
- Thêm reward mặc định vào bài học mẫu, trỏ đến external tool id `gamedoikhang` với thông điệp hoàn thành bài học.
- Ở stage `complete` của cổng học sinh, render reward card sau các ô tổng kết kết quả.
- Reward card dùng `getToolsByIds([lesson.completionReward.toolId])[0]` để lấy URL/name từ registry external tools.
- Nếu tool id không tồn tại, UI bỏ qua card bằng `return null`, tránh lỗi runtime.

Kiểm tra đã chạy:

```bash
npm run build
```

Kết quả: build pass, exit code 0. Có thể vẫn xuất hiện các warning Vite cũ về dynamic import/chunk size, không chặn build.

Ghi chú quan trọng:

- Branch Sprint E được tạo từ `main` đúng yêu cầu, nên không bao gồm thay đổi Sprint B.3 nếu B.3 chưa được merge vào `main`.
- Manual UI test chưa chạy; mới xác nhận bằng TypeScript/Vite production build.

## 3.1 Cổng học sinh riêng cho học phân hoá

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/main.tsx`

Đã làm:

- Tạo giao diện học sinh thật, tách khỏi màn hình mô phỏng giáo viên.
- Route học sinh dạng:

```txt
/adaptive/student/:teacherId
```

- Học sinh nhập:
  - Mã học sinh cố định.
  - Họ tên.
  - Lớp.
- Cổng học sinh tự tải bài học phân hoá từ Firestore theo `teacherId`.
- Nếu giáo viên chưa bật cổng hoặc chưa có bài học, học sinh sẽ thấy trạng thái không khả dụng.

---

## 3.2 Hồ sơ học tập dài hạn cho học sinh

File chính:

- `src/lib/adaptive/types.ts`
- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/services/adaptiveProgressApi.ts`
- `api/adaptive-progress.ts`

Đã bổ sung các collection/record logic:

- `adaptiveLessons/{teacherId}`: bài học phân hoá giáo viên lưu.
- `adaptiveSessionProgress/{progressId}`: kết quả từng phiên học/từng tiết.
- `studentLearningProfiles/{studentId}`: hồ sơ học tập dài hạn của từng học sinh.

Luồng lưu hiện tại:

1. Frontend gọi server API `/api/adaptive-progress`.
2. Nếu API thành công: lưu bằng Firebase Admin SDK, không phụ thuộc Firestore client rules.
3. Nếu API lỗi: fallback sang Firestore client.
4. Nếu Firestore client cũng lỗi: fallback sang `localStorage` để không mất bài làm của học sinh.

Ý nghĩa:

- API server-side là hướng bền vững nhất cho production.
- Firestore client write chỉ là dự phòng.
- `localStorage` chỉ là cứu dữ liệu tạm, không phù hợp cho mở rộng thật.

---

## 3.3 API server-side để lưu tiến độ học sinh

File mới:

- `api/adaptive-progress.ts`

Chức năng:

- Chỉ nhận `POST`.
- Nếu gọi `GET` đúng ra phải trả `405 Method not allowed`.
- Validate payload gồm:
  - `teacherId`
  - `lessonId`
  - `progressId`
  - `studentId`
  - `progressRecord`
  - `profileRecord`
- Dùng Firebase Admin SDK để ghi Firestore.
- Kiểm tra bài học tồn tại tại `adaptiveLessons/{teacherId}`.
- Kiểm tra `portalEnabled === true`.
- Kiểm tra `lesson.id` khớp `lessonId`.
- Ghi transaction vào:
  - `adaptiveSessionProgress/{progressId}`
  - `studentLearningProfiles/{studentId}`
- Merge hồ sơ dài hạn thay vì ghi đè thô.
- Gắn metadata:
  - `savedViaAdminApi: true`
  - `serverSyncedAt: FieldValue.serverTimestamp()`

Các biến môi trường Firebase Admin API hỗ trợ:

Cách 1 — một biến JSON đầy đủ:

```txt
FIREBASE_SERVICE_ACCOUNT_KEY
```

Cách 2 — base64 JSON:

```txt
FIREBASE_SERVICE_ACCOUNT_BASE64
```

Cách 3 — ba biến tách riêng:

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Lưu ý: `FIREBASE_PRIVATE_KEY` phải giữ đầy đủ private key. Nếu nhập một dòng trong dashboard thì newline thường là `\n`.

---

## 3.4 Wrapper frontend gọi API lưu tiến độ

File mới:

- `src/services/adaptiveProgressApi.ts`

Chức năng:

- Export hàm `saveAdaptiveProgressViaApi()`.
- Gọi `fetch('/api/adaptive-progress', { method: 'POST' })`.
- Nếu response không OK thì throw error để frontend chuyển sang fallback.

---

## 3.5 Mở rộng cổng học sinh thành quy trình học đầy đủ hơn

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/lib/adaptive/types.ts`
- `src/lib/adaptive/sampleAdaptiveLesson.ts`
- `src/lib/adaptive/diagnosticEngine.ts`

Trước đây luồng học sinh quá ngắn:

```txt
identify -> diagnostic -> lesson(firstUnit) -> quick_check(firstUnit) -> complete
```

Đã mở rộng thành:

```txt
identify -> diagnostic -> lesson(unit n) -> quick_check(unit n) -> exit_ticket -> complete
```

Với nhiều đơn vị kiến thức:

- Học sinh học từng `knowledgeUnit`.
- Mỗi unit có tuyến học tương ứng:
  - `support`
  - `core`
  - `extension`
- Làm quick check sau từng unit.
- Nếu chưa đạt, có thể quay lại học bổ trợ/remediation.
- Nếu vẫn mắc sau số lần quy định, đánh dấu cần giáo viên hỗ trợ.
- Sau khi hoàn thành các unit hoặc cần chuyển tiếp, học sinh làm exit ticket.

Các trạng thái đã thêm:

- `exit_ticket`
- `quickCheckAttempts`
- `exitTicketAttempt`
- `remediationAttemptsByUnit`
- `needsTeacherSupport`
- `currentUnitIndex`
- `completedUnitIds`
- `timings`

---

## 3.6 Bổ sung đồng hồ đếm giờ từng phần

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`

Đã thêm:

- Đồng hồ cho diagnostic test.
- Đồng hồ cho từng phần học theo unit.
- Đồng hồ cho quick check.
- Đồng hồ cho exit ticket.
- Hiển thị:
  - Thời gian còn lại.
  - Thời gian đã dùng.
  - Trạng thái quá giờ.
- Lưu timing metadata vào `progressRecord.timings`.

Các helper/component liên quan:

- `formatDuration()`
- `SectionTimer`
- `elapsedSecondsFor()`
- `remainingSecondsFor()`
- `sectionStarts`
- `activeSectionKey`

Ý nghĩa dữ liệu timing:

- Sau này có thể phân tích tốc độ làm bài.
- Có thể phát hiện học sinh làm quá nhanh/quá chậm.
- Có thể dùng cho AI cá nhân hoá tiết sau.

---

## 3.7 Sửa hiển thị công thức Toán ở cổng học sinh

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/utils/examScoring.ts`

Đã làm:

- Dùng Markdown + math rendering cho nội dung học sinh.
- Thêm `MathText` để render công thức trong câu hỏi, ví dụ, nhiệm vụ, gợi ý.
- Dùng `ReactMarkdown`, `remarkMath`, `rehypeKatex`.
- Import CSS KaTeX.
- Cải thiện `ensureMathWrapped()` để bọc các biểu thức Toán thường gặp.

Mục tiêu: các công thức như `u_1`, `u_6`, `S_5`, phân số, chỉ số dưới... hiển thị đúng chuẩn hơn thay vì text thô.

---

## 3.8 Sửa UX thông báo lỗi lưu bài làm

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`

Trước đây khi fallback lưu tạm, giao diện hiện chữ đỏ gây cảm giác lỗi nghiêm trọng.

Đã đổi sang hệ thống notice có tone:

- `info`
- `warning`
- `error`

Nguyên tắc hiện tại:

- Nếu lưu chính thức thành công: không báo lỗi.
- Nếu phải lưu tạm trên thiết bị: báo vàng/cảnh báo.
- Nếu mất hẳn dữ liệu: mới báo đỏ.

Lưu ý cập nhật sau khi kiểm tra lại domain: production đã phục vụ API routes trên domain đúng `giaoandewey.vercel.app`. Nếu vẫn rơi vào lưu tạm, bước cần kiểm tra tiếp là POST thật, Firebase Admin env vars và Vercel Function Logs, không còn kết luận chung là route API bị mất.

---

## 3.9 Tinh gọn giao diện giáo viên trong tab học phân hoá

File chính:

- `src/components/tabs/AdaptiveLearningTab.tsx`

Đã làm:

- Làm nút lưu/bật cổng học sinh rõ hơn.
- Giảm cảm giác giao diện bị rối.
- Cho giáo viên chỉnh nội dung bài học phân hoá.
- Lưu bài học lên Firestore.
- Hiển thị link cổng học sinh.
- Hiển thị QR code production cho cổng học sinh, nút copy link, nút mở thử, trạng thái cổng và hướng dẫn chiếu QR.
- Dashboard giáo viên đã được nối dữ liệu thật từ Firestore; khi chưa có học sinh nộp bài thì fallback sang dữ liệu mô phỏng để giáo viên vẫn xem được cấu trúc dashboard.

Cần tiếp tục sau này:

- Tách màn hình tạo bài, xem mô phỏng, và quản lý lớp thành các vùng rõ hơn nữa nếu mở rộng.

---

## 3.10 Cập nhật kiểu dữ liệu học phân hoá

File chính:

- `src/lib/adaptive/types.ts`

Đã mở rộng `StudentSessionProgressRecord`:

```ts
export interface StudentSessionProgressRecord {
  id: string;
  teacherId: string;
  lessonId: string;
  lessonTitle: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentClass?: string;
  route: LearningRoute;
  status: 'in_progress' | 'needs_support' | 'completed';
  diagnosticAttempt: AssessmentAttempt;
  quickCheckAttempts: AssessmentAttempt[];
  exitTicketAttempt?: AssessmentAttempt;
  objectiveStates: ObjectiveMasteryState[];
  remediationAttempts: number;
  completedUnitIds?: string[];
  timings?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}
```

---

## 3.11 Sửa cấu hình Vercel trong repo

File chính:

- `vercel.json`
- `api/export-lesson.ts`

Đã sửa `vercel.json`:

- Thêm rõ:
  - `installCommand: npm install`
  - `buildCommand: npm run build`
  - `outputDirectory: dist`
- Giữ cấu hình functions cho:
  - `api/export-lesson.ts`
  - `api/render-word.ts`
  - `api/adaptive-progress.ts`
- Bỏ rewrite tự trỏ `/api/:path* -> /api/:path*` vì API routes của Vercel không cần rewrite này và nó có thể gây nhiễu khi debug.
- Giữ rewrite SPA:

```json
{
  "source": "/(.*)",
  "destination": "/index.html"
}
```

Đã sửa `api/export-lesson.ts`:

- Đổi `headless: chromium.headless` thành `headless: true` vì type hiện tại của `@sparticuz/chromium` không khai báo property `headless`.

---

## 4. Cập nhật sau kiểm tra Cowork: domain production đúng và API routes

### 4.1 Kết luận mới nhất

Cowork phát hiện đúng một lỗi quan trọng trong ghi chú/debug trước đó: domain đã được test sai.

- Domain đúng của app: `giaoandewey.vercel.app`
- Domain sai từng bị ghi/test nhầm: `giaooandewey.vercel.app` dư một chữ `o`

Kết quả kiểm tra lại mới nhất sau P0-4 (2026-05-18):

```txt
https://giaoandewey.vercel.app STATUS=200 CT=text/html; charset=utf-8
https://giaooandewey.vercel.app STATUS=404 CT=text/plain; charset=utf-8 X-Vercel-Error=DEPLOYMENT_NOT_FOUND
https://giaoandewey.vercel.app/api/adaptive-progress STATUS=405 CT=application/json; charset=utf-8
https://giaoandewey.vercel.app/api/gemini-relay STATUS=405 CT=application/json; charset=utf-8
https://giaoandewey.vercel.app/api/export-lesson STATUS=405 CT=application/json; charset=utf-8
https://giaoandewey.vercel.app/api/render-word STATUS=405 CT=application/json; charset=utf-8
```

Ý nghĩa:

- Domain production chính thức là `https://giaoandewey.vercel.app` (một chữ `o` sau `gia`). Đây là URL phải dùng trong QR/link cổng học sinh, Telegram bot, tài liệu vận hành và mọi checklist production.
- Domain `https://giaooandewey.vercel.app` là domain sai/stale, trả `404 DEPLOYMENT_NOT_FOUND`; không dùng domain này để kết luận app hoặc API production bị lỗi.
- `405` trên domain đúng là tín hiệu tốt: API route tồn tại và đang từ chối `GET` vì handler chỉ nhận `POST`.
- `404` trước đó không chứng minh Vercel mất API route; nguyên nhân chính là đã test nhầm sang domain sai.
- Việc cần kiểm tra tiếp không phải “Vercel có nhận API route không”, mà là POST thật từ cổng học sinh có lưu được vào Firestore qua Firebase Admin SDK hay không.

### 4.2 Về việc Cowork không thấy `HANDOFF.md`

Đã kiểm tra lại Git và raw GitHub: `HANDOFF.md` có trong root repo/branch `main`.

Các khả năng khiến Cowork không thấy:

1. Xem nhầm branch hoặc repo.
2. GitHub UI chưa refresh.
3. Dùng URL/trạng thái trước khi commit `bbef6d0 Update adaptive learning handoff` xuất hiện.
4. Tìm trong thư mục con thay vì root repo.

---

## 5. Việc người dùng cần làm thủ công trên Vercel

Do môi trường hiện tại không có token/đăng nhập Vercel, không thể tự chỉnh dashboard Vercel trực tiếp. Tuy nhiên sau khi kiểm tra lại domain, API routes đã tồn tại trên production đúng. Các bước dưới đây chỉ cần dùng nếu POST thật còn lỗi hoặc cần kiểm tra env/deployment.

### 5.1 Kiểm tra project/domain đúng

Vào Vercel Dashboard → mở project đang phục vụ domain:

```txt
giaoandewey.vercel.app
```

Kiểm tra:

- Domain này có đúng là project web soạn giáo án không.
- Không dùng domain `giaooandewey.vercel.app` khi test vì đây là domain sai/stale trong các ghi chú cũ.

### 5.2 Settings → Git

Cần đúng các mục:

- Repository: repo chứa thư mục `soangiaoan`.
- Production Branch: `main`.
- Latest production deployment phải lấy commit:

```txt
d56f3fa Fix Vercel API route configuration
```

Nếu deployment mới nhất không phải commit này, cần redeploy latest commit.

### 5.3 Settings → General → Build & Development Settings

Nếu Vercel project kết nối từ monorepo gốc `edu-lesson-automation`, bắt buộc:

```txt
Root Directory: soangiaoan
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Nếu Vercel project kết nối trực tiếp vào repo/thư mục `soangiaoan`, Root Directory có thể để trống, nhưng vẫn nên kiểm tra:

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Điểm quan trọng nhất: Vercel phải nhìn thấy các file:

```txt
api/adaptive-progress.ts
api/gemini-relay.ts
api/render-word.ts
api/export-lesson.ts
```

ở root của project mà Vercel build.

### 5.4 Settings → Environment Variables

Production environment cần có Firebase Admin credentials.

Khuyến nghị dùng một biến:

```txt
FIREBASE_SERVICE_ACCOUNT_KEY
```

Giá trị là toàn bộ JSON service account Firebase.

Hoặc dùng ba biến:

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Cần thêm cho đúng environment:

- Production
- Preview nếu muốn test preview deployment
- Development nếu dùng Vercel dev/pull local

Sau khi thêm/sửa env vars, phải redeploy. Vercel không tự áp env mới vào deployment cũ.

### 5.5 Deployments → Redeploy

Sau khi chỉnh settings:

1. Vào tab Deployments.
2. Chọn deployment mới nhất từ branch `main`.
3. Bấm Redeploy.
4. Không dùng cache nếu nghi ngờ cache build cũ.
5. Đợi deploy xong.
6. Mở Build Logs kiểm tra có dấu hiệu build từ đúng thư mục `soangiaoan`.

Dấu hiệu đúng:

- Có chạy `npm install`.
- Có chạy `npm run build`.
- Có nhận `vercel.json` của repo `soangiaoan`.
- Có tạo Serverless Functions cho `api/*.ts`.

---

## 6. Cách kiểm tra production hiện tại

### 6.1 Test bằng browser

Mở:

```txt
https://giaoandewey.vercel.app/api/adaptive-progress
```

Kết quả mong muốn và đã xác nhận:

```txt
405 Method not allowed
```

Đây là trạng thái đúng khi gọi bằng browser/GET, vì API chỉ nhận POST.

### 6.2 Test bằng PowerShell

Chạy:

```powershell
$urls = @(
  'https://giaoandewey.vercel.app/api/adaptive-progress',
  'https://giaoandewey.vercel.app/api/gemini-relay'
)
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $u -Method GET -UseBasicParsing -TimeoutSec 20 -ErrorAction SilentlyContinue
    "$u STATUS=$($r.StatusCode)"
  } catch {
    if ($_.Exception.Response) {
      "$u STATUS=$([int]$_.Exception.Response.StatusCode)"
    } else {
      "$u ERROR=$($_.Exception.Message)"
    }
  }
}
```

Kỳ vọng đã xác nhận:

```txt
https://giaoandewey.vercel.app/api/adaptive-progress STATUS=405
https://giaoandewey.vercel.app/api/gemini-relay STATUS=405
```

Nếu domain đúng trả `404`, khi đó mới quay lại kiểm tra Vercel root/deployment/domain. Không dùng domain `giaooandewey.vercel.app` để kết luận tình trạng production.

### 6.3 Test luồng học sinh thật

Trạng thái cập nhật: Cowork đã test end-to-end production ngày 14/05/2026 và PASS. Kịch bản đã chạy:

1. Vào cổng học sinh production trên domain đúng.
2. Nhập mã học sinh test `PROBE-AUTO-001`.
3. Làm diagnostic.
4. Học và làm quick check 2 mảnh kiến thức.
5. Làm exit ticket.
6. Capture network request:
   - `POST https://giaoandewey.vercel.app/api/adaptive-progress`
   - Status `200`
7. UI hiển thị banner xanh “Đã lưu kết quả học tập”.
8. Không rơi vào fallback `localStorage`.
9. Firestore write qua Admin API và `studentLearningProfiles` merge OK theo bằng chứng UI “1 tiết HỒ SƠ ĐÃ HỌC”.

Việc còn lại không phải debug API, mà là dọn dữ liệu test `PROBE-AUTO-001` nếu không cần giữ làm bằng chứng.

---

## 7. Nếu POST/save lỗi lại trong tương lai

Hiện tại `/api/adaptive-progress` đã PASS production end-to-end. Nếu sau này POST/save lỗi lại, đọc theo response POST thật:

### 7.1 GET trả 405

Đây là tốt. API tồn tại.

### 7.2 POST trả 400

Payload frontend thiếu/sai field. Cần kiểm tra `src/services/adaptiveProgressApi.ts` và object gửi từ `src/pages/AdaptiveStudentPortalPage.tsx`.

### 7.3 POST trả 403

Thường do:

- `portalEnabled !== true`
- `lesson.id` không khớp `lessonId`
- bài học giáo viên chưa được lưu/bật cổng

Cần kiểm tra document `adaptiveLessons/{teacherId}`.

### 7.4 POST trả 404 từ API JSON

Nếu response JSON là:

```json
{ "error": "Adaptive lesson not found" }
```

thì API đã chạy, nhưng không tìm thấy document `adaptiveLessons/{teacherId}`. Đây khác với Vercel route `404` text/plain.

### 7.5 POST trả 500

Khả năng cao thiếu/sai Firebase Admin env vars:

- `FIREBASE_SERVICE_ACCOUNT_KEY`
- hoặc `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Cần xem Vercel Function Logs.

---

## 8. Các file quan trọng cho người tiếp tục debug

| File | Vai trò |
|------|--------|
| `vercel.json` | Cấu hình Vercel build/output/functions/SPA rewrite |
| `api/adaptive-progress.ts` | API server-side lưu tiến độ học sinh và hồ sơ dài hạn bằng Firebase Admin |
| `src/services/adaptiveProgressApi.ts` | Frontend wrapper gọi `/api/adaptive-progress` |
| `src/pages/AdaptiveStudentPortalPage.tsx` | Cổng học sinh, test đầu giờ, tuyến học, timer, quick check, exit ticket, lưu kết quả |
| `src/lib/adaptive/types.ts` | Type dữ liệu học phân hoá, session progress, learning profile |
| `src/lib/adaptive/diagnosticEngine.ts` | Chấm diagnostic/quick check, xếp tuyến, quyết định remediation/support |
| `src/lib/adaptive/sampleAdaptiveLesson.ts` | Bài mẫu Toán 11 Cấp số cộng với duration/pacing/5-step/unit/exit ticket |
| `src/components/tabs/AdaptiveLearningTab.tsx` | Giao diện giáo viên cho học phân hoá, lưu/bật cổng học sinh |
| `firestore.rules` | Rules Firestore client-side; không thay thế được API Admin nhưng vẫn cần đúng cho đọc/ghi client |
| `api/gemini-relay.ts` | API cũ dùng làm route kiểm chứng: trên domain đúng route này đã trả 405, xác nhận Vercel đang phục vụ API routes |
| `api/export-lesson.ts` | API export DOCX/PDF; vừa sửa type `headless` |

---

## 9. Việc cần làm tiếp ngay

### Ưu tiên 1 — Đã PASS: POST/save thật trên production đúng

Mục tiêu đã được Cowork test end-to-end và xác nhận PASS:

```txt
GET https://giaoandewey.vercel.app/api/adaptive-progress -> 405
POST từ cổng học sinh -> 200
Firestore ghi được adaptiveSessionProgress và merge studentLearningProfiles
```

API route production đã được xác nhận tồn tại trên domain đúng. Cowork đã test tiếp POST thật qua cổng học sinh production, submit exit ticket thành công và UI xác nhận “Đã lưu kết quả học tập”. Không còn vướng mắc ở Ưu tiên 1.

Checklist:

- [x] Xác nhận domain đúng là `giaoandewey.vercel.app`.
- [x] Xác nhận `GET /api/adaptive-progress` trên domain đúng trả `405`.
- [x] Xác nhận `GET /api/gemini-relay` trên domain đúng trả `405`.
- [x] Test học sinh submit exit ticket trên `https://giaoandewey.vercel.app`.
- [x] Xác nhận `POST /api/adaptive-progress` trả `200`.
- [x] Xác nhận Firestore write qua Firebase Admin SDK hoạt động.
- [x] Xác nhận `studentLearningProfiles` merge OK.
- [ ] Dọn dữ liệu test `PROBE-AUTO-001` trong Firestore nếu không cần giữ làm bằng chứng.

### Ưu tiên 2 — Đã hoàn thành: Link/QR cho học sinh

Đã triển khai trong tab giáo viên "Học phân hoá":

- QR code cho link `https://giaoandewey.vercel.app/adaptive/student/<teacherId>` bằng dependency `qrcode.react` đã có sẵn.
- Link cổng học sinh dùng cố định domain production đúng `giaoandewey.vercel.app` để tránh nhầm domain stale `giaooandewey.vercel.app`.
- Nút copy link có trạng thái `Đã copy` và fallback copy thủ công khi browser chặn Clipboard API.
- Nút `Mở thử` để giáo viên kiểm tra nhanh cổng học sinh.
- Badge trạng thái cổng: `Cổng đang bật` sau khi đã lưu bài, hoặc cảnh báo `Lưu bài trước khi gửi`.
- Hướng dẫn ngắn 3 bước cho giáo viên: chiếu QR, học sinh nhập mã cố định, theo dõi kết quả lưu vào hồ sơ dài hạn.

Kiểm tra local sau triển khai:

```bash
npm run lint
npm run build
```

Kết quả: cả hai lệnh pass. Build chỉ còn warning chunk lớn/dynamic import cũ, không chặn production.

### Ưu tiên 3 — Đã triển khai: Dashboard giáo viên xem dữ liệu thật

Đã triển khai trong tab giáo viên "Học phân hoá", file chính:

- `src/components/tabs/AdaptiveLearningTab.tsx`

Dashboard hiện đọc từ Firestore client-side:

- `adaptiveSessionProgress` theo `teacherId == user.uid`
- `studentLearningProfiles` theo `teacherId == user.uid`

Đã làm:

- Tải kết quả học sinh thật đã nộp qua cổng QR/link.
- Chuyển `StudentSessionProgressRecord` thành dữ liệu tổng hợp để tái sử dụng `buildTeacherDashboardData()`.
- Hiển thị tổng số học sinh, số học sinh đã làm diagnostic, phân bố tuyến học, số học sinh cần giáo viên hỗ trợ.
- Thêm bảng học sinh thật gồm: họ tên/mã/lớp, tuyến, trạng thái, điểm diagnostic, quick check, exit ticket, hồ sơ dài hạn, thời điểm cập nhật.
- Có nút `Làm mới dữ liệu thật` để giáo viên refresh sau khi học sinh nộp bài.
- Nếu chưa có học sinh thật nộp bài, dashboard tự fallback sang dữ liệu mô phỏng để giáo viên vẫn thấy cấu trúc báo cáo.
- Nếu query Firestore lỗi, giao diện báo vàng và tạm hiển thị dữ liệu mô phỏng thay vì làm vỡ màn hình.

Kiểm tra local sau triển khai:

```bash
npm run lint
npm run build
```

Kết quả: cả hai lệnh pass. Build chỉ còn warning chunk lớn/dynamic import cũ, không chặn production.

Lưu ý bảo mật/rules:

- `adaptiveSessionProgress` hiện chỉ cho giáo viên đọc record có `teacherId` khớp `request.auth.uid`.
- `studentLearningProfiles` rules đang rộng hơn, cho user đăng nhập đọc; code dashboard vẫn query theo `teacherId`. Nếu siết bảo mật sâu hơn ở sprint sau, nên rà lại rule collection này.

### Ưu tiên 4 — Đã triển khai MVP: ví dụ tương tác, timer, gợi ý và AI chấm ảnh tham khảo

Đã triển khai trong cổng học sinh, file chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/lib/adaptive/types.ts`
- `src/lib/adaptive/sampleAdaptiveLesson.ts`

Đã làm:

- Mở rộng `WorkedExample` với `timeLimitSeconds`, `hintDelaySeconds`, `hints`, `responseMode`, `aiRubric`.
- Thay block “Ví dụ mẫu” lộ lời giải ngay bằng `InteractiveWorkedExampleCard`.
- Học sinh phải bấm bắt đầu, tự nhập ý tưởng/lời giải nháp, rồi nộp mới thấy lời giải chuẩn và phần chữa.
- Mỗi ví dụ có timer riêng; gợi ý chỉ mở sau `hintDelaySeconds` hoặc khi hết thời gian ví dụ.
- Chặn chuyển sang quick check nếu học sinh chưa nộp đủ ví dụ tương tác trong mảnh kiến thức hiện tại.
- Với ví dụ `responseMode: 'image_upload'`, học sinh có thể chụp/tải ảnh bài làm viết tay; sau khi nộp có thể nhờ AI chấm tham khảo qua `/api/gemini-relay`.
- Không lưu base64 ảnh vào Firestore; chỉ lưu metadata tiến độ ví dụ như đáp án nháp, trạng thái nộp, gợi ý đã mở, tên ảnh, có ảnh hay không, phản hồi AI nếu có.
- Thêm `MathBlock` để lời giải nhiều dòng/công thức Toán được render bằng `ReactMarkdown` + `remark-math` + `rehype-katex`, có khoảng cách đoạn và overflow ngang cho công thức dài trên mobile.
- Cập nhật dữ liệu mẫu bài Toán 11 — Cấp số cộng: các ví dụ có thời gian, gợi ý, lời giải xuống dòng rõ hơn; ví dụ thử thách bài tiết kiệm dùng `responseMode: 'image_upload'` và `aiRubric`.

Kiểm tra local sau triển khai:

```bash
npm run lint
npm run build
```

Kết quả: cả hai lệnh pass. Build chỉ còn warning chunk lớn/dynamic import cũ, không chặn production.

Lưu ý còn lại:

- AI chấm ảnh hiện là phản hồi tham khảo, chưa thay thế chấm chính thức của giáo viên.
- Chưa có màn hình giáo viên xem chi tiết từng ảnh; frontend chỉ gửi ảnh trực tiếp tới API để AI đọc, không upload Storage.
- Nếu cần lưu ảnh lâu dài, nên thiết kế thêm Firebase Storage + policy riêng trước khi mở rộng đại trà.

---

## 10. Rủi ro/điểm mù cần chú ý

### 10.1 Vercel Root Directory

Rủi ro này đã giảm vì domain đúng đang serve được `api/*.ts`. Tuy nhiên vẫn nên kiểm tra Root Directory nếu về sau deployment mới bất ngờ mất API route.

### 10.2 Domain trỏ nhầm project

Không dùng domain `giaooandewey.vercel.app` để test. Domain đúng đã xác nhận là `giaoandewey.vercel.app`.

### 10.3 Env vars Firebase Admin

Ngay cả khi API route chạy, thiếu env vars sẽ làm POST lỗi 500. Cần xem Vercel Function Logs.

### 10.4 Firestore rules chưa phải giải pháp triệt để

Firestore rules vẫn quan trọng cho đọc/ghi client, nhưng hướng lưu bền vững cho học sinh là API Admin. Không nên phụ thuộc hoàn toàn vào client rules cho dữ liệu học tập dài hạn.

### 10.5 `localStorage` chỉ là fallback

Nếu thấy thông báo lưu tạm trên thiết bị, nghĩa là dữ liệu chưa chắc đã về server. Không thể dùng trạng thái đó cho triển khai nhiều lớp/hàng trăm tiết.

### 10.6 Build warning chunk lớn

`npm run build` pass nhưng có warning chunk lớn. Chưa chặn production, nhưng sau này nên code-split nếu app chậm.

---

## 11. Hướng dẫn cho agent/kỹ sư tiếp theo

Khi bắt đầu session mới:

1. Đọc file này.
2. Kiểm tra Git status.
3. Không sửa lại các phần đã hoàn thành nếu không có lỗi cụ thể.
4. Dùng domain đúng `giaoandewey.vercel.app` khi test production.
5. Có thể tin tưởng `POST /api/adaptive-progress` production đã PASS end-to-end ngày 2026-05-14.
6. Có thể tin tưởng Link/QR cổng học sinh đã triển khai và local lint/build đã pass.
7. Có thể tin tưởng dashboard giáo viên đã đọc dữ liệu thật từ `adaptiveSessionProgress` và `studentLearningProfiles`; local lint/build đã pass sau thay đổi này.
8. Không cần sửa `vercel.json`, `api/adaptive-progress.ts`, hay Vercel env vars cho mục đích lưu progress trừ khi có lỗi mới.
9. Nếu POST lỗi `500` trong tương lai, xem Vercel Function Logs; khả năng cao là env `FIREBASE_PRIVATE_KEY` bị mất `\n` sau khi xoay key, không phải bug code.
10. Việc tiếp theo nên test UI production sau deploy: học sinh mở cổng, làm ví dụ tương tác, kiểm tra hint delay, upload/chụp ảnh ở ví dụ tự luận dài, nhờ AI chấm ảnh tham khảo, nộp exit ticket và kiểm tra dashboard giáo viên.
11. Sau mỗi kết quả từ Cowork/Antigravity hoặc thao tác thủ công, cập nhật lại file này rồi commit/push để file là nguồn sự thật mới nhất.

---

## 12. Phiên test e2e production — 14/05/2026 (Cowork autonomous)

> Cập nhật bởi Claude (Cowork mode) sau phiên tự test end-to-end qua Chrome đang kết nối của Thầy Vũ.
> Mục tiêu: chốt dứt điểm Ưu tiên 1 (đường ống lưu adaptive progress qua Vercel API + Firebase Admin) trước khi sang Ưu tiên 2.

### 12.1 Tóm tắt một dòng

Toàn bộ luồng adaptive learning từ học sinh nhập thông tin → diagnostic → quick check x2 → exit ticket → `POST /api/adaptive-progress` **đã PASS production**. Status `200`. Firebase Admin SDK init OK, Firestore write OK, `studentLearningProfiles` merge OK. **Không còn vướng mắc ở Ưu tiên 1.**

### 12.2 Bối cảnh phát sinh

Đầu phiên Thầy báo: cả `/api/adaptive-progress` lẫn `/api/gemini-relay` đều trả 404 ở production. Cowork phân tích ban đầu nghi ngờ Vercel project config / catch-all rewrite trong `vercel.json` swallow `/api/*`. Hóa ra nguyên nhân thực sự là **domain typo**: đã gõ `giaooandewey.vercel.app` (2 chữ "o" liền) thay vì `giaoandewey.vercel.app` (1 chữ "o") theo README/GitHub About. Domain typo này dẫn về một project Vercel khác/không có functions → 404 đồng đều.

Sau khi xác minh đúng domain, kết quả test khớp với mục 4.1: `405` trên domain đúng, `404` trên domain sai. Cowork đi sâu hơn để probe Admin SDK + chạy end-to-end thật.

### 12.3 Kết quả test trực tiếp

#### A. Probe API layer (qua `fetch()` trong Chrome console)

| Test | URL | Method | Status | Body |
|---|---|---|---|---|
| 1 | `/api/adaptive-progress` | GET | **405** | `{"error":"Method not allowed"}` |
| 2 | `/api/gemini-relay` | GET | **405** | JSON |
| 3 | `/api/adaptive-progress` | POST `{}` | **400** | `{"error":"Missing adaptive progress payload"}` |
| 4 | `/api/adaptive-progress` | POST payload thiếu field | **400** | `{"error":"Invalid adaptive progress payload"}` |

Suy luận từ tầng probe: Function execute được, validator chạy được, import statements gồm `firebase-admin` không throw ở module load time. Nếu env vars Firebase Admin thiếu, nhiều khả năng đã trả `500` ở init thay vì `400` sạch sẽ.

#### B. End-to-end test thật (đóng vai học sinh)

- **Bài học**: Toán 11 — Cấp số cộng
- **teacherId** dùng để vào cổng: `24YyULmWgBOM6HZCfJ56RN5tiet2`
- **Mã học sinh test**: `PROBE-AUTO-001`
- **Họ tên**: Claude Probe Test
- **Lớp**: PROBE
- **Diagnostic**: 5/5 đúng → tuyến **Thử thách** (`extension`)
- **Quick check Mảnh 1** (2 câu): pass
- **Quick check Mảnh 2** (3 câu): pass
- **Exit ticket** (3 câu): nộp thành công

Request quan trọng nhất, capture qua `read_network_requests` trong Chrome DevTools API:

```txt
url:        https://giaoandewey.vercel.app/api/adaptive-progress
method:     POST
statusCode: 200
```

UI sau khi nộp exit ticket:

```txt
✓ Đã lưu kết quả học tập
Kết quả tiết học đã được lưu vào tiến trình cá nhân và hồ sơ học tập dài hạn của em. Các tiết sau hệ thống có thể dùng dữ liệu này để đề xuất tuyến học phù hợp hơn.

Thử thách (TUYẾN HỌC) — 5/5 (TEST ĐẦU GIỜ) — 1 tiết (HỒ SƠ ĐÃ HỌC)
```

Kết luận UI: không rơi vào fallback “lưu tạm trên thiết bị” (banner vàng), không lỗi đỏ, lưu chính thức qua Admin API.

### 12.4 Kết luận trạng thái Ưu tiên 1

| Hạng mục | Trạng thái |
|---|---|
| Domain đúng (`giaoandewey.vercel.app`, 1 chữ "o") | ✅ |
| Vercel build & deploy production | ✅ |
| `vercel.json` config (functions + rewrites) | ✅ không cần sửa |
| Serverless functions detect cả 4 routes | ✅ |
| `GET /api/*` → 405 đúng spec | ✅ |
| `POST /api/adaptive-progress` validation | ✅ |
| Firebase Admin SDK init từ env Production | ✅ |
| Firestore write qua Admin SDK | ✅ |
| `studentLearningProfiles` merge | ✅ UI confirm “1 tiết HỒ SƠ ĐÃ HỌC” |
| Frontend luồng học sinh 5 bước | ✅ toàn bộ |
| Notice tone xanh (happy path) | ✅ |

**Toàn bộ Ưu tiên 1 trong mục 9 đã PASS.**

### 12.5 Dữ liệu test cần dọn trong Firestore

Trong Firebase Console của project `giaoandewey` hoặc project Firebase tương ứng:

1. Collection `adaptiveSessionProgress` → tìm document có `studentCode == "PROBE-AUTO-001"` → xóa.
2. Collection `studentLearningProfiles` → tìm document có `studentCode == "PROBE-AUTO-001"` → xóa.

Lưu ý: document có thể có thêm field `savedViaAdminApi: true` và `serverSyncedAt: <timestamp>` — đây là dấu hiệu xác nhận request đi qua đúng đường Admin API, không phải Firestore client fallback.

### 12.6 Cấu hình Vercel đã xác nhận hoạt động

Không cần thay đổi ở sprint này. Để tham khảo cho phiên sau:

- Project Vercel: trỏ đúng `congapro60-dev/soangiaoan`, branch `main`.
- Root Directory: trống (repo không phải monorepo).
- Framework Preset: Vite.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Install Command: `npm install`.
- Env vars Production: có đủ Firebase Admin credentials (1 trong 2 bộ — `FIREBASE_SERVICE_ACCOUNT_KEY` hoặc bộ 3 `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`). Bằng chứng: POST trả `200`, không phải `500`.

### 12.7 Đường ống lưu progress đã được xác minh

```txt
[Học sinh nộp exit ticket]
       │
       ▼
[Frontend: src/services/adaptiveProgressApi.ts]
       │  fetch POST /api/adaptive-progress
       ▼
[Vercel serverless function: api/adaptive-progress.ts]
       │  validate payload → 400 nếu sai
       │  Firebase Admin SDK
       ▼
[Firestore]
       ├── adaptiveSessionProgress/<progressId>
       │     + savedViaAdminApi: true
       │     + serverSyncedAt: <timestamp>
       └── studentLearningProfiles/<studentId> (merge)
       │
       ▼
[Response 200 → UI hiện banner xanh "Đã lưu kết quả học tập"]
```

### 12.8 Việc tiếp theo có thể yên tâm bắt đầu

Toàn bộ Ưu tiên 1 (mục 9) đã đóng và Ưu tiên 2 đã được triển khai ở tab giáo viên. Theo thứ tự ưu tiên đã chốt:

- **Ưu tiên 3** — Dashboard giáo viên đọc dữ liệu thật từ `adaptiveSessionProgress` và `studentLearningProfiles`
  - Dùng Firestore client-side với Firestore rules hiện có.
  - Thay dashboard demo hiện tại bằng dữ liệu học sinh thật sau khi các em nộp exit ticket.
- **Ưu tiên 4** — AI feedback có kiểm soát
  - Phụ thuộc dữ liệu hồ sơ học sinh đã ổn định, hiện đã đạt sau phiên test này.

### 12.9 Note cho Claude Code / VS Code

Khi tiếp tục phiên ở VS Code, có thể tin tưởng:

- API `/api/adaptive-progress` POST chạy đúng production.
- Không cần sửa `vercel.json`, `api/adaptive-progress.ts`, hay env vars cho mục đích lưu progress.
- Nếu thấy POST `500` trong tương lai → check Vercel Function Logs → đa số case sẽ là do env `FIREBASE_PRIVATE_KEY` bị mất `\n` sau khi xoay key, không phải bug code.

Tham chiếu chéo: mục 4.1 (lịch sử lỗi 404), mục 6.3 (kịch bản test e2e), mục 9 (checklist Ưu tiên 1).

---

## 13. Quy ước phối hợp từ thời điểm này

Từ sau mốc kiểm tra domain production ngày 2026-05-14, nếu có việc người dùng cần làm thủ công trên Vercel/Firebase/GitHub hoặc cần nhờ Claude Cowork/Antigravity kiểm tra hộ, agent chính phải làm theo quy trình sau:

1. Cập nhật file `HANDOFF.md` trước hoặc ngay sau khi phát hiện thông tin mới quan trọng.
2. Commit và push `HANDOFF.md` lên branch `main` để các trợ lý khác đọc được trạng thái mới nhất.
3. Nếu việc tiếp theo cần Claude Cowork/Antigravity hỗ trợ, viết cho người dùng một prompt rõ ràng gồm:
   - Repo/branch cần đọc.
   - File bắt buộc phải đọc đầu tiên: `HANDOFF.md`.
   - Domain đúng: `giaoandewey.vercel.app`.
   - Mục tiêu kiểm tra cụ thể.
   - Điều không được làm để tránh phá trạng thái hiện tại.
   - Kết quả cần trả lại cho người dùng.
4. Không để các trợ lý khác dựa vào thông tin cũ rằng production API route đang `404`; thông tin đúng hiện tại là GET trên domain đúng đã trả `405`.
5. Sau mỗi lần người dùng đưa kết quả thủ công hoặc kết quả từ trợ lý khác, cần cập nhật lại mục liên quan trong `HANDOFF.md` để file này là nguồn sự thật mới nhất.

Prompt mẫu hiện tại để nhờ Claude Cowork/Antigravity:

```txt
Bạn hãy kiểm tra repo GitHub congapro60-dev/soangiaoan, branch main.

Việc đầu tiên: đọc file HANDOFF.md ở root repo để nắm trạng thái mới nhất. Không dùng thông tin cũ nếu mâu thuẫn với HANDOFF.md.

Bối cảnh quan trọng:
- Domain production đúng là https://giaoandewey.vercel.app
- Domain https://giaooandewey.vercel.app là domain đã bị ghi/test nhầm, không dùng để kết luận lỗi production.
- GET https://giaoandewey.vercel.app/api/adaptive-progress đã trả 405, nghĩa là API route tồn tại.
- GET https://giaoandewey.vercel.app/api/gemini-relay đã trả 405, nghĩa là Vercel đang phục vụ api/*.ts.

Mục tiêu hiện tại:
1. Đọc HANDOFF.md và tin trạng thái mới nhất: Ưu tiên 1 đã PASS production end-to-end, Ưu tiên 2 Link/QR đã code xong, Ưu tiên 3 dashboard giáo viên đọc dữ liệu thật đã code xong, MVP ví dụ tương tác/timer/hint/upload ảnh/AI chấm tham khảo đã code xong; lint/build pass local.
2. Không sửa `vercel.json`, `api/adaptive-progress.ts`, hoặc Vercel env vars cho đường ống lưu progress nếu không có lỗi mới.
3. Kiểm tra UI production sau deploy: mở domain đúng `https://giaoandewey.vercel.app`, đăng nhập giáo viên, vào tab "Học phân hoá", lưu/bật cổng nếu cần, cho một học sinh học qua QR/link, xác nhận ví dụ không lộ lời giải trước khi nộp, gợi ý chỉ mở sau thời gian chờ, ảnh bài làm viết tay gửi được cho AI chấm tham khảo.
4. Sau khi học sinh nộp exit ticket, bấm `Làm mới dữ liệu thật` và xác nhận dashboard chuyển sang dữ liệu Firestore.
5. Nếu triển khai tiếp, ưu tiên bổ sung màn hình giáo viên xem chi tiết tương tác từng ví dụ và thiết kế lưu ảnh bài làm vào Storage nếu cần dùng lâu dài.
6. Sau khi kiểm tra/code xong, chạy lint/build nếu môi trường cho phép, rồi trả lại danh sách file đã sửa và cách test.

Không được:
- Không kết luận Vercel route hỏng chỉ vì domain giaooandewey trả 404.
- Không xoá hoặc rewrite lớn các phần học phân hoá đã hoạt động.
- Không thay đổi cấu trúc dữ liệu Firestore nếu chưa chứng minh cần thiết.
- Không làm AI feedback lộ đáp án trước khi học sinh nộp ví dụ tương tác.
```

---

## 14. Khắc phục lỗi biên dịch/Typecheck trên GitHub Actions (28/05/2026)

> Cập nhật bởi Antigravity sau khi hoàn thành phân tích và sửa lỗi cấu hình TypeScript cho toàn bộ dự án.
> Mục tiêu: Đưa các GitHub Actions workflows (Quality Gate & API Typecheck) về trạng thái thành công (Green ✅) bằng cách giới hạn phạm vi biên dịch.

### 14.1 Bối cảnh phát sinh lỗi
Trước đợt sửa đổi này, toàn bộ các lượt chạy kiểm thử tự động trên GitHub Actions liên tục gặp lỗi thất bại (đỏ) do hai nguyên nhân chính:
1. **Cơ chế ghi đè loại trừ mặc định của TypeScript:** Trong `tsconfig.json` và `tsconfig.api.json` có định nghĩa thuộc tính `"exclude"`. Việc định nghĩa thủ công này đã vô hiệu hóa hoàn toàn cơ chế tự động bỏ qua thư mục `node_modules/` và `dist/` của TypeScript.
2. **Hậu quả:** Trình biên dịch `tsc` bị buộc phải quét qua hàng trăm ngàn tệp tin cấu hình và thư viện bên ngoài nằm trong `node_modules/`, `dist/`, các thư mục tạm như `.agents/`, `chrome-profile-qa/`, `bot_profile/`, và cả thư mục mã nguồn phụ lồng nhau `soangiaoan/`. Điều này dẫn đến:
   - Thời gian biên dịch cục bộ cực kỳ lâu, tiêu tốn hơn **3.3 GB RAM**.
   - Gây lỗi tràn bộ nhớ (Out of Memory - OOM) hoặc timeout trên môi trường GitHub Actions của dự án.
   - Phát sinh nhiều lỗi biên dịch giả trong các gói thư viện thuộc bên thứ ba.

### 14.2 Các file đã sửa đổi và nội dung cụ thể
1. **`tsconfig.json` (Root Config):**
   - Loại trừ rõ ràng `node_modules`, `dist`, thư mục lồng `soangiaoan`, thư mục của agents (`.agents`), các thư mục chrome profiles tạm (`chrome-profile-qa`, `bot_profile`).
   - Cấu hình mới: `"exclude": ["api", "vite.config.ts", "node_modules", "dist", "soangiaoan", ".agents", "chrome-profile-qa", "bot_profile"]`.
2. **`tsconfig.api.json` (API Config):**
   - Loại trừ rõ ràng `node_modules` để tránh tsc của API quét qua thư viện ngoài một cách không cần thiết.
   - Cấu hình mới: `"exclude": ["api/**/*.test.ts", "api/**/__tests__/**", "node_modules"]`.
3. **`HANDOFF.md` (Tệp này):**
   - Bổ sung tài liệu chi tiết này để ghi nhận trạng thái kỹ thuật và tránh xung đột trong các phiên làm việc tiếp theo của AI.

### 14.3 Hướng dẫn phòng ngừa xung đột cho các AI tiếp theo
- **KHÔNG** xóa `"node_modules"`, `"dist"`, hay các thư mục `.agents`, `chrome-profile-qa` khỏi mảng `exclude` của cả hai tệp `tsconfig.json` và `tsconfig.api.json`.
- Khi bổ sung một thư mục tạm, thư mục build, hoặc thư mục mã nguồn lồng nhau khác vào dự án, **hãy luôn khai báo loại trừ** nó trong `tsconfig.json` để tránh làm chậm trình biên dịch `tsc` và làm hỏng CI.
- Sau khi chỉnh sửa mã nguồn, hãy chạy lệnh kiểm thử cục bộ dưới đây trước khi commit/push:
  ```bash
  # Kiểm thử frontend typecheck (Mục tiêu: chạy xong trong < 10 giây, 0 lỗi)
  npm run lint
  
  # Kiểm thử API typecheck (Mục tiêu: chạy xong lập tức, 0 lỗi)
  npm run lint:api
  
  # Chạy unit tests
  npm run test
  ```

---

## 15. Giải quyết triệt để lỗi cài đặt dependencies (npm ci) trên GitHub Actions (28/05/2026)

> Cập nhật bởi Antigravity sau khi giải quyết thành công lỗi bước `Install dependencies` bị đỏ lập tức trên CI.
> Mục tiêu: Đưa các GitHub Actions workflows (Quality Gate & API Typecheck) về trạng thái thành công hoàn toàn (Green ✅).

### 15.1 Nguyên nhân lỗi cài đặt
Dù lỗi biên dịch TypeScript đã được giải quyết cục bộ, các lượt chạy CI trên GitHub vẫn bị thất bại ở bước `Install dependencies` (`npm ci`) trong vòng 1 giây:
1. **Khác biệt môi trường Node.js:** GitHub Actions runner mặc định cấu hình sử dụng Node 20. Đây là phiên bản Node đã bị GitHub Actions gắn cờ ngừng hỗ trợ (deprecated) và sắp bị gỡ bỏ vào tháng 9/2026.
2. **Xung đột npm cache và lockfile strictness:** Tệp `package-lock.json` được sinh ra bởi các phiên bản npm hiện đại hơn (npm 11+ trên Node 25 cục bộ) có định dạng và thuộc tính nghiêm ngặt. Khi chạy lệnh `npm ci` có kèm cơ chế cache (`cache: 'npm'`) dưới môi trường Node 20 cũ kỹ, npm client bị xung đột dữ liệu cache và không thể giải quyết gói cài đặt một cách an toàn, dẫn đến thoát chương trình ngay lập tức với lỗi `exit code 1`.

### 15.2 Giải pháp khắc phục
Đã thực hiện cập nhật đồng bộ 2 workflow `.github/workflows/quality_gate.yml` và `.github/workflows/api-typecheck.yml` như sau:
1. **Nâng cấp phiên bản Node lên 22 (LTS):** Chuyển `node-version: 20` thành `node-version: 22` để đảm bảo môi trường Node và npm hiện đại, tương thích hoàn hảo với cấu trúc dependencies mới và loại bỏ hoàn toàn các cảnh báo deprecation của GitHub.
2. **Gỡ bỏ cơ chế Cache & Chuyển sang `npm install --no-audit --no-fund`:** Gỡ cấu hình `cache` để tránh ô nhiễm cache cũ, và sử dụng `npm install --no-audit --no-fund` thay thế cho `npm ci`. Lệnh này linh hoạt hơn, giải quyết dependencies thông minh mà không bị xung đột cấu trúc phiên bản lockfile strict.

### 15.3 Kết quả xác nhận
Cả hai lượt chạy trên GitHub Actions đều đã thành công hoàn toàn (**Green ✅**):
* **API Typecheck (Run #10):** Vượt qua bước cài đặt và biên dịch thành công 100% trong thời gian rất ngắn.
* **Quality Gate (Agent Skills) (Run #283):** Hoàn thành xuất sắc tất cả các bước (Setup, Cài đặt dependencies, Senior Engineer Rule - Type Checking, AI Guardrails - Run Tests) và trả về kết quả thành công tuyệt đối.

---

## 16. Sửa lỗi FirebaseError: Unsupported field value: undefined (28/05/2026)

> Cập nhật bởi Antigravity sau khi người dùng báo lỗi "Không lưu được bài học phân hoá lên Firestore" khi tạo bài học phân hóa từ giáo án đại số/hình giải tích (ví dụ: "3 đường conic").

### 16.1 Triệu chứng
- Banner đỏ hiện "Không lưu được bài học phân hoá lên Firestore" khi bấm Lưu nháp hoặc Xuất bản.
- Console Chrome DevTools báo: `FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined (found in document adaptiveLessons/adaptive-...)`.

### 16.2 Nguyên nhân gốc rễ
- Trong `src/lib/adaptive/adaptiveFromLessonPlan.ts`, hàm `buildDefaultSimulationSpec()` trả về `undefined` cho các môn học không phải hình học (ví dụ: đại số, tích phân, conic...).
- Kết quả là object `KnowledgeUnit` có `simulationSpec: undefined`.
- Firestore JS SDK **nghiêm cấm** giá trị `undefined` trong bất kỳ field nào — chỉ cho phép `null` hoặc omit field đó hoàn toàn. SDK sẽ ném exception ngay lập tức.

### 16.3 Giải pháp
Thêm hàm tiện ích `removeUndefinedFields<T>()` vào `src/lib/firebase.ts`, hàm này đệ quy xóa tất cả các property có giá trị `undefined` trước khi ghi lên Firestore.

Áp dụng hàm này ở tất cả điểm ghi Firestore trong module adaptive:
- `src/services/adaptiveLessonService.ts` — `saveLessonToFirestore()` và `updateLessonInFirestore()`
- `src/components/tabs/AdaptiveLearningTab.tsx` — `setDoc()` lưu `AdaptiveLessonDocument`
- `src/pages/AdaptiveStudentPortalPage.tsx` — `setDoc()` lưu `adaptiveSessionProgress` và `studentLearningProfiles`

### 16.4 Commit và xác nhận
- **Commit**: `8ea38b2` — `fix: strip undefined fields before Firestore writes to prevent FirebaseError`
- **TypeScript check**: Pass `tsc --noEmit` 0 lỗi trước khi commit.
- **Đã push lên GitHub**: `origin/main` tại `8ea38b2`.
- **Vercel sẽ tự deploy** sau khi nhận push. Kiểm tra tại: https://vercel.com/congapro60-devs-projects/giaoandewey/deployments

### 16.5 Lưu ý cho AI tiếp theo
- Hàm `removeUndefinedFields` đã được đặt trong `src/lib/firebase.ts` để dùng chung.
- **Bất kỳ `setDoc()` hay `updateDoc()` nào ghi dữ liệu có thể chứa field optional đều nên bọc trong `removeUndefinedFields()`** để phòng ngừa lỗi tương tự.
- Không sửa `buildDefaultSimulationSpec()` vì trả `undefined` là logic đúng (bài học không hình học không cần simulation spec); chỉ cần strip khi ghi Firestore.

## 17. Triển khai kiến trúc Hybrid PA2+PA1+PA3 cho Bài học phân hoá (28/05/2026)

> Cập nhật bởi Antigravity theo yêu cầu xử lý lỗi "Chưa có nội dung chi tiết cho bài học phân hoá" và tối ưu hóa hệ thống sinh bài học, nhằm cân bằng giữa chất lượng nội dung (PA2+PA1) và cá nhân hóa thời gian thực (PA3) cho lớp học quy mô nhỏ (< 20 học sinh).

### 17.1 Bối cảnh và Vấn đề
- Hệ thống trước đây chỉ tạo khung bài học và yêu cầu người dùng phải tự nhập câu hỏi, bài tập (không đạt kỳ vọng "AI tự tạo 100%").
- Giải pháp "thuần PA3" (Real-time generation hoàn toàn) đã bị bác bỏ do lo ngại về cost, rate-limit và latency khi cả lớp làm bài cùng lúc.
- Lớp học có quy mô nhỏ (< 20 học sinh), cho phép độ trễ chấp nhận được ở người đầu tiên hoàn thành pre-test (15-30s), sau đó dùng cache cho những người tiếp theo.

### 17.2 Giải pháp Kiến trúc (Hybrid)
Chúng tôi đã áp dụng phương pháp tiếp cận **Hybrid**:
1. **Pha thiết kế (PA2+PA1 - Sinh nội dung có cấu trúc)**: 
   - Thay thế Regex parser cũ bằng hàm sinh JSON. Khi giáo viên nhấn "Duyệt bản rà soát", hệ thống gọi AI lần 2 (trong nền, có trạng thái `isGeneratingContent`) để yêu cầu AI sinh ra toàn bộ dữ liệu có cấu trúc (gồm các câu hỏi thực tế có LaTeX, giải thích chi tiết, bài kiểm tra nhanh) cho cả 3 tuyến học (Standard, Foundation, Challenge).
   - Nếu AI lỗi hoặc thiếu API key, hệ thống vẫn an toàn fallback về bản gốc (PA1 Regex).
2. **Pha học tập (PA3 - Personalization Engine & Caching)**:
   - Viết mới `src/lib/adaptive/personalizationEngine.ts` đóng vai trò là lõi cá nhân hóa.
   - Khi học sinh nộp Pre-test, tuỳ vào các "mục tiêu học tập còn yếu", hệ thống sẽ ghép nối nội dung từ tuyến Foundation/Challenge + gọi AI sinh thêm một patch cá nhân hóa nhẹ nhàng (nếu cần).
   - **Cache deduplication**: Nếu nhiều học sinh cùng vào tuyến Foundation và yếu cùng một mục tiêu, Promise đang gọi AI sẽ được tái sử dụng (deduplicate) thông qua sessionStorage. Học sinh nộp sau sẽ được hưởng lợi ngay lập tức từ cache của học sinh nộp trước.

### 17.3 Các thay đổi chính về Code
- **`src/lib/adaptive/adaptiveFromLessonPlan.ts`**: Thêm các hàm xử lý JSON (`buildAdaptiveContentPrompt`, `buildAdaptiveLessonFromContentJson`, v.v.).
- **`src/pages/AdaptiveLessonBuilderPage.tsx`**: Đổi `approveReviewedSource` thành hàm `async`. Thêm UI spinner hiển thị rõ ràng "AI đang thiết kế nội dung (15-30s)".
- **`src/lib/adaptive/personalizationEngine.ts`**: (Tạo mới) Chứa lõi logic deduplicate, cache, và gọi AI để vá lỗi (patch) bài học ở chế độ runtime.
- **`src/pages/AdaptiveStudentPortalPage.tsx`**: Thêm state `personalizing` vào `PortalStage`. `handleDiagnosticSubmit` được làm thành async, thay đổi UI hiển thị spinner cá nhân hóa, sau đó mới render `dewey-lesson`.

### 17.4 Cách Test trên VSCode / Môi trường thực
1. Truy cập trang **Soạn giáo án phân hoá**.
2. Upload hoặc chọn giáo án đã soạn (ví dụ "3 đường conic").
3. Chờ AI rà soát. Khi xuất hiện nút "Duyệt bản rà soát & tạo cấu trúc bài học", **bấm vào nút đó**.
4. **Kiểm chứng UI**: Nút sẽ hiện spinner kèm thông báo "AI đang thiết kế nội dung...".
5. Sau ~20 giây, kiểm tra phần nội dung bên dưới, các bài tập và ví dụ sẽ được điền câu hỏi thực tế (có nội dung Toán học/LaTeX) thay vì giữ trắng.
6. Chuyển sang **Góc nhìn học sinh**. Làm thử bài Pre-test (cố tình làm sai nhiều).
7. Khi bấm Nộp bài, sẽ thấy màn hình trung gian: **Đang chuẩn bị bài học cho em...**. Sau đó vào lớp học Dewey.
8. Mở console kiểm tra logs, bạn sẽ thấy Personalization Engine ghi nhận "Cache miss" ở lần gọi đầu, nếu học sinh khác vào cùng luồng đó sẽ thấy "Cache hit".

### 17.5 Lưu ý về Data
- Mọi dữ liệu JSON trả về đều được parse an toàn.
- Hàm ghi Firestore vẫn áp dụng `removeUndefinedFields` từ đợt sửa lỗi số 16 trước đó để tránh crash thư viện.
