# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-82`) — Nâng cấp hồi tố V8.8 Master Teacher

> **Mã bài**: `12-12-82` (`tds-g12-82` / `g12_w12_p82_v4`)  
> **Tên bài**: Tính chất cơ bản của nguyên hàm — Tiết 1 (Nguyên hàm — Tiết 3 theo PPCT)  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 03/11/2026  
> **Loại**: Nâng cấp hồi tố theo chuẩn V8.8 Master Teacher (bổ sung trục dữ liệu thực nghiệm xuyên suốt, teacherCue, hint phân tầng)

---

## 1. Trục dữ liệu thực nghiệm mới (Thematic Dataset)

**Trước khi nâng cấp:** Bài toán rời rạc, không có ngữ cảnh xuyên suốt (An/Bình tính $\int (2x+\cos x)dx$, bài toán vật lý chung chung).  
**Sau nâng cấp:** Tàu điện Metro tuyến số 1 (Bến Thành – Suối Tiên) rời ga trong 3 giây đầu, cảm biến IMU:

| Thời điểm $t$ (s) | 0 | 1 | 2 | 3 |
|---|:---:|:---:|:---:|:---:|
| **Gia tốc đo được $a$ (m/s²)** | 0 | 4 | 10 | 18 |

- Mô hình $a(t) = t^2 + 3t$ (khớp tuyệt đối 4 điểm dữ liệu).
- $v(t) = \frac{t^3}{3} + \frac{3t^2}{2}$ (điều kiện $v(0)=0$); $v(3) = 22{,}5$ m/s = 81 km/h.
- $s(t) = \frac{t^4}{12} + \frac{t^3}{2}$ (điều kiện $s(0)=0$); $s(3) = 20{,}25$ m.

## 2. Các điểm nâng cấp chuẩn V8.8 Master Teacher

| Tiêu chí | Trước | Sau |
|---|---|---|
| Trục thực nghiệm | Không | Tàu Metro xuyên suốt S0→S11 (bảng cảm biến, làm mẫu, bẫy vật lý, M/S/C, chi phí vận hành) |
| Interactive question có options | Chưa có ở S1 | S1: "Muốn có $v(t)$ từ $a(t)$ cần làm gì?" (3 lựa chọn, đáp án: nguyên hàm) |
| TeacherCue lớp yếu | Thiếu | S1 (quan hệ đảo chiều), S3 (ý nghĩa vật lý của $C$), S4 (so sánh 22,5 vs 40,5 m/s), S10 (mở lại 4 bước) |
| Hint phân tầng | Không | M: "tách theo 2 tính chất rồi mới tích phân"; S: "tích phân hai lần, lần nào cũng tách"; C: "tìm thời điểm dừng bằng $v(t)=0$" |
| AI Error trong ngữ cảnh | $\int x\sin x\,dx$ (đáp án đúng cần từng phần — ngoài phạm vi tiết học) | $\int t(t+3)\,dt = t\int(t+3)\,dt$ — đáp án đúng nằm đúng trong 2 tính chất của tiết; bằng chứng vật lý $v_{AI}(3)=40{,}5$ m/s = 145,8 km/h vô lý (> 80 km/h) |
| Kiểm chứng số liệu | Bài Challenge cũ sai: $v(6) = 4 \neq 0$ | Toàn bộ số liệu kiểm chứng lại: phanh $a=-4t+8$, $v(0)=10$ → dừng $t=5$s, quãng đường $\frac{200}{3}\approx 66{,}7$ m; ĐGTX hoàn nguyên $s''(t) = t^2+3t$ ✓ |

## 3. Trạng thái mã nguồn
- **Pha A**: `tasks/giaoan-goc-12-12-82.md` + `tasks/gate-d-12-12-82.md` viết lại trọn vẹn theo khuôn V8.8 (bảng ánh xạ 12 chặng, TeacherCue, LookFor, hint).
- **Pha B**: Snapshot `12-12-82` cập nhật: focus, 2 examples Metro, 6 exercises (NB/NB/TH/TH/VD/VD) kèm hint, 2 quick, mistakes, boardKnowledge (bảng dữ liệu tàu 5 mục); `aiErrors["12-12-82"]` viết lại 8 trường (category "Lỗi đại số", boardPrompt, libraryTitle mới). Timeline `gateD121282` giữ nguyên (3-4-2-6-3-1-7-3-5-3-3 phút).

## 4. Kiểm thử tự động & Build
- **Vitest**: 39 test files, **442/442 tests PASS 100%** (toàn bộ `src/lib/liveLesson/`).
- **Build**: `npm run build` PASS không lỗi (built in 56.02s, chỉ còn warning sẵn có của hệ thống).

## 5. Xuất bản Portal & QA Live
- **Xuất bản**: "Tạo và xuất bản 66 bài" → `66/66` (66 xuất bản, 0 bỏ qua, 0 audit fail, 0 lỗi).
- **Live Session**: `2LcMkY5ExQ6r7LQ6JViK` · lớp `12LoTrinh1` (`AD4GKT`).
- **GV (TV Control)**: Duyệt đủ 12 chặng P00→P40; chặng 12/12 nút "Sau" disabled ✓. Nội dung Metro xác nhận live (trang chứa "metro", "tàu", số AI Error 40,5 m/s / 145,8 km/h).
- **HS (Edge profile riêng, port 9223)**: Cổng vào hiển thị đúng lớp `12LoTrinh1` + danh sách học sinh đồng bộ (Lò Mai Phương Chi, Nguyễn Chi Mai, Nguyễn Đức Huy, ...).
- **Bằng chứng**: `tasks/tmp-qa-12-12-82-gv-final.png`, `tasks/tmp-qa-12-12-82-hs-final.png`, `tasks/tmp-qa-12-12-82-gv-stage5-ai.png`.

## 6. Kết luận
- **PASS** — bài `12-12-82` đạt chuẩn V8.8 Master Teacher sau nâng cấp hồi tố.
- Bước tiếp theo: nâng cấp hồi tố tiếp theo thứ tự `12-12-83` → `12-12-84` → `12-12-85` → `12-12-86` → `12-12-87` (đối chiếu chuẩn đã đạt).
