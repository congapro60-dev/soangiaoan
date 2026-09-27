# Báo cáo tổng hợp theo từng bài giao

**Ngày:** 2026-08-25  
**Phạm vi:** báo cáo lớp cho bài nộp ảnh/AI và đề online đã giao  
**Trạng thái:** đã được giáo viên duyệt để triển khai

## Mục tiêu

Trong khu vực **Báo cáo** của một lớp, giáo viên chọn từng bài giao và nhìn được:

- mức độ nộp, chấm, duyệt và chưa nộp;
- phân bố điểm của lớp;
- tỷ lệ đúng từng câu;
- các lỗi và chủ đề xuất hiện nhiều nhất;
- khuyến nghị dạy học bằng tiếng Việt giáo dục, có căn cứ từ dữ liệu.

## Quy tắc dữ liệu

1. Với bài nộp ảnh/AI, mỗi học sinh chỉ lấy lượt nộp mới nhất của `assignmentId`. Lượt cũ vẫn giữ nguyên trong lịch sử nhưng không được tính lần nữa.
2. Kết luận chính thức của bài ảnh/AI chỉ dùng submission `graded` có `grade.teacherApproved === true`. Bài đã chấm nhưng chưa duyệt được đếm riêng và không góp vào điểm trung bình, phân bố điểm, lỗi hay chủ đề.
3. Với đề online, chỉ dùng submission `status === 'graded'`; đây là kết quả đã được server chấm/kiểm tra. Submission `in_progress` hoặc `submitted` không góp vào kết luận.
4. Mẫu số sĩ số lấy từ roster lớp hiện tại. Học sinh chưa có lượt nộp được đếm riêng; không suy ra “yếu” từ việc chưa nộp.
5. Công thức “tỷ lệ đúng câu” là số kết quả `correct` chia cho tổng số kết quả có trạng thái; `partially_correct` hiển thị riêng. Đồng thời hiển thị tỷ lệ đạt điểm (`score / maxScore`) để không làm mất thông tin điểm từng phần.
6. Lỗi và chủ đề được chuẩn hóa khoảng trắng/không phân biệt hoa thường để gom các nhãn giống nhau; chỉ hiển thị nhóm có bằng chứng. Không đưa bài làm thô, tên học sinh hay ghi chú nội bộ vào báo cáo tổng hợp.
7. Nếu số bằng chứng chính thức thấp hơn ngưỡng tối thiểu, giao diện ghi **Chưa đủ dữ liệu** thay vì kết luận chắc chắn. Ngưỡng này là hằng số trong model và được kiểm thử.

## Kiến trúc

- `src/lib/classroom/classReportModel.ts`: model thuần, nhận roster và các assignment đã chuẩn hóa, trả metrics bất biến; không phụ thuộc React/Firebase.
- `src/components/features/classroom/ClassAssignmentReport.tsx`: tải dữ liệu read-only, chọn bài giao, hiển thị thẻ tổng quan, thanh phân bố điểm, bảng câu hỏi, lỗi/chủ đề và khuyến nghị; xuất CSV tổng hợp.
- `src/components/tabs/ClassesTab.tsx`: thay placeholder **Báo cáo lớp** bằng panel mới; giữ các luồng giao bài, chấm và lịch sử không đổi.
- Bài ảnh/AI đọc qua `listAssignmentsForClass` + `listSubmissionsForClass`. Đề online dùng `ClassAssignment` + `getSubmissions` và adapter cùng model để hai loại bài có cùng cách hiển thị.
- Không tạo collection, không migration, không endpoint ghi mới; mọi thay đổi dữ liệu đều nằm ngoài feature này.

## Giao diện

- Chọn bài giao bằng danh sách/card; mỗi bài hiển thị loại bài và thời điểm giao.
- Thẻ: sĩ số, đã nộp, đã chấm/duyệt, chưa nộp, điểm trung bình chính thức.
- Phân bố điểm theo phần trăm thang 10: `0–<5`, `5–<6,5`, `6,5–<8`, `8–10`.
- Bảng câu: số bằng chứng, đúng hoàn toàn, đúng một phần, chưa đạt, tỷ lệ đúng và tỷ lệ điểm đạt.
- Hai bảng “Lỗi phổ biến” và “Chủ đề cần củng cố”, mỗi nhóm có số bằng chứng và tỷ lệ.
- Khối “Khuyến nghị dạy học” sinh quyết định bằng luật xác định, dùng cách xưng hô giáo viên–học sinh phù hợp; không gọi AI và không gắn nhãn học sinh.
- Nút tải CSV chỉ xuất số liệu tổng hợp theo bài/câu/lỗi/chủ đề.

## An toàn và lỗi

- Nếu một nguồn tải lỗi, panel giữ báo cáo các nguồn còn lại và hiển thị trạng thái tải lỗi rõ ràng; không xóa dữ liệu hay báo “0” giả.
- Rỗng dữ liệu hiển thị “Chưa có dữ liệu”, phân biệt với điểm 0.
- Các giá trị điểm ngoài thang, `NaN`, câu thiếu hoặc nhãn lỗi rỗng bị bỏ khỏi metric tương ứng và không làm hỏng toàn bộ báo cáo.

## Kiểm thử nghiệm thu

- Model test: dedupe lượt nộp, chỉ tính duyệt, điểm 0 không bị coi là thiếu, phân bố/median, câu partial, chuẩn hóa lỗi/chủ đề, ngưỡng dữ liệu và khuyến nghị.
- Component test: chọn bài, trạng thái rỗng/lỗi, không hiển thị raw student answer/noteForTeacher, CSV có đúng tổng hợp.
- Regression: full Vitest, `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check`.
- QA độc lập bằng OpenCode/Ox Alpha Free trước khi merge.
