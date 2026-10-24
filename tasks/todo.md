# TODO — 22/10/2026: thoát phụ thuộc Gemini trả phí cho webapp

<<<<<<< HEAD
## OMR dò bóng tô — trạng thái

### Vòng 3 — thực hiện lệnh supervisor 22/10/2026

- [x] Nhận chuẩn nguyên lý 6/7 của vòng 2; không mở lại kết luận đã duyệt. Không commit/switch.
- [x] Khóa nhóm theo bước ngang/dọc, nội suy đủ 10 hàng, hàng trống trả null; kiểm ảnh nén Chrome 9222.
- [ ] Nối detectedAnswers vào luồng nộp và chấm; kiểm dữ liệu đầu vào, ưu tiên câu chắc, cờ GV khi không chắc.
- [ ] Unit synthetic + API + kiểm ảnh thật; ghi kết quả từng câu.
- [ ] Full test, lint, lint:api, build, function-count ≤12; ghi exit code và giới hạn.

Phạm vi: đúng pack; script probe được phép lưu tại `tasks/omr-sample/probe.mjs` theo chỉnh lệnh. Các thay đổi có sẵn giữ nguyên.

#### Bằng chứng vòng 3

- `node tasks/omr-sample/probe.mjs`: exit 0, Chrome `http://127.0.0.1:9222`, ảnh gốc `tasks/omr-sample/bai-tuan-nam.jpg`, canvas 1152×1536, JPEG 0,82. Chạy chính hàm production, không dùng bản thuật toán riêng của probe. `filePathMatches: true`: hàm nhận File blob trả giống hàm ImageData.
- Kết quả đủ 40 hàng, không trượt số khi mất component Q8/Q9: Q1=A, Q2=C, Q3=B, Q4=null, Q5=B, Q6=D, Q7=C, Q8=C, Q9=D, Q10=C, Q11=B, Q12=C; Q13–Q40=null. Mọi đáp án khác null confidence=0,95; null confidence=0. Chuẩn 7 câu: 6/7 khớp chắc, Q4 giữ không chắc đúng lệnh.
- Đối chiếu ảnh gốc: khối trái in 1–10, khối kế in 11–20, tiếp 21–30 và 31–40. Không dùng bốn góc định vị; lưới lấy từ các vòng ô cùng hàng, thứ tự khối theo x. Chỉ hỗ trợ mẫu 4×10 A–D này; Phần II/III không tự đoán.
- Bộ lọc bước ngang 46–51 px tại rộng 1152 (dung sai quanh mẫu đo 47–48,5); pitch dọc 23–25 px. Loại vùng y<25% chiều cao; yêu cầu bốn khối đồng hàng, mỗi khối ≥6/10 hàng. Pitch lấy median khoảng cách đã chia bội; nội suy hàng giữa/hai hàng cuối; không nối hàng theo chỉ số component.
- Ngưỡng tối 130 và bỏ đỏ giữ nguyên chứng cứ vòng 2: tỷ lệ ≥0,8 và cách bóng thứ hai >0,35 mới confidence=0,95. Tỷ lệ 0,3–0,8 trả ứng viên confidence=0; dưới 0,3 trả null, không đoán A. Mẫu Q4 ~0,097 không được nhận; sáu câu chuẩn còn lại ~0,95–1 được nhận.
- Synthetic mới: 5/5 đạt (bỏ đỏ, ô trắng, khối 10 hàng, thiếu bốn hàng gồm hai hàng cuối, nghiêng nhẹ, nhiều bóng, bóng mờ, vùng đầu trang, gap sai, thiếu quá nhiều hàng). Client mới: 2/2 đạt (gửi File và detectedAnswers; không dò được gửi []). Bộ test nén/UI hiện hữu đã chạy đạt.
- Bổ sung test File lỗi/không có ảnh: synthetic + fallback hiện 6/6 đạt. Probe chạy lại sau giới hạn canvas tối đa 1536 vẫn exit 0, `filePathMatches=true`; output lưu `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-round3-chrome.json`. Chrome cũ đóng giữa phiên gây ECONNREFUSED một lần; đã mở profile QA riêng bằng port 9222 đúng pack rồi kiểm lại đạt, không ghi dữ liệu lớp thật.
- Full test lần đầu timeout harness 120 giây, không coi đạt. Chạy lại `npm run test -- --maxWorkers=2`: exit 0, **322 files / 3381 tests đạt**, 223,78 giây; log `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-round3-tests.log`. Đây là snapshot trước khi API worker chốt test mới; sẽ chạy lại gate cuối.

#### New proposals — vòng 3

Không triển khai ngoài phạm vi. Hỗ trợ mẫu phiếu khác/Phần II–III hoặc OCR chữ số cần pack riêng; hiện dùng fallback và cảnh báo GV.

### Tiếp tục theo pack cập nhật — 22/10/2026

**Trạng thái hiện tại: blocked ở bước xác nhận lưới; chưa triển khai production.** Đây là giới hạn của phép dò thử, KHÔNG phải kết luận phiếu thật không dò được. Trạng thái thiếu mẫu bên dưới chỉ là lịch sử, không còn áp dụng.

- [x] Đọc lại pack, trạng thái cũ, HANDOFF và lessons; giữ nguyên thay đổi có sẵn trong `tasks/todo.md`.
- [x] Đã có bốn ảnh thật trong `tasks/omr-sample/`; không còn blocker thiếu ảnh. Không dùng giả định bốn góc của lượt trước.
- [x] Kiểm canvas Chrome trên ảnh nén 1152×1536, JPEG 0,82, qua `http://127.0.0.1:9222`; ảnh đầu vào `tasks/omr-sample/bai-tuan-nam.jpg` (1200×1600). Không dùng bốn ô định vị.
- [ ] Nghiệm thu lưới: phép dò thử nhận 8/10 hàng ở khối trái, mất Q8/Q9; chưa nhận dạng/khóa số câu theo cột số thứ tự như pack. Không coi phép thử là hàm OMR hoàn chỉnh dù sáu câu mẫu có bóng rõ khớp chuẩn.
- [ ] Test tổng hợp trước; dò theo hàng/cột, bỏ nét đỏ, confidence thấp khi thiếu hoặc nhiều bóng.
- [ ] Nối `detectedAnswers` qua luồng nộp hiện hữu, kiểm dữ liệu ở server, ưu tiên đáp án chắc và giữ cờ GV kiểm tra khi fallback.
- [ ] Chạy test toàn bộ, flaky riêng nếu cần, lint, lint:api, build và function-count; ghi bằng chứng cuối.

Rủi ro chính: nhầm vùng mã dự thi với câu trả lời, nhầm bóng trắng có chữ in với bóng tô. Cần xác nhận lưới và độ tương phản cục bộ, không chỉ đếm pixel tối tuyệt đối. Phạm vi thay đổi giữ đúng pack; không thêm dependency/API function hoặc vòng xác nhận.

#### Bằng chứng Chrome

| Câu | Chuẩn supervisor | Dò thử | Confidence thử | Tỉ lệ tối ô chọn sau bỏ đỏ |
| --- | --- | --- | --- | --- |
| 1 | A | A | 0,95 | 0,991 |
| 2 | C | C | 0,95 | 1,000 |
| 3 | B | B | 0,95 | 1,000 |
| 4 | A | A nhưng không chắc | 0 | 0,097 |
| 5 | B | B | 0,95 | 1,000 |
| 11 | B | B | 0,95 | 0,950 |
| 12 | C | C | 0,95 | 1,000 |

- Sáu kết quả chắc khớp 6/7; Q4 chọn A chỉ vì có tín hiệu cao nhất rất yếu, KHÔNG chứng minh bóng A. Không bác đáp án chuẩn supervisor, không kết luận Q4 chỉ có nét đỏ.
- Dò thử connected components + nhóm bốn ô có khoảng cách tương tự; loại đỏ khi `r > g + 15 && r > b + 10`. Ngưỡng tối 170 thất bại: ô trắng nền xám cũng có tỉ lệ 0,938–0,982. Ngưỡng thử 130 tách được sáu bóng rõ; chưa kiểm bền vững ánh sáng/nghiêng/Phần II.
- Nhóm ô mã dự thi cũng tạo ứng viên 10 hàng ở `(802;147,5)` và `(823,5;147)` trên ảnh nén; bộ lọc bốn khối đồng hàng loại được trong mẫu này, nhưng chưa thay thế việc đọc cột số. Khối trái `(128;588,5)` chỉ còn tám hàng; khối câu 11 `(366,5;586,5)` đủ mười hàng.
- Script thử ngoài repo: `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-probe.mjs`; output từng câu: `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-probe-result.json`. Chạy lại tại worktree: `Get-Content "C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-probe.mjs" -Raw | node --input-type=module`. Data URL chỉ dùng nạp fixture trong trang blank; chưa đổi đường File blob của ứng dụng.
- Chỉ sửa checklist trong repo; không sửa source/test. Cổng test/lint/lint:api/build/function-count **chưa chạy**, không ghi PASS. Không tạo nhánh, switch, commit, push, merge hoặc sửa `_assistant-confirmations.ts`.

#### New proposals — chưa làm

- Tiếp tục nghiên cứu khóa hàng bằng cột số thực, không nhận số câu qua chỉ số khối hoặc tọa độ cố định. Cần supervisor duyệt tiếp sau blocker theo điều 19; không đề nghị thay mẫu phiếu hoặc thêm dependency.

### Lịch sử lượt trước — đã hết blocker thiếu mẫu

**Trạng thái: blocked — 22/10/2026.** Dừng theo `tasks/dispatch-codex-omr.md:19`: mẫu phiếu tìm thấy trong repo khác giả định của pack; chưa đủ căn cứ xác định lưới phiếu Tuấn Nam. Không tự chế lưới thay thế.

- [x] Đọc `HANDOFF.md`, mục “ĐO TỈ LỆ ĐỌC BÓNG TÔ”, trước Decision Pack; đọc `tasks/lessons.md`.
- [x] Kiểm tra Git ban đầu: `git status --short` chỉ có `?? tasks/dispatch-codex-omr.md`; không sửa file bàn giao này. Không tạo nhánh, switch, commit, push hoặc merge.
- [x] Kiểm tra mẫu phiếu hiện hữu: `src/utils/answerSheetTemplate.ts:1–227` sinh “Phiếu Trả Lời” nhưng không có bốn ô vuông định vị. Phần I (`:139–150`) hướng dẫn khoanh tròn A/B/C/D, xếp 40 câu bằng CSS grid bốn cột; phần II (`:154–189`) yêu cầu ghi chữ Đ/S vào ô bảng, không phải khối bóng tô Đúng/Sai như pack.
- [x] Tìm tài liệu/lưới OMR: tìm `OMR|fiducial|registration.mark|ô vuông đen|bóng tô|detectedAnswers` trong `*.ts`, `*.tsx`, `*.md` chỉ thấy HANDOFF và Decision Pack. Quét `**/*.{png,jpg,jpeg,webp,pdf}` trả bảy tệp, không có ảnh phiếu Tuấn Nam; `screenshot.png` là ảnh IDE, không phải phiếu. Chưa kiểm được phiếu thật sau nén 1536px; không kết luận phiếu thật thiếu ô định vị.
- [ ] Dò bóng trên canvas, bỏ pixel đỏ, chuẩn hoá theo bốn góc: bị chặn vì chưa có mẫu/lưới của phiếu đích. Sinh ảnh tổng hợp từ lưới tự đặt chỉ chứng minh thuật toán trên mẫu tự đặt, không chứng minh đúng phiếu đích.
- [ ] Truyền/kiểm tra `detectedAnswers`, ưu tiên đáp án đáng tin, cờ GV kiểm tra: chưa sửa; tránh đưa hợp đồng dữ liệu dở dang vào luồng chấm.
- [ ] Unit OMR + API: chưa viết/chạy; chưa có ảnh test đầu vào/đầu ra.
- [ ] `npm run test` toàn bộ; nếu flaky thì chạy riêng `src/lib/adaptive/adaptiveToDewey.test.ts`: chưa chạy do dừng trước triển khai; không ghi nhận PASS.
- [ ] `npm run lint`, `npm run lint:api`, `npm run build`, test `function-count` (≤12): chưa chạy do dừng trước triển khai; không ghi nhận PASS.

**Để tiếp tục:** supervisor cung cấp ảnh phiếu đích hoặc đặc tả lưới có vị trí bốn ô định vị, thứ tự câu/phần, vị trí A/B/C/D và Đúng/Sai. Nếu muốn hỗ trợ mẫu `answerSheetTemplate.ts` hiện hữu thì cần Decision Pack mới; file này ngoài danh sách được sửa.

### New proposals

Không triển khai đề xuất ngoài phạm vi. Không sửa mẫu phiếu, không thêm dependency/API function, không đổi cơ chế chấm hoặc quyền duyệt.

---

## Trạng thái: PORT LẠI LÊN MAIN THẬT + DEPLOY XONG ✅ (bản main 22/10)

Sau cuộc trước phát hiện nhánh `feat/vilao-failover-chain` nằm trên snapshot cũ (314+ commits sau `main`):
toàn bộ B1–B4 đã **PORT LẠI vào tip thật của `origin/main`** (`fd082fa`) trong worktree riêng
`C:\Users\ADMIN\Downloads\spai-main-port` (nhánh `feat/vilao-chain-r2`), rồi push + merge + deploy.

- Commit: `bbcfa76` (code 10 file) · `5c27c4a` + `abb1224` (HANDOFF + cắt archive ≤150 dòng) · `ffda46f` (fix mock test).
- `main`: `fd082fa..abb1224` (fast-forward) → Vercel production `giaoandewey` **Ready**; probe `/` 200, `/api/grade-homework` 401 (hành vi đúng khi chưa đăng nhập).
- Vercel env `GRADING_VILAO_API_KEY` đã set production (Sensitive/Secret) — chuỗi Vilao→Gemini sống ngay lần chấm tới.
- Verify trên cây sau rebase: build 1m53s ✅ · `lint`/`lint:api` tsc 0 lỗi ✅ · **FULL vitest 320 file / 3374/3374 PASS** ✅
- Đối chiếu mới trên main thật (khác bản snapshot): upstream có `callGeminiRaw`, `callUtilityVision` (model rẻ đọc mã đề — cố ý KHÔNG đưa vào chuỗi), **segment cache tiền tố** → chuỗi hỗ trợ đầy đủ segment (Vilao phẳng prefix+suffix); `grade-homework.ts` 14 call site đổi sang `callGradingVision` (giữ nguyên chữ ký apiKey vì `resolveExamCode` vẫn cần).
- Test sửa kèm: `correction-attempts` + `hand-marked-work` mock thêm `callGradingVision` dạng wrapper ánh xạ vị trí tham số (test đọc `mock.calls[0][4]`).
- Billing giữ nguyên 100%: `ensureGeminiKey`/`AiKeyRequiredError`/`setAiKeyOwner`/`onOwnKeyFailure` không đụng — chỉ lớp gọi model đổi.

## Bổ sung 23/10 (tối): test mở rộng ViLao chib — XONG ✅

Chi tiết số liệu: `ab_test\BAOCAO_VILAO_38.md` + mục 7 `BAO_CAO_AB_TEST.md`. Tóm tắt:

- 5 bài × 2 runs (10/10 OK, 56,18₫): Phần I chuẩn tuyệt đối 10/10; tổng lệch phần chấm đối chiếu **0,0 → 0,95** (hướng chặt hơn); prompt tham số hoá cấu trúc đúng số dòng 10/10; json phải parser khoan dung 10/10.
- `score ≠ Σdòng` ở mọi hãng/lane → code chấm lấy điểm = Σ(questionScores), bỏ field score của model.
- Nén ảnh 1280px: token **không giảm** (Google tự downscale khi tile hoá) — bỏ hướng này (10,95₫).
- Probe Google: Flex không có trên Developer API; key đang FREE TIER 20 req/ngày/model (cạn); hướng tiết kiệm chính chủ = `batchGenerateContent` −50%.
- Test dùng key cũ `SmartPlan-lane` (chờ thu hồi) — khi thu hồi, subscribe lane `gemini-3.8-flash` (chib) trên key Vilao mới của env Vercel để chain production hưởng giá này.

## Đợt 3 (23/10 đêm): chuyển production sang chib + 4 việc code chấm — XONG ✅

Chủ dự án duyệt cả 3: (1) privacy OK cho ảnh HS qua pool rẻ; (2) gộp patch `2f177ae` (thinking 0 + 16k + 2 luật prompt) + 4 việc code; (3) subscribe lane chib trên key Vilao mới. Đã làm trong worktree `wt-grader` (nhánh `feature/grader-thinking0-16k`):

- [x] **`api/_grading-core.ts`**: leg Vilao default `deepseek-v4.1-flash` → `gemini-3.8-flash` + gửi `reasoning_effort: 'none'` (ghim trong code; env `GRADING_VILAO_MODEL` vẫn đè được).
- [x] **Điểm = Σ(questionResults) khi dòng phủ thang** trong `coerceHomeworkGrade` — tổng maxScore các dòng ≈ maxScore bài thì cộng dòng, không tin field `score` (A/B 17/18 lượt bảng đủ thang, score lệch gần hết); dòng KHÔNG phủ thang (luồng định kì model chỉ đọc tổng điểm thầy ghi trên bài) thì giữ score — cùng nguyên tắc với `recomputeTotal` có sẵn. Tinh chỉnh này phát hiện nhờ full vitest lần đầu: 3 test "định kì nhiều mã đề" đỏ với Σ vô điều kiện.
- [x] **Guard hàng "Tổng kết" (`laHangTongKet`)**: loại pseudo-row model tự chèn khỏi bảng + khỏi Σ; câu thật tên "Phần 2 – Tổng hợp" không bị nhầm.
- [x] **Parser trailing comma** trong `parseJsonWithRecovery` (string-aware, kind `trailing_comma`) — lỗi model hay mắc nhất trên JSON dài.
- [x] Tests: variants fixture + 5 test gradingPrompt cập nhật theo chính sách có guard; targeted **161/161 PASS** (jsonRepair 25 + gradingPrompt 115 + variants 21).
- [x] **Subscribe key mới `SmartPlan-lane2` (7c40c3fd, sk-1723…) vào chib → 201**; verify `GET /v1/models` thấy `gemini-3.8-flash`. Việc này làm trước cả khi thu hồi key cũ → chain production đã sẵn sàng.
- [x] HANDOFF.md thêm mục 23/10.
- [ ] **Pre-existing, ngoài phạm vi**: `api/__tests__/student-adaptive.test.ts` fail từ `2f177ae` thuần (chứng minh bằng git stash chạy lại) — handler trả thêm field `closed` trong payload listing mà test chưa cập nhật. Cần quyết riêng: cập nhật test hoặc bỏ field.

Còn lại của đợt: commit + push feature → fast-forward `main` → push origin → Vercel deploy → verify. Báo cáo QA cho Claude viết sau deploy.

## Việc còn đợi chủ dự án
- [x] **Key Vilao cũ "SmartPlan-lane" (`sk-a3ee…b034`): GIỮ LẠI** theo quyết định 24/10 của chủ dự án — dành cho OpenCode tooling sau này; production chỉ dùng `SmartPlan-lane2` (env Vercel).
- [ ] Canary thật: GV chấm 1 bài thật trong app → log Vercel phải thấy `[grading-chain] vilao/...` đứng đầu.
- [ ] Xoá project rác trên Vercel `spai-main-port` (link nhầm đã tạo; `vercel project rm` cần interactive, chưa xoá được máy chủ từ chối `--yes`).
- [ ] Nháp cũ: xoá/forgotten branch `feat/vilao-failover-chain` (stale, KHÔNG merge).

## Việc tiếp theo (nếu khoá Gemini lại cạn)
- `_classroom-online.ts` + `_parent-report.ts` vẫn gọi `callGeminiVision` trực tiếp (chưa vào chuỗi) — đổi thêm sau, chờ chủ dự án phê.

## Không làm (giải trình kỹ thuật)
- 9Router cho webapp production: local-only (127.0.0.1), Vercel không gọi được; subscription cá nhân không đúng mục đích serving.
- OpenRouter `:free` làm primary: trần ~50–1.000 req/ngày, chỉ vai overflow.
