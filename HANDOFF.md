# SmartPlan AI — Handoff worktree `nop-bai-da-cham` (27/10/2026)

## Goal hiện tại
Batch 2 Tuần 11 — 7 bài V8.8 còn lại (`banToan-w11-batch2.snapshot.json`). Đã xong Task 1 (hạ tầng merge, commit `dce0512`) và **R1 Pha B/Gate C cho bài `10-11-80`** (phiên này). Còn R2–R7 (mỗi vòng: Pha A Gate P+D → thầy duyệt → Pha B Gate C + QA).

## R1 `10-11-80` — "Các số đặc trưng đo xu thế trung tâm" (g10, formation)
- Gate D ĐÃ DUYỆT (thầy, 26/10): `tasks/gate-d-10-11-80.md` — nguồn nội dung duy nhất, KHÔNG sửa.
- PA1: số đúng `149/10 = 14,9` CHỈ ở `correction`/`proof`/`exercises[].answer`; `wrongSolution`/`teacherPrompt`/`quick`/`mistakes`/`boardKnowledge`/các `question` KHÔNG có (grep kiểm chứng).
- `category` aiError là ENUM (`'Lỗi khái niệm' | 'Lỗi đại số' | 'Lỗi logic' | 'Thiếu điều kiện'` → `aiErrorCategory` trong `lessonAdapter.ts:239`) — KHÔNG ghi chuỗi dài vào snapshot.
- `boardPrompt` của Gate D gộp vào `proof` (chỉ-GV, an toàn PA1; `teacherPrompt` giữ nguyên văn gốc).
- Spec title không kèm "— Tiết N": hiển thị tự sinh theo thứ tự period trong cùng khối+tuần → `…— Tiết 2` (10-11-79 là Tiết 1).

## Recipe fingerprint batch2 (quyết thầy 26/10)
1. Điền `source.files` giá trị cuối (mỗi file giáo án → sha256 hex của bytes file đó; hiện: `tasks/giaoan-goc-10-11-80.md` = `82195f3e869d9c69cc1bd0294f49c9d86470cadfa59b72a3c10699e3296d9de9`).
2. Đặt `"fingerprint": ""`, băm sha256 hex TOÀN BỘ bytes file snapshot ở trạng thái đó.
3. Điền kết quả vào `fingerprint`. Giá trị R1: `d32bae2f0f20972a5ce74676a649d97131987fcbd0c07450a3f2a32007f498c9` (thoả regex hex-64 `validateContract.ts:230`).
4. Script tái lập: `tasks/tmp-hash-batch2.mjs` (idempotent — chạy lại ra đúng fingerprint cũ). Vòng sau thay files map rồi chạy lại script.

## Test (vitest `src/lib/liveLesson/v4`)
- 27 file / **266 tests PASS** (baseline trước R1: 261; +5: 3×it.each R1 + "W11BATCH2 không rỗng" + chapter W11). `npm run build` 0 TS error.
- Pin đếm số: `MAIN_PIN = 51` + `TOTAL_MERGED = 51 + W11BATCH2.length` — `W11BATCH2` nằm ở file thường `week11Batch2Catalog.ts` (KHÔNG export từ file .test.ts để tránh đăng ký kép test). Vòng sau: thêm 1 entry `W11BATCH2` + 1 key vào `INTERACTIVE_SOURCE_KEYS` + mảng exact-keys trong `week11Catalog.test.ts`/`interactiveUpgrade.test.ts` (alphabet) + sửa tên test số (hiện 4/47).
- Chapter: `adaptiveDraft.ts` dùng `source.week === 11 ? 'Ban Toán · W11' : 'Ban Toán · W5–W6'`.

## Việc kế tiếp (R1 còn lại)
1. B7 — Tạo bài V4 trên Production (GV đăng nhập, `/adaptive-lessons`, "Tạo và xuất bản"; check tab Bài học tương tác).
2. B8 — QA A–F trên Production theo `tasks/qa-week11-acceptance-2026-10-26.md`; lớp QA g10: `class-1787208462088` / join `7W288E` (Trần Thùy Anh, PIN 2143). Ghi vào `tasks/qa-w11-batch2-acceptance.md`.
3. B9 — DỪNG, tổng kết vòng, báo thầy trước khi sang R2 (`11-11-76`).

## Ràng buộc
- KHÔNG sửa: file Gate D, giáo án gốc, MAIN snapshot (`banToan-w5-w6.snapshot.json`), `gate-d-3-bai-tuan11.md`, 3 file khuôn.
- KHÔNG commit `tasks/tmp-*`. npm: `npm --prefix "<worktree>" run build`. Git: `git -c core.hooksPath=.githooks commit|push` (push có thể exit 1 dù thành công — đọc dòng `xxx..yyy HEAD -> main`).
- Pre-push hook đã BỎ yêu cầu HANDOFF (quyết 24/10) — việc trực tiếp ghi vào `tasks/todo.md`.
