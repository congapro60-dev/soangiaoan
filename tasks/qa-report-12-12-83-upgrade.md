# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-83`) — Nâng cấp hồi tố V8.8 Master Teacher

> **Mã bài**: `12-12-83` (`tds-g12-83` / `g12_w12_p83_v4`)  
> **Tên bài**: Nguyên hàm — Tiết 2 (Nguyên hàm của hàm số lũy thừa — Tiết 4 theo PPCT)  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 03/11/2026  
> **Loại**: Nâng cấp hồi tố theo chuẩn V8.8 Master Teacher

---

## 1. Trục dữ liệu thực nghiệm mới (Thematic Dataset)

**Trước khi nâng cấp:** Bài toán rời rạc (An/Bình tranh luận ∫dx/x), chi phí biên chung chung, không có trục xuyên suốt.  
**Sau nâng cấp:** **Chuyến thám hiểm Mặt Trăng** — 2 giai đoạn bay:

**Giai đoạn 1 — PHÓNG (Tsiolkovsky):** $m_0 = 200$ tấn, $m_f = 50$ tấn, $v_e = 3$ km/s:
$$\Delta v = v_e\int_{m_f}^{m_0}\frac{dm}{m} = v_e\ln\frac{m_0}{m_f} = 3\ln 4 \approx 4{,}16 \text{ km/s}$$

**Giai đoạn 2 — BAY TỰ DO (lực hút Trái Đất):** $F(r) = \frac{k}{r^2}$, $k = 4\times10^{18}$ N·m², $R = 6{,}4\times10^6$ m:
- Kiểm chứng mặt đất: $F(R) \approx 9{,}77\times10^4$ N → $a \approx 9{,}77$ m/s² ≈ $g$ ✓
- Công thoát: $W = \frac{k}{R} = 6{,}25\times10^{11}$ J
- Tốc độ thoát: $v = \sqrt{\frac{2k}{mR}} \approx 11{,}2$ km/s — **trùng số liệu thực tế của Trái Đất** ✓

## 2. Các điểm nâng cấp chuẩn V8.8 Master Teacher

| Tiêu chí | Trước | Sau |
|---|---|---|
| Trục thực nghiệm | Không | Tàu vũ trụ xuyên suốt S0→S11 (phóng Tsiolkovsky, lực hút k/r², tốc độ thoát 11,2 km/s) |
| Interactive question có options | Chưa có ở S1 | S1: "Để tính ∫dm/m dùng công thức nào?" (3 lựa chọn, đáp án ln) |
| TeacherCue lớp yếu | Thiếu | S1 (điều kiện α≠−1), S3 (kiểm tra α là bước đầu tiên), S4 (bằng chứng thực tế Apollo), S10 (mở lại 4 bước) |
| Hint phân tầng | Không | M: "kiểm tra α trước, α=−1 thì dùng ln"; S: "tách phân thức, nhớ nêu miền"; C: "khai triển + lũy thừa phân số" |
| AI Error trong ngữ cảnh | "1/x không có nguyên hàm" (trừu tượng) | "Δv không tồn tại — tàu không thể tăng tốc" + bằng chứng thực tế: tàu Apollo đang bay; phân biệt "không xác định" ≠ "không tồn tại" |
| Kiểm chứng số liệu | — | F(R) ≈ g ✓; tốc độ thoát 11,2 km/s khớp vật lý thực ✓; hoàn nguyên (ln m)′ = 1/m ✓ |

## 3. Trạng thái mã nguồn
- **Pha A**: `tasks/giaoan-goc-12-12-83.md` + `tasks/gate-d-12-12-83.md` viết lại trọn vẹn (bảng dataset 2 giai đoạn, storyboard TeacherCue/LookFor/hint).
- **Pha B**: Snapshot `12-12-83` cập nhật: focus, 2 examples (Δv Tsiolkovsky + tốc độ thoát), 6 exercises (NB/NB/TH/TH/VD/VD) kèm hint + biến $r$ theo ngữ cảnh quỹ đạo, 2 quick, mistakes, boardKnowledge (bảng tàu 5 mục); `aiErrors["12-12-83"]` viết lại 8 trường. Timeline `gateD121283` giữ nguyên.

## 4. Kiểm thử tự động & Build
- **Vitest**: 39 test files, **442/442 tests PASS 100%**.
- **Build**: `npm run build` PASS không lỗi (built in 3m 5s).

## 5. Xuất bản Portal & QA Live
- **Xuất bản**: "Tạo và xuất bản 66 bài" → `1 xuất bản` (bài 12-12-83 nội dung mới), `65 bỏ qua`, **0 audit fail, 0 lỗi**.
- **Live Session**: `fbbdl3hlD5kH7H5h0T44` · lớp `12LoTrinh1` (`AD4GKT`).
- **GV (TV Control)**: Duyệt đủ 12 chặng P00→P40; chặng 12/12 nút "Sau" disabled ✓. Nội dung Tsiolkovsky/Δv xác nhận live.
- **HS (Edge profile riêng, port 9223)**: Cổng vào hiển thị đúng lớp `12LoTrinh1` + danh sách học sinh đồng bộ.
- **Bằng chứng**: `tasks/tmp-qa-12-12-83-gv-final.png`, `tasks/tmp-qa-12-12-83-hs-final.png`.

## 6. Kết luận
- **PASS** — bài `12-12-83` đạt chuẩn V8.8 Master Teacher sau nâng cấp hồi tố.
- Tiến độ mục 13: `82` ✅ → `83` ✅ → tiếp theo `12-12-84` → `12-12-85` → `12-12-86`.
