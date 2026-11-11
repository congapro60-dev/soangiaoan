# Đồng bộ tự động tab BTVN — thiết kế và kế hoạch đã duyệt

Chủ máy duyệt: “triển khai đi các hạng mục mà tôi với bạn vừa bàn”. Repo `spai-assistant-ph-hs`, nhánh `preview/zalo-live-test`; giữ nguyên hai file WIP ngoài phạm vi.

## Thiết kế
- Dùng đúng `02. BTVN`; thay writer `02A. NỘP WEB`, không tự xoá tab cũ.
- Giao bài chính thức tạo một cột trong vùng đã định dạng; mã bài ở link là khoá. Mã trùng/cột mơ hồ/hết cột phải báo, không chèn làm lệch công thức.
- Dùng `📥 Đã nộp web` và `🔎 Cần bổ sung`, phân biệt đã nhận với đã kiểm đủ. Không tự ghi Chưa làm/Nộp muộn hoặc thay đổi cờ Tính lỗi/công thức hạnh kiểm.
- Giữ ô sửa tay, công thức, ghi chú ngoài app; metadata chỉ cập nhật khi do app sở hữu và chưa bị sửa. Đọc lại ngay trước batch ghi; nếu thay đổi, hoãn đối soát.
- Hook sau commit trên máy chủ, không gọi Google trong transaction. Revision bền vững + lease + retry qua scheduler sẵn có; không phụ thuộc trình duyệt GV hoặc việc bật thông báo.
- Không tái tạo bài nộp/điểm từ dấu tích trên Sheet. Không thông báo hàng loạt trong đợt này.
- Rủi ro: Sheets không có CAS cho ô thường; hai lần đọc và ghi nguyên tử một batch giảm cửa sổ xung đột nhưng không bảo đảm thắng mọi thao tác sửa tay xảy ra trong chính HTTP ghi. Không hứa realtime tuyệt đối khi Google lỗi.

## Kế hoạch / kiểm chứng
- [ ] Test hồi quy writer: đúng tab, đúng ô, không xoá vùng, công thức/ghi tay, đổi Sheet khi đang đọc, token/quyền/lease, injection.
- [ ] Planner receipt mode, dùng chung cho web và máy chủ; test bài mới, bổ sung, xoá, trạng thái mơ hồ và cột trùng/hết.
- [ ] Writer server + revision/lease/đối soát độc lập thông báo; hook giao/nộp/chấm/xoá.
- [ ] Chạy focused/full API, TypeScript web/API, build, rà độc lập.
- [ ] Chuyển cấu hình đúng tab đã duyệt; xuất bản cả API web và bot, xác minh thực tế không tạo bài/nộp giả cho HS.

## Giới hạn phát hành
Không reset/stash WIP, không merge cả preview vào main. Giữ nguyên cấu trúc/công thức Sheet. Không in secret hoặc nạp lại env đã bị sanitize. Không tự gửi tin nhóm/HS.
