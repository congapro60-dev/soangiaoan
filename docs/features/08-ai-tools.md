# Tài liệu Chức năng: AI Tools (Kho công cụ & Trợ lý Prompt)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Cung cấp cho giáo viên một trung tâm tài nguyên AI tích hợp, cho phép viết prompt AI tối ưu sư phạm nhanh chóng, thiết kế System Prompt cho trợ lý ảo (Prompt Architect), và tra cứu kho danh bạ các công cụ EdTech/AI hữu ích bên ngoài.
- **Luồng hoạt động chính:**
  1.  **Viết Prompt AI (Prompt Writer):**
      - Giáo viên chọn Công cụ AI đích (Google Gemini, Claude, Canva AI, Midjourney, Cursor...).
      - Chọn Mục đích (Giáo án, Đề kiểm tra, Nhận xét học sinh, Vẽ hình minh họa, Lập trình...).
      - Tùy chỉnh mức độ chi tiết (Ngắn gọn, Vừa đủ, Chi tiết), Ngôn ngữ đầu ra và Định dạng mong muốn (Markdown, Bảng, JSON, Checklist, Code).
      - Nhập ý tưởng thô (ví dụ: "soạn quiz toán") hoặc nhấp chọn các nút ví dụ có sẵn.
      - Nhấp "Tạo prompt hoàn chỉnh". AI sẽ phân tích cấu hình để viết lại prompt chuyên nghiệp có sẵn vai trò, bối cảnh, ràng buộc và tiêu chí kiểm thử để giáo viên copy sang AI khác sử dụng.
  2.  **Kiến trúc sư Prompt (Prompt Architect):**
      - Giáo viên nhấn nút "Kiến trúc sư Prompt (JSON)", một modal hiện lên yêu cầu giáo viên mô tả ý tưởng tạo Bot/Widget hỗ trợ dạy học.
      - Hệ thống sử dụng prompt đặc biệt để sinh ra System Prompt có cấu trúc chuẩn dạng JSON chứa các trường: `role`, `context`, `objective`, `audience`, `tone`, `instructions`, `output_format`, và `sample_prompt`.
  3.  **Kho công cụ AI & Dạy học (EdTech Directory):**
      - Hiển thị danh mục các công cụ hỗ trợ giáo dục phân nhóm theo thẻ: Tất cả, Prompt, Giáo dục, Thiết kế, Lập trình, Nghiên cứu, Tiện ích.
      - Có thanh tìm kiếm tức thời theo tên, mô tả hoặc ghi chú của công cụ.
      - Mỗi thẻ cung cấp thông tin "Nên dùng khi nào", hướng dẫn tài khoản, các liên kết nhanh (Quick Links) hoặc nút mở website trực tiếp.

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/AIToolsTab.tsx`: Component hiển thị giao diện chính của tab, bao gồm Form Prompt Writer, khung hiển thị kết quả và bộ lọc kho công cụ dạy học.
  - `src/components/features/prompt-builder/PromptBuilderModal.tsx`: Modal giao diện của chức năng "Kiến trúc sư Prompt".
- **Logic Nghiệp vụ & Dữ liệu (State & Utilities):**
  - `src/utils/promptBuilder.ts`: Định nghĩa kiểu dữ liệu cấu hình, hàm ghép prompt Writer `buildPromptWriterPrompt`, và hàm gọi AI thiết kế System Prompt `generateSystemPrompt`.
  - `src/data/aiTools.ts`: Chứa danh sách dữ liệu tĩnh `AI_TOOL_LINKS` của các công cụ AI, phân loại danh mục, thông tin tài khoản và link liên kết.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Cấu trúc System Prompt (Prompt Architect JSON):**
  Khi giáo viên nhập ý tưởng xây dựng bot, hệ thống bắt buộc AI trả về đúng lược đồ JSON chuẩn:
  ```typescript
  export interface StructuredPrompt {
    role: string;
    context: string;
    objective: string;
    audience: string;
    tone: string;
    instructions: string[];
    output_format: string;
    sample_prompt: string;
  }
  ```
  Hàm xử lý `generateSystemPrompt` sử dụng biểu thức chính quy (Regex) để trích xuất mảng JSON này và kiểm tra tính hợp lệ trước khi hiển thị cho giáo viên:
  ```typescript
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match[0]) as StructuredPrompt;
  ```
- **Cảnh báo thiếu API Key:**
  Hệ thống kiểm tra xem giáo viên đã cấu hình bất kỳ API Key nào trong cài đặt chưa. Nếu chưa, một thanh cảnh báo màu xanh dương nổi bật được hiển thị ở đầu trang để nhắc nhở.

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Tạo Prompt hoàn chỉnh thành công**
    - *Hành vi:* Chọn công cụ "Google Gemini", mục đích "Slide / thuyết trình", định dạng "Checklist". Nhập ý tưởng "bài giảng năng lượng tái tạo". Nhấn "Tạo prompt hoàn chỉnh".
    - *Kết quả mong đợi:* Hệ thống hiển thị kết quả bao gồm: Tiêu đề "Prompt hoàn chỉnh" chứa khối văn bản Markdown sẵn sàng sao chép, mục "Vì sao prompt này tốt hơn" và các "Giả định đã dùng".
  - [ ] **Test Case 2: Tạo System Prompt cấu trúc JSON**
    - *Hành vi:* Nhấp vào nút "Kiến trúc sư Prompt (JSON)", nhập ý tưởng "Bot giải bài tập Hóa học lớp 10", nhấp nút "Thiết kế System Prompt".
    - *Kết quả mong đợi:* AI sinh ra cấu trúc các trường Vai trò, Chỉ dẫn, Giọng điệu rõ ràng, không bị lỗi cú pháp JSON và hiển thị dạng danh sách chi tiết. Bấm copy hoạt động bình thường.
  - [ ] **Test Case 3: Tìm kiếm lọc danh mục công cụ**
    - *Hành vi:* Chọn bộ lọc "Thiết kế" hoặc nhập từ khóa "Canva" vào thanh tìm kiếm.
    - *Kết quả mong đợi:* Danh sách thẻ công cụ AI ngay lập tức cập nhật chỉ hiển thị các công cụ liên quan đến đồ họa/thiết kế đồ dùng dạy học.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Chức năng "Kiến trúc sư Prompt" báo lỗi đỏ hoặc không hiển thị kết quả sau khi AI phản hồi.
  - *Nguyên nhân:* Mô hình AI trả về nội dung text thừa ở đầu hoặc cuối JSON khiến hàm `JSON.parse` bị sập (lỗi cú pháp JSON).
  - *Cách kiểm tra/Khắc phục:* Trong file `promptBuilder.ts`, hàm `generateSystemPrompt` đã sử dụng Regex `raw.match(/\{[\s\S]*\}/)` để bóc tách phần đối tượng `{...}` thực tế trong chuỗi phản hồi. Cần kiểm tra xem Regex này có bị bắt lệch do phản hồi chứa nhiều hơn một cặp ngoặc nhọn lồng nhau không. Nếu có, có thể tinh chỉnh Regex hoặc yêu cầu AI định dạng JSON nghiêm ngặt thông qua System Prompt.
