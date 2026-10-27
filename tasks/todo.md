# TODO - 28/10/2026: R4 Pha B (Gate C) bài `11-11-79` - batch2 Tuần 11

Plan: [2026-10-26-week11-batch2-v88.md](../docs/superpowers/plans/2026-10-26-week11-batch2-v88.md) — Gate D duyệt 27/10: `gate-d-11-11-79.md` (thầy chốt 4 đề xuất: S0–S10 = 1-4-2-5-3-1-8-5-6-3-2 phút; [HỆ QUẢ] bỏ chuỗi cơ học; đáp án tự lập luận PHT Khá c) SAI vì AB ∥ CD không cắt nhau; kind `practice` + timeline key `gateD79`).

## Pha A (xong 27/10)

- [x] A1 - xác minh PPCT `tds-g11-79` (week 11, periodNo 79, "Tiết 3: Luyện tập chứng minh hai mặt phẳng song song", lessonPeriods [77,78,79]).
- [x] A2 - tải giáo án gốc → `tasks/giaoan-goc-11-11-79.md` (Firestore lessonPlans/c8453c88-fbb8-4e6d-b84c-5a323abcc394, 28 115 ký tự). Vướng đã xử lý: V8.8 mở thư viện qua nút sidebar "Thư viện" trên tab dashboard (không còn /adaptive-lessons); script fetch phải viết bằng write tool (Set-Content double-encode hỏng tiếng Việt).
- [x] A3 - soạn `tasks/gate-d-11-11-79.md` (12 chặng, AI-error bỏ điều kiện cắt nhau a ∩ b = {I}, no-spoiler tokens `d_S` + `HÌNH THANG`).
- [x] A4 - thầy duyệt Gate D 79 (27/10).

## Pha B

- [x] B1 - spec `11-11-79` (kind/lessonType `practice`, examples×2, exercises×6 = PHT số 1 NB/THa/THb/THc + VD GK ∥ (ABCD) tự lập luận đã duyệt + VD thiết diện PHT số 2, quick×3 C/B/hình bình hành, mistakes×4, boardKnowledge, timelineKey `gateD79`) + aiError `ai-error-11-11-79` (category "Thiếu điều kiện", wrongSolution TRẦN chỉ bài làm sai, proof gộp whyAiError+boardPrompt, 5 trường plain Unicode không `$`) + `source.files` thêm `tasks/giaoan-goc-11-11-79.md` → fingerprint mới `b6dfa109aaf14022404bbe5f533b9eeba0ea6293c4e375717a466ea67a77be24` (recipe `tasks/tmp-hash-batch2.mjs`; file hash 79 = `dc74b984…`).
- [x] B2 - `'11-11-79'` vào `INTERACTIVE_SOURCE_KEYS` (`sequentialPublication.ts`, 7 mã).
- [x] B3 - entry thứ 4 vào `W11BATCH2` (`week11Batch2Catalog.ts`: g11, period 79, title "Hai mặt phẳng song song").
- [x] B4 - mảng exact-keys 6→7 mã alphabet (`week11Catalog.test.ts` + `interactiveUpgrade.test.ts`, tên test 6→7); pin `MAIN_PIN=51 + W11BATCH2.length` giữ nguyên (tự theo mảng). Thêm 2 test R4: timeline `gateD79` (11 dải giây) + binding theo PHASE cho 79 (aiError=P10, route choice=P13, group product=P14, postCheck=P21, exit=P37, languageDemands [P01,P10,P21], evidenceRules [P05,P10,P14,P21], fading [P14,P21]).
- [x] B1b - `TIMELINE_BY_KEY` thêm `gateD79` (`lessonAdapter.ts`) — vấp 2 test fail ban đầu (timeline fallback template + id P10 mồ côi), thêm key là qua.
- [x] B5 - vitest v4: **27 file / 284 PASS** (baseline fix2 279, +5); `npm run build` 0 TS error (~1m11s).
- [ ] B6 - HANDOFF + todo cập nhật → commit chọn lọc (KHÔNG `tasks/tmp-*`) → push `feat/nop-bai-da-cham` + `main` → kiểm deploy → republish 54 bài (bài 79 mới tạo).
- [ ] B8 - QA A–F trên Production (khuôn `tmp-r3-fix2-rea.cjs` + probe6/probe7; phiên live mới; lớp R6RCFC, HS Tuệ Minh PIN 2750).
- [ ] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R4 + báo thầy.
