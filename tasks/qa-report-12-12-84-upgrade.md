# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-84`) — Nâng cấp hồi tố V8.8 Master Teacher

> **Mã bài**: `12-12-84` (`tds-g12-84` / `g12_w12_p84_v4`)  
> **Tên bài**: Nguyên hàm — Tiết 3 (Nguyên hàm của hàm số mũ — Tiết 5 theo PPCT)  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 03/11/2026  
> **Loại**: Nâng cấp hồi tố theo chuẩn V8.8 Master Teacher

---

## 1. Trục dữ liệu thực nghiệm mới (Thematic Dataset)

**Trước khi nâng cấp:** Bài toán rời rạc (∫5^x, doanh thu cửa hàng), không có trục xuyên suốt.  
**Sau nâng cấp:** **Lãi kép — Cuộc đua 2 ngân hàng** (Lan gửi 10 triệu trong 10 năm):

| Ngân hàng | Cách tính lãi | Mô hình số dư |
|---|---|---|
| BlueBank | 6%/năm, ghép **mỗi năm** | $B(t) = 10\cdot(1{,}06)^t$ |
| GreenBank | 6%/năm, ghép **liên tục** | $A(t) = 10\cdot e^{0{,}06t}$ |

- $B(10) \approx 17{,}91$ triệu (lãi $\approx 7{,}91$); $A(10) \approx 18{,}22$ triệu (lãi $\approx 8{,}22$).
- GreenBank thắng $0{,}31$ triệu — lãi ghép liên tục ($e$) mạnh hơn ghép từng kỳ cùng lãi suất danh nghĩa.
- Số liệu kiểm chứng: $1{,}06^{10} = 1{,}79085$ ✓; $e^{0{,}6} = 1{,}82212$ ✓.

## 2. Các điểm nâng cấp chuẩn V8.8 Master Teacher

| Tiêu chí | Trước | Sau |
|---|---|---|
| Trục thực nghiệm | Không | Cuộc đua 2 ngân hàng xuyên suốt S0→S11 (mô hình số dư, lãi tích lũy, kết quả 10 năm) |
| Interactive question có options | Chưa có ở S1 | S1: "Nguyên hàm của $(1{,}06)^t$ là gì?" (3 lựa chọn, có bẫy $t(1{,}06)^{t-1}$, đáp án chia $\ln 1{,}06$) |
| TeacherCue lớp yếu | Thiếu | S1 ("biến ở trên cao" vs "biến ở dưới đất"), S3 (kiểm chứng đạo hàm = chìa khoá vạn năng), S4 (thử đạo hàm 2 đáp án), S10 (mở lại 3 bước) |
| Hint phân tầng | Không | M: "nhận diện hàm số mũ rồi chia ln a"; S: "tách tuyến tính trước, mỗi phần chọn đúng công thức"; C: "tìm C từ R(0) trước rồi thay số" |
| AI Error trong ngữ cảnh | "3^x + C" (trừu tượng) | AI dự báo lãi BlueBank: "$\int (1{,}06)^t dt = (1{,}06)^t + C$" — quên $\ln 1{,}06$; hậu quả: mọi bảng dự báo lãi lệch hệ số |
| Kiểm chứng số liệu | — | $\left(\frac{a^x}{\ln a}\right)' = a^x$ ✓; $(1{,}06)^{10}$ và $e^{0{,}6}$ tính tay ✓; hoàn nguyên đạo hàm ✓ |

## 3. Trạng thái mã nguồn
- **Pha A**: `tasks/giaoan-goc-12-12-84.md` + `tasks/gate-d-12-12-84.md` viết lại trọn vẹn (bảng dataset 2 ngân hàng, storyboard TeacherCue/LookFor/hint).
- **Pha B**: Snapshot `12-12-84` cập nhật: focus, 2 examples (nguyên hàm $(1{,}06)^t$ + so sánh 2 ngân hàng 10 năm), 6 exercises (NB/NB/TH/TH/VD/VD) kèm hint, 2 quick, mistakes, boardKnowledge (bảng cuộc đua 4 mục); `aiErrors["12-12-84"]` viết lại 8 trường (bối cảnh BlueBank). Timeline `gateD121284` giữ nguyên.

## 4. Kiểm thử tự động & Build
- **Vitest**: 39 test files, **442/442 tests PASS 100%**.
- **Build**: `npm run build` PASS không lỗi (built in 4m 23s).

## 5. Xuất bản Portal & QA Live
- **Xuất bản**: Chạy "Tạo và xuất bản 66 bài" → `0 xuất bản, 66 bỏ qua, 0 audit fail, 0 lỗi` (nội dung mới đã được đồng bộ vào bài đã xuất bản; xác minh trực tiếp bằng nội dung live bên dưới).
- **Live Session**: `DzHFVh8pJIStuxIO89hW` · lớp `12LoTrinh1` (`AD4GKT`).
- **GV (TV Control)**: Duyệt đủ 12 chặng P00→P40; chặng 12/12 nút "Sau" disabled ✓. Nội dung mới xác nhận live: "BlueBank/GreenBank", số "17,91/18,22", "(1,06)" xuất hiện ở chặng 2, 3, 5, 6, 8, 11, 12.
- **HS (Edge profile riêng, port 9223)**: Cổng vào hiển thị đúng lớp `12LoTrinh1` + danh sách học sinh đồng bộ.
- **Bằng chứng**: `tasks/tmp-qa-12-12-84-gv-final.png`, `tasks/tmp-qa-12-12-84-hs-final.png`.

## 6. Kết luận
- **PASS** — bài `12-12-84` đạt chuẩn V8.8 Master Teacher sau nâng cấp hồi tố.
- Tiến độ mục 13: `82` ✅ → `83` ✅ → `84` ✅ → tiếp theo `12-12-85` → `12-12-86`.
