# Báo cáo QA Bài Tuần 12 — Khối 11 (`11-12-82`)

> **Mã bài**: `11-12-82` (`tds-g11-82` / `g11_w12_p82_v4`)  
> **Tên bài**: Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và mốt của mẫu số liệu ghép nhóm  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 30/10/2026  

---

## 1. Trạng thái mã nguồn & Đặc tả Gate D
- **Pha A**:
  - Giáo án gốc chuẩn 40 phút: `tasks/giaoan-goc-11-12-82.md` (kế thừa tập dữ liệu 40 HS khảo sát thời gian sử dụng Internet cuối tuần từ Tiết 1 `11-11-76`).
  - Đặc tả 12 chặng Gate D: `tasks/gate-d-11-12-82.md`.
- **Pha B**:
  - Snapshot gói bài: Đã tích hợp đầy đủ công thức nội suy tứ phân vị và mốt, 6 bài tập phân hoá, 2 câu hỏi kiểm tra nhanh, và AI error vào `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json`.
  - Timeline V8.8: Cấu hình `gateD111282` trong `src/lib/liveLesson/v4/lessonAdapter.ts` phân bổ 3-4-2-5-3-1-8-3-5-3-3 phút (tổng 2400s / 40 phút).
  - Đăng ký hệ thống: Bổ sung `11-12-82` vào `INTERACTIVE_SOURCE_KEYS`, catalog `W11BATCH2` (nâng batch 2 lên 9 bài, toàn hệ thống 60 bài), và Pulse cues `['P18', 'P26']`.

---

## 2. Kết quả kiểm thử tự động (Vitest) & Build
- **Vitest**: 27 test suites với **312 tests pass 100%**:
  - `validateContract.test.ts`: PASS.
  - `sequentialPublication.test.ts`: PASS (toàn bộ 60 gói bài học hợp lệ, 0 lỗi, 0 audit fail).
  - `week11Batch2Catalog.test.ts`: PASS (đủ 9 gói batch 2, metadata và timeline `gateD111282` khớp chuẩn).
  - `runtimeDefinition.test.ts`: PASS.
- **Build**: `npm run build` hoàn tất không lỗi TypeScript hay đóng gói.

---

## 3. Xuất bản trên Portal
- **Số lượng gói bài**: Tổng cộng 60 gói bài học phân hoá (51 bài W5–W6 + 9 bài batch 2).
- **Trạng thái xuất bản**: Nút "Tạo và xuất bản 60 bài" hoàn tất thành công `60/60` bài (bao gồm bài `11-12-82`).
- **Tab Bài học tương tác**: Hiển thị đầy đủ bài `11-12-82` với nhãn `Lớp 11 · Tuần 12 · Tiết 82`, trạng thái `Đã xuất bản`.

---

## 4. Kết quả QA Live Session thực tế
- **Session ID**: `rZ7jL9sGKAxfGcBOlcHj`
- **Lớp kết nối**: `11A1 - Khối 11` (Mã lớp: `K8268Y`, ID: `class-1793365041014`)
- **Điều khiển GV**: Duyệt trơn tru qua toàn bộ 12 chặng V8.8:
  1. Chặng 1/12: Mở đầu — Kế hoạch 0–3′ (P00)
  2. Chặng 2/12: Câu hỏi định hướng (Kế hoạch 3–7′, P03)
  3. Chặng 3/12: Mục tiêu do lớp tổng hợp (Kế hoạch 7–9′, P07)
  4. Chặng 4/12: Công cụ toán học (Kế hoạch 9–14′, P09)
  5. Chặng 5/12: Think → AI → Verify (AI Error quên trừ tần số tích lũy C, Kế hoạch 14–17′, P14)
  6. Chặng 6/12: Câu hỏi nhóm (Kế hoạch 17–18′, P17)
  7. Chặng 7/12: Nhiệm vụ có lựa chọn (3 luồng Master/Support/Challenge, Kế hoạch 18–26′, P18)
  8. Chặng 8/12: Post-check cá nhân (Kế hoạch 26–29′, P26)
  9. Chặng 9/12: Kiểm tra nhanh (Quick-check, Kế hoạch 29–34′, P29)
  10. Chặng 10/12: Đối chiếu mục tiêu (Kế hoạch 34–37′, P34)
  11. Chặng 11/12: Exit Ticket (Kế hoạch 37–40′, P37)
  12. Chặng 12/12: Kết thúc tiết
- **Màn hình học sinh**: Đồng bộ thời gian thực theo từng bước chuyển của giáo viên.
- **Bằng chứng**: Ảnh chụp màn hình lưu tại `tasks/tmp-qa-11-12-82-gv-final.png` và `tasks/tmp-qa-11-12-82-hs-final.png`.
