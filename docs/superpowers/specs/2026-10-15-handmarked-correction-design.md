# Công bố bản chấm tay và nộp hộ bài chữa — Design

## Mục tiêu
Cho phép GV tải bản chấm tay (ảnh/PDF) gắn với đúng lượt bài đã nộp, rồi bật/tắt quyền xem riêng cho HS/PH. Cho phép GV hoặc PH nộp ảnh “Bài chữa/làm lại” thay HS; AI nhận xét cùng contract hiện có, không thay điểm gốc.

## Quy tắc dữ liệu
- Bản chấm tay là evidence dẫn xuất của `submissionId`, revision bất biến, có actor/thời điểm/file metadata.
- Cờ công bố nằm trên submission, mặc định false: `handMarkedPublishedAt`, `handMarkedPublishedBy` chỉ được server/teacher action ghi.
- HS/PH chỉ nhận `handMarkedEvidence` khi cờ công bố true; điểm hệ thống vẫn theo luật duyệt riêng; GV luôn thấy bản gốc + bản chấm.
- Bản chấm tay không thay `fileUrls`, không thay `grade`, không đổi `teacherApproved`.
- Bài chữa là `correctionAttempts`, mỗi lượt giữ `submittedBy`; GV/PH upload qua actor grant, AI review opt-in, assessment không có score/maxScore.
- Khóa chốt chặn bản nộp/bổ sung; không chặn bài chữa riêng.

## Luồng
1. GV mở bài nộp → nút “Tải bản chấm tay” → chọn ảnh/PDF → server grant/finalize → bản nháp chỉ GV thấy.
2. GV bật “Cho HS/PH xem bản chấm tay” → server transaction ghi cờ công bố. Tắt lại ẩn khỏi HS/PH, giữ lịch sử.
3. HS mở chi tiết bài đã chấm → xem ảnh bài gốc/bản chấm tay trong cùng viewer, không lộ file khi cờ tắt.
4. PH vào bài của con bằng PIN → cùng projection, chỉ con mình.
5. GV/PH chọn “Nộp hộ bài chữa/làm lại” → upload ảnh → lưu correction attempt với provenance → AI review opt-in → hiển thị feedback chi tiết, không điểm.

## Quyền và chống lỗi
- Server lấy danh tính từ Firebase token/PIN; không tin `studentId`, `teacherId`, URLs client.
- Upload grant ràng buộc submission/assignment/purpose/path/size/mime/expiry, consume một lần.
- Finalize kiểm lại actor, membership/PIN, lock, object metadata, revision; race trả lỗi, không tạo bản nửa vời.
- Projection lọc bản chấm tay ở server; Rules cấm client ghi evidence/cờ publish.
- PH không được xem bài khác, sửa điểm, bật công bố; GV thuộc lớp được tải/công bố; HS chỉ xem khi công bố.

## UI
- GV: cụm nút hiện tại thêm “Tải bản chấm tay”, công tắc “Cho HS/PH xem bản chấm tay”, trạng thái Đang ẩn/Đã công bố.
- HS/PH: badge “Bản chấm tay của GV” chỉ khi được công bố; viewer dùng ảnh gốc, không lẫn với bài chữa.
- Bài chữa giữ card riêng; nhãn “Nộp bởi GV/PH/HS”, outcome AI rõ; không hiển thị điểm.

## Tiêu chí nghiệm thu
- Tắt cờ: HS/PH API không nhận URL bản chấm tay; GV nhận đầy đủ.
- Bật cờ: HS/PH đúng bài nhận bản chấm tay; PH sai con bị từ chối.
- Tắt lại không xóa file, projection ẩn ngay.
- GV/PH nộp hộ tạo correction attempt, provenance đúng; AI review không ghi grade/score.
- Lock chặn upload bản chấm tay/bản nộp; correction vẫn hoạt động.
- Rules/API/unit, build/lint, browser fixture kiểm UI.

## Contract triển khai — đã duyệt 15/10

- API actions `/api/classroom`: saveHandMarkedWork, setHandMarkedVisibility, readHandMarkedFile; upload qua issueSubmissionUpload purpose hand_marked, scope submissionId.
- Submission DTO handMarkedEvidence: `{id, files:[{id,name,mimeType,size,kind:'image'|'pdf'}], note, submittedBy, createdAt}`; handMarkedPublished boolean mặc định false, publication audit server-only. Không có storage path/token/URL file trong DTO. Private objects `hand-marked-homework/...`, deny clientStorage.
- File read action xác minh actor + exact submission/revision/file. Trả signed read URL ngắn hạn 60s với no-store; không tạo Firebase token vĩnh viễn. Tắt công bố chặn các yêu cầu mở tiếp theo; nội dung đã tải không thể thu hồi.
- Publication ảnh chấm tay độc lập điểm: GV có thể công bố bản chấm tay cả khi chưa có AI grade; điểm hệ thống vẫn tuân teacherApproved. Bản chấm tay có thể tự chứa điểm GV viết trên giấy, nên nút công bố là hành động chủ động riêng của GV.
- Upload bản chấm tay mới tạo revision bất biến và tự về chưa công bố; so expectedReviewId khi đổi visibility chống công bố nhầm phiên bản. Audit upload/publish/unpublish giữ actor/time/revision.
- Correction contract: cả teacher/student/parent dùng credentials đúng bài cho list/save/review. Lịch sử ảnh và ghi chú vẫn xem được khi điểm gốc bị ẩn; lưu/đánh giá mới cần điểm hoặc bản chấm tay đã công bố. Khóa bài gốc không chặn correction. submittedBy/reviewedBy do server ghi; không sửa điểm gốc.
- Nếu chỉ có bản chấm tay công bố, AI dùng ảnh/ghi chú bản đó, không dùng điểm hoặc lời giải AI đang ẩn. Nguồn thay đổi trong lúc đánh giá thì không lưu kết quả cũ. PDF chưa có bộ đọc ảnh phía máy chủ: trả “Chưa đủ căn cứ”, hướng dẫn bổ sung ảnh bản chấm, không đoán và không mất ảnh bài chữa.
- Nhận xét AI cũ bị ẩn khi nguồn đối chiếu thay đổi hoặc bị thu hồi; ảnh/ghi chú/lịch sử nộp vẫn giữ. HS/PH xem cùng các lượt đúng bài, kể cả GV hoặc PH nộp hộ.
