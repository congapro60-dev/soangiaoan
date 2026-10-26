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
