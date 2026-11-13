# HANDOFF.md — Trạng thái hiện tại hệ thống

> Cập nhật: 05/11/2026 — **NGHIỆM THU HOÀN TẤT 24 BÀI TUẦN 18: ĐÃ XỬ LÝ TRIỆT ĐỂ 100% (39 FINDINGS + 2 LỖI KỸ THUẬT T01/T02) TỪ CODEX AUDIT — 218/218 BÀI TOÁN 10–12 ĐẠT CHUẨN V8.8 MASTER TEACHER**

## Điểm hiển thị 9,1299999999 → làm tròn 2 chữ số — 06/11 (Claude)
Danh sách bài nộp hiện `9.129999999999999/10`: `coerceHomeworkGrade` (và `parsePracticeAssessment`) cộng điểm từng câu mà không làm tròn → sai số số thực. Sửa nguồn: `roundScore` (`src/lib/classroom/scoreFormat.ts`, 2 chữ số — giữ điểm lẻ 4,85 / 3,25 thầy cô cho) áp ở hai chỗ cộng điểm; hiển thị: `formatScore` ở danh sách bài nộp, báo cáo HS, cổng HS, xem ảnh bài, bài online. Bài ĐÃ chấm có số xấu trong Firestore chỉ được sửa ở màn hình (chưa ghi lại dữ liệu); chấm lại hoặc GV sửa tay thì lưu số sạch. Chủ dự án hỏi làm tròn 1 chữ số thập phân: chưa đổi vì sẽ làm 4,85 → 4,9, 3,25 → 3,3 (điểm thầy cô đã duyệt) — chờ quyết định.

## 1. Trạng thái hiện tại
- **TOÀN BỘ 218/218 BÀI TƯƠNG TÁC TOÁN 10–12 ĐẠT CHUẨN V8.8 MASTER TEACHER VÀ ĐƯỢC AUDIT NGHIỆM THU:**
  - Khối 10: **72 bài** (Tuần 5–6: 16 bài; Tuần 11: 2 bài; Tuần 12: 6 bài; Tuần 13: 8 bài; Tuần 14: 8 bài; Tuần 15: 8 bài; Tuần 16: 8 bài; Tuần 17: 8 bài; Tuần 18: 8/8 bài `10-18-136`..`143`).
  - Khối 11: **74 bài** (Tuần 5–6: 16 bài; Tuần 11: 4 bài; Tuần 12: 6 bài; Tuần 13: 8 bài; Tuần 14: 8 bài; Tuần 15: 8 bài; Tuần 16: 8 bài; Tuần 17: 8 bài; Tuần 18: 8/8 bài `11-18-130`..`137`).
  - Khối 12: **72 bài** (Tuần 5–6: 16 bài; Tuần 11: 4 bài; Tuần 12: 6 bài; Tuần 13: 8 bài; Tuần 14: 8 bài; Tuần 15: 8 bài; Tuần 16: 7 bài; Tuần 17: 7 bài; Tuần 18: 8/8 bài `12-18-130`..`137`).
- **Khắc phục 100% các điểm chưa đạt từ Codex Audit (24 bài Tuần 18):**
  - **Lỗi kỹ thuật T01 (`boardKnowledge`):** Đã bổ sung trường `boardKnowledge` vào `SourceLessonSpec`, `V4SourceContent`, `buildSourceContent`, `boardTextFor` (`BẢNG LỚN`), `buildScreens` (`S3`), runtime definition (`S3`), và `adaptiveDraft.ts` (`knowledgeConclusion`). Có regression unit test kiểm chứng cả 24 contract Tuần 18.
  - **Lỗi kỹ thuật T02 (KaTeX & Raw LaTeX delimiter):** Bao bọc toàn bộ các biểu thức toán học bằng `$..$` hoặc `$$..$$`, đưa toàn bộ văn bản tiếng Việt ra ngoài math mode. Loại bỏ triệt để 33 trường hợp lộ mã raw LaTeX và triệt tiêu 100% KaTeX Unicode warnings.
  - **Khắc phục 39/39 findings nội dung (F01..F39):**
    - F01: Đổi thành 90 con (20 bò, 40 dê, 30 ngựa).
    - F02: Đặt giá bán cụ thể 100k, 200k, 300k, tổng 130 sản phẩm, thu 25 triệu đồng.
    - F03: Bổ sung điều kiện hệ tương thích và hạng ma trận để phân biệt vô số nghiệm với vô nghiệm.
    - F04: Đổi $C(4; 2) \to D(7; 0)$ để tránh suy biến thẳng hàng.
    - F05: Trực tâm giải ra $H(5/2; 5/2)$.
    - F06: Mẫu số liệu lương 9 nhân viên có ngoại lai duy nhất 25 triệu.
    - F07: Giả thiết 2 vectơ khác vectơ-không trước khi suy ra góc $180^\circ$.
    - F08: Bổ sung góc lệch hướng Đông $135^\circ$, tính khoảng cách $AC \approx 92,7$ hải lý.
    - F09: Tách điều kiện xác định $x - 2 > 0$ vào lời giải.
    - F10: Thêm điều kiện $a \neq 0$ trong trục đối xứng parabol.
    - F11: Làm rõ vai trò nền tảng của vectơ, tam thức bậc hai, hệ BPT.
    - F12: Thiết lập hàm đu quay $H(t) = 22 - 20\cos(\pi t / 30)$ với đáy 2 m.
    - F13: Ba số cấp số nhân tăng là 3, 6, 12 với công bội $q = 2$.
    - F14: Vay trả góp 500 triệu, 5 năm, lãi 0,8%/tháng ra $m \approx 10,53$ triệu đồng/tháng.
    - F15: Bổ sung điều kiện $q \neq 1$ cho tổng cấp số nhân (nếu $q = 1$ thì $S_n = n u_1$).
    - F16: Chứng minh nghiệm bằng $f(-3) = 47 > 0$, $f(0) = -1 < 0$, $f(2) = 7 > 0$.
    - F17: Bổ sung điều kiện liên tục trên đoạn $[a; b]$ trong định lý giá trị trung gian.
    - F18: Khử mẫu $x \to 2$ ra giới hạn 4 khác $f(2) = 3$.
    - F19: Bổ sung giao tuyến $b$ trong công thức giao tuyến mặt phẳng song song.
    - F20: Sửa lời dẫn giáo viên về hai đường thẳng cùng song song một mặt phẳng.
    - F21: Chỉnh hướng dẫn chọn Radian/Degree trên máy tính Casio.
    - F22: Chỉnh hướng dẫn chỉ tô số nguyên/thập phân trên phiếu trả lời ngắn.
    - F23: Thêm trường hợp 3 giao tuyến phân biệt.
    - F24: Hiệu chỉnh tính bền vững của khoảng tứ phân vị (ít nhạy hơn với giá trị ngoại lai).
    - F25: Điều kiện cực trị: giải $y'=0$ và xét sự đổi dấu của $y'$.
    - F26: Sửa nhầm lẫn dấu hàm số thành dấu đạo hàm $y'$.
    - F27: Bổ sung định nghĩa tiệm cận đứng bằng giới hạn một bên.
    - F28: Điều kiện $a \cdot b \cdot c \neq 0$ cho phương trình mặt phẳng đoạn chắn.
    - F29: Làm rõ ý nghĩa độ lệch chuẩn trong độ phân tán thời gian làm bài.
    - F30: Bảng tần số ghép nhóm 50 học sinh, phương sai 22,24, độ lệch chuẩn 4,72 kg.
    - F31: Dây chuyền sữa mẫu 100 hộp có $s = 0,7 < 0,8$ ml đạt tiêu chuẩn ổn định.
    - F32: Phân biệt độ dời $\Delta x = \int v(t)dt$ và quãng đường $s = \int |v(t)|dt$.
    - F33: Tên lửa phóng từ mặt đất $h(0) = 0$, gia tốc $6t$, vận tốc đầu $10$, độ cao $h(4) = 104$ m.
    - F34: Chứng minh nguyên hàm của hàm lẻ trên khoảng đối xứng là hàm chẵn.
    - F35: Điều kiện $0 \le g(x) \le f(x)$ cho thể tích hình phẳng giới hạn bởi 2 đồ thị.
    - F36: Thùng rượu elip có dung tích $V = 47,52\pi \approx 149,3$ lít.
    - F37: Giới hạn của phép thử đạo hàm Casio tại 1 điểm và cách phòng tránh.
    - F38: Xoá chữ "cơ bản" lặp từ.
    - F39: Giảm phạm vi khẳng định trọng tâm cho chương trình HK1 Toán 12.
    - **Bổ sung cụ thể mục 6:** 4 lựa chọn A/B/C/D cho các bài thi (10-18-140, 11-18-134, 12-18-135); hàm chi phí/doanh thu thực tế (10-18-141, 12-18-136).
- **Bộ dữ liệu chuẩn hóa:**
  - `src/data/liveLessonPackages/banToan-w5-w6.snapshot.json`: 51 bài.
  - `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json`: 167 bài (tổng cộng 218 bài).
  - Đăng ký đầy đủ 167 bài trong `W11BATCH2` và 170 bài trong `INTERACTIVE_SOURCE_KEYS`.
  - Mọi `aiError` đều đủ 11 trường, thuộc đúng 4 categories chuẩn và `teacherPrompt` chứa "sửa".
  - Kiểm chứng `displayTitleUnique.test.ts`: 218/218 bài có display title duy nhất 100% trong từng khối lớp (K10: 72 bài, K11: 74 bài, K12: 72 bài).
- **Kiểm định chất lượng:**
  - Vitest test suite: `src/lib/liveLesson/v4` đạt **794/794 PASS** (28 test files).
  - Lint: `tsc --noEmit` exit 0 không lỗi.
  - Production build: `npm run build` thành công, 0 lỗi TypeScript, 0 lỗi bundle.
- **Đồng bộ mã nguồn:**
  - Đã cập nhật và đồng bộ cả `feat/nop-bai-da-cham` và `main`.

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

- Tuần 12 — Khối 12 (`12-12-82`) Nguyên hàm: Tiết 3 Tính chất cơ bản — NÂNG CẤP HỒI TỐ V8.8 MASTER TEACHER (03/11/2026):
  - Trục thực nghiệm mới: Tàu Metro tuyến số 1 rời ga, cảm biến IMU $a(t) = t^2 + 3t$ (dữ liệu 0/4/10/18 m/s²), $v(t) = t^3/3 + 3t^2/2$, $v(3) = 22{,}5$ m/s = 81 km/h, $s(3) = 20{,}25$ m.
  - AI Error viết lại: $\int t(t+3)dt = t\int(t+3)dt$ → $v_{AI}(3) = 40{,}5$ m/s = 145,8 km/h vô lý; đáp án đúng nằm đúng trong 2 tính chất của tiết (bỏ lỗi cũ cần từng phần — ngoài phạm vi tiết học).
  - Bổ sung: interactive question S1 (3 options), teacherCue lớp yếu (S1/S3/S4/S10), hint phân tầng M/S/C, bài Challenge phanh $a=-4t+8$ dừng $t=5$s quãng đường 200/3 m (sửa số liệu sai cũ $v(6)\neq 0$).
  - Validation: Vitest 442/442 PASS; build PASS 56s; xuất bản 66/66 (0 audit fail); QA live session `2LcMkY5ExQ6r7LQ6JViK` lớp `12LoTrinh1` 12 chặng + nút Sau disabled ở chặng 12; HS đồng bộ đúng lớp (`tasks/qa-report-12-12-82-upgrade.md`).

- Tuần 12 — Khối 12 (`12-12-83`) Nguyên hàm: Tiết 4 Nguyên hàm của hàm số lũy thừa — NÂNG CẤP HỒI TỐ V8.8 MASTER TEACHER (03/11/2026):
  - Trục thực nghiệm mới: Chuyến thám hiểm Mặt Trăng. Phóng: Tsiolkovsky Δv = v_e·ln(m₀/m_f) = 3·ln4 ≈ 4,16 km/s (m₀=200 tấn, m_f=50 tấn, v_e=3 km/s). Bay tự do: F = k/r², W = k/R = 6,25×10¹¹ J, tốc độ thoát v ≈ 11,2 km/s khớp thực tế (F(R) ≈ g kiểm chứng ✓).
  - AI Error viết lại: AI thay α = −1 → "Δv không tồn tại, tàu không thể tăng tốc" + bằng chứng thực tế tàu Apollo; phân biệt "không xác định" ≠ "không tồn tại".
  - Bổ sung: interactive question S1 (3 options), teacherCue lớp yếu (S1/S3/S4/S10), hint phân tầng M/S/C.
  - Validation: Vitest 442/442 PASS; build PASS 3m5s; xuất bản 1 bài mới / 65 bỏ qua (0 audit fail); QA live session `fbbdl3hlD5kH7H5h0T44` lớp `12LoTrinh1` 12 chặng + nút Sau disabled ở chặng 12; HS đồng bộ đúng lớp (`tasks/qa-report-12-12-83-upgrade.md`).

- Tuần 12 — Khối 12 (`12-12-84`) Nguyên hàm: Tiết 5 Nguyên hàm của hàm số mũ — NÂNG CẤP HỒI TỐ V8.8 MASTER TEACHER (03/11/2026):
  - Trục thực nghiệm mới: Cuộc đua lãi kép 2 ngân hàng (Lan gửi 10 triệu, 10 năm). BlueBank ghép mỗi năm B(t) = 10·(1,06)^t → B(10) ≈ 17,91 triệu; GreenBank ghép liên tục A(t) = 10·e^(0,06t) → A(10) ≈ 18,22 triệu — e thắng 0,31 triệu.
  - AI Error viết lại: AI dự báo lãi BlueBank "∫(1,06)^t dt = (1,06)^t + C" — quên chia ln 1,06 (kiểm chứng đạo hàm thừa hệ số); hậu quả: bảng dự báo lãi lệch hệ số.
  - Bổ sung: interactive question S1 (3 options, có bẫy t(1,06)^(t−1)), teacherCue lớp yếu (S1/S3/S4/S10), hint phân tầng M/S/C.
  - Validation: Vitest 442/442 PASS; build PASS 4m23s; QA live session `DzHFVh8pJIStuxIO89hW` lớp `12LoTrinh1` 12 chặng + nút Sau disabled ở chặng 12; nội dung mới (BlueBank/GreenBank, 17,91/18,22) xác nhận live ở chặng 2,3,5,6,8,11,12; HS đồng bộ đúng lớp (`tasks/qa-report-12-12-84-upgrade.md`).

- Tuần 12 — Khối 12 (`12-12-85`) Nguyên hàm: Tiết 6 Nguyên hàm của hàm số lượng giác — NÂNG CẤP HỒI TỐ V8.8 MASTER TEACHER (03/11/2026):
  - Trục thực nghiệm mới: Con lắc Foucault bảo tàng Khoa học (l ≈ 9,8 m → ω = 1 rad/s → T = 2π ≈ 6,28 s). Cảm biến v(t) = 0,5·cos t, s(0) = 0 → s(t) = 0,5·sin t, biên độ 0,5 m. S8 nối trục Tiết 3: hệ thống treo cabin tàu metro, F(0) = 5 → F(t) = −cos t + 2 sin t + 6.
  - AI Error viết lại: AI trợ lý bảo tàng dựng li độ sai chiều → "AI làm con lắc chạy ngược chiều" (v > 0 nhưng s′ < 0); sửa đúng s(t) = −cos t + C, với s(0) = 0 → s(t) = 1 − cos t.
  - Bổ sung: interactive question S1 (3 options, bẫy "giống đạo hàm"), teacherCue lớp yếu (S1/S3/S4/S10), hint phân tầng M/S/C.
  - Validation: Vitest 442/442 PASS; build PASS 1m37s; QA live session `6bSogl7CqrBwInBbthXx` lớp `12LoTrinh1` 12 chặng + nút Sau disabled ở chặng 12; nội dung con lắc live ở 7/12 chặng; HS đồng bộ đúng lớp (`tasks/qa-report-12-12-85-upgrade.md`).

- Tuần 12 — Khối 12 (`12-12-86`) Phương sai đo độ rủi ro — NÂNG CẤP HỒI TỐ V8.8 MASTER TEACHER (03/11/2026) — **BÀI CUỐI, MỤC 13 HOÀN THÀNH**:
  - Trục thực nghiệm mới: 3 cổ phiếu X/Y/Z cùng x̄ = 6,8%/phiên (n = 40): X s² = 7,36 (dồn giữa 20/40), Y s² = 12,16 (dồn hai đầu), Z s² = 8,96 — xếp hạng rủi ro X < Z < Y; chốt quyết định chị Hương (100 triệu) theo khẩu vị rủi ro.
  - Bổ sung: interactive question S1 (3 options), teacherCue lớp yếu (S1/S3/S4/S10), hint phân tầng M/S/C, bài tập mới khuyến nghị theo khẩu vị 3 nhà đầu tư; AI Error gắn chặt trục chị Hương.
  - Validation: Vitest 442/442 PASS; build PASS 3m6s; xuất bản 66/66 (0 audit fail); QA live session `zzHtlZJAhuCDBOMW4naj` lớp `12LoTrinh1` 12 chặng + nút Sau disabled ở chặng 12; nội dung 3 cổ phiếu live ở cả 12 chặng; HS đồng bộ đúng lớp (`tasks/qa-report-12-12-86-upgrade.md`).

## 2. Việc tiếp theo
1. Trình duyệt kết quả nâng cấp hồi tố toàn bộ 5 bài `12-12-82` → `12-12-86` (mục 13 XONG).
2. Khối 12 Tuần 12 hoàn chỉnh 6/6 bài chuẩn V8.8 Master Teacher — sẵn sàng cho các tuần tiếp theo theo PPCT.

## Chấm quá giờ bài nhiều ảnh (13/11/2026)
- Bài Nam Phong (11 ảnh) và Hoàng Tuấn Minh (3 ảnh) báo "lỗi hệ thống"; Chi tiết kỹ thuật: "AI xử lý quá lâu…" = hết hạn chót chung của chuỗi chấm (`runChain`), trước đây là `Error` thường nên bị gộp nhãn chung.
- Sửa (`bbbd604`): lỗi này là `GeminiResponseError('provider')` có chữ rõ; trần lớp chưa cuối tăng theo số ảnh (tối đa chừa 20 giây cho lớp sau). 1–4 ảnh giữ 120 giây.
- Đã kiểm: 68 test PASS, tsc sạch, deploy READY, chấm lại cả hai bài trên web đều ra điểm (Nam Phong 6,75/10 bằng model chính, chờ duyệt).
- Chưa làm: chia lượt chấm theo nhóm ảnh (bỏ vì một câu có thể trải nhiều ảnh). Nếu bài lớn vẫn quá giờ thì cân nhắc.
