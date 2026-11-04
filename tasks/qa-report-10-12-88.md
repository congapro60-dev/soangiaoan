# Báo cáo QA Bài mở đầu Tuần 12 — Khối 10 (`10-12-88`)

> **Mã bài**: `10-12-88` (`tds-g10-88` / `g10_w12_p88_v4`)  
> **Tên bài**: Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và Mốt  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 30/10/2026  

---

## 1. Trạng thái mã nguồn & Đồng bộ Git
- **Commits**:
  - `8482b87`: Pha A — Giáo án gốc & Bản đặc tả Gate D 12 chặng.
  - `7188930`: Pha B — Nạp snapshot spec, AI error, và timeline `gateD101288`.
  - `9d74c41`: Bổ sung `10-12-88` vào `INTERACTIVE_SOURCE_KEYS`.
  - `9398261`: Đăng ký `10-12-88` vào catalog `W11BATCH2` và Pulse cues.
  - `a7a9aa5`: Cập nhật `validateContract.ts` cho phép định dạng `W12`, tinh chỉnh nhãn chapter và test catalog.
- **Git branches**: Đồng bộ 100% lên cả hai nhánh `origin feat/nop-bai-da-cham` và `origin main`.

---

## 2. Kết quả kiểm thử tự động (Vitest)
- Toàn bộ 27 test suite V4 với **308 tests pass 100%**:
  - `validateContract.test.ts`: PASS.
  - `sequentialPublication.test.ts`: PASS (toàn bộ 59 gói bài học hợp lệ, 0 lỗi, 0 audit fail).
  - `week11Batch2Catalog.test.ts`: PASS (đủ 8 gói trong catalog batch 2, metadata và timeline khớp quy ước).
  - `adaptiveDraft.test.ts`: PASS (gắn đúng nhãn chapter `Ban Toán · W12` cho bài tuần 12).

---

## 3. Xuất bản trên Portal
- **Số lượng gói bài**: Tổng cộng 59 gói bài học phân hoá (51 bài W5–W6 + 8 bài batch 2).
- **Trạng thái xuất bản**: Nút "Tạo và xuất bản 59 bài" hoàn tất thành công `59/59` bài (bao gồm bài `10-12-88`).
- **Tab Bài học tương tác**: Hiển thị đầy đủ bài `10-12-88` với nhãn `Lớp 10 · Tuần 12 · Tiết 88`, trạng thái `Đã xuất bản`.

---

## 4. Kết quả QA Live Session thực tế
- **Session ID**: `3MvNb43261gPtzmZbQ49`
- **Lớp kết nối**: `10Olinda` (Mã lớp: `7W288E`)
- **Điều khiển GV**: Duyệt trơn tru qua toàn bộ 12 chặng V8.8:
  1. Chặng 1/12: Mở đầu — Kế hoạch 0–3′
  2. Chặng 2/12: Câu hỏi định hướng (Kế hoạch 3–7′)
  3. Chặng 3/12: Mục tiêu do lớp tổng hợp (Kế hoạch 7–9′)
  4. Chặng 4/12: Công cụ toán học (Kế hoạch 9–14′)
  5. Chặng 5/12: Think → AI → Verify (AI Error lương Alpha, Kế hoạch 14–17′)
  6. Chặng 6/12: Câu hỏi nhóm (Kế hoạch 17–18′)
  7. Chặng 7/12: Nhiệm vụ có lựa chọn (3 luồng M/S/C, Kế hoạch 18–26′)
  8. Chặng 8/12: Post-check cá nhân (Kế hoạch 26–31′)
  9. Chặng 9/12: Kiểm tra nhanh (Quick-check, Kế hoạch 31–34′)
  10. Chặng 10/12: Đối chiếu mục tiêu (Kế hoạch 34–35′)
  11. Chặng 11/12: Exit Ticket (Kế hoạch 35–38′)
  12. Chặng 12/12: Kết thúc tiết (Kế hoạch 38–40′)
- **Màn hình học sinh**: Đồng bộ thời gian thực theo từng bước chuyển của giáo viên.
- **Bằng chứng**: Ảnh chụp màn hình lưu tại `tasks/tmp-qa-10-12-88-gv-final.png` và `tasks/tmp-qa-10-12-88-hs-final.png`.
