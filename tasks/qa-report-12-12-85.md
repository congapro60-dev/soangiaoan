# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-85`)

> **Mã bài**: `12-12-85` (`tds-g12-85` / `g12_w12_p85_v4`)  
> **Tên bài**: Nguyên hàm — Tiết 6: Nguyên hàm của hàm số lượng giác  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 02/11/2026

---

## 1. Trạng thái mã nguồn & Đặc tả Gate D
- **Pha A**:
  - Giáo án gốc chuẩn 40 phút: `tasks/giaoan-goc-12-12-85.md` (kế thừa tính chất tuyến tính từ Tiết 3 `12-12-82`; công thức mũ từ Tiết 4-5 `12-12-83`, `12-12-84`).
  - Đặc tả 12 chặng Gate D: `tasks/gate-d-12-12-85.md`.
- **Pha B**:
  - Snapshot: Đã tích hợp spec (2 công thức $\int \cos x dx = \sin x + C$ và $\int \sin x dx = -\cos x + C$, 2 ví dụ, 6 bài tập phân hoá M/S/C, 2 câu quick, mistakes, boardKnowledge) và AI error ("Lỗi khái niệm" — AI nhầm chiều đạo hàm → nguyên hàm: $\int \sin x dx = \cos x + C$) vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` (tổng 14 specs).
  - Timeline V8.8: `gateD121285` trong `src/lib/liveLesson/v4/lessonAdapter.ts` phân bổ 3-4-2-6-3-1-7-3-5-3-3 phút (tổng 2400s / 40 phút).
  - Đăng ký hệ thống: `INTERACTIVE_SOURCE_KEYS`, catalog `W11BATCH2` (nâng batch 2 lên 14 bài, toàn hệ thống 65 bài), Pulse cues `['P19', 'P26']`.
  - Hiển thị: "Nguyên hàm — Tiết 4" (sequence g12 Tuần 12: 82→1, 83→2, 84→3, 85→4, 86→5); tiêu đề duy nhất trong khối 12 (w11 chỉ có "Nguyên hàm — Tiết 1").

---

## 2. Kết quả kiểm thử tự động (Vitest) & Build
- **Vitest**: 7 file test liên quan: **122/122 PASS** (`week11Batch2Catalog`, `week11Catalog`, `interactiveUpgrade`, `lessonAdapter`, `runtimeDefinition`, `sequentialPublication`, `liveQuestionService`). Test duy nhất hoá tiêu đề PASS (không phát sinh trùng mới).
- **Build**: `npm run build` hoàn tất không lỗi TypeScript hay đóng gói (✓ built in 1m19s).

---

## 3. Xuất bản trên Portal
- **Số lượng gói bài**: Tổng cộng 65 gói bài học phân hoá (51 bài W5–W6 + 14 bài batch 2).
- **Trạng thái xuất bản**: Nút "Tạo và xuất bản 65 bài" hoàn tất thành công `65/65` bài, **0 bỏ qua, 0 audit fail, 0 lỗi** (bao gồm bài `12-12-85`).
- **Tab Bài học tương tác**: Hiển thị đầy đủ bài `12-12-85` với nhãn `Lớp 12 · Tuần 12 · Tiết 85`, tiêu đề "Nguyên hàm — Tiết 4", trạng thái `Đã xuất bản`.

---

## 4. Kết quả QA Live Session thực tế
- **Session ID**: `96LHQ85J4cfbIMq7xWhD`
- **Lớp kết nối**: `12LoTrinh1` (ID: `class-1787208442826`, Mã lớp: `AD4GKT`)
- **Điều khiển GV**: Duyệt trơn tru qua toàn bộ 12 chặng V8.8:
  1. Chặng 1/12: Mở đầu — Kế hoạch 0–3′ (P00)
  2. Chặng 2/12: Câu hỏi định hướng — tranh luận $\int \sin x dx$ An/Bình (Kế hoạch 3–7′, P03)
  3. Chặng 3/12: Mục tiêu do lớp tổng hợp (Kế hoạch 7–9′, P07)
  4. Chặng 4/12: Công cụ toán học — 2 công thức lượng giác + chiều ngược bảng đạo hàm (Kế hoạch 9–15′, P09)
  5. Chặng 5/12: Think → AI → Verify (AI Error: nhầm chiều đạo hàm — nguyên hàm, Kế hoạch 15–18′, P15)
  6. Chặng 6/12: Câu hỏi nhóm & phân luồng (Kế hoạch 18–19′, P18)
  7. Chặng 7/12: Nhiệm vụ có lựa chọn (3 luồng M/S/C — $2\sin x - 3\cos x$, điều kiện ban đầu, dao động $v(t) = 3\cos t$, Kế hoạch 19–26′, P19)
  8. Chặng 8/12: Post-check cá nhân & ĐGTX (Kế hoạch 26–29′, P26)
  9. Chặng 9/12: Kiểm tra nhanh (Quick-check, Kế hoạch 29–34′, P29)
  10. Chặng 10/12: Đối chiếu mục tiêu (Kế hoạch 34–37′, P34)
  11. Chặng 11/12: Exit Ticket & Tổng kết (Kế hoạch 37–40′, P37)
  12. Chặng 12/12: Kết thúc tiết (đồng hồ 0:00, nút "Sau" disabled)
- **Màn hình học sinh**: Cổng vào đúng lớp `12LoTrinh1`, nhận diện phiên giáo viên đang chạy (thông báo "Trình duyệt đang ở phiên giáo viên") — đồng bộ theo session.
- **Bằng chứng**: Ảnh chụp màn hình lưu tại `tasks/tmp-qa-12-12-85-gv-final.png` và `tasks/tmp-qa-12-12-85-hs-final.png`. Nội dung Exit Ticket trên TV khớp Gate D: 2 công thức lượng giác, chiều ngược của đạo hàm giải thích dấu trừ, kết hợp tuyến tính Tiết 3 + điều kiện ban đầu, lỗi nhầm chiều, ứng dụng dao động.

---

## 5. Kết luận
- **PASS** — bài `12-12-85` hoàn tất trọn vẹn Pha A → Pha B → Kiểm thử → Xuất bản → QA live.
- Sẵn sàng đồng bộ Git lên 2 nhánh `feat/nop-bai-da-cham` và `main`.
