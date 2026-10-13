# QA luồng HS — 14/10/2026

Phạm vi đã duyệt: ảnh/bút đỏ WIP + 5 mục HS + lịch sử cả năm + lời chữa/toán dễ đọc.
Đích người dùng chốt: commit/push main, không deploy/promote thủ công.

## Source và dữ liệu

- Nhánh codex/student-submitted-photos; base a7b7f93. Giữ WIP, không sửa điểm/đáp án/bài nộp production.
- Index server đủ 300 bài/500 lượt fixture gồm bài đóng; metadata không ảnh/questionResults/nhận xét nội bộ.
- Quyền kiểm studentLinks, enrollment hiện tại, đúng GV/lớp/HS và targetStudentIds.
- Report list/detail riêng theo phiên, snapshot identity trước live merge, allowlist lồng có kiểm kiểu/enum;
  cùng pipeline snapshot/live/fallback/overrides như PH, không PIN PH hoặc parent event.
- Bài đóng: chỉ xem lịch sử; xác nhận/ảnh/mã đề/chấm trực tiếp HS bị chặn ở server, GV vẫn chấm.
- Câu blank lịch sử giữ ẩn điểm, hiển thị chờ GV; không bắt HS làm bù.

## Browser component thật

Harness cục bộ dùng StudentPortalDashboard/StudentAssignmentCard/ClarifyPanel/StudentSubmittedWork/
SubmissionPhotoReview/StudentScoreBoard/StudentCompetencyPortfolio/StudentPublishedReports/NhanXetMarkdown thật.
CSS từ production build của đúng worktree; API/Storage thay bằng stub, không proxy production.
Ảnh khối12 lấy ở phiên GV trước; tọa độ/lời chữa fixture, không phải chứng minh AI mới định vị đúng.

- 390×844: 20 dòng, chiều cao danh sách1831px, scrollWidth382<=390.
- 820×1180: 20 dòng, chiều cao1751px, scrollWidth812<=820; sticky nav trên.
- 430/1024/1366: không tràn trang hoặc khối toán; không katex-error.
- Paging sang2/15 vẫn300 kết quả; tìm Bài000 đã đóng được.
- Badge1 câu đúng bài; chỉ khi mở mới hiện câu hỏi, đầu danh sách không có ClarifyPanel.
- ChọnB rồi đổi Sổ điểm/quay lại: aria-pressed=true; không gửi đáp án.
- Draft mục tiêu năng lực giữ khi đổi tab; tệp chờ nộp vẫn có nút Nộp1 tệp sau đổi tab, không bấm nộp.
- Sổ điểm hiện TB có hệ số7.63 từ server fixture; tìm/paging không đổi TB.
- Thống kê300 bài/298 có điểm, TB8.0/10 giữ nguyên khi đổi trang; AI periodic không tính.
- Report công bố fixture mở qua tab, dùng renderer PH, không tràn390.
- Ảnh bài đã nộp mở được; chạm dấu mở lời chữa; lời dẫn riêng, chuỗi tích vô hướng aligned, giữ số hạng/đơn vị.
- Ô type=date của browser fill không phát onChange trong lần thử đầu; thao tác ArrowUp/Tab thật xác nhận bộ lọc hoạt động.
- Viewport đã reset. Không chỉnh/upload/submission/approval production.

Ảnh chứng cứ cục bộ:
C:/Users/ADMIN/.codex/visualizations/2026/10/10/01a123b1-a378-73b1-9aa4-685e5b67efaa/student-redesign-390.jpg
C:/Users/ADMIN/.codex/visualizations/2026/10/10/01a123b1-a378-73b1-9aa4-685e5b67efaa/student-redesign-820.jpg
C:/Users/ADMIN/.codex/visualizations/2026/10/10/01a123b1-a378-73b1-9aa4-685e5b67efaa/student-redesign-math-390.jpg

## Automated / review

- Rules emulator demo-student-workspace303/303,8 files,exit0; không deploy Rules.
- App/API lint exit0. Build cuối exit0, index1507.77kB so baseline production1485.15kB (~+1.5%);
  warning chunk>500KB đã có và được baseline protocol chấp nhận.
- Native independent review PASS; UI/math52/52, quyền/closed39/39, parent regression46/46.
- Gemini ag/gemini-3.8-flash-low: UI PASS; backend final adjudication PASS.
  Claim unapproved correction leak bị bác bằng nhánh approved?fullRows:undefined và tests;
  claim token mutation bị bác vì tokens mới local, dấu chấm chuyển vào dòng cuối, tests bảng/trích dẫn giữ nguyên.
- Canary Claude429; Gemini Pro ag404/gc403; Flash low OK. Không tự đổi router/config.
- Full suite2920/2920 đạt trước chốt guard closed; final2931 có test22 lần scrypt timeout5s.
  Chạy riêng parent36/36 đạt, test đó2821ms. Chỉ tăng timeout test đó15s.
- Full final2931/2931,275 files,exit0 (06:27:18,152.20s); lệnh npm run test -- --maxWorkers=2 --testTimeout=15000.
  Cổng source/browser/review passed. Không thay thời gian/logic xác thực production.

## Giới hạn

Main đã push source7c88a50d4765fdcbbf6c8384aa97194c41ea6ab9; ls-remote xác nhận đúng SHA, exit0.
API Typecheck và Quality Gate trên GitHub đang chạy lúc ghi kết quả; deployment/QA production chưa được xác nhận.
Tài liệu bàn giao chốt ở commit tiếp, không thay source đã kiểm.

Production vẫn a7b7f93 khi khảo sát. HS Lê Trung Đức và Trần Phúc Minh hiện không có pending thật;
scoped clarify được chứng minh bằng source/fixture, không tự tạo câu hỏi thật.
AI định vị dấu mới trên lô ảnh thật chưa được đo; ảnh đã chấm cũ không tự có dấu nếu chưa chấm lại.
Không gọi AI/chấm lại bài thật để đủ QA. Chất lượng AI là mục QA riêng cho Claude/GV tiếp tục.
