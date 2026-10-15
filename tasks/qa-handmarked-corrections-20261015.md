# QA bản chấm tay / bài chữa nộp hộ — 15/10/2026

**Status: IN PROGRESS** — chưa coi kiểm thử tự động là QA tài khoản thật.

## Phạm vi

- GV tải ảnh/PDF bản chấm tay cho đúng lượt nộp; mặc định ẩn; công bố riêng cho HS/PH.
- GV/HS/PH lưu và yêu cầu AI nhận xét bài chữa; HS và PH tương ứng xem cùng lịch sử. Không sửa điểm gốc.
- Nguồn chấm thay đổi thì nhận xét AI cũ bị ẩn; ảnh và ghi chú bài chữa vẫn lưu.
- Manual-only dùng ảnh/ghi chú công bố. PDF-only giữ ảnh chữa, trả “Chưa đủ căn cứ”.

## Bằng chứng hiện có

| Kiểm tra | Kết quả |
|---|---|
| API tập trung | 63/63; sau chỉnh DTO, 35/35 ca hand-marked/correction |
| UI tập trung | 25/25 trước sửa stale assessment |
| Stale assessment + cleanup tuần tự | 5 regression RED đúng lỗi; GREEN 34/34 |
| TypeScript app/API strict/non-strict | Đạt trước tích hợp main |
| Build | Đạt trước tích hợp main; index 1,557.57 kB, cảnh báo kích thước có sẵn |
| Firestore/Storage Rules | 309/309, 10 files; emulator exit 0 |
| Deploy Rules | smartplan-ai-14200, firestore:rules + storage, exit 0 |
| Review | Native gpt-6-astra xhigh; sửa stale assessment và cleanup/fence xóa |

## Giới hạn và dữ liệu thật

- Edge không kết nối được tab GV: CDP `Emulation.setFocusEmulationEnabled` timeout. Mở tab QA cục bộ cũng thất bại. Không chứng nhận giao diện mobile/iPad hoặc upload bằng tài khoản thật trong lượt này.
- Không nộp ảnh giả vào lớp thật, không thay điểm, không gửi tin cho HS/PH.
- URL file chấm tay chỉ cấp sau kiểm quyền, hạn 60 giây. Tắt công bố chặn lượt mở mới; ảnh đã tải/đang đọc không thể thu hồi từ thiết bị.
- Chỉ kiểm chất lượng nội dung AI bằng contract và fixture trong lượt này; chưa đánh giá trên ảnh bài chữa thật mới.
