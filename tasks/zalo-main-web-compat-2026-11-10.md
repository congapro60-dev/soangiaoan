# Web chính tương thích bot Zalo

- [x] Port từng hunk xác thực bot; giữ realtime bảng điểm, thư viện tự học và logic nộp bài của main.
- [x] Giới hạn nguồn deadline theo lớp 11 Columbus và allowlist máy chủ; không đưa mã Sheet riêng vào source.
- [x] Thêm test thu hồi phiên tại câu hỏi live và heartbeat bảng điểm.
- [x] API typecheck; focused auth 40/40; Firestore emulator 8/8.
- [x] npm run build, web/API typecheck exit 0; deadline config 4/4; git diff --check sạch.
- [ ] Root kiểm tra deploy thực tế sau tích hợp.

Không commit/push/deploy hoặc ghi dữ liệu thật trong phần việc này. PH giữ query bot=1 để khôi phục cookie; HS không cần query này. Liên kết gắn assignment chưa tự mở chi tiết bài trên StudentPortal hiện tại.

## Root release checks
- Web/API TypeScript, build, focused auth40/config4 and real Firestore emulator8 passed.
- Full suite:5210 passed,4 known CRLF fixture-hash failures; one worker onTaskUpdate timeout under parallel load. Rechecking without those accepted fixtures with bounded workers.
- Main source remains based on origin/main38e0a0fa; no bot branch overwrite.
- Deadline baseline initialized on server with delivery disabled:26 students,3 required tasks published,0 outgoing messages. Old/optional tasks not broadcast.
