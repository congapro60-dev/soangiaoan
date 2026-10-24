# Duyệt tự động cả bài cần soát + cờ cảnh báo ở dòng bài — Design

> Chính sách chốt với chủ dự án ngày 24/10/2026, thay chính sách giữ lại bài nghi ngờ chốt ngày 25/09/2026 (`autoGrade.ts:1-7`).

## Mục tiêu

Bài AI chấm mà **máy đọc chưa chắc** hoặc **lệch điểm giáo viên** hiện bị giữ lại: không tự duyệt sau 60 phút, không được duyệt khi AI vừa chấm xong, và trong "Chấm & duyệt tất cả" phải tick riêng mới duyệt. Bài này nhiều khi nằm lại hàng tuần.

Nới chính sách: nhóm này được duyệt như bài thường (tự duyệt 60 phút, duyệt loạt, duyệt ngay sau chấm) — đổi lại **dòng bài phải có cờ cảnh báo** để thầy lọc ra chấm lại. Sau khi thầy chấm lại, cờ tắt và thống kê cập nhật theo điểm mới.

## Ba quyết thầy đã chốt (24/10)

1. **Bài cần soát cũng được duyệt tự động** (cách A: cờ tính từ dữ liệu sẵn có, không thêm trường, không migration).
2. **Sau khi thầy sửa/chốt điểm, bài quay về "Chờ duyệt" như cũ** — không duyệt ngay lúc lưu; thầy bấm "Duyệt điểm" hoặc chờ cron 60 phút. Thống kê chỉ tính bài đã duyệt (không đổi).
3. **Cờ chỉ ở bảng điểm lớp** (tab Bài nộp). Báo cáo học sinh (`StudentReport.tsx:492`) và ma trận lớp giữ nguyên.

## Phát hiện nền — chặn uncertain hiện nằm đúng 3 chỗ

| Chỗ | Vị trí | Hành vi hiện tại |
|---|---|---|
| Cron tự duyệt 60' | `planAutoSweep.toApprove` — `autoGrade.ts:50` | Lọc bỏ bài `needsTeacherCheck` |
| Duyệt luôn sau khi AI chấm xong + cron loop | `canAutoApproveFreshGrade` — `autoGrade.ts:56-60`, dùng tại `api/grade-homework.ts:2151, 2233` | Chặn bài `needsTeacherCheck` |
| Nút "Chấm & duyệt tất cả" (UI) | `chamDuyetTatCa` — `AssignmentPanel.tsx:997-1069` | Bài uncertain KHÔNG duyệt trừ khi tick ô "Duyệt luôn cả bài máy đọc chưa chắc" (`:1012-1019, 1026, 1048`) |

Các đường dû̃yệt thủ công KHÔNG chặn uncertain từ trước: nút "Duyệt điểm" từng bài (`AssignmentPanel.tsx:547`), nút "Duyệt (N)" (`:308-309` → `summarizeSelection.unapproved`, `submissionSelection.ts:114-116`), hành động `duyetDaChon` (`:959-988`), và endpoint server `approveSubmissionGrade` (`api/classroom.ts:735-778`).

Nguồn cờ `needsTeacherCheck` (`submissionSelection.ts:46-47`) = `hasUncertainRead` (đọc không rõ / cần soát / độ chắc dưới ngưỡng, `:33-40`) **hoặc** `examCheck.mismatch` (lệch sổ điểm quá `EXAM_CHECK_TOLERANCE = 0.5` thang 10, `examVariants.ts:481, 501-512`; được server tính lúc chấm tại `api/grade-homework.ts:541-555, 690-698`).

## Thay đổi

### 1. Bỏ chặn duyệt (core)

- `autoGrade.ts:50` — `toApprove` bỏ điều kiện `!needsTeacherCheck(submission.grade)`.
- `autoGrade.ts:56-60` — `canAutoApproveFreshGrade` bỏ cùng điều kiện.
- Cập nhật ghi chú chính sách ở header `autoGrade.ts:1-7`: bài cần soát cũng được duyệt, kèm cờ cho thầy (quyết 24/10/2026).
- Nút "Chấm & duyệt tất cả": **bỏ checkbox opt-in** — xóa hàng li giải thích giữ lại bài chưa chắc (`AssignmentPanel.tsx:1012`), box input `:1015-1019`, biến `duyetCaChuaChac`/`conChuaChac` cùng nhánh chọn `canDuyet` (`:1026, 1048, 1058`). Uncertain được duyệt luôn như bài thường; dòng thông báo nêu rõ "X bài là điểm AI còn cần thầy cô soát (cờ vàng ở dòng bài)". Một chính sách duy nhất xuyên suốt, không còn hai luồng.
- `classBacklog` (`submissionSelection.ts:158-159`): `toApprove` = toàn bộ `waiting` (giữ filter `'graded'` + có grade + chưa duyệt); **giữ nguyên** danh sách `uncertain` vì nó chỉ phục vụ đếm hiển thị (`TeacherBacklogCard.tsx:24`, `AssignmentPanel.tsx:673, 1002-1012`).

### 2. Cờ cảnh báo ở dòng bài — không code mới, khoá bằng test

Hai chip đã tồn tại sẵn ở hàng "Lưu ý" của bảng (`AssignmentPanel.tsx:377-393`):

- ⚡ "Đọc chưa rõ" khi `hasUncertainRead(grade)` — tooltip nêu bài làm của em để mở soát.
- "Lệch điểm GV" (đỏ) / "Khớp điểm GV" (xanh) khi có `examCheck` — tooltip có đủ 3 số: điểm GV `sheetScore/10`, cột `sheetLabel`, chênh `diff`.

Cả hai hiện **bất kể trạng thái duyệt** — sau khi cron duyệt tự động bài cần soát, chip vẫn hiện đúng ý. Việc cần làm: thêm test khoá "bài đã duyệt (`teacherApproved: true`, `approvalSource: 'auto_timeout'`) mà còn mismatch/uncertain vẫn hiện chip". Cờ lấy từ dữ liệu sẵn có nên **bài cũ đang tồn tự có cờ**, không phải sửa dữ liệu.

Học sinh/phụ huynh thấy điểm ngay sau duyệt kèm nhãn minh bạch có sẵn "(AI tự duyệt)" (`StudentPortalPage.tsx:683-685`).

### 3. Chấm lại → cờ tắt, thống kê tự cập nhật

- **Luồng sửa tay** `handleSaveSubmissionGrade` (`api/classroom.ts:475-524`): `buildManualGrade` (`manualGrade.ts:86-116`) dựng grade mới **không sao chép `examCheck`** → bài sửa tay mặc định mất `examCheck.mismatch` tự nhiên. Khoá bằng test.
- **`hasUncertainRead` tôn trọng tay thầy**: thêm vào `submissionSelection.ts:33-40` — nếu `grade.editedByTeacher === true` thì trả `false`. Thầy đã xem và chốt điểm từng câu của bài đó, máy không kéo cờ "Đọc chưa rõ" nữa; chip `:377` tự ẩn theo. Đây là thay đổi hành vi duy nhất của mục này.
- **Chấm lại bằng AI** không đổi: server tính lại `examCheck` theo điểm AI mới mỗi lượt (`grade-homework.ts:690-698`); bài thầy đã sửa tay vẫn bị loại khỏi chấm lại loạt (`submissionSelection.ts:100-105`) nhưng chấm lại riêng từng em vẫn chạy có chủ đích.
- **Thống kê tự cập nhật không cần code mới**: mọi thống kê đọc Firestore sống và chỉ tính bài `teacherApproved` (`loClassScores.ts:82,112`, `skillProfile.ts:88`) — sau khi bài sửa tay được duyệt (thầy bấm hoặc cron 60'), số mới thay số cũ. Khoá bằng test chuỗi: bài lệch → tự duyệt 60' → vào thống kê với điểm AI → thầy sửa tay + duyệt lại → thống kê nhận điểm thầy, cờ tắt, các con số khác tính lại bình thường.
- Lưu ý giữ nguyên: sau sửa tay `teacherApproved` về `false` (`manualGrade.ts:112-113`) — đúng quyết thầy số 2.

### 4. Test cập nhật có chủ đích (theo chính sách mới, không phải regression)

| File | Đổi gì |
|---|---|
| `src/lib/classroom/autoGrade.test.ts` | Case `:38` "bài máy đọc chưa chắc giữ lại" và `:56` "lệch sổ điểm không tự duyệt" → đảo thành "được duyệt"; thêm case `canAutoApproveFreshGrade` cho bài uncertain/mismatch |
| `src/lib/classroom/submissionSelection.test.ts` | `classBacklog`: bài mismatch/uncertain nằm trong `toApprove`, `uncertain` vẫn đếm; `hasUncertainRead` trả `false` khi `editedByTeacher` |
| `src/lib/classroom/manualGrade.test.ts` | Grade mới sau sửa tay KHÔNG còn `examCheck` của lượt AI cũ |
| `api/__tests__/grade-homework.auto.test.ts` | Cron duyệt cả bài mismatch/uncertain, vẫn ghi `approvalSource: 'auto_timeout'` |
| Test UI chip (AssignmentPanel nếu harness sẵn) | Chip lệch điểm/đọc chưa rõ vẫn hiện khi bài đã tự duyệt |

## Ngoài phạm vi (không làm)

- Không thêm trường dữ liệu mới, không migration, không đụng shape `examCheck` và ngưỡng `EXAM_CHECK_TOLERANCE`.
- Không thêm chip ở `StudentReport`/`ClassStudentProgressMatrix` (quyết thầy số 3).
- Không thêm hành vi duyệt ngay khi thầy lưu sửa tay (quyết thầy số 2).
- Không đổi `buildManualGradeUpdate` (`manualGrade.ts:123-148`) — chỉ test đang dùng; nếu xác nhận là code chết sẽ báo sau, không dọn trong nhánh này.
- Không đổi luồng duyệt thủ công, `approveSubmissionGrade`, hay nút "Duyệt (N)".

## Tiêu chí nghiệm thu

1. Cron 60' duyệt cả bài `examCheck.mismatch` và bài đọc chưa chắc; bài được duyệt ghi `approvalSource: 'auto_timeout'`; lớp tắt `autoGradeAfterHour` thì vẫn không chạy.
2. AI chấm xong bài cần soát → được duyệt luôn (`canAutoApproveFreshGrade`).
3. "Chấm & duyệt tất cả" không còn hỏi checkbox; thông báo đếm số bài cần cờ.
4. Bảng điểm: dòng bài đã tự duyệt mà còn cần soát vẫn hiện chip vàng/đỏ với tooltip đủ số.
5. Thầy sửa tay → `examCheck` rời khỏi grade, chip "Đọc chưa rõ" tắt dù câu máy cũ còn điểm thấp; bài về "Chờ duyệt" như cũ.
6. Chấm lại bằng AI (từng em) → `examCheck` tính lại đúng theo điểm AI mới.
7. Thống kê lớp/học sinh/hồ sơ năng lực nhận điểm mới ngay sau lượt duyệt tiếp theo, không cần thao tác khác.
8. `npx vitest run src api` xanh; `npm run build` zero lỗi.
