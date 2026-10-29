# TODO - 28/10/2026: Batch2 HOÀN THÀNH — 10/10 bài Tuần 11 V8.8 (R1–R7 + Task 9–11 chốt đợt)

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
- [x] B6 - commit `a5b090d` (11 files) → push feat+main (`c94c12b..a5b090d`, exit 0) → deploy success 2 Vercel → **republish "Tạo và xuất bản 58 bài"**: hàng "Lớp 12 · Tuần 11 · Tiết 79" xuất hiện (`tmp-r7-publish.json`).
- [x] B8 - QA A–F ĐẠT trên Production, phiên `3jpow388uY6B6aCx0EH7`: bands 12/12 khớp Gate D; AI-error chặng 5 ("AI"+"176,7", không lộ proof); route choice thẻ S → PHT Mức TB (taskAppeared); nháp giữ reload + tự rejoin không PIN; exit trống chặn + gửi trọn + "Tiến độ gửi · 1 HS"; think 63 reads, 11 windows decreasing+locked; Sau disabled stage 12; tvButtons=[]; no-spoiler 0/6.
- [x] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R7 + TỔNG KẾT LOẠT 7/7 (untracked) + báo thầy.

## Task 9–11 (chốt đợt — 28/10)

- [x] Task 9 - QA 2 bài batch1: `10-11-79` (g10, 7W288E, phiên `8DIcKxBIDeFTlyVivIMV`) + `11-11-75` (g11, R6RCFC, phiên `3f6l2fI1RriYA1ZWfnJe`) — A–F ĐẠT + CasioKeyGuide ẨN (bằng chứng dump 0 lần).
- [x] Task 10 - hồi quy bài 12 `12-11-80` (g12, AD4GKT, phiên `2vuuqC9VtmVhVGihSyD6`) — ĐẠT + CasioKeyGuide HIỆN đủ 4 bước (σx = 0,89443 nguyên trạng); g12VarianceNumbers + casioGuide test 17/17.
- [x] Task 11 Step 1/1b - báo cáo 10 mục QA + cổng chốt `expect(W11BATCH2).toHaveLength(7)` — vitest v4 **300/300 PASS**.
- [x] Task 11 Step 2 - chốt: mọi mục ĐẠT, đợt batch2 hoàn thành (0 sự cố).
- [x] Task 11 Step 3 - HANDOFF cuối đợt (10/10 bài V8.8; registry 10 key).
- [x] Task 11 Step 4 - commit + push tài liệu.
- [x] Thầy xác nhận đồng ý chốt đợt (28/10) — batch2 đóng, không còn mục CHỜ.
- [x] Việc 2 - nhãn Tuần 11 · Tiết 75–80 cho 10 bài nguồn trên thư viện (override client, QA 10/10 ✓).
- [x] Việc 1 (phương án B, thầy chọn) - server strip + chấm không ghi điểm: `studentAdaptiveLibraryOpen`/`studentAdaptiveLibrarySubmit` (`gradeLibraryAssessment`); route `/adaptive-library/:libraryLessonId`; auto đăng nhập ẩn danh; QA ĐẠT (mở bài strip + nộp diagnostic scored:false). Lưu ý: quickCheck nhúng Dewey giữ hành vi luồng công khai nguyên trạng.
- [x] Việc 3 - giao 10 bài tự học Tuần 11 cho 3 lớp (g10 2, g11 4, g12 4 — 10/10 → 200; QA portal g12 hiện đúng 4 bài).
- [x] Thầy xác nhận đồng ý kết hợp 2 loại bài (28/10) — đợt đóng.
## 29/10 — 2 chức năng mới (addendum)
- [ ] Hoàn tất QA nhóm xoay tua (đang dở — Edge WS fetch failed, retry).
- [ ] Chức năng 1: Hand Raise + Câu hỏi ẩn danh + Pulse (spec-hand-raise.md) — audit → P0 → test.
- [ ] Chức năng 2: Mobile/Desktop Parity theo 4 bước (spec-parity.md) — áp Math Diagram Standard cho hình.
- [x] Quy tắc kiểm thử mở rộng (test component + TDZ check) đã ghi HANDOFF sau lỗi TDZ participantUid.
