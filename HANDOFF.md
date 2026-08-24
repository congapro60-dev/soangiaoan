# HANDOFF — Soạn giáo án / lớp học / chấm AI

**Cập nhật:** 2026-08-24
**Repo:** `soangiaoan` · **Branch chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Đây là snapshot hiện tại. Lịch sử các lô cũ xem trong [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md) và `git log`.

## 1. Trạng thái đã bàn giao

`main` hiện ở `5beffd1`, gồm:

- `afaa725`: chi tiết chấm AI theo từng câu, nguồn đề giáo viên, lệnh phạm vi chấm và các hàng rào duyệt.
- `9a28f6f`: dọn file Storage trước khi xoá bài; URL hỏng trả lỗi cụ thể và giữ document để sửa/thử lại.
- `c1d4343`: lệnh phạm vi AI áp dụng xuyên suốt bài giao.
- `5beffd1`: cập nhật handoff cho lô trên.

### Lô `c1d4343` — lệnh phạm vi AI của bài giao

- Ô lệnh nằm ngay cạnh **Đề gửi học sinh**, không hiện trong portal học sinh.
- `gradingInstructions` được truyền qua form → `gradingApi.ts` → `api/grade-homework.ts` → cả prompt giải đáp án và prompt hướng dẫn chấm.
- Assignment lưu lệnh; các lần nộp mới, nộp lại và chấm lại đọc bản mới nhất từ Firestore.
- Khi có lệnh, prompt chỉ giải/chia điểm phần được giao; phần bỏ qua không có đáp án nháp, mốc điểm, lỗi thường gặp hoặc `weakTopics` giả.
- Prompt xử lý phạm vi mơ hồ/mâu thuẫn bằng cảnh báo để giáo viên soát; không dùng regex hậu xử lý để cắt đáp án.
- OpenCode Ox Alpha implementer làm TDD RED → GREEN. OpenCode Ox Alpha QA độc lập phát hiện và sửa hai mâu thuẫn cũ: “giải từng câu” và “chia điểm cho từng câu”.

## 2. Bằng chứng kiểm thử lô mới nhất

- Prompt targeted: **60/60 pass**.
- Full Vitest: **70 files / 1.049 tests pass**.
- `npm run lint`: pass.
- `npm run lint:api`: pass.
- `npm run build`: pass; chỉ còn warning chunk/dynamic import vốn có.
- `git diff --check`: pass.
- Firestore rules không đổi trong lô này; baseline trước đó: **7 files / 238 tests pass**.

## 3. Rủi ro và việc còn lại

- AI vẫn là mô hình xác suất: đáp án và rubric phải được giáo viên soát trước khi giao/chấm.
- Đáp án/rubric đã sinh trước khi nhập hoặc sửa lệnh không tự sinh lại; bấm lại nút AI hoặc sửa tay.
- `gradingInstructions` vẫn nằm trong document assignment. UI không hiển thị cho học sinh, nhưng đây chưa phải field-level secret; muốn tách tuyệt đối phải có private grading config riêng.
- Chưa có authenticated E2E với tài khoản/lớp thật trên production.
- Chưa xác nhận deployment Vercel của commit `5beffd1` trong phiên này; không coi production đã cập nhật nếu chưa thấy deployment Ready/Production tương ứng.
- Các URL Storage cũ không nhận diện an toàn sẽ làm thao tác xoá thất bại có chủ ý thay vì xoá nhầm.

## 4. Kiểm tra production cần owner thực hiện

1. Xác nhận `GRADING_GEMINI_API_KEY`, Anonymous Auth, Storage rules và Firestore indexes trên Firebase/Vercel.
2. Mở production bằng tài khoản giáo viên, tạo assignment có lệnh “Bỏ bài 4.3…”, bấm cả hai nút AI và soát đáp án/rubric.
3. Gửi một bài mới, nộp lại, sửa lệnh trong bảng bài giao rồi chấm lại để xác nhận bản cập nhật được dùng.
4. Kiểm thử portal học sinh trên màn hình 320/375px, upload ảnh/PDF, lỗi mạng, retry và trạng thái nộp lại.

## 5. File trọng tâm

| Luồng | File |
|---|---|
| Form giao bài | `src/components/features/classroom/AssignmentFormModal.tsx` |
| Bảng bài giao/sửa assignment | `src/components/features/classroom/AssignmentPanel.tsx` |
| Lưu assignment | `src/lib/classroom/submissionService.ts` |
| Prompt chung | `src/lib/classroom/gradingPrompt.ts` |
| Client AI | `src/services/gradingApi.ts` |
| API chấm/giải/rubric | `api/grade-homework.ts` |
| Kiểu dữ liệu | `src/lib/classroom/types.ts` |
| Portal học sinh | `src/pages/StudentPortalPage.tsx`, `src/components/features/classroom/student/` |
| Rules | `firestore.rules`, `storage.rules` |

## 6. Quy ước

- Không dùng `git add .` trong worktree có thay đổi ngoài phạm vi.
- Không tuyên bố deploy production nếu chưa kiểm tra deployment thực tế.
- Với prompt có phạm vi, test phải kiểm cả chỉ dẫn mới và sự vắng mặt của chỉ dẫn tổng quát mâu thuẫn.
