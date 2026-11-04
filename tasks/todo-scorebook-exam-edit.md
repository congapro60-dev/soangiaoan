# Plan — sửa cột điểm thi định kì

- [x] Chuẩn hóa nhãn `Thi GHKI` / `Giữa học kì I` / `Điểm T10 ĐGGHKI` về cùng mã.
- [x] Nút xanh đồng bộ toàn bộ điểm định kì từ file MOET/TDS; BTVN có nút liên kết riêng.
- [x] Đọc cả header cột MOET/TDS dù chưa có điểm; tạo cột định kì trước khi có học sinh đạt điểm.
- [x] Cho chọn bài đã nộp và gán thẳng vào cột định kì; bài thắng theo học sinh, Sheet bổ sung ô thiếu.
- [x] Thêm preview/ghi trực tiếp Google Sheet và đọc lại xác minh; thêm đọc file quy đổi MOET → TDS, chọn cột TDS đích.
- [x] Lưu override sửa/xóa điểm thi và thiết lập tên/ẩn cột trong `scoreBooks`; không ghi ngược Google Sheet.
- [x] Thêm UI sửa điểm từng học sinh, đổi tên/xóa cột khỏi sổ, khôi phục cột đã ẩn.
- [x] Test parser, hợp nhất mốc, override; chạy test API sổ điểm.
- [x] Chạy build production.

## Kết quả

- Scoped tests: 38/38.
- UI/API score-book and exam tests pass.
- TypeScript app/API checks pass.
- Build: pass.

## Bổ sung sau QA UI
- [x] Bắt buộc chọn bài thi MOET nguồn trước quy đổi; chọn cột TDS đích thật; chặn file sai điểm.
- [x] Tách tạo cột hệ số và tạo cột định kì; cột định kì tạo header MOET + TDS.
- [x] Build, typecheck, test, deploy production.
- [x] QA production deployment READY; không ghi dữ liệu Google Sheet trong QA.
