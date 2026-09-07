# Biên bản bàn giao V4, media whiteboard cho bài demo P31

Ngày bàn giao: 03/09/2026

## 1. Mục tiêu

Tích hợp video whiteboard vào bài học phân hóa V4 đang có trong SmartPlan AI, không tạo website mới.

Phạm vi đã chốt:

- Chỉ bài có `definitionKey=10-5-31`.
- Chỉ màn hình TV của cue `P00`.
- Cue `P00` của contract thật dùng `tvScreenId='S1'`, không phải `S0`.
- Cổng HS và cổng GV không hiển thị video.
- Video không chứa chữ, số, công thức hoặc dữ liệu học sinh.
- Tiếng Việt là ngôn ngữ duy nhất ở phần nội dung hiển thị của app.
- Timeline bài học vẫn đủ 2.400 giây, không thay đổi cấu trúc 40 phút.

## 2. Checkout đang làm việc

Worktree chính của V4:

`C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages`

Branch:

`codex/v4-all-lesson-packages`

HEAD trước phần bàn giao:

`f2cddd9 docs(qa): record production V4 publication`

Worktree đang có thay đổi chưa commit. Không dùng `git reset --hard`, `git checkout --`, `git clean` hoặc xóa rộng.

Model hỗ trợ đã kiểm tra trong OpenCode Desk: `9router-local/cc/claude-sonnet-5` và `9router-local/cc/claude-opus-5` đang được router công bố là kết nối được. Quota thực tế của router là `unknown`, nên Claude Code phải kiểm tra lại trạng thái trước khi chạy; không đưa secret hoặc token vào prompt.

## 3. Đã làm

### Media

Đã đặt trong `public/media/`:

- `g10-w5-p31-p00-whiteboard.mp4`
- `g10-w5-p31-p00-whiteboard.png`

Đặc tính đã kiểm bằng `ffprobe`:

- H.264, 1600×900, 60 fps.
- Thời lượng 30 giây.
- Không có audio stream.
- Poster PNG 1600×900.

Ảnh nguồn và ba frame đầu, giữa, cuối đã được xem bằng mắt. Bàn tay có chữ Trung của tài nguyên mặc định đã bị loại khỏi bản cuối; bản cuối dùng bút không chữ.

Artifact nguồn ở workspace gốc:

`C:\Users\ADMIN\Downloads\smart-lesson-plan-ai\outputs\whiteboard-p31-demo`

Trong đó có SRT, storyboard, annotation JSON, poster, SVG nguồn, MP4 và các frame QA.

### App

- `src/lib/liveLesson/v4/mediaManifest.ts`: map exact `10-5-31 + S1` tới hai URL public.
- `src/pages/LiveLessonPage.tsx`: truyền `definitionContext.definitionKey` vào caller TV thật.
- `src/components/liveLesson/TvLiveView.tsx`: media chỉ xuất hiện khi đúng `S1` và đúng definition key; lobby giữ poster, running yêu cầu phát muted, paused/closed hiện poster, lỗi video và lỗi autoplay chuyển poster; layout giới hạn trong viewport TV.
- `src/components/liveLesson/TvLiveView.test.ts`: test route isolation, status policy và fallback state.
- `src/services/liveLessonService.ts`: ghi public marker `closed` trước khi đóng parent để TV nhận tín hiệu dừng.
- `src/services/liveLessonService.test.ts`: test marker và thứ tự mutation.
- `firestore.rules`: cho đúng 10 checkpoint ID V4 mới và các ID legacy, vẫn giữ `hasOnly` và giới hạn tối đa 10.
- `tests/rules/liveLesson.rules.test.ts`: test V4 runtime IDs và legacy IDs.
- `tasks/lessons.md`: ghi lại các lỗi mapping P00, asset và close lifecycle.

## 4. Bằng chứng đã có

Đã chạy độc lập sau các patch cuối:

- Unit: 146 files, 1.752 tests, pass.
- Rules emulator: 8 files, 302 tests, pass.
- `npm run lint`: pass.
- `npm run build`: exit 0.
- Build có cảnh báo chunk lớn đã tồn tại, entry index khoảng 1,203 kB, tương đương baseline khoảng 1,209 kB. Đây là cảnh báo hiệu năng, không phải lỗi biên dịch.
- Service close test: 23/23 pass.
- Media focused tests: 34/34 pass sau mapping đúng S1.

Browser local bằng Firestore/Auth emulator đã kiểm:

- Lobby: `videoCount=1`, poster đúng, `currentTime=0`, paused, muted, duration 30.
- Running: video tải và phát, muted, viewport 1280×720 không scroll ngang/dọc.
- Paused: video được thay bằng poster.
- Closed: marker tới TV, poster hiện, thông báo phiên đã đóng, video không còn.
- Cue P03/S3: không có video.
- Cổng HS: không có video.
- Không thấy chữ Trung, `teacherScript`, `privateReason`, `studentId` hoặc `rawText` trên TV.

## 5. Việc Claude Code cần làm tiếp

1. Đọc `AGENTS.md`, `tasks/lessons.md` và file này trước khi sửa.
2. Kiểm tra `git diff` và `git status`; bảo toàn toàn bộ thay đổi đang có.
3. Chạy lại `npm run test:pilot` với Firestore/Auth emulator. Đây là gate chưa chạy lại sau patch Rules/close mới nhất.
4. Chạy lại `npm run lint:api`.
5. Đọc từng file media/UI, đặc biệt kiểm tra:
   - P00 thật là `S1`.
   - `onError` và `play().catch()` đều fallback poster.
   - Không có video trong `StudentLiveView` hoặc `TeacherLiveView`.
   - Close marker được ghi trước parent revoke.
   - Rules không bỏ allowlist legacy, không có wildcard.
6. Nếu sửa, dùng TDD: test đỏ trước, test xanh sau. Chỉ sửa blocker có bằng chứng.
7. Chạy lại đầy đủ:

```powershell
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run lint
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run lint:api
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test -- --run --maxWorkers=1
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test:rules
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run test:pilot
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages" run build
```

## 6. Gate commit, push, deploy

Chưa commit, push hoặc deploy các thay đổi của media/Rules/close lifecycle.

Chỉ sau khi các gate trên pass:

- Review độc lập bằng một model khác, chỉ đọc diff, không sửa.
- Kiểm tra `git diff --check`.
- Stage đúng các file thuộc task, không dùng `git add .`.
- Commit local với message mô tả media V4 và Rules/close lifecycle.
- Người dùng đã từng yêu cầu đưa V4 lên `main`, nhưng Claude Code vẫn phải báo rõ SHA, diff và toàn bộ test trước khi push.
- Sau push, deploy Vercel production và kiểm tra URL asset:
  - `/media/g10-w5-p31-p00-whiteboard.mp4`
  - `/media/g10-w5-p31-p00-whiteboard.png`
- Không tạo phiên hoặc ghi dữ liệu học sinh thật trong production khi smoke test. Nếu cần kiểm tra phiên thật, dùng tài khoản/lớp do chủ sở hữu chỉ định và dọn qua UI.

## 7. Giới hạn còn lại

- Autoplay vẫn phải được xác nhận trên trình duyệt, Vcast và TV thật; unit test không chứng minh chính sách autoplay của từng browser.
- Browser smoke hiện dùng emulator và tài khoản giả lập cục bộ, chưa phải tài khoản giáo viên thật trên production.
- `test:rules` vẫn có evaluator trace ở các deny-path có chủ ý. Không tuyên bố `zero evaluator-error`.
- Preview editor `file://` của skill whiteboard bị trình duyệt tích hợp chặn; đã thay bằng preview CLI và kiểm frame MP4.
- `vietnamese-humanizer` được áp dụng cho storyboard/báo cáo/lời dẫn giáo viên. Skill này không dùng để rewrite UI/subtitle; UI và nội dung app vẫn phải giữ tiếng Việt tự nhiên theo ngữ cảnh giáo viên, học sinh THPT.

## 8. Prompt gửi Claude Code

```text
Bạn là implementation agent cho SmartPlan AI. Làm tiếp theo biên bản:
C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages\HANDOFF_V4_WHITEBOARD_MEDIA_2026-09-03.md

Đọc AGENTS.md, tasks/lessons.md và biên bản trước. Không reset/clean/xóa thay đổi có sẵn. Kiểm tra diff thật. Chạy các gate được liệt kê. Chỉ sửa nếu có lỗi có bằng chứng, dùng TDD. P00 của contract 10-5-31 là S1, không được đổi về S0. Không đưa chữ Trung, teacherScript, PII hoặc video vào cổng HS/GV. Không commit/push/deploy cho tới khi báo cáo đầy đủ diff, test, Rules và browser smoke. Nếu mọi gate đạt, báo tôi một bảng release recommendation rõ: pass, conditional hoặc blocked.
```
