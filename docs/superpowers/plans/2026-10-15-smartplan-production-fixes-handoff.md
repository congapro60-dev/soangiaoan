# SmartPlan: rà soát lại và kế hoạch sửa, cập nhật 5 luồng

> Cập nhật 19/10/2026. Đây là kế hoạch hiện hành duy nhất của đợt rà soát này; phần cuối giữ hồ sơ 15–16/10 để đối chiếu. Checkbox trong hồ sơ cũ không chứng minh tính năng đã đạt trên production hiện tại.
> Khi triển khai: dùng `subagent-driven-development` hoặc `executing-plans`; mỗi nhóm sửa có test tái hiện, diff riêng và người kiểm độc lập.

**Mục tiêu:** sửa lỗi có bằng chứng trong soạn giáo án, đề offline, thi online, dự giờ, thư viện; nghiệm thu đúng luồng người dùng trước khi cập nhật production.

**Cách làm:** giữ React/TypeScript/Vite/Firebase hiện có, sửa tại ranh giới gây lỗi; không mở rộng tính năng hay đổi kiến trúc ngoài phạm vi. Lượt 19/10 chỉ rà soát, chạy kiểm tra, cập nhật tài liệu; chưa sửa mã ứng dụng, commit, push hoặc deploy.

## 1. Mốc kiểm tra và bằng chứng mới

- Production `https://giaoandewey.vercel.app` và remote `main`: `b913b1cf3ffd2d1d4fcb6fcc898e450d8abbe01d`; kiểm lại cuối lượt vẫn khớp.
- Vercel: `dpl_osztheVRuTPHia9wcACFgZqMsYcZ`, `READY`, target `production`, alias đúng. Đây chỉ là xác nhận deployment.
- Worktree riêng: `C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai`; nhánh `codex/audit-core-workflows-20261019`. Bắt đầu sạch, đúng SHA production.
- Thư mục gốc `C:/Users/ADMIN/Downloads/smart-lesson-plan-ai` có WIP của phiên khác; không sửa/reset/stash. Các đường dẫn mã dưới đây tính từ worktree riêng.
- Unit: **313 tệp, 3.279/3.279 test đạt**, exit 0.
- Rules emulator: **10 tệp, 309/309 test đạt**, exit 0. Chưa xác minh Rules đang triển khai trên Firebase; Vercel không chứng minh việc này.
- Typecheck app/API: cả hai exit 0. Build exit 0; entry **678,97 kB**, gzip **195,51 kB**. Vẫn có chunk lazy lớn, chưa phải kết luận hiệu năng thực tế.
- Kiểm tra riêng từ hàm TypeScript thật, chạy trong RAM: xác nhận lệch điểm TF, mất điểm TF đơn, đáp án review cũ, token TF không hợp lệ được chấm, LaTeX mất bất đẳng thức. Không gọi Firebase/AI.
- Render SSR benign: `ReactMarkdown + rehypeRaw` giữ nguyên iframe/srcDoc. Chưa kiểm chứng thực thi JavaScript trong trình duyệt.
- Browser: tab Edge production thuộc phiên khác nên công cụ không nhận quyền điều khiển; tab QA riêng và IAB đều timeout. Không coi đây là lỗi web/đăng nhập. **Không có browser E2E, screenshot mới hoặc kiểm AI thật trong lượt 19/10.** Không thao tác ghi dữ liệu production.
- Log đầy đủ: `C:/Users/ADMIN/.codex/visualizations/2026/10/15/01a13e2d-13e8-72f0-b393-9e1a57c60db1/audit-20261019/`.

**Kết luận QA: NOT APPROVED cho tuyên bố “5 luồng hoạt động đầy đủ”.** Test hiện hữu đạt nhưng bỏ sót các ca lỗi dưới đây. Không diễn giải kết luận này thành yêu cầu rollback toàn site khi chưa đánh giá tác động.

## 2. Ma trận phạm vi

| Mảng | Đã kiểm ngày 19/10 | Còn phải kiểm bằng thao tác thật |
|---|---|---|
| Giáo án | Mã tạo đơn/lô PPCT, draft, metadata, lưu, mở từ thư viện, template | Sinh nội dung mới theo mẫu/môn/lớp; kiểm kiến thức; lưu/tải lại; xuất từng trang |
| Đề offline | Mã đọc ma trận, prompt, nhập, trộn, xuất; tái hiện LaTeX bằng hàm thật | XLSX/DOCX/PDF thật; AI theo ma trận; kiểm đáp án; render Word/PDF; compile LaTeX |
| Thi online | API, Rules, cấu hình, nộp/chấm/review; tái hiện scorer thật | GV tạo/giao; HS làm, rớt mạng, reload, nộp; GV duyệt; HS xem đúng quyền |
| Dự giờ | Lưu hai vai, phân tích/retry, sửa tay, tự đánh giá, Excel, rubric | Hai tài khoản làm việc xen kẽ; file thật; AI thật; lưu/mở lại; Excel đầy đủ |
| Thư viện | Quyền/state theo user, preview raw HTML, mở giáo án/đề, export, template | Tìm/lọc/phân trang; chia sẻ/thu hồi; export; lỗi mạng; đổi tài khoản |

## 3. Danh mục lỗi và mức bằng chứng

`R` = đã tái hiện bằng hàm/render thật cục bộ; `S` = đường mã xác định được, chưa chạy luồng browser; `V` = cần xác minh thêm. P1 ưu tiên quyền riêng tư, sai điểm, mất dữ liệu; P2 sai chức năng/đầu ra. Không dùng số test xanh để hạ mức lỗi.

| ID | Mức | Lỗi, điều kiện kích hoạt | Nguồn chính |
|---|---|---|---|
| A01 | P1/S | A đăng xuất, B đăng nhập cùng tab: dữ liệu giáo án/chấm cũ vẫn được gộp vào B; draft và fetch trả chậm chưa có ranh giới UID | `src/hooks/useAppState.ts:158`, `src/hooks/useAuth.ts:51` |
| A02 | P1/S | Đề/đáp án cache dùng chung giữa tài khoản; checkpoint PPCT dùng chung có thể bỏ qua tiết chưa tạo của B | `src/components/tabs/TestingTab.tsx:54`, `src/components/tabs/ExamsTab.tsx:44`, `src/components/layout/Header.tsx:95`, `src/hooks/usePpctQueue.ts:9` |
| A03 | P1/R | Preview nội dung cộng đồng cho iframe/srcDoc đi vào HTML. Có bề mặt nội dung chủ động không được cô lập; chưa chứng minh browser exploit | `src/components/modals/ViewPlanModal.tsx:169`, `src/components/features/creator/LessonContentBoard.tsx:380` |
| X01 | P1/S | `proofSubmissionId` không chứng minh quyền truy cập: Rules cho khách tự tạo/chuyển bài sang submitted, API tin bài đó để mở đề có mật khẩu. ID đề dựa timestamp; locked response còn createdAt | `api/exam.ts:85`, `api/exam.ts:95`, `firestore.rules:234`, `firestore.rules:257`, `src/components/tabs/ExamsTab.tsx:300` |
| X02 | P1/R | TF 4 điểm, đúng 3/4, all_or_nothing: server 0, client 3; mở danh sách GV tự ghi lại 3. TF đơn: server 1, client undefined | `api/_exam-core.ts:150`, `src/utils/examScoring.ts:167`, `src/components/tabs/ExamsTab.tsx:208` |
| X03 | P1/S | Editor tạo TF đơn nhưng màn HS không có lựa chọn để trả lời | `src/components/features/testing/ExamEditorView.tsx:427`, `src/pages/StudentExamPage.tsx:592`, `src/pages/StudentExamPage.tsx:658` |
| X04 | P1/S | Thêm câu bằng AI yêu cầu correctAnswer là toàn văn lựa chọn; scorer đợi A/B/C/D, chọn đúng vẫn 0 | `src/components/features/testing/ImportExamModal.tsx:157`, `src/components/features/testing/ImportExamModal.tsx:179`, `api/_exam-core.ts:131` |
| X05 | P1/S | Reload bài public mất attempt/nonce/state; không có resume, trong khi lượt làm đã tính từ lúc bắt đầu. maxAttempts=1 có thể khóa tiếp tục bài dở | `src/pages/StudentExamPage.tsx:107`, `src/pages/StudentExamPage.tsx:225`, `src/pages/StudentExamPage.tsx:296` |
| X06 | P1/S | Public API trả câu hỏi trước startAt nếu active; thời lượng và một số trạng thái khóa chủ yếu dựa client. Phải phân biệt kỳ thi có timer với hạn nộp bài tập | `api/exam.ts:73`, `firestore.rules:254`, `src/pages/StudentExamPage.tsx:260`, `api/_classroom-online.ts:528` |
| X07 | P2/S | Xóa password/startAt/endAt thành undefined nên Firestore bỏ qua, giá trị cũ vẫn còn; datetime-local lại nhận ISO UTC, lệch 7 giờ tại VN | `src/pages/ExamConfigPage.tsx:121`, `src/pages/ExamConfigPage.tsx:143`, `src/hooks/useExams.ts:230` |
| X08 | P2/R | Sửa đáp án A thành B cập nhật điểm nhưng submission giữ correctAnswer=A; trang review ưu tiên khóa cũ | `src/utils/examScoring.ts:31`, `src/components/tabs/ExamsTab.tsx:1231`, `src/pages/AnswerReviewPage.tsx:150` |
| X09 | P2/S | Cấu hình 0 = không giới hạn nhưng đường thi trong lớp ép thành 1 lượt | `src/pages/ExamConfigPage.tsx:148`, `src/lib/classroom/studentExamPolicy.ts:123` |
| X10 | P2/R+S | Token TF x,x,x,x vẫn chấm đủ điểm (R); key JSON review lại split CSV, thiếu 4 ý có thể gọi replace trên undefined (S) | `api/_exam-core.ts:103`, `src/utils/examScoring.ts:123`, `src/pages/AnswerReviewPage.tsx:248`, `src/pages/AnswerReviewPage.tsx:257` |
| X11 | P2/S | Password đi qua query URL; đề đã mở khóa trả Cache-Control public, có khoảng trễ sau đổi mật khẩu/đóng đề | `src/hooks/useExams.ts:137`, `api/exam.ts:108` |
| O01 | P1/S | Hai vai lưu snapshot toàn biên bản: người dự ghi đè tự đánh giá GV vừa gửi; chiều ngược có thể bị từ chối vì metadata cũ | `src/lib/dugio/luuTru.ts:33`, `src/lib/dugio/luuTru.ts:84`, `src/pages/DuGioPage.tsx:534` |
| O02 | P1/S | Phân tích lại luôn gán điểm AI vào diemChot, bỏ qua daSua; retry chỉ merge ketQua nên tổng/Excel thiếu điểm vừa chấm thành công | `src/pages/DuGioPage.tsx:223`, `src/pages/DuGioPage.tsx:798`, `src/lib/dugio/tinhDiem.ts:44` |
| O03 | P1/S | UI cho quan sát >20 dòng nhưng Excel chỉ nhập/xuất 20 dòng; chế độ 22 thành tố xuất mapping 15 ô | `src/components/features/dugio/BangQuanSat.tsx:96`, `src/lib/dugio/excel.ts:73`, `src/lib/dugio/excel.ts:214`, `src/lib/dugio/excel.ts:229` |
| O04 | P2/S | “Tự đánh giá đã khóa” chỉ khóa UI: tab mở trước vẫn gửi lại vì Rules không kiểm hoanThanhLuc hiện tại | `src/pages/DuGioPage.tsx:483`, `firestore.rules:948`, `firestore.rules:976` |
| F01 | P1/S | Picker nhận XLSX nhưng extractor rơi vào readAsText; báo nhận diện thành công rồi dùng dữ liệu ZIP như văn bản ma trận | `src/components/tabs/TestingTab.tsx:269`, `src/components/tabs/TestingTab.tsx:308`, `src/components/tabs/TestingTab.tsx:573` |
| F02 | P1/R | LaTeX bỏ thẻ HTML trước khi bảo vệ toán: `$0<x<1$; $y>2$` biến thành `$02$` | `src/utils/examLatexExport.ts:41` |
| F03 | P2/S | Trộn đề chỉ có schema MCQ nhưng UI không giới hạn loại; không tìm thấy key vẫn đảo options và giữ khóa cũ | `src/utils/examUtils.ts:340`, `src/utils/examUtils.ts:395`, `src/utils/examUtils.ts:403` |
| L01 | P2/S | Lô PPCT lấy loại kế hoạch của form cho prompt, trong khi validator/metadata theo job; luyện tập/ôn tập có thể sinh sai mẫu | `src/hooks/useLessonCreator.ts:313`, `src/hooks/useLessonCreator.ts:442`, `src/hooks/usePpctQueue.ts:124` |
| L02 | P2/S | Mở giáo án thay currentPlan nhưng không đồng bộ builtinFormat/toanKeHoach; draft cũ bị thay không xác nhận | `src/components/tabs/LibraryTab.tsx:563`, `src/hooks/useLessonCreator.ts:78`, `src/hooks/useLessonCreator.ts:164` |
| L03 | P2/S | Word nhanh từ thư viện/phiếu học tập dùng HTML .doc, bỏ renderer công thức; khác đường xuất ở editor | `src/components/tabs/LibraryTab.tsx:140`, `src/components/tabs/LibraryTab.tsx:164` |
| L04 | P2/S | Xóa mẫu/tệp/skeleton cập nhật UI trước, lỗi cloud chỉ log; upload lỗi rollback cả danh sách có thể hoàn tác sửa mẫu khác | `src/hooks/useAppState.ts:318`, `src/hooks/useAppState.ts:330`, `src/hooks/useAppState.ts:348`, `src/hooks/useAppState.ts:369` |

### Các mục chưa đủ bằng chứng để gọi là lỗi đã tái hiện trên bản mới

- Năm học cũ, lỗi kiến thức bài “Mệnh đề”, tiêu đề ĐÁP ÁN rơi trang riêng và bảng Word bị cắt: quan sát ngày 15/10, chưa sinh/render lại ở SHA mới. Prompt hiện còn `20XX - 20XX` tại `src/utils/examUtils.ts:64`.
- Ma trận tải lên và bộ đếm số câu UI có thể mâu thuẫn; cần quy tắc nguồn nào có quyền quyết định và ca so sánh trước khi gọi AI.
- `SettingsModal`/`LatexModal` lazy nhưng luôn render ngoài Suspense của App (`src/App.tsx:594`; route App tại `src/main.tsx:115` không bọc Suspense). Cần kiểm cold load/mạng chậm/chunk lỗi; chưa gọi là crash đã tái hiện.
- Dự giờ: source đã rà có Excel/Word/PDF/ghi chép; chưa thấy luồng ghi âm. Không coi ghi âm là tính năng đã tồn tại hay tự thêm vào phạm vi.
- Trường ghi chép tự do `bienBan` chưa thấy được đưa vào Excel; cần quyết định hiển thị phụ lục hoặc cảnh báo phần không xuất, tránh âm thầm bỏ nội dung.
- Template mặc định hiện rỗng; giả thuyết cũ “upload mẫu mặc định chỉ lưu partial metadata” chưa đủ căn cứ, không xếp vào lỗi cần sửa.

## 4. Kế hoạch triển khai theo thứ tự

Mỗi gói: tái hiện thất bại trước, sửa tối thiểu, chạy test đúng đường gọi thật; không tự sửa dữ liệu giáo viên đã lưu hoặc chấm lại lịch sử để làm đẹp báo cáo.

### Gói 1 — Cách ly dữ liệu theo tài khoản (A01, A02)

**Tệp:** `src/hooks/useAppState.ts`, `src/hooks/useAuth.ts`, `src/hooks/usePpctQueue.ts`, `src/App.tsx`, `src/components/tabs/TestingTab.tsx`, `src/components/tabs/ExamsTab.tsx`, `src/components/layout/Header.tsx`; phối hợp hook creator.

- [ ] Dựng A có giáo án/đề/điểm/checkpoint, B rỗng; giữ fetch A trả chậm sau lúc B đăng nhập để test race.
- [ ] Reset state/draft theo UID; không gộp local data khác owner; bỏ kết quả request thuộc UID cũ. Scope cache và checkpoint theo UID, không tự nhận dữ liệu legacy không rõ chủ.
- [ ] Nghiệm thu: B không thấy hoặc lưu dữ liệu A ở thư viện, search, creator, soạn đề, thi online; B chạy đủ lô riêng, A tiếp tục đúng phần còn lại.

### Gói 2 — Chặn nội dung chủ động trong preview (A03)

**Tệp:** `src/components/modals/ViewPlanModal.tsx`, `src/components/features/creator/LessonContentBoard.tsx`; kiểm các consumer preview chung.

- [ ] Test payload benign iframe/srcdoc, script, form, link nguy hiểm cạnh bảng/Toán hợp lệ; kỳ vọng nội dung chủ động bị loại.
- [ ] Dùng allowlist/sanitizer phù hợp pipeline hiện có, giữ bảng, xuống dòng, math. Không chỉ xóa chuỗi `<script>` bằng regex; CSP chỉ là lớp bổ sung.
- [ ] Nghiệm thu local browser: marker không chạy, không request ngoài từ payload, bảng/math đúng. Không đưa payload vào thư viện production.

### Gói 3 — Quyền attempt, mật khẩu và phiên thi (X01, X05, X06, X11)

**Tệp:** `api/exam.ts`, `api/_exam-core.ts`, `api/_classroom-online.ts`, `firestore.rules`, `src/hooks/useExams.ts`, `src/pages/StudentExamPage.tsx`; test `api/__tests__/exam-public-result.test.ts`, `tests/rules/thiOnline.rules.test.ts`.

- [ ] Repro bằng emulator + API mock chuỗi tạo attempt giả/chuyển submitted/proof; kiểm proof của người khác, nonce khác, đề khác. Không thử trên Firestore thật.
- [ ] Cấp attempt qua server sau kiểm quyền/mật khẩu; chỉ server tạo dấu xác thực. Chặn client giả các trạng thái hoặc sửa bài người khác. ID khó đoán không thay thế xác thực.
- [ ] Đưa mật khẩu khỏi URL; dùng POST xác thực và phiên/grant gắn attempt; response bảo vệ `private,no-store`. Không log secret.
- [ ] Resume đúng attempt sau reload; câu trả lời và deadline do server xác nhận; không tiêu thêm lượt. Kiểm retry trùng và mất mạng ngay khi submit.
- [ ] Đóng đường xem đề trước giờ thi; kiểm deadline thực của bài thi có timer trên server. **Không biến hạn nộp bài tập thành khóa cứng**: test `dueAt` đã qua nhưng chưa khóa vẫn nộp/sửa được; khóa chốt mới chặn. Kỳ thi có timer áp deadline riêng.
- [ ] Nghiệm thu: sai/thiếu mật khẩu không đọc đề; grant khác người không dùng được; đổi/thu hồi quyền có hiệu lực; đúng hạn/late policy thống nhất giữa public và trong lớp; resume không mất bài.

### Gói 4 — Một hợp đồng chấm và nhập/review thống nhất (X02, X03, X04, X08, X10)

**Tệp:** `api/_exam-core.ts`, `src/utils/examScoring.ts`, `src/components/tabs/ExamsTab.tsx`, `src/components/features/testing/ImportExamModal.tsx`, `src/components/features/testing/ExamEditorView.tsx`, `src/pages/StudentExamPage.tsx`, `src/pages/AnswerReviewPage.tsx`; test `api/__tests__/exam-scoring-core.test.ts`, `src/utils/examScoring.verify.test.ts`.

- [ ] Test import trực tiếp cả scorer server/client: 0–4 ý đúng ở all_or_nothing/thpt2025, TF đơn, câu ngắn, CSV/JSON, dữ liệu thiếu/sai token. Không chép lại thuật toán vào test.
- [ ] Mở danh sách GV chỉ đọc; chấm lại phải qua hành động rõ và đường server giữ điểm tự luận/sửa tay. Gom logic thuần hoặc dùng cùng contract để không còn drift.
- [ ] Giữ đường hồi phục cho bài submitted khi API chấm lỗi (`src/pages/StudentExamPage.tsx:196`): retry phần khách quan phía server, idempotent, không bắt gọi AI, giữ essay/sửa tay. Test nộp đã lưu nhưng chấm lỗi, retry thành công đúng một lần, điểm xuất hiện theo chính sách; không phụ thuộc việc mở danh sách để ghi lại điểm.
- [ ] Render TF đơn; validate TF 4 ý đủ 4 ý, token chỉ Đ/S; map key MCQ toàn văn về ký hiệu duy nhất, reject không khớp. Review dùng cùng parser.
- [ ] Khi sửa key/regrade, cập nhật hoặc phiên bản hóa key/explanation cho review, giữ sửa tay và điểm essay; không tự chấm lại toàn bộ lịch sử.
- [ ] Nghiệm thu: câu 4 điểm đúng 3/4 ở all_or_nothing vẫn 0 sau mọi màn GV; TF đơn đúng được 1; đổi key A→B thì điểm và review cùng B; key `x,x,x,x` bị từ chối.

### Gói 5 — Cấu hình thi lưu đúng ý người dùng (X07, X09)

**Tệp:** `src/pages/ExamConfigPage.tsx`, `src/hooks/useExams.ts`, `src/lib/classroom/studentExamPolicy.ts` và test tương ứng.

- [ ] Dùng phép xóa field thật cho thao tác chủ động bỏ password/startAt/endAt; không thay cấu hình Firebase toàn cục.
- [ ] Chuyển ISO sang giá trị giờ local trước khi đưa vào datetime-local; lưu một lần về ISO. Với maxAttempts, chỉ số >0 mới giới hạn.
- [ ] Nghiệm thu ở Asia/Ho_Chi_Minh: nhập 08:00, tải lại/chỉnh/lưu vẫn 08:00; xóa trường rồi tải lại vẫn rỗng; 0/undefined không giới hạn, 1 chặn lượt mới nhưng cho resume.

### Gói 6 — Dự giờ giữ sửa tay và dữ liệu hai vai (O01, O02, O04)

**Tệp:** `src/lib/dugio/luuTru.ts`, `src/pages/DuGioPage.tsx`, `src/components/features/dugio/BangChamDiem.tsx`, `firestore.rules`, `tests/rules/duGio.rules.test.ts`.

- [ ] Test hai snapshot xen kẽ: GV gửi tự đánh giá rồi người dự lưu bản cũ; làm ngược thứ tự. Test AI lần hai sau khi GV sửa điểm; test một mục fail rồi retry.
- [ ] Lưu patch đúng phần từng vai sở hữu; owner save không gửi lại tuDanhGia cũ. Chặn sửa tự đánh giá đã gửi tại Rules, không chỉ UI.
- [ ] Lần đầu/retry áp kết quả cùng quy tắc: chỉ cập nhật đề xuất và phần chưa sửa tay; đồng bộ tiêu chí con, minh chứng, tổng. Đổi điểm đã chốt cần hành động chấp nhận rõ.
- [ ] Nghiệm thu: hai vai không mất phần của nhau; điểm chốt 3 giữ nguyên khi AI đề xuất 2; retry cập nhật tổng/Excel nhất quán; tab cũ không sửa được bản đã khóa.

### Gói 7 — Dự giờ xuất đủ nội dung (O03 và ghi chép tự do)

**Tệp:** `src/lib/dugio/excel.ts`, `src/components/features/dugio/BangQuanSat.tsx`, `src/pages/DuGioPage.tsx`.

- [ ] Fixture 21 và 35 dòng, đủ 22 thành tố, có ghi chép tự do; kiểm round-trip nhập/xuất.
- [ ] Mở rộng vùng dòng/vùng in; thêm phụ lục cho thành tố ngoài mẫu trường, giữ nguyên bố cục mẫu 15 thành tố đã duyệt. Đưa ghi chép tự do vào phần phù hợp hoặc báo rõ phần không xuất.
- [ ] Nghiệm thu đọc Excel và render từng trang: không mất dòng, điểm, minh chứng, không cắt bảng; không chỉ kiểm file tồn tại.

### Gói 8 — Ma trận và trộn đề có kiểm chứng (F01, F03, X04)

**Tệp:** `src/components/tabs/TestingTab.tsx`, `src/utils/examUtils.ts`, `src/utils/examImportUtils.ts`, `src/utils/examPermutationUtils.ts`, `src/components/features/testing/ImportExamModal.tsx`.

- [ ] Dùng `xlsx` đã cài để đọc sheet/bảng; reject rỗng/hỏng; preview số câu và mức độ trước sinh. Khi ma trận và counter lệch, yêu cầu chọn nguồn đúng trước gọi AI.
- [ ] Validate kiểu câu, option, đúng một key khớp trước trộn. Tối thiểu chặn đề hỗn hợp nếu đường trộn chỉ hỗ trợ MCQ; không ép TF/tự luận thành MCQ.
- [ ] Nghiệm thu XLSX có số liệu biết trước giữ đúng toàn bộ số câu/mức độ; thiếu/trùng key bị chặn; mọi mã đề giữ số câu, nội dung, tổng điểm, đáp án đúng theo nội dung sau đảo.

### Gói 9 — Xuất file và metadata thống nhất (F02, L03, lỗi lịch sử)

**Tệp:** `src/utils/examLatexExport.ts`, `src/utils/examWordExport.ts`, `src/components/tabs/LibraryTab.tsx`, `src/utils/examUtils.ts`; phối hợp renderer Word đang WIP.

- [ ] Bảo vệ toán trước xử lý HTML; kiểm bất đẳng thức, bảng, tiếng Việt, `% & _ #`, TikZ. Compile TeX để xác nhận, không chỉ tìm chuỗi.
- [ ] Thư viện/phiếu học tập gọi đường DOCX hiện hữu; bỏ đường giả Word bằng HTML .doc khi đã có thay thế cùng chức năng.
- [ ] Metadata năm học do người dùng xác nhận và truyền có cấu trúc; không để model tự đoán hoặc âm thầm sửa tài liệu cũ. Tái sinh đề nhỏ để xác nhận lỗi năm học lịch sử còn/đã hết.
- [ ] Nghiệm thu cùng một đề xuất từ editor/thư viện: cùng key/nội dung/công thức; render mọi trang DOCX/PDF, không tiêu đề đáp án lẻ trang, bảng/công thức bị cắt, trang trắng dư.

### Gói 10 — Giáo án, draft và hàng đợi đúng mẫu (L01, L02)

**Tệp:** `src/hooks/useLessonCreator.ts`, `src/hooks/usePpctQueue.ts`, `src/App.tsx`, `src/components/tabs/LibraryTab.tsx`, `src/components/tabs/TestingTab.tsx`.

- [ ] Dùng nhất quán `job?.keHoach ?? toanKeHoach` trong prompt/validator/metadata; test lô kiến thức–luyện tập–ôn tập.
- [ ] Handler mở giáo án khôi phục loại mẫu/kế hoạch cùng nội dung; draft bẩn cần giữ/hủy thay thế rõ. Áp cùng nguyên tắc khi mở đề đã lưu đè kết quả đang sửa.
- [ ] Nghiệm thu mở CV5512/Toán luyện tập/custom rồi sinh lại: UI, prompt, metadata khớp; hủy thay draft giữ nguyên; lô tiếp tục sau lỗi không trùng/bỏ tiết.
- [ ] Kiểm nội dung giáo án theo SGK/PPCT: mục tiêu, tổng thời lượng, kiến thức, lời giải, hoạt động, đánh giá, phân hóa. Bài “Mệnh đề” phải giải thích P↔Q khi P và Q cùng giá trị chân lý; không phát biểu hai kéo theo cùng sai. Không tự sửa giáo án đã lưu của GV.

### Gói 11 — Template và thư viện báo đúng kết quả lưu (L04)

**Tệp:** `src/hooks/useAppState.ts`, `src/components/tabs/TemplatesTab.tsx`, `src/App.tsx`, `src/components/tabs/LibraryTab.tsx`.

- [ ] Test reject upload/xóa mẫu/xóa tệp/lưu skeleton; thêm A chậm thất bại đồng thời B lưu thành công.
- [ ] Await persist rồi cập nhật state tại mutation phù hợp; lỗi phải hiện rõ; tránh rollback cả danh sách từ snapshot cũ. Giữ tệp/draft khi lỗi.
- [ ] Nghiệm thu tải lại: trạng thái khớp cloud, không báo thành công giả, B không bị hồi phục/hoàn tác bởi lỗi A. Kiểm tìm/lọc/phân trang và share/revoke bằng hai tài khoản test.

### Gói 12 — Giao diện và nghiệm thu toàn luồng

**Tệp khi cần sửa:** `src/App.tsx`, `src/main.tsx` và component có lỗi được tái hiện; không đổi thiết kế toàn app.

- [ ] Tái hiện cold load và chunk chậm/lỗi cho modal lazy; nếu thiếu boundary, render theo isOpen trong Suspense có fallback cục bộ. Kiểm mở/đóng Cài đặt, LaTeX bằng bàn phím.
- [ ] Chạy desktop/mobile 390px/tablet 820px: thanh công cụ, modal, bảng, công thức, focus, nhãn form, thông báo lỗi, loading/cancel. Chụp bằng chứng từng màn có lỗi và sau sửa.
- [ ] Giáo án: tạo một bài theo từng mẫu cần hỗ trợ, kiểm nội dung, sửa, đổi tab, lưu, reload, mở thư viện, xuất; thêm lô ba loại PPCT.
- [ ] Offline: ma trận XLSX + nhập DOCX/PDF, chỉnh, trộn, key, Word/PDF/LaTeX; so số câu và đáp án trước/sau.
- [ ] Online: GV tạo/cấu hình, HS sai/đúng mật khẩu, TF đơn/4 ý/MCQ/câu ngắn/tự luận, autosave/mất mạng/reload, nộp, GV duyệt, HS xem theo chính sách. Gồm hai HS không xem/sửa bài nhau và GV khác không đọc đề riêng.
- [ ] Dự giờ: hai vai tạo/đọc/tự đánh giá/phân tích, sửa điểm, retry, lưu xen kẽ, reload, export 35 dòng/22 thành tố.
- [ ] Thư viện: dữ liệu đủ qua một trang, tìm/lọc, mở, giữ draft, xuất, share/revoke; đổi A→B và lỗi cloud.
- [ ] Gọi AI thật chỉ trên fixture tổng hợp, không hồ sơ HS/GV thật; kiểm nội dung bởi người có chuyên môn. Báo tách provider lỗi/quota khỏi lỗi app; không tự retry hàng loạt.

## 5. Phân công và vùng đang có WIP — bàn giao Claude

Danh sách đọc từ checkout gốc ngày 19/10; phải kiểm lại trước lúc sửa vì có phiên khác đang làm.

| Vùng cần phối hợp | Tệp đang dirty liên quan | Hợp đồng bàn giao |
|---|---|---|
| Chấm online | `api/_exam-core.ts` | Gói 3–4: giữ thay đổi Claude; thống nhất scorer với client, server-issued attempt và test hai đường thật |
| Sinh giáo án Toán | `src/hooks/useLessonCreator.ts`, `src/lib/agents/ContentAgent.ts`, `src/lib/agents/Coordinator.ts`, `src/lib/toanLessonQuality.ts`, `src/prompts/toanFormats.ts` và test liên quan | Gói 1/10: reset đúng UID, loại kế hoạch theo job, mở giáo án đồng bộ mẫu; giữ chất lượng/format đang sửa |
| Word/biểu mẫu Toán | `src/utils/exportUtils.ts`, `src/utils/renderWordCore.ts`, `src/utils/wordExportA4.ts`, `src/lib/toanSchoolForm/*` đang sửa | Gói 9: nối thư viện vào renderer được thống nhất, giữ mẫu trường, kiểm đủ trang, không sửa chen |
| Firebase dùng chung | `src/lib/firebase.ts` | Gói 5 dùng deleteField ở caller; không đổi ignoreUndefinedProperties để xử lý riêng cấu hình thi |
| Theo dõi công việc | `tasks/todo.md`, `tasks/lessons.md` ở checkout gốc | Chỉ cập nhật bản trong worktree riêng; khi tích hợp bổ sung section, không thay cả file |

Các file dự giờ, TestingTab, LibraryTab, useAppState, examScoring client và cấu hình thi chưa nằm trong WIP đã đọc; vẫn cần kiểm lại trước nhận quyền sửa. `firestore.rules` dùng chung cho gói 3/6, một người tích hợp để tránh ghi đè.

Chưa có QA lại từ Claude cho SHA này. Các kết quả trên đến từ root và ba reviewer native chỉ đọc; không gắn nhãn Claude đã duyệt.

## 6. Cổng cập nhật/phát hành

1. Sửa theo gói, không triển khai mọi thay đổi cùng lúc. Khóa P1 quyền riêng tư/sai điểm/mất dữ liệu trước.
2. Mỗi gói có regression từ trigger thật; review diff độc lập; ghi rõ phần overlap đã được hợp nhất. Không sửa điểm/duyệt/nội dung lịch sử nếu chưa có quy trình riêng được duyệt.
3. Chạy lại trên SHA tích hợp cuối:

```powershell
$qaRoot = 'C:\Users\ADMIN\.codex\worktrees\fix-production-qa\smart-lesson-plan-ai'
npm --prefix $qaRoot run lint
npm --prefix $qaRoot run lint:api
npm --prefix $qaRoot run test
npm --prefix $qaRoot run test:rules
npm --prefix $qaRoot run build
```

4. Đạt ma trận browser gói 12 trên môi trường thử nghiệm có hai vai/tài khoản thật hoặc emulator. Không dùng localhost proxy production cho ca ghi. Có ảnh/log/file xuất đã đọc; còn blocked phải ghi blocked, không đổi thành PASS.
5. Nếu thay Rules/API, dùng trình tự rollout tương thích, kiểm ảnh hưởng phiên thi đang mở. Firebase Rules và Vercel có bằng chứng triển khai riêng; quyền thay cloud config phải được xác nhận đúng phạm vi.
6. Sau triển khai: xác nhận SHA/alias/READY, smoke từng luồng, kiểm quyền GV/HS, xem log trong khoảng thời gian thực sau deploy. Không gọi HTTP 200 hay không có log lỗi là E2E.

**Cập nhật triển khai 21/10/2026:**

- [x] Gói 1/2: cache, lịch sử, checkpoint và fetch state được scope theo UID; đổi tài khoản reset state, race cũ không ghi đè state mới.
- [x] Gói 2: preview giáo án bỏ raw HTML chủ động (`rehypeRaw`); bảng Markdown/math vẫn đi qua pipeline hiện có.
- [x] Gói 3: public attempt do `/api/exam` cấp token/ID/nonce; POST start/resume/save/submit; deadline server; password không còn đi qua URL; response protected `no-store`; Rules chặn client create/update attempt.
- [x] Gói 3 bổ sung: giới hạn `maxAttempts` theo danh tính tên/lớp phía server; tạo session/attempt/participant trong transaction; save/submit kiểm tra trạng thái trong transaction; submit cuối sau `endAt` dùng câu trả lời server đã lưu. Danh tính public là chính sách theo tên/lớp, chưa phải xác thực người thật.
- [x] Gói 4/5: client scorer khớp all-or-nothing server, TF đơn có UI, token TF hợp lệ, nhập MCQ toàn văn được chuẩn hóa, mở danh sách không tự ghi điểm, xóa field cấu hình dùng `deleteField`, giờ local không lệch UTC, key review cập nhật khi regrade.
- [x] Gói 6/7: retry dự giờ áp đủ điểm/tiêu chí con, giữ sửa tay; lưu tự đánh giá bằng patch riêng; Rules khóa tab cũ sau submit; Excel round-trip 35 dòng, ghi chú tự do, đủ 22 thành tố.
- [x] Gói 9/11: xuất đề và phiếu học tập từ thư viện dùng DOCX renderer hiện có; không còn đường HTML `.doc` cho hai nút này.
- [x] Gói 8: toàn bộ đường nhập Excel/PDF/DOCX/AI giữ đáp án MCQ nguyên văn để chuẩn hóa sau; validator dùng chung, không cắt ký tự đầu; lịch sử đề online đọc key UID-scoped.
- [ ] Gói 10 còn một phần: prompt PPCT theo `job?.keHoach` chưa hợp nhất vùng `useLessonCreator.ts` đang thuộc WIP Claude.
- [x] Cổng local: full unit single-worker **314 file / 3.293 test**, Rules **310/310**, app/API typecheck, build exit 0; final entry **684,52 kB**. Các test nặng cô lập với `--testTimeout=20000`: correction `30/30`, parent portal `36/36`, Word `5/5`, adaptive `2/2`.
- [ ] Browser E2E năm luồng, kiểm nội dung AI mới, xác minh Rules production và triển khai production còn mở. Full unit default `5s` có timeout runner ở test nặng; full single-worker với `--testTimeout=20000` đạt **314/314, 3293/3293**.

**Trạng thái:** `implemented -> tested` trên worktree `codex/audit-core-workflows-20261019`. Chưa gắn `deployed`/`verified` cho production.

**Cập nhật phát hành 21/10/2026:** `main` đã nhận commit `723c4617d45db3ad1e688a50ed8597f13c672715`; Firebase Rules đã deploy exit 0; Vercel `dpl_H3zcqnStuZNVo5a5AueUGPpxe12M` READY và alias production đúng SHA. Smoke root 200/title đúng, API mã không tồn tại 404. Trạng thái release: `deployed`; `verified` vẫn mở vì browser E2E và GV/HS thật chưa chạy.

---

## Hồ sơ lịch sử 15–16/10/2026 — không phải trạng thái hiện hành

Các mục dưới giữ nguyên để truy vết. Quyền commit/push/deploy đã được người dùng cấp sau bản kế hoạch ban đầu; câu “chưa được phép” bên dưới chỉ phản ánh thời điểm viết cũ. Lượt 19/10 hiện dừng ở rà soát và lập kế hoạch theo yêu cầu mới.

# SmartPlan Production Fixes Handoff Plan (historical)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Repair confirmed production defects from deployment `6d231ac8c02e605a42db29208a015c0976b2f279` without touching unrelated WIP in the original checkout.

**Architecture:** Work from a clean worktree rooted at the production commit. Keep UI fixes local to their components. Keep scoring and Firestore fixes covered by focused regression tests and emulator tests. Do not deploy from this worktree.

**Tech Stack:** React + TypeScript + Vite + Firebase Firestore Rules + Vitest.

---

## Protected context

- Original checkout: `C:/Users/ADMIN/Downloads/smart-lesson-plan-ai` contains unrelated dirty WIP. Do not reset, stash, rebase, or edit it.
- Fix worktree: `C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai`.
- Baseline commit: `6d231ac8c02e605a42db29208a015c0976b2f279`.
- No production writes, deploy, commit, or push authorized by this plan.

## Confirmed defects

- `ViewPlanModal` omits `plan.content`; live preview is blank.
- True/False answers are stored as `Đ,S,Đ,S`, while server scoring only parses JSON.
- `lessonPlans` list rule allows any authenticated account to enumerate private plans.
- `personalizationCache` is publicly readable and writable.
- Online exam password is collected but never enforced by the API/student flow.
- Password protection must also cover the `examId` result/review lookup path; a locked-code response must not reveal an exam ID that enables an unproved lookup.
- Creator navigation resets unsaved editor state.
- Template upload updates only React state and is lost after reload.
- Saved exam editor path fills the prompt but does not replace the selected result.
- Header feature search is a no-op.
- Adaptive publishing treats missing required lesson content as warnings only.
- Saved/generated Vietnamese math content needs a separate content-quality pass; do not silently alter teacher-authored material.

## Implementation order

### Task 1: Preview rendering

- [x] Add a component test proving a plan's markdown appears in `ViewPlanModal`.
- [x] Render `plan.content` with the existing markdown/math plugins.
- [x] Keep export controls unchanged; make the header responsive with wrapping/scroll-safe layout.
- [x] Run the focused modal test and TypeScript check.

### Task 2: True/False scoring

- [x] Add failing tests for CSV answer keys: all four correct, one correct, empty/invalid payload.
- [x] Normalize both CSV (`Đ,S,Đ,S`) and JSON into the same `{a,b,c,d}` representation.
- [x] Reject missing sub-answer keys instead of counting `undefined === undefined`.
- [x] Run `api/__tests__/exam-scoring-core.test.ts` and API typecheck.

### Task 3: Firestore security

- [x] Add emulator tests proving a different authenticated user cannot list/read a private `lessonPlans` document.
- [x] Replace the broad `lessonPlans allow list` rule with an owner/public-safe condition compatible with every client query.
- [x] Deny direct client access to `personalizationCache`; the client already falls back to in-memory cache.
- [x] Run `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run test:rules`; `10` files, `309/309` pass. Intentional unrelated `[LỖ HỔNG]` sentinels remain outside the repaired cases.

### Task 4: Online exam password

- [x] Add API regression tests for locked-code, unproved `examId`, and proved result lookup.
- [x] Add a minimal server-side password verification path without returning the stored password.
- [x] Update student UI to request password only when the server says it is required.
- [x] Require a matching submitted/graded `proofSubmissionId` for password-protected `examId` result/review lookup; strip the locked exam ID.
- [x] Run exam API tests; password helper and public-result suite pass.

### Task 5: State durability and editor routing

- [x] Preserve the current editor when clicking the active Creator tab or another tab with unsaved content.
- [x] Persist template file updates through the existing `updateTemplate` Cloud save path.
- [ ] Verify template reload behavior in a live authenticated browser session.
- [x] Make saved-exam editor load the selected exam result, not only `initialContent`.
- [x] Wire feature search to an actual filtered navigation result.
- [x] Port true/false scoring parity to `src/utils/examScoring.ts`; focused server/client parity suite passes.
- [x] Hide the admin feature from non-admin header search results.
- [x] Roll back optimistic template state and surface Cloud-save failure instead of reporting success.

### Task 6: Adaptive publishing gate

- [x] Add a failing validator/publish test for missing objective, knowledge, pre-check, and exit-check content.
- [x] Classify required structural gaps as blocking errors.
- [ ] Preserve non-blocking advisory warnings for optional quality suggestions.
- [x] Run adaptive validator/publish readiness tests; focused file passes `4/4`.

## Deferred handoff items

- Validate generated Vietnamese math content against source curriculum before release; current stored “Mệnh đề” artifact contains an incorrect equivalence explanation.
- Fix generated exam metadata defaulting to stale school year `2024-2025` when current date is October 2026.
- Fix Word export pagination: orphan `ĐÁP ÁN` heading and awkward answer-table continuation.
- [x] Split standalone routes and file-heavy utilities out of the entry bundle; local build entry is now `672.89 kB`.
- Re-run production GV/HS permission QA with real sessions after Rules deployment; source fixes alone do not prove deployed Rules.
- [x] Add explicit longer time budgets to the three known crypto/storage-heavy regression tests; targeted serial run `58/58` passes.
- Re-check current dirty WIP in the original checkout before any integration or deployment decision.

## Verification gate

- [x] `git diff --check`.
- [x] Focused regression tests for each changed behavior.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run lint`.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run lint:api`.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run test`: `297` files, `3153/3153` pass.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run test:rules`: `309/309` pass.
- [x] `npm --prefix "C:/Users/ADMIN/.codex/worktrees/fix-production-qa/smart-lesson-plan-ai" run build` succeeds; existing large chunks remain (`index` ~1.53 MB).
- [ ] Read final diff; confirm no unrelated WIP or generated artifacts are included.
- [ ] Stop before deploy; hand this plan and verification evidence to Claude for independent review.

## Independent QA feedback

- Claude found the original password bypass via `examId` and client/server true/false scoring drift.
- Follow-up fixes now omit the locked exam ID, require a matching submitted/graded proof submission for protected `examId` lookups, and align client scoring with server parsing.
- Focused follow-up: `33/33` exam/server/client scoring tests pass; app/API typecheck pass. Final Claude recheck is pending because Claude Desktop reconnect is currently blocked by permission-class mismatch.
