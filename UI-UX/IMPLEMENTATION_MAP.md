# UI/UX Implementation Map — Giao An Dewey

Ngày cập nhật: **06/06/2026**

## Tổng quan bộ thiết kế

| Hạng mục | Số lượng |
|----------|----------|
| File zip Stitch trong `UI-UX/` | **19** |
| Đã giải nén vào `UI-UX/_extracted/` | **19** (đủ) |
| Tab/chức năng trong app React | **10 tab** + Settings modal + 3 route adaptive |
| Màn đã migrate UI (Phase 1+2) | **14 màn** — Step 1–10 |
| Màn còn lại (Phase 2) | **5 màn** + polish vài màn phụ |

## Nguyên tắc migrate

- Dùng `UI-UX/_extracted/*/code.html` + `DESIGN.md` làm visual reference; **không** copy đè nguyên khối HTML vào React.
- Giữ nguyên business logic: auth, Firestore, AI providers, export Word/PDF/LaTeX, lịch sử, thư viện, chấm điểm, kỳ thi online.
- Migrate theo lớp: design tokens → app shell → màn ưu tiên → màn còn lại → regression.
- Tách rõ **Preview nội dung tĩnh** (thư viện) và **Cài đặt xuất A4** (sau khi soạn xong).

---

## Bảng mapping đầy đủ — 19 zip Stitch → React

| # | File zip | Stitch screen | React target | Extracted | UI migrate |
|---|----------|---------------|--------------|-----------|------------|
| 1 | `stitch_giao_an_dewey_homepage.zip` | Trang chủ / Landing | `App.tsx` (pre-login) hoặc route `/` | ✅ | ⏳ Phase 2 |
| 2 | `stitch_Bảng điều khiển tổng quan.zip` | Dashboard giáo viên | `DashboardTab.tsx` | ✅ | ✅ Step 2 |
| 3 | `stitch_Trình soạn thảo AI Co-pilot (Priority 1).zip` | Editor + assistant sidebar | `CreatorTab.tsx`, `features/creator/*` | ✅ | ✅ Step 3 |
| 4 | `stitch_Soạn thảo giáo án AI.zip` | Entry flow tạo giáo án | `CreatorTab.tsx`, `LessonControls.tsx` | ✅ | ✅ merge Step 3 |
| 5 | `stitch_Tạo đề kiểm tra (Ma trận Smart Grid).zip` | Ma trận đề kiểm tra | `TestingTab.tsx` | ✅ | ✅ Step 5 |
| 6 | `stitch_Báo cáo năng lực & Phân tích AI.zip` | Analytics học sinh/lớp | `AdaptiveLearningTab.tsx` | ✅ | ✅ Step 9 |
| 7 | `stitch_Cổng học sinh thích ứng (...).zip` | Zero-noise học sinh | `AdaptiveStudentPortalPage.tsx` | ✅ | ✅ Step 8 |
| 8 | `stitch_Cài đặt xuất file và template (chuẩn A4).zip` | Export A4 split-view | `export/ExportTemplateSettings.tsx` | ✅ | ✅ Step 7 |
| 9 | `stitch_Quản lý Giáo án Cá nhân.zip` | Workspace cá nhân | `LibraryTab.tsx` (personal) | ✅ | ✅ Step 6 |
| 10 | `stitch_Khám phá cộng đồng.zip` | Community discover | `LibraryTab.tsx` (community) | ✅ | ✅ Step 6 |
| 11 | `stitch_xem chi tiết & xem trước (...).zip` | Preview giáo án tĩnh | `LibraryTab.tsx` + `ViewPlanModal` | ✅ | ✅ Step 6 |
| 12 | `stitch_Quản lý lớp học & Danh sách học sinh.zip` | CRUD lớp/học sinh | **Màn mới** (tab hoặc page) | ✅ | ⏳ Phase 2 |
| 13 | `stitch_Hồ sơ và cài đặt.zip` | Profile + API keys | `SettingsModal.tsx`, `ApiUsagePanel.tsx` | ✅ | ⏳ Phase 2 |
| 14 | `stitch_Chấm điểm AI & Tự luận.zip` | Chấm bài AI | `GradingTab.tsx` | ✅ | ✅ Step 10 |
| 15 | `stitch_quản lý kỳ thi Online (Redesign).zip` | Danh sách kỳ thi | `ExamsTab.tsx` | ✅ | ⏳ Step 11 |
| 16 | `stitch_Biên soạn câu hỏi thủ công.zip` | Editor câu hỏi thi | Sub-view trong Exams flow | ✅ | ⏳ Step 12 |
| 17 | `stitch_Thiết lập & Cấu hình.zip` | Cấu hình kỳ thi | Sub-view config Exams | ✅ | ⏳ Step 13 |
| 18 | `stitch_Trung tâm công cụ.zip` | Hub công cụ AI | `AIToolsTab.tsx` | ✅ | ✅ Step 14 polish done |
| 19 | `stitch_Giao diện AI tutor.zip` | Chat tutor | `ChatTab.tsx` | ✅ | ⏳ Step 15 |

### Màn app không có zip Stitch riêng

| Chức năng | React target | Ghi chú |
|-----------|--------------|---------|
| Mẫu giáo án | `TemplatesTab.tsx` | Polish theo design tokens; không có zip |
| Lesson Builder phân hoá | `AdaptiveLessonBuilderPage.tsx` | Đã polish Step 4; không có zip riêng |
| Quản lý bài học (list) | `AdaptiveLessonListPage.tsx` | Dùng shell adaptive hiện có |

---

## Phase 1–2 — Đã hoàn tất (Step 1–10)

Build production PASS sau mỗi step. Thay đổi **local, chưa push GitHub**.

| Step | Phạm vi | File chính | Ngày |
|------|---------|------------|------|
| 1 | Design tokens + app shell | `index.css`, `Sidebar.tsx` | 05/06 |
| 2 | Dashboard tổng quan | `DashboardTab.tsx` | 05/06 |
| 3 | Creator / AI Co-pilot | `CreatorToolbar.tsx`, `LessonContentBoard.tsx` | 05/06 |
| 4 | Adaptive Lesson Builder | `AdaptiveLessonBuilderPage.tsx` | 05/06 |
| 5 | Smart Matrix Grid | `TestingTab.tsx` | 05/06 |
| 6 | Library workspace + preview | `LibraryTab.tsx` | 05/06 |
| 7 | Export Template A4 | `ExportTemplateSettings.tsx` | 05/06 |
| 8 | Cổng học sinh | `AdaptiveStudentPortalPage.tsx` | 05/06 |
| 9 | Analytics dashboard | `AdaptiveLearningTab.tsx` | 05/06 |
| 10 | Chấm điểm AI & Tự luận | `GradingTab.tsx`, `features/grading/*` | 06/06 |

**Deliverable Phase 1–2:** Nhóm soạn giáo án, thư viện, đề kiểm tra ma trận, export A4, adaptive portal + analytics, chấm điểm AI.

---

## Phase 2 — Kế hoạch tiếp theo (Step 10–18)

Thứ tự ưu tiên theo **giá trị người dùng** + **gom luồng liên quan**:

| Step | Màn hình | Zip reference | React target | Effort | Ghi chú |
|------|----------|---------------|--------------|--------|---------|
| **10** | **Chấm điểm AI & Tự luận** | #14 | `GradingTab.tsx` | L | ✅ Hoàn tất — build PASS |
| 11 | Quản lý kỳ thi Online | #15 | `ExamsTab.tsx` | L | **Tiếp theo** — gom luồng thi online |
| 12 | Biên soạn câu hỏi thủ công | #16 | Exams manual editor | M | Sub-flow của Exams |
| 13 | Thiết lập & Cấu hình kỳ thi | #17 | Exams config | M | Sub-flow của Exams |
| 14 | Trung tâm công cụ | #18 | `AIToolsTab.tsx` | S–M | Đã đối chiếu zip và polish theo Knowledge Blue Editorial |
| 15 | Giao diện AI Tutor | #19 | `ChatTab.tsx` | M | Thay chatbot layout cũ |
| 16 | Hồ sơ & Cài đặt | #13 | `SettingsModal.tsx` | M | API keys, token tracker |
| 17 | Quản lý Lớp học | #12 | Page/tab mới | L | CRUD lớp/học sinh; nối Grading + Adaptive |
| 18 | Trang chủ Landing | #1 | Pre-login shell | M | Chưa ưu tiên cao; app vào dashboard sau login |
| 19 | Polish Mẫu giáo án | — | `TemplatesTab.tsx` | S | Chỉ tokens/card; không có zip |
| 20 | Regression tổng hợp | — | Toàn app | M | E2E 19 màn + `npm run build` |

### Gom luồng Exams (Step 11–13)

Ba zip #15–17 nên làm **liên tiếp trong 1–2 phiên** vì cùng domain `ExamsTab`:

```
Danh sách kỳ thi → Tạo/sửa kỳ thi → Biên soạn câu hỏi → Thiết lập & cấu hình → Publish
```

Screenshot hiện tại để đối chiếu: `UI-UX/current_screenshots/06_exams.png`, `16_exam_manual_editor.png`, `17_exam_config_page.png`.

---

## Step 10 đã hoàn tất — Chấm điểm AI

### Mục tiêu
Nâng cấp visual `GradingTab.tsx` theo `UI-UX/_extracted/stitch_Chấm điểm AI & Tự luận/` — **giữ nguyên** logic chấm AI, upload ảnh/PDF, batch grading, history.

### Checklist triển khai

- [x] Đọc `code.html` + `DESIGN.md` trong folder extracted #14
- [x] Đối chiếu `current_screenshots/05_grading.png` (UI cũ) vs `screen.png` (Stitch)
- [x] Refactor layout: hero/header, upload zone, kết quả chấm, bảng lịch sử — theo tokens `#3182ce`, card `rounded-2xl`, spacing 8px
- [x] Không đụng `gradingUtils.ts`, AI provider calls, Firestore save
- [x] `npm run build` PASS (`npm --prefix C:\Users\ADMIN\Downloads\smart-lesson-plan-ai run build`, 49.28s; còn warning chunk lớn Vite không chặn)
- [x] Cập nhật mục Step 10 thành ✅ trong file này

### Sau Step 10
Chuyển sang **Step 11–13 (Exams cluster)** — 3 màn liên quan, hoàn thiện luồng thi online.

---

## Phân biệt hai luồng dễ nhầm (giữ nguyên)

### Xem chi tiết & Preview giáo án
- Ngữ cảnh: thư viện cá nhân/cộng đồng.
- Hành động: đọc, lưu, chia sẻ, tải PDF nhanh.
- **Không** chỉnh header/template/căn lề xuất file.

### Cài đặt Xuất file & Template chuẩn A4
- Ngữ cảnh: sau khi soạn xong giáo án.
- Hành động: template, header, preview A4, export Word/PDF.
- **Không** thay thế preview thư viện.

---

## Trạng thái repo local

```txt
Branch: main (local)
Push GitHub: chưa — toàn bộ Phase 1 + UI-UX/ untracked
Build: PASS (~2m37s), warning chunk lớn Vite (không chặn)
```

**File source đã sửa (Phase 1):**
`index.css`, `Sidebar.tsx`, `DashboardTab.tsx`, `LibraryTab.tsx`, `TestingTab.tsx`, `AdaptiveLearningTab.tsx`, `CreatorToolbar.tsx`, `LessonContentBoard.tsx`, `AdaptiveLessonBuilderPage.tsx`, `AdaptiveStudentPortalPage.tsx`, `export/ExportTemplateSettings.tsx`

**Đã sửa UI Step 10:**
`GradingTab.tsx`, `components/features/grading/GradingSessionList.tsx`, `GradingNewSession.tsx`, `GradingResultsList.tsx`

**Chưa sửa UI (Phase 2):**
`ExamsTab.tsx`, `ChatTab.tsx`, `SettingsModal.tsx`, `TemplatesTab.tsx`

---

## Tham chiếu nhanh

| Tài liệu | Vai trò |
|----------|---------|
| `UI-UX/MASTER_HANDOVER.md` | Tầm nhìn + 13 màn lõi (cần bổ sung 6 màn mới) |
| `UI-UX/ui_ux_audit_report.md` | Đối chiếu Vercel vs Stitch (13 màn; chưa có 6 màn mới) |
| `UI-UX/_extracted/*/code.html` | Visual reference từng màn |
| `HANDOFF.md` | Bối cảnh backend/adaptive/export (repo root) |
