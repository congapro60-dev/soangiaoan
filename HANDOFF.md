# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-09-03
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Handoff ngắn cho lô V4 live lesson. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## V4 whiteboard media — G10 P31 — 2026-09-03

### Đã đổi và vì sao

- Chèn video whiteboard vào bài live V4 có sẵn, KHÔNG tạo trang mới. Chỉ áp cho `definitionKey=10-5-31`, chỉ màn hình TV của cue P00 (thực tế `tvScreenId=S1`, không phải S0).
- Cổng HS và cổng GV không hiển thị video. Video không chứa chữ/số/công thức/PII. Timeline vẫn đủ 2.400 giây.
- `mediaManifest`: map exact `10-5-31 + S1` → mp4 + poster; mọi trường hợp khác trả `null`.
- `TvLiveView`: video muted/playsInline khi `running`; fallback poster khi paused/closed, khi lỗi video (`onError`) và khi lỗi autoplay (`play().catch`); layout giới hạn trong viewport TV.
- `LiveLessonPage`: truyền `definitionKey` vào `TvLiveView` để route media đúng definition.
- `closeLiveLessonSession`: ghi public marker `status=closed` TRƯỚC khi revoke quyền đọc parent, để listener TV nhận tín hiệu dừng; marker không PII.
- `firestore.rules`: allowlist checkpoint V4 mới + giữ ID legacy, `hasOnly`, tối đa 10, không wildcard.

### Commit và trạng thái

- Release commit: `df0823a` — `feat(live-lesson): whiteboard media cho TV bai P31 + close lifecycle an toan`.
- Push lên `origin/main` fast-forward từ `f2cddd9` (không force-push). Vercel tự build theo cấu hình repo.
- Media đặt tại `public/media/g10-w5-p31-p00-whiteboard.mp4` và `.png` (H.264 1600×900 60fps 30s, không audio; poster 1600×900).

### Bằng chứng nghiệm thu local

- `npm run lint`: PASS.
- `npm run lint:api`: PASS.
- `npm run test -- --run --maxWorkers=1`: **146 files / 1.752 tests PASS**.
- `npm run test:rules`: **8 files / 302 tests PASS**.
- `npm run test:pilot`: **1/1 PASS** trên Firestore/Auth Emulator.
- `npm run build`: PASS; entry index ~1.203 kB; chỉ còn cảnh báo Vite chunk vốn có.
- `git diff --check`: sạch.
- Rules/pilot stderr vẫn có `evaluation error` ở nhánh DENY cố ý; không gọi là "zero-evaluator-error".

### Chưa claim / cần người sở hữu kiểm tra

- Autoplay TV thật/Vcast/browser thật chưa xác nhận phiên này; unit test chỉ chứng minh logic fallback, không chứng minh chính sách autoplay từng browser.
- Chưa smoke production bằng tài khoản GV thật; chưa kiểm URL asset production `/media/g10-w5-p31-p00-whiteboard.mp4` và `.png` sau deploy.
- Không tạo phiên/ghi dữ liệu HS thật khi smoke production.

### Lệnh nghiệm thu

```powershell
$worktree = "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\v4-all-lesson-packages"
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run test -- --run --maxWorkers=1
npm --prefix $worktree run test:rules
npm --prefix $worktree run test:pilot
npm --prefix $worktree run build
git -C $worktree diff --check
```

### File trọng tâm

- `src/lib/liveLesson/v4/mediaManifest.ts` (+ test)
- `src/components/liveLesson/TvLiveView.tsx` (+ test)
- `src/pages/LiveLessonPage.tsx`
- `src/services/liveLessonService.ts` (+ test)
- `firestore.rules` · `tests/rules/liveLesson.rules.test.ts`
- `public/media/`

## V4 all Ban Toán W5–W6 + self-study — 2026-08-31

### Commit và trạng thái

- Release commit `bd90e63` đã push vào `origin/main` và deploy Production `dpl_4Y5atCwE2sW2aUxMFWLtafsivYi5`; không force-push.

### Đã đổi và vì sao

- Bổ sung snapshot có provenance và adapter/registry/runtime cho đủ 48 source key Ban Toán W5–W6; mỗi bài giữ đúng source key, 40 phút, 3 tuyến M/S/C và nội dung nguồn.
- Tích hợp vào Bài học phân hoá bằng nút `Xuất bản tuần tự 48 bài`: xử lý từng bài, audit exact source/assessment/route/AI Error/glossary trước khi lưu, bỏ qua bài đã xuất bản và chặn khác chủ sở hữu.
- Chuẩn hóa tiêu đề `Tên bài — Tiết N`; draft cũ có hậu tố kỹ thuật được sửa tên khi xuất bản lại mà không đổi nội dung.
- Giữ nút `Xóa` với xác nhận nêu đúng tên bài, chỉ cập nhật UI sau khi lệnh xóa owner-scoped thành công.
- Sửa cổng tự học: lesson V4 có route task nhưng chưa có `practiceSet` thì 3 gói Nhận biết/Thông hiểu/Vận dụng dùng chính nhiệm vụ M/S/C; tách công thức nhiều dòng, giới hạn MathJax trong card/vở ghi.
- Gỡ lưới catalog `G/W/P` khỏi màn hình chính; bảng `Bài học của tôi` là nơi duy nhất hiển thị lesson thật.
- Demo `tds-g10-30-pilot` nhận diện là source `10-5-31`, nâng cấp nội dung V4 tại chỗ, giữ document id/link cũ; 47 source còn lại tạo mới, tổng 48 lesson không trùng P31.

### Bằng chứng nghiệm thu local

- `npm run lint` / `lint:api`: PASS.
- `npm run test -- --run --maxWorkers=1`: **145 files / 1.731 tests PASS**.
- `npm run test:rules`: **8 files / 301 tests PASS**.
- `npm run test:pilot`: **13/13 PASS**; `tsx test/e2e-v4-live-lesson.mjs`: **9/9 PASS**.
- `npm run build`: PASS.

### Chưa claim / cần người sở hữu kiểm tra

- Đã seed production bằng tài khoản GV thật: 48 xuất bản, 0 bỏ qua, 0 audit fail; demo P31 giữ id `tds-g10-30-pilot`.
- Đã xác nhận Vercel `READY/Production` + UI production; chưa full classroom run với TV/Vcast và thiết bị HS thật.
- Không xóa bài production trong QA.
