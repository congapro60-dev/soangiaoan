# QA ảnh đã nộp và mẫu bút đỏ — 13/10/2026

## Kết luận

Xem ảnh: PASS phạm vi cục bộ; chưa phát hành hay QA production cho tính năng mới.
Bút đỏ: PASS tương tác mẫu, CONDITIONAL cho sản phẩm. Chưa có AI định vị/lưu dấu/API phân quyền.

## Mã và kiểm tra

- Nhánh codex/student-submitted-photos, HEAD a7b7f93; working tree dirty, giữ nguyên WIP cũ.
- Full suite lần đầu: 2870/2871, lỗi parent-portal.test.ts:342 (wrongCount 2 thay vì 1).
  Test dùng đồng hồ thật, 25 lần gọi phải nằm trong 2 giây; khi máy tải cao có thể vượt cửa sổ.
- Chạy riêng parent-portal: 36/36. Chạy lại toàn bộ --maxWorkers=2: 2871/2871, exit 0.
  Không sửa test hay code cổng PH ngoài phạm vi.
- lint app và lint:api exit 0. Build bản cuối lượt trước exit 0; mã sản phẩm không đổi trong lượt QA này.
- Main chunk local 1,487,871 bytes; production hiện tại 1,485,153 bytes. Chênh +2,718 bytes (~0,18%).
  QA_TESTING_PROTOCOL.md chấp nhận baseline entry >1MB; đính chính nhận xét trước: không hard-fail chỉ vì >1MB.
- API vẫn giới hạn 50 bài: giới hạn lịch sử có sẵn, chưa phân trang.

## Xem ảnh trên trình duyệt

- Dữ liệu giả lập, React component thật + CSS build thật; không API/proxy production.
- Đóng details: 0 ảnh DOM. Mở: ảnh cũ tải, ảnh 404 có lời nhắc và link bản gốc.
- Enter đóng/mở; ảnh bị gỡ khi đóng. Click ảnh mở tab bản gốc; target blank với noopener noreferrer.
- Không có SECRET FEEDBACK trong DOM. Test tự động còn kiểm không truyền bài của HS khác, mọi trạng thái và lịch sử.
- Desktop và 390px: không tràn ngang. Không đổi điểm, trả lời hay upload ảnh HS thật.

## Mẫu bút đỏ

Artifact: C:/Users/ADMIN/.codex/visualizations/2026/10/10/01a123b1-a378-73b1-9aa4-685e5b67efaa/red-pen-prototype.html
Ảnh QA: cùng thư mục, red-pen-mobile-qa.jpg.
Hai trang bài toán giả lập, hai dấu, lời chữa có sẵn do người viết mẫu; không phải kết quả AI.

- Chạm dấu 1 mở lời chữa lỗi phân phối; chọn lỗi 2 đổi sang đúng trang 2.
- Tọa độ chuẩn trước zoom x=0,879988/y=0,309987; sau zoom 150% x=0,879994/y=0,309998.
- Nút 44px, desktop ảnh/lời chữa cạnh nhau; 390px một cột, scrollWidth 375 <= viewport 390.
- Phát hiện UX: lời chữa nằm dưới màn hình khi chạm. Đã sửa mẫu: cuộn vào lời chữa, nút quay lại lỗi.
  Sau sửa lời chữa top 450 trong viewport cao 844; quay lại dấu top 400/bottom 444.
- Enter hoạt động. Ẩn dấu: ảnh vẫn hiện, danh sách lời chữa còn truy cập được.
- Chế độ HS chưa duyệt: DOM hiển thị không có dấu/lời chữa. Nhưng toàn bộ dữ liệu giả lập vẫn nằm trong JS/HTML;
  KHÔNG chứng minh bảo mật. Sản phẩm phải lọc dữ liệu tại server và không gửi dấu/lời chữa chưa duyệt.

## Chưa chứng minh

- Chất lượng định vị AI trên ảnh nghiêng/mờ/nhiều trang; thời gian GV chỉnh vị trí; mức dễ dùng với HS thật.
- Lưu dấu, phân quyền, chống lệch khi thay ảnh, xuất ảnh chấm, production end-to-end.
- Không commit/push/deploy, không tạo/xoá/chấm/duyệt dữ liệu production.
