# Spec V27 — Chuẩn THPTQG cho nhiệm vụ Toán (đúng/sai + trả lời ngắn 4 ký tự)

Ngày: 2026-10-23 · Trạng thái: Đã duyệt (user chọn "Nội dung trước (Recommended)" + "Chốt — làm theo thiết kế")
Nhánh: `codex/universal-content-release` (worktree `C:\Users\ADMIN\.codex\worktrees\universal-content-release`, HEAD `e44e035`)

## 1. Mục tiêu

Đưa hệ thống nhiệm vụ trong bài soạn về chuẩn đề thi THPTQG môn Toán 2025:

1. **Đúng/sai (4 phát biểu)**: thang điểm thật `0 / 0,1 / 0,25 / 0,5 / 1` theo số ý trúng — học sinh thấy ✓/✗ từng phát biểu và điểm một phần; **ngưỡng mở cổng game vẫn yêu cầu đủ 4 ý** (`ok` nhị phân giữ nguyên).
2. **Trả lời ngắn 4 ký tự dạng thập phân** (`decimal_4`): 4 ô, ô đầu nhận `[-\d]`, ô sau `[\d,]`, tối đa 1 dấu phẩy, dấu phẩy không ở ô đầu, so sánh tương đương `.` ↔ `,`.
3. **Bộ soạn AI sinh đủ 4 dạng** (trắc nghiệm, đúng/sai, trả lời ngắn, tự luận) + nhiệm vụ hình học bắt buộc kèm minh họa (`image` / `diagramUrl`).
4. **Điểm thưởng mini-game nhân ratio** (class-events), phần còn lại của luật game giữ nguyên hành vi nhị phân.

## 2. Nhận định của Code (đã điều tra)

- `lib/lesson/schema.js` — `CHECKER_REGISTRY.true_false_4` (127-134) đã trả `{ok, perItem}` nhưng **chưa có `ratio`**; `short_answer_4` (136-144) qua `shortAnswerFormat` (whitelist `digits|signed_digits|alphanumeric`) + `normalizeShortAnswerVector` (99-107) — chưa có dạng thập phân.
- `lib/exam/scoring.js:13` có `TF_RATIO = [0, 0.1, 0.25, 0.5, 1]` (tham chiếu chuẩn — **không sửa**).
- Nhiều nơi tiêu thụ `.ok` nhị phân (`runtime.js` SUBMIT/GROUP_SUBMIT, `class-events.js:168`, `mode-bridge.js:196`, `arena-bridge.js:72`) — **giữ nguyên hành vi**; chỉ thêm dữ liệu phụ (`ratio`, `perItem`).
- `components/lesson/TaskInput.tsx` đã nhận prop `submission` (`app/shared/page.tsx:58`) → hiển thị ✓/✗ + điểm một phần **không cần plumbing mới**; arena (`app/play/page.tsx:439/1276`) không truyền submission — giữ nguyên.
- `lib/lesson/class-events.js:169-172` — điểm tug/boss… = base điểm × nhị phân; surf = 10×streak × nhị phân → nhân ratio.
- Reward ledger runtime (`runtime.js:1295-1300`, `rewardPolicy.individualCorrect`) **giữ nhị phân** theo thiết kế.
- **Catalogue**: `content/lessons/hki-2026-g11.json` — 133 entry (~566 nhiệm vụ), 100% `numeric_exact`, 0 minh họa, ~35 entry hình học. Nguyên nhân gốc: prompt bộ soạn (`lib/lesson/generation-provider.js:68`) chỉ liệt kê `numeric_exact`/`choice_exact`/`open`/`reflection`.
- Validate: `image`/`diagramUrl` là key cho phép trên task/hint (validate.js:105,143) và không có ràng buộc định dạng URL → dùng data-URI SVG inline được.
- `contentHash` được tính lại qua `hashPackage` (`lib/lesson/content-map.js:117`, `practice-variants.js:7`) — patch nội dung phải lưu ý nhất quán hash.

## 3. Thiết kế

### 3.1 Engine — thang điểm đúng/sai

- Thêm `TF_RATIO = [0, 0.1, 0.25, 0.5, 1]` (export, freeze) trong `schema.js`, khớp `lib/exam/scoring.js:13`.
- `true_false_4` trả thêm `ratio: TF_RATIO[số ý trúng]`; `ok` vẫn `perItem.every(Boolean)`.
- Helper thuần `verdictMeta(checkRes, isCorrect)` → `{ratio, perItem}` tại `schema.js`; runtime SUBMIT/GROUP_SUBMIT chỉ gọi helper và lưu thêm `ratio`/`perItem` vào `subRecord` / `groupProducts` — các consumer `.ok` khác không đổi.

### 3.2 Engine — `decimal_4` cho trả lời ngắn

- `shortAnswerFormat`: thêm `decimal_4` vào whitelist.
- `normalizeShortAnswerVector` (schema.js) + `validShortAnswerVector` (validate.js:189) thêm nhánh `decimal_4`:
  - 4 ô, mỗi ô 1 ký tự; ô đầu `[-\d]`; ô 2-4 `[\d,]`; tối đa 1 dấu phẩy; trước dấu phẩy phải là chữ số; chuẩn hóa `.` → `,` trước khi so sánh.
- `short_answer_4` checker giữ nguyên (normalize lo phần còn lại).

### 3.3 Điểm mini-game × ratio

- `class-events.js` `answerClassEvent`: điểm = `Math.round(base × ratio)` (tug/boss/...); surf = `Math.round(10 × streak × ratio)`. Trạng thái đúng/sai (`correct`, cooldown, streak, tiến độ) giữ nguyên nhị phân. Nhánh `estimate` (numeric) không đổi.

### 3.4 UI (`TaskInput.tsx` + CSS)

- Kiểu `format` thêm `"decimal_4"`; interface `submission` thêm `ratio?: number; perItem?: boolean[]`.
- Đúng/sai: sau khi có kết quả, hiển thị ✓/✗ từng phát biểu + chip "Điểm ý" (đọc từ prop `submission` — chỉ trang bài học truyền).
- Trả lời ngắn `decimal_4`: bàn phím phụ 12 phím (0-9, `,`, `-`) điền vào ô trống đầu tiên + dòng trợ giúp; `inputMode` vẫn `numeric`.

### 3.5 Bộ soạn AI

- `lib/lesson/generation-provider.js` dòng 68: hướng dẫn sinh đủ 4 dạng (kèm quy cách answerKey `true_false_4` = mảng 4 boolean; `short_answer_4` format `decimal_4` = 4 ký tự) + bắt buộc `image`/`diagramUrl` cho nhiệm vụ hình học.

### 3.6 Nội dung catalogue (pilot)

- 3 entry đại diện patched bằng script `scripts/thptqg-v27-pilot.mjs` (không sửa tay JSON 5MB): `r013` (lượng giác — đại số), `r028` (hình chóp/tứ diện — hình học có minh họa SVG data-URI), `r108` (hai mặt phẳng song song — bài đang dùng demo/QA).
- Mỗi entry thêm 3 nhiệm vụ mới vào activity `formation` đầu tiên (giữ nguyên nhiệm vụ cũ — đảm bảo event `estimate` vẫn có `numeric_exact`): 1 trắc nghiệm, 1 đúng/sai, 1 trả lời ngắn `decimal_4`.
- Phần catalogue còn lại: migrate sau bằng chính prompt mới (V28+), gắn với dạng nối cột/điền khuyết.

## 4. Range không đụng

- `lib/exam/**` (module thi online đã đúng thang TF 2025).
- `tasks/todo.md` của track khác (vilao/Gemini).
- Hành vi nhị phân của `.ok` tại arena, mode-bridge, ngưỡng mở cổng, reward ledger.
- Phòng demo 7E42C2 (chờ GV đăng nhập lại rồi mới dọn).

## 5. Kiểm chứng chấp nhận

1. Test mới `tests/lesson-thptqg-v27.test.mjs`: ratio chuẩn, `decimal_4` tương đương chấm↔phẩy + luật vị trí, runtime lưu `ratio`/`perItem`, mini-game điểm một phần, UI keypad + ✓/✗, prompt có marker 4 dạng, nội dung pilot đủ 4 dạng + minh họa + `validateLessonPackage` pass.
2. `npm run test` (toàn bộ, trạng thái nền 1409/1409), `npm run typecheck`, `npm run build` — xanh.
3. Deploy v27 theo recipe codex exec (stdin UTF-8), audience `public`; kiểm bundle live.
4. QA live: phòng mới sau khi GV đăng nhập — HS trả lời phải thấy ✓/✗ từng phát biểu + điểm một phần; mini-game trao điểm một phần.
