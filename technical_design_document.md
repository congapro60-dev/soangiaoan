# TECHNICAL DESIGN DOCUMENT (TDD)
**Project:** Smart Lesson Plan AI
**Author:** Antigravity (Google DeepMind)
**Target Reviewer:** Claude Code (Architect)

---

## PHẦN 1: TỔNG HỢP CÁC TÍNH NĂNG & BUG ĐÃ GIẢI QUYẾT BỞI ANTIGRAVITY

### 1. Bug: Bị cắt chữ bên mép trái Editor khi phóng to (Zoom/Fullscreen)
* **Nguyên nhân cốt lõi (Root Cause):** Xung đột Z-Index Stacking Context. Khi bấm nút Fullscreen trên thanh công cụ của `@uiw/react-md-editor`, nó gán `position: fixed; left: 0`. Tuy nhiên, vì Editor bị kẹt trong một `motion.div` (Framer Motion) có `z-index: 10`, nên nó không thể đè lên được `Sidebar` (`z-index: 30`) và `Header` (`z-index: 20`). Hậu quả là phần bên trái và bên trên của Editor bị Menu và Header đè lấp mất chữ.
* **Giải pháp đã thực thi:** Áp dụng kỹ thuật CSS hiện đại (`:has` selector). Khi phát hiện lớp `.w-md-editor-fullscreen` xuất hiện, tự động ép `z-index: 0` cho thẻ `aside` (Sidebar) và `header`. Giúp Editor thực sự chiếm trọn 100% không gian hiển thị một cách mượt mà. Đã restore nút Fullscreen thay vì ẩn đi. *(Đã push commit 82e2eaf)*.

### 2. Feature: Floating Chat Widget (AI Tutor nhúng mọi nơi)
* **Mục tiêu:** Tránh việc giáo viên phải chuyển qua lại giữa tab Soạn giáo án và tab AI Tutor, làm đứt mạch tư duy.
* **Kiến trúc triển khai:** 
  - Tạo component `FloatingChatWidget.tsx` dưới dạng Floating Action Button (FAB) ở góc dưới bên phải.
  - Sử dụng chung một bộ nhớ state (`const chat = useChat(...)`) với `ChatTab` gốc để đảm bảo đồng bộ hóa 100% lịch sử trò chuyện trên toàn hệ thống.
  - Tích hợp tính năng Maximize/Minimize cửa sổ chat để thuận tiện đọc các công thức LaTeX phức tạp.
  - Render ở cấp Root (`App.tsx`) để có thể gọi ra từ bất cứ màn hình nào. *(Đã push commit 6a3f4da)*.

---

## PHẦN 2: KẾ HOẠCH NÂNG CẤP "AI AGENT" CHO FLOATING WIDGET

Khách hàng (User) yêu cầu: "Gộp chung tính năng Chat tư vấn và Agent tự sửa bài vào trong Floating Widget".

### 2.1. Giải pháp Thiết kế (Proposed Architecture)
**A. Bơm ngữ cảnh (Context Injection)**
* Sửa đổi `useChat.ts` và `App.tsx`: Truyền biến `creator.currentPlan.content` vào logic của Chatbot.
* Khi gửi prompt lên Gemini/Claude, Frontend sẽ tự động nối thêm (append) đoạn System Prompt: *"NGỮ CẢNH: Đây là toàn bộ văn bản giáo án người dùng đang soạn thảo: {currentPlan.content}. Hãy hiểu và tư vấn dựa trên nền tảng văn bản này."*

**B. Kích hoạt Kỹ năng Chấp bút (Agentic Action qua Magic Tags)**
* Cập nhật System Prompt cho AI Tutor: *"Nếu người dùng yêu cầu MỘT LỆNH SỬA ĐỔI giáo án (ví dụ: thêm, xóa, sửa văn bản), hãy trả về toàn bộ nội dung giáo án đã được cập nhật nằm trong cặp thẻ `<UPDATE_EDITOR>...</UPDATE_EDITOR>`."*
* Trên Frontend (`FloatingChatWidget.tsx`): Viết một Regex Parser chặn luồng stream trả về. Nếu phát hiện thẻ `<UPDATE_EDITOR>`, bóc tách nội dung đó, tự động gọi `creator.setCurrentPlan(prev => ({...prev, content: newContent}))` để ghi đè lên Editor. Giao diện Chat sẽ chỉ hiển thị: *"✨ Trợ lý đã sửa giáo án theo yêu cầu của thầy!"*.

### 2.2. Ưu nhược điểm
* **Ưu điểm:** Trải nghiệm "One-stop shop". Người dùng chỉ cần ra lệnh ở một nơi duy nhất.
* **Nhược điểm/Rủi ro:** Khi giáo án quá dài (hàng nghìn chữ), AI trả về toàn bộ text sẽ mất thời gian (10-20 giây) và tốn token. *Biện pháp giảm nhẹ:* Thông báo rõ cho user biết độ trễ để họ kiên nhẫn.

---

## PHẦN 3: ĐÁNH GIÁ YÊU CẦU "ĐÁNH SỐ DÒNG" (LINE NUMBERS) NHƯ OVERLEAF

Khách hàng đề xuất: Thêm số dòng vào Editor để giáo viên phổ thông (kém diễn đạt) dễ dàng ra lệnh "Sửa dòng số 3".

### 3.1. Đánh giá Rào cản Kỹ thuật (Technical Blocker)
* Lõi Editor hiện tại là `@uiw/react-md-editor` sử dụng thẻ `<textarea>` HTML cơ bản. Thẻ này **không hỗ trợ hiển thị số dòng (line gutters)** do giới hạn của trình duyệt. 
* Các nỗ lực dùng CSS Hack (background linear-gradient) để vẽ số dòng sẽ bị phá vỡ hoàn toàn khi có một câu văn quá dài tự động xuống dòng (Line Wrapping), dẫn đến sai lệch số dòng nghiêm trọng.
* Để thực sự có số dòng như Overleaf, bắt buộc phải thay đổi toàn bộ kiến trúc lõi sang `CodeMirror` hoặc `Monaco Editor`. Điều này sẽ "đập đi xây lại" hoàn toàn trải nghiệm Split-pane mượt mà hiện có, làm tăng Bundle Size lên vài Megabytes, và rất tốn kém thời gian phát triển.

### 3.2. Đề xuất Kiến trúc thay thế (Semantic / Quote-Based Editing)
Thay vì dùng chỉ số kỹ thuật (dòng số mấy) vốn phù hợp với Coder, tôi đề xuất hướng user tới **"Chỉnh sửa theo ngữ nghĩa"**:
* Yêu cầu user sử dụng phương pháp **Trích dẫn (Quote)** hoặc **Nhắc tên thẻ tiêu đề**.
* Ví dụ: Thay vì "Sửa dòng 45", user nhập: *"Thay đoạn 'Cho hình chóp S.ABC' thành 'Cho hình chóp S.ABCD'"*, hoặc *"Thêm trò chơi Kahoot vào ngay dưới tiêu đề Hoạt động 1"*.
* Nhờ khả năng xử lý ngôn ngữ tự nhiên xuất sắc của LLM, AI Agent sẽ quét (Semantic Search) và thay thế/bổ sung chính xác 100% vào đúng vị trí. Phương pháp này nhân bản đúng cách một Giáo viên trưởng giao việc cho Trợ giảng con người.

---
**Conclusion for Claude Code:**
Vui lòng review kiến trúc *Magic Tags* dành cho Agent, và xem xét phản biện của tôi về rào cản kỹ thuật của *Line Numbers*. Nếu Claude đồng ý, vui lòng cấp phép để Antigravity tiến hành thực thi code (Phase 2).
