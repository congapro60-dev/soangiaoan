# Sổ điểm: đưa bài HS đã nộp lên sổ với hệ số 1/2/3

Trạng thái: XONG (đã duyệt giả định ngày 2026-10-09; xem mục Kết quả).

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
1. [x] `scoreBook.ts`: thêm `weight`, `source`, hàm thuần `resolveColumnScores` + `weightedAverage` + test (TDD) → verify: `npx vitest run scoreBook`
2. [x] `_score-book.ts`: nhận/kiểm `weight`, `source`; action mới `linkAssignmentColumn`; resolve điểm khi đọc (giáo viên + học sinh + `_parent-self-report`) → verify: test API + `npx tsc --noEmit`
3. [x] `Hs1Mark` thêm `weight`; `parentReportBuilder` / `StudentScoreBoard` / `gradeBookExport` hiện "HS2" và TB có trọng số → verify: test builder + build
4. [x] `ScoreBookPanel`: nút "Đưa bài đã nộp lên sổ" (chọn bài → chọn hệ số → xem trước điểm cả lớp → lưu); đổi hệ số / ghi đè ô / gỡ liên kết; cột liên kết có biểu tượng móc xích → verify: chạy app, thao tác thật
5. [x] `npm run build` không lỗi TS; ghi bài học vào `tasks/lessons.md` nếu có sai sót.

## Quyết định đã chốt với giáo viên
- Bài nộp lại nhiều lần: lấy lượt nộp mới nhất có điểm.
- Mọi điểm đã chấm đều vào sổ, không phân biệt ai duyệt (giáo viên tự sửa sau nếu chấm lại).
- Điểm MOET từ Google Sheet: giáo viên chọn hệ số (Không tính / HS1–3) cho từng mốc; mốc chọn hệ số vào TB. TDS giữ riêng (thang trường không phải thang 10).
- Thêm 2 cột tự tính: Chuyên cần (tỉ lệ bài đã nộp × 10, làm tròn 1 số lẻ) và TB mọi BTVN. Hai cột này chỉ hiển thị, không vào TB có hệ số.
- Bài tính vào chuyên cần: bài không phải kiểm tra định kì, đã đến hạn (hoặc không hạn thì sau 24 giờ), hoặc em đã nộp.

## Kết quả
- Test: 254 file / 2791 test qua; `tsc` (app + api) sạch; `npm run build` qua.
- Kiểm bằng trình duyệt thật (puppeteer, máy chủ giả): chọn bài + hệ số, TB có hệ số = 6.57 khớp tính tay, bài mới nộp tự hiện sau lần làm mới.
- "Real-time" = làm mới ngầm mỗi 30 giây khi tab đang mở (giáo viên: sổ điểm; học sinh: bảng điểm) và ngay khi quay lại tab. Không dùng listener Firestore vì mỗi lần tính phải đọc cả lớp (tốn lượt đọc).
- Chưa kiểm trên Firestore thật (chỉ giả lập) — cần thử một lớp thật sau khi triển khai.
