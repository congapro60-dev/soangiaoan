# Báo cáo QA Bài Tuần 12 — Khối 12 (`12-12-86`) — Nâng cấp hồi tố V8.8 Master Teacher

> **Mã bài**: `12-12-86` (`tds-g12-86` / `g12_w12_p86_v4`)  
> **Tên bài**: Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro — Tiết 5  
> **Thời lượng**: 40 phút (2400 giây) · Chuẩn V8.8 Gate D (12 chặng)  
> **Ngày nghiệm thu**: 03/11/2026  
> **Loại**: Nâng cấp hồi tố theo chuẩn V8.8 Master Teacher (bài cuối của mục 13)

---

## 1. Trục dữ liệu thực nghiệm mới (Thematic Dataset)

**Trước khi nâng cấp:** Ngữ cảnh rời rạc (bắn súng An/Bình ở S0, cổ phiếu X ở ví dụ, máy đóng chai ở bài tập) — chưa có 1 trục xuyên suốt.  
**Sau nâng cấp:** **Quỹ tư vấn đầu tư — 3 cổ phiếu X/Y/Z cùng lợi suất trung bình 6,8%/phiên** (chị Hương, 100 triệu):

| Cổ phiếu | $[0;4)$ | $[4;8)$ | $[8;12)$ | $x̄$ | $s^2$ | $s$ |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **X** | 6 | 20 | 14 | 6,8 | **7,36** | **≈ 2,71** |
| **Y** | 12 | 8 | 20 | 6,8 | **12,16** | **≈ 3,49** |
| **Z** | 8 | 16 | 16 | 6,8 | **8,96** | **≈ 2,99** |

- Kiểm chứng: cả 3 bảng đều $\Sigma n_ic_i = 272$ → $x̄ = 6{,}8$ ✓ (điều kiện so sánh hợp lệ).
- Xếp hạng rủi ro: $s^2_X = 7{,}36 < s^2_Z = 8{,}96 < s^2_Y = 12{,}16$.
- Ý nghĩa phân bố: Y dồn về hai đầu (chỉ 8/40 phiên ở giữa) — biến động mạnh; X dồn về giữa (20/40) — ổn định.

## 2. Các điểm nâng cấp chuẩn V8.8 Master Teacher

| Tiêu chí | Trước | Sau |
|---|---|---|
| Trục thực nghiệm | Rời rạc (bắn súng + cổ phiếu + máy đóng chai) | 1 trục duy nhất: 3 cổ phiếu X/Y/Z xuyên suốt S0→S11 |
| Interactive question có options | Chưa có ở S1 | S1: "Muốn đánh giá cổ phiếu nào an toàn hơn cần tính gì?" (3 lựa chọn) |
| TeacherCue lớp yếu | Thiếu | S1 ("trung bình = điểm rơi, phương sai = độ dao động"), S3 (bảng trung gian 3 cột), S4 (đối chiếu 2 phân bố), S10 (mở lại 4 bước) |
| Hint phân tầng | Không | M: "đi đúng 4 bước, bảng đủ 3 cột"; S: "dùng x̄ giải ngược m trước"; C: "khuyến nghị đủ 3 điều kiện" |
| AI Error | Đã tốt (thiếu điều kiện) | Giữ khung, gắn chặt trục chị Hương + bằng chứng phân bố (X dồn giữa 20/40 vs Y dồn hai đầu) |
| Bài tập mới | — | TH mới: khuyến nghị theo khẩu vị 3 nhà đầu tư (bác Long/chị Hương/bạn Nam) — mô hình hóa quyết định thực tế |

## 3. Trạng thái mã nguồn
- **Pha A**: `tasks/giaoan-goc-12-12-86.md` + `tasks/gate-d-12-12-86.md` viết lại trọn vẹn (bảng dataset 3 cổ phiếu, storyboard TeacherCue/LookFor/hint).
- **Pha B**: Snapshot `12-12-86` cập nhật: focus, 2 examples (quy trình 4 bước X + "tính cách" Y), 6 exercises (NB/NB/TH/TH/VD/VD) kèm hint, 2 quick (giữ nguyên — đã tốt), mistakes, boardKnowledge (bảng 3 cổ phiếu 4 mục); `aiErrors["12-12-86"]` gắn trục chị Hương. Timeline `gateD121286` giữ nguyên.

## 4. Kiểm thử tự động & Build
- **Vitest**: 39 test files, **442/442 tests PASS 100%**.
- **Build**: `npm run build` PASS không lỗi (built in 3m 6s).

## 5. Xuất bản Portal & QA Live
- **Xuất bản**: "Tạo và xuất bản 66 bài" → `66/66` (66 xuất bản, 0 bỏ qua, **0 audit fail, 0 lỗi**).
- **Live Session**: `zzHtlZJAhuCDBOMW4naj` · lớp `12LoTrinh1` (`AD4GKT`).
- **GV (TV Control)**: Duyệt đủ 12 chặng P00→P40; chặng 12/12 nút "Sau" disabled ✓. Nội dung mới xác nhận live: "cổ phiếu X/Y, 7,36/12,16, chị Hương" ở **cả 12 chặng**; quy trình 4 bước ("bảng trung gian, 2,71/3,49") ở chặng 2, 3, 5, 6, 8, 11, 12.
- **HS (Edge profile riêng, port 9223)**: Cổng vào hiển thị đúng lớp `12LoTrinh1` + danh sách học sinh đồng bộ.
- **Bằng chứng**: `tasks/tmp-qa-12-12-86-gv-final.png`, `tasks/tmp-qa-12-12-86-hs-final.png`.

## 6. Kết luận
- **PASS** — bài `12-12-86` đạt chuẩn V8.8 Master Teacher sau nâng cấp hồi tố.
- **MỤC 13 HOÀN THÀNH**: toàn bộ 5 bài cũ Tuần 12 (`82`→`86`) đã đạt chuẩn V8.8 Master Teacher; cộng `12-12-87` soạn chuẩn từ đầu → khối 12 Tuần 12 hoàn chỉnh 6/6 bài chuẩn V8.8.
