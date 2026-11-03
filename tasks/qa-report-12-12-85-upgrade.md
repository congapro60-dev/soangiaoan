# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-85`) — Nâng cấp hồi tố V8.8 Master Teacher

> **Mã bài**: `12-12-85` (`tds-g12-85` / `g12_w12_p85_v4`)  
> **Tên bài**: Nguyên hàm — Tiết 4 (Nguyên hàm của hàm số lượng giác — Tiết 6 theo PPCT)  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 03/11/2026  
> **Loại**: Nâng cấp hồi tố theo chuẩn V8.8 Master Teacher

---

## 1. Trục dữ liệu thực nghiệm mới (Thematic Dataset)

**Trước khi nâng cấp:** Bài toán rời rạc (∫(x² + cos x), dao động chung chung), không trục xuyên suốt.  
**Sau nâng cấp:** **Con lắc Foucault bảo tàng Khoa học**:

| Đại lượng | Giá trị |
|---|---|
| Chiều dài dây $l$ | $\approx 9{,}8$ m |
| Chu kỳ $T = \frac{2\pi}{\omega}$, $\omega = \sqrt{g/l} = \sqrt{9{,}8/9{,}8} = 1$ rad/s | $T = 2\pi \approx 6{,}28$ s |
| Vận tốc ngang đo được (qua vị trí thấp nhất lúc $t = 0$) | $v(t) = 0{,}5\cos t$ (m/s) |
| Li độ dựng lại (điều kiện $s(0) = 0$) | $s(t) = 0{,}5\sin t$ (m), biên độ $0{,}5$ m |

- Số liệu khớp: $\omega = 1$ nằm đúng phạm vi tiết học (không cần công thức $\frac{\sin\omega t}{\omega}$); $T \approx 6{,}28$ s nhất quán với $l \approx 9{,}8$ m ✓; hoàn nguyên $s'(t) = 0{,}5\cos t$ ✓.
- Kế thừa trục Tuần 12: S8 dùng hệ thống treo cabin tàu metro (điều kiện ban đầu $F(0) = 5$ → $F(t) = -\cos t + 2\sin t + 6$) — nối với $v(0) = 0$ của Tiết 3.

## 2. Các điểm nâng cấp chuẩn V8.8 Master Teacher

| Tiêu chí | Trước | Sau |
|---|---|---|
| Trục thực nghiệm | Không | Con lắc Foucault xuyên suốt S0→S11 (dựng li độ từ vận tốc, biên độ, chu kỳ) |
| Interactive question có options | Chưa có ở S1 | S1: "Nguyên hàm của $\sin t$ là gì?" (3 lựa chọn, có bẫy "giống đạo hàm", đáp án $-\cos t + C$) |
| TeacherCue lớp yếu | Thiếu | S1 (quy tắc "ngược chiều"), S3 (điều kiện ban đầu xác định chuyển động), S4 (vẽ phác đồ thị lộ mâu thuẫn), S10 (mở lại 4 bước) |
| Hint phân tầng | Không | M: "lấy đạo hàm thử đáp án; cos đi xuôi, sin đi ngược có dấu trừ"; S: "tách tuyến tính, nhớ cos 0 = 1, sin 0 = 0"; C: "biên độ là hệ số của sin/cos" |
| AI Error trong ngữ cảnh | "$\int \sin x\,dx = \cos x + C$" (trừu tượng) | AI trợ lý bảo tàng dựng li độ sai chiều → **"AI làm con lắc chạy ngược chiều"** ($v > 0$ nhưng $s' < 0$); sửa đúng kèm điều kiện $s(0) = 0$ → $s(t) = 1 - \cos t$ |
| Kiểm chứng số liệu | — | $\omega = \sqrt{g/l} = 1$ ✓; $T = 2\pi$ ✓; hoàn nguyên $s' = v$ ✓ |

## 3. Trạng thái mã nguồn
- **Pha A**: `tasks/giaoan-goc-12-12-85.md` + `tasks/gate-d-12-12-85.md` viết lại trọn vẹn (bảng dataset con lắc, storyboard TeacherCue/LookFor/hint).
- **Pha B**: Snapshot `12-12-85` cập nhật: focus, 2 examples (con lắc Foucault + hệ thống treo cabin), 6 exercises (NB/NB/TH/TH/VD/VD) kèm hint, 2 quick (giữ nguyên — đã tốt), mistakes, boardKnowledge (bảng con lắc 4 mục); `aiErrors["12-12-85"]` viết lại 8 trường. Timeline `gateD121285` giữ nguyên.

## 4. Kiểm thử tự động & Build
- **Vitest**: 39 test files, **442/442 tests PASS 100%**.
- **Build**: `npm run build` PASS không lỗi (built in 1m 37s).

## 5. Xuất bản Portal & QA Live
- **Xuất bản**: Chạy "Tạo và xuất bản 66 bài" — lượt đầu timeout ở vòng chờ nhưng publish đã hoàn tất ngầm; lượt xác nhận lại: `0 xuất bản, 66 bỏ qua, 0 audit fail, 0 lỗi` (nội dung mới đã đồng bộ; xác minh trực tiếp bằng nội dung live bên dưới).
- **Live Session**: `6bSogl7CqrBwInBbthXx` · lớp `12LoTrinh1` (`AD4GKT`).
- **GV (TV Control)**: Duyệt đủ 12 chặng P00→P40; chặng 12/12 nút "Sau" disabled ✓. Nội dung mới xác nhận live: "Foucault / con lắc / 0,5" xuất hiện ở chặng 2, 3, 5, 6, 8, 11, 12; dấu trừ $-\cos$ ở chặng 2, 3, 4, 6, 8, 9, 11, 12.
- **HS (Edge profile riêng, port 9223)**: Cổng vào hiển thị đúng lớp `12LoTrinh1` + danh sách học sinh đồng bộ.
- **Bằng chứng**: `tasks/tmp-qa-12-12-85-gv-final.png`, `tasks/tmp-qa-12-12-85-hs-final.png`.

## 6. Kết luận
- **PASS** — bài `12-12-85` đạt chuẩn V8.8 Master Teacher sau nâng cấp hồi tố.
- Tiến độ mục 13: `82` ✅ → `83` ✅ → `84` ✅ → `85` ✅ → tiếp theo `12-12-86` (bài cuối).
