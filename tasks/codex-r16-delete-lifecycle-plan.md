# R16 — Xóa các đối tượng do GV tạo/thêm

13/10/2026. Chủ hệ thống yêu cầu rà tất: tạo/thêm được thì phải xóa được. R15 giữ kế hoạch, chưa triển khai.

**Chốt bổ sung của chủ hệ thống:** dữ liệu đã lưu Xóa vào Thùng rác trên Site, có Khôi phục; bản soạn chưa lưu dùng Hoàn tác. Không có thao tác xóa vĩnh viễn mặc định hoặc tự dọn Thùng rác. Các mô tả “xóa vĩnh viễn” phía dưới thuộc phân tích trước khi chốt, đã được thay bằng cơ chế Thùng rác.

## Phạm vi được giao
- [x] Rà source/API/UI toàn bộ lifecycle; danh sách trong báo cáo agent và mục này.
- [ ] Phòng game/tiết học: nút Xóa trong /hosts, xác nhận mã/tác động, API quyền/revision có sẵn, mã vào phòng ngừng hoạt động. Minh chứng phiên đã xóa không tính vào hộ chiếu.
- [ ] Lớp/hồ sơ HS/nhóm: dùng delete/revoke hiện có; thêm gỡ nhóm và xác nhận rõ lịch sử giữ lại; danh sách active cập nhật.
- [ ] Giải liên lớp, lớp/vòng đã thêm: xóa/gỡ có kiểm tra owner và trạng thái, kết quả đã chốt vẫn có nguồn gốc.
- [ ] Giáo án/nguồn/kịch bản/lượt AI: xóa khỏi thư viện bằng metadata độc lập, giữ immutable/provenance/quota và phiên đang dùng. Không xóa âm thầm file nguồn đã được tham chiếu.
- [ ] Đề/mã đề/câu hỏi/bài làm/ảnh: tận dụng delete có sẵn, thêm phần thiếu, khóa khi đang làm, xác nhận xóa vĩnh viễn nếu API đó xóa thật.
- [ ] Nội dung bản nháp, quyền/lời mời, mã thiết bị, điểm/nhận xét: kiểm nút xóa/thu hồi/đặt lại hiện có, không nhân API.
- [ ] Dọn đúng 5 phòng QA localhost theo ID và bằng chứng; backup trước, production không có phòng trong danh sách tại kiểm tra.
- [ ] Test quyền, xác nhận sai, race/revision, tài sản tham chiếu, link cũ, reload; focused/full/typecheck/lint/build, review chéo và browser QA.
- [ ] Cập nhật checklist/HANDOFF và báo cáo; chưa có duyệt phát hành R16.

## Thiết kế tối thiểu
Nút cạnh đúng đối tượng, xác nhận inline nêu tên/mã và ảnh hưởng. Không dùng hộp confirm của trình duyệt từng kẹt ở QA. Không thêm nút vào HUD HS. Chỉ người có quyền quản lý/xóa mới thấy và server kiểm lại. Phân biệt Xóa khỏi danh sách (còn bản ghi lịch sử) và Xóa vĩnh viễn (bài/ảnh mất): thông báo đúng cơ chế.

Rủi ro: trung bình/cao ở graph bài làm và provenance; UI thông thường thấp. Ưu điểm: GV tự dọn được; nhược điểm: nguồn immutable phải giữ lịch sử nên loại khỏi thư viện chưa giải phóng dung lượng R2. Không hứa xóa file thật khi chỉ ẩn.

## Hai lỗi giao diện đã xác minh, ghi riêng
- Tổ chức tiết học hiện đi /lessons: loadStudio tự chọn pkgList[0], tiêu đề hardcode Dãy số. Thiếu trang khởi tạo chọn hình thành kiến thức/luyện tập/ôn tập/kiểm tra. Cần sửa flow riêng; không dùng mục đích game thay loại tiết.
- Tạo phòng game dùng Next Link tới trang game script tĩnh: click production /hosts không đổi AX/URL; mở URL trực tiếp có form. Dùng điều hướng đầy đủ tới trang game để tránh SPA không chạy boot.
- Host toàn cục là quyền GV được tạo phòng mới trên hệ thống; chỉ Root mời, không phải cùng điều hành mọi phòng. Legacy là chuyển phòng cũ dùng mã quản trị sang tài khoản. Dùng tiếng Việt rõ và giữ khu quản trị thu gọn.

## Điều phối
Root: thiết kế/checklist, phòng/điều hướng, migration, dọn QA, gate và review.
Agent r16_class_delete: lớp/HS/nhóm/giải. Agent r16_exam_delete: kiểm tra. Agent r16_delete_audit: thư viện giáo án/nguồn/lượt AI.
Không writer trùng file. Repo WIP giữ nguyên. Review qua 9router khác hãng sau diff, không gọi Gemini API trả tiền hoặc sửa router. Hãng/model/quota ghi theo canary sống; chưa có canary thì unknown.

## Kết quả local cuối — 13/10
- [x] Phòng/tiết/đội/HS trong tiết; lớp/HS/nhóm; giải/enrollment/lượt; package/source/job/plan; đề/mã đề/câu/bài/ảnh: xóa/khôi phục qua Thùng rác, kiểm quyền và CAS.
- [x] Bản soạn chưa lưu Hoàn tác; ảnh không làm mất phần GV sửa, biến thể giữ thứ tự. Các điểm/nhận xét/quyền có cách xóa/thu hồi/đặt lại hiện hữu.
- [x] /trash và các liên kết; game điều hướng tải trang đầy đủ; đổi tên mời GV và chuyển phòng cũ. Legacy không đăng nhập phải chuyển phòng vào tài khoản trước xóa để có Thùng rác.
- [x] 1309/1309 full tests, typecheck/build đạt; lint0 errors/418warnings. 45 test sau chỉnh liên kết cuối, 12 root-final trước đó; native cuối166HTTP/7trashchecks/0external, 432sourcebyte-match.
- [x] Review độc lập phát hiện auth-race, restore marker ABA, source response stale và Undo ảnh; đã sửa/test. Gemini Flash low recheck domain +exam PASS; Flash hightimeout không tính PASS.
- [x] CUA synthetic Xóa→Trash→Khôi phục PASS. Sau chỉnh cuối chỉ liên kết native, kiểm /hosts→/trash PASS; native chạy lại trên Worker cuối. Không claim browser toàn domain hoặc lớp thật đã nghiệm thu.
- [x] 5 phòng QA cũ dọn theo ID có backup; tất cả phòng các runtime QA mới cũng dọn, active0, không sửa production.
- [x] Báo cáo/HANDOFF/plan chung/todo/lessons cập nhật.
- [ ] Màn khởi tạo bốn loại tiết: ghi backlog, chưa triển khai theo yêu cầu trả lời trước.
- [ ] Duyệt scoped release R16, migration0021/0022 và QA production sau deploy. R15 giữ kế hoạch.
