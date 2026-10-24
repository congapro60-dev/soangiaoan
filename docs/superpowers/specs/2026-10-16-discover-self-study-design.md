# Thiết kế: Discover Self-study 10–12

Status: draft implementation slice
Source of truth: `C:\Users\ADMIN\Downloads\PPCT THCS-THPT 26-27.xlsx`, sheets `G10`, `G11`, `G12`.

## Mục tiêu

Tạo danh mục 204 tiết được phân loại là hình thành kiến thức mới trong Discover khối 10–12; cho giáo viên chọn tiết, tạo bản nháp bài tự học bằng luồng Adaptive Builder hiện có; sau khi duyệt, học sinh học qua cổng Adaptive và dữ liệu tiến độ đi vào dashboard hiện có.

## Phân loại PPCT

- G10: 54 tiết mới.
- G11: 84 tiết mới.
- G12: 66 tiết mới.
- Loại trừ: giới thiệu chương trình, luyện tập, ôn tập, kiểm tra, chữa/trả bài, tự chọn, dự án và ôn thi.
- Mỗi seed giữ `sheet`, dòng Excel, tuần, tiết, tiêu đề gốc và tên workbook để truy nguyên.
- Heuristic này là bước lọc tự động; giáo viên vẫn duyệt bài học trước khi xuất bản.

## Luồng giáo viên

1. Mở `Discover Self-study`.
2. Lọc khối/tuần/từ khóa.
3. Chọn một tiết.
4. SmartPlan đưa nguồn PPCT vào `AdaptiveLessonBuilderPage`.
5. AI rà soát nguồn; giáo viên đọc, sửa, duyệt.
6. Pipeline tạo cấu trúc Adaptive: mục tiêu, chẩn đoán, mảnh kiến thức, tuyến hỗ trợ, quick check, exit ticket.
7. Giáo viên duyệt media Muse đã kiểm chứng; publish gate chặn media chưa approved hoặc thiếu alt/caption/transcript.
8. Giao link cổng học sinh; tiến độ dùng `adaptiveSessionProgress` và `studentLearningProfiles`.

## Luồng học sinh

- Học sinh vào cổng bài đã publish.
- Chọn mục đích: chuẩn bị trước, ôn tập/bù lỗ hổng, học trọn bài.
- Chẩn đoán và chọn tuyến `foundation | standard | challenge`.
- Học theo mảnh, làm quick check/exit ticket; checkpoint partial không được ghi thành completed.

## Dữ liệu và nhận xét GV

Tận dụng progress/profile hiện có. Bổ sung liên kết seed nguồn vào bài Adaptive sau khi lưu để dashboard có thể nhóm theo khối, tuần, chủ đề, mục tiêu và lỗi sai. Tối thiểu cần thống kê: đã mở, đang học, đã làm, đạt mục tiêu, số lần cần hỗ trợ, câu sai theo mục tiêu và thời gian cập nhật. Không coi lượt xem media là minh chứng mastery.

## Rủi ro và giới hạn

- Workbook có dòng gộp; tuần được kế thừa từ dòng gần nhất có tuần.
- Mô tả PPCT là nguồn định hướng, không đủ để tự động tạo nội dung Toán chính xác. AI output phải qua giáo viên.
- Không đưa tên, điểm hay bài làm học sinh vào Muse. Muse chỉ tạo asset/brief phía giáo viên.
- Bản hiện tại mới nối danh mục và nguồn vào Builder; routing mục đích riêng, server checkpoint và dashboard nhóm theo seed là các lát tiếp theo.
