# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-86`)

> **Mã bài**: `12-12-86` (`tds-g12-86` / `g12_w12_p86_v4`)  
> **Tên bài**: Phương sai và độ lệch chuẩn — Tiết 2: Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 01/11/2026

---

## 1. Trạng thái mã nguồn & Đặc tả Gate D
- **Pha A**:
  - Giáo án gốc chuẩn 40 phút: `tasks/giaoan-goc-12-12-86.md` (kế thừa dữ liệu 2 xạ thủ An/Bình từ Tiết 1 `tds-g12-80` — đã kiểm chứng và sửa số).
  - Đặc tả 12 chặng Gate D: `tasks/gate-d-12-12-86.md`.
  - **[LỆCH GỐC — SỬA SỐ]** giáo án gốc Tiết 1 ghi `x̄_A = 8,5` sai số học (đúng 180/20 = 9), kéo theo `s²_A = 1,05`, `s²_B = 3,05` và Casio `σx = 1,02469` đều sai. Gate D dùng số đã sửa: `x̄_A = x̄_B = 9`, `s²_A = 0,8` (`s_A ≈ 0,89`), `s²_B = 2,8` (`s_B ≈ 1,67`) — khớp quyết định thầy duyệt 2026-10-25 đã khoá trong `g12VarianceNumbers.test.ts`.
- **Pha B**:
  - Snapshot: Đã tích hợp spec (formulas, 2 ví dụ, 6 bài tập phân hoá M/S/C, 2 câu quick, mistakes, boardKnowledge) và AI error ("Thiếu điều kiện" — AI khuyên chuyển toàn bộ sang cổ phiếu Y thiếu điều kiện khẩu vị rủi ro) vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json`.
  - Timeline V8.8: `gateD121286` trong `src/lib/liveLesson/v4/lessonAdapter.ts` phân bổ 3-4-2-6-3-1-7-3-5-3-3 phút (tổng 2400s / 40 phút).
  - Đăng ký hệ thống: `INTERACTIVE_SOURCE_KEYS`, catalog `W11BATCH2` (nâng batch 2 lên 11 bài, toàn hệ thống 62 bài), Pulse cues `['P19', 'P26']`.
  - Hiển thị: "Phương sai và độ lệch chuẩn — Tiết 2" (sequence g12 Tuần 12: 82 → Tiết 1, 86 → Tiết 2, khớp PPCT detail).

---

## 2. Kết quả kiểm thử tự động (Vitest) & Build
- **Vitest**:
  - 6 file test liên quan: **104/104 PASS** (`week11Batch2Catalog`, `week11Catalog`, `interactiveUpgrade`, `lessonAdapter`, `runtimeDefinition`, `sequentialPublication`).
  - Full suite: 4684/4700 tests pass. 16 thất bại **không liên quan bài học**: 12 lỗi timeout do máy quá tải khi chạy 442 suites song song (chạy riêng từng file → **7/7 file PASS**), 4 lỗi hash v832 (`contractData`, `goldenCandidates`) là lỗi nền sẵn trên nhánh (fixture byte-identical với HEAD, ngoài phạm vi).
  - `g12VarianceNumbers.test.ts` PASS — xác nhận số liệu đã sửa không vi phạm khoá số của bài `12-11-80`.
- **Build**: `npm run build` hoàn tất không lỗi TypeScript hay đóng gói (✓ built in 4m15s).

---

## 3. Xuất bản trên Portal
- **Số lượng gói bài**: Tổng cộng 62 gói bài học phân hoá (51 bài W5–W6 + 11 bài batch 2).
- **Trạng thái xuất bản**: Nút "Tạo và xuất bản 62 bài" hoàn tất thành công `62/62` bài, **0 audit fail, 0 lỗi** (bao gồm bài `12-12-86`).
- **Tab Bài học tương tác**: Hiển thị đầy đủ bài `12-12-86` với nhãn `Lớp 12 · Tuần 12 · Tiết 86`, trạng thái `Đã xuất bản`.

---

## 4. Kết quả QA Live Session thực tế
- **Session ID**: `KcPYWecqYriSZ84Xzzh5`
- **Lớp kết nối**: `12A1 - Toán 12` (Mã lớp: `K1282Z`, ID: `class-g12-1793371336768`)
- **Điều khiển GV**: Duyệt trơn tru qua toàn bộ 12 chặng V8.8:
  1. Chặng 1/12: Mở đầu — Kế hoạch 0–3′ (P00)
  2. Chặng 2/12: Câu hỏi định hướng — cùng trung bình, khác gì? (Kế hoạch 3–7′, P03)
  3. Chặng 3/12: Mục tiêu do lớp tổng hợp (Kế hoạch 7–9′, P07)
  4. Chặng 4/12: Công cụ toán học — ý nghĩa đo rủi ro của s², s + quy trình 4 bước (Kế hoạch 9–15′, P09)
  5. Chặng 5/12: Think → AI → Verify (AI Error: khuyến nghị đầu tư thiếu điều kiện khẩu vị rủi ro, Kế hoạch 15–18′, P15)
  6. Chặng 6/12: Câu hỏi nhóm & phân luồng (Kế hoạch 18–19′, P18)
  7. Chặng 7/12: Nhiệm vụ có lựa chọn (3 luồng M/S/C — cổ phiếu X/Y/Z, Kế hoạch 19–26′, P19)
  8. Chặng 8/12: Post-check cá nhân & ĐGTX (Kế hoạch 26–29′, P26)
  9. Chặng 9/12: Ứng dụng thực tế: xạ thủ An/Bình + kiểm chứng Casio (Kế hoạch 29–34′, P29)
  10. Chặng 10/12: Kiểm tra nhanh (Quick-check, Kế hoạch 34–37′, P34)
  11. Chặng 11/12: Exit Ticket & Tổng kết (Kế hoạch 37–40′, P37)
  12. Chặng 12/12: Kết thúc tiết (nút "Sau" disabled — đúng chuẩn)
- **Màn hình học sinh**: Cổng vào đúng lớp `12A1 - Toán 12`, nhận diện phiên giáo viên đang chạy (thông báo "Trình duyệt đang ở phiên giáo viên") — đồng bộ theo session.
- **Bằng chứng**: Ảnh chụp màn hình lưu tại `tasks/tmp-qa-12-12-86-gv-final.png` và `tasks/tmp-qa-12-12-86-hs-final.png`. Nội dung Exit Ticket trên TV khớp Gate D: quy tắc so sánh hai mẫu cùng x̄ (s nhỏ → ổn định hơn), quy trình 4 bước tính s², s, khuyến nghị theo khẩu vị rủi ro, nhận diện khuyến nghị thiếu điều kiện.

---

## 5. Kết luận
- **PASS** — bài `12-12-86` hoàn tất trọn vẹn Pha A → Pha B → Kiểm thử → Xuất bản → QA live.
- Sẵn sàng đồng bộ Git lên 2 nhánh `feat/nop-bai-da-cham` và `main`.
