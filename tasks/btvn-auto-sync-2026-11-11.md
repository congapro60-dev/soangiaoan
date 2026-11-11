# Đồng bộ tự động tab BTVN — thiết kế và kế hoạch đã duyệt

Chủ máy duyệt: “triển khai đi các hạng mục mà tôi với bạn vừa bàn”. Repo `spai-assistant-ph-hs`, nhánh `preview/zalo-live-test`; giữ nguyên hai file WIP ngoài phạm vi.

## Thiết kế
- Columbus ghi `02. BTVN` ở file gốc; `11. COLUMBUS (LINK)` chỉ IMPORTRANGE, không được ghi. Olinda và LT1 ghi trực tiếp `10. OLINDA` / `12. TOÁN LT1` ở workbook dùng chung. Thay writer `02A. NỘP WEB`, không tự xoá tab cũ.
- Quyền nguồn riêng `assistantHomeworkSources` theo lớp/chủ/file/tab, tách quyền deadline. Không mở menu deadline Columbus cho lớp khác.
- Giao bài chính thức tạo một cột trong vùng đã định dạng; mã bài ở link là khoá. Mã trùng/cột mơ hồ/hết cột phải báo, không chèn làm lệch công thức.
- Dùng `📥 Đã nộp web` và `🔎 Cần bổ sung`, phân biệt đã nhận với đã kiểm đủ. Không tự ghi Chưa làm/Nộp muộn hoặc thay đổi cờ Tính lỗi/công thức hạnh kiểm.
- Giữ ô sửa tay, công thức, ghi chú ngoài app; metadata chỉ cập nhật khi do app sở hữu và chưa bị sửa. Đọc lại ngay trước batch ghi; nếu thay đổi, hoãn đối soát.
- Hook sau commit trên máy chủ, không gọi Google trong transaction. Revision bền vững + lease + retry qua scheduler sẵn có; không phụ thuộc trình duyệt GV hoặc việc bật thông báo.
- Không tái tạo bài nộp/điểm từ dấu tích trên Sheet. Không thông báo hàng loạt trong đợt này.
- Rủi ro: Sheets không có CAS cho ô thường; hai lần đọc và ghi nguyên tử một batch giảm cửa sổ xung đột nhưng không bảo đảm thắng mọi thao tác sửa tay xảy ra trong chính HTTP ghi. Không hứa realtime tuyệt đối khi Google lỗi.

## Kế hoạch / kiểm chứng
- [x] Test hồi quy writer: đúng tab, đúng ô, không xoá vùng, công thức/ghi tay, đổi Sheet khi đang đọc, token/quyền/lease, injection.
- [x] Planner receipt mode, dùng chung cho web và máy chủ; test bài mới, bổ sung, xoá, trạng thái mơ hồ và cột trùng/hết.
- [x] Writer server + revision/lease/đối soát độc lập thông báo; hook giao/nộp/chấm/xoá.
- [x] Focused bot 80/80, main 79/79; TypeScript web/API và build hai repo; CI main 5261 test pass. Claude review độc lập hoãn theo chỉ đạo chủ máy.
- [x] Cấu hình đúng ba tab; web main c02f163 và bot 0197bbc đã xuất bản; đối soát Sheet thật, không tạo bài/nộp giả.

## Giới hạn phát hành
Không reset/stash WIP, không merge cả preview vào main. Giữ nguyên cấu trúc/công thức Sheet. Không in secret hoặc nạp lại env đã bị sanitize. Không tự gửi tin nhóm/HS.

## Nghiệm thu 11/11/2026
- Web chính: dpl_6tVAcEU4fH2986r2h9rmphLh7Cef, domain giaoandewey.vercel.app, PR #30 đã merge.
- Bot: dpl_AkQNfjb43SimuDLcd3wzfDNVzj5X, Production, alias đầy đủ zalo-test.congapro60-devs-projects.vercel.app.
- Lượt Preview thiếu secret scheduler (Production-only) trả HTTP lỗi; đã thay bằng Production hiện có, không đổi env/secret. Scheduler 42986114564 SUCCESS; ba state failed=false, syncedAt tăng, lượt lặp created=0/statusWrites=0.
- Lượt ghi đầu: Columbus 5 cột/231 ô trạng thái, Olinda 2/352, LT1 10/10. Giữ 567 công thức; 62 ô trạng thái nhập tay Columbus được giữ. Không ghi tab IMPORTRANGE.
- Webhook GET 200, deadline không xác thực 401, classroom POST không xác thực 401. Chưa E2E tạo/nộp thật trong trình duyệt; CUA không truy cập được. Đã đọc định dạng Google API, giữ kích thước/công thức/validation; chưa xác nhận hình thức bằng ảnh Google-rendered.
- Claude QA và màn hình tổ trưởng thật còn chờ; không tuyên bố review khác họ đã PASS. Hai file WIP ngoài phạm vi giữ nguyên.