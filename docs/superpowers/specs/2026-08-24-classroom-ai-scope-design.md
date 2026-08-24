# Classroom AI Scope Instructions Design

**Ngày:** 2026-08-24  
**Phạm vi:** Form giao bài, AI giải đáp án, AI soạn hướng dẫn chấm và các lần chấm về sau.

## Mục tiêu

Khi giáo viên nhập lệnh như “Trừ bài 4.3, chỉ giao 4.1, 4.2 và 4.4”, lệnh đó phải:

1. nằm ngay cạnh phần **Đề gửi học sinh** để giáo viên nhìn thấy trong lúc xác định phạm vi bài;
2. được gửi vào prompt khi bấm **Để AI giải đề**;
3. được gửi vào prompt khi bấm **Để AI đề xuất** hướng dẫn chấm;
4. được lưu trên `assignment` và áp dụng cho mọi lần học sinh nộp/nộp lại bài đó;
5. tiếp tục được dùng khi giáo viên sửa lệnh trong bảng bài giao rồi chấm các lần sau.

## Bằng chứng nguyên nhân

`gradingInstructions` đã tồn tại trong `AssignmentDoc`, được lưu bởi `createAssignment`, được sửa bởi `updateAssignmentContent`, và đã đi vào `buildHomeworkGradingPrompt` của luồng chấm thật. Tuy nhiên:

- `buildSolveExamPrompt` chưa nhận lệnh;
- `buildRubricPrompt` chưa nhận lệnh;
- `gradingApi.ts` không gửi lệnh ở hai action `solveAnswerKey` và `suggestRubric`.

Vì vậy AI vẫn giải và chia điểm cho toàn bộ đề, dù lệnh đã được lưu.

## Thiết kế

### 1. Giao diện

Giữ một state và một field dữ liệu duy nhất là `gradingInstructions`, nhưng chuyển khối nhập từ mục riêng cuối form vào ngay dưới danh sách file của **Đề gửi học sinh**. Nhãn mới phải nói rõ đây là:

- phạm vi giao/chấm cho AI;
- không gửi cho học sinh;
- được lưu cùng bài giao và áp dụng cho các lần chấm sau.

Không tự gọi AI theo từng phím gõ vì sẽ đốt quota và tạo race condition. Hai nút AI hiện có sẽ dùng giá trị mới nhất ngay tại thời điểm bấm.

### 2. Prompt giải đáp án

Mở rộng `SolveExamInput` bằng `gradingInstructions`. Prompt phải đặt lệnh trong một khối chỉ dẫn riêng, với quy tắc:

- phần/câu bị bỏ qua không xuất hiện trong đáp án nháp;
- không phân bổ điểm, không coi là phần phải làm;
- giữ nguyên thang điểm giáo viên đã đặt, không tự ý đổi thang;
- nếu lệnh mơ hồ hoặc mâu thuẫn, ghi rõ để giáo viên soát thay vì đoán.

### 3. Prompt hướng dẫn chấm

Mở rộng `buildRubricPrompt` bằng `gradingInstructions`. Hướng dẫn chấm phải chỉ chứa các phần được giao, không tạo mốc điểm hay lỗi thường gặp cho phần bị bỏ qua; vẫn giữ tổng thang điểm đã giao và báo rõ điểm cần giáo viên xác nhận nếu phạm vi làm tổng điểm không xác định.

### 4. Các lần nộp sau

Không thêm logic theo từng submission. API chấm tiếp tục đọc `assignment.gradingInstructions` khi dựng `GradeContext`; vì vậy attempt mới, nộp lại và chấm lại đều dùng lệnh mới nhất đã lưu. Nếu giáo viên sửa lệnh trong màn hình bài giao, các lượt chấm kế tiếp đọc bản cập nhật đó.

## Kiểm thử và tiêu chí nghiệm thu

- Prompt giải đáp án chứa lệnh và các quy tắc loại phần bị bỏ qua.
- Prompt hướng dẫn chấm chứa cùng lệnh và không có đường gọi bỏ sót tham số.
- Prompt chấm bài tiếp tục giữ hành vi hiện tại: phần bị bỏ qua là `not_attempted`, không tạo lỗi/điểm trừ/`weakTopics` giả.
- Form hiển thị ô lệnh trong mục **Đề gửi học sinh** và submit đúng giá trị.
- Toàn bộ unit test, lint, lint API và build pass.

## Không làm trong lô này

- Không tự phân tích ngôn ngữ tự nhiên bằng regex để xóa câu 4.3 sau khi AI trả về; cách đó dễ cắt nhầm “Câu 4.3” trong lời giải hoặc công thức.
- Không tự động gọi model khi giáo viên đang gõ.
- Không thay đổi quyền truy cập, quota, schema Firestore hoặc logic lựa chọn attempt.
