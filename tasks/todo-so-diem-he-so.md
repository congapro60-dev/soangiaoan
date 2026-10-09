# Sổ điểm: đưa bài HS đã nộp lên sổ với hệ số 1/2/3

Trạng thái: CHỜ DUYỆT KẾ HOẠCH (chưa viết code).

## Hiện trạng (đã đọc code)
- `src/lib/classroom/scoreBook.ts`: cột HS1 chỉ có `{id,label,date}`; điểm gõ tay `hs1[studentId][columnId]`; TB = trung bình cộng thường.
- `api/_score-book.ts`: `saveHs1Column` / `deleteHs1Column` / `saveExamScores` / `studentScoreBook`. Thang cứng 0–10.
- `ScoreBookPanel.tsx`: nút duy nhất "Thêm cột điểm hệ số 1" → nhập tay từng em.
- Điểm bài nộp nằm ở `SubmissionDoc.grade` (`score`, `maxScore`, `teacherApproved`, `approvalSource`). Không có đường nào nối sang sổ điểm.
- Báo cáo phụ huynh (`parentReportBuilder`, `reportPeriod`) và cổng học sinh (`StudentScoreBoard`) đọc `Hs1Mark` — phải đổi cùng.

## Thiết kế
Cột sổ điểm có thêm 2 trường (tương thích ngược: thiếu = như cũ):
- `weight: 1 | 2 | 3` (mặc định 1)
- `source?: { type: 'assignment'; assignmentId: string }` (thiếu = cột nhập tay như hiện nay)

Điểm cột liên kết được TÍNH LÚC ĐỌC ở máy chủ, không sao chép:
1. Với mỗi HS: lấy bài nộp của bài giao đó có `grade.teacherApproved` (bỏ `student_ai`), chọn bản mới nhất.
2. Quy về thang 10: `score / maxScore * 10`, làm tròn 2 số lẻ.
3. Ô giáo viên ghi đè tay (`hs1[sid][col]`) thắng điểm tự lấy.
4. TB môn = Σ(hệ số × điểm) / Σ(hệ số của các cột HS đó đã có điểm).

## Các bước
1. [ ] `scoreBook.ts`: thêm `weight`, `source`, hàm thuần `resolveColumnScores` + `weightedAverage` + test (TDD) → verify: `npx vitest run scoreBook`
2. [ ] `_score-book.ts`: nhận/kiểm `weight`, `source`; action mới `linkAssignmentColumn`; resolve điểm khi đọc (giáo viên + học sinh + `_parent-self-report`) → verify: test API + `npx tsc --noEmit`
3. [ ] `Hs1Mark` thêm `weight`; `parentReportBuilder` / `StudentScoreBoard` / `gradeBookExport` hiện "HS2" và TB có trọng số → verify: test builder + build
4. [ ] `ScoreBookPanel`: nút "Đưa bài đã nộp lên sổ" (chọn bài → chọn hệ số → xem trước điểm cả lớp → lưu); đổi hệ số / ghi đè ô / gỡ liên kết; cột liên kết có biểu tượng móc xích → verify: chạy app, thao tác thật
5. [ ] `npm run build` không lỗi TS; ghi bài học vào `tasks/lessons.md` nếu có sai sót.

## Câu hỏi còn mở (đã đặt giả định)
- Bài nộp lại nhiều lần: lấy bản mới nhất đã duyệt (giả định).
- Điểm HS tự chấm bằng AI (`student_ai`) không vào sổ chính thức (giả định).
- Điểm định kì MOET/TDS từ Google Sheet: giữ riêng, không trộn vào TB hệ số (giả định).
