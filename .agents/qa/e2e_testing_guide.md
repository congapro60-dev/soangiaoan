# Cẩm nang Kiểm thử E2E & Kịch bản Chuyển giao VS Code

> ## ⛔ LEGACY — KHÔNG DÙNG LÀM CỔNG NGHIỆM THU (do-not-run-as-gate)
>
> Giữ lại làm tư liệu lịch sử. **Đừng chạy theo hướng dẫn bên dưới mà chưa đọc hết mục này.**
>
> Tính đến 2026-08-04, dự án **không có bộ E2E tự động nào**. Không có script nào trong
> tài liệu này được tính là PASS/FAIL cho release.
>
> Ba lý do cụ thể, đã kiểm chứng:
>
> 1. **Đường dẫn sai.** `node start_chrome.js` và `node run_test.js` ở gốc repo **không tồn tại**.
>    Bản có thật nằm ở `.agents/qa/scripts/`. Script `test:e2e` cũ trỏ vào `live_dom_test.js`
>    ở gốc — cũng không tồn tại — nên đã bị **gỡ khỏi `package.json`** ngày 2026-08-04.
> 2. **Chiếm Chrome cá nhân.** Kịch bản này mở Chrome bằng profile thật của người dùng qua
>    cổng debug `9222`, có chỗ force-kill Chrome và xoá file `LOCK`. Nó chạy trên phiên
>    đăng nhập thật, với khoá API thật.
> 3. **Chạy thẳng vào production.** Kịch bản thao tác trên `giaoandewey.vercel.app` và có
>    bước **"Xuất bản"** — tức là ghi dữ liệu thật. Và cơ chế `skip` tương tác cho phép bỏ
>    qua một bước rồi vẫn in thông báo thành công: đó là false PASS.
>
> **Cái gì đang thay nó:** hiện chỉ có kiểm thử `firestore.rules` trên emulator
> (`npm run test:rules`, 185 ca). Xem `QA_TESTING_PROTOCOL.md` mục 1 cho danh sách lệnh thật.
>
> Muốn dựng lại E2E thì viết mới, tracked trong `tests/e2e/`, browser context sạch, URL đích
> lấy từ biến môi trường và không fallback sang production. Đừng sửa vá mấy script này.

Tài liệu này cung cấp toàn bộ hướng dẫn, kịch bản kiến trúc và prompt chi tiết để bạn có thể tự mình chạy kịch bản kiểm thử E2E (End-to-End) hoàn hảo trên VS Code hoặc ủy quyền cho một AI khác kiểm thử trực tiếp trên máy của bạn.

---

## 🌟 Những cải tiến & Sửa lỗi quan trọng đã đẩy lên GitHub
Toàn bộ các cập nhật dưới đây đã được lưu trữ cục bộ và **đẩy thành công lên GitHub** (`origin main`):
1. **Khôi phục cấu hình model gốc**: Đã hoàn tác (revert) toàn bộ các thay đổi tự động ánh xạ model về trạng thái nguyên bản 100% của hệ thống tại `src/lib/gemini.ts` để đảm bảo tương thích hoàn toàn với Production.
2. **Kiến trúc Móc nối Tab Động (Attach-to-Chrome)**: Tách mã nguồn kiểm thử thành `start_chrome.js` (chỉ mở trình duyệt duy nhất 1 lần để giữ hiện trường) và `run_test.js` (kết nối trực tiếp vào cổng debug `9222`).
3. **Cơ chế Tiêm giá trị React Native**: Sử dụng hàm Setter gốc của React để điền thông tin học sinh ở Bước 11, đảm bảo form đăng ký nhận diện dữ liệu lập tức và không bị vướng.
4. **Tự động bắt và Chuyển tab Học sinh mới**: Cải tiến luồng Step 10 để Puppeteer tự động quét toàn bộ trình duyệt, tìm đúng tab Cổng học sinh mới mở dạng `/adaptive-portal/` và gọi hàm `bringToFront()` để đưa tab đó hiển thị trực tiếp lên trước màn hình để bạn quan sát.

---

## 🛠️ Quy trình Chuẩn bị & Chạy kiểm thử thủ công trên máy của bạn

### Bước 1: Khởi động Chrome ở chế độ Debug (Chỉ chạy 1 lần duy nhất)
Mở PowerShell tại thư mục dự án và chạy lệnh sau để mở Chrome Native với Profile cá nhân của bạn:
```powershell
node start_chrome.js
```
*Lưu ý: Lệnh này sẽ mở một cửa sổ Chrome có cổng debug `9222`. Bạn hãy đăng nhập sẵn tài khoản của bạn trên trang web https://giaoandewey.vercel.app/ (nếu chưa đăng nhập).*

### Bước 2: Chạy kịch bản Kiểm thử tự động trên VS Code
Mở một Terminal thứ hai trên VS Code và chạy lệnh sau để bắt đầu kiểm thử:
```powershell
node run_test.js
```
Kịch bản sẽ tự động:
1. Kết nối vào Chrome đang mở.
2. Quay lại trang Dashboard Giáo viên.
3. Chọn giáo án **"Ba đường conic · Lớp 10"** trong thư viện của bạn.
4. Click **"AI rà soát giáo án"** và đợi nút duyệt bài học sáng lên.
5. Tạo cấu trúc bài học phân hoá, điền thông tin toán học thật, và click **"Xuất bản"**.
6. Tự động nhảy sang tab Cổng học sinh mới, điền thông tin học sinh giả định và nhấn **"Bắt đầu học"**.
7. Tự động quét và hoàn thành bài kiểm tra đầu giờ thực tế.

---

## 📝 Prompt mẫu siêu chi tiết để nhờ VS Code hoặc AI khác chạy hộ

Dưới đây là prompt đầy đủ để bạn copy-paste gửi cho bất kỳ AI Coding Assistant nào trong VS Code (như Cursor, GitHub Copilot, Roo Code, v.v.) để nhờ nó chạy và kiểm tra:

```markdown
Chào bạn! Tôi muốn nhờ bạn chạy kịch bản kiểm thử E2E (End-to-End) tự động hóa cho tính năng "Tạo bài học phân hóa từ giáo án nguồn" của dự án soạn giáo án Dewey.

Dự án đã có sẵn kiến trúc kiểm thử tự động hóa bằng Puppeteer kết nối trực tiếp vào trình duyệt Chrome đang chạy qua giao thức Debugging Protocol (cổng 9222).

Vui lòng hỗ trợ tôi thực hiện các bước sau:

1. ĐỌC VÀ HIỂU CẤU TRÚC KỊCH BẢN:
   - Hãy đọc file `start_chrome.js` để hiểu cách trình duyệt Chrome được khởi động với profile bot_profile và cổng 9222.
   - Hãy đọc file `run_test.js` để nắm rõ 14 bước E2E từ vai trò Giáo viên (chọn giáo án "Ba đường conic", gửi AI rà soát, sinh nội dung bài học, xuất bản) cho đến vai trò Học sinh (móc nối sang tab Cổng học sinh mới mở, điền thông tin học sinh, làm bài kiểm tra đầu giờ thực tế).

2. KHỞI ĐỘNG TRÌNH DUYỆT CHROME DEBUG:
   - Hãy chạy lệnh `node start_chrome.js` trên terminal để mở trình duyệt Chrome lên (nếu chưa được mở).
   - Xác nhận cổng debug 9222 đã sẵn sàng.

3. KÍCH HOẠT VÀ THEO DÕI KỊCH BẢN E2E:
   - Chạy lệnh `node run_test.js` để kịch bản bắt đầu điều khiển tab Chrome.
   - Khi kịch bản chạy, hãy theo dõi sát log trên Terminal tiếng Việt và quan sát sự thay đổi trên màn hình trình duyệt Chrome.
   - Đặc biệt lưu ý bước chuyển đổi tab từ Giáo viên sang Học sinh: kịch bản sẽ tự động quét tab `/adaptive-portal/` mới mở, kích hoạt nó lên trước và tiến hành điền thông tin học sinh bằng cơ chế tiêm React native setter.
   - Nếu gặp lỗi hoặc bị kẹt (ví dụ: chờ API phản hồi lâu hoặc lỗi selector), hãy sử dụng cơ chế nhập lệnh tương tác `skip`, `retry` trực tiếp trên CLI của `run_test.js` hoặc sửa nhanh mã nguồn và chạy lại `node run_test.js` mà KHÔNG được tắt trình duyệt Chrome để giữ nguyên hiện trường.

Hãy phản hồi lại để tôi biết bạn đã sẵn sàng chạy thử nghiệm!
```
