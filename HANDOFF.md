# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-08-30
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Đây là handoff ngắn cho lô V4 live lesson. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## V4 live lesson — G10 P31

### Đã đổi và vì sao

- Đưa bài **Bài học phân hoá** vào live session realtime hiện có, giữ ba cổng GV/TV/HS.
- GV dùng điện thoại điều khiển cue, bảng lớn/bảng phụ/vở vẫn là nơi dạy và ghi chép; TV chỉ nhận nội dung chung và thống kê ẩn danh.
- HS vào đúng lớp qua roster/PIN, chọn ngôn ngữ; `languagePreference` chỉ điều khiển giao diện/scaffold, không suy ra năng lực. Tiếng Việt là mỏ neo Toán học.
- Luồng THINK → AI → VERIFY có prerequisite `ai-think-w01` trước `ai-error-w01`; nhóm chỉ là đề xuất, GV phải duyệt.
- Có glossary đã duyệt, post-check cá nhân, offline queue và projection TV đã lọc UID/tên/raw answer/support plan/private reason/teacher script.
- Response write dùng transaction `get → set/update`; không còn merge-first update→create tạo deny trace trên allow-path.
- Firebase Emulator chỉ nối khi `import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === '1'`; cờ tắt giữ nguyên đường production.

### Commit và trạng thái

- V4 đã ghép vào worktree sạch `codex/v4-main-integration` từ `origin/main`.
- Commit tích hợp hiện tại trước handoff hook: `b732aeb`; các commit V4 trước đó xem `git log --oneline`.
- Không force-push. Không deploy Vercel trong lô QA này.

### Bằng chứng nghiệm thu local

- `npm run lint`: PASS.
- `npm run lint:api`: PASS.
- `npm run test`: **133 files / 1,635 tests PASS**.
- `npm run test:rules`: **8 files / 299 tests PASS**.
- `npm run test:pilot`: **13/13 checks PASS** trên Firestore/Auth Emulator.
- `npm run build`: PASS; chỉ còn cảnh báo Vite chunk/dynamic import vốn có.
- `npm exec -- tsx test/e2e-v4-live-lesson.mjs`: **9/9 checks PASS**.
- Rules stderr vẫn có `evaluation error` ở nhánh DENY cố ý; không được gọi là “zero-evaluator-error”.

### Chưa claim / cần người sở hữu kiểm tra

- Chưa có browser run đầy đủ ba viewport bằng tài khoản GV thật + TV + thiết bị HS thật.
- Chưa xác minh staging/Vercel Production Ready và HTTP smoke cho đúng commit này.
- Identity trong browser wiring/pilot là synthetic/emulator; service Rules có kiểm tra tách GV–HS, nhưng không thay thế kiểm thử tài khoản thật.
- Emulator data là ephemeral. Session cũ thiếu THINK không dùng lại cho pilot mới.
- Không đưa PIN, credential hoặc dữ liệu học sinh thật vào repo/fixture.

### Lệnh nghiệm thu

```powershell
$worktree = "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-main-integration"
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run test
npm --prefix $worktree run test:rules
npm --prefix $worktree run test:pilot
npm --prefix $worktree run build
npm --prefix $worktree exec -- tsx test/e2e-v4-live-lesson.mjs
git -C $worktree diff --check
```

### Điểm vào QA sau khi release

1. Vào **Bài học phân hoá**, chọn bài G10 P31, bấm **Mở tiết trực tiếp**.
2. Mở URL GV trên điện thoại; đưa URL TV qua Vcast; chia URL/QR HS cho thiết bị học sinh.
3. Kiểm tra GV điều khiển cue; TV chỉ hiện nội dung chung + số liệu tổng hợp; HS chọn đúng lớp/tên/PIN/ngôn ngữ và gửi câu trả lời.
4. Kiểm tra THINK trước AI Error, gợi ý, nhóm có GV duyệt, post-check cá nhân, đóng phiên và trạng thái mạng.
5. Nếu lỗi, ghi lại URL/sessionId, role, timestamp và ảnh màn hình; không dùng bài thật để thử xóa/chấm.

### File trọng tâm

- `src/components/liveLesson/TeacherLiveView.tsx`
- `src/components/liveLesson/TvLiveView.tsx`
- `src/components/liveLesson/StudentLiveView.tsx`
- `src/services/liveLessonService.ts`
- `src/lib/liveLesson/v4/`
- `firestore.rules`
- `test/pilot/liveLessonServicePilot.test.ts`
- `qa_artifacts/live-lesson-v4/browser-pilot-report.md`

## Submission grading lifecycle — 2026-08-30

### Đã đổi và vì sao

- AI chấm thành công do học sinh yêu cầu được ghi nhận là `student_ai` và tự động duyệt; AI chấm lại do giáo viên và chấm tay vẫn chờ giáo viên duyệt.
- Khi chấm lại lỗi nhưng đã có điểm hợp lệ, giữ nguyên điểm/trạng thái/history; lưu lỗi an toàn cho người dùng và lỗi thô chỉ cho giáo viên.
- Xoá lỗi cũ khi lần chấm mới thành công; bỏ trạng thái `error` giả ở projection nếu bài đã có grade hợp lệ.
- Đồng bộ hồ sơ chủ đề/kỹ năng có retry; lỗi đồng bộ không biến một grade đã commit thành lỗi giả. Xoá điểm fail-closed nếu chưa dọn được minh chứng.
- Bổ sung badge và thông báo rõ trong màn hình giáo viên/học sinh, không làm lộ lỗi provider hoặc minh chứng nội bộ cho học sinh.

### Commit và trạng thái

- Commit release: `3393b7a` — `fix(classroom): preserve grades across regrade failures`.
- Đã kiểm tra trên worktree sạch; không đọc/ghi dữ liệu Firestore lớp học thật.
- Push main sẽ để Vercel tự build theo cấu hình repository; chưa claim QA production sau deploy.

### Chưa claim / cần người sở hữu kiểm tra

- Chưa chạy browser E2E bằng tài khoản thật sau release.
- Legacy `status=error` có grade hợp lệ được chuẩn hoá khi đọc, chưa migration ngược dữ liệu cũ.
- Nếu đồng bộ minh chứng thất bại, giáo viên dùng nút **Thử lại**; không tự retry vô hạn.
- Luồng online exam không thuộc phạm vi thay đổi này.

### Bằng chứng nghiệm thu local

- `npm run test -- --run`: **134 files / 1,656 tests PASS**.
- `npm run lint:api`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; chỉ còn cảnh báo Vite chunk/dynamic import.

### Lệnh nghiệm thu

```powershell
$worktree = "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading"
npm --prefix $worktree run lint:api
npm --prefix $worktree run lint
npm --prefix $worktree test -- --run
npm --prefix $worktree run build
git -C $worktree diff --check
```
