# GATE D — BÀI HỌC TƯƠNG TÁC V8.8 · 3 bài Tuần 11 (10 / 11 / 12)

> Ngày soạn: 2026-10-25 · Trạng thái: **✅ THẦY DUYỆT 2026-10-25 — ĐÃ MỞ GATE C (hạ tầng trước, nội dung sau)**
> Đầu vào: Gate P đã khoá (`tasks/gate-p-3-bai-tuan11.md`), guide V8.8 (zip), mẫu giáo án chuẩn `MAU_GIAO_AN_BAN_TOAN.md`, SGK KNTT (SGK 12 nguyên văn WORD trang 80; SGK 10/11 scan).
> Quy tắc: sau khi thầy duyệt Gate D mới mở Gate C (code Presenter/Student/Coach trên `/adaptive-live`).

## File của Gate D

| File | Nội dung |
|---|---|
| `tasks/gate-d-3-bai-tuan11.md` (file này) | Chuẩn chung 3 luồng + wireframe + visual contract + timing contract + contract nhóm/kiểm tra chéo |
| `tasks/gate-d-g10-so-gan-dung-sai-so.md` | Khối 10: storyboard từng pha + copy chốt + giáo án in P0→P40 |
| `tasks/gate-d-g11-mau-so-lieu-ghep-nhom.md` | Khối 11: như trên (đã xử lý cảnh báo vượt ngân sách của Gate P) |
| `tasks/gate-d-g12-phuong-sai-do-lech-chuan.md` | Khối 12: như trên (nguồn SGK 12 trang 80 đã đối chiếu) |

---

# 1. BA LUỒNG — KIẾN TRÚC CHUNG V8.8

## 1.1. PRESENTER (màn hình lớn / máy chiếu GV) — 5 vùng cố định

```text
┌────────────────────────────────────────────────────────────────┐
│ V1 ĐẦU TRANG: Tên bài · Pha hiện tại · Timer P · Mã phòng      │
├─────────────────────────────────────────────┬──────────────────┤
│ V2 NỘI DUNG PHA                             │ V4 CUE GV        │
│ (visual chính: bảng số liệu / công thức /   │ (câu dẫn hôm nay │
│  trục số / đề bài)                          │  + đáp án thu gọn│
│                                             │  + nhãn câu hỏi) │
│                                             ├──────────────────┤
│                                             │ V5 HÀNH ĐỘNG GV  │
│ V3 CÔNG BỐ / STATS                          │ (Next · Dừng ·   │
│ (bảng phản hồi nhóm đã gửi / biểu quyết)    │  Công bố · Nút   │
│                                             │  highlight)      │
└─────────────────────────────────────────────┴──────────────────┘
```

Nguyên tắc: **V2 chỉ nhảy pha khi GV bấm Next** — không tự chạy; Timer P đếm theo dải P (P8→P24…), phút thứ 35 hiện cảnh báo vàng "còn 5 phút", phút 38 đỏ.

## 1.2. STUDENT (máy HS) — tối giản, 1 việc/1 nút

```text
┌──────────────────────────────┐
│ Đầu: Bài · Pha · Nhóm N[x]   │
│ Trạng thái: "NGHE GV" hoặc   │
│             "LÀM TRÊN MÁY"   │
├──────────────────────────────┤
│ Task hiện tại (1 việc)       │
│ Ô nhập / lựa chọn            │
│ [ GỬI ]                      │
│ Cue 1 dòng (hint đã mở)      │
├──────────────────────────────┤
│ Chân: nháp nhóm đã lưu       │
└──────────────────────────────┘
```

Nguyên tắc: khi pha là pha toàn lớp (KHỞI ĐỘNG, chốt kiến thức), màn Student thu thành **tấm thẻ nhỏ "NGHE GV" + câu trả lời nhanh (chọn 1 trong 3)** — sự chú ý ở GV và màn lớn, không đọc nội dung dài trên máy.

## 1.3. COACH (màn phụ GV, hoặc tab /coach) — bằng chứng, không chấm điểm

- **Observation**: mỗi HS/nhóm — đã gửi chưa, số câu đúng, thời gian câu đầu cuối, có sửa sau khi xem nhóm khác.
- **Hypothesis**: cảnh báo dạng "có thể nhóm 3 đang hiểu nhầm [a; b) đóng hai đầu" — luôn kèm **mẹo kiểm ngay** (1 câu hỏi GV hỏi nhanh).
- **UNKNOWN** cho HS chưa gửi bất kỳ dữ liệu nào — không suy năng lực.
- **Quy tắc cứng**: Coach **không** xếp loại HS, không xếp hạng nhóm, không tự bung đáp án ở pha chưa công bố.

## 1.4. ATTENTION HANDOFF (dùng chung 3 bài)

| Chuyển | Cơ chế kỹ thuật | Copy Student thấy khi chuyển |
|---|---|---|
| Presenter → Máy (task nhóm) | GV bấm "Giao task về máy" → Student đổi trạng thái thành "LÀM TRÊN MÁY" + task hiện | "Mỗi nhóm lấy số liệu theo phiếu — bấm GỬI khi xong." |
| Máy → Presenter (công bố) | GV bấm "Công bố" → Student đổi thành "NGHE GV", giữ nguyên nháp | "Ngẩng lên — kết quả các nhóm đang trên màn hình." |
| Máy (cá nhân) |GV bấm "Giao luyện tập" | "Giờ đến lượt em tự làm — có 3 câu." |

Không mất dữ liệu khi chuyển: nháp nhóm/bảng trung gian **tự lưu vào máy HS**, quay lại pha đúng trạng thái.

---

# 2. WIREFRAME PHA CHUẨN (áp cho mọi activity máy)

```text
Trước gửi:  [câu hỏi]  [input]  [GỬI]        → nút GỬI hiện, không có đáp án
Đã gửi:     [câu hỏi]  [input khoá] [ĐÃ GỬI ✓] → không hiện đúng/sai ngay
Công bố:    Presenter V3 hiện bảng; màn HS vẫn khoá đáp án cá nhân đến khi GV "Công bố"
Reveal:     chỉ sau khi GV bật "Reveal" → HS thấy đáp án chuẩn + lời giải 1 dòng
```

# 3. VISUAL CONTRACT (chung — chi tiết từng bài ở file riêng)

- **Reveal theo từng phần**: công thức/bước hiện sau khi lớp trả lời chỗ trống; không reveal nào tự chạy.
- **no-spoiler**: `ANSWER_KEY` nằm trong closure JS, **không** đặt vào DOM trước pha Reveal; không data-correct*, không div solution tĩnh (đúng fix P0 đã deploy).
- **Fallback mất mạng**: giáo án in có bước vẽ tay (trục số / bảng 26 số / bảng trung gian) — GV chạy tiếp không mạng, Student nâng phiếu giấy; khi có mạng lại, HS chụp/gửi ảnh phiếu là đủ.

# 4. TIMING CONTRACT

- Mỗi activity có **P-zone** (dải phút trong tiết 40'), trùng khít giáo án in.
- **coreBudget** = phần bắt buộc (protected — không được cắt): mọi pha sinh bằng chứng.
- **reserveBudget** = hoạt động dự phòng, tiêu khi xong sớm hoặc chậm đôn đốc; có "điều kiện quay về" rõ.
- **Fast-path**: nhóm xong sớm nhận câu DEEP/EXPLORE, vẫn thấy khi Presenter chuyển pha (không mất nháp).
- Timer V1 chạy theo P-zone, phút 35 cảnh báo, phút 38 đỏ + nhắc "SƠ KẾT".

# 5. CONTRACT NHÓM + KIỂM TRA CHÉO

- Vào phòng: mã phòng + SBD → gán **nhóm N[x]** (2–4 HS, ≤ 8 nhóm, sĩ số tới 26).
- Vai nhóm tự phân: đo/ghi/chỉ huy/báo cáo — Coach ghi nhận ai gửi (chỉ 1 thứ tự gửi/nhóm, không ai bị bỏ).
- Gửi: 1 HS gửi thay nhóm, kèm chọn tên báo cáo viên — mọi thành viên thấy kết quả gửi.
- Kiểm tra chéo: cặp/nhóm A nhận **bản ẩn danh** của B (chỉ hiện "Nhóm 2"), chấm 3 tiêu chí + 1 câu nhận xét chữ; nhận xét về cho nhóm B.
- Số nhóm thực tế ở Stats tự tính theo số nhóm đã đăng ký — không cứng 26.

# 6. THỨ TỰ GATE C (code) — sau khi Gate D được duyệt

1. Khung 3 luồng `/adaptive-live` (V1–V5 Presenter, Student 1-task, Coach read-only) + P-timer + handoff.
2. Nhận trạng thái từ checkpoint có sẵn `dewey-ckpt-v1-{lessonId}-{mãHS}` (không cộng điểm lần 2 — luật fix P0).
3. Chỉ nghỉ khi build 0 TS error + 3 smoke: mở bài G10 ( presenter/student/coach), gửi task nhóm, công bố.
