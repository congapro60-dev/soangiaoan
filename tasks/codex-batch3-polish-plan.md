# Batch 3 polish — hai lỗi UI đã nghiệm thu

- [x] T1: lớp trạm nằm dưới lớp nhãn linh vật (giữ terrain, world, LOD, grid và sự kiện nguyên trạng).
- [x] T2: chỉ màn review thêm khoảng cuối trang theo safe-area; thanh điều hướng dùng nền đặc để chữ không xuyên qua.
- [x] Kiểm thử tái hiện, Gemini qua 9Router đưa patch; parent kiểm diff và gate thật; reviewer Claude độc lập chỉ đọc.
- [x] Chụp lại 4 ảnh hành trình (3D/2D ×1280/375), kiểm nhãn không bị trạm che và cuối lời giải nằm trên thanh.
- [x] `npm test`, typecheck, lint, build; log `batch 3 polish done`, trả map về Claude. Không publish/commit/push trong batch polish.

Góc nhìn phản biện: khoảng dưới trang chỉ bảo đảm đọc hết khi cuộn; nền đặc xử lý chữ xuyên qua thanh tại vị trí giữa trang. Không thay fixed navigation hoặc thêm JS đo toolbar.

## Nghiệm thu 10/10/2026

Gate sau sửa: 754/754 tests, typecheck/lint/build exit 0; DOCX/PIN/journey/delete E2E exit 0. RED/GREEN 2/2. Logs `codex-batch3-polish-*.log`; reviewer `ag/claude-sonnet-4-6` PASS, patch `ag/gemini-3.8-flash-low`. Token nền được kiểm trực tiếp: `--lesson-bg: #0f172a`.

Đã xem trực tiếp sáu ảnh trong `tasks/qa-exam-shuffle`: bốn hành trình 3D/2D ×1280/375, hai `review-bottom-*`. Nhãn Em nằm trên trạm trên mobile; tooltip hướng dẫn tạm che nhãn ở ảnh desktop. Cuối lời giải đọc đủ trên thanh có nền đặc ở cả hai kích thước. Đây là QA local, không chứng minh production/thiết bị thật.
