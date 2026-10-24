# QA cổng học sinh bài mới V8.8 — vt2 `adaptive-1792819244998`

- **Ngày QA:** 2026-10-24 · **Môi trường:** production `giaoandewey.vercel.app` (không đụng code, không đụng nội dung).
- **Phạm vi:** 3 luồng portal bài mới theo 3 tuyến (diagnostic → dewey-lesson → luyện tập → extend → tổng kết → exit-ticket → lưu kết quả).
- **Phương pháp:** 3 phiên học thật với 3 mã HS; đo qua DOM/frames của iframe `srcDoc` (không dùng innerText parent); soi network qua `network.list/get`; đọc bundle asset từ tab cùng origin.
- **Kết luận nhanh:** toàn bộ luồng chạy thông, **0 console error** ở cả 3 tuyến; 3 tuyến gán đúng theo pattern trả lời; lưu kết quả POST thật `ok:true`. Có **9 finding** cần fix (1 lộ đáp án, 1 mất resume tiến trình) — thống nhất ở phần cuối.

## Ma trận 3 tuyến (kết quả chính)

| Mã HS | Pattern trả lời | Đúng | Tuyến được gán | Kỳ vọng | Đối chiếu threshold telemetry |
|---|---|---|---|---|---|
| 10A1-901 | A, C, B, D(2√2), C | 5/5 | **Thách thức** (challenge) | challenge | khớp: weak=0, mid=0, hard mastered ≥1 |
| 10A1-902 | A, A, A, A, A | 1/5 | **Cơ bản** (foundation) | foundation | khớp: weak ≥2 |
| 10A1-903 | A, C, B, A, A | 3/5 | **Chuẩn** (standard) | standard | khớp: rơi nhánh else |

- Chốt **không có lỗi phân tuyến**: cả 3 nhánh đều chạm được, mapping khớp công thức trong `telemetry-DrhuTabU.js` (weak `<0.4`, mid `0.4–0.7`, hard `≥0.9`).
- Lưu ý nhãn UI: challenge hiển thị "Thách thức/Thử thách", foundation hiển thị **"Cơ bản"** (không phải "Nền tảng") — cần nhất quán từ ngữ khi nói với GV.

## Đã nghiệm thu đạt (không phát hiện lỗi)

- **Diagnostic:** form HS → test 5 câu → nộp → cá nhân hoá, không rơi dậm chân ở cả 3 phiên.
- **Bài học HTML:** TOC đủ 7 mục; MathJax render **752** container (challenge/standard) và **376** (foundation — rút gọn thật, không phải đổ lỗi dữ liệu); 5 sim iframe srcdoc mỗi tuyến; TikZ SVG qua kroki có mặt.
- **Sim mảnh 1 "Giải cứu Ever Given":** chấm vật lý chuẩn theo góc kéo: 0°→700,0 · 60°→608,3 · 90°→500,0 · 120°→360,6 kN.
- **Pack 9 câu "Luyện tập":** MC chấm đúng, sai có nhắc làm lại; SA prac-7 = 10đ, prac-8 = 4,4đ (tolerance 0,1) chuẩn; **TF chấm từng ý** (`TR.tf-right/tf-wrong` + cột reveal "✓ Đúng/✗ Sai"), thang partial `[0, 1, 2,5, 5, 10] × max/10`; essay prac-9 có gợi ý từng ý + đáp án chi tiết + tự chấm 10δ nhận đúng 35đ tổng.
- **Gate chain:** 3 unit × 7 bước mở đủ qua "Mỡ bước tiếp theo / Hoàn thành hoạt động"; chuyển unit bằng TOC ok.
- **Mục 6/7:** cổng "Sang phần tổng kết" hoạt động; tổng kết "Tổng điểm luyện tập: 35" khớp pack; exit-ticket 3 câu MC chấm đúng (đáp án chuẩn A/B/C, đã verify toán) → màn "Đã lưu kết quả học tập".
- **Persistence:** POST `/api/adaptive-progress` lúc nộp exit-ticket, body đủ `progressRecord` (route, status completed, từng câu diagnostic) + profile; response `ok:true`. Fallback localStorage + sync offline có trong code.
- **Console:** 0 lỗi ở parent lẫn iframe (collector `window.__cap`) trong suốt phiên challenge và cả 2 spot-check foundation/standard.

## Findings + hướng fix

| # | Mức | Hiện tượng | Minh chứng | Hướng fix |
|---|---|---|---|---|
| b | **P0** | Đáp án MC/SA **lộ trong DOM** qua `data-correct` / `data-correct-option` trên input — HS mở DevTools là biết đáp án. TF an toàn (không có attr). | inspect input pack MC; TF prac-6 chỉ có `type,name,value` | Builder dựng HTML không gắn đáp án vào DOM; chấm qua state JS nội bộ. Sửa 1 chỗ trong `deweyAssets` builder (hàm build pack), mọi bài hưởng. |
| f | **P0** | **Không resume tiến trình giữa các phiên + checkpoint status sai** — sau khi hoàn thành, reload portal quay về Bước 1; nhập lại mã 901 → diagnostic MỚI; checkpoint localStorage `status:"in_progress"` dù đã xong; mâu thuẫn lời hứa "hệ thống nhớ tuyến học của em". | reload sau "Đã lưu kết quả" → form trống; checkpoint `{completedUnitIds:3, olympiaScore:35, status:"in_progress"}` | Khi nhập mã: đọc profile server (hoặc checkpoint) → nếu completed: hiện summary/hồ sơ; nếu in-progress: mời "tiếp tục học". Cập nhật checkpoint status đúng lúc nộp exit-ticket. |
| e | **P1** | `unit.routes[*].practiceTasks = 0` ở MỌI route trong data V8.8 — dữ liệu practice per-route rỗng (pack đang build runtime từ nội dung khác). | `adaptiveLessonService` shape vt2 | Chốt ý định pipeline: nếu practiceTasks là nguồn pack thì generator phải sinh; nếu không dùng thì bỏ field khỏi spec để khỏi gây hiểu nhầm. |
| i | **P1** | `unit.quickCheck` (2 câu/unit) **có trong data nhưng portal không render** — mất hoạt động kiểm nhanh cuối unit. | DOM unit không có radio quickCheck | Thêm bước render quickCheck vào builder scaffold, hoặc bỏ khỏi data. |
| g | **P2** | Đánh số h2 màn "3./4./5." lệch +1 so với TOC "2./3./4." (lặp ở cả 3 tuyến). | h2 unit = "3. Kỹ thuật…", TOC = "2. Kỹ thuật…" | Builder đánh số h2 đúng index TOC. |
| c | **P2** | Tiêu đề mọi scaffold step đều lặp **"Thử và sửa"** cả 7 bước (hook, guide×5, ex) — badge số thì tăng nhưng tên không đổi. | hook/guide/ex đều "Thử và sửa" | Builder lấy đúng tiêu đề từng step từ unit data. |
| d | **P2** | Exit-ticket mang nhãn **"Bước 3. Bài kiểm tra cuối"** trong khi thanh tiến trình portal đang ở "BƯỚC 5 Lưu kết quả". | body portal sau "Hoàn tất bài học" | Đổi nhãn step của exit-ticket theo tiến trình thật. |
| h | **P2** | Mục 6 (extend) **nhận cả nộp rỗng** — bấm "Gửi liên hệ" không nhập gì vẫn thông "đã được ghi nhận" và mở cổng tiếp. | click "Gửi liên hệ" trên ô trống → mở gate | Yêu cầu nhập ≥1 ký tự trước khi mở cổng (hoặc bỏ bắt buộc rõ ràng, đừng báo "đã ghi nhận"). |
| j | **Info** | GET `/api/adaptive-progress` trả 400 mọi shape thử qua query — đọc ngược profile chưa được (không chặn; POST + localStorage đã đủ by chứng lưu). | fetch GET → `Invalid adaptive profile lookup` | Đọc shape gọi GET đúng trong module client rồi bổ sung chỉ tốt; mức ưu tiên thấp. |

- Ghi chú không phải lỗi: `lesson.olympia` không có trong data (pack build runtime) — đúng thiết kế.
- Các finding b/c/d/g/h xuất hiện **cả 3 tuyến** → cùng gốc builder trong `deweyAssets-*js`; fix một chỗ là sạch mọi bài.

## Kế hoạch fix tập trung (đề xuất trình thầy)

1. **Hàng P0** (đỉnh trước khi dựng tiếp 10 bài): (b) ẩn đáp án khỏi DOM; (f) resume + checkpoint status.
2. **Hàng P1:** (e) chốt số phận `practiceTasks`; (i) render (hoặc bỏ) quickCheck.
3. **Hàng P2 (cosmetic/UX):** (g) đánh số h2; (c) tiêu đề step; (d) nhãn exit-ticket; (h) chặn nộp rỗng extend.
4. Sau khi fix P0/P1: QA regression nhanh 1 phiên challenge + smoke 2 route còn lại rồi mới dựng tiếp Tuần 11.

## Nhật trình (mốc chính của đợt QA)

- Phiên 901 (challenge): đi trọn 7 mục → pack 3 tab chấm đúng → extend → tổng kết 35đ → exit-ticket → POST `ok:true` (progressId `24YyULmWgBOM6HZCfJ56RN5tiet2_adaptive-1792819244998_10A1-901`).
- Phiên 902 (foundation): nộp 1/5 → "Tuyến Cơ bản"; TOC/units/5 sim đủ; MathJax 376 (rút gọn); gate unit 1 mở; 0 console error.
- Phiên 903 (standard): nộp 3/5 (A,C,B,A,A) → "Tuyến Chuẩn"; TOC/units đủ; MathJax 752; 0 console error.
- Xác minh lại finding (b) trên phiên 903 **trước khi nộp**: card MC prac-1 đang mở chưa trả lời, input đúng đã mang `data-correct-option="true"` trong DOM (3 input còn lại null) — lộ đáp án là có thật, không phải ảnh hưởng sau nộp.
- Phát hiện dọc đường: đo "màn trống sau nộp" bằng innerText parent là sai (nội dung nằm trong iframe srcDoc) — bỏ 2 finding ảo này khỏi danh sách; TF per-ý đã code-verify là CÓ (bỏ finding cũ "TF chỉ tổng hợp").

## Nhật trình dựng 10 bài Tuần 11 (pipeline V8.8, DRAFT)

- Thầy duyệt "Dựng tiếp đi" 07:05Z → dựng 10 bài còn lại theo luồng **Pi** (pipeline V8.8 của `AdaptiveLessonBuilderPage-BVzpXomB.js`) chạy nền qua Blob module, AI gọi trực tiếp `/api/ai-relay` (ví web), save bằng `adaptiveLessonService.s` (tự ép `portalEnabled:false` cho draft), verify đọc ngược từng bài.
- Nguồn nội dung mỗi bài = giáo án thật trong `lessonPlans/{planId}` (đã có sẵn, 23–31k ký tự/bài); nhãn `Tệp tải lên: giao-an-<slug>.txt` + `week: "Dạy thử"` cho nhất quán với 5 bài cũ.
- **Bài #1 OK 07:18Z** — "Các số đặc trưng đo xu thế trung tâm — Tiết 1" (lớp 10) → `adaptive-1792826324771`, 5 units × 3 routes, 16 lệnh AI (~87k in / 139k out chars), 1 warning TikZ unit 2 (Kroki 400, fallback mô phỏng/chữ), saved + verified (draft, portalEnabled=false) sau khi inspect shape khớp vt3.
- **Bài #2 OK 07:31Z** — "Số gần đúng và sai số — Tiết 1" (lớp 10) → `adaptive-1792827090625`, 6 units, 22 lệnh AI, 0 warning (4 lần TikZ lỗi đều được AI tự sửa xong), saved + verified.
- **Gián đoạn 07:57–08:25Z** — server opencode restart làm built-in browser tái tạo context mới: mất session đăng nhập + toàn bộ queue state; bài #5 đang dở (mất ~2 lệnh AI, chưa save gì). Phục hồi: mở tab mới trong **Chrome 9222 của thầy** (profile còn session đăng nhập congapro60@gmail.com), dựng lại Blob module `Pi` + queue, verify ngược 4 bài cũ đều draft/portalEnabled=false trong Firestore, chạy lại từ bài #5 trong Chrome thầy (tab `/lesson-gen`, id `EDF828555E9C0290CB50F738E742E49E`).
- **Bài #3 OK 07:43Z** — "Hai mặt phẳng song song — Tiết 2" (lớp 11) → `adaptive-1792827844375`, 5 units, 0 warning, saved + verified.
- **Bài #4 OK 07:54Z** — "Hai mặt phẳng song song — Tiết 3" (lớp 11) → `adaptive-1792828475281`, 4 units, 1 warning TikZ, saved + verified.
- Lưu ý chi phí: relstats bị reset khi restart (đo lại từ 0, 4 bài trước mất đo per-call); bài #5 tính chi phí gần đủ 2 lần do chạy lại từ đầu.
- **Bài #5 OK 08:40Z** — "Các số đặc trưng đo xu thế trung tâm — Tiết 1" (lớp 11) → `adaptive-1792831154099`, 5 units, 1 warning TikZ, saved + verified (phục hồi xong sau gián đoạn, chạy trong Chrome thầy).
- **Bài #6 OK 08:48Z** — "Mẫu số liệu ghép nhóm — Tiết 1" (lớp 11) → `adaptive-1792831747929`, 4 units, 0 warning, saved + verified — **xong trọn lớp 11 (5/5 bài)**.
- **Bài #7 OK 09:02Z** — "Nguyên hàm — Tiết 2" (lớp 12) → `adaptive-1792832396461`, 6 units, 0 warning, saved + verified.
- **Bài #8 OK 09:09Z** — "Khoảng biến thiên, tứ phân vị, độ lệch chuẩn — Tiết 1" (lớp 12) → `adaptive-1792833009074`, 5 units, 0 warning, saved + verified.
- **Bài #9 OK 09:19Z** — "Luyện tập: Khoảng biến thiên, tứ phân vị, độ lệch chuẩn — Tiết 2" (lớp 12) → `adaptive-1792833650874`, 5 units, 2 warnings, saved + verified.
- **Bài #10 OK 10:20Z** — "Phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm — Tiết 1" (lớp 12) → `adaptive-1792834706906`, 4 units, 2 warnings, saved + verified — **HOÀN TẤT 10/10**.
- **Verify ngược 10/10 (10:26Z)** — đọc lại toàn bộ từ Firestore qua `svc.l(teacherId)`: `allOk: true` — mỗi bài `status: draft`, `portalEnabled: false`, 4–6 units, mọi unit đủ 3 routes, warnings 0–2 (đều là TikZ fallback an toàn). Tổng chi phí đo từ sau restart (bài #5 chạy lại → #10): 90 lệnh AI, ~508k chars in / ~781k chars out. Tab `/lesson-gen` trong Chrome thầy đã đóng sau khi xong.

## Nhật trình xuất bản production + QA portal 10 bài (10:26–10:40Z)

- Thầy ra lệnh xuất bản + QA portal V8.8 từng bài, đồng thời fix P0.
- **Publish 10/10 (10:26–10:28Z)** — chạy trong Chrome 9222 (tab `/lesson-gen` id `B4012C3A7B73B56ED0CBB00B77367EC4`) qua `adaptiveLessonService.s({...doc, status:'published'})`; converter tự set `portalEnabled:true`. Verify đọc ngược từng bài: `allPublished: true` — units nguyên vẹn, title đúng.
- **QA portal smoke 10/10 (10:28–10:37Z)** — CDP mở tab portal mới `/adaptive-portal/{id}` cho từng bài, snapshot DOM + exception + console error rồi đóng tab. Kết quả 10/10 pass: "CỔNG HỌC SINH" + nút bắt đầu render đủ, 0 exception, 0 console error. Bài #4 (`adaptive-1792828475281`) render chậm ~20s (tải dữ liệu, không phải lỗi app) — re-test riêng đạt.
- Tab portal #1 (`adaptive-1792826324771`, id `3773E170A393D22D17D529AEFB436BCF`) **mở sẵn cho thầy bấm thử**.
- 10 URL portal: `https://giaoandewey.vercel.app/adaptive-portal/adaptive-1792826324771` … `adaptive-1792834706906` (thay đuôi id từng bài).

## Nhật trình FIX P0 (b) + (f) — 18:15–19:10 (code mới, CHƯA deploy)

- **(b) Lộ đáp án qua DOM — đã vá 3 kênh rò rỉ:**
  - `template.ts`: xóa `data-correct-option`, `data-correct`, `data-tolerance`, `data-correct-index`, `data-explanation`, `data-statement-correct`, `data-grade-problem/solution/rubric`; các div ẩn chứa lời giải (`.solution-box`, `.essay-hints`, `.essay-answers`) giờ rỗng — engine điền text tại thời điểm mở cho HS; bỏ dead div `.pretest-explanation`.
  - `htmlShell.ts`: **xóa `<script id="dewey-content" type="application/json">`** — trước đây nhúng TOÀN BỘ content (gồm đáp án/solution/essay answers) thành JSON trong DOM, không ai đọc → rò rỉ lớn nhất. Xóa luôn `escapeJsonForHtml` (mồ côi).
  - `adaptiveEngine.ts`: thêm `buildDeweyAnswerKey()` — gom đáp án (MC/TF/short/essay/solution/pretest + problem/solution chấm ảnh AI) thành map, nhúng vào closure `ANSWER_KEY` trong IIFE engine (không quét DOM được). Chấm: pretest theo `data-qid`, MC `key.correct`, TF từng ý `key.statements[i]`, SA `key.correct ± key.tolerance`.
  - Tradeoff đã trình thầy: mở tab Sources vẫn đọc được `ANSWER_KEY` — chỉ chặn F12 Elements, không chặn tuyệt đối (chấm client-side bắt buộc).
- **(f) Checkpoint resume — trong engine:**
  - Key `dewey-ckpt-v1-{lessonId}-{mãHS}` (cùng kênh localStorage vở ghi; key theo mã HS — máy phòng chung không dính nhau), lưu mỗi lần: chuyển màn, nộp pretest, chấm đúng/sai 4 tầng, essay tự chấm, xong unit, đóng gói, gửi vận dụng.
  - State: `{score, totalSeconds (đồng hồ còn lại), activeScreenId, pretestDone, completedUnitIds, completedPacks, wrongCounts, answered}`.
  - Boot: restore điểm + mở đúng màn dở dang; câu đã chấm → ẩn card + mở solution/next; gói đủ câu → hoàn thành luôn; chấm lại câu cũ → **không cộng điểm lần 2** (guard `answered`).
  - `finishLesson()` xóa checkpoint — phiên sau chạy từ đầu; lưu kết quả cuối vẫn do portal POST (`/api/adaptive-progress`) như cũ.
- **Kiểm chứng:**
  - `npm run build`: **0 TS error** (pass, 5m33s).
  - Vitest `src/lib/dewey`: **6/6 pass** — 4 test chống lộ đáp án (không attr / không JSON blob / solutions không nằm trong body / ANSWER_KEY nằm đúng chỗ) + 1 test `node --check` cú pháp engine script sinh ra.
  - **QA runtime Chrome CDP** (file demo dựng từ code mới): leak 0 attr + 0 solution tĩnh; MC 0→10đ; TF 4 ý đúng ("✓ Đúng/✗ Sai" theo key) +20đ; SA +30đ; solution/next chỉ điền khi mở; checkpoint `{score:60, activeScreenId:'screen-engage', answered:3}` → reload → restore đúng điểm/màn, TF card ẩn, chấm lại **không cộng thêm**; 0 exception suốt phiên.
- **Còn lại:** deploy cần thầy duyệt push main; 10 bài Tuần 11 trên production vẫn chạy bản cũ (có leak) cho tới khi deploy xong.

