# Tài liệu Chức năng: Grading (Chấm điểm AI)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Tự động hóa quy trình chấm điểm và đánh giá chi tiết bài làm học sinh, giúp giáo viên tiết kiệm thời gian chấm bài tự luận/trắc nghiệm đồng thời cung cấp phản hồi sư phạm chất lượng cao và phát hiện đạo văn chéo.
- **Luồng hoạt động chính:**
  1.  **Thiết lập phiên chấm bài mới:**
      - Giáo viên tải lên tài liệu Đề bài / Đáp án gốc (Master File) có chứa nội dung câu hỏi và barem điểm chuẩn.
      - Tải lên danh sách các tệp bài làm của học sinh (định dạng văn bản như `.docx`, `.pdf`, `.txt` hoặc tệp ảnh quét `.png`, `.jpg`...).
      - Giáo viên có thể nhập thêm tiêu chí chấm bổ sung (Rubric) và thiết lập Thang điểm tối đa (ví dụ: 10 điểm).
      - **Trường hợp chưa có đáp án chuẩn:** Giáo viên tích chọn "Tôi chưa có đáp án chuẩn". Hệ thống sẽ kích hoạt AI tự giải đề thi trước để tạo barem đáp án tự động, sau đó giáo viên duyệt barem này để tiến hành chấm.
  2.  **Thực thi chấm điểm hàng loạt:**
      - Hệ thống chia hàng đợi chấm bài và chạy bất đồng bộ với cơ chế kiểm soát tối đa 3 bài chấm song song cùng lúc (Batch Concurrency = 3).
      - Hệ thống tính toán thời gian hoàn thành ước lượng (ETA) hiển thị trên giao diện và hỗ trợ tính năng tự động thử lại (Rate Limit Retry with Exponential Backoff) nếu gặp lỗi quá tải API (Error 429).
  3.  **Xem kết quả & Nhận xét cá nhân:**
      - Sau khi chấm xong, danh sách học sinh kèm điểm số, xếp loại và phân tích nhanh (Điểm mạnh, Điểm yếu, Lộ trình cải thiện) hiển thị rõ ràng.
      - Nhấp chọn từng học sinh để xem chi tiết bảng đối chiếu đáp án từng câu và lời giải thích Markdown cụ thể cho từng lỗi sai. Giáo viên có thể chỉnh sửa trực tiếp điểm số và lời phê trước khi lưu.
  4.  **Tác vụ tổng hợp nâng cao:**
      - **Rà soát sao chép (Plagiarism Check):** Quét chéo toàn bộ nội dung bài làm của học sinh trong phiên để tìm ra các cặp bài trùng lặp ý tưởng, đạo văn của nhau và xuất biểu đồ phần trăm đạo văn.
      - **Phân tích lớp học (Class Analysis):** AI phân tích phổ điểm chung của cả lớp, tổng hợp 3 lỗi phổ biến nhất và đề xuất phương pháp ôn tập hiệu quả cho giáo viên.
      - **Xuất dữ liệu:** Xuất bảng điểm chi tiết ra file Excel (.xlsx) để nhập điểm vào sổ cái.

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/GradingTab.tsx`: Điều phối chính trạng thái chấm bài, các cấu hình thang điểm và tích hợp các modal phân tích nâng cao.
  - `src/components/features/grading/GradingSessionList.tsx`: Sidebar hiển thị lịch sử các phiên chấm điểm đã lưu.
  - `src/components/features/grading/GradingNewSession.tsx`: Màn hình cấu hình và hiển thị thanh tiến trình chấm bài.
  - `src/components/features/grading/GradingViewSession.tsx`: Màn hình xem lại kết quả của các phiên chấm điểm lịch sử.
  - `src/components/features/grading/GradingResultDetail.tsx`: Modal xem chi tiết bài chấm của từng học sinh và cập nhật nội dung phê điểm.
  - `src/components/features/grading/PlagiarismDashboard.tsx`: Hiển thị báo cáo rà soát chép bài học sinh.
  - `src/components/features/grading/AISolveExamModal.tsx` và `ClassAnalysisModal.tsx`: Giao diện duyệt đáp án tự động giải và báo cáo phân tích phổ điểm lớp học.
- **Tiện ích và Dịch vụ (State & Utilities):**
  - `src/utils/gradingUtils.ts`: Chứa prompt chi tiết cho tác vụ chấm điểm (`getGradingPrompt`), giải đề tự động (`solveExam`), và phân tích kết quả lớp học (`analyzeClass`).
  - `src/utils/plagiarismUtils.ts`: Chứa thuật toán phân tích trùng lặp văn bản chéo giữa các bài làm học sinh.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Cơ chế gọi API song song & Thử lại khi quá tải:**
  Hệ thống sử dụng đường ống chạy worker đồng thời giới hạn ở 3 tiến trình:
  ```typescript
  const BATCH_GRADING_CONCURRENCY = 3;
  ```
  Nếu API trả về mã lỗi 429 (Rate Limit hoặc Resource Exhausted), hàm `gradeSubmissionWithRetry` tự động dừng chờ tăng dần theo lũy thừa (Exponential Backoff) cộng thêm độ trễ ngẫu nhiên (Jitter) để tránh xung đột nghẽn mạng:
  ```typescript
  const backoffMs = Math.min(30000, 1500 * 2 ** attempt) + Math.floor(Math.random() * 750);
  await delay(backoffMs);
  ```
- **Lược đồ dữ liệu chấm bài chuẩn (Grading Result Schema):**
  AI bắt buộc phải trả về chuỗi JSON khớp với lược đồ dữ liệu sau:
  ```json
  {
    "studentName": "Tên học sinh",
    "score": 8.5,
    "maxScore": 10,
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "improvementPlan": "Lộ trình cải thiện",
    "details": "Nội dung Markdown chi tiết bảng đối chiếu đáp án câu hỏi..."
  }
  ```

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Chấm điểm bài làm dạng ảnh chụp**
    - *Hành vi:* Tải lên đề kiểm tra dạng văn bản. Tải lên bài làm học sinh dạng file ảnh `.png`. Bấm "Bắt đầu chấm bài".
    - *Kết quả mong đợi:* Hệ thống kích hoạt module Vision để đọc nội dung chữ viết trong ảnh bài làm, tiến hành so sánh với đáp án chuẩn và trả về điểm số cùng nhận xét cụ thể.
  - [ ] **Test Case 2: AI tự giải đề chuẩn bị barem**
    - *Hành vi:* Tải lên tệp đề bài nhưng không đính kèm đáp án, tích chọn "Tôi chưa có đáp án chuẩn" và nhấn "Bắt đầu chấm bài".
    - *Kết quả mong đợi:* Hộp thoại AI tự động giải đề hiện ra hiển thị lời giải chi tiết và bảng đáp án trắc nghiệm/tự luận. Nhấn xác nhận để hệ thống lưu barem này và tự động chuyển sang bước chấm bài làm học sinh.
  - [ ] **Test Case 3: Rà soát sao chép bài học sinh**
    - *Hành vi:* Chấm bài xong cho 5 học sinh (trong đó có 2 học sinh có bài làm copy giống hệt nhau). Nhấn nút "Rà soát sao chép".
    - *Kết quả mong đợi:* Trình duyệt hiển thị bảng Plagiarism Dashboard nêu rõ tỉ lệ trùng lặp chéo, khoanh đỏ cặp học sinh có biểu hiện sao chép bài nhau kèm tỷ lệ % trùng khớp.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Chấm điểm bị dừng ở trạng thái "processing" mãi mãi hoặc báo lỗi "AI không trả về JSON hợp lệ".
  - *Nguyên nhân:* Phản hồi của LLM không khớp định dạng JSON sạch hoặc bị lẫn các lời mở đầu/kết thúc không mong muốn.
  - *Cách kiểm tra/Khắc phục:* Trong `gradingUtils.ts`, hàm `gradeSubmission` sử dụng các Regex sau để bóc tách JSON thô trước khi parse:
    ```typescript
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1] : text.match(/\{[\s\S]*"studentName"[\s\S]*\}/)?.[0];
    ```
    Hãy kiểm tra xem nội dung phản hồi thô có chứa ký tự JSON đặc biệt bị lỗi trích xuất hoặc sai tên thuộc tính (ví dụ `student_name` thay vì `studentName`) không và tinh chỉnh prompt nếu cần.

---

## 5. Ghi chú kiểm thử thực tế (Practical QA Notes)

> **Trạng thái:** ⚠️ *Suy từ code — chưa kiểm thử trực tiếp tab này trong đợt vừa rồi.* Phần dưới chuẩn hóa cách chạy checklist.

### 5.1. Định dạng Test Case nên dùng
Mỗi case: **bước thao tác cụ thể** → **kết quả mong đợi** → **cách xác minh** (điểm + nhận xét cụ thể / DOM / console). Test chấm bài phải đối chiếu điểm AI cho với barem, không chỉ "có ra điểm".

### 5.2. Cách xác minh & quirk
- Batch concurrency = 3: test chấm >3 bài, kiểm hàng đợi chạy đúng, không treo ở "processing".
- Vision đọc bài ảnh: dùng ảnh chữ viết tay/scan để kiểm độ chính xác trích text.
- `gradeSubmission` bóc JSON bằng Regex (khớp key `studentName`) — test phản hồi AI có text thừa hoặc sai key (`student_name`) để chắc không sập.
- "Rà soát sao chép": tạo 2 bài giống hệt → kiểm Plagiarism Dashboard khoanh đúng cặp + % trùng.
- ⚠️ **Quota 429:** chấm hàng loạt dễ chạm quota → một số bài fallback/lỗi. Kiểm network để phân biệt với lỗi parse.

### 5.3. Lưu ý môi trường (chung)
- Production: `https://giaoandewey.vercel.app`, Firestore `smartplan-ai-14200`.
