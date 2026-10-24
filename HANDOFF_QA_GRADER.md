# Bàn giao QA — Chấm bài ảnh qua lane rẻ (ViLao chib)

> Dành cho phiên QA kiểm lại độc lập. Viết ngày 23/10/2026 sau khi deploy đợt đổi production.

---

## 1. Goal

Kiểm lại 4 thay đổi code chấm bài ảnh đã lên production `main` (Vercel `giaoandewey`), cùng lane AI mới:

- **Điểm bài = Σ(questionResults) khi dòng phủ thang** — tổng maxScore các dòng ≈ maxScore bài (bảng chấm đầy đủ) thì cộng dòng, không tin field `score`; dòng KHÔNG phủ thang (AI chỉ đọc tổng điểm thầy ghi trên bài) thì giữ `score` của model. Cùng nguyên tắc với `recomputeTotal` có sẵn.
- **Guard hàng "Tổng kết"** — loại dòng giả model tự chèn khỏi bảng và khỏi tổng.
- **Parser chịu trailing comma** — sửa JSON lỗi phổ biến nhất của model.
- **Lane chính mới**: ViLao `chib/gemini-3.8-flash`, `reasoning_effort: 'none'` (~3–5₫/bài).

Sau khi QA xong, xác nhận chuỗi chấm prod không cần sửa gì thêm đối với các điểm trên.

## 2. Confirmed facts (file:line)

Tất cả ở `main` sau khi gộp nhánh `feature/grader-thinking0-16k` (base `2f177ae`):

| Nội dung | Vị trí |
|---|---|
| Ghim model leg **Gemini direct** (fallback) `GRADING_MODEL = 'gemini-3.8-flash'` — không đọc env, đổi model = sửa code + deploy | `api/_grading-core.ts:180-184` |
| Body gửi `reasoning_effort` khi có options | `api/_grading-core.ts:635` |
| Leg đầu chuỗi **ViLao chib**: model mặc định `gemini-3.8-flash` + `reasoningEffort: 'none'` (env `GRADING_VILAO_MODEL`/`GRADING_VILAO_BASE_URL` vẫn đè được) | `api/_grading-core.ts:695-703` |
| `laHangTongKet` — phát hiện hàng tổng kết (NFD + từ khoá) | `src/lib/classroom/gradingPrompt.ts:376` |
| Bỏ hàng tổng kết khỏi bảng điểm | `src/lib/classroom/gradingPrompt.ts:398` |
| Σ dòng khi phủ thang (`rowsCoverScale`); không phủ thì giữ field `score` | `src/lib/classroom/gradingPrompt.ts:473-487` |
| Điểm thầy chấm tay vẫn thắng qua `teacherMarkedScore` | `src/lib/classroom/gradingPrompt.ts:68-73, 491` |
| Kind mới `trailing_comma` | `src/utils/jsonRepair.ts:16` |
| Scanner string-aware `nextMeaningfulCharacter` | `src/utils/jsonRepair.ts:83` |
| Nhận diện dấu phẩy thừa trước `}` / `]` | `src/utils/jsonRepair.ts:171-172` |

Fallback chuỗi: ViLao chib → **Gemini direct** (`GRADING_GEMINI_API_KEY`/`GEMINI_API_KEY`), leg cuối giữ `thinkingLevel: 'low'` tại `api/grade-homework.ts:417-418` — nằm ngoài phạm vi duyệt đợt này, không đụng.

## 3. Verified (lúc bàn giao)

- **Test targeted**: `src/utils/jsonRepair.test.ts` + `src/lib/classroom/gradingPrompt.test.ts` + `api/__tests__/grade-homework.variants.test.ts` — **161/161 PASS**.
- **Build**: `npm run build` — xanh **2m 1s, 0 lỗi TypeScript** (chạy lại sau khi chốt guard, log `Temp\opencode\build_2310_guard.log`).
- **Full vitest** (`npx vitest run src api`): xem mục 8.
- **Key mới đã subscribe chib**: `SmartPlan-lane2` → `POST https://vilao.ai/api/v1/user/llm/keys/7c40c3fd-387c-45a4-b4ae-4f8fa46dbb81/subscribe` → **201**; verify `GET https://api.vilao.ai/v1/models` với Bearer key mới thấy `gemini-3.8-flash`. Giá: in 400 / cached 160 / out 1600₫/1M, sàn **3₫/request**.
- **A/B 22 lượt × 5 hãng trước khi code**: field `score` của model lệch so với Σ ở gần hết các lượt (kể cả Google direct) — lý do chính sách Σ. **Kiểm lại bằng chứng theo guard**: 17/18 lượt có bảng phủ thang (rowMax = 10 = maxScore) → Σ đúng; lượt lệch duy nhất model lặp bảng (rowMax 20, Σ nonsense 14,75) → guard quay về score 6,85 của model — hợp lý hơn.
- **Chi tiết tinh chỉnh guard đêm 23/10**: full vitest cho thấy 3 test luồng "bài kiểm tra định kì nhiều mã đề" đỏ khi Σ vô điều kiện — các kịch bản "AI đọc tổng điểm GV ghi trên bài" (`api/__tests__/grade-homework.variants.test.ts`: đối chiếu sổ điểm, lưu `paperScore`, HS tự khai) phụ thuộc field `score` với bảng câu không phủ thang. Production đã có cùng triết lý trong `recomputeTotal` (`src/lib/classroom/questionRescore.ts`): dòng phủ thang → Σ, không phủ → giữ điểm. Guard parse áp đúng nguyên tắc đó — quyết định Σ của thầy giữ nguyên trong regime đã kiểm chứng.

## 4. Failed attempts (đừng lặp lại)

- **Subscribe model qua UI ViLao** → fail im lặng từ listing thứ 2 trở đi (toast "Đã đăng ký" nhưng server không lưu). Chỉ tin endpoint `POST .../keys/{id}/subscribe` và verify bằng `/v1/models`.
- **Regex "Câu 7" chứa dấu 'â'** → 2 lần miss. Với bài 19 câu đúng thứ tự thì lấy `qs[6]`, đừng copy regex cũ.
- **`.includes('Phần I')`** → ăn nhầm cả 'Phần II'/'Phần III'. Dùng ranh giới `/Phần I(?!I)/` v.v.
- **Chạy full vitest không lọc** → quét nhặt test của worktree lạ `.claude/worktrees/*` + `extension/` (ENOENT, sai 8 test không thuộc repo). Luôn chạy `npx vitest run src api`.
- **Shell timeout bị cap ~120s** → build/full test phải chạy `background: true`. PS 5.1 không có `&&`; pattern Select-String chứa backtick làm PS chết.

## 5. Active constraints

- **KHÔNG ghi Firestore trong mọi lần test** — chỉ GET. Các lần chấm thử chỉ ghi file local dưới `Temp\opencode\ab_test\`.
- **Key cũ `SmartPlan-lane` (sk-a3ee…): GIỮ LẠI** theo quyết định chủ dự án 24/10 — để dành dùng cho OpenCode tooling sau này, KHÔNG dùng cho chấm bài production. Key production là `SmartPlan-lane2` (đã lộ 1 lần trong log, đã đặt trong Vercel env `GRADING_VILAO_API_KEY`).
- **Điểm thầy chấm tay luôn thắng** — khi QA gặp bài có `teacherMarkedScore`, điểm hiển thị là điểm tay, không phải Σ của model.
- `callUtilityVision`, `_classroom-online.ts`, `_parent-report.ts` ngoài chuỗi — giữ nguyên, không sửa.
- Triết lý `GRADING_MODEL`: đổi model = sửa code rồi deploy (env chỉ để vượt lúc khẩn cấp).

## 6. Cách QA nhanh

1. **Test local không tốn tiền**: `npx vitest run src/utils/jsonRepair.test.ts src/lib/classroom/gradingPrompt.test.ts api/__tests__/grade-homework.variants.test.ts` — phải 161/161.
2. **Chấm 1 bài thật qua prod**: đăng nhập web, tab Grading, chấm đúng bài mốc bên dưới; đọc `questionResults` tổng về. Chi phí ~3–5₫/lượt.
3. **Đối chiếu Σ**: với bảng chấm đầy đủ câu (phủ thang — đa số bài làm thường), cộng trường `score` của từng mục trong `questionResults` phải bằng điểm hiển thị. Với luồng bài kiểm tra định kì (bảng không phủ thang), điểm hiển thị là tổng model đọc — không cộng dòng.
4. **Thử JSON thiếu dấu câu** (tuỳ chọn): truyền prompt/entity JSON có trailing comma — response phải trả về được thay vì fail nguyên lượt.

## 7. Bài mốc để đối chiếu

Bài submission `9e0e1c4b` (đã chấm tay, điểm thầy **7,65**):

- **Phần I (trắc nghiệm)**: 2,75 — **Câu 7: 0**.
- **Phần II (tự luận)**: 2,75.
- **Phần III**: 2,25.

Model chấm đúng phải cho ra kết quả gần khung trên; nếu lệch xa, kiểm trước tiên decode `questionResults` xem có hàng "Tổng kết" phá tổng hay không.

## 8. Trạng thái full test + deploy

- **Merge `origin/main` vào nhánh (23/10 tối, merge commit `a421e98`):** `origin/main` đã đi trước **25 commits** (phiên khác đẩy V8.8/Studio + SSM server proxy + khôi phục GHKI + hotfix import JSON + **chuỗi chấm thêm lớp xkiro**). Ba file docs xung đột đã xử lý: `HANDOFF.md` = khung 85 dòng của họ + section 23/10 của mình lên đầu + 1 bullet ghi nhận xkiro; `tasks/lessons.md` = **hợp nhất 2 biến thể** (khung origin + 18 bullet top + 82 section theirs ∪ 9 heading mới của mình + 28 section chỉ có ở biến thể của mình — 930 dòng, kiểm lostT/lostM = 0); `tasks/todo.md` = kế hoạch đợt này, bỏ khối OMR rác 406 dòng của theirs (còn trong git history). `api/_grading-core.ts` auto-merge sạch — **review semantic: chuỗi = `vilao/gemini-3.8-flash` (`reasoning_effort: 'none'`) → `xkiro/qwen/qwen3.8-max:free` (env `GRADING_XKIRO_API_KEY`) → Gemini cuối; đúng như thiết kế hai bên.**
- **Fail "pre-existing" `student-adaptive` KHÔNG còn là vấn đề:** phía main đã fix trong `b3e1320` (test đọc thêm field `closed` khớp handler). Sau merge, file này **PASS**. Số liệu lịch sử trước merge: full vitest lần 2 — 330 file / 3474 test, 3473 PASS, 1 FAIL duy nhất đúng file đó (đã chứng minh pre-existing bằng git stash tại `2f177ae`).
- **Targeted sau merge: 174/174 PASS** (jsonRepair 25 + gradingPrompt 115 + variants 21 + grading-chain của họ 6 + student-adaptive 7) — `grading-chain.test.ts` của phiên khác match tên lớp theo prefix `vilao/`, không cứng model nên không vỡ khi đổi default sang `gemini-3.8-flash`.
- Full vitest `npx vitest run src api` (chạy đầu, trước tinh chỉnh guard) từng có 3 FAIL trong `grade-homework.variants.test.ts` (luồng "bài kiểm tra định kì nhiều mã đề": đối chiếu sổ điểm, `paperScore`, HS tự khai) — chính là cơ sở tinh chỉnh guard `rowsCoverScale` ở mục 3; sau khi áp guard, cả 3 xanh.
- **Full vitest sau merge (lượt chốt): 408 file / 4381 test — 4377 PASS, 4 FAIL, cả 4 đã chưng nghiệm là môi trường Windows chứ không phải lỗi code.** Cụ thể: 2 fail `src/lib/lessonCompiler/v832/goldenCandidates.test.ts` (fixture 11T38 + MENELAUS) và 2 fail `src/lib/lessonCompiler/v832/contractData.test.ts` (canonical `CIS_TDS_Lesson_Validator_v1.1.json`) — đều là assert **sha256 của file fixture trên đĩa ≠ hash cứng trong test** (JSON vẫn parse pass, chỉ byte lệch). Bằng chứng quyết liệt (hash bằng `git show HEAD:<path>` so với hash cứng): blob repo của cả 3 fixture **khớp 100% giá trị test mong đợi** (`d265a324…`, `1a5f142b…`, `155919c6…`); riêng bản trên đĩa Windows bị `core.autocrlf` đổi LF→CRLF (ghi nhận `CRLF-disk: true` trên cả 3) nên hash lệch. Checkout Linux/Vercel giữ LF nên sẽ pass hết. Không vá trong đợt này — đúng khuyến nghị của phía main trong HANDOFF (họ đã ghi cùng hiện tượng với `goldenCandidates`).
- Deploy: build post-merge **xanh (53,66s, 0 lỗi TypeScript)**. Push `origin main` đang thực hiện ngay sau báo cáo này (merge commit `a421e98` có parent = tip `origin/main` nên được fast-forward, không force-push) → Vercel tự deploy (`giaoandewey`). Sau deploy cần probe: `/` 200, `/api/grade-homework` 401/405 khi chưa đăng nhập — kết quả chi tiết ở tin nhắn tổng kết phiên 23/10 cho chủ dự án.
