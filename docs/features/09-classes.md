# Tài liệu Chức năng: Classes (Quản lý lớp học)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Cho phép giáo viên tổ chức lớp học, lập danh sách học sinh, phát hành mã định danh cá nhân (mã học sinh / SBD), quản lý sĩ số và theo dõi tiến độ học tập trung bình của từng tập thể lớp. Dữ liệu lớp học là nền tảng để giao đề trực tuyến hoặc liên kết học tập cá nhân hóa.
- **Luồng hoạt động chính:**
  1.  Giáo viên vào tab **Lớp học (Classes)**. Giao diện hiển thị 3 thẻ thống kê tổng quan: Tổng số lớp, Tổng số học sinh, và Số bài tập đang mở trên toàn bộ các lớp.
  2.  Danh sách lớp được hiển thị dưới dạng các thẻ màu (tone màu khác nhau). Mỗi thẻ chứa: Tên lớp, Khối lớp, Nhóm định hướng, Sĩ số, Số bài tập đang giao, và Thanh tiến độ hoàn thành bài giảng (%) của lớp học.
  3.  **Tạo lớp học mới:** 
      - Giáo viên nhấn nút "Tạo lớp mới", một hộp thoại (SweetAlert2) hiện lên yêu cầu điền "Tên lớp" (ví dụ: Lớp 10A3) và "Nhóm/Ghi chú" (ví dụ: Khối tự nhiên).
      - Hệ thống tự động phân loại khối lớp bằng cách trích xuất số từ tên lớp (ví dụ: "Lớp 12A1" -> Khối 12).
      - Tên lớp mới tạo không được trùng lặp với lớp đã có.
  4.  **Quản lý danh sách học sinh:**
      - Khi chọn một lớp học, bảng danh sách học sinh của riêng lớp đó sẽ tải ra ở phía dưới.
      - Giáo viên có thể tìm kiếm học sinh theo Tên hoặc Mã học sinh thông qua thanh tìm kiếm nhanh.
      - **Thêm học sinh mới:** Giáo viên nhập "Họ và tên" và "Mã học sinh / SBD". Nếu không nhập mã học sinh, hệ thống tự động sinh mã theo cú pháp: `[TênLớp]-[SốThứTự]`. Mã học sinh bắt buộc phải là duy nhất trong lớp học đó.
      - Danh sách hiển thị chi tiết: Họ tên (avatar chữ cái đầu), Mã học sinh, Tiến độ học tập cá nhân (dưới dạng %), và Trạng thái học tập tự động (Đang học / Cần hỗ trợ / Xuất sắc).
  5.  Phần **Gợi ý từ AI** ở cuối bảng hướng dẫn giáo viên ưu tiên hỗ trợ học sinh có tiến độ dưới 60% và cách liên kết dữ liệu lớp học với cổng thi trực tuyến hoặc bài học thích ứng.

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/ClassesTab.tsx`: Component quản lý toàn bộ giao diện từ danh sách lớp, tạo lớp, thêm học sinh cho đến bộ lọc tìm kiếm.
- **Trạng thái & Hooks (State Management):**
  - Sử dụng trực tiếp `data` và hàm cập nhật trạng thái `setData` truyền xuống từ `App.tsx` (liên kết với dữ liệu được đồng bộ liên tục lên Firestore thông qua hook `useAppState.ts`).
  - Quản lý trạng thái hiển thị cục bộ:
    - `selectedClassId`: ID lớp học đang được chọn để hiển thị danh sách học sinh.
    - `query`: Chuỗi tìm kiếm tên học sinh.
- **Cơ sở dữ liệu (Firestore):**
  - Dữ liệu lưu trong trường `classes` thuộc tài liệu thông tin của giáo viên trên Firebase Firestore.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Kiểu dữ liệu chính (TypeScript Interface):**
  Được định nghĩa chi tiết trong `src/types.ts`:
  ```typescript
  export interface Student {
    id: string;
    name: string;
    code: string;
    progress: number;
    status: 'active' | 'needs_support' | 'excellent';
  }

  export interface TeacherClass {
    id: string;
    name: string;
    track: string;
    grade: string;
    studentCount: number;
    activeAssignments: number;
    progress: number;
    tone: 'primary' | 'secondary' | 'tertiary' | 'warning';
    students: Student[];
  }
  ```
- **Hàm tiện ích nội bộ:**
  - *Tự động nhận diện khối lớp (grade):*
    ```typescript
    const grade = value.name.match(/\d+/)?.[0] || '10';
    ```
  - *Phân loại trạng thái học tập:*
    Trạng thái được định nghĩa tĩnh và ánh xạ màu sắc tương ứng:
    - `active` -> "Đang học" (Màu xanh dương)
    - `needs_support` -> "Cần hỗ trợ" (Màu vàng)
    - `excellent` -> "Xuất sắc" (Màu xanh lá)

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Chặn trùng tên lớp học**
    - *Hành vi:* Bấm "Tạo lớp mới", nhập tên lớp trùng khớp với một lớp học đang có (ví dụ: "Lớp 10A1").
    - *Kết quả mong đợi:* Hệ thống hiện thông báo lỗi "Lớp học mang tên Lớp 10A1 đã tồn tại!" và từ chối tạo mới.
  - [ ] **Test Case 2: Tự sinh mã học sinh khi bỏ trống**
    - *Hành vi:* Bấm "Thêm học sinh" vào lớp "10A1". Nhập tên học sinh là "Nguyễn Văn B" và để trống phần mã học sinh.
    - *Kết quả mong đợi:* Học sinh được thêm thành công với mã học sinh tự sinh có dạng `10A1-X` (với X là số thứ tự tăng dần).
  - [ ] **Test Case 3: Tìm kiếm học sinh**
    - *Hành vi:* Nhập tên học sinh hoặc một phần mã học sinh vào thanh tìm kiếm.
    - *Kết quả mong đợi:* Danh sách học sinh lọc động tức thì theo chữ cái gõ vào (không phân biệt hoa thường).

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Thêm học sinh thành công nhưng sĩ số lớp (studentCount) hiển thị bên ngoài thẻ lớp học không thay đổi.
  - *Nguyên nhân:* Khi thêm học sinh mới vào mảng `students`, lập trình viên quên cập nhật lại trường `studentCount` trên đối tượng lớp học.
  - *Cách kiểm tra/Khắc phục:* Trong hàm `addStudent` của file `ClassesTab.tsx`, dữ liệu state được cập nhật đảm bảo tăng chỉ số sĩ số lớp đồng thời: `return { ...item, students: [nextStudent, ...item.students], studentCount: item.studentCount + 1 }`. Cần kiểm tra xem có chỗ nào ghi đè làm mất đồng bộ này không.
