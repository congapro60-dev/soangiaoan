# OpenCode Desk — Đặc tả thiết kế

**Ngày:** 2026-08-22  
**Trạng thái:** Draft để người dùng duyệt trước khi lập kế hoạch triển khai

## 1. Mục tiêu

Xây dựng một ứng dụng desktop Windows riêng, có trải nghiệm hội thoại gần ChatGPT/Claude, để sử dụng OpenCode mà không cần mở PowerShell. Ứng dụng phải:

- Chọn và quản lý nhiều thư mục dự án.
- Gửi yêu cầu cho OpenCode qua giao diện chat.
- Đính kèm code/text, ảnh, DOCX, PDF và Excel.
- Lưu và mở lại các phiên OpenCode trước đó.
- Tiếp tục đúng ngữ cảnh của phiên đang dở, bao gồm phiên đã tạo từ PowerShell.
- Cho phép sửa, test, xem diff và chỉ push lên `main` sau khi người dùng yêu cầu.

## 2. Quyết định kiến trúc

- **Ứng dụng:** Electron + React + TypeScript.
- **OpenCode:** chạy `opencode serve` cục bộ và giao tiếp qua HTTP API + SSE, không đọc màn hình TUI và không tự xây một engine agent thứ hai.
- **Lịch sử phiên:** dùng session store/database chính của OpenCode. Không sao chép toàn bộ hội thoại sang một database riêng.
- **Dữ liệu giao diện:** chỉ lưu tùy chọn cục bộ như tên ghim, thứ tự, theme và danh sách project gần đây.
- **Phạm vi:** app riêng, không sửa hoặc nhúng vào SmartPlan AI.
- **Bảo mật server:** bind loopback, port động, mật khẩu phiên nội bộ; không mở server ra mạng LAN mặc định.
- **Cài OpenCode:** bản đầu dùng executable OpenCode đã có trên máy hoặc đường dẫn do người dùng chọn; app kiểm tra version qua health/capability endpoint và không tự tải, di chuyển hay sao chép credential. Nếu chưa có OpenCode, app dừng ở màn hình hướng dẫn cài, không giả lập một agent khác.
- **Bàn giao server:** trước khi khởi động, app dò server loopback đang chạy và tái sử dụng server nếu health, project directory và capability hợp lệ. Nếu không hợp lệ, app khởi động một server con duy nhất với port động, password ngẫu nhiên lưu trong Windows Credential Manager/memory và dọn server do app sở hữu khi thoát. Không đóng TUI PowerShell của người dùng.
- **TUI và web dùng chung dữ liệu:** app không đọc màn hình TUI. TUI và server web cùng đọc session store chính của OpenCode; khi phát hiện session vừa được cập nhật từ nơi khác, app tải lại phần chênh lệch và cảnh báo trước khi gửi prompt mới.

## 3. Bố cục giao diện

### Sidebar trái

- Nút `Chat mới`.
- Project hiện tại và nút đổi thư mục.
- Danh sách phiên, nhóm theo project và thời gian.
- Tìm kiếm theo tiêu đề/nội dung tóm tắt.
- Mỗi phiên có các hành động: mở lại, đổi tên, fork, export, xoá.
- Nhãn trạng thái: đang chạy, đang chờ quyền, đã hoàn tất, lỗi, đang compact.

### Khu vực chat giữa

- Tin nhắn người dùng và phản hồi OpenCode dạng hội thoại.
- Tool call, lệnh shell, file đọc/sửa và log dài được thu gọn nhưng có thể mở rộng.
- Composer hỗ trợ kéo-thả/dán file, xem danh sách attachment trước khi gửi.
- Chọn model, agent (`Plan`/`Build`) và mức hiển thị thinking/details.
- Nút dừng tác vụ và nút yêu cầu compact/tóm tắt phiên.

### Inspector phải

Các tab:

1. **Files/Diff:** file thêm/sửa/xoá, patch và số dòng thay đổi.
2. **Tests:** lệnh đã chạy, trạng thái PASS/FAIL, log và nút chạy lại.
3. **Git:** branch, working tree, commit dự kiến và nút `Đẩy lên main`.
4. **Context:** model, token usage, compaction summary, file đính kèm và phiên cha/con.

## 4. Luồng làm việc

1. Mở app → kiểm tra OpenCode và khởi động server cục bộ nếu chưa chạy.
2. Chọn project → gọi danh sách session của OpenCode.
3. Nếu có phiên gần nhất chưa hoàn tất, hiển thị banner `Tiếp tục phiên đang dở`.
4. Người dùng mở phiên → app tải message history và trạng thái hiện tại.
5. Người dùng gửi yêu cầu mới hoặc đính kèm file.
6. OpenCode xử lý; app nhận stream sự kiện và cập nhật giao diện.
7. Nếu cần sửa code, app chuyển sang Build và hiển thị permission request khi OpenCode yêu cầu.
8. Sau khi sửa, app hiển thị diff và kết quả test.
9. App **không tự push**, nhưng không khóa quyền push. Khi người dùng nói `push lên main` hoặc bấm nút `Đẩy lên main`, app:
   - Hiển thị lại danh sách file sẽ commit.
   - Chỉ stage file được chọn/được xác định thuộc task.
   - Hiển thị branch nguồn, branch đích `main`, commit message và lệnh Git dự kiến.
   - Sau lần xác nhận cuối, tạo commit trên branch hiện tại và push trực tiếp `HEAD:main` bằng push không force; nếu đang ở `main` thì push `main`.
   - Dừng nếu `main` bị diverge, branch bị bảo vệ, quyền GitHub thiếu hoặc preflight phát hiện thay đổi ngoài phạm vi; không tự rebase, merge, force-push hay tạo PR.
   - Báo commit hash, kết quả push và lỗi GitHub nếu có.

## 5. Đồng bộ phiên và ngữ cảnh

App phải dùng cùng môi trường dữ liệu OpenCode hiện tại, không dùng server `--standalone` hoặc database riêng cho phiên chính.

Các thao tác chính:

- `GET /session`: lấy các phiên có sẵn.
- `GET /session/:id`: đọc metadata của phiên.
- `GET /session/:id/message`: tải lịch sử hội thoại.
- `GET /session/status`: hiển thị trạng thái đang chạy/chờ.
- `GET /event`: nhận sự kiện realtime qua SSE.
- `POST /session/:id/message` hoặc `prompt_async`: gửi prompt.
- `POST /session/:id/fork`: tạo phiên nhánh từ message được chọn.
- `POST /session/:id/summarize`: compact/tóm tắt theo yêu cầu.
- `GET /session/:id/diff`: lấy diff hiện tại.
- `POST /session/:id/revert` và `unrevert`: phục hồi thay đổi.
- Export/import session để sao lưu hoặc chuyển máy.

OpenCode tự lưu message history và có cơ chế compaction. Khi compact, phần cũ được tóm tắt cho context đang hoạt động nhưng các message lịch sử vẫn phải mở lại được trong app.

### Quy tắc nhận diện và đồng bộ phiên

- App lấy capability/schema runtime từ `/doc`, kiểm tra version từ `/global/health`, phân trang danh sách session và tạo một khóa duy nhất cho mỗi `{projectID, sessionID}`.
- Một session được gắn `đang dở` nếu status API đang busy/permission-pending, hoặc message cuối của assistant chưa có thời điểm hoàn tất và chưa có kết quả lỗi. Nếu dữ liệu cũ không đủ kết luận, app gắn `cần kiểm tra`, không tự gửi prompt.
- Nếu có nhiều session dở, app liệt kê tất cả theo `updatedAt`, đánh dấu session gần nhất là gợi ý chứ không tự chọn thay người dùng. Khi mở, app dùng đúng session ID; không tạo session mới và không nhân bản message.
- Trước mỗi prompt, app re-fetch metadata/message tail. Nếu `updatedAt` hoặc message tail đã đổi vì TUI/web khác đang hoạt động, app merge/reload rồi yêu cầu người dùng xác nhận tiếp tục.
- SSE có `eventKey` gồm loại sự kiện, session ID, message/part ID và sequence/time; app lưu các key đã xử lý trong phiên chạy để reconnect không nhân đôi message. Mất kết nối sẽ tải lại tail trước khi nối stream lại.
- “Lưu context” được tách thành: (a) transcript/message và compaction do OpenCode giữ; (b) attachment descriptor + hash/cache do app giữ; (c) ghi chú, tên ghim, bộ lọc và trạng thái inspector do app giữ. Export/import phải ghi rõ phần nào thuộc mỗi nhóm.

Phiên SmartPlan đang dở phải được phát hiện động theo project directory và trạng thái session; không hard-code session ID. Baseline kiểm tra ngày 2026-08-22 đã thấy OpenCode API nhận diện session của `C:\Users\ADMIN\Downloads\smart-lesson-plan-ai` và app phải mở lại đúng session đó khi project được chọn.

## 6. File và attachment

- Mỗi file đi qua một `AttachmentDescriptor` gồm tên, MIME, size, hash, đường dẫn nguồn, trạng thái parse/preview và khả năng gửi native.
- Code/text nhỏ: gửi bằng `text part` hoặc `file part` theo schema runtime của OpenCode; luôn giữ tên file và đường dẫn tương đối để AI biết nguồn.
- Ảnh: preview trước khi gửi; nếu model hiện tại có capability image thì gửi native `file part` đúng MIME. Nếu không có, app chặn với lý do cụ thể thay vì giả vờ rằng model đã đọc ảnh.
- DOCX: giữ file gốc trong app cache ngoài repository, trích xuất text/heading/table và gửi phần chuẩn hoá trong `text part`; preview trang dùng để kiểm tra layout, không tự chèn ảnh preview vào repo.
- PDF: trích xuất text và số trang; với PDF scan, render trang được chọn thành image part nếu model hỗ trợ vision, nếu không thì báo rõ phần nào chưa thể đọc.
- Excel: đọc workbook/sheet/range, hiển thị preview bảng và gửi vùng người dùng chọn thành bảng chuẩn hoá trong `text part`; không gửi toàn workbook mù quáng.
- Attachment adapter phải kiểm tra request schema tại `/doc`, MIME, kích thước và giới hạn context trước khi gửi; lỗi parse/unsupported/too-large có trạng thái riêng và không gửi prompt nửa vời.
- File ngoài project được hash và lưu cache tạm ngoài repository để session resume còn tham chiếu; khi file nguồn mất hoặc hash đổi, app báo `attachment unavailable/changed` và yêu cầu chọn lại. Cache được dọn theo chính sách retention của app, không xoá file gốc.
- Giới hạn kích thước mặc định và thông báo rõ khi file quá lớn.
- Cảnh báo/chặn `.env`, private key, credential và file có dấu hiệu chứa bí mật.
- Không tự copy file vào repository nếu người dùng chưa yêu cầu.

## 7. Quyền, GitHub và an toàn

- Plan mode ưu tiên đọc/phân tích và chờ người dùng duyệt.
- Build mode được sửa file và chạy lệnh theo permission của OpenCode.
- Permission request của OpenCode phải hiện thành hộp thoại dễ hiểu, không giấu trong log.
- Push là external write: chỉ chạy sau hành động rõ ràng của người dùng.
- Không dùng `git add .` mặc định.
- Nếu working tree có thay đổi ngoài task, app phải liệt kê và để nguyên; không silently commit chúng.
- Nếu người dùng yêu cầu push toàn bộ thay đổi hiện tại, app phải cảnh báo phạm vi trước khi cho xác nhận.
- Git preflight phải đọc branch, upstream, `status --short`, diff thống kê và tình trạng remote trước khi cho nút xác nhận cuối; không suy đoán file thuộc task từ toàn bộ working tree.
- Tab Tests đọc scripts trong `package.json`/cấu hình dự án và cho người dùng chọn lệnh; tiến trình chạy với cwd là project, timeout/huỷ rõ ràng, output streaming và không có test thì hiển thị trạng thái `not configured`. Test fail chặn nút push cho đến khi người dùng xác nhận bỏ qua trong hộp thoại riêng.

## 8. Tính năng lấy từ OpenCode hiện tại

- Continue/resume session.
- Fork session để thử hướng sửa khác.
- Undo/redo dựa trên snapshot Git.
- Compact context thủ công/tự động.
- Hiển thị tool details và thinking theo tùy chọn.
- Custom commands như `/test`, `/review`, `/docx-qa`.
- Thống kê token, model, tool usage và chi phí.
- Export/import session JSON có chế độ sanitize.
- Share session chỉ thủ công, tắt mặc định trong app vì link là công khai.
- Kiểm tra executable OpenCode, version, server đang chạy và hướng dẫn sửa PATH/đường dẫn binary.

## 9. Xử lý lỗi

- OpenCode chưa cài hoặc sai version → hướng dẫn cài/repair.
- Server không khởi động → hiển thị port, log và nút retry.
- Mất SSE → tự reconnect và không nhân đôi message.
- Session bị xoá/không còn tồn tại → thông báo và cho mở session khác.
- Model không hỗ trợ attachment → chặn gửi kèm lý do cụ thể.
- Compact thất bại → giữ nguyên lịch sử, cho retry thủ công.
- Test fail → không hiện trạng thái thành công và không kích hoạt nút push.
- GitHub auth/branch protection fail → giữ nguyên diff, hiển thị lỗi và hướng xử lý.

## 10. Tiêu chí nghiệm thu

1. App desktop mở được bằng shortcut, không cần PowerShell.
2. App tự khởi động/kết nối OpenCode server cục bộ.
3. Phiên SmartPlan đang dở hiện trong danh sách, có lý do trạng thái và mở lại được đúng message history.
4. Gửi prompt mới trong phiên cũ tiếp tục đúng session ID, không tạo bản sao, và nhận stream kết quả; nếu TUI cập nhật đồng thời thì app cảnh báo/reload trước khi gửi.
5. Khởi động lại app vẫn xem được lịch sử phiên.
6. Tạo phiên mới, fork phiên, đổi tên, export và import hoạt động.
7. Attach ảnh/code/DOCX/PDF/Excel có preview; mỗi loại hoặc được gửi theo native capability hoặc được chuẩn hoá thành context có nguồn, và lỗi/giới hạn hiển thị rõ.
8. Diff, test, permission request và nút dừng hiển thị rõ.
9. Không có push khi người dùng chưa yêu cầu; khi người dùng yêu cầu, chỉ các file được duyệt mới được commit/push không force lên `main`, hoặc app dừng với lý do preflight.
10. Build/type-check/test của app mới đạt trước khi đóng gói installer Windows.

## 11. Ngoài phạm vi bản đầu

- Đồng bộ lịch sử lên cloud riêng.
- Multi-user/team workspace.
- Tự động share public.
- Mobile app.
- Tự động sửa hoặc commit toàn bộ repository không qua review.
