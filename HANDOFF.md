# HANDOFF — Soạn giáo án / học phân hoá

**Cập nhật**: 2026-05-25
**Repo chính**: `soangiaoan`
**Branch hiện tại**: `main`
**Commit Sprint D đã merge main**: `e7b609c92b80c80227ef4853053ea9723bdab931 Merge sprint D lesson builder UI`
**Commit Sprint D feature**: `8d229eb75b823b9edfb4262c84ee68abbd5821cd feat(adaptive): Sprint D — Lesson Builder UI + Firestore persistence`
**Commit Sprint C đã merge main**: `96030b3 Merge sprint C cover image upload`
**Commit Sprint C feature**: `d90ba674c0975d1df9746d92f5bb1abb6a2dce6f feat(adaptive): Sprint C — cover image upload + render in student portal`
**Commit Sprint E đã merge main**: `c9df1c440ed5dc236b0a8c53f8d2ae40d8ebcfc5 feat: add adaptive lesson completion reward`
**Commit nền trước phiên tương tác ví dụ học sinh**: `99aa575 Add real adaptive teacher dashboard`
**Mục đích file này**: để một phiên Claude Code / Claude Cowork / Google Antigravity hoặc kỹ sư khác đọc nhanh toàn bộ bối cảnh, các thay đổi đã làm, vấn đề còn tồn tại, và các bước cần kiểm tra/sửa tiếp mà không phải hỏi lại từ đầu.

---

## 0. Refactor Phase 1 chức năng “Soạn đề kiểm tra” — 2026-05-25

> Mục này là cập nhật mới nhất cho Claude Code / Antigravity nghiên cứu tiếp. Thay đổi đang ở local workspace `c:/Users/ADMIN/Desktop/edu-lesson-automation/soangiaoan`, branch `main`, **chưa commit/chưa push** tại thời điểm ghi handoff này.

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

### 0.6 Gợi ý prompt cho Claude Code / Antigravity

```txt
Bạn hãy đọc repo soangiaoan, branch main, bắt đầu từ HANDOFF.md mục “Refactor Phase 1 chức năng Soạn đề kiểm tra — 2026-05-25”.

Bối cảnh:
- Phase 1 đã refactor UI giấy thi A4, DOCX import giữ ảnh base64, preview SVG/IMG, prompt sinh SVG, Word export .docx thật, PDF/print chống cắt câu hỏi.
- Các lệnh local đã pass: npx tsc --noEmit, npx tsc --noEmit -p tsconfig.api.json, npm run test -- --run, npm run build.
- Thay đổi hiện chưa commit/chưa push.

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
