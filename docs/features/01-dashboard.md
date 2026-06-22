# Tài liệu Chức năng: Dashboard (Bảng điều khiển)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Cung cấp cho giáo viên một cái nhìn tổng quan nhanh về hiệu suất giảng dạy cá nhân, các số liệu thống kê học liệu, lối tắt truy cập nhanh các tính năng cốt lõi và đề xuất hành động tiếp theo để tiếp tục làm việc mà không bị gián đoạn.
- **Luồng hoạt động chính:**
  1. Giáo viên đăng nhập vào hệ thống, màn hình mặc định hiển thị là Bảng điều khiển (Dashboard).
  2. Hệ thống chào mừng giáo viên bằng tên riêng (tách từ trường `authorName` trong cấu hình).
  3. Hệ thống hiển thị 5 thẻ thống kê chính: Tổng số giáo án, số giáo án đã chia sẻ cộng đồng, số mẫu cấu trúc (template), số môn học đã cấu hình và số bài tự luận đã chấm bằng AI.
  4. Phần **"Gợi ý tiếp theo"** thông minh: Nếu giáo viên đã có giáo án soạn dở trước đó, hệ thống sẽ gợi ý tiêu đề giáo án gần nhất kèm nút "Mở workspace" để tiếp tục soạn thảo ngay lập tức. Nếu chưa có, hệ thống hướng dẫn bấm nút "Soạn bài ngay".
  5. Mục **"Lối tắt truy cập nhanh"** cho phép chuyển hướng nhanh sang các tab: Soạn giáo án, Soạn đề kiểm tra, và Thư viện.
  6. Danh sách **"Giáo án gần đây"** liệt kê tối đa 5 giáo án cập nhật mới nhất. Nhấn vào bất kỳ giáo án nào sẽ tải giáo án đó vào trình soạn thảo và tự động chuyển sang tab Creator.
  7. Nếu giáo viên đã từng thực hiện các phiên chấm điểm tự luận bằng AI, Dashboard sẽ tự động hiển thị biểu đồ phân tích lớp học (**Learning Analytics**) ở phía dưới cùng để theo dõi phổ điểm và thống kê kết quả học tập.

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/DashboardTab.tsx`: Component chứa toàn bộ giao diện chính của tab Dashboard, tính toán các số liệu thống kê thô từ dữ liệu trạng thái.
  - `src/components/features/LearningAnalytics.tsx`: Component hiển thị biểu đồ phân tích phổ điểm học tập dựa trên lịch sử các phiên chấm bài.
- **Trạng thái & Hooks (State Management):**
  - Trạng thái được quản lý tập trung ở cấp Root `src/App.tsx` thông qua hook `useAppState(user, showToast)`.
  - Các props truyền xuống `DashboardTab.tsx`:
    - `data`: Toàn bộ dữ liệu của giáo viên (chứa giáo án, môn học, phiên chấm điểm, v.v.).
    - `setCurrentPlan`: Hàm gán giáo án hiện tại đang biên soạn.
    - `setActiveTab`: Hàm chuyển đổi tab hiển thị trên thanh Sidebar.
- **Cơ sở dữ liệu (Firestore):**
  - Dữ liệu thống kê được tổng hợp trực tiếp từ các collection Firestore liên kết với tài khoản người dùng: `lessonPlans`, `templates`, `gradingSessions`.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Kiểu dữ liệu chính (TypeScript Interface):**
  Dữ liệu đầu vào của Dashboard phụ thuộc vào interface `AppData` từ `src/types.ts`:
  ```typescript
  export interface AppData {
    authorName: string;
    subjects: Subject[];
    lessonPlans: LessonPlan[];
    templates: Template[];
    gradingSessions: GradingSession[];
    settings: Settings;
  }
  ```
- **Xử lý logic hiển thị:**
  - Tách tên giáo viên hiển thị:
    ```typescript
    const teacherName = data.authorName?.split(' ').pop() || 'Thầy/Cô';
    ```
  - Tính toán tổng số lượng bài viết tự luận đã chấm thành công bằng AI:
    ```typescript
    const totalGraded = (data.gradingSessions || []).reduce(
      (sum, s) => sum + s.results.filter(r => r.status === 'completed').length,
      0
    );
    ```

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Hiển thị thông tin cá nhân hóa**
    - *Hành vi:* Đăng nhập bằng tài khoản có cấu hình tên tác giả là "Nguyễn Văn A".
    - *Kết quả mong đợi:* Banner chào mừng hiển thị chính xác cụm từ "Chào A, hôm nay mình tối ưu bài dạy nào?".
  - [ ] **Test Case 2: Kiểm tra liên kết giáo án gần đây**
    - *Hành vi:* Nhấp vào một giáo án trong danh sách "Giáo án gần đây".
    - *Kết quả mong đợi:* Hệ thống tự động chuyển sang tab "Creator" và hiển thị đúng nội dung của giáo án vừa chọn trong khung soạn thảo.
  - [ ] **Test Case 3: Ẩn/Hiện phân tích phổ điểm học tập (Learning Analytics)**
    - *Hành vi:* Kiểm tra màn hình Dashboard của một tài khoản mới tinh (chưa có lịch sử chấm bài) và một tài khoản cũ đã có lịch sử chấm bài.
    - *Kết quả mong đợi:* Tài khoản mới không hiển thị mục đồ thị phân tích ở dưới cùng; tài khoản cũ hiển thị đầy đủ biểu đồ phổ điểm trực quan.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Dashboard bị treo trắng màn hình khi người dùng mới đăng nhập lần đầu.
  - *Nguyên nhân:* Trường `data.lessonPlans` hoặc `data.gradingSessions` bị `undefined` (chưa được khởi tạo trong Firebase).
  - *Cách kiểm tra/Khắc phục:* Đã bổ sung toán tử optional chaining `?.` và giá trị fallback ở tất cả các vòng lặp tính toán: `data.lessonPlans?.length || 0`, `(data.gradingSessions || [])`. Khi debug cần đảm bảo dữ liệu truyền từ `useAppState` luôn có giá trị mặc định dạng mảng trống.
