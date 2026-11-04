# Decision Pack · bàn giao worker — T7 QA trình duyệt Discover (22/10, chủ dự án DUYỆT viết dữ liệu thật)

Mục tiêu: QA đủ luột GV giao bài Discover → HS mở và nộp → GV xem thống kê, bằng dữ liệu thật và **trung thực vận chuyển** ghi rõ vào evidence.

## Transport (đã chốt)
- Chạy `npm run dev` trong worktree này (localhost:5173) — `vite.config.ts` đã có dev-only proxy /api → production (cảnh báo dữ liệu thật là CHÍNH XÁC; chủ dự án duyệt ghi đữ liệu thật).
- Trình duyệt: debug Chrome port 9222, profile `$env:TEMP\chrome-smartplan-session` (nếu 9222 không có kết nối thì `Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--remote-debugging-port=9222',"--user-data-dir=$env:TEMP\chrome-smartplan-session",'--no-first-run','--no-default-browser-check'`; chờ ~9s). Mở localhost:5173 trong tab mới. Tài GV bằng Google popup (profile của trình duyệt đã có tài khoản GV); localhost được Firebase Auth whitelist mặc định.
- KHÔNG dùng production URL cho bước giao/nộp (UI mới của T4/T5 chỉ tồn tại trên nhánh này).

## Phân rã luồng
1. **GV chọn lớp**: bật `npm run dev` → mở trang Discover tự học (nút "Discover · Tự học" hoặc route AdaptiveLessonListPage) → panel T5 mới `DiscoverClassPanel`. Xét lớp: nếu `listAccessibleClasses` có lớp demo/test → dùng lớp đó; không có → **12Toán LT1** (`class-1787208442826`).
2. **Giao bài**: chọn bài đã xuất bản → giao qua action `teacherAssignAdaptiveLesson` (ghi assignmentId控件 vào evidence).
3. **HS nộp**: cùng tab hoặc tab mới `localhost:5173/lop` → đăng nhập HS (lớp 12Toán LT1 mã lớp AD4GKT; HS Tuấn Nam `student-1790181722257` PIN `8809`) → thẻ "Discover · Tự học" → nút "Học bài này" mở bài giao (`/adaptive-portal/assignment/:id`) → trắc đáp phần đầu (diagnostic) theo ra interface: chọn **đáp án sai có chủ đích cho 1–2 câu và đúng cho các câu khác** (để đáng kiểm nghiệm thống kê lỗi sai/mức hỗ trợ mỗi câu) → nộp qua `studentAdaptiveSubmit` (máy chỉ chấm). Ghi screenshot/log từng bước.
4. **GV xem thống kê**: quay lại panel → bang thống kê F5 fixture có lượt đếm bắt đầu/xong, % mục tiêu, lỗi sai, mức hỗ trợ khớp những gì đã nộp. Chụp screen.

## Ranh giới cứng
- Ghi dữ liệu thật chỉ ĐỒNG thuyền được duyệt: 1 lượt giao trên đúng lớp đã chọn + 1–2 lượt nộp của đúng HS nói trên. KHÔNG xóa/sửa bài nộp, lớp, submission của kênh khác (lớp đangtestdata: 8 bài bài đã chấm của Tuấn Nam. KHÔNG đụng).
- Không commit, không sửa nhánh trong phiên (qa worker chỉ chay QA; nếu phát hiện bug nhỏ và sửa được mục hot: được sửa, nhưng phải giữ tất cả cổng xanh (test, test:rules, lint, lint:api, build), và KHÔNG up version từ Worktree bạn thiết lập; ghi lại rõ từng sửa vào ledger. Còn task big → ghi `blocked` + bằng chứng vào ledger, không tựChế).
- KHÔNG deploy Firestore rules (supervisor riêng lo), KHÔNG đụng `api/_assistant-confirmations.ts`.
- Trả về: mục "T7 QA — lượt 22/10 (chủ dự án duyệt ghi dữ liệu thật)" trong `docs/spec/discover-self-study-v.ledger.md` + cập nhật `HANDOFF.md`: từng bước pass/fail, transport, assignmentId, những gì đã ghi vào sever;を挙 rõ New proposals riêng.
