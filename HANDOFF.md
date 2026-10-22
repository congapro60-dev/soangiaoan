# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-10-22
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Snapshot trạng thái hiện tại. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## CI API Typecheck đỏ sẵn trên main (22/10) — Claude

`api/_assistant-confirmations.ts` (`normalizeScopes`) lỗi `TS2322` ở lượt `npx tsc --noEmit -p tsconfig.api.json --strict false` của workflow `api-typecheck` (`ownerUid` là `unknown`); lượt strict mặc định thì qua nên chạy tay một lượt không thấy. Main đã đỏ 3 lần liên tiếp. Sửa tối thiểu: ép `ownerUid as string` sau khi `isText` đã kiểm. Nhánh nào gộp bản sửa chính thức của main thì bỏ dòng này đi nếu xung đột. Nghiệm thu: chạy CẢ HAI lệnh `npx tsc --noEmit -p tsconfig.api.json` và `... --strict false`.

## Discover tự học: GV giao bài cho lớp, HS mở bài đã bỏ đáp án — 17/10 (Claude, tiếp nhận từ Codex 01a13816)

**Đổi gì, vì sao:** nhánh `codex/elearning-muse-task1` (Codex làm catalog 204 tiết Discover 10–12, trang `/discover-self-study`, mục "Discover · Tự học" ở `/lop`). Lát này nối tiếp để HS học được an toàn: (1) `discoverSeedId` đi từ trang chọn tiết vào bài Adaptive đã lưu; (2) `src/lib/adaptive/stripAnswers.ts` tạo bản bài cho HS, bỏ đáp án/lời giải/gợi ý/ghi chú GV THEO KIỂU DỮ LIỆU (không theo tên khoá — `LearningRouteContent.explanation` là nội dung HS đọc nên giữ); (3) action mới `teacherAssignAdaptiveLesson` (`api/_classroom-teacher.ts`), `studentAdaptiveList`, `studentAdaptiveOpen` (`api/_student-workspace.ts`) trên collection MỚI `adaptiveAssignments/{classId}_{lessonId}` (chỉ Admin SDK ghi). Lý do: engine hiện chấm ở trình duyệt và `api/adaptive-progress` không xác thực nên HS soi/giả mạo được đáp án và tiến độ. Thiết kế đầy đủ + sổ tiến độ: `docs/spec/discover-self-study-v2.md` và `.ledger.md`.

**Đã thêm (T3a, 22/10):** action `studentAdaptiveSubmit` (`api/_student-workspace.ts` + `api/_adaptive-submit.ts`): máy chủ chấm bằng bài đầy đủ (`gradeAssessment`), bỏ qua điểm do client gửi; lần nộp ĐẦU của mỗi phần (`diagnostic`, `quickCheck:<unit>`, `exitTicket`) được tính, nộp lại chỉ ghi sự kiện `retry`; hoàn thành CHỈ qua vé thoát; quickCheck/vé thoát cần chẩn đoán trước; nộp rỗng bị từ chối (tránh khoá điểm). Ghi `adaptiveAssignmentProgress/{assignmentId}_{studentId}` và `adaptiveEvents` (cùng transaction). Lời giải chỉ trả cho câu ĐÃ trả lời. Review chéo Opus + MiniMax đã sửa 2 lỗi major (lộ lời giải câu bỏ trống, sự kiện ghi ngoài transaction). Chưa làm: giới hạn số sự kiện `retry`; quyết định có giữ lời giải đến khi đóng bài không.

**Đã thêm (T3b + T4, 22/10, opencode — nhánh `feat/discover-t3b-t4`, base PR #21):** (1) **T3b server**: ghi tiến độ bằng `set(..., { merge: true })` (trước đó đè mất field người khác đã ghi vào cùng doc) + ghi thêm `adaptiveSessionProgress/{assignmentId}_{studentId}` và `studentLearningProfiles/{studentId}` **có `classId`** để bảng GV đúng lớp đọc được; tính mastery/lỗi sai tách ra `src/lib/adaptive/learningProfile.ts` dùng CHUNG client+server (không lệch nhau). (2) **T4 client**: player HS có chế độ bài giao `/adaptive-portal/assignment/:assignmentId` — mở qua `studentAdaptiveOpen` (bản **đã bỏ đáp án**), nộp qua `studentAdaptiveSubmit` (**máy chủ chấm**, client không gửi điểm); link công khai giữ chấm ở trình duyệt như cũ để demo GV còn chạy. (3) **Vá lỗi P1 của Codex review**: `dewey:complete` chỉ lưu checkpoint rồi `return` khiến em mắc màn bài học, không bao giờ chốt xong → thêm màn **"Bước 3 · Bài kiểm tra cuối"** (stage `exit-ticket`), chuyển sang màn đó, chỉ "xong" khi đã nộp vé thoát. (4) **Mở khoá nút ở `/lop`**: mục "Discover · Tự học" bấm được khi thầy cô đã giao (nút "Học bài này"); chưa được giao thì vẫn khoá, ghi rõ "Chưa được giao" (trước ghi "Đang chuẩn bị bài" gây hiểu nhầm). Test +5 (api merge+classId, service client list/open/submit, UI nút mở khoá). Gate: full **3404/3404**, `lint`+`lint:api` exit 0, `build` exit 0. Chưa deployed; chưa QA trình duyệt với bài Discover đã giao thật cho lớp.

**Còn dở / cố ý bỏ:** T5 (GV giao bài + thống kê theo tiết/mục tiêu/lỗi sai/hỗ trợ), T6 (rules: thu hẹp đọc `adaptiveLessons`, rules cho 2 collection mới + test), T7 (rebase `origin/main`, build, QA trình duyệt GV giao → HS nộp → GV xem) CHƯA làm. Không có asset Muse, không gọi Muse API. Câu hỏi sản phẩm còn treo: lời giải có nên hiện lại sau mỗi lần nộp lại không.

**Bẫy:** (a) route công khai `/adaptive-portal` vẫn đọc cả bài (có đáp án) — đừng đưa link đó cho HS lớp; rules hiện cho mọi user đăng nhập (kể cả HS ẩn danh) đọc mọi `adaptiveLessons`, sửa ở T6. (b) `tsc --noEmit` có 2 lỗi ép kiểu `readonly` CÓ TỪ TRƯỚC (`src/lib/discover/manifest.test.ts`, `src/pages/DiscoverSelfStudyPage.tsx` dòng 7) — chưa sửa. (c) `normalizeAdaptiveLesson` bị chép ở 2 file api, gộp ở T7. (d) `api/` đang 11/12 function Vercel — thêm action vào dispatcher có sẵn, không thêm file. (e) đã gộp `origin/main` vào nhánh 17/10: `DiscoverSelfStudyPage` nay nạp lazy trong `src/main.tsx` như các trang khác.

**Nghiệm thu:** `npx vitest run src/lib/adaptive api/__tests__/student-adaptive.test.ts api/__tests__/student-workspace.test.ts api/__tests__/function-count.test.ts` (139 test đạt khi bàn giao), `npx tsc --noEmit -p tsconfig.api.json` (sạch).
## Ví AI: không bao giờ âm, không trừ oan, hết tiền thì nạp 1 chạm — 22/10 (Claude)

Chủ dự án: tiền bạc phải dễ, lằng nhằng là GV bỏ. (1) `settleUsage` (`_ai-usage.ts`) đọc số dư trong cùng giao dịch, trừ tối đa bằng số dư — ví về 0đ chứ không âm; phần thiếu ghi `aiUsage.uncoveredVnd` (chủ dự án chịu, tối đa ~1 lượt). (2) Khoá RIÊNG bị 429 chỉ vì giới hạn mỗi phút (`rateLimitRetryMs`) → KHÔNG đánh dấu hết 60 phút, KHÔNG sang ví; báo `moTaGioiHanPhut` "đợi N giây, không bị trừ ví". Áp ở `_grading-core`, `generate-simulation`, `_ai-image-handler`. (3) Hết tiền: `AiKeyGateModal` với `no_balance` mở `TopupFirstDialog` — QR nạp hiện ngay (mức 50k–500k, nội dung điền sẵn), hỏi số dư mỗi 5 giây, tiền về → "Đã nhận +X" rồi TỰ gửi lại thao tác vừa dừng; khoá riêng/mã giảm giá gập dưới "Cách khác"; điện thoại có link "Mở ảnh QR" để lưu rồi quét từ app ngân hàng. Ví vừa về 0đ sau một lượt dùng (`walletJustEmptied`, chip phát `AI_WALLET_EMPTY_EVENT`) cũng tự mời nạp; ví chỉ là dự phòng / không trừ ví thì không làm phiền. `TopupQrForm` tách khỏi `TopupDialog` dùng chung. QA trình duyệt bằng trang thử giả lập máy chủ (đã xoá): mở QR ngay, tiền về 2 giây → tự chạy tiếp, 375px không tràn. Chưa QA với tài khoản ngân hàng thật (ảnh QR thật do SePay sinh).

## Báo lỗi nói rõ lí do, không chỉ mã — 17/10 (Claude)

Chủ dự án yêu cầu: mọi lỗi phải nói lí do + việc cần làm, không ghi mỗi "409/503". `src/lib/httpErrorText.ts`: `moTaLoiHttp(status)` (máy chủ của web) và `moTaLoiDichVu(status, 'Gemini' | 'Google Sheets'…)` → "X báo lỗi: <lí do>. <cách xử lí> (mã N)." Đã thay mọi câu dự phòng "Máy chủ trả lỗi N" / "(mã lỗi N)" / "Google trả lỗi N" / "Kroki N" ở 26 file (service client, Gemini, relay, thử khoá, Sheets, Drive, xuất file). Đợt chấm nền: mỗi `failureCode` lưu kèm `failureMessage`, job dừng có `pauseMessage`; lỗi 409 tách 3 câu (không thấy đợt / quá hạn / đang dừng vì …); log workflow in câu tiếng Việt. Luật trong `tasks/lessons.md`.

## Đợt chấm lại nền dừng khi khoá hết hạn mức — 17/10 (Claude)

Sự cố 16/10 (run 38896124428, `photo-refresh-20261015-retry`): khoá hết hạn mức giữa chừng, ~243 bài thành `failed_preserved` (điểm giữ nguyên) vì runner chỉ dừng khi bị ném `AiKeyRequiredError`/429 quota ngày, còn 429 của Google lại về dưới dạng `{success:false, gradePreserved:true}`. Vì sao "cả hai" không cứu: khoá riêng hết → đường ví/khoá chung ĐÃ được chọn (nếu bị chặn thì đã ném lỗi và đợt đã dừng), nhưng khoá chung máy chủ cũng 429 → không còn nguồn nào. Suy từ code; log Vercel Hobby chỉ giữ 1 giờ nên không đối chiếu được. Đã sửa: `GeminiResponseError.keyFailure` (phân loại như `classifyGeminiKeyFailure`) → `gradeFailureCode()` cho `failureCode` ngắn (cả `gradeOneSubmission` lẫn callback job làm mới dấu ảnh `annotateSubmission`) (`provider_quota`, `provider_key_invalid`, `provider_http`, `unreadable_photo`, `access_422`, `system`…); runner dừng đợt (`status:'paused'`, `pauseReason` = mã, KHÔNG tăng cursor, items/{id} `status:'paused'`) với `provider_quota`/`provider_key_invalid`/`key_blocked_*`/`daily_quota`, trả HTTP 429. Mọi item lỗi ghi `failureCode`. Workflow dừng sau 3 bài lỗi liên tiếp (`failed`/`failed_preserved`). 22/10: 429 chỉ vì giới hạn mỗi phút (`rateLimitRetryMs` trong `aiKeyPolicy.ts`: có `retryDelay`/`PerMinute`, không `PerDay`/`limit: 0`) → `provider_rate_limit`, runner KHÔNG dừng, KHÔNG tăng cursor, items `waiting_rate_limit`, trả `{busy, retryAfterMs}`; workflow đợi đúng thời gian đó (20–120 giây) rồi làm lại bài, 10 lần liền thì dừng. Thân lỗi không rõ → vẫn coi hết hạn mức và dừng. Cũng 22/10: sửa lệch admin — `isSharedUid` (nhóm dùng chung HOẶC admin) dùng chung ở `ensureGeminiKey`, `onOwnKeyFailure`, `assertSharedAiAllowed`, trạng thái và `setAiMode`; khoá riêng admin hết hạn mức ở chế độ "cả hai" giờ sang khoá chung thay vì bị chặn. Đợt retry 243 bài: chủ dự án quyết, chưa tạo.

## Điểm chấm tay trên bài định kì → sổ điểm (GV xác nhận) — 16/10 (Claude)

Chủ dự án duyệt: AI đọc TỔNG điểm GV viết tay trên ảnh bài định kì, hiện cạnh điểm AI, GV xác nhận rồi mới vào sổ. Prompt bài chấm tay thêm field `teacherMarkedScore` (chỉ đọc, KHÔNG dùng để chấm; không chắc → null) → `parseTeacherMarkedScore` → `grade.paperScore`. Sổ chưa có điểm mốc đó thì `examCheck` đối chiếu với `paperScore` (nhãn "Điểm ghi trên bài"; lệch > ngưỡng vẫn không tự duyệt). GV: dòng bài nộp định kì có ô "Điểm thầy cô ghi trên bài (máy đọc)" + "Xác nhận vào sổ" (cột = `periodicTest.sheetLabel` hoặc tên bài) → action `confirmPaperExamScore` lưu `scoreBooks.paperExams` RIÊNG (đồng bộ file điểm thay `exams` cả khối nên không xoá mất); `normalizeScoreBook` ghép vào `exams` với `source:'paper'`, cột file điểm đã có thì FILE THẮNG; `writeBook` bỏ phần ghép (`storedExams`). Sổ điểm tô đỏ nhạt điểm từ ảnh. Mốc trùng tên cột TDS của lớp thì vào TDS, còn lại MOET. Test: score-book +1, grade-homework.variants +1, gradingPrompt, examVariants.

## Học sinh tự nhập khoá Gemini; khoá lỗi thì chấm bằng khoá thầy cô — 16/10 (Claude)

Chủ dự án chốt: mọi HS được nhập khoá của mình (Gmail riêng), không giới hạn; không có khoá / khoá lỗi thì tự dùng khoá thầy cô, màn hình nói rõ. `studentAiKeys/{classId}__{studentId}` (chỉ máy chủ, rules mặc định chặn; gắn theo em, không theo phiên ẩn danh). `ensureGeminiKey`: lượt do HS gọi (identity ẩn danh + `studentLinks`) dùng khoá em trước — `source:'own'`, `studentKeyId`, không trừ ví, không cộng sổ chi tiêu thầy cô; `aiUsage.keyHolder='student'`, sao kê tách `studentKeyCalls`. Khoá em bị Google từ chối (429/hỏng) → `onOwnKeyFailure` ghi trạng thái (nghỉ 60 phút với hết hạn mức) rồi gọi lại NGAY bằng đường của thầy cô. Action `studentAiKeyStatus/saveStudentAiKey/deleteStudentAiKey` (probe Google trước khi lưu, không trả khoá). UI: mục "Khoá AI của em" trong hộp chi phí AI ở đầu cổng HS. Áp cho mọi lượt AI do HS gọi (chấm bài tự nộp, hỏi lại câu, bài chữa, bài luyện); lượt GV bấm chấm vẫn dùng khoá GV. Lưu ý pháp lý đã nêu với chủ dự án: điều khoản Gemini API về tuổi (≥18) và dữ liệu gói miễn phí — chủ dự án quyết bật. Test `ai-keys.test.ts` +4, `StudentAiKeySection.test.tsx`.

## Bài kiểm tra định kì nhận đề scan / ảnh chụp — 16/10 (Claude)

Trước: file không có lớp chữ bị loại ("không có chữ (bản scan hoặc ảnh)…") dù "Để AI giải đề" vốn gửi được ảnh trang. Nay `readExamSourceFile` trả `scanPages` cho PDF scan / ảnh JPG-PNG-WEBP; `splitVariantSources` coi mỗi file ảnh là một đề, mã lấy theo tên file CHẶT ("Mã đề 101", "đề 101" — số trần như IMG_0457 không tính), mọi trang làm `pageRefs`; tên không có mã → dòng mã TRỐNG + khung hỏi lại "file này là mã đề nào" (chưa điền thì không giải đề/giao được); chỉ một đề ảnh không mã → đề số 1. Đáp án dạng ảnh chưa đọc tự động (báo GV dán hoặc để AI giải). Giới hạn: file scan GỘP nhiều mã (khối 12) chưa tách được — tách mỗi mã một file. QA production 16/10 (không giao bài): PDF ảnh "… đề 101 …" → mã 101; IMG_0457.jpg → dòng mã trống + khung hỏi lại, nút AI giải khoá tới khi điền mã.

## Kiểm dấu trên ảnh sau đợt chấm lại (Claude) — 16/10

Đọc dữ liệu production qua phản hồi API trang GV (không token): bài chấm từ 13/10 có dấu 133/141, câu có dấu 1.810/2.275; 8 bài còn 0 dấu (khớp lượt lỗi 429 của job retry đang pause). Mắt soát bài Hồ Khánh Phương (Đề cương số 4): dấu trắc nghiệm đúng từng dòng, câu sai khoanh đỏ đúng chỗ; Đúng/Sai hơi lệch lên nửa dòng; một bài tự luận bị khoanh trùm cả trang — chất lượng định vị, không phải lỗi code.
Sửa `SubmissionPhotoReview`: ảnh và danh sách câu dùng chung một nhãn (`appearanceOf`). Câu máy đọc chưa chắc là "Cần đối chiếu" xám nét đứt ở CẢ HAI chỗ khi chưa duyệt (trước đó danh sách ghi "Đúng" mà ảnh khoanh xám); bài đã duyệt hiện theo kết quả (xanh/vàng/đỏ), HS không còn thấy câu đúng của mình bị khoanh xám mãi. Test 153/153 thư mục lớp học.

## Sửa dấu chấm và đợt chấm lại — 15/10

Inventory production read-only đúng chủ dự án: 468 lượt nộp ảnh, 1.130 ảnh, 437 lượt có bài giao, chỉ 7 lượt có geometry. Mẫu `GHKI - Đề cương số 4` có 7 ảnh/21 câu nhưng 0 geometry. Root cause xác nhận: schema prompt cuối thiếu `photoMarks`/`readingRegions`; luồng chấm không có pass định vị khi model bỏ vùng; UI bỏ vùng trung tính sau khi câu unreadable không còn clarification.

Đã sửa: schema bắt buộc hai mảng tùy chọn; pass định vị riêng không đổi grade; UI hiển thị `readingRegions` trung tính cho mọi câu chưa chắc; merge geometry giữ điểm, ảnh, cờ bỏ dấu; source fingerprint chặn đáp án đổi trong lúc chấm; claim transaction chặn sửa tay mới; queue lease 6 phút, pause/retry/idempotency, job allowlist cố định. Quota GV/ngày chỉ bypass khi job admin có `allowDailyQuotaBypass=true`, user đã duyệt waiver riêng đợt này; quota/chi phí AI còn lại giữ nguyên.

Đã chạy mẫu production `GHKI - Đề cương số 4`: 1/1 thành công, 23 vùng, điểm 8.85 và chưa duyệt giữ nguyên. Batch 436 lượt đã xử lý: 127 `graded`, 292 `failed_preserved`, 17 `failed`; 31 lượt không gắn assignment được skip. Lỗi chính Gemini provider 429, kèm 503/timeout/system; grade cũ luôn giữ.

Retry `photo-refresh-20261015-retry` đã được resume từ cursor 0 sau khi khóa policy được sửa. Queue hiện complete `309/309`: `graded=66`, `failed_preserved=229`, `failed=14`. Các lượt thành công trước đó được nhận diện `already_done` khi cần; không ghi đè điểm cũ. Pause reason còn lưu trên document là lịch sử của lần cũ, không phải trạng thái hiện tại.

**Chạy tiếp 16/10 (Claude, chủ dự án duyệt):** chủ dự án nhập khóa server-side mới (đuôi `htzg`, UI "Đang dùng được"); Claude đổi riêng `status` paused→running trong Firebase console rồi chạy run [38896124428](https://github.com/congapro60-dev/soangiaoan/actions/runs/38896124428) (11:47–14:08 UTC). Kết quả job: cursor 309/309, `graded` 66 (7 canary + 59), `failed_preserved` 229, `failed` 14; workflow exit 1 "items requiring follow-up". 59 bài đầu thành công đều (~1,5 phút/bài); từ 13:16 UTC mọi bài lỗi trong ~12 giây — nguyên nhân đã xác minh: `aiKeyStatus` báo khóa `htzg` `keyStatus=exhausted` lúc 13:16:43Z (UI "Hết hạn mức"); chế độ "Cả hai" nhưng refresh không chuyển sang ví và không pause vì `grade()` trả `gradePreserved` thay vì ném 429 → runner ghi `failed_preserved` thay vì pause (lỗi thiết kế, cần sửa trước đợt sau). Ví hôm nay 62 lượt/46.925đ nên các bài lỗi gần như không gọi AI. `items/*` không lưu lý do lỗi. Lỗi vận hành: monitor của Claude hỏng (`gh api` từ chối log có mã ANSI) nên không hủy run khi lỗi bắt đầu → ~243 lượt gọi lỗi bị tiêu. Điểm cũ giữ nguyên theo thiết kế `failed_preserved`. Job đã hết cursor; chạy lại 243 bài lỗi cần job mới — chưa tạo, chờ chủ dự án. Soát 3 bài (dữ liệu API trang GV): `sub_168be462` lớp …2088 7/10, 4 dấu; `sub_22d74c68` lớp …2088 5.25/10, 18 dấu, 2 câu cần GV xem không có dấu; `sub_2922fe4a` lớp …3562 9.25/10, 5 dấu. Cả 3: mọi dấu gắn đúng ảnh của chính bài (`imageIndex` đếm từ 1, `imageUrl` = `fileUrls[imageIndex-1]`), khung trong ảnh, không sửa tay, số ảnh = số đính kèm. `sub_168be462` đã duyệt nguồn `auto_timeout` (luồng tự duyệt 60 phút, không phải refresh). Chưa đối chiếu điểm/duyệt TRƯỚC refresh (không có snapshot các bài cũ này) và chưa xem nét đứt trên UI; không có `readingRegions` trong 3 bài. 66 bài graded chỉ thuộc 2 lớp (45 …2088, 21 …3562); 12LoTrinh1 không có bài nào.

## Căn cột bài nộp GV — 15/10

Danh sách bài nộp dùng chung 7 cột: HS, trạng thái, hạn nộp, lưu ý, điểm, duyệt, giờ/tệp. Hàng chưa nộp cùng cột; mã đề riêng có chiều rộng cố định. Nhãn ngắn một dòng, giải thích và điểm GV đối chiếu giữ trong chú thích. Container hẹp chuyển bố cục gọn, không thay callback hoặc dữ liệu chấm.

Lint, 17 test liên quan và build cuối đạt. QA fixture qua trình duyệt: 1100px có/không mã đề, 7 cột thẳng qua 6 hàng; 390px không tràn ngang/nhãn. Không ghi vào lớp thật. Lần 320px timeout nên chưa chứng nhận. Ảnh fixture lưu cục bộ `visualizations/.../submission-columns/desktop.png`; không chứa dữ liệu HS thật.

## Bản chấm tay và bài chữa nộp hộ — 15/10

Người dùng đã duyệt, gồm quyền AI cho GV/PH và HS/PH cùng xem bài chữa. Nhánh `codex/handmarked-corrections`; kế hoạch `docs/superpowers/plans/2026-10-15-handmarked-correction-plan.md`, bằng chứng `tasks/handmarked-correction-ledger.md`.

- GV tải ảnh/PDF gắn đúng lượt nộp; mặc định ẩn. Công bố riêng, độc lập điểm AI; bản mới tự về ẩn. File riêng, không token tải vĩnh viễn; URL đọc có hạn 60 giây sau kiểm quyền. Tắt chặn lần mở tiếp theo, không thu hồi nội dung đã tải.
- GV/HS/PH được lưu, xem, gọi AI cho bài chữa đúng quyền. Lịch sử ảnh vẫn xem được sau khi thu hồi công bố điểm; lưu/đánh giá mới cần nguồn chấm công bố. Nhận xét cũ được ẩn khi nguồn thay đổi. Không sửa điểm gốc.
- Chấm tay chưa có AI grade: chỉ đưa ảnh/ghi chú chấm tay công bố vào AI. PDF-only trả “Chưa đủ căn cứ”, cần ảnh chấm tay để đối chiếu; ảnh bài chữa vẫn lưu.
- Ảnh chấm tay xem ngay trong card; PDF mở tab. Nguồn đổi thì UI bỏ nhận xét cũ, giữ nháp. Xóa bài có fence và lease retry, dọn mọi revision/file/audit, không để upload đồng thời tạo tệp mồ côi.
- Đã tích hợp main 2407c50, giữ các sửa lỗi khác. Full 3.146/3.146, Rules 309/309, app/API strict/non-strict và build cuối đạt (index 1.532,10 kB; cảnh báo chunk có sẵn). Rules đã deploy; native Astra xhigh review PASS. Đích tích hợp: main. Chi tiết: `tasks/qa-handmarked-corrections-20261015.md`.
- Tab GV và tab QA cục bộ timeout khi kết nối; chưa có bằng chứng QA upload thật/mobile/iPad cho tính năng mới. Không đổi điểm, nộp ảnh giả hoặc gửi tin cho lớp thật. Người dùng yêu cầu ngừng model bên ngoài, chỉ dùng native Astra xhigh cho subagent.
- Source `33b21cd` đã push main. API Typecheck CI thành công; Quality Gate và Vercel Git deployment đang chạy tại snapshot. Không deploy/promote Vercel thủ công. Phần chưa nghiệm thu duy nhất trong phạm vi tính năng: QA trình duyệt thật và chất lượng nhận xét trên bài chữa thật mới.

_Các mục 30/09–14/10 (ví AI, cổng phụ huynh, hỏi lại học sinh, nhiều khoá Gemini, bút đỏ, QA 14/10, SSM/CKEditor follow-up) đã chuyển nguyên văn sang [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md) ngày 2026-10-22._

## SmartPlan QA bundle follow-up 2026-10-16

- Lazy-loaded standalone routes and file-heavy utilities from src/main.tsx/src/App.tsx to reduce production entry bundle from ~1.535 MB to ~672.89 kB.
- Tests: full unit 3174/3174; focused QA and typechecks pass; build pass.
- Remaining: large lazy chunks remain expected; no production data writes.

## Bot Cuong Vu — Zalo Bot Platform — 2026-10-21

- Commit `a8ec359` adds the official Zalo Bot Platform transport at
  `/api/assistant?transport=zalo_bot`; it is separate from the existing Zalo OA
  adapter and Telegram identity namespace.
- Webhook checks the fixed Zalo Bot API origin, `X-Bot-Api-Secret-Token`,
  configured bot identity, private human sender, exact sender/chat binding,
  bounded payload, fresh millisecond timestamp, durable replay claim, and
  server-side per-teacher link/confirmation authorization. It replies only to
  the inbound private chat and never sends startup or group messages.
- Supported commands: `/help`, `/link CODE`, `/classes`, `/confirm ID HASH`,
  `/cancel ID HASH`, `/status ID`. Natural-language `chat` remains
  `NOT_IMPLEMENTED`; write tools stay confirmation-gated and disabled unless
  separately implemented.
- Verification: Bot tests `36/36`; full suite `3317/3317` before the final
  stream/sender hardening; current `lint`, `lint:api`, `git diff --check`, and
  Vite build pass. Existing chunk-size and browser externalization warnings
  remain.
- Required server-only variables: `ZALO_BOT_TOKEN`, `ZALO_BOT_ID`,
  `ZALO_BOT_ALLOWED_IDS`,
  `ZALO_BOT_WEBHOOK_SECRET`, and `SMARTPLAN_ASSISTANT_SECRET`. Never put them
  in chat, `VITE_*`, logs, or committed files.
- `ZALO_BOT_ALLOWED_USER_IDS` is optional. Leave it blank for one-use
  `/link CODE` bootstrap; linked private senders are then checked in Firestore.
- Remaining: Bot token/ID/webhook secret, Firebase link code, Vercel env,
  webhook registration, production deployment, and private Zalo canary. The
  current production deployment `b913b1c` does not contain this commit.
- Routing used native Codex / `gpt-6-sol`; Astra was not used. No live Zalo
  message or third-party chat was sent.


## Assistant Gateway release — 2026-10-19

- Added channel-neutral /api/assistant auth/link/read/share/confirmation/job lifecycle for Telegram + Zalo OA. Identity binds Firebase UID to exact channel account/user; payloads, previews, results, job refs, and adapter output are bounded/redacted.
- Added draftLesson confirmation executor only. It returns persisted: false; export, Drive upload, assignments, grading, grade edits, and outbound messages remain fail-closed NOT_IMPLEMENTED.
- Release gate: 
pm run test (full suite), 
pm run lint, 
pm run lint:api, 
pm run build; existing Vite chunk/externalization warnings remain. Focused assistant tests cover link/share/confirmation/replay/jobs/writes.
- Zalo/Telegram adapter code lives in the separate du-lesson-automation-task7 worktree and requires its own Railway release. Zalo production needs a persistent path for ZALO_WEBHOOK_REPLAY_DB; no credentials or external canary were run.
- Next owner action: set Vercel SMARTPLAN_ASSISTANT_SECRET and ZALO_OA_ALLOWED_IDS, Railway matching secret + bot/OA vars, then configure Zalo webhook at /api/zalo/webhook. Do not enable real write tools until Task 9 canary passes.
- Vercel preview initially exposed a stricter TypeScript error in 
ormalizeScopes; explicit narrowing was added in commit 197583f. Local 
pm run lint:api, focused tests, and 
pm run build pass afterward. Recheck both Vercel projects before production promotion.

## Release checkpoint — 2026-10-21

- Commit: `723c4617d45db3ad1e688a50ed8597f13c672715` on `main`; push fast-forward from `0b8d6fb` succeeded. No force push.
- Firebase Rules: `firebase deploy --only firestore:rules --project smartplan-ai-14200` exit 0; compiled and released. Warnings only for now-unused public attempt helper functions after client-write deny.
- Vercel: `dpl_H3zcqnStuZNVo5a5AueUGPpxe12M`, `READY`, production alias `giaoandewey.vercel.app`, Git SHA matches `723c461`.
- Smoke: production root HTTP 200/title `Smart Lesson Plan AI`; nonexistent exam API HTTP 404 with Vietnamese error. These are deployment smoke only, not browser E2E.
- Browser E2E and real GV/HS workflow remain unverified because the browser control session was unavailable/timeout. No production student/teacher data writes made.
