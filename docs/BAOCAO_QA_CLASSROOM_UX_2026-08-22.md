# Báo cáo QA — Classroom Workspace và Student Portal

Ngày: 22/08/2026
Phạm vi: thiết kế lại giao diện quản lý lớp học của giáo viên và luồng học sinh xem/nộp bài.
Nguyên tắc: chỉ thay đổi lớp trình bày và view-model; giữ nguyên hợp đồng Firebase, upload, chấm bài, tự chấm và nộp lại.

## Kết luận điều hành

**Kết quả code-level: PASS có điều kiện.** Các test logic, test hồi quy, build production và Firestore Rules đều đạt.
**Chưa đủ điều kiện ký duyệt release live:** chưa có fixture/auth an toàn để chạy trọn luồng với dữ liệu lớp thật; full TypeScript lint bị hết heap trong môi trường hiện tại. Không có dữ liệu production nào được tạo hoặc sửa trong quá trình QA.

## Thay đổi đã kiểm tra

- Học sinh: dashboard ưu tiên bài cần làm, bộ lọc trạng thái, một CTA chính cho mỗi bài, trạng thái chờ chấm/đang chấm/lỗi/nộp lại/đã chấm, upload có tiến trình và thông báo inline.
- Học sinh mobile: bỏ thanh camera cố định che nội dung; nút hành động tối thiểu 44px; tiêu đề dài được xuống dòng; self-submit tách khỏi danh sách bài được giao.
- Giáo viên: chuyển màn hình lớp học sang `Class Workspace` với các vùng `Tổng quan`, `Học sinh`, `Bài giao`, `Bài nộp`, `Báo cáo`; vẫn giữ create/import/sync, PIN, roster, assignment, grading, retry và delete guard hiện có.
- Logic chung: chỉ lấy submission mới nhất theo `assignmentId`; submission tự chấm không bị tính vào bài được giao; submission lỗi không rơi về trạng thái “chưa nộp”.

## Bằng chứng tự động

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| View-model classroom | PASS | `10 tests passed` trong `src/lib/classroom/portalViewModel.test.ts` |
| Toàn bộ Vitest | PASS | `65 test files passed; 990 tests passed` |
| Firestore Rules | PASS | `7 test files passed; 238 tests passed`; exit code 0 |
| API lint | PASS | `npm run lint:api`; exit code 0 |
| Production build | PASS | `4586 modules transformed; built in 1m 23s`; exit code 0 |
| TypeScript mục tiêu | PASS | kiểm tra các file classroom/student/teacher thay đổi; exit code 0 |
| Full `npm run lint` | BLOCKED | TypeScript compiler hết heap ở khoảng 4–5 GB; không xuất hiện diagnostic TypeScript trước khi tiến trình dừng |

### Ghi chú build

Build còn các cảnh báo Vite đã biết về `stream` externalized, dynamic/static import và chunk lớn. Đây là cảnh báo tối ưu bundle, không phải lỗi compile của thay đổi này.

## Bằng chứng browser/responsive

| Kịch bản | Kết quả | Ghi nhận |
|---|---|---|
| Student login route `/lop/7W288E` | PASS | Hiển thị đúng bước chọn học sinh, PIN, `Vào học`, `Đổi mã lớp khác` |
| Student login ở viewport 375px | PASS | Không thấy tràn ngang; tên lớp dài tự xuống dòng; form và CTA vẫn nằm trong khung nhìn |
| Teacher ClassesTab không có lớp | PASS | Hiển thị `Class Workspace`, `Tạo lớp mới`, `Nhập Excel`, summary 0 và empty action rõ ràng |
| Student dashboard sau đăng nhập | NOT RUN | Local Firebase không có auth/fixture an toàn để tạo phiên học sinh mà không đụng dữ liệu thật |
| Workspace với lớp đã chọn và dữ liệu roster/assignment | NOT RUN | Chưa có fixture lớp được seed trong môi trường preview |
| Upload ảnh thật, retry, progress, success sau refresh | NOT RUN | Không gửi file cá nhân lên Firebase/production trong QA này |

### Giới hạn môi trường

Local preview ghi nhận `auth/network-request-failed` vì Anonymous Auth chưa bật và `Missing or insufficient permissions` khi đọc dữ liệu demo Firebase. Đây là blocker môi trường test, không được kết luận là lỗi UI mới. Cần một Firebase Emulator fixture hoặc tài khoản QA riêng để hoàn tất E2E.

## Rủi ro còn lại và tiêu chí nghiệm thu tiếp theo

1. Tạo fixture QA có một lớp, hai học sinh, một bài giao, các trạng thái `submitted`, `grading`, `error`, `graded` và một self-submission.
2. Chạy lại browser ở 320px, 375px và desktop; kiểm tra overflow, focus keyboard, upload progress, retry đúng `assignmentId`, và không có CTA che nội dung.
3. Xử lý giới hạn heap của `npm run lint` hoặc chạy trong CI/runner có heap lớn hơn; sau đó phải có một lần full lint exit code 0.
4. Chạy smoke test production chỉ với tài khoản/fixture được chủ sở hữu cho phép, không dùng file bài thật của học sinh.

**Đánh giá cuối:** code đã đủ điều kiện để commit/push theo yêu cầu hiện tại, nhưng bản phát hành live vẫn giữ trạng thái **NOT APPROVED cho đến khi hoàn tất E2E fixture và full lint**.
