# Thử dấu đỏ trên bài Thi thử GHKI thật — 14/10/2026

## Mẫu đã lấy từ phiên GV thật

| Lớp | Bài chọn | Ảnh | Dấu |
|---|---|---:|---:|
| 10Olinda | Vũ Bảo An · Thi thử giữa HKI · 4,7/10 | 2 | 9 |
| 11Columbus | Lê Trung Đức · Thi thử giữa HKI · 5,9/10 | 2 | 8 |
| 12LoTrinh1 | Trần Bảo Lâm · Thi thử giữa HKI · 8,5/10 | 1 | 4 |

Mỗi lớp chọn một bài có ảnh và kết quả chấm; không phải tất cả bài của lớp.
Ảnh tải qua pageAssets của đúng thẻ bài đang hiển thị. Nhận xét/chi tiết đọc từ DOM của thẻ đó;
không truy cập credential/hidden app state. Không gọi chấm lại, sửa điểm, duyệt hay upload production.

## Kết quả

- Có 21 dấu đỏ thật trên bản ảnh sao: khoanh đáp án sai, gạch dưới bước thiếu.
- 21 dấu được đặt bằng quá trình Codex đọc trực quan ảnh và đối chiếu lời chữa đã lưu.
  KHÔNG phải engine AI định vị đã tích hợp vào web; không giả claim tự chấm sản phẩm.
- Khi soát, 1 dấu ban đầu ở khối 11 khoanh vào M thay vì ký hiệu thuộc/tập con; đã sửa vùng tọa độ.
- Nghi ngờ ban đầu về một ý Đúng/Sai khối 12 đã được rút lại sau phóng to; chưa đủ chứng cứ lỗi đọc.
- Các dấu chắc chắn dựa trên bài đọc được; không khoanh một vùng trống cho câu chưa làm.
- Có gallery riêng: chọn khối/trang, ảnh gốc/ảnh đỏ, zoom 200%, chạm số mở lời chữa, tải JPG đỏ.
- check.py exit 0: 5 ảnh, 21 dấu, tọa độ trong giới hạn; ảnh đỏ cùng kích thước ảnh gốc;
  SHA-256 của 5 ảnh gốc không đổi. HTML không nhúng URL tải Firebase hay token.
- Đã xem trực quan cả 5 ảnh đỏ. Browser tool chặn file:// khi mở gallery;
  không lách bằng server/CDP/alternate browser. Chưa QA tương tác gallery này.
- Dữ liệu riêng của HS: file nằm cục bộ, không chia sẻ công khai, không tải sang dịch vụ AI khác.

## Artifact

Thư mục: C:/Users/ADMIN/.codex/visualizations/2026/10/10/01a123b1-a378-73b1-9aa4-685e5b67efaa/red-pen-real-20261014/

index.html: bản xem có tương tác. annotations.json: các tọa độ, lời chữa, nguồn ảnh.
g10-page1-red.jpg, g10-page2-red.jpg, g11-page1-red.jpg, g11-page2-red.jpg, g12-page1-red.jpg.
three-grades-red-preview.jpg: ảnh đối chiếu ba khối. annotate.py/check.py: dựng và kiểm lại.

## Giới hạn nghiệm thu

PASS dựng dấu trên mẫu ảnh thật; CONDITIONAL cho tự động hàng loạt.
Cần engine trả image/page ID + vùng lỗi, kiểm độ chắc chắn, soát vùng lân cận và dấu không che chữ.
Mẫu 3 bài không chứng minh chất lượng trên cả lớp. Kết quả chấm sẵn chưa được tái nghiệm thu toàn bộ toán học.
Chưa triển khai tính năng bút đỏ trên GV/HS production.
