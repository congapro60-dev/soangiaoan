# Hướng dẫn vận hành tiết trực tiếp realtime — G10 P31

## Mô hình dùng trên lớp

Chỉ dùng một đường web cho một phiên:

`/adaptive-live/{sessionId}?mode=teacher` — giáo viên mở trên laptop.

`/adaptive-live/{sessionId}?mode=tv` — giáo viên mở thêm một cửa sổ riêng để đưa lên TV bằng Vcast/Sender.

`/adaptive-live/{sessionId}?mode=student&classId={classId}` — học sinh mở trên điện thoại, laptop hoặc iPad.

Giáo viên giữ cửa sổ `mode=teacher` trên laptop. TV chỉ nhận cửa sổ `mode=tv`; không chiếu cửa sổ giáo viên. Màn hình học sinh chỉ hiện việc của từng em, không đọc được câu trả lời riêng của em khác.

## Chuẩn bị và khởi động

1. Vào **Bài học phân hoá**, kiểm tra bài G10 pilot đã được xuất bản và lớp đã được đồng bộ trong **Lớp học**.
2. Mở bài, chọn **Mở tiết học trực tiếp**, rồi chọn đúng lớp hiện tại.
3. Kiểm tra mã lớp/PIN hiện có. Không tạo một lớp hoặc một PIN thứ hai cho tiết trực tiếp.
4. Sao chép link học sinh/QR có kèm `classId`, gửi cho lớp. Học sinh dùng mã lớp, mã học sinh và PIN đã được cấp.
5. Mở link `mode=tv` ở cửa sổ hoặc tab riêng. Đưa đúng cửa sổ này lên TV bằng Vcast/Sender.
6. Giữ link `mode=teacher` ở laptop. Giáo viên bấm **Bắt đầu / tiếp tục**, chuyển cue bằng **Trước/Sau** hoặc chọn mốc timeline.

## Trong tiết học: màn hình nào làm việc gì

| Nơi hiển thị | Nội dung chính |
|---|---|
| Bảng lớn/bảng phụ và vở | Giáo viên chốt ý, học sinh giải thích, làm bảng, trao đổi bạn đôi và ghi kết luận/ví dụ. Nội dung bảng không được thay bằng việc nhìn màn hình. |
| TV/Vcast Sender | Tiêu đề, câu hỏi chung, hướng dẫn hoạt động và thống kê tổng hợp được phép hiện. Không có kịch bản giáo viên, tên học sinh, PIN, câu trả lời riêng hoặc đáp án ẩn. |
| Thiết bị học sinh | Chọn mục tiêu/tuyến, dự đoán ở cổng **THINK** trước khi xem AI, phân loại/sửa/chứng minh ở **VERIFY**, làm quick-check, dùng gợi ý và gửi exit-ticket khi đã hoàn tất. Chỉ gửi khi chọn hoặc bấm **Gửi**, không gửi từng phím đang gõ. |
| Laptop giáo viên | Cue P00–P40, đồng hồ theo cue, việc GV/HS, bảng/vở, điều khiển phiên và trạng thái dữ liệu. Raw response chỉ ở ranh giới giáo viên, không phải nội dung TV. |

AI Error W01 nằm trong bước đã định nghĩa của pilot. Ở P16:45, TV hiện S8A để học sinh dự đoán `(6;7)` trước; từ P17:15, TV mới chuyển S8B để đối chiếu lời giải AI. Firestore không cho ghi AI Error nếu học sinh chưa có phản hồi THINK. Giáo viên vẫn dùng đối thoại và bảng để học sinh giải thích vì sao sai; thống kê TV chỉ là tín hiệu nhanh, không phải điểm chính thức.

Sau khi đóng phiên, laptop giáo viên hiện form **Minh chứng sau giờ**. Form lưu cục bộ theo session trên thiết bị giáo viên, chỉ gồm loại lỗi, lỗi Quick check, ưu tiên tiết sau, ba cờ minh chứng người–người và một ghi chú ngắn; không gửi lên TV và không thay thế hồ sơ đánh giá chính thức.

## Đồng bộ lớp, bài xuất bản và đóng phiên

- Trước khi mở tiết, lớp phải là lớp mà tài khoản giáo viên đang sở hữu và bài phải ở trạng thái **published**. Nếu danh sách lớp hoặc bài vừa thay đổi, tải lại trang trước khi tạo phiên.
- Khi đang dạy, chỉ giáo viên điều khiển cue. Học sinh gửi phản hồi vào đúng phiên qua link/PIN hiện có.
- Khi kết thúc, giáo viên bấm **Đóng phiên** trên laptop. Từ lúc đó response mới bị chặn.
- Sau khi đóng, hệ thống báo tách bốn trạng thái: **eligible** (đủ điều kiện), **saved** (đã ghi thành công), **failed** (đã đủ điều kiện nhưng ghi lỗi) và **incomplete** (thiếu mapping/route/minh chứng). `eligible` không có nghĩa là đã ghi; chỉ `saved` mới là kết quả đã xác nhận.
- Một record adaptive chỉ được ghi khi máy chủ xác minh session đã đóng, giáo viên sở hữu session/lớp, `studentLinks/{participantUid}` trỏ đúng roster document, adaptive student ID được tạo từ mã học sinh trong roster, route đến từ response `route` đã lưu trên server hoặc adaptive profile server và có AI Error/diagnostic, quick-check, exit-ticket. Thiếu mapping, route hoặc một minh chứng thì fail-closed, không ghi record hoàn tất.
- Retry sau khi đóng dùng cùng progress ID và timestamp đóng session; record đã ghi không làm tăng `totalSessions` lần nữa. Không suy diễn route từ UID, từ G1/G2/G3 hoặc từ giá trị mặc định.

## Xử lý sự cố

### Học sinh vào nhầm lớp hoặc link không khớp

Kiểm tra link có đúng `sessionId` và `classId` không; học sinh đăng xuất phiên học sinh cũ, mở lại link của lớp hiện tại và nhập đúng mã học sinh/PIN. Không sửa `participantUid` bằng tay và không dùng UID ẩn danh làm mã học sinh.

### Bài chưa đồng bộ hoặc chưa xuất bản

Quay lại tab **Bài học phân hoá**, kiểm tra bài đúng phiên bản đã xuất bản và lớp đúng tài khoản giáo viên. Tải lại rồi mở phiên mới; không dùng một session cũ gắn với bài/lớp khác.

### “Missing or insufficient permissions” khi tạo phiên

Đây là lỗi quyền Firestore, không phải lỗi của màn hình TV. Kiểm tra ba điều: (1) tài khoản hiện tại là tài khoản giáo viên thật, không phải phiên dùng thử/mock; (2) lớp đã đồng bộ thành document `classes/{classId}` và trường `teacherId` đúng UID hiện tại; (3) Rules của project `smartplan-ai-14200` đã được deploy cùng bản web đang chạy. Sau khi sửa, tải lại **Bài học phân hoá** và tạo phiên mới; không dùng lại session tạo dở.

### Phiên hết hạn hoặc đã đóng

Không thể gửi response mới. Giáo viên mở phiên mới; học sinh dùng link/QR của phiên mới. Các response đã xác nhận trước đó không được báo thành công lần nữa nếu chưa có xác nhận máy chủ.

### TV hiện sai cửa sổ Vcast/Sender

Dừng chia sẻ, chọn đúng cửa sổ/tab có URL `mode=tv`. Laptop phải giữ `mode=teacher`. Nếu TV hiện nút điều khiển, kịch bản GV hoặc ô nhập câu trả lời, đang chiếu nhầm cửa sổ; dừng và chọn lại ngay.

### Thống kê TV cập nhật chậm

Giữ nguyên cue hiện tại, kiểm tra laptop còn mạng và trạng thái không báo mất kết nối. Chờ tối đa vài giây rồi tải lại riêng cửa sổ TV nếu cần. Không đọc số liệu đang cũ như số liệu realtime mới; giáo viên tiếp tục điều phối bằng bảng, vở và trao đổi trực tiếp.

### Mất mạng

Học sinh thấy “đã lưu trên thiết bị — chờ đồng bộ” thì giữ nguyên tab, không bấm gửi lặp nhiều lần. Khi mạng trở lại, chọn **Thử đồng bộ lại** hoặc giữ tab mở để hàng đợi gửi tuần tự. Giáo viên/TV phải hiển thị bản trạng thái cuối đã đồng bộ, không khẳng định số liệu mới.

## Đường lui V2

Nếu Firebase, mạng lớp hoặc TV không ổn định, dừng việc phụ thuộc realtime và dùng gói V2 local-first đã chuẩn bị: giáo viên chạy nội dung local, dùng bảng/vở và phiếu học tập. PPTX/DOCX vẫn là tài liệu offline/dự phòng; V3 không tự thay đổi PowerPoint trong lúc trình chiếu. Sau tiết học, chỉ nhập hoặc lưu kết quả adaptive khi có đủ mapping tin cậy và minh chứng; không nhập bù bằng cách đoán danh tính.
