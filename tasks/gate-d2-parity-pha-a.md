# GATE D2 — CHỨC NĂNG 2: STUDENT SURFACE MOBILE / DESKTOP PARITY (ASS-MDP-01)
## Pha A — Inventory + Capability Matrix + Kế hoạch kiểm thử — 30/10/2026

> Spec nguồn: `tasks/spec-parity.md`. Nguyên tắc khóa: **Laptop giữ nguyên hiện trạng (PRESERVE)**; mobile là đổi bố cục/phương thức, không phải phiên bản giảm chức năng; parity = cùng mục tiêu học + bằng chứng + quyền GV, không phải pixel-perfect. Áp `tasks/spec-math-diagram.md` cho phần hình.

---

## 1. BƯỚC 0 — DESKTOP BEHAVIOR INVENTORY (hành vi laptop phải giữ nguyên 100%)

Audit từ code `StudentLiveView.tsx` + 7 component con (29 nút, 3 textarea, 2 select, 2 input, 5 details):

| # | Hành vi desktop | Component | Điểm kiểm hồi quy |
|---|---|---|---|
| I1 | Login lớp: chọn tên + PIN + Vào lớp | StudentLiveView (login branch) | render test có sẵn |
| I2 | Nhận ngôn ngữ: modal 5 ngôn ngữ + chip đổi | slot language | test language |
| I3 | Trạng thái tiết (Sẵn sàng/Đang học/Tạm dừng/Đã kết thúc) + live status | header | render test |
| I4 | Nhóm: StudentGroupPicker chọn 1–12, Xác nhận/Đổi nhóm | StudentGroupPicker | test có |
| I5 | Thẻ nhóm xong sớm (DEEP) — R1 | slot assignment | Gate D mini test |
| I6 | Nhiệm vụ tuyến M/S/C + gợi ý tuần tự (reveal hint) | slot route-task | test có |
| I7 | Phản hồi nhanh: choice/route/boolean/text + nút Gửi + think window khoá 10s | ResponseControl | submission test |
| I8 | Practice set nhiều bước, gửi từng bài "Gửi bài này" | StudentPracticeSet | test có |
| I9 | Writing support: Từ khóa → Khung câu → Tự diễn đạt (chèn vào đáp án) | StudentWritingSupport | test có |
| I10 | Phản tư mục tiêu (StudentGoalReflection) + chèn vào đáp án | slot reflection | test có |
| I11 | Nháp: lưu máy, đếm ký tự, lịch sử nháp, trạng thái chưa gửi | useStudentDraft | test có |
| I12 | Offline queue: báo Lỗi/Cảnh báo, flush khi online | queue drain | test có |
| I13 | Đề bài + nội dung chung (TV reference) mở khi ai-error | details | render test |
| I14 | Thuật ngữ (glossary popup) | slot glossary | test có |
| I15 | Casio guide (bài 12-11-80) | CasioKeyGuide | test có |
| I16 | Giơ tay + Hỏi ẩn danh + banner câu công bố (COMM-AQ-01) | AskBar/Published | test mới |
| I17 | Understanding Pulse | UnderstandingPulse | test mới |
| I18 | Bài nộp cũ (previousDrafts) + after-submit note | slot response | submission test |
| I19 | Language change note + safety message | slot notices | render test |

## 2. CAPABILITY MATRIX (thiết bị × tính năng P0)

| Năng lực | Laptop | Phone (M1 nhìn TV) | Phone (M2 làm bài) | Ghi chú kế hoạch |
|---|---|---|---|---|
| Login QR/PIN/URL | ✓ | ✓ | ✓ | đã chạy được; test viewport |
| Nhận nhiệm vụ + gợi ý | ✓ | ✓ (đọc) | ✓ (làm + gửi) | |
| Gửi choice/route/boolean | ✓ | ✓ | ✓ | nút 100% width ≤600px (có) |
| Gửi text/practice | ✓ | ✓ | ✓ | textarea auto, tránh zoom iOS (font ≥16px) |
| Giơ tay / Hỏi ẩn danh | ✓ | ✓ | ✓ | modal đã có safe height |
| Pulse | ✓ | ✓ | ✓ | |
| Hình Toán (KaTeX/đồ thị) | ✓ | zoom/pan cần thêm | zoom/pan | áp Math Diagram: mobile xem hình có zoom, không biến thành MCQ |
| Ảnh bài giấy | (desktop) | chưa | chưa | P0 theo spec mục 6.1 — làm đường upload ảnh |
| Nhóm dùng chung máy | ✓ | n/a | ✓ | giữ nguyên |
| Chuyển thiết bị | — | ✓ | ✓ | cùng learner + cùng response doc (server-authoritative) |
| Offline draft | ✓ | ✓ | ✓ | queue có sẵn |

## 3. AUDIT RESPONSIVE HIỆN TRẠNG (đã quét code + CSS)

**Đã có sẵn (tốt):** `viewport meta`; `@media (max-width: 600px)` co padding/bo góc, nút gửi 100% width; `100dvh`; grid 2 cột roadmap; Tailwind `sm:` ở login/language.
**Thiếu (việc Pha B):**
1. `student-ask-bar`, `student-pulse`, `student-published-question` (COMM-AQ-01) chưa có trong media 600px.
2. Không có `env(safe-area-inset-*)` cho thanh nút dưới mobile.
3. Input font < 16px → iOS auto-zoom khi focus (cần kiểm + sửa `student-answer-input`/practice input).
4. Hình Toán (KaTeX/graph) chưa có zoom/pan trên mobile — cần theo Math Diagram Standard (zoom/pan + fallback ảnh).
5. Chưa có đường **ảnh bài giấy** (upload ảnh) trên mobile — P0 theo spec 6.1.
6. Touch targets: các nút hint/glossary `text-xs` cần min-height 44px trên mobile.
7. Xoay ngang + bàn phím ảo: cần kiểm thực tế (không tự chế — chỉ đảm bảo không che nút gửi).

## 4. KẾ HOẠCH KIỂM THỬ (30 test MDP + regression)

| Nhóm | Số test | Nội dung |
|---|---|---|
| A. Desktop regression (bảo toàn laptop) | 8 | I1–I19 rút gọn: login, language, group, route, response, practice, draft, ask-bar trên viewport 1280 — tất cả PASS như hiện trạng |
| B. Phone M2 viewport (390/360/320) | 8 | mọi slot hiển thị 1 cột, không tràn ngang, nút ≥44px, modal hỏi không che nút gửi, gửi text + practice + ask + pulse hoạt động |
| C. Phone M1 (nhìn TV + trả lời nhanh) | 4 | choice/route gửi được, banner câu công bố đọc được |
| D. Device handoff | 4 | cùng learner đổi thiết bị: cùng response doc, nháp server-synced, SUBMITTED hiển thị đúng |
| E. Network/offline | 3 | offline queue thông báo đúng, flush khi online, không báo Đã gửi trước ACK |
| F. Math on mobile | 3 | KaTeX render đúng, hình có zoom/pan, ảnh bài giấy nộp được |

**Cách chạy thật (không báo PASS khi chưa chạy):** A/B/C/F chạy bằng Puppeteer trên Edge debug (viewport set theo từng mức) với phiên live thật; D chạy 2 browser context; E block network qua CDP. Mobile device thật: **NOT_RUN nếu không có máy** — báo rõ.

## 5. PHÂN VIỆC PHA B (khi duyệt)
1. CSS mobile cho ask-bar/pulse/published + safe-area + font 16px input (B1).
2. Zoom/pan hình Toán theo Math Diagram Standard (B2) — component bọc KaTeX/ảnh có pinch-zoom.
3. Đường ảnh bài giấy (upload ảnh nộp bài) — theo hạ tầng Storage sẵn có (B3).
4. 30 test MDP theo bảng trên + chạy thật + desktop regression (B4).
5. Deliverables: inventory (mục 1) + matrix (mục 2) + audit (mục 3) + test plan (mục 4) + diff nhỏ có test + báo cáo PASS/NOT_RUN.
