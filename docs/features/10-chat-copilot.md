# Tài liệu Chức năng: Chat Co-pilot (Trợ lý AI Tutor)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Cung cấp giao diện nhắn tin trực tiếp với Trợ lý AI (AI Tutor) để giáo viên trò chuyện, đặt câu hỏi nhanh, nhờ gợi ý hoạt động khởi động, tinh chỉnh mục tiêu bài dạy hoặc tạo thêm bài tập phân hóa theo thời gian thực dựa trên ngữ cảnh giảng dạy hiện tại.
- **Luồng hoạt động chính:**
  1.  Giáo viên nhấp vào tab **Trợ lý AI (AI Tutor)**.
  2.  **Khởi đầu cuộc hội thoại (Trạng thái trống):**
      - Hiển thị thông điệp chào mừng kèm theo 4 thẻ gợi ý nhanh: "Gợi ý hoạt động khởi động", "Tạo 5 câu hỏi trắc nghiệm", "Tinh chỉnh mục tiêu bài học", "Thêm phân hóa cho học sinh yếu".
      - Giáo viên có thể nhấp vào một gợi ý để tự động điền nội dung đó vào khung soạn thảo tin nhắn.
  3.  **Nhập & Gửi tin nhắn:**
      - Giáo viên soạn thảo nội dung tin nhắn. Trình soạn thảo hỗ trợ viết nhiều dòng bằng tổ hợp phím `Shift + Enter` và gửi nhanh bằng phím `Enter`.
      - Khi bấm gửi, tin nhắn của giáo viên xuất hiện ở bên phải (màu xanh dương). Trạng thái tải của AI hiển thị hiệu ứng 3 chấm nhấp nháy ở bên trái.
  4.  **AI Phản hồi:**
      - Hệ thống gọi API AI đồng bộ thông qua các nhà cung cấp cấu hình trong cài đặt.
      - Phản hồi của AI hiển thị ở bên trái (nền xanh nhạt), định dạng tự động các bảng biểu Markdown, văn bản in đậm, danh sách gạch đầu dòng, và hiển thị công thức toán học LaTeX chuẩn xác.
      - Giáo viên có thể đính kèm tài liệu tham khảo bằng nút kẹp giấy (Paperclip) khi gửi tin nhắn hỗ trợ context.

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/ChatTab.tsx`: Component hiển thị giao diện chat, điều phối hộp thoại tin nhắn, thanh cuộn tự động và khung nhập liệu.
- **Trạng thái & Nghiệp vụ AI (State & Context):**
  - Trạng thái tin nhắn (`chatMessages`) và hàm gửi tin nhắn (`handleChat`) được lưu tại `App.tsx` nhằm chia sẻ ngữ cảnh của các tab khác (ví dụ: giáo án đang soạn thảo dở dang) với AI.
  - Sử dụng các thư viện render markdown và công thức toán học: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-raw`.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Cấu trúc tin nhắn (Data Model):**
  Mỗi tin nhắn trong cuộc hội thoại được định nghĩa qua interface cục bộ:
  ```typescript
  interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
  }
  ```
- **Luồng gọi AI:**
  Khi giáo viên gửi tin nhắn, hàm `handleChat` trong `App.tsx` thu thập nội dung cuộc hội thoại hiện tại, bổ sung System Prompt của AI Tutor giáo dục, sau đó gọi hàm API `callAI` từ `src/lib/aiProviders.ts` và thêm phản hồi mới vào mảng `chatMessages`.

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Sử dụng gợi ý nhanh đầu trang**
    - *Hành vi:* Khi chưa nhắn tin, nhấp vào thẻ gợi ý "Gợi ý hoạt động khởi động".
    - *Kết quả mong đợi:* Đoạn chữ "Gợi ý hoạt động khởi động" tự động điền vào ô nhập liệu ở dưới. Nhấn Enter để gửi đi thành công.
  - [ ] **Test Case 2: Phản hồi công thức Toán học**
    - *Hành vi:* Nhập câu hỏi "Viết công thức tính đạo hàm của hàm số $y = x^n$ và cho ví dụ." rồi gửi.
    - *Kết quả mong đợi:* AI phản hồi có chứa công thức LaTeX và được render bằng KaTeX hiển thị đẹp đẽ (không hiện thô ký tự $).
  - [ ] **Test Case 3: Nhập liệu xuống dòng**
    - *Hành vi:* Nhập chữ "Dòng 1", nhấn `Shift + Enter`, nhập "Dòng 2", rồi nhấn `Enter`.
    - *Kết quả mong đợi:* Hộp chat nhận diện dấu xuống dòng và hiển thị tin nhắn của user có 2 dòng riêng biệt gửi đi.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Khung hội thoại quá dài không tự động cuộn xuống dưới cùng khi có tin nhắn mới (phải cuộn thủ công).
  - *Nguyên nhân:* Thiếu hook tự động cuộn (auto-scroll) mỗi khi mảng `chatMessages` thay đổi kích thước.
  - *Cách kiểm tra/Khắc phục:* Trong `ChatTab.tsx`, có thể thêm một thẻ `div` ẩn `<div ref={messagesEndRef} />` ở cuối danh sách tin nhắn và gọi `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` trong một hook `useEffect` phụ thuộc vào `chatMessages.length`. Điều này đảm bảo trải nghiệm chat luôn mượt mà.
