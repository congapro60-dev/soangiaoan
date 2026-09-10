# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-09-09
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Handoff ngắn cho lô V4 live lesson. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## Chuông thông báo cho học sinh — 2026-09-09

Giáo viên xoá bài nộp thì bài biến mất khỏi màn hình em mà không một lời nào. Nửa "yêu cầu nộp lại" vốn đã chạy sẵn (document biến mất → `portalViewModel` trả `todo` → "Nộp ảnh"); thiếu đúng phần nói cho em biết **vì sao**.

**Quyết định thiết kế quan trọng — chỉ lưu MỘT loại sự kiện.** `studentNotifications` chỉ nhận `submission_deleted`. Bốn loại còn lại (nộp xong, chấm xong, chấm lỗi, giáo viên duyệt điểm) suy thẳng từ bài nộp trong `buildStudentFeed` — giữ thêm bản sao trong Firestore chỉ tạo cơ hội cho hai nguồn nói khác nhau. Ai định thêm loại thông báo mới: hỏi trước "việc này có suy ra được từ dữ liệu em đã có không?", suy được thì **đừng lưu**.

**Đã làm:**

- `handleDeleteSubmission` ghi thông báo **SAU KHI** xoá xong (ghi trước mà lỗi giữa chừng là báo em bài đã bị xoá trong khi nó còn nguyên), kèm tên bài và lý do giáo viên gõ. Best-effort — lỗi ở bước này chỉ log, không được biến một lượt xoá đã thành công thành lỗi.
- Action `studentNotifications` trên `/api/classroom` (không thêm Vercel function): lọc theo `studentId` lấy từ `studentLinks` **của phiên**, không theo tham số client gửi lên.
- Hộp thoại xoá của giáo viên có ô "Lý do cho học sinh (tuỳ chọn)".
- Cổng học sinh: nút chuông + huy hiệu chưa đọc + bảng thông báo, và dải nhắc đỏ ngay trên thẻ bài vừa bị xoá.

**Ngưỡng sắp cắn người:**

- Mốc "đã đọc" nằm ở **localStorage theo máy**, không theo tài khoản — đổi máy thì đếm lại từ đầu. Cố ý: huy hiệu chưa đọc không đáng thêm một lượt ghi máy chủ mỗi lần bấm chuông.
- Đánh dấu đã đọc bằng mốc của **mục mới nhất**, không phải `Date.now()` — thông báo đến trong lúc bảng đang mở vẫn tính là chưa đọc ở lần sau. Đừng "sửa" thành `Date.now()`.
- Test `classroom-delete-handlers` khẳng định **đúng thứ tự** thao tác xoá; thêm bước ghi nào vào `handleDeleteSubmission` là phải cập nhật kỳ vọng ở đó.
- Chưa có chỗ dọn thông báo cũ. Mỗi lượt xoá bài sinh một document, action đọc `limit(100)` rồi cắt còn 50 — lớp dùng vài năm thì nên thêm dọn định kỳ.
- **Chưa kiểm bằng mắt**: cổng học sinh cần mã lớp + PIN thật mới vào dashboard. Trang nạp sạch, không lỗi console; phần tính toán có test đủ. Phần nhìn thấy cần mở bằng tài khoản học sinh thật.
- Nghiệm thu: `lint` 0, `lint:api` 0, full Vitest **156 files / 1906 tests PASS**, `build` PASS.

## Báo cáo theo câu: gộp đúng câu + nội dung câu hỏi lưu sẵn — 2026-09-08

Giáo viên báo bảng thống kê theo câu "lộn xộn", bấm vào ra một khối chữ khó hiểu. Ba lỗi riêng, nuôi nhau:

1. **Một câu đếm thành nhiều câu.** `buildQuestionStats` gộp theo đúng chuỗi chữ AI tự đặt. Model mỗi lượt chấm đặt tên một kiểu → `Bài 3.5 – Ý 1`, `Bài 3.5 (Ý 1)`, `Bài 3.5 – Ý 1: Tính cos A` thành ba dòng, mẫu số bị xé nên **cùng một câu ra 100% ở dòng này và 50% ở dòng kia**.
2. **Nội dung câu hỏi không được lưu ở đâu.** Mỗi lần bấm xem một câu, trình duyệt mới tải đề gốc về rồi OCR tại chỗ → CORS chặn → `Failed to fetch`. Máy chủ thì vốn đã đọc trọn cái đề đó ở nút "AI giải đề" rồi vứt đi.
3. **Khối cảnh báo in hai lần** + liệt kê đủ hơn 20 nhãn câu.

**Đã sửa:**

- `questionGroupKey()` trong `questionCatalog.ts`: đọc nhãn từ trái sang, giữ giá trị token cấu trúc (`bài/câu/ý` + số), **dừng ở từ mô tả đầu tiên**. Giữ nguyên ngữ cảnh `Phần II` / `Tự luận`. Nhãn không có số thì lùi về `normalizeQuestionKey` — trả khoá rỗng sẽ dồn mọi nhãn mô tả vào một dòng, sai nặng hơn.
- `buildQuestionStats` gộp theo khoá đó; nhãn hiển thị lấy bản dùng nhiều nhất, hoà thì lấy bản gọn nhất.
- Action **`buildQuestionCatalog`** trên `/api/grade-homework` (không thêm Vercel function — đang chạm trần 12): máy chủ đọc đề bằng vision, tách từng câu kèm LaTeX, lưu `assignments/{id}.questionCatalog`. Đã có thì trả lại luôn (`cached: true`), chỉ đọc lại khi `force`.
- Báo cáo đọc thẳng danh mục đã lưu; "Đọc lại đề gốc" gọi máy chủ. Đề online (`exam:*`) không có bài giao để đọc nên vẫn dùng nguồn sẵn có.

**Ngưỡng sắp cắn người:**

- **KHÔNG gộp việc đọc danh mục vào "AI giải đề"** — thêm một lượt gọi Gemini vào request đó là đẩy nó chạm trần 60s. Nếu sau này muốn gộp thì phải mở rộng schema của `buildSolveExamPrompt` để lấy cả hai trong MỘT lượt, đừng gọi hai lần.
- Bài giao **cũ** chưa có danh mục: lần đầu mở báo cáo sẽ tốn một lượt Gemini để đọc đề, sau đó là miễn phí. Đây là lý do có `cached`.
- Chưa cắt ảnh từng câu (cần toạ độ, vision trả khung không đủ chắc trên đề scan nghiêng). Chưa cần sửa CORS Storage vì trình duyệt không còn tải file đề.
- Nghiệm thu: `lint` 0, `lint:api` 0, full Vitest **154 files / 1894 tests PASS**, `build` PASS, `git diff --check` sạch.

## SEV chấm bài: kẹt "Đang chấm" + MAX_TOKENS — 2026-09-08

Sự cố thật 06–08/09: 15/50 bài nộp gần nhất nằm ở `status='grading'` với `gradingRunId` còn nguyên, vài em hiện "Lỗi", nút "Chấm AI" đếm ra 0 nên giáo viên không gỡ được.

**Nguyên nhân gốc — đọc thẳng Firestore production, không phải suy đoán:**

1. **Khoá chỉ do chính worker mở.** Không `fetch` nào trong luồng chấm có timeout, nên worker bị Vercel giết ở 60s (hoặc học sinh tắt máy giữa chừng) là khoá nằm lại vĩnh viễn.
2. **`maxOutputTokens: 8192` quá chật.** Token "suy nghĩ" cũng tính vào trần này; `errorMessage` thật ghi *"AI trả lời dài quá trần cho phép nên bị cắt giữa chừng"* — tức `MAX_TOKENS`, KHÔNG phải lỗi parser như lô `7fda9fe` đã đoán.
3. **`BATCH_SIZE = 2` không hề được áp dụng** — batch cắt theo hạn mức ngày, một request cố chấm tới 22 bài.
4. **Bulk "Chấm AI" lọc `submitted|error`** nên bỏ sót đúng nhóm bài đang kẹt.

**Đã sửa:**

- `GRADING_BUDGET_MS = 45s` tính từ lúc đặt khoá; thời gian còn lại truyền xuống từng lượt gọi Gemini và từng lần tải ảnh qua `AbortSignal.timeout`; bỏ lượt thử lại khi không còn đủ giờ. Đây là mảnh chặn tận gốc — worker chết kiểu gì cũng không để lại khoá.
- Đường chấm bài **không gửi `maxOutputTokens`** nữa (`'model-max'`), để model dùng trần tối đa của chính nó.
- `STALE_GRADING_MS` 10 phút → **2 phút**, đồng bộ cả `api/grade-homework.ts` lẫn `src/lib/classroom/submissionSelection.ts`. Hai mốc này phải luôn khớp nhau.
- `BATCH_SIZE` được áp thật; trả thêm `recovered` để một lần bấm "Chấm cả lớp" là vừa gỡ vừa chấm.
- `isGradableNow`: bài `grading` quá hạn cũng là bài chấm được. Các nút từng dòng chỉ khoá khi máy ĐANG thật sự chấm.
- `GRADING_MODEL` **ghim cứng** `gemini-3.8-flash`, bỏ env override — từng bị đặt pro trên Vercel rồi quên gỡ, làm bản revert trong code vô hiệu mà đọc code không thấy gì sai.
- Thông điệp lỗi HTTP của Gemini kèm mã trạng thái (429/400/503 đòi ba cách xử lý khác nhau).
- **Học sinh tự chấm chạy ngầm**: server trả `202 { pending: true }` ngay, chấm tiếp bằng `waitUntil`; em tắt máy vẫn ra điểm. Giáo viên vẫn chấm đồng bộ. `chayNgam()` đọc request context của Vercel qua `Symbol.for('@vercel/request-context')`, không thêm dependency; nền tảng không cung cấp thì tự lùi về chờ xong rồi trả lời.

**Ngưỡng sắp cắn người:**

- `waitUntil` **KHÔNG vượt được `maxDuration`** — vẫn 60s trên gói Hobby. Nó chỉ bỏ phụ thuộc vào máy học sinh. Muốn "đợi bao lâu cũng được" thật thì phải rời khỏi trần 60s: Vercel Pro (300s) hoặc chuyển riêng worker chấm sang Cloud Run / Firebase Functions v2. Chủ dự án đã chốt KHÔNG mua Pro.
- Chưa đặt `thinkingConfig` để chặn token suy nghĩ — máy dev không có khoá Gemini để thử, mà tham số sai là API trả 400 và chết TOÀN BỘ đường chấm. Nếu còn `MAX_TOKENS` sau lô này thì đây là bước kế, và phải thử trên preview trước.
- Nghiệm thu: `lint` 0, `lint:api` 0, full Vitest **153 files / 1875 tests PASS**, `build` PASS, `git diff --check` sạch.

## V4 TV/HS QA, language, stats — 2026-09-07

- Đã merge vào `main`: mapping canonical P31 TV/HS, rich-text/formula line breaks, HS task-first layout, P27 `cp-postcheck`/HS7, EN student copy và fail-closed JA/KO/ZH fallback.
- TV có density typography, cue transition, owner-auth `tv-control`, public TV read-only và step-aware anonymous stats. Anonymous không được vào teacher/control branch.
- Preview offline có `Trước`/`Sau`, counter và stats minh họa có nhãn; không chứa teacherScript/PII/private fields.
- Chưa deploy hoặc re-seed production. Production cần canonical P31 identity + Rules deploy; browser smoke `tv-control` bằng tài khoản GV non-anonymous còn phải chạy.
- Nghiệm thu sau merge trên `main`: full Vitest **152 files / 1866 tests PASS**, `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check`; Rules Emulator **8 files / 303 tests PASS**; service pilot **1/1 PASS**.

### Lệnh nghiệm thu V4

```powershell
$worktree = "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading"
npm --prefix $worktree test
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run test:rules
npm --prefix $worktree run test:pilot
npm --prefix $worktree run build
git -C $worktree diff --check
```

## Tinh chỉnh giao diện TV/HS — 2026-09-10

- TV dùng bố cục theo chiều ngang, tiêu đề gọn hơn, nội dung đặt trong khối tương phản, slide có media dùng hai cột trên màn rộng, stats dễ đọc hơn.
- HS hiển thị theo thứ tự `Việc em cần làm` → `Phản hồi nhanh` → `Màn hình chung` → `Thuật ngữ`; nút và ô nhập có kích thước/focus rõ hơn trên máy tính và điện thoại.
- CSS dùng chung ở `src/components/liveLesson/liveClassroom.css`; import từ `TvLiveView.tsx` và `StudentLiveView.tsx`.
- HS có hướng dẫn nhịp học, tiêu chí tự đối chiếu và khung câu mở theo nhu cầu; mục tiêu G1/G2/G3 và loại lỗi AI đã đổi thành nhãn có nghĩa.
- TV P16 giữ câu hỏi kiểm chứng, trao đổi cặp đôi và yêu cầu ghi bằng chứng; không lộ sẵn phần chốt lỗi trước khi HS suy nghĩ.
- Đưa lên `main` để chủ sở hữu tự QA giao diện; chưa chạy thêm test/QA theo yêu cầu phiên này.

## Chấm nhanh / chấm kĩ — 2026-09-07

- Tách lựa chọn cho giáo viên: `quick` gọi Flash trực tiếp một pha; `thorough` chép bài từ ảnh trước rồi chấm hai pha. Lý do: giữ chất lượng đọc khi cần nhưng không để chấm cả lớp chạm trần 60 giây Vercel.
- Batch/chấm cả lớp luôn ép `quick`; phía học sinh luôn bị server ép `quick`, kể cả gửi `thorough`. Chỉ giáo viên chấm từng bài được yêu cầu `thorough`.
- Server whitelist mode và mặc định `quick`; UI giáo viên có hai nút; cổng học sinh gửi `quick`. Test hồi quy gồm quick không lưu transcription, thorough lưu transcription và học sinh bị ép quick.
- Nghiệm thu local/main: full Vitest **147 files / 1.780 tests PASS**, `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check` PASS. Build còn warning chunk/dynamic import vốn có.

### Còn dở / ngưỡng sắp cắn người

- Chưa claim authenticated browser E2E/production trước khi deployment mới Ready; cần thử đúng một bài thật ở chế độ đọc, không xóa dữ liệu.
- `thorough` tạo thêm một lượt Gemini và có thể chậm; chỉ dùng từng bài. Không mở mode này cho batch hoặc học sinh nếu chưa nâng giới hạn server.

### Lệnh nghiệm thu

```powershell
$worktree = "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading"
npm --prefix $worktree run test -- --run
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run build
git -C $worktree diff --check
```

## Mở khóa UI cho bài grading bị kẹt — 2026-09-07

- Backend đã cho phép giành lại khóa `grading` quá 10 phút, nhưng UI vẫn disable nút chấm lại với mọi `status='grading'`; học sinh Hồ Khánh Phương vì thế vẫn bị kẹt trên màn hình.
- Dùng chung `isStaleGradingTimestamp` ở projection UI: chỉ khóa còn tươi mới disable `Chấm nhanh`/`Chấm kĩ`; không mở bulk, sửa điểm hoặc xóa dữ liệu.
- Regression `submissionSelection`: khóa 9:59 còn tươi, 10:00+ và timestamp hỏng là stale; cần chạy lại full test/lint/build sau hotfix.

## Fix parser lỗi định dạng khi chấm — 2026-09-07

- Nguyên nhân: parser commit strict bắt buộc mọi field chi tiết từng câu; Gemini Flash thiếu một field nhỏ là cả bài lỗi, retry lại cùng contract rồi vẫn fail.
- Sửa: giữ envelope điểm/nhận xét/thang điểm/unique question number fail-closed; chỉ coerce thiếu field chi tiết từng câu thành `needsTeacherReview`, nhận alias `questionDetails`, và cộng điểm câu khi thiếu điểm tổng nếu có bằng chứng câu.
- Không tự cho 0, không chấp nhận payload rỗng; regression test bảo vệ cả ca lỗi schema và ca thiếu field từng câu.
- Nghiệm thu worktree: full Vitest **147 files / 1.785 tests PASS**, lint/lint:api/build PASS; build còn warning chunk/dynamic import vốn có.

## Fix bài kẹt "Đang chấm" vĩnh viễn — 2026-09-07

Worker chấm chết giữa chừng (Vercel kill ở 60s / timeout pro cũ) trước khi mở khoá → bài nằm mãi ở `status='grading'`; `handleGradeOne` chặn cứng 409 với MỌI bài grading nên nút "Chấm lại bằng AI" cũng vô hiệu → kẹt không gỡ được. Sửa: chỉ chặn khi khoá còn TƯƠI — `handleGradeOne` (grade-homework.ts) và `claimSubmissionForGrading` đều thêm `!isStaleGradingTimestamp(updatedAt)` (>10 phút = khoá chết, cho giành lại). Mirror đúng pattern đã có ở luồng bài luyện; transaction chống double-claim. full 1777/1777, lint/build PASS. (Chưa thêm test e2e gradeOne-on-stale vì harness cần mock quota/access nặng.)

## Fix 504 khi giải đề (pro quá chậm) + thêm 3.8-flash vào Cài đặt — 2026-09-04

- **504 "AI giải đề"**: model pro (`gemini-3.1-pro-preview`) chạy quá trần 60s Vercel Hobby cho lệnh nặng (giải cả đề 16k token + nhiều ảnh) → timeout. REVERT `GRADING_MODEL` default về `gemini-3.8-flash`. Pro không hợp serverless 60s (cả "Chấm cả lớp" batch×2 pha cũng sẽ 504). Muốn pro thì env + nâng gói Vercel.
- **BATCH_SIZE 4 → 2**: chấm 2 pha tốn ~gấp đôi/bài; hạ batch để một lượt "Chấm cả lớp" không chạm 60s (client tự gọi lại nhiều lượt).
- **models.ts**: thêm `gemini-3.8-flash` (isLatest) vào GEMINI_MODELS → hiện trong Cài đặt để GV chọn cho tính năng client (soạn giáo án/chat). 3.7 bỏ isLatest.
full 1777/1777, lint/build PASS.

## Chấm đề nhiều lựa chọn + câu đề cố tình sai — 2026-09-04

Chẩn đoán ca thật (BTVN Đại số 27/08 lớp 11Columbus, HS làm nhiều mà 3đ): đáp án "do AI giải" chưa soát + đề có 2 bộ (Cơ bản/Thử thách, mỗi bộ thang 10) mà bộ chấm không chắc chắn nhận ra HS chọn bộ nào → tính cả bộ không làm thành thiếu; và câu đề cố tình vô nghiệm bị AI "giải đại" ra đáp số nên HS phát hiện đúng lại bị chấm sai.
- `buildHomeworkGradingPrompt`: thêm luật "đề có nhiều bộ, HS làm 1" (nhận bộ em làm, chấm đúng bộ đó trên thang đầy đủ, KHÔNG trừ bộ không chọn, các bài đó not_attempted) + luật "câu vô nghiệm" (HS chỉ ra đề sai = đúng, cho đủ điểm; nếu đáp án chuẩn ghi đáp số thì ưu tiên HS + needsTeacherReview).
- `buildSolveExamPrompt`: khi giải đáp án KHÔNG bịa đáp số cho câu vô nghiệm, ghi vào uncertainties.
- Test bảo vệ 2 luật. Vẫn cần GV soát/sửa đáp án AI + ghi rõ ở Lệnh riêng. full 1777/1777, lint/build PASS.

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
