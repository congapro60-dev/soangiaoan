# Tài liệu Chức năng: Templates (Quản lý Mẫu & Cấu trúc)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Cho phép tổ bộ môn hoặc cá nhân giáo viên định nghĩa các bộ khung cấu trúc bài học tiêu chuẩn và tiêu chí đánh giá để AI học hỏi phong cách viết, văn phong sư phạm và quy cách trình bày đặc trưng của nhà trường.
- **Luồng hoạt động chính:**
  1.  **Tạo bộ mẫu mới (Template Folder):**
      - Giáo viên nhấn nút "Thêm mẫu mới". Hệ thống sẽ tạo một bộ lưu trữ trống liên kết với một môn học cụ thể (ví dụ: Toán, Ngữ văn...).
  2.  **Tải lên Giáo án mẫu (Sample Files):**
      - Giáo viên tải lên các tệp bài giảng mẫu có sẵn dưới dạng Word (.docx), PDF hoặc text.
      - Hệ thống tự động bóc tách văn bản thô và trích xuất cấu trúc thành **Document Skeleton** (khung tài liệu Markdown MVP).
      - Document Skeleton thống kê rõ số lượng Tiêu đề (Headings), số lượng Bảng biểu (Tables) và số lượng vị trí cần điền dữ liệu (Placeholders).
  3.  **Tải lên Tiêu chí & Quy định (Criteria Files):**
      - Giáo viên tải lên các tệp quy chế thi cử, tiêu chí chấm điểm, rubric học tập, hoặc văn bản quy định của Bộ GD&ĐT (tối đa 10 tệp). AI sẽ đọc các ràng buộc này mỗi khi soạn giáo án hoặc đề thi mới.
  4.  **Hiệu chỉnh Skeleton thủ công:**
      - Giáo viên nhấp vào "Xem Markdown Skeleton" dưới mỗi tệp giáo án mẫu để kiểm tra.
      - Bấm nút "Sửa" để thay đổi trực tiếp cấu trúc khung (ví dụ: thêm bớt thẻ tiêu đề hoặc chỉnh vị trí bảng).
      - Nếu chỉnh sửa bị lỗi hoặc muốn làm lại từ đầu, giáo viên bấm "Khôi phục tự động" để hệ thống tự động sinh lại Skeleton chuẩn từ file đính kèm gốc.
  5.  **Áp dụng:**
      - Các bộ mẫu và Skeleton này sẽ xuất hiện dưới dạng tùy chọn trong tab Creator (Soạn giáo án) và tab Testing (Soạn đề thi).

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components):**
  - `src/components/tabs/TemplatesTab.tsx`: Component hiển thị danh mục các bộ mẫu, thống kê số lượng file và xử lý giao diện biên tập Skeleton Markdown.
- **Bóc tách cấu trúc (State & Utilities):**
  - `src/lib/documentSkeleton.ts`: Chứa các hàm cốt lõi để tạo skeleton tự động (`createDocumentSkeleton`), tính toán lại skeleton từ markdown sửa đổi (`recalculateSkeletonFromMarkdown`) và kiểm tra độ khớp cấu trúc.
  - `src/types/index.ts`: Định nghĩa mô hình dữ liệu bộ mẫu `TemplateFile`.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Trích xuất Document Skeleton:**
  Khi giáo viên tải lên một tệp giáo án mẫu `.docx`, hệ thống sử dụng module `documentSkeleton` để phân tích các dòng văn bản. Hệ thống tìm kiếm các tiêu đề (ví dụ: bắt đầu bằng `#` hoặc dòng chữ in đậm dạng mục lớn), đếm số hàng/cột của bảng biểu, và các ký tự dạng `[Điền vào đây]` để gán thành Placeholders.
  Mã trạng thái Skeleton lưu trữ bao gồm:
  ```typescript
  export interface DocumentSkeleton {
    markdown: string; // Khung Markdown tối giản chỉ giữ lại cấu trúc tiêu đề, bảng và placeholder
    stats: {
      headingCount: number;
      tableCount: number;
      placeholderCount: number;
    };
  }
  ```
- **Lưu trữ:**
  Dữ liệu bộ mẫu lưu trữ trực tiếp trong `AppData.templates` của bộ nhớ local hoặc đồng bộ hóa Firestore.

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Tạo bộ mẫu và tải lên file Word**
    - *Hành vi:* Nhấn "Thêm mẫu mới" -> Tải một file `.docx` chứa giáo án mẫu môn Toán lớp 10 vào cột "Giáo án mẫu".
    - *Kết quả mong đợi:* Tệp tải lên thành công. Thông tin thống kê Skeleton hiển thị (ví dụ: 12 heading, 2 bảng). Nút xóa hoạt động bình thường.
  - [ ] **Test Case 2: Chỉnh sửa Skeleton thủ công**
    - *Hành vi:* Nhấp chi tiết Skeleton, bấm "Sửa". Thêm một tiêu đề dòng `### Hoạt động 6: Tổng kết` vào khung textarea và nhấn "Lưu".
    - *Kết quả mong đợi:* Số lượng Heading thống kê tăng thêm 1 đơn vị. Khung hiển thị hiển thị chính xác dòng tiêu đề vừa thêm.
  - [ ] **Test Case 3: Khôi phục Skeleton tự động**
    - *Hành vi:* Vào chế độ sửa Skeleton, xóa sạch toàn bộ nội dung trong textarea và nhấn "Lưu". Sau đó nhấn "Khôi phục tự động" và xác nhận.
    - *Kết quả mong đợi:* Hệ thống phục hồi lại toàn bộ cấu trúc Markdown ban đầu của tệp Word.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Giáo viên tải file lên nhưng không hiển thị Skeleton thống kê (số lượng đều bằng 0).
  - *Nguyên nhân:* Tệp tải lên là file PDF dạng ảnh quét (scanned) không có text thô hoặc file chứa định dạng bảng biểu quá phức tạp khiến bộ phân tích parser không nhận diện được.
  - *Cách kiểm tra/Khắc phục:* Trong component `TemplatesTab.tsx`, chỉ chạy bóc tách Skeleton đối với các tệp có văn bản đọc được:
    ```typescript
    const skeleton = content && !content.startsWith('data:image/') ? createDocumentSkeleton(content, file.name) : undefined;
    ```
    Hãy khuyên giáo viên sử dụng tệp `.docx` được lưu trực tiếp từ Microsoft Word để đảm bảo cấu trúc văn bản thô sạch nhất.

---

## 5. Ghi chú kiểm thử thực tế (Practical QA Notes)

> **Trạng thái:** ⚠️ *Suy từ code — chưa kiểm thử trực tiếp tab này trong đợt vừa rồi.* Phần dưới chuẩn hóa cách chạy checklist.

### 5.1. Định dạng Test Case nên dùng
Mỗi case: **bước thao tác cụ thể** → **kết quả mong đợi** → **cách xác minh** (số liệu Skeleton / nội dung Markdown / console).

### 5.2. Cách xác minh & quirk
- Tải `.docx` → kiểm thống kê Skeleton (số heading/bảng/placeholder) khớp tài liệu thật.
- Sửa Skeleton thủ công: thêm `### ...` → số heading tăng đúng 1.
- Khôi phục tự động: xóa sạch rồi khôi phục → cấu trúc Markdown gốc trở lại.
- 🐞 **PDF scan / bảng phức tạp → Skeleton = 0:** parser chỉ chạy với file có text thật. Guard đã có:
  `const skeleton = content && !content.startsWith('data:image/') ? createDocumentSkeleton(...) : undefined;`
  Test bằng cả file text-thật lẫn PDF-ảnh để xác nhận guard đúng (file ảnh → undefined, không crash).

### 5.3. Lưu ý môi trường (chung)
- Production: `https://giaoandewey.vercel.app`. Khuyến nghị test bằng `.docx` lưu trực tiếp từ Word để parser bóc cấu trúc sạch nhất.
