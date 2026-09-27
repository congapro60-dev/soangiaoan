# Bộ lọc lịch sử lượt nộp của giáo viên — Design Spec

## Trạng thái

Thiết kế đã được người dùng duyệt khi xác nhận “code và push”. Đây là thay đổi UI thuần túy cho màn hình quản lý bài nộp; không thay đổi dữ liệu đã nộp, điểm, Storage, API hoặc Firestore rules.

## Mục tiêu

Giáo viên vẫn bảo toàn được toàn bộ lịch sử nộp để đối chiếu, nhưng màn hình mặc định không bị phình ra bởi nhiều lượt nộp của cùng một học sinh.

## Quyết định thiết kế

1. Mặc định hiển thị **Chỉ lượt mới nhất**: đúng một submission hiện hành cho mỗi học sinh.
2. Giáo viên có thể chuyển sang **Hiện cả lịch sử** để xem bản mới và các bản cũ trong cùng bài giao.
3. Không có thao tác tự động xoá hoặc ghi đè submission cũ. Bản cũ vẫn là dữ liệu truy nguyên.
4. Nút **Chấm AI** và **Duyệt** chỉ xử lý các lượt mới nhất được chọn. Nút **Xóa** xử lý đúng các dòng đang được chọn, kể cả lượt cũ, sau xác nhận rõ phạm vi.
5. **Chọn tất cả** chỉ chọn các dòng đang hiển thị trong chế độ hiện tại; không để một dòng đang bị ẩn bị xóa/chấm ngoài ý muốn.
6. Báo cáo và các bộ tính hiện hành tiếp tục dùng lượt mới nhất, không tính trùng lịch sử.

## Luồng dữ liệu

`baiNop` vẫn là toàn bộ submission của một assignment. `currentSubmissionsForAssignment(baiNop)` tạo projection hiện hành. UI chọn một trong hai projection để render; mọi ID và document gốc vẫn giữ nguyên.

## Ngoài phạm vi

- Không migrate hoặc hợp nhất document trên Firestore.
- Không đổi contract nộp bổ sung, `supplementOf`, grading hoặc profile evidence.
- Không tự động xóa file ảnh cũ.

## Tiêu chí chấp nhận

- Bài có một học sinh nộp nhiều lần mở ra mặc định chỉ có một dòng mới nhất.
- Chuyển sang hiện lịch sử cho thấy cả mới và cũ, có nhãn phân biệt.
- Chọn tất cả trong chế độ mới nhất không chọn ngầm các lượt cũ.
- Chọn lượt cũ trong chế độ lịch sử vẫn cho phép xóa có chủ đích; không đưa lượt cũ vào bulk chấm/duyệt.
- Bài chỉ có một lượt vẫn hiển thị đúng và không thay đổi số học sinh đã nộp.
- Test, lint, build và QA không làm thay đổi dữ liệu classroom hiện có.
