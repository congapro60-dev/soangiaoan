# TODO — 22/10/2026: thoát phụ thuộc Gemini trả phí cho webapp

## Trạng thái: PORT LẠI LÊN MAIN THẬT + DEPLOY XONG ✅

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
