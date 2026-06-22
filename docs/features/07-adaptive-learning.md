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
      - Hệ thống cung cấp một mã QR và liên kết cổng học sinh riêng dựa trên ID của giáo viên:
        `https://giaoandewey.vercel.app/adaptive/student/{teacherId}`
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

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Không lưu được bài giảng lên Firestore hoặc bảng điều khiển học sinh thật bị xoay vòng loading vô hạn.
  - *Nguyên nhân:* Khóa tài khoản dịch vụ Firebase Admin SDK bị cấu hình thiếu quyền ghi trên Firestore hoặc mất mạng.
  - *Cách kiểm tra/Khắc phục:* Hệ thống có tích hợp module kiểm định sức khỏe trước khi lưu (`verifyFirebaseAdminHealth`). Kiểm tra log console để xem có thông báo lỗi endpoint API `/api/health/firebase-admin` không để cấu hình lại file `.env` chứa credential chuẩn của Firebase.
