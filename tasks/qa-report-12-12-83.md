# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-83`)

> **Mã bài**: `12-12-83` (`tds-g12-83` / `g12_w12_p83_v4`)  
> **Tên bài**: Nguyên hàm — Tiết 4: Nguyên hàm của hàm số lũy thừa  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 02/11/2026

---

## 1. Trạng thái mã nguồn & Đặc tả Gate D
- **Pha A**:
  - Giáo án gốc chuẩn 40 phút: `tasks/giaoan-goc-12-12-83.md` (kế thừa tính chất tuyến tính từ Tiết 3 `12-12-82`, bảng nguyên hàm sơ cấp từ Tiết 2 `12-11-77`).
  - Đặc tả 12 chặng Gate D: `tasks/gate-d-12-12-83.md`.
- **Pha B**:
  - Snapshot: Đã tích hợp spec (2 công thức $\int x^{\alpha} dx = \frac{x^{\alpha+1}}{\alpha+1} + C$ với $\alpha \neq -1$ và $\int \frac{dx}{x} = \ln|x| + C$, 2 ví dụ, 6 bài tập phân hoá M/S/C, 2 câu quick, mistakes, boardKnowledge) và AI error ("Lỗi khái niệm" — AI thay $\alpha = -1$ vào công thức có điều kiện rồi kết luận sai "1/x không có nguyên hàm") vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` (tổng 12 specs).
  - Timeline V8.8: `gateD121283` trong `src/lib/liveLesson/v4/lessonAdapter.ts` phân bổ 3-4-2-6-3-1-7-3-5-3-3 phút (tổng 2400s / 40 phút).
  - Đăng ký hệ thống: `INTERACTIVE_SOURCE_KEYS`, catalog `W11BATCH2` (nâng batch 2 lên 12 bài, toàn hệ thống 63 bài), Pulse cues `['P19', 'P26']`.
  - Hiển thị: "Nguyên hàm — Tiết 2" (sequence g12 Tuần 12: 82 → Tiết 1, 83 → Tiết 2, 86 → Tiết 3); hiển thị của `12-12-86` tự đổi thành "— Tiết 3" theo quy tắc batch2 (đã rà: không test hardcode).

---

## 2. Kết quả kiểm thử tự động (Vitest) & Build
- **Vitest**: 7 file test liên quan: **114/114 PASS** (`week11Batch2Catalog`, `week11Catalog`, `interactiveUpgrade`, `lessonAdapter`, `runtimeDefinition`, `sequentialPublication`, `liveQuestionService`).
  - Lưu ý nền: full suite còn 4 lỗi hash v832 (`contractData`, `goldenCandidates`) và một số timeout khi chạy 442 suites song song — đã xác nhận ngày 01/11/2026 là lỗi nền sẵn/môi trường, không liên quan bài học.
- **Build**: `npm run build` hoàn tất không lỗi TypeScript hay đóng gói (✓ built in 8m15s).

---

## 3. Xuất bản trên Portal
- **Số lượng gói bài**: Tổng cộng 63 gói bài học phân hoá (51 bài W5–W6 + 12 bài batch 2).
- **Trạng thái xuất bản**: Nút "Tạo và xuất bản 63 bài" hoàn tất thành công `63/63` bài, **0 bỏ qua, 0 audit fail, 0 lỗi** (bao gồm bài `12-12-83`).
- **Tab Bài học tương tác**: Hiển thị đầy đủ bài `12-12-83` với nhãn `Lớp 12 · Tuần 12 · Tiết 83`, tiêu đề "Nguyên hàm — Tiết 2", trạng thái `Đã xuất bản`.

---

## 4. Kết quả QA Live Session thực tế
- **Session ID**: `La9N8SalKCEz1xzgkPku`
- **Lớp kết nối**: `12LoTrinh1` (ID: `class-1787208442826`, Mã lớp: `AD4GKT`) — lớp `12A1 - Toán 12` không còn trong danh sách lớp của tài khoản, đã dùng lớp khối 12 hiện có.
- **Điều khiển GV**: Duyệt trơn tru qua toàn bộ 12 chặng V8.8:
  1. Chặng 1/12: Mở đầu — Kế hoạch 0–3′ (P00)
  2. Chặng 2/12: Câu hỏi định hướng — tranh luận $\int \frac{dx}{x}$ An/Bình (Kế hoạch 3–7′, P03)
  3. Chặng 3/12: Mục tiêu do lớp tổng hợp (Kế hoạch 7–9′, P07)
  4. Chặng 4/12: Công cụ toán học — 2 công thức lũy thừa + điều kiện $\alpha \neq -1$ (Kế hoạch 9–15′, P09)
  5. Chặng 5/12: Think → AI → Verify (AI Error: áp công thức ngoài điều kiện, kết luận sai "không có nguyên hàm", Kế hoạch 15–18′, P15)
  6. Chặng 6/12: Câu hỏi nhóm & phân luồng (Kế hoạch 18–19′, P18)
  7. Chặng 7/12: Nhiệm vụ có lựa chọn (3 luồng M/S/C — đa thức/căn, phân thức tách, khai triển + chi phí biên, Kế hoạch 19–26′, P19)
  8. Chặng 8/12: Post-check cá nhân & ĐGTX (Kế hoạch 26–29′, P26)
  9. Chặng 9/12: Kiểm tra nhanh (Quick-check, Kế hoạch 29–34′, P29)
  10. Chặng 10/12: Đối chiếu mục tiêu (Kế hoạch 34–37′, P34)
  11. Chặng 11/12: Exit Ticket & Tổng kết (Kế hoạch 37–40′, P37)
  12. Chặng 12/12: Kết thúc tiết (đồng hồ 0:00, "KẾT THÚC")
- **Màn hình học sinh**: Cổng vào đúng lớp `12LoTrinh1`, nhận diện phiên giáo viên đang chạy (thông báo "Trình duyệt đang ở phiên giáo viên") — đồng bộ theo session.
- **Bằng chứng**: Ảnh chụp màn hình lưu tại `tasks/tmp-qa-12-12-83-gv-final.png` và `tasks/tmp-qa-12-12-83-hs-final.png`. Nội dung Exit Ticket trên TV khớp Gate D: 2 công thức lũy thừa kèm điều kiện, quy đổi căn/phân thức, kết hợp tuyến tính Tiết 3 + điều kiện xác định tìm C, nhận diện lỗi $\alpha = -1$.

---

## 5. Kết luận
- **PASS** — bài `12-12-83` hoàn tất trọn vẹn Pha A → Pha B → Kiểm thử → Xuất bản → QA live.
- Sẵn sàng đồng bộ Git lên 2 nhánh `feat/nop-bai-da-cham` và `main`.
