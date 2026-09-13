# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-09-13
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Handoff ngắn cho lô V4 live lesson. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## TV/HS — kết quả trực tiếp và nhịp 40 phút — 2026-09-12

- TV có biểu đồ theo hoạt động; GV và tv-control đều có nút công bố/ẩn. Chỉ owner đọc phản hồi để tổng hợp. Số người gửi không được coi là số người làm đúng.
- Hoạt động nhóm: HS chọn số nhóm 1–12 thầy cô đã thông báo; groupMemberships giữ riêng tư. TV nhận public/groupProgress gồm số thành viên và số người gửi theo nhóm, không tên/UID/bài làm.
- HS đọc nhiệm vụ từng tuyến trước khi chọn; tiêu chí và khung câu theo nội dung giáo án. Bài AI Error giữ loại lỗi cùng giải thích; mở gợi ý không ghi đè phản hồi tuyến.
- Đồng hồ dùng cueStartedAt + cueElapsedSeconds: tạm dừng giữ thời gian, tiếp tục cộng tiếp; bật/tắt thống kê không reset. Chuyển cue bắt đầu thời lượng mới. TV/HS hiện khoảng phút dự kiến trong tiết.
- Chuyển cue và public state ghi cùng transaction; publisher kiểm tra lại cue/cờ công bố trước khi ghi để tránh bảng của bước trước.
- Phải triển khai firestore.rules cùng ứng dụng: clock có trường optional tương thích session cũ; thêm hai đường dữ liệu nhóm giới hạn quyền.
- Không chạy QA/test/build theo yêu cầu chủ sở hữu. Các số test PASS bên dưới thuộc phiên bản cũ, không chứng minh lô này. Không tự chia nhóm, không tự đánh giá đúng/sai hoặc chiếu bài làm.
- Chi tiết và hướng dẫn: docs/features/2026-09-11-live-activity-results.md.
- Bổ sung ngày 13/09: lựa chọn P08 có nhãn dấu cùng nghĩa, dùng chung ở HS và biểu đồ TV; bài P20 có dữ kiện, phân vai và yêu cầu nộp kết luận riêng. P05 chỉ nghe/chốt mục tiêu, bỏ bước phản hồi không có ý nghĩa. Đề bài chung đặt trước ô trả lời, mặc định mở trong hoạt động AI Error.

## Đồng bộ BTVN sang Google Sheet — 2026-09-11

Nút trong app, chỉ chạy khi giáo viên bấm. Tuỳ chọn theo lớp, mặc định tắt. Kế hoạch đầy đủ và khảo sát hai file thật của chủ dự án nằm ở `tasks/todo.md`.

**Kiến trúc:**

- Đồng bộ chạy **trong trình duyệt giáo viên**, bằng quyền Google của chính giáo viên — dùng lại `getDriveAccessToken()` của tính năng "Đẩy giáo án lên Drive". Không email robot, không token Google trên máy chủ, giáo viên này không chạm được sheet của giáo viên khác.
- Máy chủ chỉ thêm action `setClassSheetSync` (lưu `classes/{id}.sheetSync`) trên `/api/classroom` hiện có. Không thêm Vercel function.
- `src/lib/classroom/sheetSync.ts` là toàn bộ phần quyết định (thuần, 36 test). `sheetsApi.ts` chỉ đọc ảnh chụp tab và gửi lệnh đã dựng. `SheetSyncPanel.tsx` là giao diện.

**Ngưỡng sắp cắn người:**

- **Cam kết "không động vào tab liên lạc phụ huynh, ghi chú học sinh, quỹ lớp, hạnh kiểm" nằm ở CODE**, không ở Google (Google cấp quyền theo cả file). Mọi lệnh ghi đi qua `assertWriteAllowed` + `applySheetRequests` kiểm `sheetId`. Ai thêm loại ghi mới phải thêm vào cổng này, không gọi `batchUpdate` thẳng.
- **Người sửa luôn thắng**: ghi chú `SmartPlan: <giá trị> · <giờ>` trên ô là trí nhớ của app. Ô khác giá trị ghi chú hoặc không có ghi chú = người đã chọn, không bao giờ ghi đè. Đừng đổi sang lưu toạ độ ô trong Firestore — chèn cột là lệch.
- **Không chèn cột**: hết cột trống đã định dạng sẵn (có danh sách chọn ở dòng 12) thì báo. Chèn cột làm lệch công thức Hạnh kiểm của file 11 Columbus.
- Chuỗi trạng thái phải đúng từng ký tự kể cả biểu tượng (`SHEET_STATUS`) — công thức đếm và công thức Hạnh kiểm so chuỗi y hệt.
- "Chưa làm" chỉ ghi **sau** giờ ở dòng 5; không bao giờ ghi "Thiếu".
- Tab `11. COLUMBUS (LINK)` của file theo dõi 3 lớp là bản `IMPORTRANGE` — app từ chối nối, phải nối file gốc.
- v1 chỉ bài giao nộp ảnh/file (`type !== 'exam'`, `purpose` = assignment). Đề online chưa lên sheet.
- **Phải bật Google Sheets API** trong dự án GCP `smartplan-ai-14200` (số `1030734458631`). QA đầu tiên trên production (11/09) báo `SERVICE_DISABLED`: Drive API đã bật từ trước cho tính năng đẩy giáo án, nhưng Sheets API là API riêng. `sheetsErrorMessage` giờ báo đúng nguyên nhân kèm link bật, không còn đổ cho quyền của file.
- **Deploy làm hỏng tab đang mở** ("Failed to fetch dynamically imported module"): Vercel xoá file JS của bản cũ, tab cũ bấm sang mục chưa tải là hỏng. `src/lib/staleChunkReload.ts` + `main.tsx` giờ tự tải lại MỘT lần (nghe `vite:preloadError` và bắt ở ErrorBoundary), có chặn vòng lặp 30 giây. Chỉ bảo vệ những tab mở SAU bản `fix/chunk-reload`; tab mở trước đó vẫn gặp một lần.
- Nghiệm thu: `lint` 0, `lint:api` 0, full Vitest **158 files / 1948 tests PASS**, `build` PASS.

## TV thành slide trình chiếu điều khiển tại chỗ — 2026-09-10 (lịch sử)

Chủ sở hữu báo ba việc trên production: TV không có Trước/Sau/đồng hồ nên phải chạy về laptop; chữ trên TV đầy tốc ký kỹ thuật; TV không giống một file slide gắn với màn hình học sinh.

**Nguyên nhân gốc, không phải lỗi hiển thị.**

- `mode=tv-control` (đã có nút điều khiển) **chưa bao giờ được `buildLiveLessonUrls` sinh ra** — hộp mở tiết chỉ đưa GV/TV/HS, nên nút có mà không có đường vào. Đồng hồ thì chưa từng tồn tại trên TV.
- `buildPublicTvScreens` của gói P31 nối `boardLarge` + `boardSide` làm nội dung slide. Đó là **tốc ký cho GV viết bảng**, nên TV chiếu ra "Giữ mô hình + định nghĩa + tiêu chí." và "LỖI CẦN SOI: dấu ≤; thay cặp". `title` lấy từ `block.label` viết hoa nên ra tên kỹ thuật của bước ("POST-CHECK CÁ NHÂN", "DUYỆT NHÓM").
- Trường `action` của `LiveLessonScreen` có sẵn nhưng nhánh V4 **không bao giờ điền**, nên TV chưa từng nói cho lớp biết phải làm gì trên máy.

**Đã đổi và vì sao.**

- 11 slide P31 viết lại thành chữ trình chiếu qua bảng `TV_SLIDES` tường minh; mỗi slide kèm một câu "việc của em". 48 bài Ban Toán sinh tự động lấy `publicScreenAction` trong `runtimeDefinition.ts`.
- TV có đồng hồ **đếm ngược hoạt động** (quá giờ đổi vàng, hiện `+m:ss`), thanh tiến trình theo cue và bộ đếm "Hoạt động k/n". Mốc đếm là `publicState.updatedAt` — TV, laptop GV và máy HS cùng một mốc, không máy nào chạy đồng hồ riêng.
- Thanh Trước/Chạy/Sau **tự ẩn sau 3,5 giây**, hiện lại khi có chuột hoặc phím; phím tắt ← → Space F. Đây là cách hoà giải với thiết kế cũ vốn cấm nút trên TV vì sợ học sinh nhìn thấy.
- Khung **WALT/WILF cố định dưới mọi slide** (`LiveLessonDefinition.intent`, dựng từ `contract.objectives.math`) là lựa chọn thiết kế hỗ trợ đối chiếu mục tiêu; không phải xác nhận tuân thủ một điều khoản CIS.
- Cỡ chữ bám cả `vw` lẫn `vh` để màn 16:9 không còn cảnh chữ bé giữa khoảng trống, và slide luôn gói gọn trong một màn hình.
- `docs/features/08-live-lesson-realtime.md` sửa lại: câu cũ dạy rằng "TV hiện nút điều khiển là đang chiếu nhầm cửa sổ" nay đã sai.

**Ngưỡng sắp cắn người.**

- `waltEn`/`wilfEn` cố ý để trống. Không dịch máy mục tiêu bài học rồi chiếu lên tường trong buổi kiểm định; ai có bản dịch đã duyệt thì điền vào gói bài.
- `showStats` vẫn mặc định tắt và chỉ bật được từ màn giáo viên, nên vòng phản hồi TV↔HS còn đứt một nhịp. Đây là quyết định sư phạm của chủ sở hữu, không phải lỗi.
- **Chưa nhìn thấy bằng mắt trên app thật**: `mode=tv` cần phiên Firestore và tài khoản GV; `main` không có đường tắt `qa-v4-preview`. Đã dựng bản HTML tĩnh đúng markup và đúng file CSS thật, đo ở 1600×900 tới khi mọi dải nằm gọn một màn và chữ thân slide đạt 37,8px. **KaTeX trên nền slide mới chưa được kiểm.**
- Test chặn hồi quy trong `runtimeDefinition.p31.test.ts`: mọi màn TV bị cấm chứa `LỖI CẦN SOI`, `KHUNG CÂU:`, `TỪ KHÓA:`, `Giữ mô hình`, và bắt buộc có `action`. Ai đổi nội dung slide phải giữ hai điều kiện này.
- 13 fixture ghim tiêu đề TV cũ đã được sửa theo. Đó là tiêu đề cố ý đổi, không phải test hỏng.
- Nghiệm thu: `npm run lint` 0, `npm run build` PASS, full Vitest **156 files / 1907 tests PASS**.

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
