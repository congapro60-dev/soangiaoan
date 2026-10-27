# TODO - 28/10/2026: R6 Pha B (Gate C) bài `12-11-78` - batch2 Tuần 11

Plan: [2026-10-26-week11-batch2-v88.md](../docs/superpowers/plans/2026-10-26-week11-batch2-v88.md) — Gate D duyệt 28/10: `gate-d-12-11-78.md` (thầy chốt 4 đề xuất: S0–S10 = 1-4-3-4-3-1-8-5-6-3-2 phút; BLOCKER số mức VD dùng số tự kiểm Δ_Q(A) = 4,76; Δ_Q(B) = 5,20; `category` AI-error "Lỗi đại số"; kind `formation` + timeline key `gateD1278`).

## Pha A (xong 28/10)

- [x] A1 - xác minh PPCT `tds-g12-78` (week 11, periodNo 78, "Tiết 1: Tìm khoảng biến thiên, khoảng tứ phân vị của mẫu số liệu ghép nhóm", lessonPeriods [78]).
- [x] A2 - tải giáo án gốc → `tasks/giaoan-goc-12-11-78.md` (Firestore lessonPlans/80820147-a5df-42a1-8653-df385c3108f0, 26 211 ký tự).
- [x] A3 - soạn `tasks/gate-d-12-11-78.md` — phát hiện BLOCKER: đáp án mức VD gốc sai Toán ở 2 chỗ mâu thuẫn (Q₃(A) ≈ 11,71 quên nhân h=2; tóm tắt 2,86/5,67) → tự kiểm 4,76/5,20.
- [x] A4 - thầy duyệt Gate D 78 g12 (28/10).

## Pha B

- [x] B1 - spec `12-11-78` (kind/lessonType `formation`, formulas×4, examples×2 = Internet 240 + chữa chung 30,34, exercises×6 = PHT 3 nhánh + nhiệm vụ neo + SÁNG TẠO, quick×3 = kiểm nhanh NB/TH/VDC nguyên bản, mistakes×4, boardKnowledge, timelineKey `gateD1278`) + aiError `ai-error-12-11-78` (category "Lỗi đại số", bẫy "R = 35 − 10 = 25", wrongSolution TRẦN, plain Unicode) + `source.files` thêm `tasks/giaoan-goc-12-11-78.md` → fingerprint `929c3bb92a77e595929b1368ad61ebda81bf7bbf44b1d9f07506d616e5802e3a` (file hash 78g12 = `548bf1ff…`).
- [x] B2 - `'12-11-78'` vào `INTERACTIVE_SOURCE_KEYS` (9 mã).
- [x] B3 - entry thứ 6 vào `W11BATCH2` (g12, period 78, title "Khoảng biến thiên và khoảng tứ phân vị").
- [x] B4 - mảng exact-keys 8→9 mã + tên test 8→9; +2 test R6 (timeline `gateD1278` + binding phase 78 g12).
- [x] B1b - `TIMELINE_BY_KEY` thêm `gateD1278` (lessonAdapter.ts).
- [x] B5 - vitest v4: **27 file / 294 PASS** (baseline R5 289, +5); `npm run build` 0 TS error (~1m41s).
- [ ] B6 - HANDOFF + todo → commit chọn lọc (KHÔNG `tasks/tmp-*`) → push feat+main → kiểm deploy → republish (bài 78 g12 mới tạo).
- [ ] B8 - QA A–F trên Production (khuôn r5 — đổi session + ROW_RX "Lớp 12 · Tiết 78" + marker S4 "R = 35 − 10" + token no-spoiler `41,25`/`30,34`).
- [ ] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R6 + báo thầy.
