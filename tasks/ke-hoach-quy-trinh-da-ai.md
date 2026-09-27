# Kế hoạch — Quy trình làm việc với nhiều AI

> Nhánh `docs/quy-trinh-da-ai` (worktree riêng, dựng từ `origin/main` `8f41102`). Không đụng nhánh `feat/toan-final-template` đang dở.

## Mục tiêu

Chủ dự án có gói trả phí ChatGPT, Claude, Gemini nhưng chưa tận dụng hết. Hai mục tiêu đã chốt: **làm app nhanh hơn** và **giảm tiền API của app**.

## Việc

- [x] Viết `docs/QUY_TRINH_DA_AI.md` → verify: mọi đường dẫn, tên hằng nhắc trong tài liệu tồn tại trên nhánh (script kiểm: 11 đường dẫn + 7 định danh OK).
- [x] Thêm dòng trỏ tới tài liệu trong `HANDOFF.md` → verify: HANDOFF 138 dòng.
- [ ] Chạy thử quy trình: giao Codex review chéo tài liệu qua cầu nối (chỉ đọc) → verify: thread Codex hoàn tất, có danh sách phát hiện kèm file:dòng.
  - Lần 1 (2026-09-28, thread `01a0e42f-300e-7fa2-b076-19ffb013d5d3`): task tạo được và Codex bắt đầu chạy, nhưng dừng ở hộp xin duyệt vì đọc worktree ngoài project (sandbox Windows lỗi khởi tạo), đồng thời tài khoản Codex hết lượt tới 06:39. Bài học đã đưa vào tài liệu (mục 3 và 8). Chạy lại bằng brief dùng `git show` khi còn lượt.
- [ ] Sửa tài liệu theo phát hiện hợp lệ (tự kiểm lại từng phát hiện, không tin ngay).
- [ ] Commit trên nhánh `docs/quy-trinh-da-ai`. Không push khi chủ dự án chưa ra lệnh.

## Tiêu chí nghiệm thu

1. Tài liệu trả lời được: gói nào làm việc gì; giao việc Claude → Codex thế nào; nghiệm thu ra sao; nội dung nào nên làm sẵn; tiền API theo dõi ở đâu; cầu nối lỗi thì xử lý sao.
2. Không có đường dẫn hay tên hằng nào sai so với code trên nhánh.
3. Một task thật đã chạy trọn vòng qua cầu nối theo đúng mẫu brief trong tài liệu.
