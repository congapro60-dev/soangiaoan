# Chấm đỏ tự động trên ảnh — kế hoạch đã duyệt 14/10/2026

Chủ dự án: “đồng ý, bạn làm đi”. Hướng duyệt: AI tự đặt dấu; HS chạm xem chữa;
GV chỉ soát chỗ chưa chắc và duyệt cùng điểm. Giữ ảnh gốc.

## Hợp đồng tối thiểu

QuestionResult.photoMarks?: PhotoMark[]. PhotoMark: imageIndex (1-based, chỉ ảnh bài HS),
imageUrl? (CHỈ server gắn từ URL ảnh đã tải), x/y/width/height (0..1 trên ảnh gốc), confidence (0..1).
Tối đa 3 dấu/câu; chỉ lỗi incorrect/partially_correct với nội dung HS thực sự đã viết.
Chỉ vẽ dấu confidence >= 0,85, box hữu hạn, diện tích dương, nằm hoàn toàn trong ảnh.
AI chỉ trả imageIndex và tọa độ, không được chọn URL. Parser bỏ dấu sai, không hủy lượt chấm hợp lệ.
Server giữ mapping qua ảnh tải lỗi/PDF bị bỏ để imageIndex luôn trỏ đúng ảnh đã gửi AI.
PhotoMarks không đổi điểm hoặc needsTeacherReview tự động; chỗ không chắc bỏ dấu, giữ lời chữa danh sách.
HS không nhận marks trước teacherApproved hoặc khi clarification còn chờ; GV thấy để soát.
Chấm lại hoặc đổi bài em ghi phải loại dấu cũ không còn khớp. File gốc không thay đổi.

## Các bước

- [x] T1 Backend: type, prompt, parser/binding, server projection, manual-grade giữ/loại dấu; test lỗi/riêng tư.
- [x] T2 UI: viewer dùng chung GV/HS, ellipse SVG phủ ảnh, nút số 44px, lời chữa, ẩn/hiện/zoom,
  chọn trang và quay lại lỗi. Dấu chỉ hiện trên đúng imageUrl, không tô vào letterbox.
- [x] T3 QA: targeted + full suite, lint app/API, build, browser desktop/mobile; kiểm 3 bài thật bằng fixture riêng.
- [x] T4 Hai reviewer (khác hãng khi có), sửa finding, cập nhật bàn giao.

## Phạm vi và quyền

Không thêm dependency, endpoint riêng, lưu ảnh đã vẽ thay ảnh gốc, cổng duyệt riêng hoặc đổi AI provider.
Không xử lý lỗi clarification cũ ngoài phạm vi. Bài chấm cũ chưa có photoMarks vẫn xem ảnh/lời chữa.
Cho thử prototype ở bài thật đã tải, không gửi thêm dữ liệu HS sang hãng khác khi chưa được yêu cầu.
Không commit/push/deploy trong lượt này. Worktree đang có WIP tính năng xem ảnh HS, phải giữ nguyên.
Kết quả kiểm và model/quota ghi sau; historical PASS không dùng thay nghiệm thu bản mới.

## Phản biện kế hoạch

- Dấu nằm trong QuestionResult nên liên kết lời chữa theo câu đã có, không thêm ID độc lập.
- imageIndex chỉ ở đầu ra AI; server gắn exact imageUrl sau lọc ảnh lỗi/PDF. Một câu có thể có 3 dấu trên các ảnh khác nhau.
- Client nén ảnh qua canvas đã xử lý EXIF; giữ cùng ảnh tải/gửi và hiển thị, không đổi hệ tọa độ giữa hai bước.
- GV có nút bỏ dấu của câu trong hộp Sửa điểm hiện có (giữ điểm), không phải đặt/duyệt lại từng dấu.
- Gemini review plan đã phản biện 5 ý; áp dụng gỡ dấu và kiểm mapping, không thêm dependency chuẩn hóa ảnh mới.

## Kết quả kiểm 14/10

- Full suite bản cuối: 2.897/2.897 (271 file), exit 0; sau đó thêm test nút gỡ dấu: 35/35 targeted gồm 1 ca mới.
- Firestore Rules trên emulator demo-smartplan-redpen: 303/303, exit 0. Không truy cập dữ liệu thật.
- lint app/API exit 0; build exit 0 (1m26s). Chunk chính 1.492,43KB, so 1.487,87KB của tính năng xem ảnh: tăng ~4,56KB.
- Test PIN cổng PH trước đó flaky vì 25 request vượt 2 giây dưới tải máy; chỉ cố định Date trong đúng test + finally restore,
  không đổi hành vi production.
- Browser component thật với 5 ảnh/21 tọa độ fixture đã soát của 3 khối. GV trước duyệt có dấu; HS trước duyệt 0 dấu/0 lời chữa;
  HS sau duyệt có đúng 4 dấu trên ảnh khối12. 390px không overflow, chạm 44px, zoom200% SVG và ảnh cùng rect,
  ẩn dấu gỡ detail, quay lại đúng marker nằm trong viewport; LaTeX dùng renderer sẵn có.
- Reviewer native độc lập không còn finding chặn; Gemini ag/gemini-3.8-flash-high review vòng 2 PASS, rút lại các claim schema sai.
  API model router trả model, phản hồi reviewer sống; quota còn lại unknown. Không gửi ảnh HS sang reviewer.
- Chưa gọi AI thật từ bản code mới và chưa QA production: độ chính xác placement trên lượt mới không được chứng minh bằng fixture.
- Bài cũ không có marks giữ ảnh/lời chữa. Chỉ lượt chấm mới sinh marks; không tự chấm lại hay đổi điểm 3 mẫu production.
- Chưa commit/push/deploy. Bản cục bộ đầy đủ và reviewable, release gate live placement vẫn CONDITIONAL.
