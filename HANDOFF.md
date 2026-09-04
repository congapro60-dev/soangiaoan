# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-09-03
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Handoff ngắn cho lô V4 live lesson. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## AI không chấm bừa khi chưa chắc + model pro — 2026-09-04

- **(a) Không chấm bừa**: `isReadTooUncertain(questionResults)` (gradingPrompt, thuần + test) — đa số câu `unreadable` HOẶC mọi câu có confidence và TB < 0.4. Trong `gradeOneSubmission`, sau khi chấm mà đọc quá không chắc thì ném `UNCERTAIN_READ_MESSAGE` → nhánh catch giữ điểm cũ nếu có, chưa có thì `status='error'` + báo HS "chụp lại rõ hơn / thầy cô chấm tay". Không phọt điểm sai. Ngưỡng bảo thủ để không chặn oan.
- **(b) Model pro**: `GRADING_MODEL` default `gemini-3.8-flash` → **`gemini-3.1-pro-preview`** (đọc chắc hơn). ⚠ Pro rate-limit THẤP hơn nhiều + là preview → chấm cả lớp đông (2 pha) dễ 429; đắt hơn. Revert nhanh bằng env `GRADING_MODEL=gemini-3.8-flash`, hoặc GA ổn định `gemini-2.5-pro`. Chưa smoke tải thật.

full test 1774/1774, lint/lint:api/build PASS.

## Cổng HS: hero "Việc cần làm" + hạ cấp nút chấm thử — 2026-09-04

HS hay bấm nhầm nút to "Tự chấm bài" (tự chấm rời, không tính điểm) tưởng là nộp bài. Sửa thứ bậc: hero hiện thẳng bài gấp nhất (`viecCanLam` = todo trước, rồi retry) + nút to "Chụp & nộp bài này" gọi `onChooseImage(assignmentId)`; hết bài thì báo "đã nộp hết". Nút cũ đổi thành "Chấm thử (không tính điểm)" nhỏ/nhạt (viền, icon Sparkles) + dòng phụ giải thích không phải nộp. `lint`/`build` PASS. Chưa smoke bằng phiên HS thật.

## Chấm 2 pha (chép trước, chấm sau) — 2026-09-04

Đọc chữ tay/công thức Toán hay sai và mỗi lần một kiểu. Thêm pha 1 CHÉP bài trước khi chấm:
- `buildTranscriptionPrompt`/`parseTranscription` (gradingPrompt): chép trung thực bài làm bằng LaTeX, không chấm; parse best-effort trả '' khi hỏng (không chặn chấm).
- `grade-homework`: `transcribeStudentWork` chạy 1 lần cho cả 2 lượt retry, temperature 0, chỉ gửi ảnh bài làm; bản chép tiêm vào `studentText` của pha chấm (nguồn đọc chính, vẫn có ảnh đối chiếu) và lưu `grade.transcription`.
- UI: khối gập "Máy đọc được từ ảnh (bản chép)" trong bài nộp phía GV để soát đọc nhầm.
- Chi phí: ~2 lượt gọi/bài (user đã chấp nhận). Pha chép lỗi → tự lùi về chấm 1 pha.
Test parseTranscription + full 1769/1769, lint/build PASS.

## Đổi model chấm mặc định gemini-3.8-flash — 2026-09-03

`GRADING_MODEL` default `gemini-3.7-flash` → `gemini-3.8-flash` (đọc chữ tay + công thức tốt hơn, chi phí tương đương). Vẫn override được bằng env `GRADING_MODEL` trên Vercel. Chỉ đổi model chấm bài (`_grading-core.ts`), không đụng model của simulation/format/adaptive. Nếu id model sai → chấm lỗi ngay; lùi bằng env hoặc revert. `lint:api`/`build` PASS.

## Fix cổng HS nộp bổ sung + đọc ảnh ổn định hơn — 2026-09-03

- **Nộp bổ sung "không thấy gì" trên điện thoại**: khối "đang chờ nộp" render ở ĐẦU trang, HS bấm bổ sung ở thẻ bài giữa/dưới trang nên chọn ảnh xong không thấy. Thêm `pendingSectionRef` + `scrollIntoView` khi có tệp chọn (StudentPortalDashboard) + `scroll-mt-20` tránh header dính. Phụ chưa xử lý: ảnh HEIC iPhone `<img>` không render preview (vẫn nộp được), để lần sau nếu cần.
- **Chấm lại đọc "mỗi lần một kiểu"**: `callGeminiVision` đang `temperature: 0.2`. Thêm `options.temperature` (mặc định 0.2) và truyền **temperature 0** cho đường ĐỌC/chấm (`attemptHomeworkGrade`) và giải đề (`handleSolveAnswerKey`, `handleSolveAnswerKeyForAssignment`) → đọc chữ/công thức ổn định hơn giữa các lần. Bản chất OCR chữ tay Toán vẫn hạn chế: đòn cuối là đổi `GRADING_MODEL` sang bản pro/3.8 (đắt hơn). AI đã nêu chỗ chưa chắc qua `needsTeacherReview`/confidence/nhãn "Máy đọc chưa chắc" (Phase 4) để GV điền Lệnh riêng.

## Fix sĩ số card không khớp roster — 2026-09-03

Card lớp đọc `remote.studentCount` (field denormalized, HAY LỆCH — migrateLegacyClasses đã ghi "không tin studentCount cũ") nên thêm học sinh xong sĩ số không đổi dù danh sách đã có em mới. Sửa `teacherClassFromServer` đếm theo `students.length` (roster thật vừa tải, `listAccessibleClasses` trả full roster); thêm HS vào lớp đã đồng bộ thì gọi `refreshAccessibleClasses()` để card khớp máy chủ ngay. Lớp chưa đồng bộ vẫn dựa bản tăng lạc quan + cảnh báo "Đồng bộ ngay". `lint`/`lint:api`/`build` PASS.

## Làm lại đáp án + chấm lại loạt + đọc công thức tốt hơn — 2026-09-03

Bốn phần, giao dần rồi push một thể (`f89fce5`, `44ca210`, `73a3ec6`, `eb20035`).

1. **Đọc PDF đề bằng ảnh trang** — `readSourceFile(file, { renderPdfPages: true })`: PDF Toán render trang thành ảnh cho Gemini Vision đọc đúng công thức, thay vì lớp chữ pdf.js làm nát. Chỉ luồng lớp học bật cờ; caller khác giữ nguyên. `handleSolveAnswerKey` nới cap ảnh đề lên `MAX_ASSIGNMENT_SOURCE_IMAGES`.
2. **Nút AI trong panel chi tiết** — "AI giải lại đáp án" (server action `solveAnswerKeyForAssignment`, dựng đề từ `sourceText`+`sourceImageUrls` đã lưu, theo lệnh riêng đang gõ) + "AI gợi ý lại hướng dẫn chấm" (`suggestRubric`). Kết quả ra NHÁP để GV soát rồi Lưu; hiện "chỗ chưa chắc".
3. **Chấm lại loạt** — `summarizeSelection.regradable` + nút "Chấm lại (n)": chấm lại bài đã `graded` theo đáp án mới, **bỏ qua `editedByTeacher`**. Lifecycle bài đã duyệt (về chờ duyệt lại + gỡ bằng chứng cũ) do server main lo sẵn.
4. **Đọc bài chính xác hơn** (bản nhẹ) — prompt bắt AI chép `studentAnswer` bằng LaTeX + hiệu chỉnh `confidence` theo độ rõ chữ; `hasUncertainRead()` + nhãn "Máy đọc chưa chắc" trên dòng bài nộp. KHÔNG làm 2 pha gọi AI riêng vì UI đã hiện sẵn studentAnswer/confidence/unreadable từng câu.
5. **Thử lại đồng bộ hàng loạt** (`8b23849`) — sau khi vá lỗi Firestore undefined, marker "đồng bộ minh chứng đang chờ" CŨ vẫn nằm trên các bài duyệt trước lúc deploy (fix không tự xoá dấu cũ, không tự ghi bù). Nút "Thử lại đồng bộ (N)" trên thanh bulk quét các lượt hiện hành còn `evidenceSyncError` rồi retry một lượt qua cơ chế `retryEvidenceSync` sẵn có; mỗi lần thành công ghi bù minh chứng + xoá marker. Chưa cắn: retry chỉ trên lượt HIỆN HÀNH, marker trên lượt lịch sử cũ để nguyên (không đáng ghi bù).

Nghiệm thu: `npm run lint`, `lint:api`, `test` **1766/1766**, `build` đều PASS. Chưa smoke production bằng phiên GV thật.

## Fix Firestore undefined khi duyệt điểm — 2026-09-03

### Lỗi & nguyên nhân
- Production: GV duyệt điểm → "đồng bộ minh chứng thất bại" + `Cannot use "undefined" as a Firestore value (found in field topics.0.evidenceRefs.0.confidence)`. Grade đã commit, chỉ bước đồng bộ hồ sơ hỏng — KHÔNG rollback điểm.
- Gốc: `profileMerge.normalizeEvidenceRefs` luôn tạo key optional `assignmentId`/`confidence` kể cả khi `undefined`; `profileRef.set()` qua Admin SDK bị từ chối (client có `removeUndefinedFields`, server thì không).

### Đã sửa (3 tầng, giữ nguyên semantics)
- Builder canonical: chỉ gắn field optional khi hợp lệ (giữ `confidence` 0, loại NaN/Infinity, loại `assignmentId` rỗng).
- Hàng rào server: `api/_firestore-sanitize.stripUndefinedDeep` áp trước mọi `profileRef.set()` (`_skill-profile`, `_grade-lifecycle`, `classroom`).
- Lưới đỡ toàn cục `ignoreUndefinedProperties` tại 2 chỗ init: `getAdminDb()` (`api/_exam-core.ts`) + client `db` (`src/lib/firebase.ts` → `initializeFirestore`). Mọi write hiện tại + tương lai miễn nhiễm.

### Trạng thái
- Release commit trên `main`: fix nằm ngay sau `f2ab15f` (rebase sạch, không đụng file live-lesson).
- Nghiệm thu worktree: full test **1741/1741**, `lint`/`lint:api`/`build` PASS, `git diff --check` sạch.
- Chưa smoke production bằng phiên GV thật — cần kiểm sau deploy: duyệt 1 grade có chủ đề yếu, xác nhận hết lỗi + nút Thử lại xoá marker `evidenceSyncError`.

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
