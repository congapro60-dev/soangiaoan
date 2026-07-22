# Báo cáo nghiệm thu 3 fix + E2E ẩn danh — Production

> Môi trường: https://giaoandewey.vercel.app (build mới, hard-refresh). Tài khoản GV: Vũ Việt Cường.
> Ngày: 25/06/2026. Tham chiếu: HANDOFF.md (commit `a832207` cho cả 3 fix; rules đã deploy).
> Phương pháp kiểm "ẩn danh": app KHÔNG dùng `signInAnonymously` (đã grep) → đọc REST Firestore KHÔNG kèm token chính là đại diện đúng cho học sinh ẩn danh. (Công cụ điều khiển Chrome không mở được cửa sổ ẩn danh riêng — ghi rõ ở cuối.)

---

## TỔNG QUAN

| Mục | Kết quả |
|---|---|
| Tiên quyết — publish bài mới (sau fix) | **ĐẠT** |
| FIX #1 — Cổng học sinh ẩn danh | **ĐẠT** (published 200, nháp 403) |
| FIX #4 — Mô phỏng đúng theo từng mảnh | **ĐẠT** |
| FIX #2 — Hình TikZ không vỡ | **ĐẠT** (5/5 kroki OK, 0 ảnh vỡ) |
| E — E2E trọn 5 bước + lưu progress | **ĐẠT** (màn "Đã lưu kết quả học tập", console sạch) |

**Cả 3 fix + E2E đều ĐẠT.** (Vẫn còn dấu vết quota 429: personalization relay 500 → fallback về bài gốc — đã biết, không tính lỗi mới.)

> **CẬP NHẬT — Đi tuần tự TỪNG BƯỚC (thao tác thật) để rà lỗi:** phát hiện **1 lỗi hiển thị MỚI** (🟠 MathJax không render bên trong mô phỏng) — xem mục "RÀ TỪNG BƯỚC" cuối báo cáo.

---

## RÀ TỪNG BƯỚC CỔNG HỌC SINH (thao tác THẬT, không tua tắt)

Đi lại trọn vẹn với học sinh "Tran Ra Soat / 12B1 / 12B1-RS", thao tác thật từng màn:

| Bước | Thao tác thật | Kết quả |
|---|---|---|
| Bước 1 Nhập thông tin | Click + gõ tên/lớp/mã, gallery 4 ảnh | **ĐẠT** (4 ảnh đúng môn, không vỡ) |
| Bước 2 Pre-test | Click chọn từng đáp án 5 câu (radio), MathJax phân số đẹp, nộp | **ĐẠT** |
| Khởi động — Đặt mục tiêu | Gõ mục tiêu → "Phân tích mục tiêu" | **ĐẠT** — hiện khung 3 cấp (Nhận biết/Thông hiểu/Vận dụng) đúng bài |
| Mảnh 1 — Mô phỏng | **Kéo slider "ĐIỀU KIỆN B ĐÃ XẢY RA" 0%→65%** | **ĐẠT tương tác** — sơ đồ Venn cập nhật tức thì (vùng ngoài B mờ đi). Nhưng **LỖI hiển thị công thức, xem dưới** |
| Mảnh 1 — Socratic "Thử và sửa" | Nhập đáp án → "Kiểm tra gợi ý" | **ĐẠT** — feedback "Tốt! Tiếp tục..." + nút "Mở bước tiếp theo"; Vở ghi tự điền |
| Olympia — gói 10 | Chọn đáp án đúng (P(A\|B)=0.6) → "Trả lời" | **ĐẠT** — **điểm cộng dồn 0→10**, feedback "Chính xác! Em nhận 10 điểm" |
| Olympia — cả 3 gói | Trả lời hết 3 gói (10/20/30) | **ĐẠT** — điểm cộng dồn lên **370**, nút kết thúc Olympia hiện |
| Mở rộng | Gõ liên hệ → "Gửi liên hệ" → sang tổng kết | **ĐẠT** |
| Tổng kết | Tick 3 ô tự đánh giá → "Hoàn tất bài học" | **ĐẠT** |
| Bước 5 Lưu kết quả | (tự động) | **ĐẠT** — màn "✅ Đã lưu kết quả học tập", console KHÔNG lỗi thật (chỉ 1 exception do JS automation của tôi, không phải lỗi trang) |

### 🟠 LỖI MỚI #5 — MathJax KHÔNG render bên trong mô phỏng (sim-frame)
- **Triệu chứng:** Trong khối "Mô phỏng tương tác" của mảnh, công thức bị **phơi mã LaTeX thô**: tiêu đề hiện `Xác suất có điều kiện $P(A|B)$`, nhãn slider `Kích thước $P(A)$`, và công thức `$P(A|B) = \frac{P(AB)}{P(B)} = \frac{\text{Diện tích}...}$` hiện nguyên ký tự `$ \frac \text`.
- **Phạm vi:** CHỈ bên trong iframe mô phỏng (`sim-frame`, sandbox=allow-scripts). Ở **thân bài Dewey ngoài mô phỏng thì MathJax render ĐẸP** (P(A|B), phân số ở pre-test/Olympia/Vở ghi đều đẹp).
- **Nguyên nhân khả năng:** HTML mô phỏng vanilla-JS sinh ra có chứa `$...$` nhưng **sim-frame không nạp/khởi tạo MathJax** (chỉ thân bài Dewey có script MathJax). Mô phỏng nên (a) tránh dùng `$...$` (ghi P(A|B) thuần) trong prompt sinh mô phỏng, HOẶC (b) nhúng MathJax + gọi typeset vào srcdoc của sim-frame.
- **Mức độ:** trung bình — mô phỏng vẫn tương tác đúng, nhưng công thức xấu/khó đọc với học sinh. Nên sửa.

### Ghi chú quota 429 (đã biết)
- Console portal: nhiều "[PersonalizationEngine] Falling back to original lesson: Personalization relay error 500" → cá nhân hoá theo tuyến lỗi, dùng bài gốc. Lúc mới vào Olympia, gói 30 từng hiện "Câu hỏi đang được chuẩn bị" (placeholder) nhưng sau khi bấm "Bắt đầu gói" thì câu hỏi vẫn có và chấm điểm được. Đây là vấn đề quota, không phải lỗi code.

---


---

## TIÊN QUYẾT — Publish bài mới — ĐẠT
- Tạo bài mới từ giáo án nguồn "Xác suất có điều kiện · Lớp 12", checkbox sinh mô phỏng BẬT. Pipeline chạy đủ 5 mảnh + mô phỏng (447s), KHÔNG có banner cảnh báo chất lượng (5/5 sim đạt chuẩn).
- Bấm **Xuất bản** → mở cổng học sinh.
- **lessonId (publish SAU fix): `adaptive-1782374276838`**
- **Link cổng: https://giaoandewey.vercel.app/adaptive-portal/adaptive-1782374276838**
- **Bài đối chứng (NHÁP): `adaptive-math-11-arithmetic-sequence`** (vẫn trạng thái Nháp).

## FIX #1 — Cổng học sinh ẩn danh — ĐẠT
Đọc REST Firestore KHÔNG kèm token (lúc 2026-06-25T08:00:20Z):
- `GET adaptiveLessons/adaptive-1782374276838` (bài Builder-published sau fix) → **200 OK**, và document có **`portalEnabled: true`** ✓ → Fix `saveLessonToFirestore` ghi portalEnabled hoạt động.
- `GET adaptiveLessons/adaptive-math-11-arithmetic-sequence` (bài NHÁP) → **403 PERMISSION_DENIED** ✓ → đối chứng đúng: chỉ bài đã bật cổng mới công khai.
- Đối chứng phương pháp: `GET personalizationCache?pageSize=1` → 200 (chứng tỏ cách đo đúng).
- UI: mở link cổng → vào được **màn chào** với gallery (Khái niệm XS có điều kiện = Venn, Công thức nhân XS), KHÔNG báo "Không tìm thấy bài học / insufficient permissions".

→ Khác vòng trước (bài Builder thiếu portalEnabled → 403). Lần này đã có field → anon đọc được.

## FIX #4 — Mô phỏng đúng theo từng mảnh — ĐẠT
Vào màn bài học (dewey-lesson). Đọc DOM iframe (same-origin srcdoc):
- **KHÔNG còn khối React "🔷 Nhìn thấy bài học trước khi làm" / "MÔ PHỎNG NỘI BỘ CÓ CẤU TRÚC"** nổi phía trên iframe (`noReactPreview: true`). Khối cũ kẹt 1 mô phỏng đã được gỡ.
- Bên trong iframe: **5 mảnh có 5 khối `.unit-simulation` RIÊNG**, tiêu đề KHÁC NHAU theo từng mảnh:
  1. Định nghĩa xác suất có điều kiện
  2. Cách xác định không gian mẫu mới
  3. Công thức nhân xác suất tổng quát
  4. Kỹ thuật vẽ và phân tích sơ đồ cây
  5. Mối quan hệ giữa xác suất có điều kiện…
- 5 sim-frame (iframe sandbox), 4/5 srcdoc khác biệt thật (2 cái trùng phần đầu — đã ghi nhận từ vòng trước, không phải lỗi mới). Mỗi sim có `<script>` + `<svg>` + `type=range` (đã xác nhận tương tác ở các vòng trước; vòng production trước đã kéo slider thấy số/đồ thị cập nhật).

## FIX #2 — Hình TikZ không vỡ — ĐẠT
- Bài có 5 `.step-illustration`, mỗi cái 1 ảnh kroki TikZ. Ép tải cả 5: **5/5 load OK** (SVG hợp lệ, kích thước 152×114 … 288×171).
- **0 phần tử `<img>` bị vỡ** trong bài (brokenImgElementsInPage = 0). Không còn "Error 400" như vòng trước (vòng trước 2/6 vỡ).
- → `buildTikzKrokiUrl` validate: ảnh hợp lệ hiện bình thường, ảnh không hợp lệ bị BỎ thay vì hiện ảnh vỡ.

## E — E2E TRỌN 5 BƯỚC + LƯU PROGRESS — ĐẠT
Đi hết luồng học sinh: Nhập thông tin (QA Anon NghiemThu / 12A9 / 12A9-QA) → **Pre-test** (5 câu, MathJax đẹp, nộp) → **Bước 3 Học theo tuyến** (vào thẳng iframe Dewey, không còn khối preview cũ) → cấu trúc đầy đủ engage + 5 mảnh + **Olympia** + Mở rộng + **Tổng kết** → bấm **"Hoàn tất bài học"** (nút thật trong iframe, fire `postMessage('dewey:complete')`).
- **Kết quả: màn "✅ Đã lưu kết quả học tập"** — "Kết quả tiết học đã được lưu vào tiến trình cá nhân và hồ sơ học tập dài hạn của em." Hiển thị: Tuyến **Củng cố** · Test đầu giờ **1/5** · Hồ sơ đã học **1 tiết**. Đây là notice THÀNH CÔNG (code chỉ hiện màn này sau khi lưu thành công; nhánh fallback hiện notice cảnh báo/đỏ — không xuất hiện).
- **Console sạch** suốt phiên học + lúc nộp/lưu (read_console_messages onlyErrors = không có lỗi).
- Cơ chế lưu (đọc code): portal `handleDeweyComplete` → `POST /api/adaptive-progress` (Firebase Admin, bỏ qua rules → chạy được cho học sinh ẩn danh); nếu lỗi mới fallback client `setDoc(adaptiveSessionProgress/...)` rồi localStorage. progressId = `{teacherId}_{lessonId}_{studentCode}` = `24YyULmWgBOM6HZCfJ56RN5tiet2_adaptive-1782374276838_12A9-QA`.

**Lưu ý về việc đọc trực tiếp bản ghi `adaptiveSessionProgress`:** rule cho phép READ chỉ với giáo viên đã đăng nhập (`request.auth.uid == teacherId`); mình KHÔNG trích được ID token của GV từ tab (app không lưu token ở `firebaseLocalStorageDb`) nên không đọc thẳng được document. Bằng chứng lưu thành công dựa trên: (1) màn "Đã lưu kết quả học tập" (success path), (2) console không lỗi, (3) số liệu thống kê tính từ progressRecord đã lưu. Đây là phần "không kiểm trực tiếp được", ghi rõ thay vì khẳng định quá.

---

## QUOTA 429 (đã biết, KHÔNG tính lỗi mới)
- Console portal có cảnh báo: "[PersonalizationEngine] Falling back to original lesson: Personalization relay error 500" → relay cá nhân hoá lỗi (liên quan quota Gemini free_tier=0) nên dùng bài gốc thay vì bản cá nhân hoá theo tuyến. Đây đúng là vấn đề quota đã ghi trong HANDOFF (Lỗi #3), cần nâng billing key production.

## HẠN CHẾ CÔNG CỤ (trung thực)
- Không mở được **cửa sổ ẩn danh thật (Ctrl+Shift+N)** qua công cụ điều khiển Chrome → đã thay bằng (a) REST Firestore không-token cho Fix#1 (kết luận chắc chắn), và (b) chạy E2E trong tab đã đăng nhập GV (logic bài học + đường lưu qua admin API giống hệt anonymous; Fix#1 đã chứng minh anon đọc được).
- Không đọc trực tiếp được bản ghi `adaptiveSessionProgress` (rule chỉ cho GV đọc; không trích được token GV) — đã nêu bằng chứng gián tiếp thay thế.

*Bằng chứng: REST Firestore (project smartplan-ai-14200, 08:00Z 25/6: published 200/portalEnabled=true, nháp 403); DOM iframe Dewey (noReactPreview, 5 unit-simulation tiêu đề riêng, 5 kroki imgs load OK + 0 broken); màn "Đã lưu kết quả học tập"; console onlyErrors = sạch. Bài test: adaptive-1782374276838.*
