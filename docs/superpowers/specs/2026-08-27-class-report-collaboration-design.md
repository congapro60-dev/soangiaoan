# SmartPlan AI — Báo cáo theo bài giao và cộng tác giáo viên

## Trạng thái

Đã duyệt để triển khai ngày 27/08/2026.

## Mục tiêu

1. Giáo viên có thể chủ động tạo lại báo cáo cho bất kỳ bài đã giao, kể cả khi chưa có học sinh nộp.
2. Nhiều giáo viên có thể cùng vận hành một lớp bằng email tài khoản trên hệ thống.
3. Việc đổi tên, chỉnh điểm và chỉnh nhận xét không làm mất bài nộp, tệp ảnh hoặc lịch sử chấm.

## Quyết định sản phẩm

### Báo cáo

- Thêm nút **Tạo báo cáo** ở khu vực báo cáo của lớp.
- Nút này đọc lại bài giao, danh sách học sinh, lượt nộp và kết quả chấm hiện tại rồi tính lại báo cáo xác định; không gọi AI và không tạo document báo cáo riêng.
- Báo cáo được phép hiển thị với 0 lượt nộp: sĩ số, đã nộp, chưa nộp và trạng thái dữ liệu được hiển thị; điểm trung bình, phân bố điểm, tỷ lệ đúng câu, lỗi phổ biến và chủ đề yếu không bịa số 0 khi chưa có bằng chứng.
- Khi tạo lại thất bại, giữ snapshot đang hiển thị và báo lỗi cùng nút thử lại.
- Chỉ lượt chấm chính thức mới góp vào số liệu chính thức; bản nộp cũ/lượt nháp không được đếm trùng.
- Nút **Tải CSV tổng hợp** dùng cùng snapshot đã tạo.
- Báo cáo tổng hợp không sửa trực tiếp. Giáo viên sửa nguồn (điểm, nhận xét, chủ đề/lỗi hoặc ghi chú bài giao), sau đó bấm **Tạo báo cáo** để tái tính.

### Thành viên giáo viên

Mỗi lớp có một chủ sở hữu hiện tại và các đồng giáo viên. Không dùng mô hình hai chủ sở hữu chính đồng thời.

- `ownerId`: chủ sở hữu hiện tại, có thể thay đổi khi chuyển quyền.
- `originalOwnerId`: người tạo lớp, chỉ để audit và bảo vệ quyền gốc.
- `teacherIds`: projection phục vụ tương thích/truy vấn nhanh; quyền thật được kiểm tra ở server.
- Member có vai trò `owner` hoặc `co_owner`, trạng thái `active`.
- Lời mời lưu email chuẩn hóa; nếu tài khoản đã tồn tại thì gắn UID, nếu chưa thì người dùng đăng nhập bằng đúng email rồi mới nhận/accept được. Hệ thống không tuyên bố đã gửi email nếu chưa có email service.

Quyền:

- Owner/co-owner: xem lớp, giao bài, xem báo cáo, chấm AI, chấm tay, duyệt và sửa điểm/nhận xét.
- Owner hiện tại: đổi tên lớp, quản lý thành viên, xóa lớp và chuyển quyền.
- Chủ gốc không bị co-owner xóa; chủ gốc có thể xóa giáo viên mình đã thêm theo chính sách lớp.
- Chuyển quyền chỉ có hiệu lực sau khi người nhận chấp nhận; owner cũ trở thành co-owner và có thể rời lớp.
- Mọi giáo viên được mời có thể tự rời lớp; không cho người cuối cùng rời nếu sẽ làm lớp không có owner.
- Các thao tác nhạy cảm đi qua API có kiểm tra membership server-side; không dựa vào UID của client gửi lên.

### Dữ liệu và tương thích

- Giữ nguyên `teacherId` legacy trên lớp/bài nộp để không đổi namespace dữ liệu 11 Columbus.
- Bài giao/lượt nộp mới ghi thêm actor tạo/cập nhật nhưng không rewrite hoặc xóa dữ liệu cũ.
- Đổi tên chỉ cập nhật nhãn và metadata, không đổi ID, đường dẫn Storage, assignmentId, submissionId hay liên kết học sinh.
- Sửa điểm/nhận xét tạo history, đặt lại `teacherApproved=false` và yêu cầu duyệt lại; chấm AI lần nữa là bản kết quả mới, không phá lịch sử.
- Xóa kết quả chấm không xóa lượt nộp hoặc Storage; xóa lượt nộp chỉ được thực hiện qua xác nhận rõ ràng.
- Cả bài nộp ảnh/AI và bài online phải đi qua cùng class membership và cùng lớp báo cáo; nội dung/đáp án đề online vẫn không lộ cho học sinh.

## Tiêu chí nghiệm thu

- [ ] Bấm **Tạo báo cáo** với 0, 1 và nhiều lượt nộp; số liệu không đếm bản cũ trùng học sinh.
- [ ] Lỗi tải lại không xóa snapshot trước đó; CSV khớp snapshot.
- [ ] Owner mời được email hợp lệ; người được mời accept/leave; owner/co-owner xem được cùng lớp sau reload.
- [ ] Chuyển quyền yêu cầu accept, bảo vệ owner cũ/gốc và không để lớp không có owner.
- [ ] Owner/co-owner giao bài, xem/chấm/sửa/duyệt; người không thuộc lớp bị từ chối server-side.
- [ ] Đổi tên lớp, học sinh, bài giao; reload và tài khoản giáo viên khác thấy tên mới.
- [ ] Sửa điểm/nhận xét của kết quả AI lẫn chấm tay có history và mất trạng thái duyệt cho tới khi duyệt lại.
- [ ] Dữ liệu và tệp của lớp 11 Columbus không bị reset, migrate phá hủy hoặc thay đổi namespace.
- [ ] Test unit/API/rules, lint, build và QA trình duyệt đăng nhập thật; review độc lập bằng Ox Alpha/OpenCode khi công cụ khả dụng.
