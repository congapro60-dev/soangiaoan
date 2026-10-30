# PENDING.md — Sổ chờ duyệt / đang làm (cập nhật 30/10/2026)

| # | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | QA live nhóm xoay tua — R1 thẻ DEEP **PASS trên live** (session Dypueu4PNboPdTOqQGon); R2 unit 6/6 PASS, live cần 2 HS (NOT_RUN); 2 fix: listener 403 + R2 sai màn hình | XONG | `tasks/qa-w11-batch2-acceptance.md` |
| 2 | Chức năng 1 (COMM-AQ-01): code + QA live xong — giơ tay/hỏi ẩn danh/công bố/privacy/pulse **PASS** | XONG | commit `0f217fe`, deploy live verified |
| 3 | Chức năng 2 (ASS-MDP-01): **Pha A xong** (inventory 19 + matrix + 30 test plan) + **Pha B xong** (`MathFigureZoom`, `StudentPaperPhotoUploader`, CSS touch target 44px, Math Diagram Standard v1.0 1x–4x) | XONG | commit `ef77f2b` đã push lên cả `feat/nop-bai-da-cham` và `main`, Vercel deploy PASS, unit test PASS (1/1) |
| 4 | Math Diagram Standard v1.0 — áp vào MathFigureZoom (zoom/pan/reset, tỉ lệ chuẩn 1x–4x) | XONG | tích hợp trong `MathFigureZoom.tsx` |
| 5 | Tuần 12 — Bài mở đầu: Khối 10 (`tds-g10-86` / `10-12-88`) Tiết 2 Tứ phân vị và Mốt | XONG | Pha A + B xong, đã nạp snapshot, timeline `gateD101288`, xuất bản portal (59 gói), QA live 12 chặng PASS (`tasks/qa-report-10-12-88.md`). Đã đồng bộ Git cả 2 nhánh. |
| 6 | Tuần 12 — Khối 11 (`tds-g11-82` / `11-12-82`) Tiết 2 Tứ phân vị và mốt của mẫu số liệu ghép nhóm | XONG | Pha A + B xong, đã nạp snapshot, timeline `gateD111282`, xuất bản portal (60 gói), QA live 12 chặng PASS (`tasks/qa-report-11-12-82.md`). Đã nghiệm thu xong. |

Thứ tự: 1–6 (xong toàn diện). Chuẩn bị chuyển sang bài tiếp theo của Tuần 12 theo PPCT (Khối 12).
