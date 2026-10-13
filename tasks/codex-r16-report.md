# R16 — Xóa, Thùng rác và Hoàn tác

13/10/2026. **Hoàn tất local; chưa phát hành.** Chủ hệ thống yêu cầu mọi đối tượng tạo/thêm phải có đường xóa và phục hồi; đã chốt Thùng rác cho dữ liệu lưu, Hoàn tác cho bản soạn chưa lưu. R15 giữ lại.

## Chức năng đã có

- /hosts có Xóa phòng game/tiết, nhập mã xác nhận; /trash xem các mục của mình, loại/thời gian, Khôi phục có xác nhận, phân trang. Mã phòng dừng khi xóa; bài làm giữ nguyên. Phiên đã xóa không còn cộng hộ chiếu/bảng giải.
- Lớp, hồ sơ HS, nhóm cố định, giải, lớp trong giải, lượt/phiên liên kết: xóa/khôi phục, giữ ID và lịch sử. Không tự ghi đè việc xếp nhóm hoặc mốc điểm đã thay đổi.
- Học liệu đã lưu, nguồn nhập/ý tưởng, lượt AI, kịch bản: thư viện 5 mục/trang, chuyển vào Thùng rác/khôi phục. Nguồn và provenance bất biến còn lưu; các tiết đang dùng giữ snapshot.
- Kiểm tra: đề/phòng, mã đề/câu, bài từng HS, từng hình câu/phương án/ý/lời giải/ảnh bài làm đều có cơ chế Trash. Ảnh đi cùng câu gốc khi đánh lại ID; bản khôi phục cũ không xóa lần đưa vào Trash mới.
- Đội game và HS gỡ khỏi tiết có Trash. Quyền/lời mời/mã thiết bị/huy hiệu/trợ giảng dùng Thu hồi/Dừng hiện hữu, không tự khôi phục quyền đã thu hồi.
- Bản nháp chưa lưu có Hoàn tác. Bản soạn bài khôi phục bản trước lần xóa gần nhất, nêu rõ các chỉnh sửa sau lần xóa cũng trở về bản đó; bản soạn đề khôi phục mục/ảnh vừa bỏ, giữ chỉnh sửa khác và thứ tự câu.
- Nút tạo game từ /hosts dùng tải trang đầy đủ; đã kiểm click tới form. Mời host đổi thành “Mời giáo viên được tạo phòng”; legacy đổi thành “Chuyển phòng cũ vào tài khoản”.

## Bốn phản ánh ban đầu

1. **Tổ chức tiết học mở Dãy số:** xác nhận loadStudio tự chọn gói đầu và tiêu đề hardcode. Cần màn khởi tạo chọn Hình thành kiến thức/Luyện tập/Ôn tập/Kiểm tra rồi nội dung. Phần này **chưa sửa**, nằm backlog riêng sau yêu cầu trả lời trước; không đánh dấu xong cùng Xóa.
2. **Tạo phòng game không chạy:** đã sửa Link sang điều hướng đầy đủ để boot script; CUA localhost thấy form.
3. **Host toàn cục/legacy:** host toàn cục cấp quyền GV tạo phòng riêng, không tự quản lý mọi phòng; legacy chuyển phòng quản lý bằng mã cũ sang tài khoản. Copy mới rõ hơn, khu quyền vẫn thu gọn.
4. **Phòng test:** dọn đúng5 phòng cũ trong QA localhost, chủ sở hữu @example.invalid; có SQLite backup và bằng chứng ID. Các runtime QA mới đều dọn phòng trước dừng, active0. Production danh sách phòng trống ở audit; không xóa dữ liệu thật.

## Kiểm chứng

| Kiểm tra | Bằng chứng |
|---|---|
| Full tests | 1309/1309 PASS, `tasks/codex-r16-tests.log` |
| Typecheck / lint / build | typecheck0; lint0errors/418warnings; buildPASS trong candidate đúng Site |
| Chỉnh cuối liên kết | 45focusedPASS, `tasks/codex-r16-last-ui-tests.log`; chỉ native anchors, không logic API |
| Worker cuối/D1/R2 | 166HTTP,7Trashchecks,0external; `tasks/codex-r16-trash-native.json` |
| Source | 432file byte-match root↔candidate; Worker9dd4b39294eb58d6e5fc5d9201c6f8d72986bda288b3a2bf3040bf8bc79efdee |
| Browser | syntheticroomdelete→Trash→restorePASS; /hosts→/trash cuốiPASS; `tasks/codex-r16-trash-restored.jpg` |
| Review | Native independent reviewers found/fixed races and Undo loss; GeminiFlashlow recheck domain/exam PASS. Flashhigh timeout twice = unknown, không PASS |
| QA cleanup | `tasks/codex-r16-qa-cleanup.json`; native/browser reports cleanup active0 |

Review phản hồi được đối chiếu: SQL rooms.code có UNIQUE cả phòng đã xóa nên nhận định tái dùng mã trùng không tái hiện; source pending bị đổi failed trước restore nên parser cũ không publish; baseline khôi phục theo snapshot và từ chối khi mốc mới khác. Recheck trên source đầy đủ PASS. Không sửa thừa theo finding chỉ phỏng đoán.

## Giới hạn và phát hành

- Giữ Trash không giải phóng dung lượng nguồn/ảnh, không hoàn quota AI. Không tự gọi AI khi khôi phục. Nguồn bị xóa trong lúc đọc chuyển cancelled/failed; tải lại nguồn nếu muốn xử lý mới.
- Khôi phục mục gốc trước mục phụ. HS bị xóa riêng cần cấp PIN mới. Đội game chỉ khôi phục ở cùng revision phòng để không ghi đè tiến độ mới; trường hợp xung đột vẫn giữ dữ liệu trong Trash, trả lỗi rõ.
- HS gỡ khỏi tiết không khôi phục tham gia khi tiết đã kết thúc; bài/hồ sơ vẫn giữ. Khôi phục không xóa quyền đã bị thu hồi hoặc thay bài làm khác.
- CUA từng treo sau xóa học liệu ở build trước; reset runtime browser khôi phục kết nối, xác minh thao tác đã thực hiện. Không tính lỗi công cụ đó là pass; browser final chỉ xác minh phạm vi ghi ở bảng, API/test bao phủ phần còn lại.
- Cần migrations0021/0022 (additive, đã chạy trên actualD1QA). Snapshots/journal/schema đã cập nhật. Rollback không drop bảng/xóa Trash; bản cũ chưa hiểu tombstone một số domain nên phải kiểm rollout/rollback có kiểm soát trước phát hành.
- Chưa commit/push/deploy; không đổi khóa, quyền hoặc dữ liệu HS thật. Không deploy hosting.json root vì trỏ Site khác. Candidate `.sites-runtime/takeover-candidate-20261011` đúng project appgprj_6ac8d74b14f8819193caded9533bb337.
- Các gate R14 nguồn/năm/lớp thật/thiết bị/3D vẫn giữ; R16 không chứng minh nghiệm thu lớp150HS40phút. R15 chưa triển khai.
