# Sửa hiển thị công thức và phân biệt lượt nộp — Implementation Plan

## Mục tiêu

1. Công thức trong `Bài làm của em` và `Đáp án / mốc cần đạt` phải được render bằng KaTeX như các trường nhận xét khác.
2. Xác minh chính xác vì sao giáo viên thấy nhiều dòng cùng một học sinh: nhiều ảnh trong một lượt nộp hay nhiều request/lượt nộp độc lập.
3. Không gộp hoặc xoá lịch sử nộp hợp lệ; học sinh vẫn phải có thể nộp lại/bổ sung ảnh theo contract đã duyệt.

## Tiêu chí chấp nhận

- Có test đỏ trước khi sửa renderer, tái hiện công thức LaTeX ở cả hai trường bị lỗi.
- Sau sửa, test xác nhận cả hai trường tạo node KaTeX; `Bài làm` và `Đáp án` không còn hiện nguyên `$...$`/`\\in`.
- Có bằng chứng từ code/test rằng một lần chọn nhiều ảnh được giữ trong một queue và gọi `submitHomework` một lần; không kết luận web tự tách ảnh thành nhiều bài nếu chưa tái hiện.
- Không chặn nộp lại hợp lệ hoặc làm thay đổi dữ liệu/submission hiện có.
- `npm run test`, `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check` đều đạt.
- QA độc lập đọc diff bằng Ox Alpha Free/OpenCode nếu CLI khả dụng; không dùng verdict khi lệnh/provider lỗi.

## Các bước

- [x] Tạo worktree/nhánh riêng và kiểm tra baseline.
- [x] Thêm test renderer đỏ cho `QuestionResultsList`.
- [x] Sửa hai trường công thức dùng `NhanXetMarkdown`; chạy targeted test xanh.
- [x] Audit `StudentPortalPage`, `uploadQueue`, `submitHomework`, server supplement và card trạng thái; không thêm guard speculative vì không tái hiện được double-submit.
- [x] Chạy full verification và QA độc lập.
- [x] Cập nhật handoff/checklist với giới hạn còn lại; chưa push/deploy nếu chưa có lệnh riêng.

## Review/verification

- Renderer regression: test đỏ trước sửa (`0` KaTeX), sau sửa test kiểm tra riêng cả hai vùng nhãn và pass.
- Full unit: `83 files / 1.130 tests` pass; frontend `lint`, `lint:api`, `build`, `git diff --check` pass.
- Build vẫn có các warning chunk lớn và dynamic-import baseline; không phát sinh lỗi build.
- Ox Alpha Free/OpenCode (`opencode/x-preview-f-free`, plan agent) audit độc lập đạt `PASS`. Góp ý test đếm class KaTeX rộng đã được siết theo từng trường và xác nhận lại bằng test/typecheck.
- Kết luận nộp trùng: một queue nhiều ảnh → một `submitHomework` → một submission document. Các dòng “Lần nộp mới nhất/Lần nộp trước” là các lần nộp riêng; nộp bổ sung có `supplementOf` và giữ lịch sử. Không sửa dữ liệu và không gộp lịch sử.
- Chưa push/deploy; chưa chạy authenticated E2E trên phiên học sinh thật trong phạm vi thay đổi này.
