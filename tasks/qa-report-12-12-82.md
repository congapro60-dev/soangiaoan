# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-82`)

> **Mã bài**: `12-12-82` (`tds-g12-82` / `g12_w12_p82_v4`)  
> **Tên bài**: Tính chất cơ bản của nguyên hàm — Tiết 1 (Nguyên hàm — Tiết 3 theo PPCT)  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 30/10/2026  

---

## 1. Trạng thái mã nguồn & Đặc tả Gate D
- **Pha A**:
  - Giáo án gốc chuẩn 40 phút: `tasks/giaoan-goc-12-12-82.md` (kế thừa bảng nguyên hàm sơ cấp từ Tiết 2 `12-11-77`).
  - Đặc tả 12 chặng Gate D: `tasks/gate-d-12-12-82.md`.
- **Pha B**:
  - Snapshot gói bài: Đã tích hợp đầy đủ công thức tính chất tuyến tính của nguyên hàm, 6 bài tập phân hoá (M/S/C), 2 câu hỏi kiểm tra nhanh, và AI error ("Lỗi đại số" — tự ý đưa biến $x$ ra ngoài dấu nguyên hàm $\int x \sin x dx = x \int \sin x dx$) vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json`.
  - Timeline V8.8: Cấu hình `gateD121282` trong `src/lib/liveLesson/v4/lessonAdapter.ts` phân bổ 3-4-2-6-3-1-7-3-5-3-3 phút (tổng 2400s / 40 phút).
  - Đăng ký hệ thống: Bổ sung `12-12-82` vào `INTERACTIVE_SOURCE_KEYS`, catalog `W11BATCH2` (nâng batch 2 lên 10 bài, toàn hệ thống 61 bài), và Pulse cues `['P19', 'P26']`.
  - Đặt tiêu đề hiển thị: `"Tính chất cơ bản của nguyên hàm"` để đảm bảo tính duy nhất trong khối 12 (tránh trùng với Tiết 1 `12-11-77`).

---

## 2. Kết quả kiểm thử tự động (Vitest) & Build
- **Vitest**: 27 test suites với **316 tests pass 100%**:
  - `validateContract.test.ts`: PASS.
  - `sequentialPublication.test.ts`: PASS (toàn bộ 61 gói bài học hợp lệ, 0 lỗi, 0 audit fail).
  - `week11Batch2Catalog.test.ts`: PASS (đủ 10 gói batch 2, metadata và timeline `gateD121282` khớp chuẩn).
  - `runtimeDefinition.test.ts`: PASS.
  - `lessonAdapter.test.ts`: PASS.
- **Build**: `npm run build` hoàn tất không lỗi TypeScript hay đóng gói.

---

## 3. Xuất bản trên Portal
- **Số lượng gói bài**: Tổng cộng 61 gói bài học phân hoá (51 bài W5–W6 + 10 bài batch 2).
- **Trạng thái xuất bản**: Nút "Tạo và xuất bản 61 bài" hoàn tất thành công `61/61` bài (bao gồm bài `12-12-82`).
- **Tab Bài học tương tác**: Hiển thị đầy đủ bài `12-12-82` với nhãn `Lớp 12 · Tuần 12 · Tiết 82`, trạng thái `Đã xuất bản`.

---

## 4. Kết quả QA Live Session thực tế
- **Session ID**: `9iKRvkMqm4vDbX1e2f4K`
- **Lớp kết nối**: `12A1 - Toán 12` (Mã lớp: `K1282Z`, ID: `class-g12-1793371336768`)
- **Điều khiển GV**: Duyệt trơn tru qua toàn bộ 12 chặng V8.8:
  1. Chặng 1/12: Mở đầu — Kế hoạch 0–3′ (P00)
  2. Chặng 2/12: Câu hỏi định hướng (Kế hoạch 3–7′, P03)
  3. Chặng 3/12: Mục tiêu do lớp tổng hợp (Kế hoạch 7–9′, P07)
  4. Chặng 4/12: Công cụ toán học — Tính chất cơ bản của nguyên hàm (Kế hoạch 9–15′, P09)
  5. Chặng 5/12: Think → AI → Verify (AI Error: đưa biến $x$ ra ngoài dấu nguyên hàm, Kế hoạch 15–18′, P15)
  6. Chặng 6/12: Câu hỏi nhóm & phân luồng (Kế hoạch 18–19′, P18)
  7. Chặng 7/12: Nhiệm vụ có lựa chọn (3 luồng Master/Support/Challenge, Kế hoạch 19–26′, P19)
  8. Chặng 8/12: Post-check cá nhân & ĐGTX (Kế hoạch 26–29′, P26)
  9. Chặng 9/12: Ứng dụng thực tế: Chi phí biên & Chuyển động (Kế hoạch 29–34′, P29)
  10. Chặng 10/12: Kiểm tra nhanh (Quick-check, Kế hoạch 34–37′, P34)
  11. Chặng 11/12: Exit Ticket & Tổng kết (Kế hoạch 37–40′, P37)
  12. Chặng 12/12: Kết thúc tiết (Hết giờ)
- **Màn hình học sinh**: Đồng bộ thời gian thực theo từng bước chuyển của giáo viên.
- **Bằng chứng**: Ảnh chụp màn hình lưu tại `tasks/tmp-qa-12-12-82-gv-final.png` và `tasks/tmp-qa-12-12-82-hs-final.png`.
