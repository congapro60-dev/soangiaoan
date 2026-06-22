# Tài liệu Chức năng: Creator (Soạn giáo án AI)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Giúp giáo viên soạn thảo các bài dạy học chất lượng cao, có chiều sâu sư phạm và cấu trúc chuẩn hóa nhờ sự trợ giúp của AI Co-pilot dưới hai chế độ: Soạn đơn lẻ (Single Mode) và Soạn hàng loạt (Bulk Mode).
- **Luồng hoạt động chính:**
  1.  **Cấu hình thông số bài dạy:** Giáo viên chọn Khối lớp, Môn học, Tuần học, định dạng mẫu giáo án mong muốn (Mặc định/Adaptive-ready, CV5512 chuẩn Bộ GD&ĐT, hoặc Claude chuyên sâu), và chọn một mẫu cấu trúc (Template) nếu có.
  2.  **Đính kèm tài liệu & Yêu cầu:** Giáo viên tải lên các file tài liệu tham khảo (Phân phối chương trình, bài đọc, tài liệu môn học) và viết mô tả yêu cầu cụ thể (ví dụ: "Tập trung vào giải quyết vấn đề bằng công nghệ...").
  3.  **Tạo bài bằng AI:**
      - Giáo viên bấm "Bắt đầu Soạn giáo án". Trình duyệt hiển thị màn hình khóa mờ với phần trăm tiến trình giả lập từ 0% đến 99% để biểu thị tiến độ xử lý.
      - Hệ thống chạy đường ống AI đa tác nhân liên tục: Lập dàn ý (Planning) -> Viết nội dung (Content) -> Định dạng chuẩn (Format).
      - Nội dung Markdown được stream trực tiếp lên màn hình biên tập (Editor).
  4.  **Chỉnh sửa & Yêu cầu cải tiến:**
      - Giáo viên có thể chỉnh sửa trực tiếp nội dung trong editor.
      - Hoặc nhập câu lệnh vào ô "Yêu cầu sửa đổi" (ví dụ: "Thêm 3 ví dụ thực tế về chuyển động tròn vào Hoạt động 4") rồi gửi, AI sẽ sinh patch cập nhật lại đoạn tương ứng mà không làm vỡ các phần còn lại.
  5.  **Tác vụ bổ trợ chuyên sâu:**
      - **Tạo Phiếu học tập:** Tách giáo án thành Phiếu học tập tại lớp (Inclass) hoặc Phiếu bài tập về nhà (Homework) dưới dạng tài liệu Word 2 cột chuẩn hóa sư phạm.
      - **Tạo Slide nhanh (Text-to-Slide):** AI tóm tắt nội dung giáo án thành các thẻ slide JSON và xuất file PPTX.
      - **Audio Overview (Podcast):** AI chuyển giáo án thành cuộc đối thoại âm thanh tóm tắt kiến thức (podcast).
      - **Xuất bản:** Tải xuống file dưới dạng Word A4 (.docx), PDF hoặc LaTeX.

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/CreatorTab.tsx`: Component điều phối chính của tab soạn bài, chứa các modal và khung hiển thị kết quả.
  - `src/components/features/creator/LessonControls.tsx`: Sidebar chứa các input chọn Khối, Tuần, Môn, Template và tài liệu đính kèm.
  - `src/components/features/creator/LessonContentBoard.tsx`: Khu vực hiển thị nội dung giáo án dạng Markdown kết hợp Editor.
  - `src/components/features/creator/CreatorToolbar.tsx`: Thanh công cụ chứa các nút xuất bản file Word, PDF, LaTeX, Slide, Worksheet.
  - `src/components/features/creator/DiagramRenderer.tsx`: Hỗ trợ vẽ hình phẳng bằng TikZ (LaTeX) hoặc hình 3D từ dữ liệu tọa độ.
- **Trạng thái & Nghiệp vụ AI (State & Hooks):**
  - `src/hooks/useLessonCreator.ts`: Hook chứa toàn bộ logic gọi API, quản lý tiến độ bulk, bóc tách XML, và gọi đường ống Agent.
  - `src/lib/agents/Coordinator.ts`: Điều phối pipeline 3 bước gọi lần lượt 3 tác nhân.
  - `src/lib/agents/PlanningAgent.ts`: Tác nhân lên dàn ý mục tiêu giáo án.
  - `src/lib/agents/ContentAgent.ts`: Tác nhân viết kịch bản hội thoại chi tiết.
  - `src/lib/agents/FormatAgent.ts`: Tác nhân định dạng bảng biểu, công thức toán và kiểm tra lỗi.
- **Đóng gói & Chốt chặn (Utilities & Guardrails):**
  - `src/utils/guardrailUtils.ts` và `src/lib/documentSkeleton.ts`: Rà soát cấu trúc đầu ra của AI so với skeleton mẫu trước khi lưu hoặc xuất file để ngăn chặn lỗi mất dữ liệu hoặc thiếu mục quan trọng.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Cấu trúc giáo án đầu ra (Format Prompts):**
  - **Công văn 5512:** Quy định khắt khe cấu trúc 5 Hoạt động (Mở đầu, Hình thành kiến thức, Luyện tập, Vận dụng, Sơ kết). Mỗi hoạt động bắt buộc có đủ 4 mục a, b, c, d và bảng 3 cột.
  - **Claude chuyên sâu:** Yêu cầu mục tiêu dạng WALT (học cái gì) & WILF (tiêu chí đánh giá phân hóa 3 mức độ 🌶️). Hội thoại verbatim giữa GV và HS. Tích hợp đánh giá Danielson ở cuối bài.
  - **Adaptive-ready:** Dựng giáo án mẫu chứa sẵn dữ liệu đóng gói "Thẻ chuyển đổi Adaptive" để AI ở tab Adaptive Learning có thể bóc tách cấu trúc này thành các Node học tập tự động cho học sinh.
- **Kỹ thuật xử lý công thức toán và bảng biểu:**
  - Định dạng LaTeX inline dạng `$f(x)$` và block dạng `$$f(x)$$`.
  - Thay thế toàn bộ ký tự gạch đứng `|` bên trong công thức Toán học bằng ký tự `\mid` để không làm đứt cấu trúc cột của bảng Markdown:
    ```typescript
    // Ví dụ trong code:
    P(A \mid B) // thay vì P(A|B)
    ```
  - Bóc tách nội dung giáo án thực tế từ thẻ XML trả về của AI thông qua hàm `extractLessonContent` bằng Regex:
    ```typescript
    const contentMatch = rawResult.match(/<lesson_content>([\s\S]*?)<\/lesson_content>/i);
    ```

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Biên soạn giáo án thành công (Single Mode)**
    - *Hành vi:* Chọn môn Toán, Khối 11, định dạng "CV 5512". Nhập tiêu đề bài học. Nhấp nút "Soạn giáo án".
    - *Kết quả mong đợi:* Trình duyệt hiển thị màn hình loading kèm % chạy đều. Sau khi hoàn tất, nội dung giáo án xuất hiện trên màn hình có đầy đủ 5 hoạt động chính và các bảng 3 cột có chứa công thức toán LaTeX được render bằng KaTeX.
  - [ ] **Test Case 2: Kích hoạt cảnh báo Guardrail khi cấu trúc sai**
    - *Hành vi:* Biên soạn một bài học, sau đó dùng editor xóa sạch phần "I. MỤC TIÊU" đi rồi nhấn nút "Lưu bài này".
    - *Kết quả mong đợi:* Hệ thống hiện cảnh báo cấu trúc không đạt chuẩn (lệch so với skeleton mẫu) và hướng dẫn giáo viên bổ sung lại mục tiêu bài học.
  - [ ] **Test Case 3: Xuất phiếu học tập (Worksheet) 2 cột**
    - *Hành vi:* Chọn nút "Tạo Phiếu học tập" trên thanh công cụ -> Nhấn "Tải Word (.docx)".
    - *Kết quả mong đợi:* Hệ thống tải xuống file `.docx` định dạng dọc A4, bảng biểu 2 cột không bị vỡ hàng, công thức Toán học hiển thị chính xác.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Chữ viết tiếng Việt do AI sinh ra bị lỗi khoảng cách rời rạc dấu (ví dụ: "g i á o á n" thay vì "giáo án").
  - *Nguyên nhân:* LLM bị lỗi tokenization đối với tiếng Việt có dấu khi sinh mã LaTeX.
  - *Cách kiểm tra/Khắc phục:* Trong `FormatAgent.ts` đã cấu hình prompt yêu cầu AI kiểm tra lỗi chính tả tiếng Việt. Nếu vẫn xuất hiện lỗi, cần rà soát lại Regex gộp chữ ở hàm xử lý trung gian hoặc điều chỉnh tham số `temperature` của LLM xuống thấp hơn (khoảng 0.2) để tránh việc AI sinh từ ngẫu nhiên bị vỡ chữ.
