# Prompt cho Cowork — Test live cổng học sinh (key AI do học sinh tự nhập)

> Copy phần dưới đây gửi Cowork. Đã đổi hướng so với bản trước: KHÔNG còn cần sửa gì trên
> Vercel nữa — endpoint relay đã bị gỡ bỏ hoàn toàn khỏi codebase.

---

## BỐI CẢNH (cập nhật 2026-07-21, lần 2 — đã đổi kiến trúc)

Trước đó dự định "thay key GEMINI_FALLBACK_KEY trong Vercel" để cứu cổng học sinh. Chủ dự án
sau đó quyết định dứt khoát hơn: **học sinh cũng tự nhập API key của mình** (lấy free hoặc
giáo viên phát), giống hệt giáo viên. Không còn key server dùng chung cho ai cả.

Đã thực hiện trong code (branch `feat/require-own-api-key`):
- Cổng học sinh (`/adaptive-portal`) giờ có **ô nhập API key** ngay ở màn "Bước 1: Kết nối
  với lớp học" (cạnh Họ tên/Lớp/Mã học sinh). Key lưu trong `localStorage` trình duyệt của
  học sinh, dùng cho 2 tính năng: chấm ảnh bài làm bằng AI + cá nhân hóa lộ trình học.
- Không nhập key vẫn học bình thường — chỉ 2 tính năng AI trên bị tắt (không lỗi, không chặn).
- Endpoint `/api/gemini-relay` (key dự phòng phía server) đã **XÓA HẲN** khỏi repo — không
  còn gì để cấu hình trên Vercel cho việc này nữa.

## VIỆC 1 — Test live cổng học sinh

1. Mở link cổng học sinh của một bài học phân hóa đã bật (hoặc
   https://giaoandewey.vercel.app/adaptive-portal để xem giao diện demo).
2. Ở Bước 1, kiểm:
   - [ ] Có ô "**API key AI (để AI chấm bài & cá nhân hóa)**" màu tím, có link "Lấy key miễn
     phí tại đây" trỏ đúng aistudio.google.com/apikey.
   - [ ] Dán một key Gemini thật vào, bấm "Lưu key" → nút đổi thành "Đã lưu ✓" trong ~2 giây.
   - [ ] Tải lại trang (F5) → key vẫn còn trong ô (đã lưu localStorage, không mất).
3. Nhập tên/lớp/mã học sinh, bấm "Bắt đầu học", đi hết Test đầu giờ → vào bài học theo tuyến.
4. Ở một ví dụ mẫu (worked example) có chế độ ảnh: chụp/tải ảnh bài làm, bấm
   "Nhờ AI chấm ảnh tham khảo":
   - [ ] Có key hợp lệ → nhận được nhận xét AI (4 dòng: điểm tham khảo/nhận xét/lỗi/gợi ý).
   - [ ] Xóa key (mở Console F12, gõ `localStorage.removeItem('student-gemini-api-key-v1')`,
     tải lại trang) rồi bấm chấm ảnh lại → phải thấy thông báo rõ ràng yêu cầu nhập key
     (KHÔNG phải lỗi mơ hồ "AI chưa chấm được ảnh lúc này").
5. **Báo cáo**: chụp màn hình ô nhập key + kết quả chấm ảnh AI, xác nhận đạt/không đạt từng mục.

## VIỆC 2 (không đổi) — Test tạo Slide phía giáo viên với key cá nhân

1. Đăng nhập https://giaoandewey.vercel.app bằng tài khoản giáo viên.
2. Cài đặt → tab Gemini → dán API key cá nhân.
3. Soạn giáo án → "Tạo Slide nhanh từ Văn bản thô", dán giáo án mẫu bất kỳ, tạo và tải PPTX.
4. Kiểm: file mở được, tiêu đề không tràn dòng, không slide nào quá 6 bullet.

## Ghi chú cho việc phát key cho học sinh

Nếu chủ dự án tự phát 1 key Gemini chung cho cả lớp: lấy tại aistudio.google.com/apikey,
gửi key đó cho học sinh dán vào đúng ô "API key AI" ở Bước 1. Quota Gemini free tier tính
theo từng key — nếu nhiều học sinh dùng chung 1 key cùng lúc có thể chạm giới hạn requests/phút,
nên cân nhắc phát vài key khác nhau cho các nhóm/lớp khác nhau nếu dùng đông.
