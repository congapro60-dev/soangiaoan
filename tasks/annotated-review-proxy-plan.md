# Chấm trên ảnh, lời giải, nộp hộ và khóa chốt — 14/10/2026

Trạng thái: source pushed main024a5a8; local QA passed; CI passed; Git auto deployment succeeded; Rules/real accounts QA remaining. Người dùng duyệt14/10/2026; bổ sung phản hồi HS→GV theo bài.
Base7d7c889; nhánh codex/student-submitted-photos. Nguồn:5 ảnh và các quyết định người dùng trong luồng.
Checklist tasks/todo.md; HANDOFF.md trỏ tới đây. Đích main sau QA, không deploy/promote thủ công.

## Quyết định đã chốt

- GV, HS, PH nộp lại/sửa bản nộp/xác nhận bất kỳ lúc nào, kể cả bài đã đóng.
- Khóa chốt do GV điều khiển: khóa chặn mọi người nộp/bổ sung/sửa xác nhận; cần GV mở khóa trước.
- GV vẫn sửa/chốt điểm và xem lịch sử; PH/HS không sửa điểm, đáp án chuẩn hoặc tự duyệt.
- isOpen không còn là khóa bằng chứng bài ảnh; rules thi online ngoài phạm vi.
- Không ghi đè/xóa bản cũ; revision giữ người thao tác, thời điểm, bản trước.

## Viewer ảnh

## Bổ sung14/10: màn danh sách HS/PH

- Nộp ảnh ngay ở dòng bài chưa nộp; Bổ sung ảnh/Nộp lại ngay ở dòng bài đã nộp, không cần mở bài trước.
- Dòng bài dùng article với nút mở nội dung và các nút thao tác là siblings; không button lồng button.
- Hạn hiển thị ngày+giờ VN; badge Chưa nộp/Sắp đến hạn(24h)/Quá hạn chưa nộp/Đúng hạn/Nộp muộn.
- Timing theo createdAt lượt nộp đang xem và dueAt hiện tại; đúng bằng hạn là đúng hạn, không dùng updatedAt.
- Tăng sắc màu/contrast HS+PH theo chức năng, header/nav/list vẫn gọn20dòng, không hero khổng lồ.
- Người dùng yêu cầu Gemini làm UI. Gemini4Argon xác minh chính thức ID gemini-4-argon đã ra13/10,
  nhưng canary máy14/10: GeminiAPI keyinvalid, Antigravity404; không sửa router hoặc dùng API trả phí mới.
  Gemini3.8Flash-low canaryOK được dùng thiết kế/code UI; lưu output và review thực tế, không claim dùngArgon.

Nguồn chính thức: https://ai.google.dev/gemini-api/docs/models/gemini-4-argon

- Thanh trên: tổng điểm/trạng thái duyệt/trang ảnh; lọc Tất cả/Đúng/Đúng một phần/Cần sửa/Cần đối chiếu.
- Đúng xanh, một phần/thiếu bước vàng, sai đỏ; chưa đọc chắc nét đứt+nhãn Cần đối chiếu.
  Kèm biểu tượng/chữ, không dựa riêng màu. Câu đúng có lưu ý vẫn xanh+Cần bổ sung.
- Tổng lấy cả bài được phép công bố, không cộng điểm vùng/filter. Câu chọn hiện score/maxScore.
  GV xem điểm tạm có nhãn, HS/PH giữ luật duyệt; periodic phân biệt điểm sổ với AI phân tích.
- Không chia đều điểm từng dòng hoặc a–d; chỉ hiện điểm bước khi rubric/dữ liệu có thật.
- Ảnh+danh sách liên kết, chọn câu đổi đúng trang/vùng; một lời giải đang mở, không chồng toàn bộ chữ lên ảnh.
- Desktop/iPad hai cột ảnh/chi tiết; điện thoại ảnh trên/câu dưới, giữ zoom+nút quay lại vùng.
- Mọi câu truy cập qua danh sách; không có tọa độ chắc thì nói rõ, chọn trang/zoom, không khoanh bừa.
- Vị trí câu đúng/đọc chưa chắc cũng cần định vị; confidence vị trí độc lập confidence đọc.
- QuestionDetail dùng chung ảnh/danh sách, cùng nguồn lời giải và nhận xét.

Đánh đổi: giống ảnh1 nhưng in mọi lời chữa lên ảnh sẽ che bài/rối mobile; chỉ dấu đỏ lại thiếu câu đúng.
Chọn ảnh+danh sách/lọc màu/chi tiết câu đang chọn.

## Lời giải và lỗi toán

Bằng chứng:
- mathText wrapBareSegment: dấu bằng nhưng commandIndex=-1 vẫn wrapWhole.
  Câu ảnh4 tái hiện thành: Sửa ý a thành: Sai (vì $A có hoành độ x=1, tung độ y=5).$
- Prompt, photoMarks validator và viewer chỉ nhận sai/một phần.
- rescoreQuestion ghi đè explanation, xóa correction khi đúng; manualGrade bỏ sửa text-only.
- Retry/RECITATION/clarifyRegrade ép ngắn; đổi prompt chính không đủ giữ lời giải.

Phương án:
- Sửa mathText duy nhất: bọc mảnh toán xác định, giữ tiếng Việt/khoảng trắng/dấu câu, không regex riêng mỗi màn.
- workedSolution riêng: quy tắc → thay số/lập luận → điều kiện → kết luận; câu đúng cũng có.
  explanation nhận xét riêng bài em; correction chỉ bước cần sửa.
- Đúng/Sai giữ cụm điểm; lời giải chia a),b),c),d), mỗi ý có kết luận+lý do, cả ý em đúng.
- Hai viewer đọc cùng nội dung; GV sửa một chỗ phản ánh cả hai.
- Rescore/xác nhận giữ lời giải nếu đề/đáp án không đổi; đổi đáp án/mã đề/version làm bản cũ hết hiệu lực.
  Text-only edits tính teacherEdited để AI không ghi đè.
- Thiếu đề/dữ kiện báo chưa đủ căn cứ, không bịa; phần GV bỏ qua không giải như bài bắt buộc.
- Ưu tiên lời giải chung một lần theo bài+version+mã đề+đáp án đã duyệt, tận dụng answerKey chi tiết.
  Không sinh lại toàn đề cho từng HS, không tự gọi AI lúc HS mở bài.
- Bài cũ cần bổ sung nguồn lời giải, không thể đủ chỉ đổi renderer; theo bài/mã đề, giữ điểm/sửa tay.
  Tạo/cập nhật lời giải có trạng thái và GV soát; retry không âm thầm trả thiếu rồi báo đủ.

## Nộp hộ và khóa

- GV: Nộp hộ ở dòng HS; nhiều ảnh, preview, nộp, đối chiếu. Sửa điểm có ảnh cạnh câu đang sửa.
- PH: Bài tập của con sau PIN PH hiện có; đúng con, nộp/xem/xác nhận, không mượn PIN/Firebase HS.
- Ba vai dùng cùng ảnh+câu. Pending chỉ máy đọc gì/vùng/lựa chọn; không đáp án/lời giải/điểm chưa được phép.
- Provenance người nộp/xác nhận/time/revision; không gọi chữ PH/GV nhập là chữ HS viết.
- PH API authorize PIN tự đặt+membership+đúng con/lớp; upload grant ngắn hạn ràng buộc path/bài/type/size/số ảnh.
  Finalize xác thực lại PIN/member/lock/object metadata, không URL tùy ý hoặc Storage công khai.
- Reuse endpoint classroom/grade-homework, helpers prefix_; không thêm Serverless Function.
- Câu chưa chắc có chọn/gõ/bổ sung ảnh/để GV xem, chấm tất định khi đủ đáp án, ảnh mờ đọc lại riêng câu.
- submissionLocked/lockedAt/lockedBy mặc định chưa khóa; GV Khóa chốt/Mở khóa, trạng thái cả3 cổng.
- Lock trong giao dịch trước nộp/bổ sung/xác nhận/mã đề; Rules chặn cả HS/GV direct evidence writes.
  Grade/approval của GV vẫn hoạt động. Khóa không xóa hoặc tự duyệt.
- Lượt nhận trước khóa tiếp tục đọc/chấm; chưa gửi bị từ chối sau khóa; race không nhận nửa bộ ảnh.
- Gỡ isOpen guard ảnh sau guard lock mới được kiểm; giữ grade/approval guard và rules thi online.
  Hạn nộp vẫn ghi sớm/muộn, không thành khóa ngầm.

## Rủi ro, kiểm và thứ tự

## Bổ sung được yêu cầu: bài chữa HS

- Sau xem bài chấm có nút Chụp ảnh bài chữa; lưu riêng correctionAttempts theo submission gốc, người nộp/thời gian/ảnh.
- Mỗi lần chữa tạo lượt riêng; GV xem được tại bài đó. Không ghi grade/điểm/sổ/năng lực từ lượt chữa.
- Đánh giá bài chữa là thao tác riêng, opt-in AI một lượt, nhận xét Đã đạt/Cần sửa thêm/Chưa đủ căn cứ,
  chỉ rõ việc cần sửa, không tạo score/maxScore, không sửa điểm bản gốc hoặc tự duyệt.
- Người dùng làm rõ:3nhãn chỉ kết luận nhanh; feedback chi tiết như GV đọc bài chữa: so với lần đầu em đã sửa
  đúng gì, câu/bước còn sai hoặc thiếu và lý do, cách hoàn thiện có công thức/lập luận, việc kiểm tra/luyện tiếp.
  Từng câu chữa được nêu rõ; không mẫu chung chung/nhận xét một câu. Chưa đọc rõ phải chỉ đúng vùng/câu chưa chắc.
- Chỉ HS của bài đã được xem kết quả lưu/đánh giá; server kiểm membership/ownership/grade visibility trước mọi thao tác.
- Dùng upload grant mục đích correction ràng buộc submission, vùng ảnh/path bất biến, chống replay.
- Khóa chốt bài gốc không chặn luyện chữa riêng; không biến ảnh chữa thành supplement bản thi.
- Xem/đối chiếu nguồn bài gốc+đề/đáp án/lời giải đã duyệt; thiếu dữ kiện phải báo chưa đủ căn cứ, không đoán.
- UI giữ ảnh/draft khi lỗi; đánh giá lỗi vẫn giữ ảnh đã lưu, thử lại không upload lại hoặc tạo bản trùng.
- Tests lưu/AI-review không đổi original grade/official scores, khác HS bị từ chối, khóa vẫn chữa được,
  reviewed DTO tuyệt đối không score hoặc expectedAnswer mới rò ra khi điểm chưa được phép xem.

## Bổ sung đã được yêu cầu: phản hồi bài chấm

- Nút Phản hồi bài chấm cạnh điểm trong chi tiết bài; xem trên ảnh có nút cùng tên, chọn sẵn câu đang xem.
- Mỗi phản hồi gắn submissionId và questionNumber tùy chọn; HS viết vấn đề (tối đa2000 ký tự), giữ bản nháp khi đổi mục.
- GV đọc tại dòng bài nộp có badge Phản hồi chưa trả lời; màn đối chiếu có mục trao đổi ngay dưới lời chữa.
- GV trả lời và/hoặc mở sửa điểm hiện có; phản hồi không tự sửa điểm/chấm lại.
- Trạng thái Chờ trả lời/Đã trả lời; HS xem câu trả lời trong bài và nhận mục thông báo từ nguồn phản hồi đã lưu.
- Chỉ HS của bản nộp gửi và đọc, GV thuộc lớp trả lời; server lấy danh tính từ phiên, không tin studentId client.
- Khóa chốt chỉ khóa bằng chứng/nộp/xác nhận, không chặn nhắn/giải đáp; lịch sử trao đổi giữ theo lượt nộp.
- Không chat chung, email/Zalo/push ngoài web; không thêm endpoint, không gọi AI cho lời nhắn.

## Phân công triển khai

- B1 backend actor/lock/proxy upload/feedback: api/_submission-actors.ts, api/_submission-feedback.ts, tests;
  tích hợp classroom/_clarify/grade-homework, Rules, client services; không sửa UI.
- B2 math/geometry/lời giải: mathText, QuestionResult contract, photoMarks, gradingPrompt/manual/rescore/clarifyRegrade;
  solution cache trên grade-homework helper, tests; không sửa actor/auth/Rules/UI.
- B3 UI sau contract: shared detail/ảnh+lọc+màu, đối chiếu editor/clarify, uploader ba vai, khóa/badge/reflection.
- Tối đa2 writer, root giữ docs/integration; review native+khác hãng trước commit/push.

Rủi ro cao: mở quyền PH+race lock, phải kiểm server/Storage/Rules.
Trung bình: mathText dùng chung, geometry, lời giải/version và giữ sửa tay.
Lợi: câu đúng/sai đều đọc hiểu, ba vai thống nhất. Đánh đổi: lượt tạo/soát lời giải chung khi key thiếu.
Không thay điểm sổ/thang điểm/báo cáo đã công bố vì đổi bố cục.

- [x] Đọc5 ảnh, source, tái hiện lỗi math bằng hàm thật.
- [x] Audit độc lập lifecycle lời giải, auth/nộp hộ, lock/rules.
- [x] Chốt quyền bất kỳ lúc nào và khóa từ user.
- [x] Người dùng duyệt phương án14/10/2026; phản hồi theo bài bổ sung cùng scope.
- [x] Math golden tests/shared detail/giữ lời giải rescore-manual-clarify/invalidation.
- [x] Viewer màu/filter/điểm/ảnh+chữa/geometry pending projection riêng.
- [x] GV/HS/PH nộp+xác nhận+revision/provenance/upload PH/lock transactional+Rules.
- [x] Actor×đóng/mở×khóa; PIN/member thu hồi; URL giả; khóa lúc upload/finalize; race/manual/regrade.
- [x] Đủ lời giải câu đúng/a–d, hai viewer đồng bộ, không leak pending/chưa duyệt.
- [x] Browser390/820/1024:22 fixture checks, không đồng nghĩa định vị AI thật. QA production/AI còn lại.
- [x] Full3027/lint app+API/build/Rules306/native+vendor review/HANDOFF/checklist.
- [x] Source commit/push main024a5a8 sau gate; remoteSHA khớp, không deploy thủ công.

Ngoài phạm vi: vẽ lại đề, Word/PDF mới, rules thi online, tự đổi điểm, xóa bản nộp cũ.

Review14/10: tasks/qa-annotated-review-20261014.md; localbrowser22checks passed, realaccounts/liveAIQA chưa có. Rules chưa deploy; sourcecommit/push không đồng nghĩa productionenforcement.
