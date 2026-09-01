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

## V4 all Ban Toán W5–W6 + self-study — 2026-08-31

### Commit và trạng thái

- Release commit `bd90e63` đã được push thành công vào `origin/main` và deploy Production `dpl_4Y5atCwE2sW2aUxMFWLtafsivYi5`; không force-push.

### Đã đổi và vì sao

- Bổ sung snapshot có provenance và adapter/registry/runtime cho đủ 48 source key Ban Toán W5–W6; mỗi bài giữ đúng source key, 40 phút, 3 tuyến M/S/C và nội dung nguồn.
- Tích hợp vào **Bài học phân hoá** hiện tại bằng nút `Xuất bản tuần tự 48 bài`: xử lý từng bài, audit exact source/assessment/route/AI Error/glossary trước khi lưu, bỏ qua bài đã xuất bản và chặn khác chủ sở hữu.
- Chuẩn hóa tiêu đề theo tên giáo viên dễ tìm, dạng `Tên bài — Tiết N`; draft cũ có hậu tố kỹ thuật được sửa tên khi xuất bản lại mà không đổi nội dung.
- Giữ nút `Xóa` trong danh sách với xác nhận nêu đúng tên bài, nhãn truy cập và chỉ cập nhật UI sau khi lệnh xóa owner-scoped thành công.
- Sửa cổng tự học: khi lesson V4 có route task nhưng chưa có `practiceSet`, ba gói Nhận biết/Thông hiểu/Vận dụng dùng chính nhiệm vụ M/S/C thay vì placeholder; tách công thức nhiều dòng và giới hạn MathJax trong card/vở ghi để không tràn ngang.
- Gỡ lưới catalog `G/W/P` khỏi màn hình chính; bảng `Bài học của tôi` là nơi duy nhất hiển thị lesson thật, với metadata lớp/tuần/tiết và một nút `Tạo và xuất bản 48 bài`.
- Demo `tds-g10-30-pilot` được nhận diện là source `10-5-31`, nâng cấp nội dung V4 tại chỗ và giữ document id/link cũ; 47 source còn lại tạo document mới, tổng cộng 48 lesson logic không trùng P31.
- Launcher dùng runtime V4 và `definitionKey=10-5-31` cho demo sau nâng cấp; các bài Hình thành, Luyện tập, Ôn tập và Tự chọn đều hiện nút live khi `published`.
- Gỡ lưới catalog `G/W/P` khỏi màn hình chính; bảng `Bài học của tôi` là nơi duy nhất hiển thị lesson thật, với metadata lớp/tuần/tiết và một nút `Tạo và xuất bản 48 bài`.
- Demo `tds-g10-30-pilot` được nhận diện là source `10-5-31`, nâng cấp nội dung V4 tại chỗ và giữ document id/link cũ; không tạo bản sao. Launcher dùng runtime V4 khi demo có identity nguồn.
- Các bài Hình thành, Luyện tập, Ôn tập và Tự chọn đều được mở live nếu lesson V4 đã `published`; bài chưa publish không hiện nút live.

### Bằng chứng nghiệm thu local

- `npm run lint`: PASS.
- `npm run lint:api`: PASS.
- `npm run test -- --run --maxWorkers=1`: **145 files / 1,731 tests PASS**.
- `npm run test:rules`: **8 files / 301 tests PASS**.
- `npm run test:pilot`: **13/13 checks PASS** trên Firestore/Auth Emulator.
- `npm exec -- tsx test/e2e-v4-live-lesson.mjs`: **9/9 checks PASS**.
- `npm run build`: PASS; chỉ còn cảnh báo Vite chunk/dynamic import vốn có.
- Browser self-study QA bằng dữ liệu tổng hợp: identify → diagnostic → bài học/scaffold → đủ 3 gói → vận dụng → tổng kết → lưu tiến trình; không còn placeholder và công thức kết luận hiển thị đủ trong card.
- Focused dedup/list QA: **4 files / 49 tests PASS**, gồm demo P31 nâng cấp tại chỗ, batch 48 lesson duy nhất, registry mapping và V4 launcher.
- Rules stderr vẫn có `evaluation error` ở nhánh DENY cố ý; không được gọi là “zero-evaluator-error”.

### Chưa claim / cần người sở hữu kiểm tra

- Đã seed production bằng tài khoản giáo viên thật qua nút `Tạo và xuất bản 48 bài`: 48 xuất bản, 0 bỏ qua, 0 audit fail, 0 lỗi; demo P31 giữ id `tds-g10-30-pilot`, 47 source còn lại tạo mới.
- Đã xác nhận Vercel deployment `READY / Production` và kiểm tra UI production sau deploy; chưa thực hiện full classroom run với TV/Vcast và thiết bị HS thật.
- Browser live classroom và self-study đã chạy local với identity/dữ liệu tổng hợp; chưa thay thế pilot GV thật + TV/Vcast + thiết bị học sinh thật.
- Không xóa bài production trong QA; nút xóa đã có test helper và Rules owner-delete hiện hành.

### Lệnh nghiệm thu cho commit này

```powershell
$worktree = "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages"
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run test -- --run --maxWorkers=1
npm --prefix $worktree run test:rules
npm --prefix $worktree run test:pilot
npm --prefix $worktree exec -- tsx test/e2e-v4-live-lesson.mjs
npm --prefix $worktree run build
git -C $worktree diff --check
```

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
