# BTVN web và tổ trưởng — 11/11/2026

> Lịch sử đợt phát hành trước. Thiết kế tab riêng dưới đây đã được chủ máy thay bằng đồng bộ ngay `02. BTVN`; xem `tasks/btvn-auto-sync-2026-11-11.md`. Chưa coi mô tả lịch sử là bằng chứng bản mới đã lên production.

Chủ máy duyệt triển khai sau tư vấn; Codex viết trực tiếp, Claude QA sau. Đúng repo `spai-assistant-ph-hs`, nhánh `preview/zalo-live-test`. Không đụng WIP `scripts/zalo-webhook-sync.cjs`, `tasks/zalo-improvements-2026-11-06.md`.

## Kết quả và giới hạn
- Tự phản chiếu trạng thái nộp web vào tab riêng `02A. NỘP WEB` cùng workbook; không sửa trạng thái kiểm vở/công thức hạnh kiểm ở `02. BTVN`.
- Máy chủ xác định HS và tổ từ config quản trị server-only, không tin tham số client. Tổ trưởng chỉ đọc trạng thái/giờ nộp của tổ được giao, không điểm, nhận xét, ảnh, PIN.
- Sheet có 26 HS / 5 tổ. Chủ máy xác nhận 5 tổ trưởng: Đặng Lam Anh, Nguyễn Mai Phương, Lê Trung Đức, Đinh Bình Minh, Trần Đức Khải; lần lượt tổ 1–5, đối chiếu mã HS từ tab HỌC SINH. Cả 5 đã liên kết bot.
- Deadline: kiểm cả 15 việc, không dùng cờ hạnh kiểm để suy bắt buộc. Chủ máy duyệt BUV hạn 12/11/2026 cho toàn bộ HS chưa tích. Không công bố tự động việc tự nguyện.
- Tab tự động chỉ do server ghi, theo spreadsheetId + sheetId được phê duyệt; polling dùng job hiện có. Giới hạn đọc phải báo lỗi thay vì cắt dữ liệu giả đầy đủ. Ghi lặp cùng snapshot không tạo dòng trùng. Lỗi mirror không chặn nộp bài hay nhắc deadline.

## Kế hoạch
- [x] Regression test: sai tổ/lớp/owner; nộp bổ sung; đang làm dở; ảnh thiếu; không lộ grade/file/PIN; nguồn sai tab; ghi mirror lặp.
- [x] `api/_classroom-group-homework.ts`: projection tối thiểu, config/roster kiểm tra mỗi lần đọc, nguồn nộp file/online.
- [x] `api/_student-workspace.ts`, `src/services/studentWorkspaceApi.ts`, panel portal: action đọc theo context xác thực hiện có, refresh rõ thời điểm; lỗi tổ không làm mất bài cá nhân.
- [x] `api/_assistant-zalo-bot.ts`: lệnh tổ, summary + web handoff theo hồ sơ đã liên kết; PH/HS thường không thấy dữ liệu tổ.
- [x] Adapter mirror Sheet: token ghi tách reader, allowlist tab server-only, cập nhật snapshot bằng batch, không ghi ô kiểm vở. Nối job nhắc hiện có.
- [x] Gate focused tests, toàn API, hai tsc, build; review quyền và dữ liệu, giữ WIP. Chỉ phát hành đúng patch; main web port tối thiểu, không merge nhánh bot vào main.
- [x] Đối chiếu Sheet thật, cấu hình roster/tổ trưởng khi đủ dữ kiện, readback mirror, live riêng Bot Cuong Vu. Không nộp bài HS thật, không gửi lại campaign.

## Lệnh nghiệm thu
`npx vitest run api/__tests__/classroom-group-homework.test.ts api/__tests__/assistant-homework-sheet.test.ts api/__tests__/assistant-deadline-runtime.test.ts api/__tests__/assistant-zalo-bot.test.ts`

`npx tsc --noEmit -p tsconfig.api.json`; `npx tsc --noEmit -p tsconfig.json`; `npm run build`.

## Nghiệm thu trước phát hành
- Bot toàn API: 1481 đạt / 8 bỏ qua (122 file đạt / 1 bỏ qua); Rules emulator 9/9; hai tsc exit 0; build exit 0.
- Web chính port tối thiểu: focused 39/39, hai tsc exit 0, build exit 0; review read-only không thấy blocker, giữ adaptive library APIs.
- Mirror thật 26 HS, ghi thành công; chạy lặp hash ổn định, không thêm dòng. BUV: 20/20 outbox đã gửi; 2 HS chưa tích chưa có tài khoản HS liên kết phù hợp, chưa gửi được.
- Lịch nền hiện có mỗi 5 phút; GitHub có thể trễ. Portal tổ tải dữ liệu mới khi bấm Làm mới.
- Live tài khoản tổ trưởng: chưa E2E; không giả danh HS để kiểm thử. Release/readback ghi ở báo cáo phát hành.

