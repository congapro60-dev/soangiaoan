# BÁO CÁO RÀ SOÁT VÒNG 2 + ĐỀ XUẤT NÂNG CẤP — 2026-07-14

> Vòng 2 soát các vùng vòng 1 chưa phủ: `aiProviders.ts` (lõi AI), luồng học sinh làm bài thi
> (`StudentExamPage` + `firestore.rules` + `ExamConfigPage`/`StudentResultPage`), routes `main.tsx`,
> và tự soát lại các thay đổi của đợt fix 1/2A/2B (không phát hiện lỗi hồi quy).

---

## A. LỖI MỚI PHÁT HIỆN — VÒNG 2

> **CẬP NHẬT 2026-07-14 (tối): A1 ĐÃ XỬ LÝ & DEPLOY.**
> - Đề (doc `exams`) chuyển sang rules teacher-only (đã deploy) — học sinh không đọc doc trực tiếp được nữa.
> - Học sinh vào làm/xem kết quả qua hàm serverless `/api/exam` (admin SDK) chỉ trả đề ĐÃ LƯỢC
>   correctAnswer/explanation → mở DevTools không còn thấy đáp án.
> - Chấm điểm chuyển server-side (`/api/exam` POST) bằng đáp án gốc; đáp án xem lại chỉ nhúng vào bài
>   nộp khi giáo viên bật allowReview. Fail-safe: server lỗi thì teacher-verify vẫn tính đúng điểm.
> - Rules `get()` nội bộ vẫn đọc được doc đề nên luồng tạo/validate bài nộp không hỏng.
> - Đã smoke-test /api/exam trên production (GET+POST trả JSON đúng, admin creds OK) TRƯỚC khi siết rules.

### 🔴 A1. Học sinh xem được ĐÁP ÁN qua DevTools — lỗ hổng lớn nhất hệ Thi online
- `firestore.rules:191`: đề `isActive == true` thì **ai cũng đọc được cả document exam**, mà document
  này chứa `correctAnswer` + `explanation` của từng câu (types `ExamQuestion`).
- Học sinh mở DevTools → Network/Console là thấy toàn bộ đáp án ngay khi vào phòng thi.
- Fix đúng: tách answer key sang doc riêng chỉ giáo viên đọc (`examAnswerKeys/{examId}`), hoặc chấm
  server-side (xem A2) và loại `correctAnswer/explanation` khỏi payload gửi học sinh.

> **CẬP NHẬT 2026-07-14 (chiều): A2 + A3 đã được GIẢM THIỂU** trong đợt "làm cứng hệ Thi online":
> - A2: rules chặn học sinh set 'graded' + kẹp totalScore 0..maxScore (đã deploy); trang theo dõi
>   của giáo viên tự XÁC MINH & TÍNH LẠI điểm từ đáp án gốc mỗi lần mở (`verifySubmissionScore`),
>   lệch là sửa + cảnh báo → gian lận tự ghi điểm bị vô hiệu khi giáo viên xem kết quả.
> - A3: startAt/endAt/maxAttempts được enforce ở trang làm bài (chặn vào + trần thời gian theo endAt;
>   maxAttempts chặn mức trình duyệt); showResultWhen được enforce ở trang kết quả.
> - Bonus sửa kèm: recalc "Sửa đáp án" không còn làm mất điểm tự luận AI; sidebar tô "đã làm" đúng
>   với câu Đ/S 4 ý; học sinh luôn nộp ở 'submitted', giáo viên/hệ thống mới chuyển 'graded'.
> - A1 (lộ đáp án qua DevTools) CHƯA xử lý — cần tách answer key/chấm server-side (giai đoạn sau).

### 🔴 A2. Học sinh có thể TỰ GHI ĐIỂM — chấm hoàn toàn phía client
- `StudentExamPage.handleSubmit` tính `autoScore/totalScore` ở client rồi `updateSubmission`.
- `firestore.rules validStudentUpdate` chỉ yêu cầu `totalScore is number` → học sinh sửa request
  (hoặc gọi SDK từ console) để nộp `totalScore: 10`, `status: 'graded'`.
- Fix đúng: endpoint chấm server-side (Vercel function như `api/gemini-relay`) nhận answers, đọc
  answer key, tính điểm và ghi bằng Admin SDK; rules cấm học sinh ghi `totalScore`/`autoScore`.

### 🔴 A3. Nhóm cấu hình thi "ẢO" — giáo viên đặt nhưng không có tác dụng
`ExamConfigPage` cho đặt các mục sau, nhưng **không nơi nào enforce**:
- `startAt`/`endAt` (giờ mở/đóng đề): `StudentExamPage`/`findExamByCode` chỉ kiểm `isActive`;
  quá `endAt` học sinh vẫn vào làm; đến `startAt` đề cũng không tự mở (không có cơ chế hẹn giờ).
- `maxAttempts`: không kiểm số lần làm — học sinh làm lại vô hạn.
- `showResultWhen`: `StudentResultPage` không đọc flag này — luôn hiện điểm ngay khi nộp.
(`allowReview`, `hideLeaderboard` thì ĐÃ được dùng đúng.)
- Fix: kiểm tra trong `startExam` (client) + đưa điều kiện thời gian/số lần vào `validStudentCreate`
  của rules (đếm attempts cần query — làm ở server function thì sạch hơn).

### ℹ️ (Đã loại) Key `ROUTER_POOLS` trong `aiProviders.ts`
Ban đầu nghi là lộ key, nhưng user xác nhận đây là **key backup CỐ Ý** cho người dùng không có
API key / hết token (provider `free-router` chạy lần lượt pool → fallback Gemini relay). KHÔNG phải lỗi.

### 🟢 Lỗi CODE đã sửa trong vùng Soạn giáo án / Soạn đề / Chấm điểm (2026-07-14)
1. **Nút "Tạo Slide" sinh slide từ placeholder rỗng** — `exportUtils.ts:128` viết `\${currentPlan.content}`
   (backslash thoát `$`) nên AI nhận CHUỖI CHỮ "${currentPlan.content}" thay vì nội dung giáo án →
   slide generic không bám bài. Sửa: bỏ backslash. (exportToLaTeX & generateTextToSlideData vốn đã đúng.)
2. **Chấm điểm thất bại khi bài có LaTeX** — `gradingUtils.gradeSubmission` `JSON.parse` trực tiếp;
   details môn Toán chứa `\cos \sqrt \left...` là escape JSON không hợp lệ → ném lỗi → cả bài chấm
   fail "AI không trả về JSON hợp lệ". Sửa: thêm `parseLooseJson` (util mới) — parse thẳng trước,
   thất bại mới escape backslash-không-hợp-lệ rồi thử lại. Áp cùng cho: parser đề thi online
   (nội dung câu chắc chắn có LaTeX), chấm tự luận + AI kiểm đáp án (ExamsTab), parse slide.
   Có test `jsonRepair.test.ts` (4 ca).
3. **Kẹt màn "đang nộp bài"** — `StudentExamPage.handleSubmit` gọi `setPageState('submitting')` TRƯỚC
   guard `if (!exam || !submissionId) return`. Sửa: đảo thứ tự.

### 🟠 Lỗi nhỏ vòng 2 (chưa sửa)
1. `StudentExamPage.handleSubmit`: `setPageState('submitting')` TRƯỚC guard `if (!exam || !submissionId) return;`
   → nếu rơi vào guard thì kẹt màn "submitting" vĩnh viễn (edge hiếm).
2. Sidebar tiến độ tô "đã làm" theo `answers[q.id]` truthy — câu Đúng/Sai 4 ý mới chọn 1 ý đã tô xanh,
   lệch với bộ đếm `isAnswered` (yêu cầu đủ 4 ý).
3. Hết giờ mà mạng lỗi → quay lại 'taking' với 0 giây, không auto-retry nộp — học sinh phải bấm tay (chấp nhận được, nên có retry).
4. `gradeEssays`/AI-validate trong ExamsTab dùng `raw.match(...)` — an toàn thực tế (callAI luôn trả string) nhưng nên phòng vệ.

### ✅ Vùng đã soát lại, không thấy lỗi hồi quy
Các thay đổi đợt 1/2A/2B (useAppState, CreatorTab, ClassesTab, ChatTab, examOnlineParser, useAuth);
cơ chế continuation + relay-fallback trong `callAI`; ErrorBoundary ở `main.tsx` hoạt động đúng vai trò.

---

## B. ĐỀ XUẤT NÂNG CẤP THEO TỪNG CHỨC NĂNG (sắp theo giá trị/công sức)

### Ưu tiên 1 — Bảo mật thi online (làm trước khi dùng thi thật)
Gói 4 fix A1-A4 ở trên = 1 đợt "làm cứng hệ thi": chấm server-side + tách answer key + enforce
lịch/số lần + relay hoá free-router key. Đây là điều kiện để dám dùng cho kiểm tra lấy điểm thật.

### Ưu tiên 2 — Nối mạch dữ liệu Lớp học (biến Classes thành xương sống)
1. **Import danh sách học sinh từ Excel/CSV** — giáo viên VN luôn có sẵn file danh sách lớp; nhập tay từng em là rào cản lớn nhất của tab này.
2. **Định danh học sinh xuyên hệ thống**: bài thi online + cổng adaptive cho học sinh chọn/nhập MÃ HỌC SINH
   (đã có trong Classes) thay vì gõ tên/lớp tự do → "Báo cáo" lớp match chính xác theo mã thay vì so chuỗi tên lớp,
   tiến độ từng em tự tính từ dữ liệu thật (hiện `progress` luôn 0).
3. Giao bài adaptive cho lớp (giống Giao bài đề thi đã làm).

### Ưu tiên 3 — Trải nghiệm soạn bài
4. **Lịch sử phiên bản giáo án**: mỗi lần AI sửa (revise/patch) lưu 1 snapshot, cho xem diff và quay lui —
   hiện chỉ có 1 nấc undo ở luồng chat patch.
5. **Tiến độ sinh thật** thay `SimulatedProgress` % giả (đã có streaming callback, chỉ cần đếm ký tự/section).
6. **Ngân hàng câu hỏi cá nhân** (Bảng Kiểm tra): tách câu từ đề đã soạn, gắn tag chủ đề + mức độ Bloom →
   trộn đề theo ma trận từ ngân hàng thay vì sinh mới mỗi lần; nền tảng cho chất lượng đề dài hạn.

### Ưu tiên 4 — Tiện ích nhanh (mỗi mục < 1 buổi)
7. Thi online: theo dõi bài nộp realtime bằng `onSnapshot` thay nút "Tải lại"; biểu đồ phân bố lựa chọn
   từng câu (phát hiện câu mồi nhử kém).
8. AI Tutor: nhiều cuộc hội thoại + đính kèm giáo án từ Thư viện làm ngữ cảnh (thay nút đính kèm đã gỡ).
9. Công cụ AI: lưu prompt đã tạo thành thư viện prompt cá nhân.
10. Thư viện: tìm kiếm cả nội dung (hiện chỉ theo tên), sort theo tuần/lớp/ngày.
11. Lịch sử Bảng Kiểm tra chuyển IndexedDB (hết lo quota localStorage với đề dài).

### Đợt 3 kỹ thuật (đã ghi ở tasks/todo.md)
rehype-sanitize · AbortSignal xuyên providers · code-split (giá trị thấp) · telemetry lỗi client (Sentry).

---

## C. TRẠNG THÁI
- Vòng 2 CHƯA sửa gì — file này là báo cáo + kế hoạch chờ duyệt.
- Đề xuất thứ tự làm: **Ưu tiên 1 (bảo mật thi)** → Ưu tiên 2 (Classes làm xương sống) → còn lại theo nhu cầu.
