# Kế hoạch phát triển bài dạy phân hoá V8.8 theo PPCT (Tuần 14)

> Khối lượng: 24 bài kép V8.8 Master Teacher (K10: 8 bài, K11: 8 bài, K12: 8 bài)
> Đích đến: Nâng tổng số bài chuẩn kép từ 100 bài lên 124 bài.

---

## 1. Trạng thái nền tảng: TUẦN 13 ĐÃ HOÀN TẤT TRỌN VẸN (100/100 BÀI)

- Đã khép kín 100/100 bài kép (K10: 32 bài, K11: 34 bài, K12: 34 bài).
- Vitest 28/28 files PASS (439/439 tests).
- Build PASS 0 lỗi TS, đồng bộ nhánh `feat/nop-bai-da-cham` và `main`.

---

## 2. Danh mục 24 bài Tuần 14 theo PPCT chuẩn TDS

### Khối 10 (8 bài: `10-14-104` .. `10-14-111`)
1. `10-14-104` (Period 104): Vectơ trong mặt phẳng tọa độ — Tiết 4: Luyện tập tọa độ và độ dài
2. `10-14-105` (Period 105): Tích vô hướng của hai vectơ — Tiết 1: Góc giữa hai vectơ và tích vô hướng
3. `10-14-106` (Period 106): Tích vô hướng của hai vectơ — Tiết 2: Luyện tập tính góc và tích vô hướng
4. `10-14-107` (Period 107): Tích vô hướng của hai vectơ — Tiết 3: Biểu thức tọa độ và tính chất
5. `10-14-108` (Period 108): Tích vô hướng của hai vectơ — Tiết 4: Luyện tập biểu thức tọa độ
6. `10-14-109` (Period 109): Tích vô hướng của hai vectơ — Tiết 5: Luyện tập tổng hợp tích vô hướng
7. `10-14-110` (Period 110): Tự chọn: Ứng dụng tích vô hướng chứng minh vuông góc
8. `10-14-111` (Period 111): Tự chọn: Bài toán thực tế chuyển động và công sinh bởi lực

### Khối 11 (8 bài: `11-14-98` .. `11-14-105`)
1. `11-14-98` (Period 98): Giới hạn của hàm số — Tiết 3: Giới hạn hữu hạn của hàm số tại vô cực
2. `11-14-99` (Period 99): Giới hạn của hàm số — Tiết 4: Giới hạn vô cực của hàm số tại một điểm
3. `11-14-100` (Period 100): Giới hạn của hàm số — Tiết 5: Luyện tập giới hạn hàm số
4. `11-14-101` (Period 101): Hàm số liên tục — Tiết 1: Hàm số liên tục tại một điểm
5. `11-14-102` (Period 102): Ôn tập chương IV — Tiết 1: Giới hạn dãy số và hàm số
6. `11-14-103` (Period 103): Ôn tập chương IV — Tiết 2: Hàm số liên tục và định lý giá trị trung gian
7. `11-14-104` (Period 104): Tự chọn: Phương pháp khử dạng vô định vô cực trừ vô cực
8. `11-14-105` (Period 105): Tự chọn: Khảo sát tính liên tục có chứa tham số

### Khối 12 (8 bài: `12-14-98` .. `12-14-105`)
1. `12-14-98` (Period 98): Tích phân — Tiết 6: Luyện tập tính chất và kỹ thuật tích phân
2. `12-14-99` (Period 99): Ứng dụng hình học của tích phân tính diện tích — Tiết 1: Hình phẳng giới hạn bởi 1 đồ thị và trục hoành
3. `12-14-100` (Period 100): Ứng dụng hình học của tích phân tính diện tích — Tiết 2: Luyện tập tính diện tích cơ bản
4. `12-14-101` (Period 101): Ứng dụng hình học của tích phân tính diện tích — Tiết 3: Kỹ thuật tách cận và dấu giá trị tuyệt đối
5. `12-14-102` (Period 102): Ứng dụng hình học của tích phân tính diện tích — Tiết 4: Luyện tập tổng hợp diện tích 1 đường cong
6. `12-14-103` (Period 103): Ứng dụng hình học của tích phân tính diện tích — Tiết 5: Hình phẳng giới hạn bởi 2 đồ thị hàm số
7. `12-14-104` (Period 104): Ứng dụng hình học của tích phân tính diện tích — Tiết 6: Luyện tập diện tích giới hạn bởi 2 đường cong
8. `12-14-105` (Period 105): Tự chọn: Ứng dụng tích phân tính diện tích các công trình thực tế (Parabol, Elip)

---

## 3. Lộ trình thực hiện
- Bước 1: Cập nhật regex `validateContract.ts` cho phép tuần 14: `^\d{2}-(?:[56]|11|12|13|14)-\d+$`.
- Bước 2: Sinh 24 specs và 24 AI errors chuẩn V8.8 vào `banToan-w11-batch2.snapshot.json`.
- Bước 3: Đăng ký 24 bài vào `W11BATCH2` (`week11Batch2Catalog.ts`) và `INTERACTIVE_SOURCE_KEYS`.
- Bước 4: Kiểm tra và xác nhận tiêu đề duy nhất trong từng khối lớp (`displayTitleUnique.test.ts`).
- Bước 5: Chạy test kiểm thử toàn bộ `src/lib/liveLesson/v4` (đạt 100% PASS) và `npm run build`.
- Bước 6: Commit & push đồng bộ `feat/nop-bai-da-cham` và `main`.
