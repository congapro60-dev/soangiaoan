# BỘ QUY TRÌNH KIỂM THỬ (QA TESTING PROTOCOL)
**Dự án:** Smart Lesson Plan AI
**Mục đích:** Tài liệu này là kim chỉ nam cho bất kỳ AI Agent hoặc Lập trình viên nào khi được yêu cầu kiểm thử (QA) lại ứng dụng sau các đợt cập nhật (Refactor, thêm tính năng, nâng cấp).

---

## 1. Yêu Cầu Trước Kiểm Thử (Pre-Flight Checks)
Trước khi test bất kỳ chức năng giao diện nào, AI bắt buộc phải chạy 2 lệnh sau ở Terminal:

1. **`npm run test`**: Đảm bảo 100% các Unit Tests hiện có (Parse Markdown, Validation Skeleton, Security) đều vượt qua (PASS).
2. **`npm run build`**: Đảm bảo ứng dụng được biên dịch thành công. Không có lỗi Typescript (`tsc`) và không có cảnh báo nghiêm trọng về kích thước chunk (>500KB) trên file chính `index.js`.

---

## 2. Kịch Bản Kiểm Thử Cốt Lõi (Core E2E Testing)

Dưới đây là danh sách các module tính năng cần được giả lập/chạy tay thông qua trình duyệt (hoặc Playwright/Puppeteer script):

### 2.1. Module: Soạn Giáo Án (CreatorTab)
- **Hành động 1:** Nhập prompt hoặc Tải lên một file PDF/DOCX (đóng vai trò ngữ cảnh RAG).
- **Hành động 2:** Chọn Template (MOET hoặc TDS) và nhấn "Tạo giáo án".
- **Kiểm tra (Verify):** 
  - AI Gemini trả về kết quả định dạng Markdown.
  - Phải có bảng phân bổ thời gian hoặc các thẻ Heading chuẩn theo cấu trúc của file `templateData`.
- **Hành động 3 (Guardrails):** Chỉnh sửa kết quả bằng cách cố tình xóa một bảng quan trọng đi, sau đó bấm "Xuất Word" hoặc "Lưu".
- **Kiểm tra (Verify):** Hệ thống chặn lại và hiện cửa sổ cảnh báo mềm (SweetAlert2) báo lỗi Skeleton Validation.

### 2.2. Module: Thư Viện & Tiện Ích Mở Rộng (Library / ViewPlanModal)
- **Hành động 1:** Chọn một giáo án bất kỳ đã lưu trong Thư Viện. Mở modal `ViewPlanModal`.
- **Hành động 2 (PPTX Export):** Nhấn "Tạo Slide PPTX".
  - **Kiểm tra:** Hệ thống bóc tách JSON chuẩn, sinh ra các object Slide và trình duyệt tự động tải xuống file `.pptx` (có chứa text và ảnh công thức Toán nếu có).
- **Hành động 3 (Worksheet / RAG):** Nhấn "Tạo Phiếu Bài Tập".
  - **Kiểm tra:** Hệ thống bám sát nội dung giáo án để sinh ra bài tập trắc nghiệm/tự luận và cho tải xuống PDF/Word.
- **Hành động 4 (SCORM):** Nhấn "Xuất SCORM".
  - **Kiểm tra:** Tải xuống file ZIP chứa file `imsmanifest.xml` chuẩn SCORM 1.2.
- **Hành động 5 (Mô phỏng 3A):** Bấm nút tạo Sandbox Simulation (biểu tượng Game).
  - **Kiểm tra:** Một iframe hiện lên chạy code HTML/JS an toàn. Thử mở Inspect Element chèn `<script>alert(1)</script>` xem validator có chặn không (Bắt buộc chặn).

### 2.3. Module: Sinh Đề Thi (TestingTab)
- **Hành động:** Điền ma trận đề thi (số lượng câu dễ/khó, chủ đề). Nhấn "Tạo đề".
- **Kiểm tra (Verify):** 
  - AI trả về ma trận câu hỏi. 
  - Guardrail tích hợp phải ngăn chặn nếu đề thi thiếu câu hoặc format lỗi.
  - Chức năng "Xuất LaTeX" trả về mã nguồn hợp lệ không bị rách tag.

### 2.4. Module: Chấm Điểm Chữ Viết Tay (GradingTab)
- **Hành động:** Upload một ảnh chụp bài giải tay của học sinh (hoặc giả lập file upload).
- **Kiểm tra (Verify):** 
  - App chuyển ảnh thành base64 gọi AI Vision (Gemini 2.5 Pro/Flash).
  - Kết quả trả về phải chứa "Điểm số" và "Nhận xét chi tiết" dựa trên đáp án chuẩn.

### 2.5. Module: Adaptive Student Portal
- Tạo 1 lớp test + 1 học sinh test trong ClassesTab
- Bật portalEnabled = true cho 1 bài học trong Firestore
- Mở giaoandewey.vercel.app/portal/[lessonId]
- Nhập mã học sinh hợp lệ → vào được bài
- Hoàn thành pre-test → kiểm tra Firestore có ghi collection adaptiveSessionProgress không
- Xem nội dung adaptive → kiểm tra Firestore collection personalizationCache có entry mới không (TTL 7 ngày)
- Submit exit ticket → kiểm tra profileRecord ghi đúng

### 2.6. Module: ClassesTab Validation
- Tạo 2 lớp cùng tên → lần 2 phải bị chặn với SweetAlert
- Thêm 2 học sinh cùng mã trong 1 lớp → lần 2 phải bị chặn
- Reload trang → data lớp/học sinh vẫn còn (Firebase persist)

### 2.7. Module: Authentication
- Đăng xuất → truy cập route protected → redirect về login
- Đăng nhập lại → data cũ còn nguyên
- Không có API key → Settings modal tự mở

### 2.8. Production Smoke Test (bắt buộc chạy trên giaoandewey.vercel.app)
- Tạo 1 giáo án đơn giản → xuất Word → mở được không lỗi
- Tạo 1 đề thi → xuất PDF → mở được
- Adaptive Portal với mã học sinh thật → không có lỗi console

### 2.9. XSS Sandbox Test (đúng cách — không dùng Inspect Element)
Trong component dùng SandboxedSimulationFrame, truyền HTML:
  '<script>window.parent.document.title="HACKED"</script><p>Test</p>'
Kết quả PASS: validator block, hiện error UI đỏ.
Kết quả FAIL: iframe render được hoặc title parent đổi.

---

## 3. Dữ Liệu & Kịch Bản Test Nâng Cao

### 3.1. Test Data Fixtures
- File PDF mẫu cố định: dùng "Mẫu giáo án.pdf" có sẵn trong repo
- Prompt mẫu cố định: "Soạn giáo án môn Toán lớp 10, chủ đề Vectơ, 2 tiết, lớp 10A1"
- Mã học sinh test: ghi vào HANDOFF.md sau khi tạo trong ClassesTab

---

## 4. Quy Định Chữa Lỗi (Bug Fixing Protocol)
Nếu AI trong quá trình chạy QA Checklist này phát hiện ra lỗi (Failed Test, Error Console, App Crash):
1. **Dừng lại ngay lập tức.**
2. Báo cáo bằng định dạng Issue ngắn gọn: `[Module bị lỗi] - [Thao tác thực hiện] - [Lỗi bắt gặp]`.
3. Tự động đề xuất file cần sửa và xin quyền `multi_replace_file_content` hoặc `run_command` để fix bug, trước khi sang bước test tiếp theo.
4. KHÔNG ĐƯỢC bỏ qua bước nào trong lúc Test. Mọi kết quả Passed phải có bằng chứng từ log hoặc xác nhận thực tế.
