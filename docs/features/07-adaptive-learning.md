# Tài liệu Chức năng: Adaptive Learning (Học tập thích ứng)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Cá nhân hóa bài học thời gian thực cho học sinh, tự động điều chỉnh tuyến học theo năng lực (Phân hóa) và điều chỉnh nhịp độ bài giảng theo tiến trình thời gian thực (Pacing).
- **Luồng hoạt động chính:**
  1.  **Chuẩn bị bài học thích ứng (Giáo viên):**
      - Bài học phân hóa bao gồm các mục tiêu kiến thức cụ thể (Objectives), bài kiểm tra chẩn đoán đầu giờ (Diagnostic Test), các đơn vị kiến thức nhỏ (Knowledge Units) tương ứng với 3 tuyến học phân hóa, và bài tự đánh giá cuối giờ (Exit Ticket).
      - Giáo viên có thể bật chế độ chỉnh sửa nội dung trực tiếp trên giao diện để thay đổi tên mục tiêu, ngưỡng thành thạo (mastery threshold) hoặc lời giảng mẫu của từng tuyến.
      - **Sinh mô phỏng tương tác (Interactive Simulation):** Giáo viên có thể nhấp chọn một đơn vị kiến thức và yêu cầu AI tự động sinh một ứng dụng mô phỏng nhỏ (dạng Kroki/SVG/HTML) giúp học sinh tương tác học trực quan.
      - Nhấn **Lưu & bật cổng học sinh** để đồng bộ cấu hình bài học lên Firestore.
  2.  **Cổng học sinh (Student Portal):**
      - Hệ thống cung cấp một mã QR và liên kết cổng học sinh riêng theo **ID bài học** (KHÔNG phải teacherId):
        `https://giaoandewey.vercel.app/adaptive-portal/{lessonId}`
        > ⚠️ **Đã kiểm thử thực tế (28/06/2026):** URL đúng là `/adaptive-portal/{lessonId}`. Tài liệu cũ ghi `/adaptive/student/{teacherId}` là **SAI** — không tồn tại route này trên production.
      - Học sinh quét mã QR bằng điện thoại/máy tính bảng để làm bài kiểm tra chẩn đoán đầu giờ.
  3.  **Thuật toán Phân tuyến thích ứng (Learning Routes Allocation):**
      - Dựa trên kết quả bài chẩn đoán, công cụ chấm điểm thích ứng `gradeAssessment` sẽ xếp học sinh vào 1 trong 3 tuyến học tự động:
        - **Củng cố (foundation):** Phù hợp với học sinh có từ 2 mục tiêu yếu trở lên. Tập trung học ví dụ minh họa cơ bản và câu hỏi gợi mở.
        - **Chuẩn (standard):** Phù hợp với đa số học sinh đúng chuẩn tiến độ.
        - **Thử thách (challenge):** Phù hợp với học sinh làm đúng toàn bộ câu dễ và đúng câu nâng cao. Tập trung thử thách câu hỏi vận dụng cao.
  4.  **Điều tiết nhịp độ (Pacing Action):**
      - Trong lúc học sinh tự học trên cổng, hệ thống liên tục tính toán số phút trôi qua (`elapsedMinutes`) và mức độ thành thạo mục tiêu (`averageMastery`).
      - Đưa ra quyết định Pacing thời gian thực:
        - *Ahead (Đi nhanh):* Giao thêm nhiệm vụ mở rộng (`assign_enrichment`).
        - *On track (Đúng nhịp):* Tiếp tục tuyến lõi (`continue_core`).
        - *Behind (Đi chậm):* Rút ngắn câu hỏi mở rộng để tập trung bài học lõi (`compress_to_core`) hoặc chuyển sang dạng bài dễ hơn (`remediate_easier`).
        - *Stuck (Bị mắc kẹt):* Hệ thống đánh dấu cờ khẩn cấp (`flag_teacher`) thông báo để giáo viên xuống hỗ trợ trực tiếp.
  5.  **Bảng điều khiển của Giáo viên (Teacher Dashboard):**
      - Giáo viên quan sát tiến độ lớp học trực tiếp qua Firestore. Tìm kiếm theo tên học sinh, lọc theo lớp, lọc theo tuyến học, hoặc xem các mục tiêu kiến thức nào lớp đang yếu nhất.

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/AdaptiveLearningTab.tsx`: Điều phối chính của giáo viên, hiển thị bảng điều khiển trực tiếp, tích hợp cổng tạo mã QR học sinh và trình chỉnh sửa nội dung bài thích ứng.
  - `src/components/teacher/SimulationGeneratorModal.tsx`: Modal cho phép AI sinh mã mô phỏng Kroki/TikZ/HTML tương tác dựa trên nội dung mục tiêu bài học.
- **Thuật toán & Quy tắc (State & Diagnostic Engine):**
  - `src/lib/adaptive/diagnosticEngine.ts`: Trái tim của hệ thống thích ứng. Chứa thuật toán chấm điểm chẩn đoán, hàm tính toán tuyến học (`recommendLearningRoute`), hàm quyết định nhịp độ học tập (`decidePacingAction`), và hàm tổng hợp số liệu lớp học (`buildTeacherDashboardData`).
  - `src/lib/adaptive/types.ts`: Định nghĩa toàn bộ kiểu dữ liệu mô hình bài học phân hóa và lịch sử phiên học của học sinh.
  - `src/lib/adaptive/sampleAdaptiveLesson.ts`: Bài giảng thích ứng mẫu phục vụ kiểm thử và chạy thử nghiệm.
- **Giám sát kết nối & Telemetry:**
  - `src/services/telemetry.ts`: Thu thập và giám sát các lỗi truyền dữ liệu mạng hoặc phân tích Firestore bị thất bại (`FallbackTelemetryEvent`), hiển thị thống kê tỉ lệ lưu thành công trong 7 ngày trên bảng điều khiển.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Thuật toán xếp tuyến học (recommendLearningRoute):**
  Quy định xếp tuyến dựa trên mảng kết quả thành thạo `ObjectiveScore[]`:
  ```typescript
  if (weakCount >= 2 || (weakCount >= 1 && nearCount >= 1)) return 'foundation';
  if (weakCount === 0 && nearCount === 0 && advancedEvidenceCount >= 1) return 'challenge';
  return 'standard';
  ```
- **Thuật toán Pacing (decidePacingAction):**
  Dựa trên chính sách mặc định của bài học (Pacing Policy), hệ thống theo dõi nhịp độ:
  - Nếu học sinh phải học phụ đạo quá số lần quy định (ví dụ 2 lần) mà điểm thành thạo dưới 55% -> Trạng thái là `stuck`, hành động là `flag_teacher`.
  - Nếu thời gian còn lại không đủ làm Exit Ticket hoặc trễ tiến độ chuẩn quá 4 phút -> Trạng thái là `behind`, hành động tự động là chuyển về core hoặc phụ đạo dễ hơn.

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Chạy mô phỏng xếp tuyến thích ứng đầu vào**
    - *Hành vi:* Tại khu vực thử nghiệm Demo học sinh trên màn hình, điền đáp án bài chẩn đoán. Trường hợp A: Chọn sai tất cả -> Bấm nộp. Trường hợp B: Chọn đúng tất cả câu khó -> Bấm nộp.
    - *Kết quả mong đợi:* Trường hợp A xếp học sinh vào tuyến "Củng cố (foundation)". Trường hợp B xếp học sinh vào tuyến "Thử thách (challenge)".
  - [ ] **Test Case 2: Kiểm tra Pacing Engine thời gian thực**
    - *Hành vi:* Điều chỉnh thanh trượt giả lập thời gian học sinh đã làm bài lên 30 phút (trễ so với nhịp chuẩn) và chọn điểm thành thạo mục tiêu là 40%.
    - *Kết quả mong đợi:* Hệ thống hiển thị đề xuất pacing: "Chuyển sang bản dễ hơn" (`remediate_easier`) và đưa ra cờ cảnh báo màu đỏ gửi giáo viên can thiệp.
  - [ ] **Test Case 3: Lưu bài học phân hóa lên Firestore**
    - *Hành vi:* Bật "Chỉnh nội dung", thay đổi tiêu đề bài học, nhấn "Lưu & bật cổng học sinh".
    - *Kết quả mong đợi:* Hệ thống gọi API kiểm tra sức khỏe Firestore Admin (`/api/health/firebase-admin`). Nếu cấu hình hợp lệ, trạng thái lưu báo thành công và thời gian lưu được hiển thị ở đầu màn hình.
  - [ ] **Test Case 4: Mô phỏng xuất hiện TRONG bài Dewey HTML (không chỉ ở cổng React)**
    - *Hành vi:* Tạo/nạp bài có `unit.simulationSpec.html.srcDoc` hoặc đã sinh mô phỏng qua pipeline → vào cổng học sinh → nộp pre-test → tới màn `dewey-lesson`.
    - *Kết quả mong đợi:* Mỗi mảnh kiến thức render `<iframe class="sim-frame" sandbox="allow-scripts">` ngay trong iframe bài học (khối `.unit-simulation`), không phải chỉ ở `LessonSimulationViewer` ngoài iframe.
  - [ ] **Test Case 5: `engage.illustration` không rỗng khi bài có visualCards**
    - *Hành vi:* Bài có `preparation.engage.visualCards` → `adaptiveLessonToDeweyContent` → kiểm tra màn Khởi động.
    - *Kết quả mong đợi:* Hiện gallery `.vc-gallery` 4 ảnh (mỗi ảnh là data-URL SVG/bitmap), KHÔNG rơi về placeholder dấu `?`.
  - [ ] **Test Case 6: Hình minh hoạ TikZ theo từng mảnh**
    - *Hành vi:* Unit có `tikzCode` → portal pre-fetch tạo URL Kroki → convert.
    - *Kết quả mong đợi:* Bước "step-explain" của mảnh có `illustrationHtml` chứa `<img>` Kroki render đúng hình; mảnh không có tikz thì không có ảnh thừa.
  - [ ] **Test Case 7: Offline cơ bản**
    - *Hành vi:* Mở file HTML đã xuất khi tắt mạng.
    - *Kết quả mong đợi:* SVG/JS/tương tác lõi của mô phỏng inline vẫn chạy (chỉ MathJax CDN và ảnh Kroki cần mạng — cân nhắc nhúng cục bộ nếu cần offline tuyệt đối).
  - [ ] **Test Case 8: Cầu nối `simulationId ↔ simulationHtml` đúng key**
    - *Hành vi:* Unit có `simulationId` đã lưu doc Firestore `lessonSimulations/{lessonId}_{unitId}` → `loadDeweyAssets` pre-fetch.
    - *Kết quả mong đợi:* HTML từ Firestore được nạp vào `unit.simulationHtml` của bản xuất; không lệch key, không nuốt nhầm doc của unit khác.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Không lưu được bài giảng lên Firestore hoặc bảng điều khiển học sinh thật bị xoay vòng loading vô hạn.
  - *Nguyên nhân:* Khóa tài khoản dịch vụ Firebase Admin SDK bị cấu hình thiếu quyền ghi trên Firestore hoặc mất mạng.
  - *Cách kiểm tra/Khắc phục:* Hệ thống có tích hợp module kiểm định sức khỏe trước khi lưu (`verifyFirebaseAdminHealth`). Kiểm tra log console để xem có thông báo lỗi endpoint API `/api/health/firebase-admin` không để cấu hình lại file `.env` chứa credential chuẩn của Firebase.

---

## 5. Ghi chú kiểm thử thực tế (Practical QA Notes)

> **Trạng thái:** ✅ Đã kiểm thử trực tiếp trên production `https://giaoandewey.vercel.app` (28/06/2026), bao gồm đi trọn các bước cổng học sinh ở phiên ẩn danh. Các ghi chú dưới đây ghi lại MÔI TRƯỜNG THỰC, CÁCH XÁC MINH và LỖI THẬT đã phát hiện.

### 5.1. Cách viết Test Case để chạy được thật (executable format)
Mỗi Test Case nên gồm 3 phần rõ ràng để người khác (hoặc AI) lặp lại được:
- **Bước thao tác cụ thể:** click/nhập gì, ở URL nào.
- **Kết quả mong đợi:** trạng thái nhìn thấy được.
- **Cách xác minh (verification method):** URL chính xác / DOM selector / log console / Firestore REST — KHÔNG chỉ "nhìn thấy đẹp".

### 5.2. Môi trường & công cụ thực tế
- **URL cổng học sinh đúng:** `/adaptive-portal/{lessonId}` (xem mục 1 — tài liệu cũ ghi sai).
- **Project Firestore:** `smartplan-ai-14200`.
- **App KHÔNG dùng Firebase Anonymous Auth.** Vì vậy một phiên học sinh ẩn danh = đọc Firestore REST **không kèm token**. Có thể mô phỏng học sinh thật bằng REST GET (không auth) tới `adaptiveLessons/{lessonId}`; nếu `portalEnabled=true` thì rule cho đọc, ngược lại bị từ chối.
- **Rule gating thực tế:** `adaptiveLessons` đọc được khi `request.auth != null || resource.data.get('portalEnabled', false) == true`. `adaptiveSessionProgress` chỉ giáo viên (đã auth) đọc được.
- **Giới hạn công cụ:** không mở được tab ẩn danh qua công cụ Chrome — kiểm "ẩn danh" thực hiện bằng REST không token, không phải cửa sổ incognito.

### 5.3. DOM markers để xác minh (dùng cho automation/console)
- `.vc-gallery` — gallery 4 ảnh ở màn Khởi động (TC5).
- `.unit-simulation` + `iframe.sim-frame` — mô phỏng nhúng trong bài Dewey (TC4).
- `#score-value` — điểm tích lũy (quan sát tăng 0 → 10 → … khi làm đúng).
- sự kiện `dewey:complete` — bắn khi hoàn thành bài.
- Thông báo "Đã lưu kết quả học tập" — xác nhận ghi `adaptiveSessionProgress` thành công.

### 5.4. LỖI / QUIRK THẬT đã phát hiện (chưa có trong checklist cũ)
- 🐞 **MathJax KHÔNG render bên trong `iframe.sim-frame`.** MathJax v3 nạp qua CDN trong thân bài Dewey nhưng KHÔNG được nạp vào trong các iframe mô phỏng (`sandbox="allow-scripts"`, khác origin). Hệ quả: công thức trong mô phỏng hiển thị thô dạng `$...$`. → Cần nhúng MathJax (hoặc render sẵn SVG công thức) vào chính srcDoc của sim-frame nếu mô phỏng có công thức.
- ⚠️ **Quota 429:** model `gemini-3.1-pro` ở free tier = 0 → request cá nhân hóa trả 429 → relay `/api/...` trả 500 → PersonalizationEngine **fallback về bài gốc (base lesson)**. Đây là hành vi đã thấy thật: khi test cần phân biệt "fallback do quota" với "lỗi logic". Kiểm log console/network để thấy 429/500 trước khi kết luận bài bị lỗi.
- ⚠️ **`portalEnabled` có thể thiếu khi publish từ Builder** (đã từng là bug, đã fix) — nếu cổng học sinh báo từ chối đọc, kiểm tra trường này trên doc `adaptiveLessons/{lessonId}`.

### 5.5. Quy trình kiểm "phiên ẩn danh" thực tế (đã chạy)
1. Lấy `lessonId` từ doc bài đã bật cổng.
2. REST GET (không token) `adaptiveLessons/{lessonId}` → kỳ vọng 200 nếu `portalEnabled=true`.
3. Mở `/adaptive-portal/{lessonId}` → nộp pre-test → đi trọn từng bước (click/drag thật, KHÔNG nhảy bước bằng JS) → quan sát `#score-value` tăng dần và "Đã lưu kết quả học tập".
