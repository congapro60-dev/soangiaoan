# Kế hoạch — Quy trình làm việc với nhiều AI

> Nhánh `docs/quy-trinh-da-ai` (worktree riêng, dựng từ `origin/main` `8f41102`). Không đụng nhánh `feat/toan-final-template` đang dở.

## Mục tiêu

Chủ dự án có gói trả phí ChatGPT, Claude, Gemini nhưng chưa tận dụng hết. Hai mục tiêu đã chốt: **làm app nhanh hơn** và **giảm tiền API của app**.

## Việc

- [x] Viết `docs/QUY_TRINH_DA_AI.md` → verify: mọi đường dẫn, tên hằng nhắc trong tài liệu tồn tại trên nhánh (script kiểm: 11 đường dẫn + 7 định danh OK).
- [x] Thêm dòng trỏ tới tài liệu trong `HANDOFF.md` → verify: HANDOFF 138 dòng.
- [x] Chạy thử quy trình: giao Codex review chéo tài liệu qua cầu nối (chỉ đọc) → verify: thread Codex hoàn tất, có danh sách phát hiện kèm file:dòng.
  - Lần 1 (2026-09-28, thread `01a0e42f-300e-7fa2-b076-19ffb013d5d3`): dừng ở hộp xin duyệt vì đọc worktree ngoài project; tài khoản Codex hết lượt.
  - Lần 2 (2026-09-29, thread `01a0ea89-4003-71b0-a0a2-4b35f3942636`): app Codex lỗi `workspace routing discovery unauthorized (401)`; chủ dự án đăng nhập lại.
  - Lần 3 (2026-09-29, thread `01a0eaa7-5496-73f2-a62a-cd6326368d80`): sau khi sửa sandbox Windows (`helper_sandbox_lock_failed` ở `.sandbox-bin`), Codex chạy 24 lệnh, trả 12 phát hiện, không lỗi.
- [x] Sửa tài liệu theo phát hiện hợp lệ: tự kiểm lại #1, #5, #7, #8, #10 trên code (đều đúng), đồng ý 7 phát hiện câu chữ còn lại. Viết lại mục 1, 3, 5, 6, 8; kiểm lại 15 đường dẫn + 12 định danh OK.
- [ ] Commit trên nhánh `docs/quy-trinh-da-ai`. Không push khi chủ dự án chưa ra lệnh.

## Tiêu chí nghiệm thu

1. Tài liệu trả lời được: gói nào làm việc gì; giao việc Claude → Codex thế nào; nghiệm thu ra sao; nội dung nào nên làm sẵn; tiền API theo dõi ở đâu; cầu nối lỗi thì xử lý sao.
2. Không có đường dẫn hay tên hằng nào sai so với code trên nhánh.
3. Một task thật đã chạy trọn vòng qua cầu nối theo đúng mẫu brief trong tài liệu.
