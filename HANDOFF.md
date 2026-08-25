# HANDOFF — Soạn giáo án / lớp học / chấm AI

**Cập nhật:** 2026-08-25
**Repo:** `soangiaoan` · **Branch chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Đây là snapshot hiện tại. Lịch sử các lô cũ xem trong [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md) và `git log`.

## 1. Trạng thái đã bàn giao

`main` trước lô phát hành này ở `b0a9a478`; commit sắp đẩy là `ca9fd1a` (kèm spec commit `074f288`), gồm nền tảng các lô trước và các thay đổi classroom sau:

- `afaa725`: chi tiết chấm AI theo từng câu, nguồn đề giáo viên, lệnh phạm vi chấm và các hàng rào duyệt.
- `9a28f6f`: dọn file Storage trước khi xoá bài; URL hỏng trả lỗi cụ thể và giữ document để sửa/thử lại.
- `c1d4343`: lệnh phạm vi AI áp dụng xuyên suốt bài giao.
- `5beffd1`: cập nhật handoff cho lô trên.

### Lô `5574227` → `7c80579` — vòng đời nộp bài và kết quả chấm an toàn dữ liệu

- Học sinh có thể bổ sung ảnh/file cho cùng bài; server ghép evidence cũ + mới, tạo revision và chấm lại toàn bộ evidence.
- Giáo viên có thể xóa riêng điểm mà vẫn giữ submission, ảnh/file, Storage và nội dung học sinh; xóa cả lượt nộp vẫn là thao tác riêng.
- Sửa điểm bằng tay lưu lịch sử append-only và buộc duyệt lại; AI chấm lại lưu kết quả cũ vào history, tạo kết quả mới chưa duyệt; AI lỗi giữ nguyên kết quả cũ.
- Duyệt/bỏ duyệt điểm đi qua server transaction; kiểm tra chéo `teacherId`, `classId`, `studentCode`, `assignmentId` và khóa các thao tác xung đột khi trạng thái là `grading`.
- Claim token + transaction finalize ngăn worker AI cũ ghi đè sau stale recovery, sửa tay hoặc xóa điểm; history dùng revision id ổn định để retry không nhân bản.
- Không có migration/bulk mutation production; không tạo Vercel Function mới. `api/_grade-lifecycle.ts` là helper, còn action chạy trong các function hiện có.

### Lô `c1d4343` — lệnh phạm vi AI của bài giao

- Ô lệnh nằm ngay cạnh **Đề gửi học sinh**, không hiện trong portal học sinh.
- `gradingInstructions` được truyền qua form → `gradingApi.ts` → `api/grade-homework.ts` → cả prompt giải đáp án và prompt hướng dẫn chấm.
- Assignment lưu lệnh; các lần nộp mới, nộp lại và chấm lại đọc bản mới nhất từ Firestore.
- Khi có lệnh, prompt chỉ giải/chia điểm phần được giao; phần bỏ qua không có đáp án nháp, mốc điểm, lỗi thường gặp hoặc `weakTopics` giả.
- Prompt xử lý phạm vi mơ hồ/mâu thuẫn bằng cảnh báo để giáo viên soát; không dùng regex hậu xử lý để cắt đáp án.
- OpenCode Ox Alpha implementer làm TDD RED → GREEN. OpenCode Ox Alpha QA độc lập phát hiện và sửa hai mâu thuẫn cũ: “giải từng câu” và “chia điểm cho từng câu”.

### Lô `074f288` → `ca9fd1a` — lọc lịch sử lượt nộp và sửa công thức nhận xét

- Màn hình giáo viên mặc định hiển thị đúng lượt nộp mới nhất của mỗi học sinh; có nút **Chỉ lượt mới nhất / Hiện cả lịch sử** để chuyển phạm vi xem.
- Lượt cũ không bị ghi đè hoặc tự động xóa. Giáo viên vẫn có thể mở lịch sử và chọn đúng lượt cũ để xóa có chủ đích.
- **Chọn lượt đang hiển thị** chỉ chọn các dòng thuộc projection hiện tại; chấm AI/duyệt tiếp tục chỉ xử lý lượt mới nhất, tránh chấm hoặc xóa nhầm dòng đang ẩn.
- Báo cáo/current calculations tiếp tục dùng projection mới nhất, không tính trùng các lần nộp; không đổi schema, API, Firestore rules, Storage hoặc dữ liệu 11 Columbus.
- Hai trường **Bài làm của em** và **Đáp án / mốc cần đạt** đi qua renderer Markdown/KaTeX để công thức Toán không còn hiện nguyên `$...$`/lệnh LaTeX.

## 2. Bằng chứng kiểm thử lô mới nhất

- Targeted lifecycle/hardening: **5 files / 37 tests pass**.
- Full Vitest: **83 files / 1.131 tests pass**.
- Firestore rules: **7 files / 242 tests pass**.
- `npm run lint`: pass.
- `npm run lint:api`: pass.
- `npm run build`: pass; chỉ còn warning chunk/dynamic import vốn có.
- `git diff --check`: pass.
- Ox Alpha Free/OpenCode audit trước của lô lifecycle: model `opencode/x-preview-f-free` — **PASS 7/7 hạng mục**. Lượt audit mới cho combined diff đã gọi đúng model/variant `max` nhưng provider trả `Endpoint is unavailable`, nên không dùng verdict PASS mới.
- Production smoke trước deploy: đã mở production và đọc lại lớp `11Columbus`/Bài nộp, thấy dữ liệu thật, 20/26 học sinh đã nộp và nhiều lượt nộp của cùng học sinh; chỉ điều hướng/đọc, không tạo/sửa/xóa/chấm dữ liệu.

## 3. Rủi ro và việc còn lại

- AI vẫn là mô hình xác suất: đáp án và rubric phải được giáo viên soát trước khi giao/chấm.
- Đáp án/rubric đã sinh trước khi nhập hoặc sửa lệnh không tự sinh lại; bấm lại nút AI hoặc sửa tay.
- `gradingInstructions` vẫn nằm trong document assignment. UI không hiển thị cho học sinh, nhưng đây chưa phải field-level secret; muốn tách tuyệt đối phải có private grading config riêng.
- Chưa claim authenticated E2E destructive trên production vì phiên browser chưa có bằng chứng chắc chắn của Firebase Auth; QA web hiện là read-only smoke.
- Sau khi deploy cần xác nhận Vercel deployment của commit `ca9fd1a` ở trạng thái Ready/Production trước khi dùng bộ lọc/xóa lượt trên dữ liệu thật.
- Đồng bộ profile/evidence sau approve là bước hậu transaction và có endpoint recovery; nếu process chết giữa hai bước, cần chạy recovery thay vì sửa tay dữ liệu.
- Các URL Storage cũ không nhận diện an toàn sẽ làm thao tác xoá thất bại có chủ ý thay vì xoá nhầm.

## 4. Kiểm tra production cần owner thực hiện

1. Xác nhận deployment Vercel commit `ca9fd1a` là **Ready / Production**; không chạy thao tác dữ liệu thật trước bước này.
2. Với fixture hoặc bài test riêng, xác nhận bổ sung ảnh → chấm lại toàn bộ → sửa điểm → duyệt lại → xóa điểm; không dùng bài đang nộp của 11 Columbus làm fixture.
3. Xác nhận `GRADING_GEMINI_API_KEY`, Anonymous Auth, Storage rules và Firestore indexes trên Firebase/Vercel.
4. Kiểm thử portal học sinh trên màn hình 320/375px, upload ảnh/PDF, lỗi mạng, retry và trạng thái nộp lại.

## 5. Lệnh nghiệm thu

Chạy từ PowerShell tại repo:

```powershell
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test:rules
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint:api
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run build
git diff --check
```

## 6. File trọng tâm

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

## 7. Quy ước

- Không dùng `git add .` trong worktree có thay đổi ngoài phạm vi.
- Không tuyên bố deploy production nếu chưa kiểm tra deployment thực tế.
- Với prompt có phạm vi, test phải kiểm cả chỉ dẫn mới và sự vắng mặt của chỉ dẫn tổng quát mâu thuẫn.
