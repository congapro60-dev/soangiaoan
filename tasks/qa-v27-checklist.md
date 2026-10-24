# QA checklist — V27 "Chuẩn THPTQG cho nhiệm vụ Toán"

> Bàn giao cho Claude QA. Bối cảnh tổng hợp xem `HANDOFF.md` + `tasks/plan-hoan-thien-game-va-day-hoc.md` (mục 23/10 — V27).

## Kết quả deploy (đã phát hành 23/10/2026)

- [x] Site version: **v27** (get_site `latest_version_number` = 27, access_mode `public`)
- [x] deployment_id: `appgdep_6adafbba79e08191a2e2b3b17d2d7f94`
- [x] source_commit: `ea14e0a9bed7bab882dd420099207b85f42bfa15` (commit "Update Site source" trên HEAD `ea14e0a` — docs + QA checklist nằm trong lô này)
- [x] HTTP live: `https://mat-ma-da-gioi.cuong-vuviet.chatgpt.site/` → **200**, title "Mật Mã Đa Giới · Toán 10–12"; `/lessons` → 307 (auth flow như cũ)
- [x] Marker live: chunk `useLessonSession-CdAVDDx3.js` fetch về **byte-đúng dist**, chứa cả 3 marker "Bàn phím thập phân", "Điểm ý", `decimal_4`
- [x] Server bundle: `server/_next/static/semester-content-DJyaWVY0.js` trong archive chứa đủ 3 blob pilot r013/r028/r108 (gzip base64 khớp catalogue nguồn). Chú ý: đây là bundle server-side (import qua `lib/lesson/semester-content.js`), KHÔNG serve qua URL tĩnh — kiểm tra nội dung live phải qua app (API `/api/lesson-content` yêu cầu đăng nhập, trả 401 cho anonymous — bình thường).

## Điều kiện tiên quyết

- Phiên GV còn hạn để mở lại tiết / tạo phòng mới từ catalogue (phòng 7E42C2 cũ đã "Hành trình chơi đã kết thúc" — HS mới vào được nhưng mọi nút nộp bị khoá).
- Cloudflare/credential Site: đừng đổi audience, đừng push remote ngoài remote của Site.
- **Không sửa `lib/exam/**`** — thang thi đã ổn; V27 chỉ chạm luồng bài học.

## Dữ liệu pilot (catalogue hki-2026-g11, mỗi entry nhiệm vụ nằm ở act-3)

| Task id | Dạng | Checker | Đáp án | Ghi chú |
|---|---|---|---|---|
| `thptqg-r013-mc` | Trắc nghiệm | choice_exact | `B` ($\frac{2\pi}{3}$) | 120° → radian |
| `thptqg-r013-tf` | Đúng/sai 4 ý | true_false_4 | `[T, T, F, T]` | ý 3 sai: 270° ≠ $\frac{3\pi}{4}$ |
| `thptqg-r013-sa` | Trả lời ngắn 4 ô | short_answer_4 | `1,74` (cells `1`,`\,`,`7`,`4`) | format `decimal_4` |
| `thptqg-r028-mc` | Trắc nghiệm | choice_exact | `A` | **kèm SVG tứ diện/chóp** |
| `thptqg-r028-tf` | Đúng/sai 4 ý | true_false_4 | `[T, F, T, T]` | kèm hình |
| `thptqg-r028-sa` | Trả lời ngắn 4 ô | short_answer_4 | `7,50` | thập phân đuôi 0 |
| `thptqg-r108-mc` | Trắc nghiệm | choice_exact | `B` | hai mặt phẳng song song |
| `thptqg-r108-tf` | Đúng/sai 4 ý | true_false_4 | `[T, F, T, T]` | — |
| `thptqg-r108-sa` | Trả lời ngắn 4 ô | short_answer_4 | `4,80` | thập phân đuôi 0 |

Tìm bài: Library → Toán khối 11 → bài "Khám phá" có `sourcePeriodId` g11-discover-r013 / r028 / r108 (tiết HKI 2026 catalogue).

## A. Đúng/sai 4 ý — thang một phần THPT 2025

Thang chuẩn `TF_RATIO = [0, 0.1, 0.25, 0.5, 1]` (số ý đúng → điểm ý, index = số ý đúng).

- [ ] HS đáp đúng **3/4 ý** → từng phát biểu hiển thị đúng ✓/✗ (vd r013: ý 3 hiện ✗, 3 ý còn lại ✓), chip "Điểm ý" ghi **0,5**, trạng thái bài **chưa** được tính "đúng".
- [ ] HS đáp đúng **2/4 ý** → chip **0,25**; **1/4 ý** → chip **0,1**; **0/4** → 0.
- [ ] HS đáp đủ **4/4** → cả 4 ✓, chip 1, bài được tính "đúng".
- [ ] GPE lớp / bảng xu hướng nhận điểm một phần tương ứng (mini-game — xem C).

## B. Trả lời ngắn `decimal_4` — bàn phím thập phân

- [ ] Chọn task trả lời ngắn → hiện **4 ô ký tự** + **bàn phím thập phân 12 phím** (0-9, dấu chấm/phẩy, xoá) cho HS trên máy bàn/desktop.
- [ ] Nhập bằng dấu **phẩy** (`1,74`) hoặc **chấm** (`1.74`) đều được chấp nhận, hiển thị đúng.
- [ ] Nhập 1 ký tự tự nhảy sang ô kế; Backspace ở ô đầu lùi về ô trước.
- [ ] r028: `7,50` đúng; nhập `7,5` hoặc `7.50` vào 4 ô theo chuẩn checker không bị chấm sai kịch bản khớp.
- [ ] Task không phải decimal (MC, đúng/sai, việc khác) không bị lộ bàn phím thập phân.

## C. Mini-game — điểm một phần

- [ ] Trúng 3/4 ý đúng/sai → sự kiện trao điểm = `Math.round(điểmGốc × 0.5)` (không phải 0, không phải full).
- [ ] Bảng điểm nhóm/xu hướng ghi nhận điểm một phần; trạng thái "đúng" của bài chỉ khi đủ 4/4 (ledger nhị phân).
- [ ] Trả lời ngắn/MC vẫn gặp điểm đầy đủ hoặc 0 như cũ (không có điểm nửa).

## D. Nội dung & hình minh hoạ

- [ ] r028: SVG tứ diện/chóp render đúng trong đề MC và đúng/sai (data-URI, không vỡ layout).
- [ ] Chỉ số 9 task `thptqg-*` xuất hiện — không có entry catalogue nào khác bị xê dịch (budget mọi entry giữ `slotMinutes = 40`).

## E. Bộ soạn AI (chỉ làm khi có phiên GV + AI key)

- [ ] Yêu cầu tạo nhiệm vụ hình học → đề xuất ra đủ 4 dạng THPTQG (MC, đúng/sai 4 ý, trả lời ngắn thập phân, ...) kèm `image`/`diagramUrl` cho bài hình học.

## F. Kiểm tra kỹ thuật nền (đã xanh cục bộ, làm lại xác nhận khi cần)

```powershell
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run test      # 1416/1416 pass (tính tại HEAD trước docs commit)
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run typecheck # 0 lỗi
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run build     # exit 0
node scripts/thptqg-v27-pilot.mjs    # chạy lại phải báo "Bỏ qua" — chứng tỏ idempotent
```

- `tests/lesson-thptqg-v27.test.mjs` — 7 test đặc thù V27 (thang 0.1, decimal_4, verdictMeta, mini-game, UI, prompt AI, lint pilot).
- Chú ý grade file `content/lessons/hki-2026-g11.json` giữ format `JSON.stringify(db, null, 1) + '\r\n'`; sau khi sửa phải chạy `node scripts/content/build-hki-catalogue.mjs`.

## Kế thừa QA cũ (chưa xong, không phải lỗi V27)

- [ ] QA nộp ảnh bài làm (fix 413 của v26) vẫn chờ phiên GV còn hạn: gắn ảnh → autosave 200 → nộp 200 → kiểm báo lỗi nháp tiếng Việt khi ảnh quá lớn.

## Codex live QA v27 — 23/10/2026 (handoff to Claude)

**Scope:** browser-only production QA; no code changes, no hotfix, no release. Technical checks were not repeated per owner request.

**Fixture:** opened lesson from Library → Hình thành kiến thức → “Giá trị lượng giác của góc lượng giác - Góc lượng giác và radian (tiết 1)” (r22-g11-discover-r013), opened new trial room D21092. Three synthetic pupils: QA V27 An, QA V27 Binh, QA V27 Chi. Existing rooms were not modified. Room D21092 was moved to Trash; Site confirmed recovery is possible. Old room 7E42C2 untouched.

**Verified live:** teacher session valid; catalogue lesson selection and draft launch work; draft opened the lesson preview and “Khởi tạo phòng học”; trial-room creation succeeded. Teacher cockpit showed presence 3/3, self-paced status and Start control. Starting lesson opened the pupil mascot chooser and then the first gate. Pupil QA V27 An submitted one numeric response (4/3); Site showed formative feedback (“Lập luận chính xác!”) and advanced to the next task. No AI provider call was initiated.

**Blocked / inconclusive:** during multi-tab pupil interaction, the browser showed the app alert “Đang có thao tác đang xử lý, vui lòng chờ.” and pupil tab became unresponsive to browser automation. We stopped instead of retrying submissions. Thus no verdict on whether the app or browser session contention caused it. Target thptqg-* tasks live in act-3; this run did not reach them. No verdict on THPTQG score chips, decimal keypad, comma/dot acceptance, mini-game partial reward, r028 SVG, 375px viewport, image upload, or QA of r028/r108. Claude should repeat those with a fresh single-pupil session or carefully serialized pupil tabs, then test actual act-3 pilots. Do not infer failure of v27 from this blocker.

**Handoff constraints:** use synthetic pupil names only; create fresh room from catalogue; move QA room to Trash afterward; do not touch lib/exam/**, audience, or existing room snapshots; no hotfix under this QA authorization.

### Chẩn đoán kỹ thuật 23/10 (chiều, Claude/OpenCode) — alert busy-lock

**Kết luận: không phải lỗi v27, không phải deadlock sản phẩm, không cần hotfix.** Guard có từ 09/10 (commit `6d1b24e`); hành vi alert lỗi thô qua `window.alert()` cũng có từ trước — commit 413 hôm nay (`d147ff3`) chỉ thêm bảng `SUBMIT_ERRORS` đổi text thông báo.

Chuỗi sự kiện tái dựng:
1. `components/lesson/useLessonSession.ts:295-297` — guard single-flight chống double-submit: khi 1 POST `/api/lesson-sessions` chưa resolve (`isSubmitting === true`), mọi `dispatchCommand` mới nhận `{ ok: false, error: "Đang có thao tác đang xử lý, vui lòng chờ." }` (không kèm `code` → UI hiện chuỗi thô).
2. Lock được nhả **vô điều kiện** trong `finally` (`useLessonSession.ts:409-411`) trên mọi nhánh — thành công, lỗi HTTP, network throw → không có đường kẹt vĩnh viễn; lock chỉ tồn tại trong thời gian POST đang bay (vài giây).
3. `app/play/page.tsx:1286/1294/1308` — khi lệnh thất bại, lỗi hiển thị bằng **`window.alert()` native** → dialog chặn main-thread của tab cho tới khi bấm OK. CDP/Puppeteer không tự dismiss dialog khi chưa đăng ký handler → các lệnh automation tới tab đó treo/timeout → "tab HS không phản hồi".
4. Trigger buổi chiều: điều khiển nhiều tab HS song song; một dispatch mới (submit/hint, hoặc SAVE_DRAFT — `app/play/page.tsx:916-926` cũng đi qua cùng guard) phát sinh khi dispatch trước chưa xong → dính guard → alert mở và không ai dismiss. Đợt đầu HS An nộp 4/3 bình thường vì luồng submit → phản hồi → chuyển câu chạy tuần tự.

Cách chạy lại (bắt buộc để không dính lại):
- Mỗi thời điểm chỉ thao tác **1 tab HS**; chờ phản hồi (feedback/màn chuyển câu) dựng xong rồi mới thao tác tiếp.
- Gặp alert "Đang có thao tác đang xử lý" → guard tạm thời: dismiss, chờ POST trước kết thúc (~1-2s), thử lại. Không kết luận "treo".
- Với automation: đăng ký handler dialog (`Page.javascriptDialogOpening` → `Page.handleJavaScriptDialog`, hoặc listener `dialog` của Puppeteer) trước khi thao tác tab HS.

Finding UX (deferred — không sửa trong đợt QA này): guard nên trả `code: "BUSY"` để UI phân biệt được; hiển thị toast/inline thay vì `window.alert()` để không chặn tab; nhánh SAVE_DRAFT hiện nuốt lỗi BUSY im lặng (không alert) — nhất quán hoá sau.

### Finding sự kiện lớp 23/10 tối (QA r028) — phải xử lý khi làm v28 hoạt động tập thể

1. **DOM ghost · 2 element khác nhau sau khi sự kiện kết thúc.** DOM còn lại: (i) `section[aria-label^="Sự kiện lớp"]` — textContent có "Sự kiện đã kết thúc · Thời gian trả lời đúng nhanh nhất: 0 giây" nhưng **innerText rỗng** (ẩn); (ii) `.lesson-card` encounter — textContent/innerText **luôn** là "SỰ KIỆN LỚP · 1 NGƯỜI / Bấm chuông / Chuông đã ghi nhận… / Còn…", **không chứa chữ "kết thúc"**, và bên trong có `form.task-form` → bị đếm nhầm thành nhiệm vụ thường. Quy tắc bắt buộc: mọi logic đọc trạng thái sự kiện (UI lẫn automation) phải kiểm **cả textContent và innerText của cả 2 element**;bot v27 đã kẹt 600 vòng vì chỉ lọc một kiểu.
2. **Sự kiện có thể kẹt `open` phía server khi tab HS nền.** Đếm ngược 2 phút của quest chỉ chạy client (rAF); tab nền → rAF/heartbeat dừng → server không nhận tick đóng; tab active lại → client lấy state `open` từ server → render lại live "Còn … giây" → vòng lặp vô hạn (đã tái hiện trên phòng QA r028: probe thấy DOM ghi "kết thúc" nhưng khi tab active, panel render lại live). Cần **server-side auto-expiry**: khi xử lý bất kỳ command nào đến sau deadline, server tự đóng quest trước; cân nhắc thêm tick định kỳ. Đây là điều kiện tiên quyết cho thiết kế v28 (đóng băng cả lớp, "Kết thúc sớm", cổng cuối tiết).

**Bổ sung 24/10 — root cause chính xác sau probe server r028:**
- Server có path auto-expiry (`runtime.js:687-688` chạy trong `reduceCore` khi xử lý mọi command) và **đã hoạt động**: `classEvent.status === "closed"` (probe 24/10: `remainingMs:0`, `classEventBudgetUsedMs:180000`). Nhưng **`classQuest.status` vẫn đứng ở `"open"` mãi mãi** — reducer không có đường chuyển trạng thái ra khỏi `open` (chỉ có `initClassQuest`→`pending`, `openClassQuest`→`open`/`ready`; `closeClassEvent` ở `runtime.js:228` và handler `CLASS_EVENT_CLOSE` ở `:1156` đều **không đụng `classQuest`**).
- Hệ quả: cockpit GV mãi hiện "🎯 Đang chơi …" (lesson-dashboard.tsx:5477, không còn nút mở cổng sau); play ẩn banner quest (`play/page.tsx:1084` điều kiện `status !== "open"`); panel sự kiện ghost treo mãi ở DOM HS.
- Yêu cầu v28 (nâng cấp so với ghi cũ): (1) `closeClassEvent` phải **đặt `classQuest.status = "closed"` + `closedAt`** — cả nhánh đóng bằng lệnh GV, nhánh expiry khi xử lý command; (2) expiry phải chạy cả trong **luồng đọc trạng thái** (`getSession`,Service), không chỉ khi có command mới tới — nếu cả lớp im lặng sau deadline, không có command nào chảy vào reducer để sức đóng; (3) giữ quy tắc kiểm DOM 2 element ở finding 1.

### Cấu hình AI máy chấm (24/10) — đã xong trên live

- Key Vilao mới `SmartPlan-AIGrade` (hint `sk-04e4…3e78`, key chỉ hiển thị 1 lần trên console — đã lưu vào site; key chưa gắn model mặc định → **phải "Đăng ký model" `gemini-3.8-flash` vào key** trước khi API chạy, lỗi 403 "Please subscribe to model" nếu quên).
- Tên model khi gọi API = **`gemini-3.8-flash`** (không có tiền tố `chib/` như console hiển thị; dialog xác nhận đăng ký ghi rõ `Gọi API bằng: "model": "gemini-3.8-flash"`).
- Đã lưu qua `/api/ai-settings` (owner): endpoint `https://api.vilao.ai/v1/chat/completions`, model `gemini-3.8-flash` — **ghi đè cấu hình cũ** (`gemini-flash-latest` @ Google, key …qLbw). Health-check `action:test` → `{ok:true,status:"OK"}`. Test trực tiếp Vilao API 200, mô hình đáp đúng.
- UI thẻ "Cài đặt AI" không có ô endpoint (chỉ Khóa + Mô hình): muốn trỏ provider khác Gemini chính hãng phải POST `/api/ai-settings` `{action:'save', key, model, endpoint}` trực tiếp (route `app/api/ai-settings/route.js` nhận đủ 3 trường) — cân nhắc thêm ô endpoint vào thẻ khi làm v28 AI chấm.

## Kết quả QA end-to-end 24/10 — bot 1 HS chạy đủ luồng (r028c `3AF0F9` + r108 `0566A5`)

**Scope:** production-only, bot Puppeteer 1 tab HS (tên synthetic "QA V27 Cường"/"QA V27 Bảo"), phòng mới tạo từ catalogue r028/r108, không đụng phòng thật 7E42C2. Mã nguồn không đổi.

**Kết quả tổng:** 2 phòng × 1 HS × 10/10 nhiệm vụ (act-1→7) nộp thành công; quest cổng 3 passed 1/1; sự kiện "Bấm chuông" đóng bằng cả lệnh GV lẫn expiry; AI chấm phiếu cuối giờ xác nhận **đúng cả 2 nhánh**.

### Đã xác nhận tốt (v27 đạt)
- **Đúng/sai 4 ý nộp đúng ngay**: TFTT được chấp nhận `assessed` không vòng lặp (r028c lẫn r108); trạng thái chấm và điểm phần đúng phản ánh chuẩn.
- **MC/Trả lời ngắn khớp server**: r028c mc=`A`, sa=`7,50`; r108 mc=`B`, sa=`4,80` — server xác nhận ok=true.
- **AI chấm exit task (act-6) chính xác cả 2 nhánh**: r028c bài bot thiếu bước Ta-lét đảo → `criteriaMet=false`, feedback đủ 2 tiêu chí ("Tiêu chí 1 Chưa đạt — thiếu chứng minh I tồn tại; Tiêu chí 2 Đạt"), confidence 0.95, chấm ~10s sau nộp; HS view hiện "Phiếu cuối giờ · AI chấm: cần hoàn thiện · Thầy/cô có thể rà lại". r108 bài đủ 2 ý (song song + toạ độ AC'⊥ chia 3 đoạn bằng nhau) → `criteriaMet=true`, feedback khen đủ 2 ý, chấm ~8.5s. `assessmentSource=ai`, model `gemini-3.8-flash`, đủ `sourceFingerprint` + `auditReceipt`. Chi tiết verdict nằm ở `openAssessments` (`submissions[].aiAssessment` chỉ là meta).
- **Expiry sự kiện lớp server-side hoạt động**: không cần command, `classEvent.status=closed`, `remainingMs:0`. (Nhưng `classQuest.status` vẫn kẹt `open` — finding (b) dưới.)

### Finding mới chuyển v28
- **(a) ⚠️ activityDeadline khoá toàn bộ input HS → HS bế tắc vĩnh viễn (nghiêm trọng nhất).** Phòng r028 đầu tiên: act-3 hạn 10' chốt theo đồng hồ lớp, quá hạn 47' → `isInputDisabled` toàn form; HS đã sai đáp án trước đó không nộp lại được → quest cổng 3 không pass → lesson kẹt vĩnh viễn, không có đường thoát cho HS lẫn GV. V28 bắt buộc: hết giờ activity vẫn phải còn đường nộp lại (nút nộp luôn bật, tự ghi nhận "nộp muộn") hoặc GV gia hạn/huỷ deadline; không được có trạng thái nào vừa chặn nộp vừa chặn chuyển câu.
- **(b) `classQuest.status` mãi `open` sau khi event đóng** — chi tiết ở mục "Bổ sung 24/10" trên; v28 chốt: đặt `closed`+`closedAt` ở cả nhánh lệnh GV lẫn expiry, và chạy expiry trong luồng đọc trạng thái (`getSession`), không chỉ khi có command.
- **(c) Phòng bị join đè → client chặn submit thầm lặng.** Phòng 886E07 (join 2 lần trên session có learnerState cũ): click "Nộp câu trả lời" không sinh POST nào (chỉ GET poll), không banner lỗi, textarea đầy đủ nút enabled — UI tưởng đã nộp nhưng server `submissions=0`. **Không phải do `mode:"preview"`**: phòng 3AF0F9 cũng preview mà nộp được 10 bài. Phòng mới + join sạch chạy bình thường. V28: mọi lệnh bị chặn phía client phải hiển thị lỗi cho HS, cấm chặn im lặng; soi lại điều kiện chặn submit khi learnerState trùng tên/phòng.
- **(d) Card nhiệm vụ rỗng vài giây khi view mới mount** (innerText rỗng trước khi đề render) — automation cần blank-guard (chờ card có nội dung, không đếm stall).
- **(e) Tạo phòng lần 1 thường fail** ("Waiting failed: 25000ms" — app đang "Khôi phục phiên giáo viên"); chạy lại tab mới là được. Không phải lỗi v27.
- **(f) Xóa phòng qua /hosts** là modal 2 bước: bấm "Xóa" → **nhập mã phòng 6 ký tự** → "Xác nhận xóa"; phòng chuyển Thùng rác (khôi phục được). Đã đưa 4 phòng QA rác vào Thùng rác (7062E5, 886E07/hỏng join-đè, 6B14E6, AFE3CB/kẹt deadline); giữ lại 3AF0F9 (r028c, nhánh AI fail-đúng) + 0566A5 (r108, nhánh AI pass) để đối chiếu tới khi chốt.

### Ghi chú vận hành QA (cho lần sau)
- Verify server: từ tab `/hosts` (cookie GV) chạy `GET /api/lesson-sessions?id=<session>` **không** kèm `kind=presenter` → full view: `submissions` (10 bài, status `ai_assessed`) + `openAssessments` (feedback + `criteriaMet` per tiêu chí). `kind=presenter` chỉ trả projection rút gọn, không đủ dữ liệu.
- Bot luôn đăng ký CDP dialog-handler trước khi thao tác tab HS (alert native chặn tab — chẩn đoán 23/10); chỉ chạy 1 bot HS một lúc; tab Chrome dư cần đóng trước khi chạy bot (CDP quá tải → `Network.enable timed out`).
- Trình tự script dùng được: `qa-room-create.mjs` → `qa-pupil-join.mjs` → `qa-teacher-start.mjs` → `qa-pupil-play.mjs` (lượt 1, dừng ở sự kiện) → `qa-temp-event-close.mjs` (env `QA_SESSION`) hoặc chờ expiry → `qa-pupil-play.mjs` (lượt 2) → verify.

