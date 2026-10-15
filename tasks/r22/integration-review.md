# R22 - Review tích hợp thư viện HKI

Ngày 2026-10-15. Chỉ đọc source; chỉ ghi báo cáo này. Không sửa module, catalogue hoặc tests chung. Review độc lập theo tác giả; không gọi model bên ngoài, không tuyên bố review khác hãng.

## Findings

Không phát hiện lỗi mới có thể tái hiện trong source tích hợp đang được root hoàn thiện.

Catalogue cũ đang chờ ba khối hoàn tất và sinh lại theo điều phối của root. Việc artifact cũ thiếu `category` và chưa mang các sửa học liệu mới đã được root xác nhận là bước đang thực hiện, không ghi thành finding mới. Kết luận source dưới đây không thay kiểm tra catalogue cuối.

## Phạm vi đã kiểm

- `components/lesson/LessonCreationWizard.tsx`: metadata khối/tuần/loại tiết, các khối `details` theo tuần, nhóm loại tiết có nút chọn bài, trạng thái lựa chọn và URL tiếp tục.
- `scripts/content/build-hki-catalogue.mjs`: phân loại `formation/practice/review/elective/feedback/project/orientation`, gzip từng package, sáu đề tách riêng.
- `lib/lesson/semester-content.js` và `lib/lesson/authored-content.js`: danh sách metadata không có payload, lookup ID chính xác, giải nén một gói theo yêu cầu, giữ bản sao độc lập của học liệu cũ.
- `app/api/lesson-content/route.js`: xác thực trước đọc nội dung, query allowlist/số lần xuất hiện, tải riêng đề và đáp án GV, `Cache-Control: no-store`.
- `app/exams/page.tsx`: trang yêu cầu đăng nhập, link tải trỏ API đã xác thực, không nhúng đáp án vào danh sách.
- Các call site của `getAuthoredLesson`: chuyển async được await trong route/tests; không tìm thấy call site ứng dụng dùng Promise như package.

## Bằng chứng

- Chạy riêng `tests/lesson-authored-content.test.mjs`, `tests/r17-creation-wizard.test.mjs`, `tests/hki-content.test.mjs` bằng Node VM modules, concurrency 1: 14/14 PASS, exit 0. Lượt này đọc catalogue trước lần sinh lại cuối, nên không dùng để xác nhận học liệu mới đã được đóng gói.
- Kiểm UI bằng hook harness trên source thực với metadata fixture có `category`: khối 11 chỉ hiện bài lớp 11; đổi sang khối 12/tuần 16 hiện đúng nhóm và game tiết 121; chọn game tạo URL `purpose=review`, `source=authored`, `grade=12`; đổi category xóa lựa chọn trước; chọn loại kiểm tra/tuần 18 hiện link `/exams`, không tạo URL lesson giả.
- Danh sách semester loại trường `data`; package/đề chỉ được giải nén sau lookup một ID tồn tại. Client không gửi byte gzip hoặc đường dẫn file để giải nén. Các ID được dùng trong tên file tải xuống đều đã khớp ID catalogue, không có đường đưa chuỗi query tùy ý vào filename thành công.
- Theo mô hình quyền hiện hữu, tài khoản SIWC đã đăng nhập có thể dùng công cụ giáo viên; học sinh dùng token phiên học/thi riêng không vượt được kiểm tra `resolveIdentity(...).user`. Không suy thêm một vai trò giáo viên mà hệ thống hiện không có.
- Snapshot catalogue kiểm tại lượt review: 403 package, sáu đề; danh sách semester khoảng 93 KB JSON; package giải nén lớn nhất 55.428 byte. Tổng nội dung khoảng 15,3 MB nhưng runtime không parse tất cả package khi startup; từng payload được giải nén riêng và không cache toàn bộ bản giải nén.
- Các fixture thiếu dữ liệu, lỗi fetch, query trùng/không hợp lệ, ID `__proto__`/không tồn tại, nguồn bài cũ và bài HKI đều có đường từ chối phù hợp trong tests đã chạy.

## Cần giữ ở cổng tích hợp cuối

1. Sau khi ba khối hoàn tất, root chạy generator catalogue; assert mọi row có `category` hợp lệ và hash package bằng file khối tương ứng. Root đã thêm kiểm parity nguồn vào `tests/hki-content.test.mjs` trong lúc review.
2. Chạy lại tests liên quan trên catalogue cuối; kiểm lựa chọn khối-tuần-loại tiết với dữ liệu thật và thao tác browser, không dùng fixture để thay bằng chứng artifact cuối.
3. Build/Worker mới phải xác nhận `DecompressionStream('gzip')` và route tải gói/đề chạy thật. Các phép đo Node ở lượt này không chứng minh CPU/RSS/startup của Worker production; chưa có kết luận PASS về runtime đó từ review này.

Không có yêu cầu thay cấu trúc source từ review hiện tại. Các giới hạn trên là kiểm chứng đang chờ, không phải lỗi giả định.
