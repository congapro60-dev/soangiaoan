# PENDING.md — Sổ chờ duyệt / đang làm (cập nhật 30/10/2026)

| # | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | QA live nhóm xoay tua — R1 thẻ DEEP **PASS trên live** (session Dypueu4PNboPdTOqQGon); R2 unit 6/6 PASS, live cần 2 HS (NOT_RUN); 2 fix: listener 403 + R2 sai màn hình | XONG | `tasks/qa-w11-batch2-acceptance.md` |
| 2 | Chức năng 1 (COMM-AQ-01): code + QA live xong — giơ tay/hỏi ẩn danh/công bố/privacy/pulse **PASS** | XONG | commit `0f217fe`, deploy live verified |
| 3 | Chức năng 2 (ASS-MDP-01): **Pha A xong** (inventory 19 + matrix + 30 test plan) + **Pha B xong** (`MathFigureZoom`, `StudentPaperPhotoUploader`, CSS touch target 44px, Math Diagram Standard v1.0 1x–4x) | XONG | commit `ef77f2b` đã push lên cả `feat/nop-bai-da-cham` và `main`, Vercel deploy PASS, unit test PASS (1/1) |
| 4 | Math Diagram Standard v1.0 — áp vào MathFigureZoom (zoom/pan/reset, tỉ lệ chuẩn 1x–4x) | XONG | tích hợp trong `MathFigureZoom.tsx` |
| 5 | Tuần 12 — Bài mở đầu: Khối 10 (`tds-g10-86` / `10-12-88`) Tiết 2 Tứ phân vị và Mốt | XONG | Pha A + B xong, đã nạp snapshot, timeline `gateD101288`, xuất bản portal (59 gói), QA live 12 chặng PASS (`tasks/qa-report-10-12-88.md`). Đã đồng bộ Git cả 2 nhánh. |
| 6 | Tuần 12 — Khối 11 (`tds-g11-82` / `11-12-82`) Tiết 2 Tứ phân vị và mốt của mẫu số liệu ghép nhóm | XONG | Pha A + B xong, đã nạp snapshot, timeline `gateD111282`, xuất bản portal (60 gói), QA live 12 chặng PASS (`tasks/qa-report-11-12-82.md`). Đã nghiệm thu xong. |
| 7 | Tuần 12 — Khối 12 (`tds-g12-82` / `12-12-82`) Nguyên hàm: Tiết 3 Tính chất cơ bản của nguyên hàm | XONG | Pha A + B xong, đã nạp snapshot, timeline `gateD121282`, xuất bản portal (61 gói), QA live 12 chặng PASS (`tasks/qa-report-12-12-82.md`). Đã nghiệm thu xong. |
| 8 | Tuần 12 — Khối 12 (`tds-g12-86` / `12-12-86`) Phương sai và độ lệch chuẩn: Tiết 2 Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro | XONG | Pha A + B xong, sửa số kế thừa Tiết 1 (x̄=9, s²=0,8/2,8), timeline `gateD121286`, xuất bản portal (62 gói, 0 audit fail), QA live 12 chặng PASS (`tasks/qa-report-12-12-86.md`). |
| 9 | Tuần 12 — Khối 12 (`tds-g12-83` / `12-12-83`) Nguyên hàm: Tiết 4 Nguyên hàm của hàm số lũy thừa | XONG | Pha A + B xong, timeline `gateD121283`, xuất bản portal (63 gói, 0 audit fail), QA live 12 chặng PASS (`tasks/qa-report-12-12-83.md`). |
| 10 | Tuần 12 — Khối 12 (`tds-g12-84` / `12-12-84`) Nguyên hàm: Tiết 5 Nguyên hàm của hàm số mũ | XONG | Pha A + B xong, timeline `gateD121284`, fix trùng tiêu đề `12-12-86` (bắt bởi test), xuất bản portal (64 gói, 0 audit fail), QA live 12 chặng PASS (`tasks/qa-report-12-12-84.md`). |
| 11 | Tuần 12 — Khối 12 (`tds-g12-85` / `12-12-85`) Nguyên hàm: Tiết 6 Nguyên hàm của hàm số lượng giác | XONG | Pha A + B xong, timeline `gateD121285`, xuất bản portal (65 gói, 0 audit fail), QA live 12 chặng PASS (`tasks/qa-report-12-12-85.md`). |
| 12 | Tuần 12 — Khối 12 (`tds-g12-87` / `12-12-87`) Phương sai và độ lệch chuẩn: Tiết 3 Luyện tập | XONG | Pha A + B xong, chuẩn V8.8 Master Teacher (trục dữ liệu 50 đơn hàng 2 dịch vụ GiaoNhanh/SieuToc, hướng dẫn lớp yếu, câu hỏi phân tầng có hint), timeline `gateD121287`, xuất bản portal (66 gói, 0 audit fail), QA live 12 chặng PASS (`tasks/qa-report-12-12-87.md`). |
| 13 | Nâng cấp hồi tố các bài cũ Tuần 12 (`12-12-82` đến `12-12-86`) theo chuẩn V8.8 Master Teacher | ĐANG LÀM | `82` XONG (trục Tàu Metro — `tasks/qa-report-12-12-82-upgrade.md`); `83` XONG (trục Chuyến thám hiểm Mặt Trăng, Δv Tsiolkovsky 4,16 km/s + tốc độ thoát 11,2 km/s — `tasks/qa-report-12-12-83-upgrade.md`). Tiếp theo: `84`. |

Thứ tự: 1–12 (xong toàn diện). Đang triển khai mục 13 (nâng cấp hồi tố: 82, 83 xong, tiếp 84→85→86).
