# Sổ Ghi Nhận Nợ Kỹ Thuật (Technical Debt Log)

File này lưu trữ các giải pháp "Workaround" hoặc các đoạn mã "Vibe Coding" tạm thời được thực hiện vì áp lực thời gian, thiếu hạ tầng hoặc thiếu bối cảnh cấu trúc.
Mỗi khoản nợ sẽ được mô tả kèm theo cách thức để trả nợ (Refactor) ở các phiên sau.

---

## [ĐÃ THANH TOÁN] 1. Lỗi Firestore Index của Danh sách Giáo án
**Ngày vay nợ:** Quá khứ
**Ngày trả nợ:** 2026-04-14
*   **Triệu chứng:** Khi truy vấn `lessonPlans` (Firebase) và sử dụng `orderBy('updatedAt', 'desc')`, hệ thống văng lỗi đỏ bắt buộc tạo Index.
*   **Kế hoãn binh cũ:** Xóa lệnh `orderBy` trên query để lấy **toàn bộ dữ liệu** về client, sau đó chạy hàm `array.sort()` của JavaScript.
*   **Hậu quả để lại:** Ứng dụng chạy được ngay, nhưng càng về sau dữ liệu càng lớn, ứng dụng sẽ bị phình to RAM và tốn băng thông cực độ, giấu nhẹm lỗi Indexing gốc.
*   **Cách thức trả nợ:** Đã loại bỏ code `sort()` phía Client, nhúng lại `orderBy`. Bắt buộc Admin (Người dùng UI) click chuột vào đường dẫn từ Firebase Console để tự động khởi tạo cấu trúc B-Tree Index cho Database gốc.

---

## 2. Giao diện File "Khủng long"
**Ngày vay nợ:** Quá khứ
**Ngày trả nợ:** Điểm tới hạn
*   **Triệu chứng:** File `App.tsx` vẫn còn khá ôm đồm một số hàm lưu trữ (save) thay vì tách lỏng ra Context/Redux. Component này vẫn còn quá lớn (đã chia vỡ `CreatorTab` nhưng gốc Context chưa triệt để).
*   **Hậu quả để lại:** Đội ngũ sau này khi thêm bớt UI dễ chạm nhầm dòng code state.
*   **Cách giải quyết đề xuất:** Tạo ra `Providers/LessonProvider` chứa Context. Sẽ trả nợ trong Version 3.0.
