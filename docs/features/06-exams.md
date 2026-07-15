# Tài liệu Chức năng: Exams (Kỳ thi & Phòng thi trực tuyến)

## 1. Cách hoạt động (User Flow & Business Logic)
- **Mục tiêu:** Cung cấp giải pháp tổ chức kiểm tra và thi cử trực tuyến khép kín: từ khâu phát hành đề thi, phòng thi bảo mật cho học sinh làm bài, tự động chấm điểm trắc nghiệm, hỗ trợ AI chấm câu hỏi tự luận, đến khâu thống kê phổ điểm và xuất kết quả.
- **Luồng hoạt động chính:**
  1.  **Phát hành phòng thi (Giáo viên):**
      - Từ một đề thi đã tạo (soạn bằng AI hoặc import file Excel/Word), giáo viên tiến hành thiết lập thông tin phòng thi: đặt thời gian làm bài, cấu hình đảo thứ tự câu hỏi (shuffle), cho phép xem đáp án sau khi nộp, và đặt thời gian mở/đóng đề thi.
      - Hệ thống cấp một mã phòng thi độc nhất (ví dụ: `#A8G9`) kèm link và mã QR: `/exam/{code}`.
      - Giáo viên bật công tắc **Mở đề** để cho phép học sinh vào thi.
  2.  **Làm bài thi trực tuyến (Học sinh):**
      - Học sinh truy cập link phòng thi, nhập Họ & tên và Lớp để bắt đầu làm bài.
      - Giao diện làm bài hiển thị đồng hồ đếm ngược. Hệ thống hỗ trợ 4 loại câu hỏi chuẩn Bộ GD&ĐT: trắc nghiệm 4 lựa chọn, câu hỏi Đúng/Sai (True/False) đa ý, câu hỏi Trả lời ngắn và câu tự luận.
      - **Tự động lưu bài làm (Autosave):** Mỗi 3 giây, hệ thống tự động lưu trạng thái câu trả lời tạm thời của học sinh lên Firestore để phòng ngừa sự cố mất điện, mất mạng đột ngột.
      - **Tính năng Chống gian lận (Tab Switching Detection):** Hệ thống theo dõi sự kiện ẩn/hiện trình duyệt. Mỗi lần học sinh chuyển tab hoặc thu nhỏ màn hình, hệ thống sẽ bật cảnh báo nhấp nháy trên màn hình và tự động cộng 1 vào chỉ số `tabSwitches` lưu trên Firestore.
      - Khi hết giờ, hệ thống tự động khóa bài làm và nộp bài lên server.
  3.  **Chấm điểm & Tổng hợp (Giáo viên):**
      - Các câu hỏi trắc nghiệm, đúng/sai, điền khuyết được hệ thống tự động chấm điểm ngay khi học sinh nộp bài (`computeAutoScore`).
      - **AI chấm câu tự luận:** Giáo viên nhấp nút "AI chấm bài" cho từng học sinh hoặc chấm hàng loạt ("AI chấm tự luận tất cả bài"). AI sẽ đọc câu hỏi, barem đáp án và bài làm tự luận của học sinh, trả về điểm số chi tiết cùng 1-2 câu nhận xét cụ thể.
      - Giáo viên có thể sửa đổi đáp án thi bất cứ lúc nào, hệ thống hỗ trợ tính năng chấm lại hàng loạt.
      - Xuất danh sách điểm thi chi tiết ra file Excel.

---

## 2. Cấu trúc Code & File liên quan (Architecture & File Mapping)
- **Giao diện (Components & Pages):**
  - `src/components/tabs/ExamsTab.tsx`: Dashboard quản lý của giáo viên: thống kê số đề thi, quản lý mở/tắt đề, xem danh sách bài làm đã nộp, kích hoạt AI chấm tự luận và xuất điểm Excel.
  - `src/pages/StudentExamPage.tsx`: Workspace làm bài của học sinh, xử lý đếm ngược thời gian, khóa in, cảnh báo chuyển tab, tự động lưu bài làm và hiển thị câu hỏi.
- **Tiện ích và Dịch vụ (State & Utilities):**
  - `src/hooks/useExams.ts`: Quản lý truy vấn Firestore (thêm/xóa/sửa trạng thái đề thi và bài làm).
  - `src/utils/examScoring.ts`: Chứa thuật toán chấm điểm tự động đối soát đáp án trắc nghiệm, cấu trúc đáp án Đúng/Sai dạng phức hợp (Compound TF), tự động thêm thẻ LaTeX bao quanh văn bản toán học (`ensureMathWrapped`).
  - `src/lib/examParser.ts`: Chứa tiện ích tạo mã đề ngẫu nhiên (`generateExamCode`) và tính toán tổng điểm tối đa của đề.

---

## 3. Nội dung & Luồng dữ liệu (Data & Logic Flow)
- **Mô hình Dữ liệu Bài nộp (Exam Submission Schema):**
  Lưu trữ trong collection `examSubmissions` trên Firestore:
  ```typescript
  interface ExamSubmission {
    id: string;
    examId: string;
    examCode: string;
    studentName: string;
    studentClass: string;
    status: 'in_progress' | 'submitted' | 'graded';
    startedAt: string;
    submittedAt?: string;
    answers: StudentAnswer[];
    totalScore: number;
    maxScore: number;
    tabSwitches: number; // Đếm số lần chuyển tab chống gian lận
  }
  ```
- **Hệ thống AI chấm điểm tự luận (Essay AI Grading):**
  Khi giáo viên kích hoạt chấm tự luận, hệ thống gửi Prompt chứa câu hỏi, gợi ý đáp án và bài làm của học sinh cho AI. AI chấm điểm và trả về JSON thuần:
  ```json
  {
    "score": 1.5,
    "feedback": "Học sinh nêu đúng công thức nhưng tính toán bước cuối cùng bị nhầm lẫn dấu."
  }
  ```

---

## 4. Kịch bản kiểm thử & Khắc phục lỗi (QA Test Checklist & Debug Points)
- **Danh sách kịch bản cần Test (QA Checklist):**
  - [ ] **Test Case 1: Học sinh làm bài thi & Gian lận chuyển tab**
    - *Hành vi:* Vào vai học sinh, truy cập link phòng thi, điền tên lớp để bắt đầu làm bài. Bật sang tab khác để tra cứu tài liệu rồi quay lại làm tiếp.
    - *Kết quả mong đợi:* Khi quay lại tab thi, hệ thống hiển thị cảnh báo màu đỏ "CẢNH BÁO: KHÔNG ĐƯỢC CHUYỂN TAB!". Bảng điều khiển của giáo viên cập nhật số lần chuyển tab của học sinh đó tăng lên.
  - [ ] **Test Case 2: Tự động lưu bài khi gặp sự cố**
    - *Hành vi:* Học sinh đang làm bài thi trực tuyến, trả lời được 3 câu trắc nghiệm. Tiến hành F5 tải lại trang.
    - *Kết quả mong đợi:* Trang tải lại xong vẫn giữ nguyên họ tên, thời gian làm bài còn lại và 3 đáp án đã chọn trước đó (được load lại từ Firestore).
  - [ ] **Test Case 3: Chấm tự luận bằng AI**
    - *Hành vi:* Học sinh nộp bài thi có câu hỏi tự luận. Giáo viên mở danh sách bài nộp, nhấp nút "AI chấm bài" cho học sinh đó.
    - *Kết quả mong đợi:* Điểm của học sinh được cập nhật tăng thêm tương ứng, trạng thái chuyển từ "Đã nộp" sang "Đã chấm". Xem chi tiết bài làm thấy lời phê nhận xét chi tiết của AI cho câu tự luận đó.

- **Các lỗi thường gặp & Cách debug (Common Gotchas & Debugging):**
  - *Triệu chứng lỗi:* Chấm điểm câu hỏi Đúng/Sai (True/False) bị sai lệch hoặc học sinh chọn đúng nhưng bị tính 0 điểm.
  - *Nguyên nhân:* Đáp án lưu trữ của câu Đúng/Sai lưu dạng chuỗi JSON `{"a":"Đ","b":"S",...}` nhưng parser đối soát không khớp định dạng chữ hoa/chữ thường hoặc ký tự đặc biệt.
  - *Cách kiểm tra/Khắc phục:* Trong `examScoring.ts`, hàm `computeAutoScore` sử dụng helper `parseTFSub` để phân tách an toàn chuỗi JSON và chuẩn hóa ký tự `Đ`/`S` về cùng dạng chữ viết in hoa trước khi so sánh. Hãy dùng `console.log` kết quả so sánh trong hàm `computeAutoScore` để kiểm tra độ khớp đáp án.

---

## 5. Ghi chú kiểm thử thực tế (Practical QA Notes)

> **Trạng thái:** ⚠️ *Suy từ code — chưa kiểm thử trực tiếp tab này trong đợt vừa rồi.* Phần dưới chuẩn hóa cách chạy checklist cho khớp môi trường thật.

### 5.1. Định dạng Test Case nên dùng
Mỗi case: **bước thao tác cụ thể** → **kết quả mong đợi** → **cách xác minh** (URL phòng thi / DOM / Firestore / console).

### 5.2. Cách xác minh & quirk
- URL phòng thi: `/exam/{code}` (mã dạng `#A8G9`). Test vào link khi đề CHƯA mở → phải bị chặn; khi mở → vào được.
- Tự lưu bài: làm vài câu rồi F5 → đáp án + thời gian còn lại khôi phục từ Firestore (kiểm doc bài nộp).
- Chống gian lận chuyển tab: đổi tab rồi quay lại → cảnh báo đỏ + bộ đếm tăng ở dashboard GV (kiểm DOM + Firestore).
- 🐞 **Câu Đúng/Sai dễ chấm lệch:** đáp án lưu JSON `{"a":"Đ",...}`; nếu hoa/thường không chuẩn hóa sẽ tính 0 điểm dù chọn đúng. Test chính xác case này, log so sánh trong `computeAutoScore`.
- ⚠️ **Quota 429:** "AI chấm tự luận" dễ chạm quota → kiểm network để phân biệt lỗi quota với lỗi chấm.

### 5.3. Lưu ý môi trường (chung)
- Production: `https://giaoandewey.vercel.app`, Firestore `smartplan-ai-14200`. Bài thi học sinh đọc/ghi Firestore — kiểm rule cho phép phòng thi đang mở.
