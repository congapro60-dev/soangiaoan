# HS xem lại ảnh đã nộp — 13/10/2026

Chủ dự án xác nhận: HS luôn xem lại được ảnh bài tập của chính mình trên luồng HS.

- [x] Xác minh API studentSubmissions lọc đúng HS, trả fileUrls/attachments; thiếu giao diện xem ảnh.
- [x] Chốt dùng details và liên kết ảnh cỡ lớn, không thêm dependency hay API.
- [x] Hiện ảnh mọi trạng thái (đã nộp, đang chấm, lỗi, chờ duyệt, đã duyệt), giữ thứ tự và lịch sử nộp.
- [x] Bao phủ bài được giao, bài tự nộp và đề đã đóng; metadata một phần không làm mất ảnh trong fileUrls.
- [x] Chỉ nhận URL HTTP(S), phân biệt ảnh với PDF/Word; lỗi tải ảnh có hướng dẫn mở lại.
- [x] Test hành vi, lint, build, kiểm khổ điện thoại; review độc lập.

Phạm vi: ảnh/file do HS nộp. Không đổi điểm, nhận xét, quyền GV, API, Rules hay dữ liệu thật.
Nhánh codex/student-submitted-photos; HEAD gốc a7b7f93. Các thay đổi HANDOFF/todo/lessons có từ trước được giữ.
Điều phối: Gemini ag/gemini-3.8-flash-low canary OK; quota còn lại unknown. Review khác hãng sau diff.
Chưa được yêu cầu commit/push/deploy cho tính năng này.

## Bằng chứng

- 13 test / 3 file đạt; kiểm mọi trạng thái, lịch sử, HS khác bị loại, grade chưa duyệt không lộ.
- lint exit 0, build exit 0 (bản cuối 1m24s), diff --check exit 0.
- QA harness trên trình duyệt thật, desktop và 390px: ảnh tải đúng, 2 lượt hiện, lỗi 404 có lời nhắc/link gốc;
  scrollWidth 382 <= viewport 390; SECRET FEEDBACK không có trong DOM.
- Review khác hãng Gemini ag/gemini-3.8-flash-low: vòng cuối PASS. Quota unknown.
- Các lần giao writer CLI trước bị vướng cơ chế patch/dependencies; bản cuối do Codex triển khai, không giả nhận writer đã xong.
- Chưa QA production cho tính năng mới. API cũ trả tối đa 50 lượt; viewer hiển thị toàn bộ lượt API cung cấp,
  chưa thể hứa lịch sử vượt 50 lượt. Main chunk build khoảng 1,49MB, vượt ngưỡng QA 1MB; không tuyên bố release PASS.
- Bút đỏ: nghiên cứu riêng tại tasks/red-pen-photo-research.md, chưa triển khai vào sản phẩm.
- QA bổ sung 13/10: full suite 2871/2871 với --maxWorkers=2, lint app/API exit 0.
  Main bundle +2718 byte (~0,18%) so production; QA_TESTING_PROTOCOL.md không chặn chỉ vì >1MB.
  Đính chính nhận xét vượt ngưỡng phía trên: đây là baseline có sẵn, không phải lỗi tính năng mới.
  Báo cáo: tasks/qa-student-photos-red-pen-20261013.md.
