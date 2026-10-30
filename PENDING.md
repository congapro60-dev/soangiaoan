# PENDING.md — Sổ chờ duyệt / đang làm (cập nhật 29/10/2026)

| # | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | QA live nhóm xoay tua — R1 thẻ DEEP **PASS trên live** (session Dypueu4PNboPdTOqQGon); R2 unit 6/6 PASS, live cần 2 HS (NOT_RUN); 2 fix: listener 403 + R2 sai màn hình | XONG | `tasks/qa-w11-batch2-acceptance.md` |
| 2 | Chức năng 1 (COMM-AQ-01): code + QA live xong — giơ tay/hỏi ẩn danh/công bố/privacy/pulse **PASS**; NOT_RUN: realtime banner HS, TV overlay mode=tv, Coach backlog, mobile viewport | XONG (P0) | `tasks/qa-w11-batch2-acceptance.md` mục COMM-AQ-01 |
| 3 | Chức năng 2 (ASS-MDP-01): **Pha A xong** (inventory 19 + matrix + 30 test plan) + **Pha B code xong** (`MathFigureZoom`, `StudentPaperPhotoUploader`, CSS touch target/safe-area, tích hợp `StudentLiveView`) | CHỜ COMMIT & PUSH | 5 file staged, đợi duyệt chạy lệnh Git |
| 4 | Math Diagram Standard v1.0 — áp vào MathFigureZoom (zoom/pan/reset, tỉ lệ chuẩn) | ĐÃ ÁP DỤNG | tích hợp trong `MathFigureZoom.tsx` |

Thứ tự: 1 ✓ → 2 (chờ duyệt Gate P+D) → 3 (áp 4).
