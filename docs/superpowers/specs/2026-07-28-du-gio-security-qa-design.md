# Thiết kế vá lỗi QA bảo mật module dự giờ Danielson

## Mục tiêu

Khắc phục toàn bộ phát hiện P0–P2 và Nit trong báo cáo QA ngày 2026-07-28 mà không thay đổi chính sách nghiệp vụ hiện có: BGH đọc toàn bộ, tổ trưởng chỉ đọc/ghi biên bản do mình lập, giáo viên chưa được đọc và không được ghi.

## Thiết kế

- Quy tắc `list` của tổ trưởng kiểm tra từng tài liệu bằng `resource.data.nguoiDuUid == request.auth.uid`, đồng thời giữ giới hạn tối đa 200. Client phải truy vấn với `where('nguoiDuUid', '==', uid)` và `limit(200)` để Firestore chứng minh toàn bộ kết quả đều hợp lệ.
- `gvUid` trở thành trường bắt buộc khi tạo và bất biến khi cập nhật, giống `gvId`. Điều này bảo đảm danh tính Firebase dùng cho chính sách đọc tương lai không thể bị thay sau khi lập biên bản.
- Bộ test emulator bổ sung các nhánh list, vai trò `giao_vien`, thiếu `gvUid` và đổi `gvUid`.
- Composite index `nguoiDuUid ASC, ngay DESC` phục vụ lịch sử của tổ trưởng.
- TypeScript khai báo `node` cục bộ tại script quản trị vì file này dùng `process` và `Buffer`. Không bật Node globals cho toàn bộ source trình duyệt.

## Phạm vi và rủi ro

Chỉ sửa `firestore.rules`, test rules, `firestore.indexes.json`, `tsconfig.json` và tài liệu kế hoạch. Không thay đổi UI hoặc dữ liệu production. Rủi ro chính là truy vấn client thiếu `where`/`limit` sẽ bị từ chối có chủ đích; dữ liệu cũ thiếu `gvUid` không bị sửa tự động và cần migration riêng nếu đã tồn tại.

## Kiểm chứng

1. Chạy test mới trên rules cũ để xác nhận lỗi P0 và schema bất biến bị bắt.
2. Sửa rules tối thiểu rồi chạy toàn bộ `npm run test:rules`.
3. Chạy `npm run test`, `npm run lint`, `npm run build`.
4. Rà diff và code review trước khi merge/push `main`.
