# R17 — Khởi tạo bốn loại tiết học

13/10/2026. **Hoàn tất local, chưa phát hành.** R15 giữ kế hoạch; R16 Thùng rác giữ nguyên.

## Hành vi mới

- Nút **Tổ chức tiết học** ở /hosts mở /lessons/new, yêu cầu đăng nhập GV. Bước1 có Hình thành kiến thức/Luyện tập/Ôn tập/Kiểm tra; chưa chọn mặc định, nút Tiếp tục khóa khi chưa chọn.
- Bước2: ba loại bài học chọn thư viện hoặc nhập giáo án/ý tưởng. Nhập mới chọn lớp10–12 và thời lượng5–240phút; thư viện chỉ GET khi GV chọn, không lấy bài đầu/pilot. Hiện tên học liệu, phiên bản, trạng thái; chọn bài giữ khối/thời lượng gốc, có giải thích trước mở.
- Kiểm tra chuyển riêng /exams?setup=new&minutes=..., mở thẳng tạo đề. Thời lượng chuyển vào ExamImport qua prop được kiểm tra. Không thêm trường khối giả vào mô hình đề chưa hỗ trợ.
- /lessons trực tiếp dẫn màn khởi tạo; /lessons?session=... vẫn mở đúng phiên cũ. Newsetup không hồi phục phiên/nguồn cũ từ sessionStorage. Nhập mới mở đúng tab và màn soạn trống, không giả trạng thái đang tải mãi. Tiêu đề theo nội dung hiện tại, bỏ hardcode Dãy số.
- Học liệu thư viện giữ nội dung đã duyệt. Nếu muốn chuyển cấu trúc sang loại tiết khác, GV nhập nguồn để soạn mới, rà và duyệt; không âm thầm viết lại học liệu đang dùng.
- Loại tiết formation/practice/review được kiểm tra và lưu trong generation.settings, đi vào prompt trọng tâm tương ứng. Consent/fingerprint ràng buộc mục đích, nguồn, khối, thời lượng, phạm vi, model/endpoint. Đổi cấu hình phải đồng ý lại; phục hồi/áp dụng job phải khớp cấu hình mới. Yêu cầu cũ không purpose giữ tương thích.
- Bản nháp thủ công dùng đúng môn/khối/thời lượng đã chọn. Không tự sinh mục tiêu/đáp án hoặc tự duyệt. Kiểm tra lại kết nối AI có nút riêng nếu cấu hình thay đổi.
- Màn nhập giải thích thao tác bằng ngôn ngữ GV; mã nguồn cũ thu gọn, không đưa R2/D1/SHA/KaTeX vào hướng dẫn chính. 375px đủ bốn lựa chọn và nút Tiếp tục.

## Kiểm chứng

- Full1328/1328PASS, `tasks/codex-r17-tests.log`; focused47/47 sau chỉnh UX cuối, `tasks/codex-r17-focused.log`.
- Typecheck0;lint0errors/421warnings;buildPASS trong candidate đúng Site. Không thêm dependency/migration.
- 438sourcefile root↔candidatebyte-match, `tasks/codex-r17-final-source.json`. Worker a5b15b02c87ecca3653e23f6c58bc8d88cbcf97ee0f89b6f2d6235144fc75bc6.
- ActualWorker/D1/R2:8creationroutechecks+7Trashchecks,0external,178requests trước thao tác browser. Nativefixture vẫn dùng dữ liệu giả từ R16, không thay responseAPI.
- CUA từ /hosts tới wizard, Ôn tập nhập mới lớp12/80 đúng header/tab/blank, Kiểm tra80mở nhập đề, Luyện tập chọn đúng package từ thư viện khối/thời lượng gốc. Kiểm375x812 bốn lựa chọn+CTAvisible; đã reset viewport về mặc định.
- Ảnh `tasks/codex-r17-creation-start.jpg`, `tasks/codex-r17-creation-mobile.jpg`. Browserreport `tasks/codex-r17-browser-server.json` cleanup4rooms active0; failedfixture được dọn riêng `tasks/codex-r17-failed-fixture-cleanup.json`.
- Hai agent review chéo; sửa các lỗi no-pilot/loading, mismatchsettingsrecovery, manualgrade/duration, consentretry/snapshothash, librarymetadata. GeminiFlashlow compactrecheckPASS0findings `tasks/codex-r17-review-r17-final-compact.json`. Review dài ban đầu trả các nháp kết luận mâu thuẫn (có câu “No bug here”), không dùng làm PASS; highvarianttimeoutunknown không gọi là hếtquota.
- Kiểm AI thực thi dùng provider giả trong tests; không gọi AI thật hoặc dùng key thật ở lượt này. Browser kiểm nhập đề tới màn chọn file, chưa tải đề để tạo phòng mới; cấu hìnhduration được test đường prop/parse.

## Phát hành và bàn giao

Chưa commit/push/deploy. ProductionR14v10 giữ nguyên. Candidate `.sites-runtime/takeover-candidate-20261011` đúng project appgprj_6ac8d74b14f8819193caded9533bb337; không deploy hosting.json root. R16migrations0021/0022 vẫn cần release theo scopedplan nếu phát hành cả đợt.

Gate nguồn/năm/học liệu/lớp150HS40phút/thiết bịthật/3D của R14 và triển khaiR15 không bị đánh dấu xong bởi R17. Kế hoạch đã cập nhật cho Claude; công việc khởi tạo4loại local đã hoàn thành, phát hành theo chủ hệ thống duyệt.
