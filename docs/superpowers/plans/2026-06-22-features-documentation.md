# Web Application Features Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai viết 11 file tài liệu bằng tiếng Việt mô tả chi tiết cách hoạt động, cấu trúc code, kiểu dữ liệu và kịch bản kiểm thử cho toàn bộ các chức năng chính trên web tại thư mục `docs/features/`.

**Architecture:** Tạo cấu trúc thư mục `docs/features/` và viết lần lượt các file Markdown tiếng Việt theo đúng cấu trúc Hybrid Spec & QA Blueprint đã được phê duyệt. Thông tin được lấy trực tiếp từ mã nguồn thực tế của hệ thống.

**Tech Stack:** Markdown (tiếng Việt), TypeScript, React, Firestore, Git.

---

### Task 1: Tạo tài liệu cho nhóm Quản lý & Điều hướng (Dashboard, Thư viện, Quản lý lớp học)

**Files:**
- Create: `docs/features/01-dashboard.md`
- Create: `docs/features/03-library.md`
- Create: `docs/features/09-classes.md`

- [x] **Step 1: Viết tài liệu Dashboard (`docs/features/01-dashboard.md`)**
  Tài liệu phải mô tả:
  - Giao diện `DashboardTab.tsx` với luồng hiển thị kế hoạch tuần hiện tại, nút tạo nhanh giáo án/đề thi, danh sách hoạt động gần đây.
  - Cấu trúc mapping file liên quan: `src/components/tabs/DashboardTab.tsx`.
  - Luồng dữ liệu: Lấy danh sách lessonPlans từ `AppState`.
  - Kịch bản kiểm thử: Đăng nhập -> Kiểm tra hiển thị tên giáo viên, danh sách giáo án gần nhất, chuyển tab qua các phím tắt nhanh.

- [x] **Step 2: Viết tài liệu Thư viện học liệu (`docs/features/03-library.md`)**
  Tài liệu phải mô tả:
  - Phân vùng Thư viện cá nhân (Personal) và Kho cộng đồng (Community). Các tính năng tìm kiếm, phân trang (`loadMorePlans`), bộ lọc môn học/lớp, sao chép (duplicate), chia sẻ công khai (toggle share).
  - Cấu trúc file: `src/components/tabs/LibraryTab.tsx`, `useAppState.ts` (fetch/save logic), `useLessonPlanActions.ts`.
  - Kiểu dữ liệu: `LessonPlan` và `Exam` trong `src/types.ts`.
  - Kịch bản kiểm thử: Tìm kiếm giáo án -> Nhân bản giáo án cá nhân -> Chuyển sang Thư viện cộng đồng -> Tải thêm tài liệu (infinite scroll).

- [x] **Step 3: Viết tài liệu Quản lý lớp học (`docs/features/09-classes.md`)**
  Tài liệu phải mô tả:
  - Cách giáo viên tạo lớp học mới, tạo mã lớp học tự động (classCode), thêm học sinh vào danh sách bằng cách nhập tay hoặc import.
  - Cấu trúc file: `src/components/tabs/ClassesTab.tsx`, `useAppState.ts` (quản lý state lớp học trong Firestore).
  - Kiểu dữ liệu: `Class` và `Student` trong `src/types.ts`.
  - Kịch bản kiểm thử: Tạo lớp học mới -> Thêm học sinh -> Copy mã lớp chia sẻ cho học sinh -> Xóa lớp học.

- [x] **Step 4: Chạy kiểm tra định dạng Markdown**
  Đảm bảo không có thẻ lỗi, liên kết file chính xác.

- [x] **Step 5: Commit kết quả Task 1**
  Run:
  ```powershell
  git add docs/features/01-dashboard.md docs/features/03-library.md docs/features/09-classes.md
  git commit -m "docs: add features documentation for dashboard, library, and classes"
  ```

---

### Task 2: Tạo tài liệu cho nhóm Soạn thảo & Trợ lý AI (Creator, Soạn đề, AI Tools, Chat Co-pilot)

**Files:**
- Create: `docs/features/02-creator-lesson-plan.md`
- Create: `docs/features/04-testing-exam.md`
- Create: `docs/features/08-ai-tools.md`
- Create: `docs/features/10-chat-copilot.md`

- [x] **Step 1: Viết tài liệu Soạn giáo án (`docs/features/02-creator-lesson-plan.md`)**
  Tài liệu phải mô tả:
  - Quy trình sinh giáo án 3 bước: Lập kế hoạch (PlanningAgent) -> Soạn nội dung (ContentAgent) -> Định dạng (FormatAgent).
  - Tính năng phụ trợ: Text-to-Slide Automation (dán văn bản thô -> xuất PPTX), Tạo Phiếu học tập tại lớp (bảng 2 cột) và Bài tập về nhà (ma trận 2025).
  - Công cụ xuất bản: Word (Native OMML via mathml2omml), PDF (window.print local), LaTeX.
  - Cấu trúc file: `src/components/tabs/CreatorTab.tsx`, `useLessonCreator.ts`, `src/lib/agents/Coordinator.ts`, `src/utils/exportUtils.ts`, `src/utils/worksheetUtils.ts`.
  - Kịch bản kiểm thử: Soạn giáo án mới -> Xem tiến trình phần trăm -> Tạo slide nhanh từ text -> Xuất file Word và kiểm tra công thức Toán.

- [x] **Step 2: Viết tài liệu Soạn đề kiểm tra (`docs/features/04-testing-exam.md`)**
  Tài liệu phải mô tả:
  - Biên soạn đề từ ma trận (Smart Grid), upload file đề cũ và bóc tách câu hỏi, Math OCR nhận dạng công thức toán qua camera/tải ảnh.
  - Cấu trúc file: `src/components/tabs/TestingTab.tsx`, `src/components/features/testing/MathOcrUploader.tsx`, `src/utils/examUtils.ts`, `src/utils/examWordExport.ts`.
  - Kịch bản kiểm thử: Tải lên file đề mẫu -> Chạy OCR nhận dạng công thức toán -> Tải file đề dạng Word/PDF -> Lưu đề thi vào Thư viện.

- [x] **Step 3: Viết tài liệu Công cụ AI nâng cao (`docs/features/08-ai-tools.md`)**
  Tài liệu phải mô tả:
  - Prompt Architect (Chuyển đổi ý tưởng tự nhiên thành System Prompt chuẩn cấu trúc JSON để lưu trữ cấu hình).
  - Cấu trúc file: `src/components/tabs/AIToolsTab.tsx`, `src/utils/promptBuilder.ts`.
  - Kịch bản kiểm thử: Nhập ý tưởng prompt thô -> Nhấn Sinh prompt hệ thống -> Copy prompt JSON kết quả.

- [x] **Step 4: Viết tài liệu Trợ lý Chat đa nhiệm (`docs/features/10-chat-copilot.md`)**
  Tài liệu phải mô tả:
  - Khung chat chính của hệ thống và Widget bong bóng chat nổi (Floating Chat Widget) đồng bộ ngữ cảnh giáo án.
  - Kỹ thuật "Magic Tags" `<UPDATE_EDITOR>` bóc tách kết quả AI để tự động sửa đổi giáo án trên editor mà không cần copy-paste.
  - Cấu trúc file: `src/components/tabs/ChatTab.tsx`, `src/components/layout/FloatingChatWidget.tsx`, `useChat.ts`.
  - Kịch bản kiểm thử: Mở widget chat khi đang soạn giáo án -> Hỏi đáp dựa trên nội dung giáo án -> Ra lệnh cho AI sửa bài -> Kiểm tra xem giáo án trên editor có tự động thay đổi không.

- [x] **Step 5: Commit kết quả Task 2**
  Run:
  ```powershell
  git add docs/features/02-creator-lesson-plan.md docs/features/04-testing-exam.md docs/features/08-ai-tools.md docs/features/10-chat-copilot.md
  git commit -m "docs: add features documentation for creator, testing, ai-tools, and chat-copilot"
  ```

---

### Task 3: Tạo tài liệu cho nhóm Đánh giá, Học tập cá nhân hóa & Mẫu cấu trúc (Chấm điểm AI, Kỳ thi trực tuyến, Học tập thích ứng, Skeletons)

**Files:**
- Create: `docs/features/05-grading.md`
- Create: `docs/features/06-exams.md`
- Create: `docs/features/07-adaptive-learning.md`
- Create: `docs/features/11-templates-skeletons.md`

- [x] **Step 1: Viết tài liệu Chấm điểm AI (`docs/features/05-grading.md`)**
  Tài liệu phải mô tả:
  - Luồng tải ảnh bài làm viết tay của học sinh -> AI nhận diện chữ và công thức -> Chấm điểm từng bước theo barem điểm (Rubric) chi tiết -> Đưa ra phân tích lỗi sai và điểm số.
  - Cấu trúc file: `src/components/tabs/GradingTab.tsx`, `src/components/features/grading/GradingNewSession.tsx`, `src/utils/gradingUtils.ts`.
  - Kịch bản kiểm thử: Tạo phiên chấm điểm mới -> Nhập đề bài & barem -> Tải lên ảnh bài làm học sinh -> Xem kết quả chấm chi tiết của AI và thống kê phổ điểm.

- [x] **Step 2: Viết tài liệu Kỳ thi trực tuyến (`docs/features/06-exams.md`)**
  Tài liệu phải mô tả:
  - Tạo kỳ thi trực tuyến từ đề kiểm tra có sẵn, phát hành mã đề thi (examCode), học sinh làm bài trắc nghiệm trực tuyến và lưu kết quả tự động vào Firestore.
  - Cấu trúc file: `src/components/tabs/ExamsTab.tsx`, `src/pages/StudentExamPage.tsx`.
  - Kịch bản kiểm thử: Đăng ký kỳ thi -> Học sinh truy cập link phòng thi -> Làm bài và nộp bài -> Kiểm tra bảng điểm lớp học.

- [x] **Step 3: Viết tài liệu Học tập thích ứng (`docs/features/07-adaptive-learning.md`)**
  Tài liệu phải mô tả:
  - Thiết kế luồng học tập phân hóa (Adaptive Learning Path): Pre-test phân loại -> Sinh lộ trình (Cốt lõi, Nâng cao, Hỗ trợ) -> Học sinh học qua Student Portal -> Đánh giá Post-test.
  - Cấu trúc file: `src/components/tabs/AdaptiveLearningTab.tsx`, `src/pages/AdaptiveLessonBuilderPage.tsx`, `src/pages/AdaptiveStudentPortalPage.tsx`, các file logic trong `src/lib/adaptive/*`.
  - Kịch bản kiểm thử: Tạo bài học thích ứng mới -> Thiết kế cây bài học (Lesson Tree) -> Mở link Student Portal làm thử pre-test -> Thay đổi độ khó thích ứng tương ứng.

- [x] **Step 4: Viết tài liệu Quản lý Mẫu & Khung cấu trúc (`docs/features/11-templates-skeletons.md`)**
  Tài liệu phải mô tả:
  - Upload file mẫu tạo skeleton, màn hình chỉnh sửa thủ công skeleton (Manual Skeleton Editor).
  - Trình validator kiểm tra cấu trúc đầu ra của AI so với skeleton (Markdown Skeleton Validator), hệ thống chốt chặn an toàn khi xuất bản (Guardrails).
  - Cấu trúc file: `src/components/tabs/TemplatesTab.tsx`, `src/lib/documentSkeleton.ts`, `src/utils/guardrailUtils.ts`.
  - Kịch bản kiểm thử: Tạo template mới -> Sửa skeleton thô -> Chạy sinh giáo án và cố tình làm lệch cấu trúc -> Kiểm tra xem modal Guardrails (SweetAlert2) cảnh báo hoặc chặn xuất bản.

- [x] **Step 5: Commit kết quả Task 3**
  Run:
  ```powershell
  git add docs/features/05-grading.md docs/features/06-exams.md docs/features/07-adaptive-learning.md docs/features/11-templates-skeletons.md
  git commit -m "docs: add features documentation for grading, exams, adaptive, and skeletons"
  ```

