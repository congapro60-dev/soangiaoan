# Kế hoạch phát triển bài dạy phân hoá V8.8 theo PPCT (Tuần 11 → Tuần 12 → Tuần 13)

> Nguyên tắc: Xong trọn vẹn tuần hiện tại (Pha A spec → Pha B code → QA kiểm thử thực tế → commit/push sync) mới chuyển sang tuần kế tiếp theo Phân phối chương trình (PPCT).

---

## 1. Trạng thái hiện tại: TUẦN 11 ĐÃ HOÀN TẤT TRỌN VẸN (7/7 bài)

Toàn bộ 7 bài Tuần 11 thuộc gói `banToan-w11-batch2.snapshot.json` đã hoàn tất Gate D, Pha B, fix và QA thực tế đạt PASS trên Production:
- **R1 (`10-11-80`)**: Tiết 1 Số gần đúng và sai số (commit `5d044cb`).
- **R2 (`11-11-76`)**: Tiết 1 Số trung bình và Trung vị của mẫu số liệu ghép nhóm.
- **R3 (`11-11-78`)**: Tiết 2 Hai mặt phẳng song song — Giao tuyến và Thales.
- **R4 (`11-11-79`)**: Tiết 3 Luyện tập và ứng dụng thiết diện hai mặt phẳng song song.
- **R5 (`12-11-77`)**: Tiết 2 Bảng nguyên hàm của một số hàm số sơ cấp (commit `7781984`).
- **R6 (`12-11-78`)**: Tiết 1 Khoảng biến thiên và khoảng tứ phân vị (commit `83ac5f3`).
- **R7 (`12-11-79`)**: Tiết 2 Luyện tập mức độ phân tán mẫu số liệu ghép nhóm (commit `a5b090d`).
- **Hạ tầng bổ sung**: COMM-AQ-01 (Giơ tay / Hỏi ẩn danh) & ASS-MDP-01 (Mobile/Desktop Parity, MathFigureZoom 1x-4x, nộp bài chụp giấy) đã merge & push sync cả 2 nhánh (commit `ef77f2b`, `037d9db`).

---

## 2. Kế hoạch tiếp theo: TUẦN 12 THEO PPCT

### Danh mục bài Tuần 12 trích xuất từ PPCT chuẩn (`src/data/ppct/`):

#### Khối 10 (PPCT `tds-g10` — Tuần 12)
1. `tds-g10-88` (Period 88 - Đại số): Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị, mốt.
2. `tds-g10-89` (Period 89 - Đại số): Các số đặc trưng đo xu thế trung tâm — Tiết 3: Luyện tập.
3. `tds-g10-90` (Period 90 - Đại số): Các số đặc trưng đo mức độ phân tán — Tiết 1: Khoảng biến thiên, tứ phân vị, phương sai, độ lệch chuẩn.
4. `tds-g10-91` (Period 91 - Đại số): Ôn tập chương V.
5. `tds-g10-92` (Period 92 - Hình học): Tổng và hiệu của hai vectơ — Tiết 4: Luyện tập.
6. `tds-g10-93` (Period 93 - Hình học): Tích của một vectơ với một số — Tiết 1: Định nghĩa và tính chất.

#### Khối 11 (PPCT `tds-g11` — Tuần 12)
1. `tds-g11-82` (Period 82 - Đại số): Các số đặc trưng đo xu thế trung tâm — Tiết 2: Tứ phân vị và mốt của mẫu số liệu ghép nhóm.
2. `tds-g11-83` (Period 83 - Đại số): Các số đặc trưng đo xu thế trung tâm — Tiết 3: Luyện tập mẫu số liệu ghép nhóm.
3. `tds-g11-84` (Period 84 - Đại số): Giới hạn của dãy số — Tiết 1: Giới hạn hữu hạn của dãy số.
4. `tds-g11-85` (Period 85 - Đại số): Giới hạn của dãy số — Tiết 2: Quy tắc tính giới hạn, Tổng cấp số nhân lùi vô hạn.
5. `tds-g11-86` (Period 86 - Hình học): Hai mặt phẳng song song — Tiết 4: Hình lăng trụ và hình hộp.
6. `tds-g11-87` (Period 87 - Hình học): Tiết 5: Luyện tập hai mặt phẳng song song.

#### Khối 12 (PPCT `tds-g12` — Tuần 12)
1. `tds-g12-82` (Period 82 - Nguyên hàm): Nguyên hàm — Tiết 3: Tính chất cơ bản của nguyên hàm.
2. `tds-g12-83` (Period 83 - Nguyên hàm): Nguyên hàm — Tiết 4: Nguyên hàm hàm số lũy thừa.
3. `tds-g12-84` (Period 84 - Nguyên hàm): Nguyên hàm — Tiết 5: Nguyên hàm hàm số mũ.
4. `tds-g12-85` (Period 85 - Nguyên hàm): Nguyên hàm — Tiết 6: Nguyên hàm hàm số lượng giác.
5. `tds-g12-86` (Period 86 - Thống kê): Phương sai và độ lệch chuẩn — Tiết 2: Đo độ rủi ro.
6. `tds-g12-87` (Period 87 - Thống kê): Phương sai và độ lệch chuẩn — Tiết 3: Luyện tập.
7. `tds-g12-88` (Period 88 - Thống kê): Ôn tập chương III.

---

## 3. Quy trình thực hiện tuần kế tiếp

Mỗi bài học khi triển khai tuân thủ 5 bước chuẩn hóa:
1. **Gate D (Đặc tả bài học)**: Bám sát PPCT & giáo án gốc; xác định `kind` (`formation` / `practice`), timeline key riêng, ngưỡng phân hoá và rubrics.
2. **Pha B (Triển khai gói bài)**: Biên soạn hoặc merge snapshot tương thích V8.8, hỗ trợ đầy đủ Math Diagram Standard v1.0, Casio (nếu có) và nộp bài giấy.
3. **Kiểm tra cú pháp & build**: `npm run build` / Vitest không lỗi.
4. **QA thực tế đa vai trò**: Kiểm tra trên môi trường live (GV điều khiển, HS làm bài và gửi phản hồi).
5. **Đồng bộ mã nguồn**: Commit và push đồng thời cả 2 nhánh `feat/nop-bai-da-cham` và `main`.
