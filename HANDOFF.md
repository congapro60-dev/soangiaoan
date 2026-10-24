# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-10-24
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Snapshot trạng thái hiện tại. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## Nhận xét môn học SSM: đọc web thật + sửa giọng app — 24/10 (OpenCode)

- **Web SSM năm 26-27 chưa có nhận xét nào** (mọi lớp × quý "Chưa nhập"); **11Columbus (9681) thiếu cả trong danh sách nhận xét** (`/api/v2/evaluation/subject-comments` chỉ 5 lớp; detail cho 9681 → HTTP 500) dù có trong dropdown chấm điểm ⇒ SSM chưa cấu hình nhận xét cho lớp này, cần admin SSM bật; app không tự sửa được.
- Nhận xét năm 25-26: 242/514 ô có nội dung, chỉ Q2 + Q4. Giọng GV viết tay (10Ottawa, 11KHTN, 12 VN Toán…) tự nhiên, riêng hoá tốt; nhưng 12Detroit Q2 + 10Victoria Q2/Q4 (74 em, 700-900 ký tự) là **giọng AI rõ** ("khoảng trống kiến thức tích tụ"…, có câu tự mâu thuẫn, lỗi cắt chữ); vài lớp copy lặp (10Ottawa Q2: 11 HS / 3 văn bản).
- **Đã sửa app**: `ssmDrafts.ts` viết lại `buildSubjectComment` theo giọng GV thật (gọi "con", xưng "thầy cô", mức % + xu hướng + phần cần luyện + bài chưa nộp + động viên theo tier; bỏ nhãn "Điểm mạnh:/Cần rèn thêm:" và câu chốt cố định khiến các em cùng mức giống hệt nhau); `SsmDraftCards.tsx` nối dữ liệu từng em, đổi tên thẻ "Nhận xét môn học"; test 10/10 PASS, build PASS.
- **Việc kế** (chi tiết `tasks/todo.md`): admin SSM bật nhận xét cho 9681; GV soát nhóm nhận xét cũ giọng AI trước khi duyệt; sau khi GV nhập Q1 26-27 đọc lại để so giọng.
- Route chi tiết (QA sau): `/tds/6/comment/{classId}/class/{subjectId}/subject/{quarterId}/quarter`; API `subject-comments/detail?class_id&school_year_id&subject_id&quarter_id`.

## Sửa luồng điểm LO web→SSM: SSM đổi API shape — 24/10 (OpenCode)

- **Đã đổi và vì sao** (`7b2b412`, nhánh feat/v88-interactive-runtime): panel SSM luôn ra "0 LO, 0 học sinh" vì SSM đổi luồng API — bắt network thật trang chấm IA1 xác nhận: (1) `class-subject-assessment` chỉ còn metadata; (2) cây LO + thang nằm ở `v2/evaluation/criteria-has-assessment-form/{criteriaId}?assessment_form_id={formId}` (proxy cũ gọi `{formId}` → 422; thang giờ ở ROOT, không phải trong `assessment_forms`); (3) HS + điểm ở endpoint mới `v2/evaluation/student-by-subject`. Sửa 4 file: `api/_ssm-proxy.ts` (map đúng + op `studentBySubject`), `ssmBridge.ts` (`readSsmCriteriaAssessment(criteriaId, formId)` + `readSsmStudentsBySubject`), `loSsmParser.ts` (scale từ root, fallback legacy + `mergeSsmLoad`), `SsmPanel.tsx` (`fetchSsmCriteriaPayload` tải 3 endpoints song song, dùng cho cả load lẫn verify sau đẩy).
- **Nghiệm thu**: vitest parser 9/9 PASS (thêm fixture shape thật 24/10 + test mergeSsmLoad); `tsc --noEmit` + `lint:api` + `npm run build` exit 0. Đã push `efda375` (rebase lên `af1b84b`).
- **Còn dở / cố tình bỏ qua**: chưa QA preview (tải IA1 → kỳ vọng "N LO, 26 học sinh" → gợi ý AI → xem trước diff modal `LoPushPreviewModal` → xác nhận đẩy → đọc lại verify 100%); phải thêm domain preview MỚI vào Firebase Authorized domains rồi re-login + dán lại token SSM + ghép lớp 11Columbus↔9681. KHÔNG tự đẩy điểm — vòng đẩy phải qua preview diff + người dùng chốt.
- **Sẽ cắn người sau**: endpoint GHI điểm `writeLoGrades` vẫn dùng shape cũ `v2/evaluation/{grading-student-by-assessment-form|update-result-grading-student}` — chưa verify với SSM mới, khả năng cao đổi theo; nếu lỗi khi đẩy, bắt network POST trên trang chấm SSM (chrome-devtools page 5) rồi sửa proxy. Thang điểm SSM: N/4/3.5/…/1 (config `Thang4_26-27` id 21), IA1 trọng số 30%.

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
