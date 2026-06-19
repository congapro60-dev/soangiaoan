# Kế hoạch Tích hợp Tính năng AI Nâng cao (Dành cho Claude Review)

**Dự án:** `smart-lesson-plan-ai`
**Mục tiêu:** Tích hợp các giải pháp AI và tự động hóa mới nhất (thu thập từ cộng đồng) để tối ưu chi phí, nâng cấp chất lượng đầu ra (Slide, Exam) và tăng cường trải nghiệm người dùng (Giáo viên).

---

## 1. Tối ưu chi phí API bằng "Delegation Architecture" (Mô hình Công nhân - Quản lý)

**Mô tả:** Sử dụng các model AI giá rẻ/nhanh (như Claude 3 Haiku, Gemini 1.5 Flash) cho các tác vụ xử lý data thô, phân tích cú pháp, format dữ liệu. Chỉ gọi các model cao cấp đắt tiền (Claude 3.5 Sonnet, GPT-4o) cho các tác vụ đòi hỏi tư duy sư phạm (tạo Lesson Plan, thiết kế cấu trúc bài giảng).

*   **Ưu điểm:** Giảm đến 60-80% chi phí API. Tăng tốc độ phản hồi (response time) cho các thao tác nhỏ trên UI.
*   **Nhược điểm:** Tăng độ phức tạp của hệ thống logic. Cần viết thêm bộ định tuyến (Router) để phân loại task.
*   **Vị trí tích hợp:**
    *   `src/lib/gemini.ts` hoặc tạo mới `src/lib/llmRouter.ts`: Viết logic `routePrompt(taskType)`.
    *   `src/hooks/useLessonCreator.ts`: Tách luồng sinh ý tưởng (dùng model xịn) và luồng format JSON (dùng model rẻ).

## 2. Text-to-Slide Automation (Module Tạo Bài Giảng)

**Mô tả:** Xây dựng một luồng (pipeline) cho phép chuyển đổi một đoạn văn bản thô (giáo trình) thành cấu trúc Slide chuyên nghiệp, sau đó xuất thẳng ra file `.pptx` mà vẫn giữ được tính thẩm mỹ.

*   **Ưu điểm:** Tiết kiệm hàng giờ đồng hồ làm slide cho giáo viên. Tạo ra điểm nhấn (USP) rất mạnh cho sản phẩm.
*   **Nhược điểm:** Phải xử lý việc ánh xạ (mapping) từ text dài sang bullet points ngắn gọn. Việc render `.pptx` phía client dễ bị lỗi font hoặc tràn nội dung nếu độ dài text sinh ra không chuẩn.
*   **Vị trí tích hợp:**
    *   `src/components/tabs/CreatorTab.tsx`: Thêm UI chọn tính năng "Tạo Slide từ Text".
    *   `src/components/teacher/PromptBuilderModal.tsx` (Hoặc các file quản lý prompt): Viết prompt chuẩn: *"Đóng vai một chuyên gia thiết kế Slide, hãy tóm tắt nội dung sau thành 5 slide, mỗi slide tối đa 3 bullet points..."*
    *   `src/utils/pptxExportUtils.ts`: Cập nhật bộ render để đọc cấu trúc JSON của Slide và đổ vào template PPTX.

## 3. Tích hợp GeoGebra AI cho Toán học (Worksheet / Exam Module)

**Mô tả:** Thay vì sử dụng TikZ hay Kroki (dễ lỗi render và khó tinh chỉnh), chúng ta sẽ prompt AI sinh ra mã script/lệnh của GeoGebra để vẽ hình học phẳng/không gian cho các bài kiểm tra Toán/Lý.

*   **Ưu điểm:** Hình vẽ cực kỳ trực quan, đẹp, chính xác tuyệt đối. Khả năng tương tác cao nếu render trên nền web.
*   **Nhược điểm:** Đòi hỏi tích hợp Webview/Iframe của GeoGebra vào React. Việc xuất hình ảnh này ra file Word (DOCX) sẽ cần một bước chuyển đổi (Rasterization: vẽ trên Canvas rồi lưu thành base64) phức tạp hơn.
*   **Vị trí tích hợp:**
    *   `src/components/common/DiagramRenderer.tsx`: Mở rộng component để hỗ trợ engine `geogebra` bên cạnh `kroki`.
    *   `src/utils/worksheetUtils.ts`: Cập nhật logic xử lý ảnh trước khi đẩy vào pipeline xuất file Word.

## 4. Tự động hóa Scraping Dữ liệu (Dựa trên tư duy EasySpider)

**Mô tả:** Áp dụng tư duy cào dữ liệu dạng DOM/No-code để tạo ra các script thu thập ngân hàng câu hỏi, bài giảng từ các trang giáo dục mở để làm giàu kho dữ liệu (`LibraryTab`) của hệ thống.

*   **Ưu điểm:** Nhanh chóng xây dựng được kho học liệu đồ sộ cho app mà không cần nhập tay.
*   **Nhược điểm:** Cần liên tục bảo trì nếu cấu trúc HTML của trang nguồn thay đổi. Rủi ro về bản quyền (cần cân nhắc nguồn cào hợp lý).
*   **Vị trí tích hợp:**
    *   `scripts/scrape_congcutoanhoc.js`: Mở rộng/Refactor lại script này thành các module crawler chuẩn chỉnh hơn dùng Puppeteer/Cheerio ở một service riêng (nếu có backend), hoặc chạy local scripts để nạp database.
    *   `src/components/tabs/LibraryTab.tsx`: Nơi hiển thị các học liệu đã được cào về.

## 5. Chấm điểm AI Từng Bước (AI Step-by-Step Grading)

**Mô tả:** Nâng cấp tính năng chấm điểm. Không chỉ so sánh kết quả A B C D, hệ thống dùng OCR/Vision API để đọc bài làm tự luận/viết tay của học sinh, sau đó AI đối chiếu với Bareme (Rubric) để chấm điểm từng bước và đưa ra lời khuyên.

*   **Ưu điểm:** Đẩy tính năng của app lên mức Premium, cực kỳ giá trị với giáo viên dạy Toán/Lý/Hóa cần chấm tự luận.
*   **Nhược điểm:** Tốn chi phí gọi Vision API cho mỗi ảnh. Đòi hỏi prompt cực kỳ khắt khe để AI không "ảo giác" cho điểm sai.
*   **Vị trí tích hợp:**
    *   `src/components/tabs/TestingTab.tsx`: Giao diện upload ảnh bài làm và hiển thị kết quả chấm.
    *   `src/utils/examImportUtils.ts` (hoặc tạo file mới `gradingUtils.ts`): Xử lý ảnh (resize, nén) trước khi gửi lên API.
    *   Tạo prompt chuyên biệt cho Grading: cung cấp rõ ràng "Đề bài", "Đáp án chuẩn", "Bareme điểm" và "Bài làm học sinh".

---

## 🎯 Đề xuất Thứ tự Ưu tiên (Roadmap)

Dựa trên cấu trúc hiện tại của dự án, nên triển khai theo thứ tự sau để tránh phá vỡ kiến trúc (Breaking Changes):

1.  **Phase 1 (Quick Win): Tối ưu chi phí API (Mục 1) & Text-to-Slide (Mục 2).**
    *   Lý do: Xử lý hoàn toàn bằng API và logic thuần, can thiệp vào `useLessonCreator.ts` và logic Prompts, mang lại hiệu ứng Wow ngay lập tức cho UI sinh bài giảng mà không rủi ro về rendering.
2.  **Phase 2 (Đột phá Core): Tích hợp GeoGebra (Mục 3).**
    *   Lý do: Cần test kỹ phần render UI và export ra Word, sẽ giải quyết dứt điểm các phàn nàn về lỗi vẽ hình học hiện tại.
3.  **Phase 3 (Premium Feature): AI Grading (Mục 5).**
    *   Lý do: Cần thiết kế lại một chút UI ở `TestingTab` để giáo viên xem được tiến trình chấm điểm và feedback của AI.
4.  **Phase 4 (Data Ops): Scraping (Mục 4).**
    *   Lý do: Là tác vụ chạy ngầm/backend, có thể làm song song hoặc để sau khi các luồng người dùng chính đã ổn định.
