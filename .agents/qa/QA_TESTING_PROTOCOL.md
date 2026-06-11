# BỘ QUY TRÌNH KIỂM THỬ (QA TESTING PROTOCOL)
**Dự án:** Smart Lesson Plan AI
**Mục đích:** Tài liệu này là kim chỉ nam cho bất kỳ AI Agent hoặc Lập trình viên nào khi được yêu cầu kiểm thử (QA) lại ứng dụng sau các đợt cập nhật (Refactor, thêm tính năng, nâng cấp).

---

## 1. Yêu Cầu Trước Kiểm Thử (Pre-Flight Checks)
Trước khi test bất kỳ chức năng giao diện nào, AI bắt buộc phải chạy 2 lệnh sau ở Terminal:

1. **`npm run test`**: Đảm bảo 100% các Unit Tests hiện có (Parse Markdown, Validation Skeleton, Security) đều vượt qua (PASS).
2. **`npm run build`**: Đảm bảo ứng dụng được biên dịch thành công. Không có lỗi Typescript (`tsc`); **Chunk index (entry/runtime) có cảnh báo >500KB là KHÔNG chặn (non-blocking) miễn là <=1MB hoặc không tăng đột biến so với baseline.** Các chunk split (react-vendor, export-utils, charting...) >500KB cũng là điều bình thường. Hard-fail chỉ xảy ra khi chunk chính tăng vượt 1MB vô lý.

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
  - **Kiểm tra:** Một iframe hiện lên chạy code HTML/JS an toàn. Validator phải chặn payload độc hại theo mục 2.9.

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

### 2.5. Module: Adaptive Lesson Builder (Quản lý bài học phân hoá)
- **Hành động 1:** Mở tab "Quản lý bài học" từ sidebar.
- **Kiểm tra:** Danh sách bài học phân hoá hiện lên đầy đủ, có các nút "Mở bài", "Xem cổng", "Xóa".
- **Hành động 2:** Bấm "Mở bài" trên một bài học bất kỳ.
- **Kiểm tra:** Giao diện Builder tải thành công nội dung bài học. Kiểm tra hiển thị text, font chữ, công thức Toán học (LaTeX/TikZ) không bị lỗi định dạng.
- **Hành động 3:** Quay lại danh sách và bấm "Xem cổng" (hoặc Preview).
- **Kiểm tra:** Giao diện học sinh (Adaptive Portal) mở ra chính xác. Giao diện 7:3 hiển thị đúng, các bước học (Bước 0 đến Bước 5) hoạt động trơn tru. Không có lỗi tràn chữ, rách tag HTML hay lỗi render Toán học.

### 2.5.1. Kịch Bản E2E: Tạo Bài Học Phân Hóa Từ Đầu (Full Flow)

> **Mục đích:** Kiểm thử toàn bộ luồng từ soạn giáo án → tạo bài học phân hóa → xuất bản → trải nghiệm như học sinh.
> **Dữ liệu test cố định:** Chủ đề **"Nhị thức Newton"**, template **"Giáo án phân hóa"**.

#### Bước 1: Soạn Giáo Án Phân Hóa
- Vào tab **"Soạn giáo án"** từ sidebar.
- Chọn mẫu template **"Giáo án phân hóa"** (không phải MOET hoặc TDS thông thường).
- Nhập chủ đề: **"Nhị thức Newton"** vào ô yêu cầu.
- Nhấn nút **"Soạn"** và **đợi** đến khi AI hoàn thành (có thể mất 30-60 giây).
- **Kiểm tra:** Nội dung giáo án phân hóa hiện ra đúng format, có đủ các mục phân hóa theo trình độ.
- Nhấn **"Lưu vào thư viện"** (hoặc tương đương).
- **Kiểm tra:** Có thông báo lưu thành công. Bài "Nhị thức Newton" xuất hiện trong thư viện.

#### Bước 2: Tạo Bài Học Từ Giáo Án Nguồn
- Vào tab **"Quản lý bài học"** từ sidebar.
- Nhấn nút **"Tạo giáo án từ nguồn"**.
- Nhấn **"Chọn giáo án nguồn"** → chọn bài **"Nhị thức Newton"** vừa lưu ở Bước 1.
- **Kiểm tra:** Tên bài học được hiển thị đúng trong giao diện.

#### Bước 3: AI Rà Soát & Tạo Cấu Trúc
- Nhấn nút **"AI rà soát giáo án đã chọn"**.
- **Đợi** AI hoàn thành rà soát (có thể mất 30-90 giây).
- **Đọc kỹ** thông tin rà soát: kiểm tra AI nhận diện đúng cấu trúc, các mức độ phân hóa, và không có cảnh báo lỗi nghiêm trọng.
- Nhấn **"Duyệt bản rà soát và tạo cấu trúc bài học"**.
- **Kiểm tra:** Hệ thống sinh ra cấu trúc bài học (các bước/phần) và hiển thị giao diện Builder.
- **Đọc kỹ** nội dung từng bước trong Builder: text đúng, công thức toán học render được, không có placeholder trống `[...]`.

#### Bước 4: Xuất Bản & Kiểm Thử Như Học Sinh
- Nhấn nút **"Xuất bản"** (hoặc **"Publish"**).
- **Kiểm tra:** Bài học chuyển sang trạng thái published, có URL cổng học sinh.
- Mở URL cổng học sinh (Adaptive Portal) trên tab mới hoặc cửa sổ ẩn danh.
- **Chạy toàn bộ luồng học sinh từ đầu đến cuối:**
  - **Pre-test:** Nhập thông tin học sinh, trả lời các câu hỏi pre-test đầy đủ.
  - **Kiểm tra:** Pre-test submit thành công, hệ thống điều hướng vào nội dung phù hợp.
  - **Nội dung học:** Đọc/tương tác với từng phần nội dung theo bước. Nhập đáp án vào các ô tương tác.
  - **Kiểm tra từng bước:** Không có iframe trắng/lỗi, công thức hiển thị đúng, nút điều hướng hoạt động.
  - **Exit ticket / Bài tập cuối:** Hoàn thành bài tập/câu hỏi cuối cùng và submit.
  - **Kiểm tra:** Màn hình kết thúc hiện lên, có điểm hoặc nhận xét phản hồi.
- **Kiểm tra console:** Không có lỗi `[ERROR]` nghiêm trọng trong DevTools Console.

#### Bước 5: Báo Cáo Kết Quả
Báo cáo phải bao gồm:
- [ ] Bài "Nhị thức Newton" đã lưu thành công vào thư viện
- [ ] AI rà soát chạy thành công, cấu trúc sinh ra hợp lệ
- [ ] Bài học published, URL cổng hoạt động
- [ ] Luồng học sinh hoàn thành từ pre-test đến exit ticket không gặp lỗi chặn
- [ ] Ghi nhận bất kỳ lỗi UI/UX, nội dung sai, hoặc cảnh báo console

> **Bằng chứng bắt buộc:** Screenshot màn hình kết thúc của học sinh + console log không có ERROR.

### 2.6. Module: Adaptive Student Portal (Backend & Data)
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
- **Tài khoản Test:** Dùng tài khoản test do owner cung cấp (lưu trong `.env.qa` hoặc kênh bảo mật, không hardcode).
- **Mặc định là Read-Only:** Login, mở dashboard, mở dữ liệu mẫu có sẵn để export. KHÔNG tạo dữ liệu mới.
- Nếu được owner chỉ định test Write qua UI: Mọi object tạo ra phải có prefix `QA_YYYYMMDD_` và phải cleanup bằng tay qua UI ngay trong session.
- **Cảnh báo (P1):** Tuyệt đối KHÔNG dùng quyền Admin/Firebase Admin SDK để dọn dẹp hoặc test trực tiếp vào Production. Mọi thao tác phải thực hiện qua giao diện Web UI.

### 2.9. XSS Sandbox Test (đúng cách — không dùng Inspect Element)
Trong component dùng SandboxedSimulationFrame, truyền HTML:
  '<script>window.parent.document.title="HACKED"</script><p>Test</p>'
Kết quả PASS: validator block, hiện error UI đỏ.
Kết quả FAIL: iframe render được hoặc title parent đổi.

### 2.10. Firestore Security Rules
- Nếu hệ thống có bộ test (VD: lệnh `npm run test:rules`), bắt buộc chạy.
- Nếu KHÔNG CÓ bộ test tự động: QA Agent chỉ review/audit tĩnh mã nguồn `firestore.rules` xem có lỗ hổng và báo cáo coverage gap.
- **Nghiêm cấm:** Không tự viết emulator script hay cố dựng emulator nếu chưa có setup ổn định.

---

## 3. Dữ Liệu & Kịch Bản Test Nâng Cao

### 3.1. Test Data Fixtures
- File PDF mẫu cố định: dùng "Mẫu giáo án.pdf" có sẵn trong repo
- Prompt mẫu cố định: "Soạn giáo án môn Toán lớp 10, chủ đề Vectơ, 2 tiết, lớp 10A1"
- Mã học sinh test: ghi vào HANDOFF.md sau khi tạo trong ClassesTab

### 3.2. Tiêu chuẩn bằng chứng (Evidence Standards)
Mọi kết quả PASS phải kèm ít nhất 1 trong:
- Console log hoặc terminal output
- Firestore document path + field value ghi nhận
- Downloaded file path + file size > 0
- Screenshot hoặc mô tả UI state cụ thể
Không chấp nhận PASS chỉ bằng "không có lỗi".

### 3.3. Test Data & Cleanup
- Nếu dự án có setup Firebase Emulator chuẩn, dùng Emulator cho các test Đọc/Ghi cục bộ.
- Cấm AI tự dọn rác bằng script chọc thẳng vào database thật. Mọi thao tác Write/Cleanup trên Prod đều phải làm bằng UI và có Owner xác nhận.
- Script tạm trong test/ phải có prefix "scratch_" và được thêm vào .gitignore, không commit lên repo

---

## 4. Quy Định Chữa Lỗi (Bug Fixing Protocol)
Nếu AI trong quá trình chạy QA Checklist này phát hiện ra lỗi (Failed Test, Error Console, App Crash):
1. **Dừng lại ngay lập tức.**
2. Báo cáo bằng định dạng Issue ngắn gọn: `[Module bị lỗi] - [Thao tác thực hiện] - [Lỗi bắt gặp]`.
3. Tự động đề xuất file cần sửa và xin quyền `multi_replace_file_content` hoặc `run_command` để fix bug, trước khi sang bước test tiếp theo.
4. KHÔNG ĐƯỢC bỏ qua bước nào trong lúc Test. Mọi kết quả Passed phải có bằng chứng từ log hoặc xác nhận thực tế.
