# HANDOFF.md — Trạng thái hiện tại hệ thống

> Cập nhật: 02/11/2026 (bài 12-12-85)

## 1. Trạng thái hiện tại
- Tuần 11 & Addendum: Đã hoàn tất 100% (7/7 bài batch 2 + COMM-AQ-01 + ASS-MDP-01).
- Tuần 12 — Bài mở đầu: Khối 10 (`tds-g10-86` / `10-12-88`) Tiết 2: Tứ phân vị và Mốt:
  - Pha A: Đã hoàn thành giáo án chuẩn `tasks/giaoan-goc-10-12-88.md` và đặc tả Gate D 12 chặng V8.8 `tasks/gate-d-10-12-88.md` (commit `8482b87`). Thầy đã duyệt.
  - Pha B: Đã nạp thành công `newSpec10_12_88` và `newAiError10_12_88` vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` (tổng 8 specs) và timeline `gateD101288` vào `src/lib/liveLesson/v4/lessonAdapter.ts`.
  - Đăng ký hệ thống: Thêm `10-12-88` vào `INTERACTIVE_SOURCE_KEYS`, `PULSE_CUE_IDS_BY_KEY`, danh mục `W11BATCH2` (nâng tổng gói portal lên 59 bài).
  - Validation: Cập nhật regex `validateContract.ts` hỗ trợ W12. Toàn bộ 27 test files (308 tests) Vitest pass 100%.
  - Portal & Xuất bản: Đã xuất bản tuần tự trọn vẹn 59/59 bài (0 lỗi, 0 audit fail).
  - QA Live: Chạy live session `3MvNb43261gPtzmZbQ49` với lớp `10Olinda`, duyệt qua toàn bộ 12 chặng (từ P0 đến P40), đồng bộ GV/HS thời gian thực (`tasks/qa-report-10-12-88.md`).
  - Git Sync: Đã đồng bộ push lên cả 2 nhánh `feat/nop-bai-da-cham` và `main`.

- Tuần 12 — Khối 11 (`tds-g11-82` / `11-12-82`) Tiết 2: Tứ phân vị và mốt của mẫu số liệu ghép nhóm:
  - Pha A: Đã hoàn thành giáo án chuẩn `tasks/giaoan-goc-11-12-82.md` và đặc tả Gate D 12 chặng V8.8 `tasks/gate-d-11-12-82.md`.
  - Pha B: Đã nạp thành công spec và AI error vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` (tổng 9 specs) và timeline `gateD111282` (3-4-2-5-3-1-8-3-5-3-3 phút) vào `src/lib/liveLesson/v4/lessonAdapter.ts`.
  - Đăng ký hệ thống: Thêm `11-12-82` vào `INTERACTIVE_SOURCE_KEYS`, `PULSE_CUE_IDS_BY_KEY` (`['P18', 'P26']`), danh mục `W11BATCH2` (nâng tổng gói portal lên 60 bài).
  - Validation: Toàn bộ 27 test files (312 tests) Vitest pass 100%. `npm run build` PASS.
  - Portal & Xuất bản: Đã xuất bản tuần tự trọn vẹn 60/60 bài (0 lỗi, 0 audit fail).
  - QA Live: Chạy live session `rZ7jL9sGKAxfGcBOlcHj` với lớp `11A1 - Khối 11` (`K8268Y`), duyệt qua toàn bộ 12 chặng (từ P0 đến P40), đồng bộ GV/HS thời gian thực (`tasks/qa-report-11-12-82.md`).
  - Git Sync: Đã đồng bộ push lên cả 2 nhánh `feat/nop-bai-da-cham` và `main` (commit `72703ce`).

- Tuần 12 — Khối 12 (`tds-g12-82` / `12-12-82`) Nguyên hàm: Tiết 3 Tính chất cơ bản của nguyên hàm:
  - Pha A: Đã hoàn thành giáo án chuẩn `tasks/giaoan-goc-12-12-82.md` và đặc tả Gate D 12 chặng V8.8 `tasks/gate-d-12-12-82.md`.
  - Pha B: Đã nạp thành công spec và AI error vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` (tổng 10 specs), timeline `gateD121282` (3-4-2-6-3-1-7-3-5-3-3 phút) vào `src/lib/liveLesson/v4/lessonAdapter.ts`.
  - Đăng ký hệ thống: Thêm `12-12-82` vào `INTERACTIVE_SOURCE_KEYS`, `PULSE_CUE_IDS_BY_KEY` (`['P19', 'P26']`), danh mục `W11BATCH2` (nâng tổng gói portal lên 61 bài). Đặt tiêu đề hiển thị `Tính chất cơ bản của nguyên hàm` để duy nhất trong khối 12.
  - Validation: Toàn bộ 27 test files (316 tests) Vitest pass 100%. `npm run build` PASS.
  - Portal & Xuất bản: Đã xuất bản tuần tự trọn vẹn 61/61 bài (0 lỗi, 0 audit fail).
  - QA Live: Chạy live session `9iKRvkMqm4vDbX1e2f4K` với lớp `12A1 - Toán 12` (`K1282Z`), duyệt qua toàn bộ 12 chặng (từ P0 đến P40), đồng bộ GV/HS thời gian thực (`tasks/qa-report-12-12-82.md`).
  - Git Sync: Đã đồng bộ push lên cả 2 nhánh `feat/nop-bai-da-cham` và `main` (commit `5d3ece6`).

- Tuần 12 — Khối 12 (`tds-g12-86` / `12-12-86`) Phương sai và độ lệch chuẩn: Tiết 2 Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro:
  - Pha A: Đã hoàn thành giáo án chuẩn `tasks/giaoan-goc-12-12-86.md` và đặc tả Gate D 12 chặng V8.8 `tasks/gate-d-12-12-86.md`. Sửa số kế thừa Tiết 1 (x̄_A = x̄_B = 9, s²_A = 0,8, s²_B = 2,8) khớp quyết định thầy duyệt 2026-10-25 (khoá số trong `g12VarianceNumbers.test.ts`).
  - Pha B: Đã nạp thành công spec và AI error ("Thiếu điều kiện" — khuyến nghị đầu tư thiếu khẩu vị rủi ro) vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` (tổng 11 specs), timeline `gateD121286` (3-4-2-6-3-1-7-3-5-3-3 phút) vào `src/lib/liveLesson/v4/lessonAdapter.ts`.
  - Đăng ký hệ thống: Thêm `12-12-86` vào `INTERACTIVE_SOURCE_KEYS`, `PULSE_CUE_IDS_BY_KEY` (`['P19', 'P26']`), danh mục `W11BATCH2` (nâng tổng gói portal lên 62 bài).
  - Validation: 6 file test liên quan 104/104 PASS (batch2 = 11 gói). Full suite 4684/4700 (16 fail không liên quan: 12 timeout môi trường — chạy riêng PASS, 4 hash v832 nền sẵn trên nhánh). `npm run build` PASS.
  - Portal & Xuất bản: Đã xuất bản tuần tự trọn vẹn 62/62 bài (0 lỗi, 0 audit fail).
  - QA Live: Chạy live session `KcPYWecqYriSZ84Xzzh5` với lớp `12A1 - Toán 12` (`K1282Z`), duyệt qua toàn bộ 12 chặng (từ P0 đến P40), HS nhận diện đúng phiên GV (`tasks/qa-report-12-12-86.md`).
  - Git Sync: Đã đồng bộ push lên cả 2 nhánh `feat/nop-bai-da-cham` và `main` (commit `c7c7d65`).

- Tuần 12 — Khối 12 (`tds-g12-83` / `12-12-83`) Nguyên hàm: Tiết 4 Nguyên hàm của hàm số lũy thừa:
  - Pha A: Đã hoàn thành giáo án chuẩn `tasks/giaoan-goc-12-12-83.md` và đặc tả Gate D 12 chặng V8.8 `tasks/gate-d-12-12-83.md`. Kế thừa tính chất tuyến tính Tiết 3 và bảng nguyên hàm Tiết 2.
  - Pha B: Đã nạp thành công spec (2 công thức $\int x^{\alpha} dx$ với $\alpha \neq -1$ và $\int \frac{dx}{x} = \ln|x| + C$) và AI error ("Lỗi khái niệm" — áp công thức ngoài điều kiện $\alpha \neq -1$) vào `banToan-w11-batch2.snapshot.json` (tổng 12 specs), timeline `gateD121283` (3-4-2-6-3-1-7-3-5-3-3 phút) vào `lessonAdapter.ts`.
  - Đăng ký hệ thống: Thêm `12-12-83` vào `INTERACTIVE_SOURCE_KEYS`, `PULSE_CUE_IDS_BY_KEY` (`['P19', 'P26']`), danh mục `W11BATCH2` (nâng tổng gói portal lên 63 bài). Hiển thị: "Nguyên hàm — Tiết 2"; `12-12-86` tự đổi thành "— Tiết 3" theo sequence (quy tắc batch2).
  - Validation: 7 file test liên quan 114/114 PASS (batch2 = 12 gói). `npm run build` PASS (8m15s, zero lỗi).
  - Portal & Xuất bản: Đã xuất bản tuần tự trọn vẹn 63/63 bài (0 bỏ qua, 0 audit fail, 0 lỗi).
  - QA Live: Chạy live session `La9N8SalKCEz1xzgkPku` với lớp `12LoTrinh1` (`AD4GKT`), duyệt qua toàn bộ 12 chặng (từ P0 đến P40), HS nhận diện đúng phiên GV (`tasks/qa-report-12-12-83.md`). Lưu ý hạ tầng: Chrome 136+ chặn debug port trên profile mặc định → dùng `chrome_debug_profile` + bridge auth từ production (`tmp-bridge-auth-local.cjs`); lớp `12A1` không còn, dùng `12LoTrinh1`.
  - Git Sync: Đã đồng bộ push lên cả 2 nhánh `feat/nop-bai-da-cham` và `main` (commit `7daec78`).

- Tuần 12 — Khối 12 (`tds-g12-84` / `12-12-84`) Nguyên hàm: Tiết 5 Nguyên hàm của hàm số mũ:
  - Pha A: Đã hoàn thành giáo án chuẩn `tasks/giaoan-goc-12-12-84.md` (đã tự sửa 1 lỗi số Casio: R(3) = 21/ln2 ≈ 30,30) và đặc tả Gate D 12 chặng V8.8 `tasks/gate-d-12-12-84.md`.
  - Pha B: Đã nạp thành công spec (2 công thức ∫e^x dx = e^x + C và ∫a^x dx = a^x/ln a + C) và AI error ("Lỗi đại số" — quên chia ln a) vào `banToan-w11-batch2.snapshot.json` (tổng 13 specs), timeline `gateD121284` (3-4-2-6-3-1-7-3-5-3-3 phút) vào `lessonAdapter.ts`.
  - Fix trùng tiêu đề: test `lessonAdapter.test.ts` bắt "Phương sai và độ lệch chuẩn — Tiết 4" trùng giữa `12-12-80` (w11) và `12-12-86` (w12) khi thêm `12-12-84` → đổi tiêu đề spec `12-12-86` thành "Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro" (tiền lệ `12-12-82`); cập nhật snapshot + catalog + `gate-d-12-12-86.md`.
  - Đăng ký hệ thống: Thêm `12-12-84` vào `INTERACTIVE_SOURCE_KEYS`, `PULSE_CUE_IDS_BY_KEY` (`['P19', 'P26']`), danh mục `W11BATCH2` (nâng tổng gói portal lên 64 bài).
  - Validation: 7 file test liên quan 118/118 PASS (batch2 = 13 gói). `npm run build` PASS (2m42s, zero lỗi).
  - Portal & Xuất bản: Đã xuất bản tuần tự trọn vẹn 64/64 bài (0 bỏ qua, 0 audit fail, 0 lỗi).
  - QA Live: Chạy live session `ILHiLDgBZTIiRardKCxw` với lớp `12LoTrinh1` (`AD4GKT`), duyệt qua toàn bộ 12 chặng (từ P0 đến P40), HS nhận diện đúng phiên GV (`tasks/qa-report-12-12-84.md`).
  - Git Sync: Đã đồng bộ push lên cả 2 nhánh `feat/nop-bai-da-cham` và `main` (commit `01ad41b`).

- Tuần 12 — Khối 12 (`tds-g12-85` / `12-12-85`) Nguyên hàm: Tiết 6 Nguyên hàm của hàm số lượng giác:
  - Pha A: Đã hoàn thành giáo án chuẩn `tasks/giaoan-goc-12-12-85.md` và đặc tả Gate D 12 chặng V8.8 `tasks/gate-d-12-12-85.md`. Kế thừa tuyến tính Tiết 3 và công thức mũ Tiết 4-5.
  - Pha B: Đã nạp thành công spec (2 công thức ∫cos x dx = sin x + C và ∫sin x dx = −cos x + C) và AI error ("Lỗi khái niệm" — nhầm chiều đạo hàm — nguyên hàm) vào `banToan-w11-batch2.snapshot.json` (tổng 14 specs), timeline `gateD121285` (3-4-2-6-3-1-7-3-5-3-3 phút) vào `lessonAdapter.ts`.
  - Đăng ký hệ thống: Thêm `12-12-85` vào `INTERACTIVE_SOURCE_KEYS`, `PULSE_CUE_IDS_BY_KEY` (`['P19', 'P26']`), danh mục `W11BATCH2` (nâng tổng gói portal lên 65 bài). Hiển thị "Nguyên hàm — Tiết 4", `12-12-86` → "— Tiết 5".
  - Validation: 7 file test liên quan 122/122 PASS (batch2 = 14 gói, test tiêu đề duy nhất PASS). `npm run build` PASS (1m19s, zero lỗi).
  - Portal & Xuất bản: Đã xuất bản tuần tự trọn vẹn 65/65 bài (0 bỏ qua, 0 audit fail, 0 lỗi).
  - QA Live: Chạy live session `96LHQ85J4cfbIMq7xWhD` với lớp `12LoTrinh1` (`AD4GKT`), duyệt qua toàn bộ 12 chặng (từ P0 đến P40), HS nhận diện đúng phiên GV (`tasks/qa-report-12-12-85.md`).
  - Git Sync: Đang chuẩn bị đồng bộ push lên cả 2 nhánh `feat/nop-bai-da-cham` và `main`.

- Tuần 12 — Khối 12 (`tds-g12-87` / `12-12-87`) Phương sai và độ lệch chuẩn: Tiết 3 Luyện tập:
  - Pha A: Đã hoàn thành giáo án chuẩn `tasks/giaoan-goc-12-12-87.md` và đặc tả Gate D 12 chặng V8.8 `tasks/gate-d-12-12-87.md` (kế thừa công thức ghép nhóm và đo rủi ro từ Tiết 1-2 `12-11-80`, `12-12-86`).
  - Tiêu chuẩn V8.8 Master Teacher: Trục dữ liệu thực nghiệm xuyên suốt 50 đơn hàng giờ cao điểm giữa 2 ứng dụng GiaoNhanh (A) và SieuToc (B) trên 5 khoảng có $c=[15,25,35,45,55]$; cùng $\bar{x}=35$ phút; $s^2_A=72 \implies s_A\approx 8{,}49$ phút; $s^2_B=200 \implies s_B\approx 14{,}14$ phút; hướng dẫn cụ thể cho học sinh yếu; câu hỏi phân tầng có hint; bẫy AI quên trừ $\bar{x}^2$; Exit Ticket cô đọng.
  - Pha B: Đã nạp thành công spec và AI error vào `banToan-w11-batch2.snapshot.json` (tổng 15 specs), timeline `gateD121287` (3-4-2-6-3-1-7-3-5-3-3 phút) vào `lessonAdapter.ts`.
  - Đăng ký hệ thống: Thêm `12-12-87` vào `INTERACTIVE_SOURCE_KEYS`, `PULSE_CUE_IDS_BY_KEY` (`['P19', 'P26']`), danh mục `W11BATCH2` (nâng tổng gói portal lên 66 bài). Hiển thị: "Luyện tập phương sai và độ lệch chuẩn — Tiết 6", tiêu đề duy nhất 100% trong toàn khối 12.
  - Validation: 39 file test Vitest PASS 442/442 (100%). Test tiêu đề duy nhất PASS toàn bộ 66 bài. `npm run build` PASS (2m28s, zero lỗi).
  - Portal & Xuất bản: Đã xuất bản tuần tự trọn vẹn 66/66 bài (0 audit fail, 0 lỗi).
  - QA Live: Chạy live session `hJedovT1shHfMCLdWU0z` với lớp `12LoTrinh1` (`AD4GKT`), duyệt qua toàn bộ 12 chặng (từ P0 đến P40), HS nhận diện đúng phiên GV (`tasks/qa-report-12-12-87.md`).
  - Git Sync: Đang chuẩn bị đồng bộ push lên cả 2 nhánh `feat/nop-bai-da-cham` và `main`.

## 2. Việc tiếp theo
1. Trình duyệt kết quả hoàn thành bài `12-12-87`.
2. Triển khai kế hoạch nâng cấp hồi tố các bài cũ Tuần 12 (`12-12-82` đến `12-12-86`) theo chuẩn V8.8 Master Teacher (bổ sung trục dữ liệu thực nghiệm xuyên suốt, câu hỏi tương tác cụ thể kèm hints, teacherCue định hướng cho lớp yếu, chốt Exit Ticket sâu sắc).
