# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-87`)

> **Mã bài**: `12-12-87` (`tds-g12-87` / `g12_w12_p87_v4`)  
> **Tên bài**: Luyện tập phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm (Tiết 6 trong tuần)  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 03/11/2026

---

## 1. Trạng thái mã nguồn & Đặc tả Gate D
- **Pha A**:
  - Giáo án gốc chuẩn 40 phút: `tasks/giaoan-goc-12-12-87.md` (kế thừa công thức ghép nhóm và đo rủi ro từ Tiết 1-2 `12-11-80`, `12-12-86`).
  - Đặc tả 12 chặng Gate D: `tasks/gate-d-12-12-87.md` (chuẩn V8.8 Master Teacher: trục dữ liệu thực nghiệm 50 đơn hàng của 2 dịch vụ GiaoNhanh A và SieuToc B, hướng dẫn chi tiết cho lớp yếu, câu hỏi phân tầng có hint).
- **Pha B**:
  - Snapshot: Đã tích hợp spec (3 công thức $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar{x}^2$, $s^2 = \frac{1}{n}\sum n_i(c_i - \bar{x})^2$, $\bar{x} = \frac{1}{n}\sum n_ic_i$, $s = \sqrt{s^2}$; 2 ví dụ; 6 bài tập phân hoá M/S/C; 2 câu quick; mistakes; boardKnowledge) và AI error ("Lỗi đại số" — AI quên trừ $\bar{x}^2$: $s^2 = 1297 \implies s \approx 36{,}01$ phút) vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` (tổng 15 specs).
  - Timeline V8.8: `gateD121287` trong `src/lib/liveLesson/v4/lessonAdapter.ts` phân bổ 3-4-2-6-3-1-7-3-5-3-3 phút (tổng 2400s / 40 phút).
  - Đăng ký hệ thống: `INTERACTIVE_SOURCE_KEYS`, catalog `W11BATCH2` (nâng batch 2 lên 15 bài, toàn hệ thống 66 bài), Pulse cues `['P19', 'P26']`.
  - Hiển thị: "Luyện tập phương sai và độ lệch chuẩn — Tiết 6" (sequence g12 Tuần 12: 82→1, 83→2, 84→3, 85→4, 86→5, 87→6); tiêu đề duy nhất 100% trong khối 12.

---

## 2. Kết quả kiểm thử tự động (Vitest) & Build
- **Vitest**: Toàn bộ test suites liên quan đến liveLesson v4: **39 test files PASS, 442/442 tests PASS 100%** (`week11Batch2Catalog`, `week11Catalog`, `interactiveUpgrade`, `lessonAdapter`, `runtimeDefinition`, `sequentialPublication`, `liveQuestionService`, `g12VarianceNumbers`, v.v.). Test duy nhất hoá tiêu đề toàn bộ 66 bài trong hệ thống PASS tuyệt đối không trùng lặp.
- **Build**: `npm run build` hoàn tất xuất sắc không lỗi TypeScript hay lỗi đóng gói (`built in 2m 28s`).

---

## 3. Xuất bản trên Portal
- **Số lượng gói bài**: Tổng cộng 66 gói bài học phân hoá (51 bài W5–W6 + 15 bài batch 2).
- **Trạng thái xuất bản**: Nút "Tạo và xuất bản 66 bài" hoàn tất thành công `66/66` bài, **0 audit fail, 0 lỗi** (trong đó có bài `12-12-87`).
- **Tab Bài học tương tác**: Hiển thị đầy đủ bài `12-12-87` với nhãn `Lớp 12 · Tuần 12 · Tiết 87`, tiêu đề "Luyện tập phương sai và độ lệch chuẩn — Tiết 6", trạng thái `Đã xuất bản`.

---

## 4. Kết quả QA Live Session thực tế
- **Session ID**: `hJedovT1shHfMCLdWU0z`
- **Lớp kết nối**: `12LoTrinh1` (ID: `class-1787208442826`, Mã lớp: `AD4GKT`)
- **Điều khiển GV**: Duyệt trơn tru qua toàn bộ 12 chặng V8.8:
  1. Chặng 1/12: Mở đầu — Kế hoạch 0–3′ (3:00, P00)
  2. Chặng 2/12: Câu hỏi định hướng — Tình huống bạn Lan đặt cơm trưa trước cuộc họp 12h00 (Kế hoạch 3–7′, 4:00, P03)
  3. Chặng 3/12: Mục tiêu do lớp tổng hợp — Must/Should/Could (Kế hoạch 7–9′, 2:00, P07)
  4. Chặng 4/12: Công cụ toán học — 4 bước tính, 2 công thức, làm mẫu dịch vụ A ($s^2_A = 72 \implies s_A \approx 8{,}49$ phút, Kế hoạch 9–15′, 6:00, P09)
  5. Chặng 5/12: Think → AI → Verify (AI Error: quên trừ $\bar{x}^2$, tính ra $s^2 = 1297 \implies s \approx 36{,}01$ phút, Kế hoạch 15–18′, 3:00, P15)
  6. Chặng 6/12: Câu hỏi nhóm & phân luồng (Kế hoạch 18–19′, 1:00, P18)
  7. Chặng 7/12: Nhiệm vụ có lựa chọn (3 luồng M/S/C — Dịch vụ B: $s^2_B = 200 \implies s_B \approx 14{,}14$ phút; tư vấn Lan chọn A vì chỉ 4% đơn trễ > 50 phút; kiểm tra Casio $\sigma_x$ vs $s_x$ và hệ số $CV$, Kế hoạch 19–26′, 7:00, P19)
  8. Chặng 8/12: Post-check cá nhân & ĐGTX ($n=40, \bar{x}=20, \sum n_ic_i^2 = 16400 \implies s^2 = 10$, Kế hoạch 26–29′, 3:00, P26)
  9. Chặng 9/12: Kiểm tra nhanh (Quick-check đơn vị đo $s$ và $s^2$, so sánh độ ổn định, Kế hoạch 29–34′, 5:00, P29)
  10. Chặng 10/12: Đối chiếu mục tiêu (Kế hoạch 34–37′, 3:00, P34)
  11. Chặng 11/12: Exit Ticket & Tổng kết (Kế hoạch 37–40′, 3:00, P37)
  12. Chặng 12/12: Kết thúc tiết (Kế hoạch 40–40′, đồng hồ 0:00, nút "Sau" disabled)
- **Màn hình học sinh**: Cổng vào đúng lớp `12LoTrinh1`, hiển thị danh sách học sinh Lò Mai Phương Chi, Nguyễn Chi Mai, Nguyễn Đức Huy, Nguyễn Minh Đức... — đồng bộ phiên trực tiếp.
- **Bằng chứng**: Ảnh chụp màn hình lưu tại `tasks/tmp-qa-12-12-87-gv-final.png` và `tasks/tmp-qa-12-12-87-hs-final.png`.

---

## 5. Kết luận
- **PASS** — bài `12-12-87` hoàn tất trọn vẹn theo tiêu chuẩn V8.8 Master Teacher.
- Sẵn sàng đồng bộ Git lên 2 nhánh `feat/nop-bai-da-cham` và `main`.
- Bước tiếp theo: Triển khai kế hoạch nâng cấp hồi tố các bài cũ đã tạo (`12-12-82` đến `12-12-86`) theo chuẩn V8.8 Master Teacher.
