# Tiện ích Edge "SmartPlan ↔ SSM"

Cầu nối **chỉ đọc** giữa app SmartPlan và SSM của trường. Vé đăng nhập SSM của thầy cô nằm yên trong Edge:
tiện ích không gửi nó lên app, lên máy chủ hay đi đâu khác.

## Cài (làm 1 lần)

1. Trong app: **Lớp học → chọn lớp → tab Học sinh → Ghép với lớp SSM**. Máy chưa có tiện ích thì app hiện nút
   **Tải tiện ích** (`/downloads/ssm-bridge.zip`). Tải về, chuột phải → Extract All.
2. Mở Edge, gõ vào thanh địa chỉ: `edge://extensions`
3. Bật **Chế độ nhà phát triển** (Developer mode), công tắc ở cạnh trái, phía dưới.
4. Bấm **Tải tiện ích đã giải nén** (Load unpacked), chọn thư mục `ssm-bridge`.
5. Tải lại (F5) mọi tab SSM và tab app đang mở.

## Dùng

1. Mở `ssm.edufit.vn` trong một tab Edge, đăng nhập bằng **mail trường**, trùng với mail đăng nhập app.
2. Trong app: **Lớp học → chọn lớp → tab Học sinh → Ghép với lớp SSM**.
3. Chọn đúng lớp SSM, bấm **Ghép**, rồi bấm **So danh sách với SSM**.

## Lỗi thường gặp

| Thông báo | Cách xử lý |
|---|---|
| Chưa cài tiện ích… | Làm lại phần Cài, rồi F5 trang app |
| Chưa mở SSM | Mở `ssm.edufit.vn` trong một tab khác |
| Tab SSM mở trước khi cài tiện ích | F5 tab SSM |
| Tab SSM đang đăng nhập … khác tài khoản app | Đăng xuất SSM, đăng nhập lại đúng mail trường |
| Phiên SSM hết hạn | Đăng nhập lại SSM |

## Giới hạn

- Đợt 1 chỉ đọc: tiện ích không ghi gì lên SSM, không gửi tin nào tới phụ huynh.
- Chỉ trang `giaoandewey.vercel.app` (và máy dev `localhost:3000`) gọi được tiện ích.
- SSM là hệ thống nội bộ Edufit, không có tài liệu API. Edufit đổi hệ thống thì tiện ích có thể phải cập nhật.
