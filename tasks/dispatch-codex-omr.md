# Decision Pack · bàn giao Codex — dò bóng tô bằng code (OMR) (22/10)

Bối cảnh: máy chấm (Gemini trong `api/grade-homework.ts`) đọc phiếu trắc nghiệm GV chấm tay NHẦM **3/7 bóng** — nó lấy **nét đỏ của GV** làm bóng tô của HS (đo thật 22/10 trên bài Tuấn Nam, chi tiết đo zoom ở `HANDOFF.md` mục "ĐO TỈ LỆ ĐỌC BÓNG TÔ"). Chủ dự án đã duyệt hướng sửa: **không hỏi AI đọc bóng — tự dò bằng code ở trình duyệt**. Đọc `HANDOFF.md` mục đó trước khi làm.

Repo: worktree nhánh `feat/nop-bai-da-cham` (nội dung chính của dự án, node_modules sẵn có). **KHÔNG tạo nhánh, KHÔNG `git switch`, KHÔNG commit** — chỉ sửa file + chạy cổng kiểm; supervisor sẽ commit sau khi duyệt.

## Việc
1. `src/utils/imageCompress.ts`: thêm hàm phỏng đoán đáp án trên canvas sau khi nén (File blob, KHÔNG base64 vòng lại main thread). **LƯU Ý QUAN TRỌNG — mẫu phiếu trong repo (`src/utils/answerSheetTemplate.ts`) KHÔNG khớp phiếu thật**: phiếu thật GV chụp không có 4 ô định vị góc, phần Đúng/Sai là ô tô (không viết chữ) — xem 4 file mẫu thật trong `tasks/omr-sample/` (`bai-tuan-nam.jpg`: bản gốc 1200×1600; `phan-I-trai.jpg`, `phan-I-phai.jpg`: zoom vùng câu 1–20; `phan-II.jpg`: zoom vùng Đúng/Sai). Vì vậy: BỎ giả định "4 ô vuông đen định vị"; khoá toạ độ theo **cột số thứ tự câu** (trái) và các **vị trí ô A/B/C/D căn giữa theo hàng**, chịu nghiêng nhẹ (scan từng hàng theo cột số, không dùng toạ độ tuyệt đối); **bỏ qua pixel đỏ** (nét chấm của GV), đếm tỉ lệ xám trong từng ô → trả `{questionNo, answer, confidence}`. Xác nhận trên ảnh mẫu trước khi viết code chính: `bai-tuan-nam.jpg` — đáp án thật đọc tay của supervisor (chuẩn đối chiếu): câu 1=A, 2=C, 3=B, 4=A, 5=B, 11=B, 12=C; nét đỏ không phải bóng tô (câu 3/5/11 có ✓ đỏ ở ô D — dễ nhầm nhất).
2. Nộp bài: client gửi kèm `detectedAnswers` (qua `src/lib/classroom/submissionService.ts` → `api/_submission-actors.ts` → `api/grade-homework.ts`). Phần trắc nghiệm ưu tiên `detectedAnswers`; AI chỉ chấm phần tự luận + đối chiếu. Khi độ tin cậy thấp hoặc không dò được → chấm theo cách cũ và gắn cờ "máy dò bóng không chắc — GV kiểm tra lại phần trắc nghiệm" hiển thị cho GV (dùng pattern cờ có sẵn trong `grade`, không thêm vòng xác nhận mới).
3. Test: unit cho hàm dò (không phụ thuộc JPEG thật — sinh `ImageData` lưới tổng hợp trong test), + test api nhận `detectedAnswers` (api/__tests__ theo mẫu `grade-homework.variants.test.ts`). Với ảnh mẫu thật: node không có canvas — dùng Chrome debug đang mở sẵn ở `http://127.0.0.1:9222` (nếu không kết nối được thì chạy `Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--remote-debugging-port=9222','--user-data-dir='+$env:TEMP+'\chrome-smartplan-session' --no-first-run` rồi chờ kết nối; página blank + Image + canvas tự nạp `tasks/omr-sample/bai-tuan-nam.jpg` qua data URL), in kết quả từng câu ra output; ≥6/7 câu khớp chuẩn phía trên coi như đạt — dán evidence vào `tasks/todo.md`.

## Cổng bắt buộc xanh
`npm run test` (đang 3373/3374; test flaky duy nhất `src/lib/adaptive/adaptiveToDewey.test.ts` chạy riêng được thì phải đạt), `npm run lint`, `npm run lint:api`, `npm run build` (exit 0), test `function-count` (≤12).

## Ranh giới cứng
- CHỈ sửa: `src/utils/imageCompress.ts`, `src/lib/classroom/submissionService.ts`, `src/components/features/classroom/ActorSubmissionUpload.tsx` (nếu cần), `api/grade-homework.ts` + `api/_submission-actors.ts` (nếu cần), test tương ứng, `tasks/todo.md`. Ngoài danh sách = dừng và báo.
- KHÔNG thêm file `api/` mới (Vercel đang 11/12 function — mọi logic api phải nằm trong dispatcher có sẵn). KHÔNG thêm dependency — chỉ canvas + code thuần. KHÔNG đụng `api/_assistant-confirmations.ts`.
- **KHÔNG commit**, KHÔNG push, KHÔNG merge main (supervisor commit sau khi duyệt).
- Thực tế khác mô tả (lưới phiếu không dò được ở ảnh nén, v.v.) → dừng, ghi `blocked` + bằng chứng vào `tasks/todo.md`, không tự chế phương án khác.

## Cập nhật supervisor sau vòng 2 (22/10) — CHỈNH LỆNH
- Bằng chứng vòng 2 ĐÃ ĐÁT chuẩn supervisor đặt (tất cả số liệu có trong `tasks/todo.md`): **6/7 câu chuẩn khớp chắc** (Q1=A, Q2=C, Q3=B, Q5=B, Q11=B, Q12=C — riêng Q3 là nơi AI từng đọc nhầm nét đỏ), Q4 không đủ bóng xám → đúng trường hợp "không chắc + cờ". Nguyên lý dò (loại pixel đỏ trước, đếm xám trong vòng tròn ô) ĐÃ ĐƯỢC CONNG NHẬN — không làm lại chủ đề này.
- **Việc còn lại là kỹ thuật bình thường, KHÔNG phải "tự chế"**: điều 19 chỉ cấm BÁO ĐẠT khi chưa chạy cổng, không cấm lặp dò lưới. Tiếp tục, với các quy tắc lưới cụ thể:
  1. Lọc nhóm: chỉ giữ nhóm có bước ngang ô ≈ 47–50 px (đã đo gap 47–48,5), bước dọc hàng ≈ 23–25 px trong cùng khối; loại nhóm tựa ở "vùng đề" đầu trang (khối 10 hàng nhưng tại vùng y gấp < 25% chiều cao, hoặc bước ngang ≠ chuẩn).
  2. Thiếu hàng: trong khối đã phát hiện ≥ 6/10 hàng theo cấp số cộng (pitch dọc nhất quán) → nad últimas 2 hàng bằng nội suy theo pitch (hàng trống = ô chưa tô, hợp lệ).
  3. Đánh số câu: mỗi khối 10 hàng sắp theo y; các khối nối câu (cột phải bắt đầu ở câu 11 trên phiếu này nếu cột trái là 1–10 — đói ảnh mẫu để quyết, đừng đoán).
  4. Hàng trống/toàn ô grey dưới ngưỡng → trả `null` (không trả 'A'); ô có ratio 0,3–0,5 hoặc mean màu trung gian (dấu đỏ chồng) → `confidence` thấp + cờ. Câu hỏi thứ tự: chỉ nhận khi có ≥ 1 ô ratio ≥ 0,8 — không phải ngưỡng tuyệt đối, hãy chọn theo dữ liệu mẫu rồi ghi lí do.
- Script dò ở `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-probe.mjs` đã lưu — chép vào `tasks/omr-sample/probe.mjs` để bị mất khi dọn temp (chưa commit; supervisor quyết giữ gì sau).

## Trả lại
`tasks/todo.md` mục mới "OMR dò bóng tô — trạng thái", từng check + bằng chứng (kèm ảnh test đầu vào/đầu ra nếu có). Ý tưởng ngoài phạm vi ghi mục **"New proposals"** — mặc định không làm.

`tasks/todo.md` mục mới "OMR dò bóng tô — trạng thái", từng check + bằng chứng (kèm ảnh test đầu vào/đầu ra nếu có). Ý tưởng ngoài phạm vi ghi mục **"New proposals"** — mặc định không làm.
