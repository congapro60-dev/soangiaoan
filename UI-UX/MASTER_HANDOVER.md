# Giao An Dewey - Master Handover Document (Full Redesign)
**Dành cho:** Cline / VS Code / Đội ngũ phát triển
**Ngày:** 05/06/2026
**Màu chủ đạo:** Xanh Dương Tri Thức (#3182ce)
**Font chữ:** Plus Jakarta Sans / Be Vietnam Pro

---

## 1. TẦM NHÌN DỰ ÁN
Chuyển đổi từ một công cụ soạn thảo truyền thống sang hệ sinh thái **AI Co-pilot chuyên sâu cho giáo dục Việt Nam**. Toàn bộ giao diện được đồng bộ theo phong cách **Minimalist Editorial** (Hiện đại, tối giản, chuyên nghiệp).

---

## 2. MÃ NGUỒN TẤT CẢ CÁC MÀN HÌNH (SOURCE CODE)
Cline hãy sử dụng các mã nguồn HTML/Tailwind dưới đây để triển khai các React/Next.js components.

### A. Nhóm màn hình chuyên sâu (Advanced Workflow)
1. **Trình soạn thảo AI Co-pilot (Nâng cấp):** `{{DATA:SCREEN:SCREEN_22}}` (Sidebar ngữ cảnh, Ghost text). Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Trình soạn thảo AI Co-pilot (Priority 1).zip"
2. **Thiết lập Ma trận Đề kiểm tra (Smart Grid):** `{{DATA:SCREEN:SCREEN_30}}` (Logic phân bổ % điểm). Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Tạo đề kiểm tra (Ma trận Smart Grid).zip"
3. **Báo cáo Năng lực & Phân tích AI:** `{{DATA:SCREEN:SCREEN_11}}` (Biểu đồ Radar & nhận xét AI). Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Báo cáo năng lực & Phân tích AI.zip"
4. **Cổng học sinh thích ứng:** `{{DATA:SCREEN:SCREEN_25}}` (Zero-noise UI, tập trung học tập).
5. **Cài đặt Xuất file & Template (Chuẩn A4):** `{{DATA:SCREEN:SCREEN_35}}` (Preview trước khi in).
6. **Quản lý Lớp học:** `{{DATA:SCREEN:SCREEN_33}}` (Dashboard quản lý học sinh tập trung). Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Quản lý lớp học & Danh sách học sinh.zip"

### B. Nhóm màn hình nền tảng (Core Ecosystem)
7. **Trang chủ Giao An Dewey (Đồng bộ UI):** `{{DATA:SCREEN:SCREEN_17}}`. Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_giao_an_dewey_homepage.zip"
8. **Xem chi tiết & Preview giáo án:** `{{DATA:SCREEN:SCREEN_20}}`. Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_xem chi tiết & xem trước (đồng bộ UI).zip"
   - Mục đích: trang **Đọc & Tham khảo** khi duyệt thư viện hoặc xem giáo án của đồng nghiệp.
   - Hành động chính: đọc nội dung, lưu vào thư viện cá nhân, chia sẻ, tải nhanh bản PDF có sẵn.
   - Giới hạn UX: nội dung là **tĩnh**; không chỉnh sửa tiêu đề, header, template hoặc định dạng file tại màn hình này.
9. **Quản lý Giáo án Cá nhân (Workspace):** `{{DATA:SCREEN:SCREEN_14}}`. Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Quản lý Giáo án Cá nhân.zip"
10. **Khám phá Cộng đồng:** `{{DATA:SCREEN:SCREEN_37}}`. Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Khám phá cộng đồng.zip"
11. **Bảng điều khiển Tổng quan (Dashboard):** `{{DATA:SCREEN:SCREEN_39}}`. Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Bảng điều khiển tổng quan.zip"
12. **Hồ sơ & Cài đặt:** `{{DATA:SCREEN:SCREEN_16}}`. Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Hồ sơ và cài đặt.zip"
13. **Soạn thảo AI (Cơ bản):** `{{DATA:SCREEN:SCREEN_19}}`. Đường dẫn: "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\UI-UX\stitch_Soạn thảo giáo án AI.zip"

### C. Phân biệt quan trọng về Preview nội dung và Export A4
- **Xem chi tiết & Preview giáo án** là màn hình đọc nội dung: phục vụ tham khảo, lưu/chia sẻ/tải nhanh; không can thiệp vào hình thức xuất bản.
- **Cài đặt Xuất file & Template** là màn hình tổng duyệt hình thức trước khi in/nộp: chọn template, chỉnh thông tin header như tên trường, giáo viên, tổ chuyên môn, kiểm tra căn lề/font chuẩn A4, rồi mới Export Word.
- Khi triển khai vào app React, không gộp hai màn hình này thành một luồng. Preview nội dung thuộc ngữ cảnh thư viện/tham khảo; Export A4 thuộc ngữ cảnh giáo án của chính người dùng sau khi đã soạn xong.

---

## 3. HƯỚNG DẪN KỸ THUẬT & LOGIC AI
Cline cần đọc kỹ các tài liệu logic sau để hiện thực hóa tính năng:

- **Logic Ma trận & API Sinh đề:** Xem tại `{{DATA:DOCUMENT:DOCUMENT_32}}`.
- **Logic AI Co-pilot (Context-aware):** Xem tại `{{DATA:DOCUMENT:DOCUMENT_34}}`.
- **Cấu trúc Báo cáo Năng lực:** Xem tại `{{DATA:DOCUMENT:DOCUMENT_34}}` (Phần 2).
- **Setup Môi trường & Tailwind Config:** Xem tại `{{DATA:DOCUMENT:DOCUMENT_3}}`.

---

## 4. CHỈ DẪN THỰC THI CHO CLINE (PROMPT MẪU)
Bạn hãy copy đoạn lệnh này và gửi cho Cline:

> "Cline, đây là bộ tài liệu tổng hợp toàn bộ thiết kế mới của Giao An Dewey. Hãy thực hiện các bước sau:
> 1. Cập nhật `tailwind.config.js` theo bảng màu Xanh Dương Tri Thức (#3182ce) và font Plus Jakarta Sans.
> 2. Thay thế toàn bộ layout hiện tại bằng bộ 13 màn hình mới từ Master Document.
> 3. Triển khai logic AI Co-pilot (Sidebar trợ lý) thay cho Chatbot cũ.
> 4. Xây dựng component Smart Matrix Grid và kết nối với API sinh đề theo schema trong tài liệu kỹ thuật.
> 5. Đảm bảo toàn bộ trải nghiệm người dùng nhất quán, chuyên nghiệp và hỗ trợ tốt tiếng Việt."

---
*Tài liệu được đóng gói tự động bởi Stitch cho dự án Giao An Dewey.*