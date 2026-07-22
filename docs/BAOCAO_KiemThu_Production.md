# Báo cáo kiểm thử E2E — Production (https://giaoandewey.vercel.app)

> Người kiểm thử: Claude (qua trình duyệt, đọc DOM iframe same-origin, đọc console, gọi REST Firestore). Tài khoản: Vũ Việt Cường (giáo viên).
> Bài kiểm thử chính: tạo mới từ giáo án nguồn "xác suất có điều kiện · Lớp 12" (đồng thời phục vụ Phần A và Phần B).
> Build production đã là bản mới (hard-refresh Ctrl+Shift+R; có panel "Hình ảnh & mô phỏng đã sinh" + nút "Xem trước bài học").

---

## TỔNG QUAN

| Mục | Kết quả |
|---|---|
| **A. Tạo bài + xem trước trong builder** | **ĐẠT** |
| **B. Đúng phân môn (Regex bug đã sửa)** | **ĐẠT** — bài Xác suất ra sơ đồ cây/Venn/rút bi, KHÔNG có khối chóp 3D |
| **C8. Cổng học sinh khi ĐĂNG NHẬP GV** | **ĐẠT** |
| **C9. Cổng học sinh ở phiên ẨN DANH** | **KHÔNG ĐẠT (với bài từ Builder mới)** — doc thiếu field `portalEnabled` nên anon bị 403. (Antigravity báo ĐẠT vì test bài bật cổng qua luồng cũ — xem mục C9.) |
| **D. Checkbox TẮT** | **ĐẠT** — bỏ bước sinh mô phỏng, nhanh hơn, vẫn còn gallery/tikz |
| **E. E2E trọn 5 bước ở phiên ẩn danh** | **KHÔNG CHẠY ĐƯỢC** (bị chặn bởi C9); đã xác minh luồng 5 bước ở phiên ĐĂNG NHẬP thay thế |

**3 lỗi cần sửa:** (1) 🔴 Firestore rules chưa deploy → cổng học sinh ẩn danh bị chặn; (2) 🟠 ~1/3 hình TikZ lỗi biên dịch Kroki (Error 400); (3) 🟠 khối preview "Nhìn thấy bài học trước khi làm" chỉ hiện DUY NHẤT 1 mô phỏng (mảnh 1) cho mọi mảnh — phi logic (xem Lỗi #4). Phần hình ảnh & mô phỏng cốt lõi BÊN TRONG bài học Dewey thì đúng (mỗi mảnh có mô phỏng riêng).

---

## A. TẠO BÀI + XEM TRƯỚC TRONG BUILDER — ĐẠT

**A.2 — Storyboard nêu rõ học liệu trực quan đúng phân môn: ĐẠT.** Bản rà soát (chữ) liệt kê:
- "Danh sách SVG/mô phỏng nội tuyến cần dựng:" → "Sơ đồ cây xác suất động (SVG)"; "Biểu đồ Venn tương tác thể hiện sự thu hẹp không gian mẫu (SVG)".
- "Học liệu số/tương tác cần chuẩn bị: Mô phỏng 'Rút bi từ hộp' (HTML/JS) cho phép thay đổi số lượng bi và quan sát xác suất thay đổi theo thời gian thực."
→ Tất cả đúng môn Xác suất, không có gợi ý hình học 3D.

**A.3 — Tiến độ + cảnh báo: ĐẠT.** Chuỗi tiến độ (sim BẬT): "phân tích cấu trúc → tạo hình ảnh minh họa → tạo bộ câu hỏi → tạo mảnh kiến thức i/6 → **dựng mô phỏng tương tác cho mảnh i/6**" (có cho từng mảnh). Bài hoàn thành 100% (3 mục tiêu / 6 mảnh / 10 phút).

**A.4 — Panel "Hình ảnh & mô phỏng đã sinh" trong builder TRƯỚC khi xuất bản: ĐẠT.**
- Tiêu đề panel: "Hình ảnh & mô phỏng đã sinh — xem trước khi xuất bản · 4 ảnh khởi động · 6/6 mảnh có học liệu trực quan".
- **Gallery ẢNH KHỞI ĐỘNG: 4 ảnh, hiện rõ, KHÔNG vỡ, đúng môn:** "Định nghĩa Xác suất có điều kiện" (Venn), "Công thức nhân xác suất" (rút bi 2 lần), "Sơ đồ hình cây (Tree Diagram)", "Ứng dụng Tư duy Bayes".
- **Mỗi mảnh có khối "MÔ PHỎNG HTML/CANVAS AN TOÀN" render được.** Ví dụ mảnh 3 "Sơ đồ cây Xác suất & Biến cố liên tiếp": 3 thanh trượt (P(A)=0.60, P(B|A)=0.70, P(B|Ā)=0.30) + sơ đồ cây SVG tính nhánh trực tiếp (→0.420, →0.180, →0.120). Kiểm tra mã: cả 6/6 mô phỏng có `<script>` + `<svg>` + `type=range`, KHÔNG thư viện ngoài, KHÔNG threejs/chóp 3D.
- **Hình TikZ (kroki):** 6 ảnh — **4 tải OK, 2 lỗi** (xem Lỗi #2).

**A.5 — Nút "Xem trước bài học (như học sinh thấy)": ĐẠT.** Mở modal render đúng HTML bài học Dewey (header, 2 đồng hồ Phần/Tổng, Vở Ghi Chép). Đọc DOM trong modal: **1 vc-gallery + 6 unit-simulation (6 sim-frame) + 6 step-illustration + MathJax**. → Giáo viên thấy đầy đủ hình + 6 mô phỏng + công thức TRƯỚC khi xuất bản. Có ghi chú: "mô phỏng 3D xoay hiển thị ở panel phía trên; bản xem trước này hiện gallery, mô phỏng HTML, hình TikZ và công thức như trong bài thật."

---

## B. ĐÚNG PHÂN MÔN (Regex bug đã sửa) — ĐẠT

Bài "Xác suất có điều kiện" (chứa cụm "không gian mẫu"):
- **6/6 mô phỏng: threejs=false, chóp3d=false** (đọc trực tiếp srcdoc của 6 sim-frame). Loại mô phỏng thực tế: Venn/giao thoa với slider, sơ đồ cây xác suất với slider, rút bi — **TUYỆT ĐỐI KHÔNG có mô hình khối chóp 3D**.
- Gallery + storyboard cũng toàn chủ đề xác suất.
→ Lỗi Regex bắt nhầm "không gian mẫu" → 3D đã được khắc phục trên production.

**B.7 (đối chứng hình học không gian):** Tôi KHÔNG tự test được — thư viện chỉ có 1 giáo án nguồn "xác suất có điều kiện". **Theo báo cáo Antigravity: ĐẠT** — bài Hình học không gian (Vectơ) dùng đúng `Geometry3DSimulation` (khối 3D Three.js xoay được). Như vậy chiều "đúng-3D-khi-cần" đã được kiểm bởi Antigravity; tôi đã kiểm chiều "không-được-3D-với-Xác-suất" (6/6 sim không 3D). Hai chiều cùng xác nhận Regex fix hoạt động đúng.

---

## C. CỔNG HỌC SINH

**C.8 — Khi ĐANG đăng nhập GV: ĐẠT.** Xuất bản bài → tab cổng `/adaptive-portal/adaptive-1782277253128` mở ra, vào được màn chào (gallery 4 ảnh), nhập tên/lớp/mã → làm pre-test (MathJax đẹp) → vào Bước 3. Đọc DOM iframe bài học: 1 vc-gallery + 6 unit-simulation + olympia (3 gói 10/20/30) + summary. Không lỗi permission/CORS/JS.

**C.9 — Ở phiên ẨN DANH (không đăng nhập): KHÔNG ĐẠT với bài xuất bản từ Builder mới.** 🔴
- Phép đo (đọc REST Firestore KHÔNG kèm token — đúng như trình duyệt học sinh ẩn danh; app KHÔNG dùng signInAnonymously nên đây là phép đo đại diện chính xác):
  - `GET adaptiveLessons/adaptive-1782277253128` (bài tôi vừa xuất bản qua **trang Builder mới**) → **403 PERMISSION_DENIED** (đo lại 2 lần, lần cuối 2026-06-25T01:51Z vẫn 403).
  - **Đối chứng:** `GET personalizationCache?pageSize=1` (rule cho anon) → **200 OK** (chứng minh phương pháp đúng).
- **NGUYÊN NHÂN GỐC (đã đính chính sau khi đọc code — KHÁC với phỏng đoán "rules chưa deploy" ban đầu):**
  - Rule `allow read: if request.auth != null || resource.data.get('portalEnabled', false) == true;` nhiều khả năng ĐÃ deploy đúng. Vấn đề là **document KHÔNG có field `portalEnabled`** nên nhánh thứ 2 = false → đúng luật phải chặn anon.
  - `portalEnabled: true` CHỈ được set ở luồng cũ `AdaptiveLearningTab.tsx:651` ("Lưu & bật cổng"). Còn **trang Builder mới** (`AdaptiveLessonBuilderPage.tsx`) khi bấm "Xuất bản" (dòng 790 → `save('published')` → dòng 472 `saveLessonToFirestore(nextLesson)`) lưu nguyên object `AdaptiveLesson` mà **KHÔNG chèn `portalEnabled: true`**. `portalEnabled` cũng KHÔNG nằm trong interface `AdaptiveLesson` (types.ts:162).
  - ⇒ Mọi bài xuất bản qua Builder mới đều thiếu `portalEnabled` ⇒ anon bị 403, dù rules đã đúng.
- **Đối chiếu với báo cáo Antigravity (C.9 = ĐẠT):** Không mâu thuẫn — Antigravity nhiều khả năng test bài bật cổng qua **luồng cũ** (`AdaptiveLearningTab` "Lưu & bật cổng", có set `portalEnabled: true`) nên anon vào được; còn tôi test bài xuất bản qua **Builder mới** (thiếu field) nên bị chặn. Cả hai quan sát đều đúng — lỗi phụ thuộc LUỒNG xuất bản.
- **Cách khắc phục (xem Lỗi #1):** trong Builder publish, set `portalEnabled: true` (và `teacherId`) lên document trước khi `saveLessonToFirestore`. (Phụ: xác nhận rules đã deploy.) Sau đó: anon REST đọc bài Builder-published phải 200; bài chưa bật cổng vẫn 403.

---

## D. CHECKBOX TẮT — ĐẠT

Tạo bài thứ 2, BỎ TÍCH "Sinh mô phỏng tương tác" (xác nhận `checkbox.checked=false`):
- Chuỗi tiến độ đi qua **cả 5/5 mảnh KHÔNG có bước "dựng mô phỏng"** (`hasSim:false`).
- **Nhanh hơn rõ rệt:** hoàn thành ~232s (so với bản sim-BẬT lâu hơn nhiều, có thêm 6 lượt gọi AI dựng mô phỏng).
- Builder sau khi xong: panel "4 ảnh khởi động · **5/5 mảnh có học liệu trực quan**", gallery 4 SVG hiện đủ, nhưng **0 khối mô phỏng HTML** (builderSimFrames=0). → Đúng kỳ vọng: vẫn có gallery + tikz, không có mô phỏng AI tự sinh.

---

## E. E2E TRỌN 5 BƯỚC Ở PHIÊN ẨN DANH — KHÔNG CHẠY ĐƯỢC (bị chặn bởi C9)

Vì C9 chặn anonymous, không thể chạy phiên học sinh ẩn danh thật → **không xác minh được việc ghi `adaptiveSessionProgress` ở phiên ẩn danh**.

**Thay thế (phiên ĐANG đăng nhập GV):** đã đi: nhập thông tin → pre-test (5 câu, MathJax) → Bước 3 Học theo tuyến → xác nhận cấu trúc bài đầy đủ qua DOM iframe: engage + **6 mảnh kiến thức** (mỗi mảnh có mô phỏng/hình) + **Olympia 3 gói (10/20/30 điểm) + bảng điểm** + Mở rộng + **Tổng kết (5 ô sơ đồ tư duy, 3 ô tự đánh giá, nút Hoàn tất)**. Không lỗi console khi học.
*Lưu ý:* gói "30 điểm" có 1 câu "Câu hỏi đang được chuẩn bị" (placeholder) — nhiều khả năng do quota 429 (xem Lỗi #3) khiến 1 vài câu khó không sinh kịp.

→ Cần chạy lại E2E trọn vẹn ở phiên ẩn danh SAU KHI deploy rules (C9), gồm làm hết 3 gói Olympia + kiểm ghi progress.

---

## CÁC LỖI CẦN SỬA (gửi Claude Code)

### 🔴 Lỗi #1 — Bài xuất bản từ Builder mới KHÔNG set `portalEnabled` ⇒ cổng học sinh ẩn danh bị chặn (403)
- **Bằng chứng:** anon REST đọc bài Builder-published = **403** (đo 2 lần); đối chứng `personalizationCache` = **200**. App KHÔNG dùng `signInAnonymously` (đã grep) nên phép đo token-less là đại diện đúng cho học sinh ẩn danh.
- **Nguyên nhân gốc (đính chính):** KHÔNG phải "rules chưa deploy". Rule `allow read: if request.auth != null || resource.data.get('portalEnabled', false) == true;` nhiều khả năng đã đúng/đã deploy. Vấn đề: **document bài thiếu field `portalEnabled`**:
  - `portalEnabled: true` chỉ set ở luồng cũ `src/components/tabs/AdaptiveLearningTab.tsx:651`.
  - Trang Builder mới `src/pages/AdaptiveLessonBuilderPage.tsx`: "Xuất bản" (dòng 790) → `save('published')` → dòng 472 `saveLessonToFirestore(nextLesson)` lưu nguyên `AdaptiveLesson` mà **không chèn `portalEnabled: true`**. Field này cũng không có trong interface `AdaptiveLesson` (`src/lib/adaptive/types.ts:162`).
- **Fix:** Khi publish ở Builder, set `portalEnabled: true` (và đảm bảo `teacherId` đúng để khớp rule create/update) lên document trước khi `saveLessonToFirestore`. Cân nhắc thêm `portalEnabled` vào type. Đồng thời xác nhận rules đã `firebase deploy --only firestore:rules` (project smartplan-ai-14200).
- **Test lại sau fix:** anon REST đọc bài Builder-published = 200; bài chưa publish (không portalEnabled) = 403 (đối chứng).
- **Đối chiếu Antigravity:** Antigravity báo C9 = ĐẠT — không mâu thuẫn, do test bài bật cổng qua luồng cũ (có `portalEnabled`). Bug chỉ xảy ra với luồng Builder mới.

### 🟠 Lỗi #2 — ~1/3 hình TikZ lỗi biên dịch (Kroki Error 400)
- Bằng chứng: trong 1 bài, 6 ảnh tikz → 4 OK, 2 lỗi. Thông báo: "Error 400: ! LaTeX Error: There's no line here to end. ... l.6 \\b" và "Error 400: ! Undefined control sequence. l.6 \\draw".
- Nguyên nhân khả năng: TikZ do AI sinh đôi khi sai cú pháp (escape `\\` trong JSON, lệnh `\draw` ngoài môi trường, dòng trống). Kroki trả 400 → ảnh vỡ.
- **Fix gợi ý:** (a) validate/sanitize TikZ trước khi build URL Kroki (kiểm có `\begin{tikzpicture}...\end{tikzpicture}`, escape đúng); (b) fallback khi Kroki 400 → ẩn ảnh lỗi hoặc thử lại 1 lần; (c) siết prompt TikZ. Mức độ trung bình (mô phỏng HTML vẫn che được phần lớn nhu cầu trực quan).

### 🟠 Lỗi #4 — Khối preview "Nhìn thấy bài học trước khi làm" chỉ hiện DUY NHẤT 1 mô phỏng cho mọi mảnh
- **Triệu chứng (người dùng phát hiện, đã kiểm chứng):** Ở màn `dewey-lesson`, khối React "🔷 Nhìn thấy bài học trước khi làm → MÔ PHỎNG NỘI BỘ CÓ CẤU TRÚC" luôn hiển thị cùng MỘT mô phỏng — "Khái niệm xác suất có điều kiện và sự thu hẹp không gian mẫu" (mô phỏng của MẢNH 1) — bất kể học sinh đang ở hoạt động/mảnh nào. Phi logic: mỗi hoạt động cần mô phỏng riêng của nó.
- **Phân biệt quan trọng:** Đây CHỈ là lỗi của khối preview React phía trên iframe. **Bên trong bài học Dewey (iframe) thì ĐÚNG** — đã kiểm: 6 mảnh có 6 khối `.unit-simulation` với tiêu đề khác nhau theo từng mảnh (Khái niệm / Công thức tính / Công thức nhân / Sơ đồ cây / Tính chất / Ứng dụng), 4/6 srcdoc thực sự khác nhau. Vậy mô phỏng theo-từng-mảnh đã được sinh và nhúng đúng trong bài; chỉ khối preview ngoài là sai.
- **Nguyên nhân (đã định vị code):** `src/pages/AdaptiveStudentPortalPage.tsx`:
  - Dòng ~1103: `<LessonSimulationViewer ... unitId={currentUnit.id} inlineSpec={currentUnit.simulationSpec} />` — khối preview chỉ dùng `currentUnit`.
  - Dòng 341 + 434: `currentUnitIndex` khởi tạo = 0; `currentUnit = lesson.knowledgeUnits[currentUnitIndex]`.
  - `currentUnitIndex` chỉ đổi qua `setCurrentUnitIndex` ở luồng React riêng (dòng 651), **KHÔNG được điều khiển bởi việc học sinh chuyển mảnh BÊN TRONG iframe Dewey** (iframe tự điều hướng nội bộ, không postMessage ngược ra React). → Cả bài, `currentUnitIndex` đứng yên ở 0 → preview kẹt ở mô phỏng mảnh 1.
- **Đề xuất sửa (chọn 1):**
  - (a) **Bỏ hẳn khối preview React** này khi đã ở màn `dewey-lesson`, vì mô phỏng từng mảnh đã nằm trong iframe rồi → tránh trùng lặp và nhầm lẫn. (Đơn giản nhất, đúng kiến trúc "tất cả trong iframe".)
  - (b) Nếu muốn giữ preview: cho iframe Dewey `postMessage` ra cha mỗi khi đổi màn mảnh (đã có hàm điều hướng nội bộ), cha cập nhật `currentUnitIndex` tương ứng để `LessonSimulationViewer` đổi theo.
  - Khuyến nghị (a).
- *Phụ:* `distinctSrcdocHeads = 4/6` — có 2 cặp mô phỏng trùng phần đầu srcdoc. Nên kiểm prompt sinh mô phỏng có đang lặp khung mẫu giữa vài mảnh không (mức nhẹ, không chặn).

### 🟡 Lỗi #3 — Quota Gemini 429 (vận hành)
- Console: 15 lỗi `429 RESOURCE_EXHAUSTED — free_tier ... limit: 0, model: gemini-3.1-pro`. App có retry/fallback tốt (bài vẫn hoàn thành 100%), nhưng quota free-tier cho `gemini-3.1-pro` đang = 0 → sinh bài rất chậm và đôi khi 1 vài câu/hình không sinh kịp ("Câu hỏi đang được chuẩn bị", một phần TikZ lỗi). **Khuyến nghị:** nâng quota/billing cho key production, hoặc hạ model/đặt hàng đợi; hiển thị cảnh báo rate-limit rõ cho GV.

---

## ĐÃ KIỂM ĐƯỢC / KHÔNG KIỂM ĐƯỢC (trung thực)
- ✅ Tôi đã kiểm: A (đầy đủ), B chiều "không-3D-với-Xác-suất" (6/6 sim không 3D), C8, D (đầy đủ), cấu trúc 5 bước, và định vị gốc 4 lỗi trong code.
- ✅ Antigravity bổ sung (tham khảo): B.7 đối chứng hình học không gian = ĐẠT (Three.js 3D đúng); C9+E2E trọn 5 bước ở cửa sổ ẩn danh = ĐẠT **với bài bật cổng qua luồng cũ** (`AdaptiveLearningTab`).
- ❌ Vẫn cần kiểm sau khi sửa Lỗi #1: E2E ẩn danh + ghi `adaptiveSessionProgress` cho bài **xuất bản từ Builder mới** (luồng đang lỗi).

## ĐỐI CHIẾU VỚI BÁO CÁO ANTIGRAVITY
- **Trùng khớp:** A (xuất sắc), B (Regex fix OK), C8, D (Antigravity test ở Local), và tổng quan "hình + mô phỏng đầy đủ".
- **Khác biệt đã làm rõ — C9:** Antigravity = ĐẠT, tôi = KHÔNG ĐẠT. Không mâu thuẫn: phụ thuộc LUỒNG xuất bản. Bài bật cổng qua luồng cũ có `portalEnabled` → anon vào được; bài xuất bản qua Builder mới thiếu `portalEnabled` → anon 403. ⇒ **Lỗi #1 thật, cần vá Builder publish.**
- **Antigravity chưa nêu (tôi bổ sung):** Lỗi #2 (TikZ 400 ~1/3), Lỗi #4 (preview "Nhìn thấy bài học" kẹt 1 mô phỏng cho mọi mảnh), Lỗi #3 (quota 429), và nguyên nhân gốc của Lỗi #1 (thiếu `portalEnabled` ở Builder).

*Bằng chứng: DOM iframe Dewey (same-origin, srcdoc) trên cổng đã xuất bản; anon/auth REST Firestore (project smartplan-ai-14200, đo lại 01:51Z 25/6 vẫn 403); đọc code (AdaptiveLessonBuilderPage, adaptiveLessonService, AdaptiveLearningTab, types.ts); console (429 quota); ảnh chụp builder panel + preview modal + Olympia. Bài test: adaptive-1782277253128 (sim ON) và 1 bài sim OFF.*
