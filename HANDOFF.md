# SmartPlan AI — Handoff worktree `nop-bai-da-cham` (27/10/2026)

## Goal hiện tại
Batch 2 Tuần 11 — 7 bài V8.8 còn lại (`banToan-w11-batch2.snapshot.json`). Đã xong Task 1 (hạ tầng merge, commit `dce0512`), **R1 Pha B** (`10-11-80`, commit `5d044cb`), **R2 Pha B** (`11-11-76`) và **R3 trọn vẹn kèm fix1+fix2** (`11-11-78`: timeline Gate D per-lesson + binding theo phase, re-QA Production A–F ĐẠT — xem `tasks/qa-w11-batch2-acceptance.md`), **R4 Pha B** (`11-11-79`, practice — code + test ĐẠT, chờ QA A–F). Còn R5–R7 (mỗi vòng: Pha A Gate P+D → thầy duyệt → Pha B Gate C + QA). Thầy đã duyệt phương án (b) timeline per-lesson (27/10) và cho phép tiếp R4.

## R2 `11-11-76` — "Các số đặc trưng đo xu thế trung tâm" (g11, formation)
- Gate D ĐÃ DUYỆT (thầy, 26/10): `tasks/gate-d-11-11-76.md` — nguồn nội dung duy nhất, KHÔNG sửa.
- **PA-β**: đáp án PHT số 1/2 là **tự tính** (x̄ = 2,15 giờ; thêm 1 bạn 6 giờ → x̄′ = 92/41 ≈ 2,24; M_e = 2,2 giờ nhóm [2;3) C = 17) — solution ghi rõ "tự tính, không có trong giáo án". Bảng Internet (x̄ = 158/40 = 3,95; M_e = 4,0) CHỈ là ví dụ dạy S3 — KHÔNG dán nhãn "đáp án PHT số 1".
- **PA-d**: Ý 3 Phiếu số 3 = đích mới "x̄′ ≥ 152, tìm k nhỏ nhất" ⇒ 73k ≥ 350 ⇒ k = 5; kiểm x̄′ = 8375/55 ≈ 152,27. KHÔNG còn chuỗi "73k = 365".
- aiError bẫy "bạn Nam" (cộng mút bỏ tần số → 0,125 giờ), `category` enum `'Lỗi khái niệm'`; boardPrompt bảng lớn gộp vào `proof` (chú thích `[Gộp …]` như R1).
- quick×2 (nguồn ghi trong solution): kiểm nhanh 3 nhóm x̄ = 14 (S4 ĐGTX 85%) + bẫy sai M_e vinh danh ≈ 5,87 (S6 Bước 3).
- Shape exercises `12-11-80` chỉ có `level/question/answer` → **solution gộp vào answer**; quick có `solution` riêng.
- Ngoại lệ no-spoiler hợp lệ: "150" trong exercise.question P3 là mút khoảng đề gốc `[150;200)` (Gate D S7 nguyên văn).
- Hai hình TikZ gốc (mô hình c_i, nội suy M_e) mô tả bằng lời/ASCII trong `boardKnowledge`.
- **Fix ký hiệu Toán (thầy báo 27/10 qua ảnh exit ticket)**: mọi ký hiệu plain-text (ngoài span LaTeX `$…$` và ngoài mảng `formulas`) đổi sang Unicode subscript — `c_i→cᵢ, m_i→mᵢ, M_e→Mₑ, a_p→aₚ, m_p→mₚ` (45 token / 22 dòng: focus, examples, exercises, quick, boardKnowledge, aiErrors correction/proof/studentProduct). LaTeX trong `formulas` + span `$…$` giữ nguyên (KaTeX tự render). Script: `tasks/tmp-fix-notation-batch2.mjs` (guard: không đụng LaTeX, đếm khớp kỳ vọng, JSON validate). R1 dùng "Me" không gạch dưới — chấp nhận, không sửa.

## R3 `11-11-78` — "Hai mặt phẳng song song" (g11, formation, Tiết 2)
- Gate D ĐÃ DUYỆT (thầy, 27/10): `tasks/gate-d-11-11-78.md` — nguồn nội dung duy nhất, KHÔNG sửa. Thầy duyệt đủ 4 đề xuất: Hệ quả cho "hai đường thẳng song song khác"; thời lượng S0–S10 = 1,2,3,5,3,1,7,3,5,8,2 phút; Thales phẳng ghi 2 họ tách dòng; Burj chỉ hình học (bỏ suy diễn cơ học).
- Spec: `kind/lessonType "formation"`, title "Hai mặt phẳng song song" (không kèm Tiết); formulas×4 theo thứ tự — Định lý 1 (hệ 3 dòng), Hệ quả (plain text), Thales không gian, Thales phẳng 2 họ; `formulas.slice(0,3)` hiện S3 công khai. examples×2 = chứng minh Thales không gian (tứ giác đúng `AA'B'B''`/`B''B'C'C''`, cát phụ `d''`) + Burj geometry-only; exercises×6 = PHT N1/N2 (NB/TH/VD) đáp án nguyên bản mục III, solution ghi "(Đáp án PHT số 1 mức … — nguyên bản mục III giáo án.)"; quick×**3** (nguồn mục III.3, đáp án B/B/B); mistakes×4; boardKnowledge công khai KHÔNG đáp án PHT.
- **Quick×3 — nới pin (lệch plan template quick×2)**: Gate D bài 78 có 3 câu kiểm nhanh gốc. Nới `spec.quick?.length !== 2` → `!(… === 2 || … === 3)` ở `lessonAdapter.ts:181` + `validateContract.ts:269`; audit `sequentialPublication.ts` đổi code `SOURCE_QUICK_NOT_2`→`SOURCE_QUICK_COUNT`, message "cần 2 hoặc 3 câu"; `adaptiveDraft.test.ts:52` assert theo `contract.sourceContent?.quickChecks.length` thay vì literal 2. Readiness `insufficient_quick_check` ngưỡng `< 2` giữ nguyên → 3 câu pass; `lessonAdapter.test.ts:24` (pin MAIN `10-5-31` quick×2) không đụng.
- aiError: `category "Thiếu điều kiện"`; `wrongSolution` TRẦN chỉ mệnh đề sai (cụm "không kiểm tra đồng phẳng" tách về chỉ-GV theo BLOCKER Codex #3); `proof` gộp `[Gộp whyAiError: …] [Gộp boardPrompt: …]` như R2. **Ký hiệu plain Unicode** (`a ⊂ (α)`, `∥`, `∩`, `⇒`) — KHÔNG dùng `$…$` trong 5 trường aiError (khớp 53 entry cũ; TV render `body` nguyên dạng, không qua KaTeX — đã kiểm script `tasks/tmp-check-aierror-dollar.mjs`: 54/54 sạch `$`).
- Hình không gian (Hình 3 cát tuyến chéo nhau, tứ giác hình bình hành) mô tả bằng lời trong `examples`/`boardKnowledge`. LessonId dự kiến `adaptive-v4-11-11-78-24YyULmWgBOM6HZCfJ56RN5tiet2` (deterministic).

## Recipe fingerprint batch2 (quyết thầy 26/10)
1. Điền `source.files` giá trị cuối (sha256 từng file giáo án; hiện: `tasks/giaoan-goc-10-11-80.md` = `82195f3e…d9de9`, `tasks/giaoan-goc-11-11-76.md` = `ef17b88a…`, `tasks/giaoan-goc-11-11-78.md` = `175b65bf…`, `tasks/giaoan-goc-11-11-79.md` = `dc74b984…6726`).
2. Đặt `"fingerprint": ""`, băm sha256 hex TOÀN BỘ bytes file snapshot ở trạng thái đó.
3. Điền kết quả. Giá trị sau R4 (28/10, thêm spec 79 + file giáo án 79): `b6dfa109aaf14022404bbe5f533b9eeba0ea6293c4e375717a466ea67a77be24` (hex-64; trước đó R3·fix1: `54d92529…83c6f`, R3: `f10723f4…`, R2+fix ký hiệu: `36c18d6d…`).
4. Script tái lập: `tasks/tmp-hash-batch2.mjs` — **đa file, idempotent** (normalize JSON.stringify; chạy lại ra đúng fingerprint cũ). Vòng sau chỉ thêm file giáo án vào files map rồi chạy script.

## Test (vitest)
- v4 (`src/lib/liveLesson/v4`): 27 file / **284 tests PASS** (baseline fix2: 279; +5 R4: it.each 79 ×3 + timeline gateD79 + binding phase 79). `npm run build` 0 TS error.
- Full `npm run test`: 4 fail CÓ SẴN pre-existing tại HEAD R1 (`src/lib/lessonCompiler/v832/contractData.test.ts` + `goldenCandidates.test.ts` — lệch hash byte fixture v8.3.2; đã xác minh từ R2). KHÔNG do batch2 — chuẩn mỗi vòng là vitest `src/lib/liveLesson/v4`.
- Pin đếm số: `MAIN_PIN = 51` + `TOTAL_MERGED = 51 + W11BATCH2.length` (giữ nguyên từ R1, tự nảy theo mảng). Vòng sau (R4 `11-11-79` practice): thêm 1 entry `W11BATCH2` + 1 key `INTERACTIVE_SOURCE_KEYS` + mảng exact-keys 6→7 mã (alphabet) + đổi tên test số 6→7 (`week11Catalog.test.ts` / `interactiveUpgrade.test.ts`).
- Quick pin mới: 2 hoặc 3 câu (R3) — bài practice có thể khác, đọc Gate D trước khi thêm entry.
- Chapter: `adaptiveDraft.ts` dùng `source.week === 11 ? 'Ban Toán · W11' : 'Ban Toán · W5–W6'`.

## R3·fix1 — Timeline Gate D per-lesson (thầy chốt phương án b, 27/10)
- **Vấn đề**: Gate D 78 chốt dải S0–S10 = 0–60–180–300–600–780–840–1260–1440–1740–2220–2400 (1-2-3-5-3-1-7-3-5-8-2 phút) nhưng runtime dùng `TIMELINE` cứng chung (chặng 5 = 16–19 phút). Gate D 76/80 viết đúng template nên chỉ bài 78 vấp.
- **Fix**: `SourceLessonSpec.timelineKey?: string` (`lessonAdapter.ts`) + `TIMELINE_BY_KEY` (`gateD78` — nhãn P = phút bắt đầu: P00/P01/P03/P05/P10/P13/P14/P21/P24/P29/P37); `buildTimeline` ưu tiên override → V72 → TIMELINE chung. Spec 78 thêm `"timelineKey": "gateD78"`. Fingerprint `54d92529…83c6f` (recipe băm 3 giáo án gốc — fix2 không đổi giá trị này).
- **Precedent R4–R7**: bài nào Gate D chốt dải phút khác template → thêm key mới vào `TIMELINE_BY_KEY` + khai báo `timelineKey` trong spec; không đụng TIMELINE chung.

## R3·fix2 — Binding theo PHASE thay vì id chặng cứng (27/10)
- **Vấn đề regression sau fix1**: QA bắt được HS mất thẻ "AI kết luận" + 4 nhãn + "PHẢN HỒI NHANH" ở chặng 5, mất "Chọn nhiệm vụ này" ở chặng 6 — dù timeline bands đúng 12/12. Nguyên nhân: adapter gắn nhiệm vụ theo **id chặng cứng của template** (`aiError.stepId='P16'`, `cp-route-choice.stepId='P19'`, `cp-diagnostic='P08'`, fading/evidence/grouping P20/P27, languageDemands P03/P16/P27, notebookText P19/P38) — gateD78 đổi id (aiError=P10, grouping=P13,…) nên các checkpoint "mồ côi", cue không có responseStepId → HS trắng nhiệm vụ. Template/V72/P31 không vấp vì id trùng khớp.
- **Fix (theo phase, fallback id template ⇒ template giữ 100% hành vi cũ)**:
  - `lessonAdapter.ts`: helper `timelineBeatsFor(spec)` (isV72→V72_TIMELINE; else `TIMELINE_BY_KEY[timelineKey] ?? TIMELINE`) + `beatIdForPhase(spec, phase, fallback)`; mapping checkpoint của `buildTimeline` theo phase (guidingQuestion/goals/knowledgeCycle/aiError/grouping/differentiatedPractice/postCheck/quickCheck/exitTicket); thay literal ở `aiError.stepId`, `languageDemands`, `checkpoints` non-V72, `fading`, `evidenceRules`, `groupingCheckpoints`. V72 giữ literal riêng (aiError P15, evidence P09/P15/P22/P36). Block timeline trả thêm `phase` (types.ts: `TimelineBlock.phase?`).
  - `runtimeDefinition.ts`: `notebookText` theo phase (opening/grouping → "Chưa cần chép", exitTicket → kết luận) giữ điều kiện id P00/P19/P38 làm fallback cho P31; `aiErrorStepId` suy từ checkpoint `cp-ai-error` (bỏ whitelist 'P15'||'P16').
  - `validateContract.ts`: rule `STEP_REFERENCE_INVALID` — checkpoint.stepId + aiError.stepId phải ∈ timeline ids; evidenceRules.sourceStepId ∈ timeline ∪ checkpoint ids (P31 dùng checkpoint id). Chống tái phạm R4–R7.
- **Test**: v4 27 file / **279 PASS** (baseline fix1: 274; +2 test binding fix2 + 3 test validateContract). `npm run build` 0 TS error.

## R4 `11-11-79` — "Hai mặt phẳng song song — Tiết 3" (g11, practice)
- Gate D ĐÃ DUYỆT (thầy, 27/10): `tasks/gate-d-11-11-79.md` — nguồn nội dung duy nhất, KHÔNG sửa. Thầy duyệt 4 mục: phân bổ S0–S10 = 1-4-2-5-3-1-8-5-6-3-2 phút; [HỆ QUẢ] giàn giáo bỏ chuỗi cơ học (giữ mảng hình học — tiền lệ Burj 78); đáp án tự lập luận PHT Khá c) SAI vì AB ∥ CD không cắt nhau; kind `practice` + timeline key `gateD79`.
- Giáo án gốc: `tasks/giaoan-goc-11-11-79.md` (Firestore lessonPlans/c8453c88-…, 28 115 ký tự, tải 27/10). Fetch qua `tasks/tmp-giaoan-fetch-11-11-79.cjs` — trang V8.8 mở thư viện bằng nút sidebar "Thư viện" trên tab dashboard (KHÔNG còn ở /adaptive-lessons; nút "Tạo từ giáo án nguồn" dẫn sang /adaptive-builder/new — KHÔNG bấm). Cấm viết script tiếng Việt qua PowerShell Set-Content (double-encode hỏng chuỗi — viết bằng write tool).
- Spec: kind/lessonType `practice`; examples×2 = Polya chữa chung + dựng thiết diện (solution nguyên bản mục III.1/III.2); exercises×6 = PHT số 1 (NB điền khuyết / TH a / TH b / TH c) + VD "GK ∥ (ABCD)" (tự lập luận đã duyệt: I trung điểm AB, trung tuyến SI, Thales đảo trong △SIC) + VD thiết diện PHT số 2; quick×3 (đáp án C/B/hình bình hành mục IV); mistakes×4; boardKnowledge công khai không đáp án PHT; timelineKey `gateD79` (dải 0-60-300-420-720-900-960-1440-1740-2100-2280-2400).
- aiError `ai-error-11-11-79`: category "Thiếu điều kiện"; bẫy bỏ điều kiện cắt nhau a ∩ b = {I} (bài làm sai "MN ∥ AB, PQ ∥ CD ⇒ (MNPQ) ∥ (ABCD)" — đúng lỗi 38% HS quên điều kiện cắt nhau theo căn cứ điều chỉnh gốc); wrongSolution TRẦN chỉ bài làm sai; proof gộp [Gộp whyAiError/boardPrompt] như R2/R3; 5 trường plain Unicode không $.
- Code: `TIMELINE_BY_KEY` thêm `gateD79` (`lessonAdapter.ts`); snapshot thêm spec + aiError + file 79 (fingerprint `b6dfa109…`); `INTERACTIVE_SOURCE_KEYS` thêm `'11-11-79'`; `W11BATCH2` entry thứ 4; exact-keys 7 mã (alphabet `['10-11-79','10-11-80','11-11-75','11-11-76','11-11-78','11-11-79','12-11-80']`, tên test 6→7).
- No-spoiler tokens QA: `d_S`, `HÌNH THANG` (viết hoa — chỉ trong đáp án mục III.2; đề phân hóa chữ thường giữ nguyên theo gốc).

## Việc kế tiếp
1. R4 `11-11-79`: Pha B xong (build + vitest 284/284) — **còn QA A–F trên Production (B8) rồi báo thầy (B9)**. LessonId dự kiến `adaptive-v4-11-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2`.
2. R5–R7 theo plan (R5 `12-11-77` Pha A Gate P+D trước). Lưu ý: CasioKeyGuide CHỈ bài `12-11-80` cũ (R5 `12-11-77` KHÔNG bật Casio; R6 không trùng nội dung bài 12; R7 tham khảo nháp `Downloads\smart-lesson-plan-ai\giao an manus tao\_qa\ban_toan_rebuild\sbR12B02RemainingSpecsW11W12.ts` nhưng KHÔNG copy mù).
3. Sau R7: test catalog về exact-keys 10 bài + Task 9 QA 2 bài batch1 + Task 10 hồi quy bài 12.
4. Hạ tầng QA: lớp g11 `class-1787188523562` / `R6RCFC`; HS Đặng Tuệ Minh PIN 2750 (Edge riêng port 9223, profile `Temp\opencode\edge-hs-profile`); tạo phiên mới bằng `node tasks/tmp-r3-qa-5-session2.cjs <out.json>`; selector route dùng `.includes('Chọn nhiệm vụ này')`.

## Ràng buộc
- KHÔNG sửa: file Gate D, giáo án gốc, MAIN snapshot (`banToan-w5-w6.snapshot.json`), `gate-d-3-bai-tuan11.md`, 3 file khuôn.
- KHÔNG commit `tasks/tmp-*`. npm: `npm --prefix "<worktree>" run build`. Git: `git -c core.hooksPath=.githooks commit|push` (push có thể exit 1 dù thành công — đọc dòng `xxx..yyy HEAD -> main`).
- Pre-push hook đã BỎ yêu cầu HANDOFF (quyết 24/10) — việc trực tiếp ghi vào `tasks/todo.md`.
