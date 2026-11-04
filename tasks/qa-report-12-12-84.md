# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-84`)

> **Mã bài**: `12-12-84` (`tds-g12-84` / `g12_w12_p84_v4`)  
> **Tên bài**: Nguyên hàm — Tiết 5: Nguyên hàm của hàm số mũ  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 02/11/2026

---

## 1. Trạng thái mã nguồn & Đặc tả Gate D
- **Pha A**:
  - Giáo án gốc chuẩn 40 phút: `tasks/giaoan-goc-12-12-84.md` (kế thừa công thức lũy thừa từ Tiết 4 `12-12-83`, tính chất tuyến tính từ Tiết 3 `12-12-82`). Đã bắt và sửa 1 lỗi số trong quá trình soạn: dòng đối soát Casio ghi 12,98 sai — đúng là $R(3) = \frac{21}{\ln 2} \approx 30{,}30$.
  - Đặc tả 12 chặng Gate D: `tasks/gate-d-12-12-84.md`.
- **Pha B**:
  - Snapshot: Đã tích hợp spec (2 công thức $\int e^x dx = e^x + C$ và $\int a^x dx = \frac{a^x}{\ln a} + C$, 2 ví dụ, 6 bài tập phân hoá M/S/C, 2 câu quick, mistakes, boardKnowledge) và AI error ("Lỗi đại số" — AI quên chia $\ln a$: khẳng định $3^x$ có đạo hàm bằng chính nó nên nguyên hàm $3^x + C$) vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` (tổng 13 specs).
  - Timeline V8.8: `gateD121284` trong `src/lib/liveLesson/v4/lessonAdapter.ts` phân bổ 3-4-2-6-3-1-7-3-5-3-3 phút (tổng 2400s / 40 phút).
  - Đăng ký hệ thống: `INTERACTIVE_SOURCE_KEYS`, catalog `W11BATCH2` (nâng batch 2 lên 13 bài, toàn hệ thống 64 bài), Pulse cues `['P19', 'P26']`.
  - Hiển thị: "Nguyên hàm — Tiết 3" (sequence g12 Tuần 12: 82 → Tiết 1, 83 → Tiết 2, 84 → Tiết 3, 86 → Tiết 4).
  - **Fix trùng tiêu đề (bắt bởi test `lessonAdapter.test.ts`):** thêm `12-12-84` làm hiển thị của `12-12-86` đổi thành "— Tiết 4" và trùng với `12-12-80` ("Phương sai và độ lệch chuẩn — Tiết 4") trong cùng khối 12 → đổi tiêu đề spec `12-12-86` thành `"Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro"` (trích PPCT detail) theo tiền lệ `12-12-82`. Cập nhật `week11Batch2Catalog.ts`, snapshot, và ghi chú trong `tasks/gate-d-12-12-86.md`.

---

## 2. Kết quả kiểm thử tự động (Vitest) & Build
- **Vitest**: 7 file test liên quan: **118/118 PASS** (sau fix tiêu đề `12-12-86`; test duy nhất hoá tiêu đề trong cùng khối đã PASS).
- **Build**: `npm run build` hoàn tất không lỗi TypeScript hay đóng gói (✓ built in 2m42s).

---

## 3. Xuất bản trên Portal
- **Số lượng gói bài**: Tổng cộng 64 gói bài học phân hoá (51 bài W5–W6 + 13 bài batch 2).
- **Trạng thái xuất bản**: Nút "Tạo và xuất bản 64 bài" hoàn tất thành công `64/64` bài, **0 bỏ qua, 0 audit fail, 0 lỗi** (bao gồm bài `12-12-84`).
- **Tab Bài học tương tác**: Hiển thị đầy đủ bài `12-12-84` với nhãn `Lớp 12 · Tuần 12 · Tiết 84`, tiêu đề "Nguyên hàm — Tiết 3", trạng thái `Đã xuất bản`.

---

## 4. Kết quả QA Live Session thực tế
- **Session ID**: `ILHiLDgBZTIiRardKCxw`
- **Lớp kết nối**: `12LoTrinh1` (ID: `class-1787208442826`, Mã lớp: `AD4GKT`)
- **Điều khiển GV**: Duyệt trơn tru qua toàn bộ 12 chặng V8.8:
  1. Chặng 1/12: Mở đầu — Kế hoạch 0–3′ (P00)
  2. Chặng 2/12: Câu hỏi định hướng — tranh luận $\int 2^x dx$ An/Bình (Kế hoạch 3–7′, P03)
  3. Chặng 3/12: Mục tiêu do lớp tổng hợp (Kế hoạch 7–9′, P07)
  4. Chặng 4/12: Công cụ toán học — 2 công thức hàm mũ + phân biệt hàm mũ/lũy thừa (Kế hoạch 9–15′, P09)
  5. Chặng 5/12: Think → AI → Verify (AI Error: quên chia $\ln a$, Kế hoạch 15–18′, P15)
  6. Chặng 6/12: Câu hỏi nhóm & phân luồng (Kế hoạch 18–19′, P18)
  7. Chặng 7/12: Nhiệm vụ có lựa chọn (3 luồng M/S/C — $e^x$/$5^x$, $2e^x + 3^x$ + điều kiện ban đầu, doanh thu $3 \cdot 2^t$, Kế hoạch 19–26′, P19)
  8. Chặng 8/12: Post-check cá nhân & ĐGTX (Kế hoạch 26–29′, P26)
  9. Chặng 9/12: Kiểm tra nhanh (Quick-check, Kế hoạch 29–34′, P29)
  10. Chặng 10/12: Đối chiếu mục tiêu (Kế hoạch 34–37′, P34)
  11. Chặng 11/12: Exit Ticket & Tổng kết (Kế hoạch 37–40′, P37)
  12. Chặng 12/12: Kết thúc tiết (đồng hồ 0:00, nút "Sau" disabled)
- **Màn hình học sinh**: Cổng vào đúng lớp `12LoTrinh1`, nhận diện phiên giáo viên đang chạy (thông báo "Trình duyệt đang ở phiên giáo viên") — đồng bộ theo session.
- **Bằng chứng**: Ảnh chụp màn hình lưu tại `tasks/tmp-qa-12-12-84-gv-final.png` và `tasks/tmp-qa-12-12-84-hs-final.png`. Nội dung Exit Ticket trên TV khớp Gate D: 2 công thức hàm mũ kèm điều kiện, phân biệt hàm mũ/hàm lũy thừa, kiểm chứng đạo hàm, kết hợp tuyến tính Tiết 3 + điều kiện ban đầu, nhận diện lỗi quên $\ln a$.

---

## 5. Kết luận
- **PASS** — bài `12-12-84` hoàn tất trọn vẹn Pha A → Pha B → Kiểm thử → Xuất bản → QA live.
- Sẵn sàng đồng bộ Git lên 2 nhánh `feat/nop-bai-da-cham` và `main`.
