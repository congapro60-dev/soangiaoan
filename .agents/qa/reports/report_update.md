
## 17. Triển khai kiến trúc Hybrid PA2+PA1+PA3 cho Bài học phân hoá (28/05/2026)

> Cập nhật bởi Antigravity theo yêu cầu xử lý lỗi "Chưa có nội dung chi tiết cho bài học phân hoá" và tối ưu hóa hệ thống sinh bài học, nhằm cân bằng giữa chất lượng nội dung (PA2+PA1) và cá nhân hóa thời gian thực (PA3) cho lớp học quy mô nhỏ (< 20 học sinh).

### 17.1 Bối cảnh và Vấn đề
- Hệ thống trước đây chỉ tạo khung bài học và yêu cầu người dùng phải tự nhập câu hỏi, bài tập (không đạt kỳ vọng "AI tự tạo 100%").
- Giải pháp "thuần PA3" (Real-time generation hoàn toàn) đã bị bác bỏ do lo ngại về cost, rate-limit và latency khi cả lớp làm bài cùng lúc.
- Lớp học có quy mô nhỏ (< 20 học sinh), cho phép độ trễ chấp nhận được ở người đầu tiên hoàn thành pre-test (15-30s), sau đó dùng cache cho những người tiếp theo.

### 17.2 Giải pháp Kiến trúc (Hybrid)
Chúng tôi đã áp dụng phương pháp tiếp cận **Hybrid**:
1. **Pha thiết kế (PA2+PA1 - Sinh nội dung có cấu trúc)**: 
   - Thay thế Regex parser cũ bằng hàm sinh JSON. Khi giáo viên nhấn "Duyệt bản rà soát", hệ thống gọi AI lần 2 (trong nền, có trạng thái `isGeneratingContent`) để yêu cầu AI sinh ra toàn bộ dữ liệu có cấu trúc (gồm các câu hỏi thực tế có LaTeX, giải thích chi tiết, bài kiểm tra nhanh) cho cả 3 tuyến học (Standard, Foundation, Challenge).
   - Nếu AI lỗi hoặc thiếu API key, hệ thống vẫn an toàn fallback về bản gốc (PA1 Regex).
2. **Pha học tập (PA3 - Personalization Engine & Caching)**:
   - Viết mới `src/lib/adaptive/personalizationEngine.ts` đóng vai trò là lõi cá nhân hóa.
   - Khi học sinh nộp Pre-test, tuỳ vào các "mục tiêu học tập còn yếu", hệ thống sẽ ghép nối nội dung từ tuyến Foundation/Challenge + gọi AI sinh thêm một patch cá nhân hóa nhẹ nhàng (nếu cần).
   - **Cache deduplication**: Nếu nhiều học sinh cùng vào tuyến Foundation và yếu cùng một mục tiêu, Promise đang gọi AI sẽ được tái sử dụng (deduplicate) thông qua sessionStorage. Học sinh nộp sau sẽ được hưởng lợi ngay lập tức từ cache của học sinh nộp trước.

### 17.3 Các thay đổi chính về Code
- **`src/lib/adaptive/adaptiveFromLessonPlan.ts`**: Thêm các hàm xử lý JSON (`buildAdaptiveContentPrompt`, `buildAdaptiveLessonFromContentJson`, v.v.).
- **`src/pages/AdaptiveLessonBuilderPage.tsx`**: Đổi `approveReviewedSource` thành hàm `async`. Thêm UI spinner hiển thị rõ ràng "AI đang thiết kế nội dung (15-30s)".
- **`src/lib/adaptive/personalizationEngine.ts`**: (Tạo mới) Chứa lõi logic deduplicate, cache, và gọi AI để vá lỗi (patch) bài học ở chế độ runtime.
- **`src/pages/AdaptiveStudentPortalPage.tsx`**: Thêm state `personalizing` vào `PortalStage`. `handleDiagnosticSubmit` được làm thành async, thay đổi UI hiển thị spinner cá nhân hóa, sau đó mới render `dewey-lesson`.

### 17.4 Cách Test trên VSCode / Môi trường thực
1. Truy cập trang **Soạn giáo án phân hoá**.
2. Upload hoặc chọn giáo án đã soạn (ví dụ "3 đường conic").
3. Chờ AI rà soát. Khi xuất hiện nút "Duyệt bản rà soát & tạo cấu trúc bài học", **bấm vào nút đó**.
4. **Kiểm chứng UI**: Nút sẽ hiện spinner kèm thông báo "AI đang thiết kế nội dung...".
5. Sau ~20 giây, kiểm tra phần nội dung bên dưới, các bài tập và ví dụ sẽ được điền câu hỏi thực tế (có nội dung Toán học/LaTeX) thay vì giữ trắng.
6. Chuyển sang **Góc nhìn học sinh**. Làm thử bài Pre-test (cố tình làm sai nhiều).
7. Khi bấm Nộp bài, sẽ thấy màn hình trung gian: **Đang chuẩn bị bài học cho em...**. Sau đó vào lớp học Dewey.
8. Mở console kiểm tra logs, bạn sẽ thấy Personalization Engine ghi nhận "Cache miss" ở lần gọi đầu, nếu học sinh khác vào cùng luồng đó sẽ thấy "Cache hit".

### 17.5 Lưu ý về Data
- Mọi dữ liệu JSON trả về đều được parse an toàn.
- Hàm ghi Firestore vẫn áp dụng `removeUndefinedFields` từ đợt sửa lỗi số 16 trước đó để tránh crash thư viện.
