# SmartPlan AI — Handoff worktree `nop-bai-da-cham` (27/10/2026)

## Goal hiện tại
Batch 2 Tuần 11 — 7 bài V8.8 còn lại (`banToan-w11-batch2.snapshot.json`). Đã xong Task 1 (hạ tầng merge, commit `dce0512`), **R1 Pha B** (`10-11-80`, commit `5d044cb`) và **R2 Pha B** (`11-11-76`, phiên này). Còn R3–R7 (mỗi vòng: Pha A Gate P+D → thầy duyệt → Pha B Gate C + QA) và QA Production B7–B8 của R1/R2.

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

## Recipe fingerprint batch2 (quyết thầy 26/10)
1. Điền `source.files` giá trị cuối (sha256 từng file giáo án; hiện: `tasks/giaoan-goc-10-11-80.md` = `82195f3e…d9de9`, `tasks/giaoan-goc-11-11-76.md` = `ef17b88a…`).
2. Đặt `"fingerprint": ""`, băm sha256 hex TOÀN BỘ bytes file snapshot ở trạng thái đó.
3. Điền kết quả. Giá trị sau R2 + fix ký hiệu (27/10): `36c18d6dbe3680204d03d465311d5855c821b2e5f1117d025ce184a7e7f7e2ea` (hex-64, thoả `validateContract.ts:230`; giá trị trước fix: `0d8b3e38…`).
4. Script tái lập: `tasks/tmp-hash-batch2.mjs` — **đa file, idempotent** (normalize JSON.stringify; chạy lại ra đúng fingerprint cũ). Vòng sau chỉ thêm file giáo án vào files map rồi chạy script.

## Test (vitest)
- v4 (`src/lib/liveLesson/v4`): 27 file / **269 tests PASS** (baseline R1: 266; +3 it.each R2). `npm run build` 0 TS error (✓ built 5m23s).
- Full `npm run test`: 4600/4604 — **4 fail CÓ SẴN tại HEAD R1** (`src/lib/lessonCompiler/v832/contractData.test.ts` + `goldenCandidates.test.ts` — lệch hash byte fixture v8.3.2; đã xác minh: stash toàn bộ thay đổi R2 chạy lại vẫn fail 4). KHÔNG do batch2 — cần phiên riêng điều tra trước R3.
- Pin đếm số: `MAIN_PIN = 51` + `TOTAL_MERGED = 51 + W11BATCH2.length` (giữ nguyên từ R1). Vòng sau (R3 `11-11-78`): thêm 1 entry `W11BATCH2` + 1 key `INTERACTIVE_SOURCE_KEYS` + mảng exact-keys 5→6 mã (alphabet) + đổi tên test số 5→6 (`week11Catalog.test.ts` / `interactiveUpgrade.test.ts`).
- Chapter: `adaptiveDraft.ts` dùng `source.week === 11 ? 'Ban Toán · W11' : 'Ban Toán · W5–W6'`.

## Việc kế tiếp
1. Sau deploy bản fix ký hiệu: tạo/xuất bản lại bài `11-11-76` trên Production (bài cũ `adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2` chứa nội dung lỗi `c_i`/`M_e`), mở phiên + TV + HS, chụp màn hình xác nhận TV/HS hiển thị `cᵢ`/`Mₑ` sạch (đặc biệt S10 exit ticket + panel mục tiêu).
2. B8 — chốt 4 mục QA gộp từ R1 (reload/rời-vào lại S4, E1 nút "Sau" 12/12, S6 chọn tuyến + gửi đề trọn, exit ticket gửi thành công) — bằng chứng đã có trong `tasks/tmp-r2-qa-*` (ảnh e-*/p3-*, dump c-log-part*), đối chiếu + ghi vào `tasks/qa-w11-batch2-acceptance.md`.
3. B9 — DỪNG, tổng kết vòng, báo thầy trước khi sang R3 (`11-11-78` — Hai mặt phẳng song song Tiết 2; hình không gian mô tả bằng lời).

## Ràng buộc
- KHÔNG sửa: file Gate D, giáo án gốc, MAIN snapshot (`banToan-w5-w6.snapshot.json`), `gate-d-3-bai-tuan11.md`, 3 file khuôn.
- KHÔNG commit `tasks/tmp-*`. npm: `npm --prefix "<worktree>" run build`. Git: `git -c core.hooksPath=.githooks commit|push` (push có thể exit 1 dù thành công — đọc dòng `xxx..yyy HEAD -> main`).
- Pre-push hook đã BỎ yêu cầu HANDOFF (quyết 24/10) — việc trực tiếp ghi vào `tasks/todo.md`.
