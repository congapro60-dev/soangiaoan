# Discover Self-study v2 — giao bài, học an toàn, thống kê cho GV

Branch: `codex/elearning-muse-task1` (tiếp từ `58e1d53`). Sổ tiến độ: `discover-self-study-v2.ledger.md`.

## Mục tiêu
GV giao một bài Adaptive (sinh từ tiết Discover) cho lớp; HS đã đăng nhập `/lop` học trong route không lộ đáp án; mọi bằng chứng học được lưu theo HS/lớp/bài/seed; GV xem thống kê theo tiết, mục tiêu, lỗi sai, mức hỗ trợ để nhận xét và lên kế hoạch hỗ trợ.

## Giả định đã chọn (user chưa trả lời câu hỏi; đổi được trước khi build)
1. **Server chấm.** HS nhận bản bài đã bỏ đáp án; mỗi lượt nộp đi qua server. Lý do: hiện engine chấm ở client nên HS soi được đáp án và `adaptive-progress` không xác thực (giả mạo được).
2. **Phạm vi:** hạ tầng + pilot Cấp số cộng + vài tiết đầu mỗi khối do GV tạo qua Builder. KHÔNG sinh hàng loạt 204 bản nháp AI.
3. Không thêm Vercel Function (đang 11/12): gộp vào `api/classroom.ts` và `api/adaptive-progress.ts`.

## Sự thật từ code (đã kiểm)
- Lesson ở `adaptiveLessons/{id}`; rules cho mọi user đã đăng nhập (kể cả HS ẩn danh) đọc cả bản nháp → lỗ hổng sẵn có.
- Trường chứa đáp án: `correctAnswer/explanation/hints` (diagnostic, quickCheck, exitTicket), `WorkedExample.solution/aiRubric`, `PracticeTask.expectedAnswer`, `guidingAnswers/aiTutorPrompt`, `PracticeSet.*`, `bonusChallenge.*.solution`.
- Chấm client: `gradeAssessment` (`src/lib/adaptive/diagnosticEngine.ts:28`).
- Progress: 1 lần ghi lúc nộp exit ticket; không có classId; không ghi mức hỗ trợ/gợi ý.
- `assignments` không có trường bài Adaptive; HS đọc qua `studentWorkspace` + `projectStudentAssignment`.
- Seed id bị mất ở `DiscoverSelfStudyPage` → Builder.

## Thiết kế
- **Seed id:** `AdaptiveLesson.discoverSeedId`, mang từ trang chọn tiết qua Builder tới `saveLessonToFirestore`.
- **Giao bài:** doc `adaptiveAssignments/{id}` `{teacherId, classId, lessonId, discoverSeedId?, targetStudentIds?, isOpen, createdAt}`, chỉ Admin SDK ghi. GV tạo qua action trong `classroom.ts`.
- **HS mở bài:** action `studentAdaptiveOpen` (idToken → `studentLinks` → class khớp assignment) trả bài đã `stripAnswers` (hàm thuần, có test liệt kê đủ trường nhạy cảm).
- **Chấm & ghi:** action `studentAdaptiveSubmit` (idToken) nhận câu trả lời, chấm bằng lesson đầy đủ phía server, trả đúng/sai + gợi ý/lời giải đã được phép, ghi sự kiện `adaptiveEvents/{id}` (open, attempt, hint, remediation, exit, completed; kèm studentId, classId, lessonId, seedId, objectiveId, misconceptionId, supportTier) và cập nhật `adaptiveSessionProgress`/`studentLearningProfiles` có `classId`.
- **Đóng đường cũ cho HS lớp:** route công khai giữ nguyên cho link GV demo, nhưng bài giao qua lớp chỉ mở bằng đường mới.
- **GV thống kê:** tab Adaptive thêm bảng theo seed/lớp: số mở/đang học/hoàn thành/đạt, lượt cần hỗ trợ, top lỗi sai theo mục tiêu (map `CommonMisconception`), danh sách HS cần hỗ trợ + nút gợi ý kế hoạch (dùng dữ liệu thật). Lượt xem media không tính mastery.
- **Rules:** thu hẹp đọc `adaptiveLessons` (owner hoặc `portalEnabled`) + rules test; thêm rules `adaptiveAssignments`/`adaptiveEvents` (client không ghi).

## Tiêu chí nghiệm thu
1. Unit: `stripAnswers` không để sót trường đáp án nào (test duyệt toàn bộ khoá nhạy cảm).
2. API: HS lớp A không mở/nộp được bài giao cho lớp B hoặc `targetStudentIds` khác; thiếu idToken bị từ chối.
3. API: nộp nhiều lần không nâng điểm giả; hoàn thành chỉ qua exit ticket thật.
4. GV thấy thống kê đúng trên dữ liệu seed trong emulator/test.
5. `npm run lint`, `lint:api`, `test`, `test:rules`, `build` đạt; browser QA GV→giao→HS→nộp→GV.
6. Function count vẫn ≤ 12.

## Ngoài phạm vi
Sinh hàng loạt 204 bài; tạo media Muse thật; push/deploy; sửa checkout Downloads.

## Bổ sung (2026-10-16): GV tìm học sinh và xem như HS thật (T9)
Yêu cầu của chủ dự án: nút tìm HS toàn cục cho GV; bấm chọn thì vào đúng giao diện HS thật của em đó để đọc thông tin.
- **Tìm:** ô "Tìm học sinh" ở Header, tìm theo tên/Mã HS trên mọi lớp của GV (kèm tên lớp). Bấm kết quả mở `/lop/xem-thu/:classId/:studentId`.
- **Xem như HS (chỉ đọc):** `studentContext` (`api/_student-workspace.ts:30`) nhận thêm `body.preview = {classId, studentId}`. Chỉ chấp nhận khi `idToken` là GV sở hữu lớp (`classDoc.teacherId === uid`) và em có trong lớp; trả cùng ngữ cảnh với cờ `readOnly`. Mọi action ghi/nộp bài đi qua handler riêng dùng `studentLinks` nên token GV tự bị từ chối (403) — thêm test chứng minh.
- **Client:** `StudentPortalPage` ở chế độ xem-thử KHÔNG đăng nhập ẩn danh (giữ phiên GV), gắn `preview` vào mọi lời gọi, hiện dải "Đang xem như {tên} — chỉ đọc", khoá nút nộp/làm bài.
- **Phụ thuộc:** sau T3 (cùng sửa `_student-workspace.ts`); phần ô tìm ở Header có thể làm độc lập.
- **Nghiệm thu:** GV khác không xem được lớp không phải của mình; HS không dùng được `preview`; xem-thử không tạo bài nộp/sự kiện/`studentLearningProfiles`; ghi nhận số liệu "đã mở" không bị tính từ xem-thử.
