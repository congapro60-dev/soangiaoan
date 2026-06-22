# Tài liệu Chức năng: Library (Thư viện)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Quản lý toàn bộ tài nguyên học liệu của giáo viên tại một nơi duy nhất. Cho phép tìm kiếm, lọc, nhân bản, chia sẻ và thực hiện các tác vụ xuất bản nhanh (PPTX, Phiếu học tập, SCORM) cho cả Giáo án (Lesson Plans) và Đề thi (Exams).
- **Phân loại bộ nhớ:**
  1.  **Góc của tôi (Personal Library):** Lưu trữ giáo án và đề thi cá nhân của giáo viên, đồng bộ trực tiếp với tài khoản người dùng thông qua Firestore.
  2.  **Kho chung (Community Library):** Kho dữ liệu chia sẻ công khai từ cộng đồng giáo viên khác sử dụng ứng dụng.
- **Luồng hoạt động chính:**
  1.  Giáo viên có thể chuyển đổi giữa hai loại học liệu chính: **Giáo án** và **Đề thi** thông qua các tab riêng biệt.
  2.  Thanh tìm kiếm và bộ lọc nhanh bên cột trái hỗ trợ lọc học liệu theo **Khối lớp (Khối 1 - 12)** và **Tuần học (Tuần 1 - 35)**.
  3.  Trên mỗi thẻ học liệu, khi di chuột qua, hệ thống sẽ hiện ra thanh công cụ thao tác nhanh:
      - **Tải nhanh Slide (PPTX):** AI tự động tóm tắt nội dung giáo án thành cấu trúc slide JSON và xuất file `.pptx` (chứa các công thức Toán học đẹp mắt).
      - **Tạo Phiếu học tập (Worksheet):** AI tự động sinh Phiếu học tập tại lớp và tải xuống dưới dạng file Word `.doc`.
      - **Xuất SCORM:** Đóng gói giáo án thành file nén chuẩn SCORM để đưa lên các LMS (Moodle, Canvas).
      - **Xem preview:** Mở hộp thoại xem nhanh nội dung tĩnh của giáo án/đề thi (`ViewPlanModal`).
      - **Chia sẻ / Thu hồi:** Đưa học liệu cá nhân lên Kho chung hoặc gỡ xuống.
      - **Nhân bản (Duplicate):** Tạo một bản sao giống hệt của giáo án vào kho cá nhân.
      - **Sửa nhanh:** Sửa tiêu đề, khối lớp, tuần học trực tiếp trên thẻ mà không cần vào editor.
      - **Xóa:** Xóa vĩnh viễn học liệu khỏi tài khoản (yêu cầu xác nhận qua SweetAlert2).
  4.  Tính năng phân trang thông minh: Khi danh sách quá dài, nút "Tải thêm giáo án..." sẽ xuất hiện để tải thêm dữ liệu mà không làm chậm trình duyệt (Pagination).

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/LibraryTab.tsx`: Component giao diện chính hiển thị thư viện, xử lý các sự kiện click, bộ lọc và các hàm xuất bản nhanh.
  - `src/components/modals/ViewPlanModal.tsx`: Hộp thoại xem trước toàn bộ nội dung Markdown của giáo án.
- **Trạng thái & Hooks (State Management):**
  - Các hàm xử lý nghiệp vụ được truyền từ `src/App.tsx` và `src/hooks/useAppState.ts` / `src/hooks/useSavedExams.ts`:
    - `duplicatePlan`, `deletePlan`, `updatePlanMetadata`, `toggleSharePlan`: Quản lý giáo án.
    - `savedExams`, `communityExams`, `onDeleteExam`, `onToggleShareExam`, `onOpenExamInEditor`, `onFetchCommunityExams`: Quản lý đề kiểm tra.
- **Logic & Tiện ích (Utilities):**
  - `src/utils/exportUtils.ts`: Xử lý sinh slide tự động và tải file PPTX (`generateSlideData`, `downloadPPTX`).
  - `src/utils/worksheetUtils.ts`: Xử lý sinh nội dung phiếu học tập (`generateInclassWorksheetMarkdown`).
  - `src/utils/scormUtils.ts`: Đóng gói file SCORM dạng zip (`exportToSCORM`).
  - `src/utils/fileUtils.ts`: Hàm hỗ trợ tải file (`downloadBlob`).

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Kiểu dữ liệu chính (TypeScript Interface):**
  Học liệu giáo án và đề thi được định nghĩa trong `src/types.ts` và `src/hooks/useSavedExams.ts`:
  ```typescript
  export interface LessonPlan {
    id: string;
    title: string;
    content: string;
    subjectId: string;
    grade: string;
    week: string;
    templateId: string;
    isPublic: boolean;
    authorName: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface SavedExam {
    id: string;
    title: string;
    content: string;
    subject: string;
    grade: string;
    authorName: string;
    userId: string;
    isPublic: boolean;
    questionCount: number;
    createdAt: string;
    updatedAt: string;
  }
  ```
- **Xử lý đếm từ và số phần hiển thị:**
  Hệ thống tính toán sơ bộ dung lượng giáo án dựa trên biểu thức chính quy (Regex):
  - *Số phần (headings):* Đếm số lượng dòng bắt đầu bằng ký tự `#` hoặc từ khóa tiếng Việt như "mục tiêu", "khởi động", "luyện tập".
  - *Số từ:* Đếm số lượng từ phân tách bởi khoảng trắng.

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Tìm kiếm và bộ lọc kết hợp**
    - *Hành vi:* Chọn Khối "10", Tuần "3" và nhập từ khóa "Hình học" vào ô tìm kiếm.
    - *Kết quả mong đợi:* Danh sách giáo án cập nhật ngay lập tức chỉ hiển thị các giáo án thỏa mãn đồng thời cả 3 điều kiện trên.
  - [ ] **Test Case 2: Chia sẻ và Đồng bộ Kho chung**
    - *Hành vi:* Tại Góc của tôi, bấm vào biểu tượng đám mây để chia sẻ giáo án A.
    - *Kết quả mong đợi:* Hiện thông báo chia sẻ thành công. Chuyển sang Kho chung sẽ nhìn thấy giáo án A xuất hiện trong danh sách cộng đồng.
  - [ ] **Test Case 3: Xuất nhanh Slide (PPTX)**
    - *Hành vi:* Bấm vào biểu tượng Presentation (PPTX) trên một giáo án.
    - *Kết quả mong đợi:* Icon đổi thành biểu tượng quay tải (loading), sau khi AI xử lý xong, trình duyệt tự động tải xuống file `.pptx` mở ra không bị lỗi cấu trúc slide.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Bấm tải Slide nhanh (PPTX) bị xoay vòng mãi không tải được hoặc báo lỗi.
  - *Nguyên nhân:* Giáo án quá dài hoặc nội dung không theo cấu trúc chuẩn khiến prompt AI trả về JSON sai định dạng, làm vỡ hàm `JSON.parse`.
  - *Cách kiểm tra/Khắc phục:* Kiểm tra bảng điều khiển console của trình duyệt. Nếu có lỗi parse JSON, cần cập nhật hàm bóc tách Regex để gọt bỏ sạch sẽ các ký tự thừa xung quanh khối mã JSON do AI sinh ra trước khi chạy `JSON.parse` (tương tự như hàm bóc tách đã được tối ưu hóa ở cổng Adaptive).
