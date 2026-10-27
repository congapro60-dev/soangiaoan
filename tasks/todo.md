# TODO - 28/10/2026: R7 Pha B (Gate C) bài `12-11-79` - batch2 Tuần 11 (BÀI CUỐI)

Plan: [2026-10-26-week11-batch2-v88.md](../docs/superpowers/plans/2026-10-26-week11-batch2-v88.md) — Gate D duyệt 28/10: `gate-d-12-11-79.md` (thầy chốt 4 đề xuất: S0–S10 = 1-4-2-5-2-1-8-2-7-4-4 phút; 3 BLOCKER sửa số; `category` AI-error "Lỗi đại số"; kind `practice` + timeline key `gateD1279`).

## Pha A (xong 28/10)

- [x] A1 - xác minh PPCT `tds-g12-79` (week 11, periodNo 79, title "Tiết 2: Luyện tập", Thống kê g12).
- [x] A2 - tải giáo án gốc → `tasks/giaoan-goc-12-11-79.md` (Firestore lessonPlans/315100a6-dfab-40ef-9d03-aa13df0d5f78, 31 187 ký tự). Vướng: tab dashboard gốc đã đóng → `tasks/tmp-open-lib-12-79.cjs` (tạo tab mới + click sidebar "Thư viện").
- [x] A3 - soạn `tasks/gate-d-12-11-79.md` — phát hiện 3 BLOCKER số liệu (vinh danh 29,5/84,75/75 + σx 9,21 không khớp chữa chung; PM2.5 45/8,12/15,46 không khớp bảng; Σ = 20980 sai → x = 8 sai) — đã tự kiểm bằng tay.
- [x] A4 - thầy duyệt Gate D 79 g12 (28/10).

## Pha B

- [x] B1 - spec `12-11-79` (kind/lessonType `practice`, formulas×4, examples×2 = chữa chung 13,75/81/9 + PM2.5, exercises×6 = PHT TB/Khá + y=ax+b + ẩn số x=9 + PM2.5 A/B, quick×3 = B/B/C, mistakes×4, boardKnowledge, timelineKey `gateD1279`) + aiError `ai-error-12-11-79` (category "Lỗi đại số", bẫy làm tròn x̄ sớm, proof khuếch đại 2ε·x̄, plain Unicode) + `source.files` thêm `tasks/giaoan-goc-12-11-79.md` → fingerprint `a83ce82df4c7448f19419c37a341a9989e4cbe3c02da4db46ae0c2d96f9e242b` (file hash 79g12 = `ff8ad32e…`).
- [x] B2 - `'12-11-79'` vào `INTERACTIVE_SOURCE_KEYS` (10 mã — ĐỦ LOẠT).
- [x] B3 - entry thứ 7 vào `W11BATCH2` (g12, period 79, title "Các số đặc trưng đo mức độ phân tán").
- [x] B4 - mảng exact-keys 9→10 mã + tên test 9→10; +2 test R7 (timeline `gateD1279` + binding phase 79 g12).
- [x] B1b - `TIMELINE_BY_KEY` thêm `gateD1279` (lessonAdapter.ts).
- [x] B5 - vitest v4: **27 file / 299 PASS** (baseline R6 294, +5); `npm run build` 0 TS error (~1m37s).
- [ ] B6 - HANDOFF + todo → commit chọn lọc (KHÔNG `tasks/tmp-*`) → push feat+main → kiểm deploy → republish (bài 79 g12 mới tạo, đủ 58 bài).
- [ ] B8 - QA A–F trên Production (khuôn r6 — đổi session + ROW_RX "Lớp 12 · Tiết 79" + marker S4 "176,7" + token no-spoiler `13,75`/`20982`).
- [ ] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R7 + báo thầy + tổng kết toàn loạt batch2 (7/7).
