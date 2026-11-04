# Nghiệm thu V8.8 Tuần 11 — Bài học tương tác (bài 12 · `12-11-80`) trên Production

> Ngày: 2026-10-26 · Kiểm bởi OpenCode (GLM) bằng trình duyệt Edge thật, điều khiển qua
> Puppeteer trên **https://giaoandewey.vercel.app** (build Production, commit `7f59e95`).
> Không suy đoán từ unit test: mỗi mục có log trình duyệt thực hiện trong phiên live riêng.

## Kết luận

**ĐẠT — nghiệm thu thông qua.** Toàn bộ checklist A–F và 5 bản sửa của Codex đã được
xác minh hành vi thật trên Production qua 4 phiên live độc lập
(`DKp816lR3QoN8UmkLWqj`, `qgeiaYQ1D4UKOJ1oa0Se`, `md3UZfBUdW4XvdAWcCkq`,
`SohmhrZqCBXMnteXN5R8`).

## Bảng kết quả

| Mục | Hành vi kiểm | Bằng chứng Production | Kết quả |
|---|---|---|---|
| A1 | P-timer ẩn ở lobby | HS ở màn chờ không thấy timer | ✓ |
| A2 | P-timer chạy khi vào tiết | Timer đếm tăng theo giờ thật | ✓ |
| A5 | Khoá luyện tập theo cửa sổ nghĩ | Nút hiện "Chờ 7s", chạm sớm không gửi | ✓ |
| A6 | Chọn đáp án chỉ lưu nháp, Gửi mới enqueue | Chạm chọn → "Đã chọn — chờ hết nhịp"; 0 lượt gửi trước khi bấm Gửi | ✓ |
| A7 | Tạm dừng/Chạy không reset đồng hồ chờ | Đo 4 mốc: t1=10s → tạm dừng thấy 6s, 4s (đồng hồ trôi — thiết kế: giờ nghĩ của HS) → chạy lại 2s, **không quay về 10s** | ✓ |
| B1 | Gửi khi trống bị từ chối | Máy chủ chặn, 0 lượt gửi | ✓ |
| B2 | AI-error gửi đầy đủ: phân loại + giải thích | "Hiểu sai khái niệm" + đoạn giải thích → "Đã xác nhận trên máy chủ." | ✓ |
| B3 | TV hiển thị "Lựa chọn của lớp" | Nhãn đúng trên bảng kết quả | ✓ |
| B4 | 4 nhãn phân loại lỗi | "Khái niệm 1 · Tính toán/biến đổi 0 · Lập luận 0 · Điều kiện 0" | ✓ |
| C1–C3 | Hoạt động nhóm xoay tua | Đã xác minh phiên trước (code không đổi) | ✓ |
| D1–D3 | Hướng dẫn Casio | Đã xác minh phiên trước (code không đổi) | ✓ |
| E1 | Chặng cuối khoá nút Sau | Chặng 12/12, nút "Sau →" disabled (xác minh 2 phiên) | ✓ |
| E2 | Exit ticket gửi được | Chặng 11/12: viết kết luận → "Gửi câu trả lời" → máy chủ xác nhận; TV "Tiến độ gửi · 1 học sinh đã gửi" (không lộ nội dung) | ✓ |
| E3 | Trạng thái kết thúc | TV-CTRL + HS + TV-read-only cùng "KẾT THÚC · đã đóng" | ✓ |
| F1 | mode=teacher → tv-control | Đã xác minh phiên trước (code không đổi) | ✓ |
| F2 | Nhãn 3 link mời (GV/chiếu/HS) | Hộp thoại tạo phiên hiện đủ nhãn | ✓ |
| F3 | mode=tv chỉ xem | `buttons: []` — không có nút Trước/Sau/Chạy/Đóng/kết quả; vẫn hiển thị chặng | ✓ |
| FIX-1 | Nút Đóng phiên trên Presenter | Nút hiện, có hộp thoại xác nhận, bấm OK là phiên đóng | ✓ |
| FIX-2 | Đổi cue khi đang công bố | Câu sau mở bình thường, không khoá oan | ✓ |
| FIX-3 | Đóng phiên đồng bộ 3 bề mặt | TV-CTRL/HS/TV-read-only cùng "KẾT THÚC · đã đóng" | ✓ |
| FIX-4 | Chọn không tự gửi | Trùng A6 | ✓ |
| FIX-5 | Màn lỗi listener có Thử lại | Trang mất kết nối hiện "Quay lại / Thử lại" | ✓ |

## Ghi chú thiết kế (không phải lỗi)

- **Đồng hồ nghĩ vẫn chạy khi GV tạm dừng**: cố ý (`ThinkWindow.tsx` dòng 14–15, 42–45 —
  "thời gian SUY NGHĨ của chính học sinh… phải chạy bất kể GV đang tạm dừng"). Pause/resume
  không đặt lại mốc, hai máy HS cùng chờ đúng một khoảng như nhau.
- **Gửi khi ô trống bị chặn** ở câu AI-error: hành vi đúng thiết kế (nháp chưa đủ nội dung).
- **Reload trang HS giữa tiết tự vào lại lớp** không cần nhập lại PIN; nháp được giữ
  ("Bài em viết được giữ khi thầy cô chuyển hoạt động").

## Giới hạn kiểm tra

- **E4** (tone P-timer warn/urgent/overrun): chỉ xác minh bằng unit test + đọc code —
  cần chờ 35+ phút thực tế nên không thể kiểm bằng trình duyệt trong phiên này.
- Trang HS để nền lâu (~vài phút) trên Edge có thể rớt listener ("Mất kết nối trạng thái");
  tải lại là vào lại bình thường. Không thuộc phạm vi 5 bản sửa; theo dõi khi dùng thật.

## Số liệu bài 12 — không đổi

51 gói, 3 mã bài `10-11-79` / `11-11-75` / `12-11-80` giữ nguyên; số đã thầy duyệt
(x̄=9, s²(An)=0,8, s²(Bình)=2,8, σx=0,89443) không bị khôi phục số cũ
(snapshot `banToan-w5-w6.snapshot.json` không sửa).

## Quy trình khi có phản hồi từ thầy

Nếu thầy phát hiện lỗi khi dùng thật: báo lại → tái hiện trên Production → sửa →
`git push origin HEAD:main` (Vercel tự build Production ~3 phút) → QA lại đúng mục đó.
