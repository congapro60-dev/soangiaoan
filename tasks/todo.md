# TODO — 27/10/2026: R2 Pha B (Gate C) bài `11-11-76` — batch2 Tuần 11 ✅ (chờ B7–B8)

Plan: [2026-10-26-week11-batch2-v88.md](../docs/superpowers/plans/2026-10-26-week11-batch2-v88.md) · Gate D duyệt 26/10: `gate-d-11-11-76.md` (PA-β + PA-d chốt sẵn trong file).

- [x] B1 — spec + aiError `11-11-76` vào `banToan-w11-batch2.snapshot.json` (snapshot giờ 2 entry): formulas×4, examples×2 (S3: x̄ = 158/40 = 3,95; M_e = 4,0), exercises×6 (3 câu PHT1 NB/TH/VD + PHT2 TH + P3 ý1-2 TH + ý3 VD PA-d), quick×2 (x̄ = 14 S4; bẫy M_e ≈ 5,87 S6), mistakes×4, boardKnowledge×16 (2 hình TikZ mô tả lời). PA-β: PHT 1/2 ghi "tự tính", Internet không dán nhãn PHT1. PA-d: đích mới x̄′ ≥ 152 tìm k nhỏ nhất, hết "73k = 365". aiError "bạn Nam" (0,125 giờ), enum 'Lỗi khái niệm', boardPrompt gộp `proof`.
- [x] B1 — fingerprint đa file: `0d8b3e387202906193d42b7e4abcbaae9c82852008122563b84b57de538d76bf` (script `tasks/tmp-hash-batch2.mjs` nâng cấp đa file, idempotent — chạy 2 lần cùng giá trị); đối chiếu 24/24 số mục 3 Gate D. Ngoại lệ no-spoiler hợp lệ: "150" = mút khoảng đề gốc `[150;200)`.
- [x] B2 — `'11-11-76'` vào `INTERACTIVE_SOURCE_KEYS` (5 mã).
- [x] B3 — entry R2 vào `W11BATCH2` (g11, period 76).
- [x] B4 — mảng exact-keys 4→5 mã alphabet + tên test 4→5 (week11Catalog + interactiveUpgrade); không còn literal 52/53 (công thức `MAIN_PIN=51 + W11BATCH2.length` từ R1 giữ nguyên).
- [x] B5 — vitest v4: **27 file / 269 PASS** (baseline 266, +3 it.each); build 0 TS error (✓ 5m23s). Full suite 4600/4604: 4 fail CÓ SẴN tại HEAD R1 (`lessonCompiler/v832` contractData + goldenCandidates — lệch hash fixture, xác minh bằng stash) — không do R2, xử lý phiên riêng.
- [ ] B7 — Tạo bài V4 trên Production (check 2 bài mới: g10 + g11 cùng tên "— Tiết 2").
- [ ] B8 — QA A–F Production; lớp g11 `class-1787188523562` / `R6RCFC` (PIN 2750); ghi `tasks/qa-w11-batch2-acceptance.md`.
- [ ] B9 — DỪNG tổng kết vòng, báo thầy → R3 `11-11-78`.

---

# TODO — 27/10/2026: R1 Pha B (Gate C) bài `10-11-80` — batch2 Tuần 11 ✅ (chờ B7–B9)

Plan: [2026-10-26-week11-batch2-v88.md](../docs/superpowers/plans/2026-10-26-week11-batch2-v88.md) · Gate D duyệt 26/10: `gate-d-10-11-80.md`. Task 1 = `dce0512` (hạ tầng merge, cùng nhánh).

- [x] B1 — spec + aiError `10-11-80` vào `banToan-w11-batch2.snapshot.json` (shape `12-11-80`: examples×2 Alpha/Hình2, exercises×6 NB-NB-TH-TH-VD-VD, quick×2, mistakes×4, boardKnowledge×16; aiError 8 trường mode micro; `boardPrompt` Gate D gộp vào `proof` — chỉ-GV). PA1 grep: `14,9` chỉ ở `exercises[2].answer`, `correction`, `proof`. **Lưu ý vòng sau: `category` là ENUM** (`Lỗi khái niệm`… — `aiErrorCategory` `lessonAdapter.ts:239`), chuỗi dài làm audit fail `AI_ERROR_NO_CATEGORY`.
- [x] B1 — fingerprint batch2 (recipe sha256 file với `"fingerprint": ""`, files map giá trị cuối): `d32bae2f0f20972a5ce74676a649d97131987fcbd0c07450a3f2a32007f498c9`; script tái lập `tasks/tmp-hash-batch2.mjs` (idempotent, xoá sau B9).
- [x] Việc bắt buộc #1 — `adaptiveDraft.ts`: chapter theo `source.week` (`W5–W6` MAIN / `W11` batch2) + test.
- [x] B2 — `'10-11-80'` vào `INTERACTIVE_SOURCE_KEYS` + 2 comment "3 bài batch 1 + bổ sung dần batch 2".
- [x] B3 — entry R1 vào `W11BATCH2` (file thường `week11Batch2Catalog.ts`, tránh đăng ký kép test) + test mảng không rỗng.
- [x] B4 — test đếm số: pin `MAIN_PIN=51` + `TOTAL_MERGED=51+W11BATCH2.length` (7 chỗ trong `sequentialPublication.test.ts`, `lessonAdapter.test.ts`, `runtimeDefinition.test.ts`); exact-keys 4 mã alphabet (week11Catalog + interactiveUpgrade, tên 4/47).
- [x] B5 — vitest v4: **27 file / 266 PASS** (baseline 261, +5); build 0 TS error.
- [ ] B7 — Tạo bài V4 trên Production (GV → `/adaptive-lessons` → "Tạo và xuất bản"; check tab Bài học tương tác, title "…— Tiết 2").
- [ ] B8 — QA A–F Production theo `qa-week11-acceptance-2026-10-26.md`; lớp g10 `class-1787208462088` / `7W288E` (PIN 2143); ghi `tasks/qa-w11-batch2-acceptance.md`.
- [ ] B9 — DỪNG tổng kết vòng, báo thầy → R2 `11-11-76`.

---

# TODO — 26/10/2026: Nghiệm thu V8.8 Tuần 11 trên Production — ĐẠT ✅

Báo cáo đầy đủ: [qa-week11-acceptance-2026-10-26.md](qa-week11-acceptance-2026-10-26.md).

- [x] Tích hợp 5 bản sửa của Codex (`7f59e95`) — lint PASS, 619/619 test, 314/314 rules, build PASS, snapshot Toán + rules không đổi; đã push `main`, Production tự build.
- [x] QA Production bài 12 (`12-11-80`) bằng Edge thật qua 4 phiên live: A1/A2/A5/A6, B1–B4, FIX-2/FIX-3, F2 — PASS.
- [x] QA phần 2: A7 (Tạm dừng/Chạy không reset đồng hồ chờ — đo 4 mốc: 10s→6s→4s→2s), B2 (AI-error phân loại + giải thích → máy chủ xác nhận → TV "Khái niệm 1"), E1 (chặng 12/12 nút Sau disabled, 2 phiên), E2 (exit ticket chặng 11/12 gửi được, TV "Tiến độ gửi 1 HS"), E3 (KẾT THÚC đồng bộ 3 bề mặt), F3 (mode=tv read-only, `buttons: []`) — PASS.
- [x] Ghi chú: đồng hồ nghĩ chạy tiếp khi tạm dừng là thiết kế (ThinkWindow.tsx dòng 14–15, 42–45); E4 (tone P-timer 35+ phút) chỉ xác minh bằng unit test + code.
- [x] Dọn script QA tạm (qa1–qa8, dump-cues) — cây làm việc sạch.

---

# TODO — 26/10/2026: Sổ điểm cập nhật trực tiếp

Kế hoạch và bằng chứng: [approved-score-live.md](approved-score-live.md).
- [x] Test đỏ tái hiện thiếu liên kết, mất duyệt khi GV sửa; thêm logic điểm duyệt tự lên sổ.
- [ ] Hoàn tất stream GV/HS, nhập trực tiếp một nút Lưu, kiểm xung đột.
- [ ] Tạo cột Điểm bài hướng nghiệp HS1 cho 11Columbus, đọc lại đủ 26 điểm.
- [ ] Test, lint API/UI, build, review độc lập; chưa phát hành.

# TODO — 25/10/2026: G1–G4 Vilao xong, đã vào `main`

Nhánh `feature/vilao-all-flows`, worktree `wt-grader`. G1–G3 đã rebase qua 41 commit mới của `main` và hợp nhất: `2649eed..ca5598a`. G4 làm tiếp trên `main`.

- [x] **Code G3**: `_ai-image-handler.ts` gọi Vilao `/v1/images/generations`; `aiPricing` rule `gpt-image-2` 90₫ + `gemini-3.1-flash-image` 85₫; relay nhánh HS ẩn danh; client `studentAiKey` 2 tầng; portal gỡ chặn nhập key.
- [x] **Key Vilao**: gắn listing Reli `gpt-image-2` 90₫/req cho khoá `SmartPlan-preview` (trước đó 403 `Please subscribe to model`).
- [x] **E2E ảnh thật** (preview `nqr8aofy3`→`etqogqg1l`): 200 sau 54s → PNG trên Firebase Storage → lần 2 `cached:true` 3s. Ảnh ngoài 200 `image/png`.
- [x] **BUG crash nhánh HS** tìm qua E2E: `ReferenceError: Cannot access 'total' before initialization` (`_ai-relay-handler.ts`, gõ nhầm `total.count`). Đã sửa + 2 test hồi quy, đã chứng minh test bắt đúng bug.
- [x] **E2E TRỌN đường AI học sinh** — PASS: PIN `2655`, uid HS `1cbepxeC…`, `studentAi:true` → 200 "OK" 8,4s; thiếu cờ → 403. Lưu ý: PIN `0101` thầy đọc trên web là PIN **phụ huynh** ("PH tự đặt"), không dùng cho cổng học sinh — PIN học sinh là mã "Thầy cô cấp".
- [x] **Hợp nhất `feature/vilao-all-flows` → `main`** — `2649eed..ca5598a`, sau rebase 60/60 test + tsc 0 lỗi + build xanh.
- [x] **G4** — `callUtilityVision` (đọc mã đề) đã vào chuỗi dự phòng, Google giữ làm lớp đỡ cuối (KHÔNG xoá code):
  - `getGradingChain(variant)` nhận `'grading' | 'utility'`; lớp Google dùng `UTILITY_MODEL` cho đường việc phụ (trước đây ghim `GRADING_MODEL` cho mọi đường → đẩy utility qua chuỗi sẽ hoá ra chạy model đắt).
  - Bỏ nhánh "lùi sang model chấm chính khi Google trả 400": lượt gọi đã ở lớp rẻ nhất, lùi nữa chỉ tốn thêm tiền cùng một khoá.
  - Cờ `GRADING_GEMINI_FALLBACK` (off/0/false/no → tắt hẳn tầng Google, không cần sửa code). Mặc định BẬT = hành vi cũ.
  - `callUtilityVision` nhận thêm `segment` (hiện chưa nơi gọi nào truyền).
  - Test `grading-chain.test.ts` +6: Google chết vẫn đọc mã đề qua Vilao; Vilao chết → xKiro; cả hai chết → Google dùng `UTILITY_MODEL`; cờ off bỏ tầng Google; cờ off không gọi mạng; cờ lạ vẫn BẬT. Đã chứng minh **5/6 test đỏ** khi revert code.
  - Sửa 1 test cũ ở `grading-cache.test.ts` (đang khoá hành vi "lùi sang model đắt" — hành vi G4 cố ý bỏ).
- [x] Dọn đồ nghề `vite.config.e2e.ts` khỏi repo (giữ bản ngoài worktree).

## Việc còn đợi thầy
- [ ] **Bài "Kiểm tra giữa HKI" của Hà Chi**: HS không thấy điểm vì **GV chưa duyệt**, không phải lỗi. `api/classroom.ts:1064-1071` giữ điểm ở máy chủ tới khi `teacherApproved === true`. Thầy mở tab Nộp bài đã chấm → Duyệt là em thấy điểm.
- [ ] Canary sau khi deploy G4: log Vercel phải thấy `[grading-chain/utility]` khi khâu đọc mã đề chạy.


---

# TODO — 24/10/2026: duyệt tự động bài cần soát + cờ cảnh báo — CODE XONG ✅ (chờ quyết merge)

Plan `docs/superpowers/plans/2026-10-24-auto-approve-review-flag.md` · spec `docs/superpowers/specs/2026-10-24-auto-approve-review-flag-design.md` · worktree `wt-grader` nhánh `feature/auto-approve-uncertain-flag`, 9 commits `82d0b54..7dd910a`, base = origin/main tip `527ba4e` → merge sẽ là **fast-forward thuần**.

- [x] Task 1 `e935577` — bỏ 2 chặn duyệt trong `autoGrade.ts` + đảo 3 case test (5/5; spec review PASS, code review Yes).
- [x] Task 2 `20a84d4` — `editedByTeacher` set đủ mọi đường sửa tay + `toApprove` nới (uncertain ⊆ toApprove) (15/15; 2 lớp review Yes).
- [x] Task 3 `14b18eb` — test khoá "sửa tay giữ Chờ duyệt" (8/8 + 7/7; test-only, gộp 2 lớp review — đã duyệt).
- [x] Task 4 `c60cbad` — cron e2e `approved: 3` + assert `questionResults` giữ nguyên `toEqual` (3/3; test-only, gộp 2 lớp review — đã duyệt).
- [x] Task 5 `5f2e662` — UI `AssignmentPanel` + `TeacherBacklogCard`: ô tick "vẫn giữ lại" bỏ hẳn, `canDuyet = tonSau.toApprove` (KHÔNG concat — uncertain đã nằm trong toApprove), `tongTon`/`tong` bỏ vế uncertain, toast "có cờ ở" (sửa từ "cờ vàng ở" rồi amend) (tsc 0 lỗi; spec + code review Yes, 6 case smoke đề xuất).
- [x] Task 6 — build xanh 7m 5s (0 lỗi TS, chỉ warning chunk lớn đã biết) · **final code review toàn nhánh `527ba4e..HEAD`: Yes, 0 BLOCKER/MAJOR**, 3/3 ràng buộc PASS (không ghi Firestore mới — grep 0 match `setDoc|updateDoc|...`; đếm không trùng — `uncertain ⊆ toApprove` ở `submissionSelection.ts:163-164`; chip cờ còn sau duyệt — duyệt chỉ patch `teacherApproved`/`approvalSource` tại `api/grade-homework.ts:2151-2153`). Full vitest: xem dòng dưới.
- [x] Full `vitest run src api` — 408 file / 4384 tests **4379 PASS, 5 FAIL + 1 worker error, 11m 12s**. Đối chiếu baseline main `527ba4e` (QA Claude+Codex): 4 hash CRLF (`contractData`×2 `60bf770f`/`155919c6`, `goldenCandidates`×2 `d265a324`/`1a5f142b`) đúng từng mã = baseline Windows; worker error `onTaskUpdate` = đúng kiểu Codex gặp; 2 timeout (`ai-gateway-handler:194`, ngoài danh sách) + `docxSource` (flaky chuẩn Codex) — **rerun riêng 14/14 PASS trong 20s** → flaky CPU khi máy chạy song song build/review. **0 fail thật liên quan nhánh.**

**Nợ sau merge (không chặn, từ final review):** (1) MINOR — 2 dòng comment stale "lệch nhiều thì không tự duyệt" tại `api/grade-homework.ts:690-691` (file plan cố tình không đụng); (2) MINOR — e2e cron chưa seed case `examCheck.mismatch` (chỉ khoá ở lib unit `autoGrade.test.ts:3`); (3) NIT — spec snapshot `:36` còn text toast cũ "cờ vàng ở"; (4) NIT — comment sai ở `loClassScores.test.ts:29`; (5) NIT — nút "Chấm & duyệt tất cả" vẫn bấm được khi lớp trống (pre-existing). Cần thêm `.gitattributes` (*.json eol=lf) hoặc băm theo blob git để hết 4 test hash đỏ trên Windows.

**X lý trạng thái cũ (đã xong):** test đỏ tạm thời từ `e935577` đã được Task 4 `c60cbad` đảo expectation — full suite không còn đỏ có chủ đích.

---

# TODO — 22/10/2026: thoát phụ thuộc Gemini trả phí cho webapp

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
## 26/10/2026 — Sửa JSON báo cáo phụ huynh và đường phát hành

- [x] Tái hiện A/B/C qua handler thật với mock, sửa parser và schema; giữ ghi chú đã soạn khi lỗi.
- [x] Hiện cảnh báo thiếu ghi chú/YCCĐ ở màn giáo viên; không tự công bố bản thiếu.
- [x] Nối build guard kiểm metadata production; test guard 8ca bằng tiến trình con, không deploy CLI. Guard không thay thế quyền kiểm soát Vercel.
- [x] Review Sol APPROVE, không Astra; app/API typecheck đạt; API46/46, full427file/4547test, guard8ca đạt; build cuối exit0, entry709,53kB.
- [ ] Bàn giao commit nhánh riêng cho phiên đang triển khai (user xác nhận); phiên đó tích hợp Git main và xác minh alias/source/file. Chưa có 5 lượt live QA từ phiên này.

Handoff: Goal sửa A/B/C + ngăn nhầm production. Confirmed facts: base e614b70, alias dpl_9Gwv4dRvk nguồn CLI; thư mục gốc archive có WIP, nop-bai-da-cham có WIP live UI. Failed attempts: xóa .vercel không chặn đường env/explicit project; guard hiện chỉ in hướng dẫn. Active constraints: worktree riêng, không Astra, không sửa dữ liệu HS/GV, không ghi đè WIP/đổi quyền cloud ngoài phạm vi.

# TODO — 26/10/2026: sửa lỗi QA runtime Tuần 11

Goal: sửa năm lỗi kỹ thuật đã được duyệt; giữ nguyên Toán, mã PPCT, 51 gói, cue ID và privacy rules.
Base: `3616442`; nhánh `codex/week11-runtime-fixes`; worktree riêng, không thay WIP checkout cũ.

- [x] Test đỏ: chuyển cue phải ẩn kết quả cũ; cùng cue giữ trạng thái công bố.
- [x] Presenter có xác nhận đóng, gọi service hiện có; xử lý lỗi, khóa thao tác khi đang đóng.
- [x] Chọn đáp án chỉ lưu nháp; Gửi mới ghi; luyện tập dùng chung hàng rào khóa.
- [x] Lỗi listener dừng runtime bằng màn lỗi có nút tải lại; giữ nháp đã lưu, không giả báo đã đóng.
- [x] Lint, API lint, bộ test liveLesson/pages/service, build; rules emulator.
- [x] Review source độc lập lần hai: không còn blocker/major; cùng họ OpenAI, review chéo hãng chưa khả dụng. Browser chưa xác minh; không phát hành.

Failed attempts: QA browser trước bị chặn xác định URL Windows; không dùng kết quả đó làm chứng cứ E2E.
Routing: catalog 9router không truy cập được; native agent xử lý Student, không tuyên bố quota/model router đã xác minh.

Review: 63 file / 619 test PASS; rules 11 file / 314 test PASS với hookTimeout 90s; lint + API lint + build exit 0; entry 709,53 kB. Bổ sung 4 integration handler tests cho đóng/lỗi/thử lại và route recovery. Lint phát hiện một lỗi kiểu trong test mới, đã sửa và chạy lại xanh. Không sửa Toán/Rules, không commit/push/deploy, không ghi production.
