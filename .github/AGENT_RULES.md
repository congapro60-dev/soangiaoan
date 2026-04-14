# Smart Lesson Plan AI - Agent Rules

Mọi AI Agent (Gemini, Cursor, Copilot, Windsurf) khi làm việc trong Repo này đều **bắt buộc** phải tuân thủ nghiêm ngặt các quy tắc dưới đây nhằm đảm bảo tính ổn định tối đa ở chuẩn Production (SaaS). 
Đây không phải là một project demo. KHÔNG ĐƯỢC PHÉP VIBE VÔ TRÁCH NHIỆM CHỈ ĐỂ CHẠY ĐƯỢC APP MÀ LÀM BẨN CODEBASE.

## 1. Type Safety (An toàn kiểu dữ liệu)
- **TUYỆT ĐỐI KHÔNG SỬ DỤNG BẤT KỲ KEYWORD `any` NÀO TRONG TYPESCRIPT**. Mọi dữ liệu phải có kiểu rõ ràng. Bắt buộc dùng `unknown` nếu thực sự cần ép kiểu và kiểm tra type guard sau đó.
- Types khai báo ở `src/types.ts` phải được dùng triệt để.

## 2. Component Architecture (Kiến trúc Component)
- Khi build UI, tuân thủ nguyên tắc: **Clarity over cleverness** và **Small, atomic tasks**.
- Không tạo các file Component lớn hơn **300 dòng**. Code thừa nên được chia thành Subcomponents nằm trong file hoặc thư mục cùng ngữ cảnh (`features/`).

## 3. Thao tác Cơ sở Dữ liệu (Firestore) & Data Contracts
- Khi đọc/ghi Firestore (`src/hooks/useAppState.ts` hoặc các tệp khác), hãy xem xét xem:
   a. Document này đã có Schema ràng buộc chưa? Nếu thiếu một cột quan trọng thì app có bị chết (undefined) không? Hạn chế việc bypass (chặn lỗi hiển thị nhưng mặc kệ data).
   b. Các truy vấn có dùng `orderBy` không? Nếu có, hãy chắc chắn index đã được setup, hoặc đưa ra câu hỏi cho Founder trước khi viết workarounds.

## 4. Test-Driven AI (Luật về Bug & Refactor)
- **Không đoán Mò (No YOLO Fixing)**: Nếu gặp bug liên quan đến logic, đầu tiên phải xác định xem nó thuộc mảng nào. Khuyến khích viết một file Test (mô tả bug) để test fail, rồi mới bắt đầu implement giải pháp cho test pass.
- Đừng lười test: Mọi script thao tác AI Text (`exportUtils.ts` parse output AI) đều luôn tiềm ẩn nguy cơ AI trả về sai json block. Phải handle error thật tinh tế bằng Fallbacks và Regex vững chắc.

## 5. Security & Costs
- Không bao giờ truyền trực tiếp API Key xuống client trừ khi được yêu cầu explicit. (Hiên tại app đang yêu cầu User tự nhập Key, đây là by-design). Đừng vô tình hardcode key test của user lên Repo.

---
**Cam kết của Tác nhân mã hóa:** 
> "Tôi sẽ code như một Senior. Nếu tôi đề xuất giải pháp vá triệu chứng, tôi sẽ cảnh báo Founder và bắt buộc tạo issue nợ kỹ thuật (Tech debt) lại."
