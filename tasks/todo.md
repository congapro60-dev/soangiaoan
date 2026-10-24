# V28 — Kế hoạch triển khai (bắt đầu 24/10/2026, sau khi QA v27 PASS)

> Nguồn spec (đã chốt với user 23–24/10, commit `52f6e4d`): `tasks/v28-bang-ky-hieu-toan.md`, `tasks/v28-hinh-anh-goi-y-va-de-bai.md`, `tasks/v28-cham-bai-ai.md`, `tasks/v28-hoat-dong-tap-the.md`.

## Phase A — Serialize + ảnh đề/gợi ý + keypad decimal_4 (rủi ro thấp)
- [ ] A1. `lib/lesson/serialize.js`: task HS/GV giữ `imageUrl` (fallback `diagramUrl`); 2 allowlist hint giữ `diagramUrl` (fallback `image`); cho phép keypad `decimal_4` render HS (dòng ~67).
- [ ] A2. Renderer slot ảnh cạnh đề tại 5 điểm (`app/play/page.tsx:1272`, `ClassEventPanel.tsx:70`, `PracticePanel.tsx:42`, `app/shared/page.tsx:58`, `app/presenter/page.tsx:547`) + CSS `task-prompt-image`.
- [ ] A3. Nội dung pilot: SVG r013 (cung quay 240°), r028 (tứ diện/chóp có giao tuyến), r108 (2 mặt phẳng song song) vào `public/content/hinh/` + `content/lessons/hki-2026-g11.json` → `node scripts/content/build-hki-catalogue.mjs`.
- [ ] A4. Verify: build sạch + serialize script ad-hoc giữ đủ `imageUrl`/`diagramUrl`.

## Phase B — Bảng ký hiệu Toán (rủi ro thấp, file mới)
- [ ] B1. `lib/lesson/math-symbols.ts`: 5 nhóm const (48 đơn, 20 trên, 20 dưới, 13 Hy Lạp, 25 ghép `#` caret) + 14 chip inline + type `MathChip`.
- [ ] B2. `components/lesson/MathSymbolSheet.tsx`: sheet mobile-first, tabs, grid 44px, giữ mở khi chèn.
- [ ] B3. `TaskInput.tsx`: hàng 14 chip + nút "√x Bảng ký hiệu" trên 3 textarea (tự luận `:1034`, cộng tác `:476`, phản tư); chèn tại selectionStart/End, caret nhảy tới `#`, trả focus.
- [ ] B4. Verify: build sạch + test chèn (đơn vị/script) + 375px không vỡ layout.

## Phase C — AI chấm rộng (rủi ro trung)
- [ ] C1. `lib/lesson/assessment-ai.js`: mode `comment_only` cho practice open (chỉ nhận xét, không pass/fail) + flag `includePractice`; prompt thêm dòng giải quy ước ký hiệu tuyến tính (`AB→`, `(SBC)`, `lim(x→+∞)`, `Cₙᵏ`, `∫ₐᵇ`, `√( )`, chỉ số trên/dưới Unicode…).
- [ ] C2. `app/api/lesson-sessions/assessment/route.js`: truyền flag + giữ idempotency/error paths.
- [ ] C3. Công tắc A "AI chấm cả bài luyện tập" trong cockpit GV (per-lesson, mặc định TẮT); nền B: practice nộp → `submitted` hoàn thành ngay, không vào "Chờ chấm".
- [ ] C4. Verify: build + QA: nộp practice → hàng chờ không tăng; tắt key → practice vẫn hoàn thành.

## Phase D — 2 hoạt động tập thể (rủi ro cao, làm cuối)
- [ ] D1. State: `classQuest` → `classQuests` array (slot 0 = giữa bài bắt buộc, slot 1 = cổng cuối tiết tuỳ chọn) + backward-compat/lenient read.
- [ ] D2. `self-pace.js`: `questGateIndex(pkg, slot)`; slot 1 = cổng cuối tiết; `initClassQuest(state, eventType, slot)`.
- [ ] D3. `runtime.js`: `CLASS_EVENT_OPEN` nhận `slot`; bắt buộc = đóng băng lớp (chặn dice/submit, PAUSE deadline — sẵn có) + đóng khi đủ thành viên hoặc lệnh GV; tuỳ chọn = tự đóng + "Bỏ qua"; đặt `classQuest.status="closed"`+`closedAt` khi event đóng (fix finding v27) cả qua lệnh/expiry/luồng đọc.
- [ ] D4. `serialize.js`: questProgress trả mảng quest (GV + HS).
- [ ] D5. `ClassEventPanel.tsx`: nhãn bắt buộc ("Hoạt động tập thể bắt buộc — cả lớp cùng vào"), nút "Bỏ qua" cho tuỳ chọn, "Kết thúc sớm" GV; sự kiện 2 = **Câu hỏi nhanh toàn lớp** (poll A/B/C/D, hiện tỷ lệ).
- [ ] D6. Verify: build + tests + QA bot 1 HS: sự kiện bắt buộc đóng khi đủ người; quest rời trạng thái `open` sau đóng (không còn kẹt).

## Deploy + QA cuối
- [ ] Build + test nguyên nhánh: `npm run build` 0 lỗi, `npm run test` pass.
- [ ] QA live phòng mới (r028): chip ký hiệu chèn đúng chuỗi + server nhận; ảnh đề hiện; practice AI nhận xét; sự kiện bắt buộc.
- [ ] Commit theo phase; không commit `qa-*.mjs`.
