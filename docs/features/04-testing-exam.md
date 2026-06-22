# Tài liệu Chức năng: Testing (Soạn đề & Kiểm tra)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Cung cấp công cụ khảo thí toàn diện cho giáo viên bao gồm: Soạn đề thi chuẩn hóa, Soát lỗi đề tự động bằng AI, và Trộn đề thi hoán vị câu hỏi lẫn phương án kèm đáp án chi tiết.
- **Luồng hoạt động chính:**
  1.  Giáo viên truy cập tab **Kiểm tra (Testing)** và chọn 1 trong 3 chế độ:
      - **Soạn đề (create):** Tạo đề thi mới từ số câu quy định (Trắc nghiệm 4 đáp án, Đúng/Sai 4 ý, Trả lời ngắn, Tự luận), kết hợp tải lên Ma trận Bloom và Đề thi mẫu định dạng để AI bắt chước cấu trúc.
      - **Soát lỗi (audit):** Kiểm tra và đánh giá chất lượng một hoặc nhiều đề thi hiện có (tải lên file Word, PDF hoặc văn bản thô).
      - **Trộn đề (shuffle):** Tải lên đề gốc và tạo ra hàng loạt mã đề thi ngẫu nhiên (hoán vị thứ tự câu hỏi và phương án A/B/C/D).
  2.  **Số hóa Đề Toán bằng OCR Vision (Math OCR):**
      - Đối với đề Toán có công thức phức tạp hoặc đồ thị dạng ảnh chụp, giáo viên bấm "Upload ảnh đề Toán -> LaTeX".
      - Hệ thống sử dụng mô hình đa phương thức (Vision LLM) để chuyển các vùng ảnh được tải lên thành công thức LaTeX chuẩn và mã TikZ vẽ hình tự động. Giáo viên có thể chèn kết quả trực tiếp vào đề thi.
  3.  **Tương tác kết quả & Tinh chỉnh đề:**
      - Kết quả đề thi hoặc báo cáo soát lỗi hiển thị trên bảng MDEditor hỗ trợ LaTeX và hình vẽ TikZ trực quan.
      - Giáo viên có thể chỉnh sửa trực tiếp, hoặc nhập yêu cầu vào ô "Yêu cầu chỉnh sửa" (ví dụ: "Thay đổi câu 5 từ hình học phẳng sang hình học không gian").
  4.  **Xuất bản tài liệu kiểm tra:**
      - Xuất đề thi và bảng đáp án ra file Word (.docx) chuyên nghiệp hoặc file PDF.
      - Xuất mã nguồn LaTeX sạch hoặc mở trực tiếp trên Overleaf để biên soạn chuyên sâu.
      - Sinh bộ tài liệu trọn gói bao gồm: Đề học sinh, Phiếu trả lời trắc nghiệm (Answer Sheet) và Phiếu đáp án chi tiết (Answer Key).

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/TestingTab.tsx`: Component trung tâm điều phối trạng thái, quản lý lịch sử lưu cục bộ và giao diện điều khiển.
  - `src/components/features/testing/MathOcrUploader.tsx`: Modal tải ảnh, hiển thị danh sách ảnh chụp đề Toán và gọi dịch vụ số hóa OCR.
  - `src/components/features/testing/ExamContentBoard.tsx`: Bảng hiển thị kết quả đề thi/soát lỗi với editor Markdown.
  - `src/components/features/testing/ExamDocsModal.tsx`: Modal tạo và xuất bản các mẫu phiếu trả lời, phiếu đáp án của mã đề thi.
- **Trực quan hóa & Dịch vụ AI (State & Utilities):**
  - `src/utils/examUtils.ts`: Xây dựng prompt sinh đề thi, prompt soát lỗi, logic phân tích hoán vị trộn đề thi bằng AI và gọi hàm OCR Vision.
  - `src/utils/examMarkdown.ts` và `src/utils/examWordExport.ts`: Định dạng và biên dịch Markdown đề thi sang tệp Word (.docx).
  - `src/utils/examLatexExport.ts`: Biên dịch Markdown đề thi sang cấu trúc mã LaTeX chuẩn phục vụ in ấn.
  - `src/utils/answerSheetTemplate.ts`: Tiện ích tạo template HTML Phiếu trả lời trắc nghiệm chuẩn hóa.
- **Rào chắn Định dạng (Guardrails):**
  - Sử dụng `validateMarkdownAgainstSkeleton` (trong `src/lib/documentSkeleton.ts`) để đối soát cấu trúc đề thi vừa soạn so với đề thi mẫu, đưa ra cảnh báo tức thì cho giáo viên nếu phát hiện thiếu câu, lệch điểm hoặc sai định dạng.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Luồng dữ liệu trộn đề (Shuffle Logic Flow):**
  1. Giáo viên tải lên đề gốc.
  2. Hệ thống gọi AI phân tích cấu trúc đề thi gốc và chuyển đổi văn bản sang định dạng JSON mảng câu hỏi:
     ```typescript
     Array<{ id: number; text: string; options: string[]; answer: string }>
     ```
  3. Hệ thống bóc tách JSON và thực hiện thuật toán hoán vị ngẫu nhiên (Fisher-Yates) danh sách câu hỏi và danh sách phương án.
  4. Xác định nhãn đáp án mới (A, B, C, D) dựa trên vị trí mới của phương án đúng sau khi hoán vị.
  5. Đóng gói các tệp đề thi dạng `.txt` (ví dụ: `De_Thi_Ma_So_101.txt`, `Da_An_Ma_So_101.txt`) vào một file ZIP và tải xuống tự động bằng `jszip` và `file-saver`.
- **Lịch sử lưu trữ cục bộ (History State):**
  - Các đề thi đã soạn hoặc báo cáo soát lỗi được lưu tự động trong `localStorage` với khóa `testing_history` lên tới 20 bản ghi, tự động dọn dẹp các bản ghi quá 7 ngày.

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Số hóa công thức Toán bằng OCR**
    - *Hành vi:* Vào "Upload ảnh đề Toán", tải lên một ảnh chụp có chứa công thức tích phân $\int_0^1 x^2 dx$ và một hình vẽ tam giác. Nhấn "Bắt đầu Số hóa".
    - *Kết quả mong đợi:* AI nhận diện chính xác công thức toán dạng LaTeX `$ ... $` và dựng thành công mã `tikz` tạo hình tam giác hiển thị trên khung preview. Bấm "Chèn vào đề thi" để điền dữ liệu vào editor.
  - [ ] **Test Case 2: Kiểm soát lỗi định dạng đề thi**
    - *Hành vi:* Soạn đề kiểm tra bằng cách đính kèm một "Đề mẫu định dạng" nhưng đặt số câu MCQ là 28 câu trong khi đề mẫu chỉ có 20 câu.
    - *Kết quả mong đợi:* Hệ thống hiện cảnh báo màu vàng về độ lệch skeleton mẫu, liệt kê các điểm không nhất quán nhưng vẫn cho phép giáo viên tải xuống đề.
  - [ ] **Test Case 3: Trộn đề thi ngẫu nhiên**
    - *Hành vi:* Tải lên một đề trắc nghiệm gồm 10 câu. Chọn số mã đề là 4. Nhấn "Bắt đầu trộn đề".
    - *Kết quả mong đợi:* Hệ thống sinh thành công, trình duyệt tải xuống file `SmartPlan_AI_Exam_Pack.zip`. Khi giải nén, các đề từ 101 đến 104 có thứ tự câu hỏi và phương án A/B/C/D đảo lộn khác nhau, kèm 4 file đáp án chỉ ra đúng nhãn của các phương án đã trộn.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Khi trộn đề thi, hệ thống báo lỗi "Không tìm thấy dữ liệu JSON câu hỏi trong response".
  - *Nguyên nhân:* Phản hồi từ LLM khi phân tích cấu trúc đề gốc không trả về khối JSON mảng sạch mà có chứa các câu dẫn dắt ngoài thẻ hoặc bị đứt đoạn tokens.
  - *Cách kiểm tra/Khắc phục:* Rà soát Regex bóc tách chuỗi JSON trong hàm `shuffleExam` của file `examUtils.ts`:
    ```typescript
    const jsonMatch = jsonResponse.match(/\[[\s\S]*?\](?=\s*$|\s*\n\s*[^[\]])/);
    ```
    Nếu LLM trả về mã markdown bọc ` ```json `, hàm Regex này vẫn trích xuất được. Cần đảm bảo hệ thống sử dụng model có `temperature` thấp để cấu trúc JSON đầu ra tuyệt đối ổn định.
