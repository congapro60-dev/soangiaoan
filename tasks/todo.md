# TODO - 28/10/2026: R5 Pha B (Gate C) bài `12-11-77` - batch2 Tuần 11

Plan: [2026-10-26-week11-batch2-v88.md](../docs/superpowers/plans/2026-10-26-week11-batch2-v88.md) — Gate D duyệt 28/10: `gate-d-12-11-77.md` (thầy chốt 4 đề xuất: S0–S10 = 1-5-3-4-3-1-5-4-7-5-2 phút; [HỆ QUẢ] bỏ cụ thể hóa sập gãy; `category` AI-error "Thiếu điều kiện"; kind `practice` + timeline key `gateD77`).

## Pha A (xong 28/10)

- [x] A1 - xác minh PPCT `tds-g12-77` (week 11, periodNo 77, "Tiết 2: Nguyên hàm của một hàm số", lessonPeriods [76,77]).
- [x] A2 - tải giáo án gốc → `tasks/giaoan-goc-12-11-77.md` (Firestore lessonPlans/1761870e-01b4-47d3-9565-68f6500c805c, 28 031 ký tự). Vướng đã xử lý: replace đường dẫn dump phải khớp "tmp-…" (khuôn dùng path.join, không có prefix tasks/) — lần đầu ghi đè dump 79, đã fetch lại (không ảnh hưởng dữ liệu 79 đã commit).
- [x] A3 - soạn `tasks/gate-d-12-11-77.md` (12 chặng; AI-error "bạn Nam" ln x thiếu trị tuyệt đối; no-spoiler tokens `20,41` + `2\ln`).
- [x] A4 - thầy duyệt Gate D 77 (28/10).

## Pha B

- [x] B1 - spec `12-11-77` (kind/lessonType `practice`, examples×2 = đoàn tàu + đường cong M(1;2), exercises×6 = PHT1 A/B/C.a/C.b + PHT2 TB/Khá, **quick×3 gộp từ 5 câu ĐGTX gốc** (mini-check gộp + quiz 1 + quiz 2+3 — parser chỉ nhận 2–3 entries, mọi câu giữ nguyên văn), mistakes×4, boardKnowledge, timelineKey `gateD77`) + aiError `ai-error-12-11-77` (category "Thiếu điều kiện", wrongSolution TRẦN, proof đạo hàm 2 nhánh + gộp whyAiError/boardPrompt, plain Unicode) + `source.files` thêm `tasks/giaoan-goc-12-11-77.md` → fingerprint `7bfadbefd8f7541dd814500ae9c85d1f74921a5eddbb5800ef4ba75a64c6c702` (file hash 77 = `c45daa12…`).
- [x] B2 - `'12-11-77'` vào `INTERACTIVE_SOURCE_KEYS` (8 mã).
- [x] B3 - entry thứ 5 vào `W11BATCH2` (g12, period 77, title "Nguyên hàm").
- [x] B4 - mảng exact-keys 7→8 mã + tên test 7→8 (week11Catalog + interactiveUpgrade); +2 test R5 (timeline `gateD77` + binding phase 77).
- [x] B1b - `TIMELINE_BY_KEY` thêm `gateD77` (lessonAdapter.ts).
- [x] B5 - vitest v4: **27 file / 289 PASS** (baseline R4 284, +5); `npm run build` 0 TS error (~1m31s).
- [ ] B6 - HANDOFF + todo → commit chọn lọc (KHÔNG `tasks/tmp-*`) → push feat+main → kiểm deploy → republish (bài 77 mới tạo).
- [ ] B8 - QA A–F trên Production (khuôn `tmp-r4-qa.cjs`/`tmp-r4-probe7.cjs`/`tmp-r4-reload.cjs` — đổi session + marker S4 "ln x" + token no-spoiler).
- [ ] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R5 + báo thầy.
