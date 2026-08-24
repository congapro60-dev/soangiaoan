# Classroom Learning Loop — Thiết kế tương thích ngược

## Mục tiêu

Đóng vòng từ bài tập đã được duyệt sang bài luyện có thể trả lời, lưu kết quả, cập nhật bằng chứng năng lực và báo cáo tiến bộ; đồng thời sửa các lỗi có thể làm lộ đáp án hoặc kẹt trạng thái chấm mà không làm gián đoạn assignment/submission hiện có.

## Phạm vi đợt này

1. Giữ nguyên contract nộp bài hiện tại: `assignmentId`, `submissionId`, `fileUrls`, `attachments`, `status` và khả năng nộp lại.
2. Sửa profile evidence để không coi bài không kiểm tra một chủ đề là bằng chứng đã tiến bộ; cùng một assignment nộp lại không tạo thêm bằng chứng độc lập.
3. Ghi nhận `strengths` đã được giáo viên duyệt, nhưng không tự suy đoán năng lực từ phần không được đánh giá.
4. Đóng vòng practice bằng `practiceSets`/`practiceAttempts`: học sinh nhận câu hỏi không kèm đáp án, nhập câu trả lời, server chấm qua route hiện có và lưu kết quả.
5. Thêm recovery cho submission bị kẹt `grading` quá ngưỡng an toàn; không tự chấm trùng một bài đang xử lý.
6. Học sinh không đọc assignment document chứa đáp án bằng đường client trực tiếp; client dùng action an toàn của route `api/classroom.ts`. Bản chuyển đổi giữ fallback dữ liệu assignment cũ ở server và không thay đổi bài đã giao.
7. Tất cả trường mới đều optional hoặc nằm collection mới; rules mới không làm thay đổi quyền tạo submission cũ.

## Ngoài phạm vi đợt này

- Không migrate/xóa hàng loạt dữ liệu cũ của lớp.
- Không tạo Serverless Function mới (Vercel Hobby đã có giới hạn 12 functions).
- Không tự deploy hoặc push `main`.
- Không xây kênh gửi email/Zalo/phụ huynh trong cùng đợt.
- Không coi điểm practice tự động là điểm chính thức; practice chỉ tạo formative evidence có độ tin cậy thấp hơn bài giáo viên duyệt.

## Kiến trúc và luồng dữ liệu

### Hồ sơ evidence

`ProfileTopic` giữ `evidenceSubmissionIds` để đọc dữ liệu cũ, đồng thời có `evidenceRefs` optional với `assignmentId`, `submissionId`, `evidenceType`, `assessedAt`. Khi có `assignmentId`, số bằng chứng được đếm theo assignment instance, không theo số lần upload. Khi chưa có `assignmentId` (dữ liệu legacy), hệ thống giữ hành vi cũ và không tự suy diễn thêm.

Một grade được duyệt có thể đưa `weakTopics` và `strengths` vào profile. Topic không xuất hiện trong grade mới không bị xóa vì đó là `not_assessed`, không phải `mastered`.

### Practice

`practiceSets/{setId}` chứa câu hỏi/hint công khai và metadata student/class. `practiceKeys/{setId}` chứa solution/expected answer, chỉ Admin SDK đọc. `practiceAttempts/{attemptId}` chứa câu trả lời, trạng thái, feedback và score; học sinh chỉ tạo/cập nhật attempt của mình trước khi chấm, giáo viên đọc được lớp của mình.

Các action mới đi qua `api/grade-homework.ts`: `practice` tạo và lưu set; `submitPractice` chấm và lưu attempt. Không trả `solution` trong response practice.

### Assignment view an toàn

`api/classroom.ts` thêm action `studentAssignments`. Server kiểm tra `studentLinks/{uid}`, đọc assignments đúng class đang mở, rồi trả projection không có `answerKey`, `rubric`, `gradingInstructions`, `answerKeyImageUrls`. Client dùng projection này thay vì `getDocs` trực tiếp. Submission/profile vẫn dùng query hiện có để không thay đổi upload contract trong đợt đầu.

### Recovery trạng thái chấm

Batch grading chọn thêm các submission `grading` có `updatedAt` cũ hơn 10 phút và chuyển về `error` với hướng dẫn thử lại trước khi xử lý. Không retry ngay một submission vừa được worker khác khóa.

## Tiêu chí nghiệm thu

1. Assignment 11 Columbus hiện tại vẫn xuất hiện và học sinh vẫn upload/nộp lại bình thường.
2. Assignment cũ có đáp án vẫn được giáo viên chấm; học sinh không nhận `answerKey`/`rubric` từ assignment view mới.
3. Cùng assignment nộp lại không làm tăng số evidence độc lập.
4. Grade không nhắc topic cũ không xóa topic cũ.
5. Strength đã duyệt xuất hiện ở profile; topic chưa được đánh giá không bị gắn `solid`.
6. Practice trả câu hỏi + hint nhưng không trả solution; submit/reload vẫn thấy attempt; kết quả có score/feedback và evidence practice.
7. Submission `grading` mới không bị reset; submission `grading` cũ có thể retry.
8. Rules test, unit test, lint, API lint và build đạt; có test âm cho quyền đọc answer key/practice key.

## Rủi ro và cách giảm thiểu

- Rủi ro dữ liệu profile cũ: dùng field optional, giữ legacy IDs, không chạy migration phá hủy.
- Rủi ro rules làm cổng học sinh trắng: test nguyên query/luồng trước, client chỉ chuyển assignment read sau khi action server có test.
- Rủi ro AI practice tốn quota: dùng cùng quota self hiện tại, mỗi set một lượt, không tự refresh vô hạn.
- Rủi ro đáp án practice lộ qua Firestore: tách key document, rules deny client tuyệt đối.
