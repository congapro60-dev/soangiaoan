# Task Board

> Created per session. Checked off as completed.

---

## Template (copy for each new task)

```
## [Task Name] — [Date]

### Plan
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

### Verification
- [ ] npm run build passes
- [ ] Feature works end-to-end
- [ ] Edge cases handled

### Result
_Summary after completion_
```

---

## Active Task: Fix QA đợt 9 (BAOCAO_QA_BaiHocPhanHoa_2026-07-07.md) — 2026-07-07 ✅ HOÀN TẤT (chờ lệnh push)

Nhánh: `fix/qa-dot9-conic`. Sửa TẬN GỐC theo Phần D của báo cáo (không vá riêng bài Conic).

### Nhóm 1 — D1: Module mathText (fix F1, F2, một phần F9)
- [x] Tạo `src/lib/adaptive/mathText.ts`: tokenizeMath (vùng math/text, vá `$` lẻ), transforms chạy trên token, assertClean, sanitizeDisplayText, toPlainText (heading builder)
- [x] Tạo `src/lib/adaptive/mathText.test.ts` với golden strings từ báo cáo (15 test)
- [x] Rewire `adaptiveToDewey.ts`: giữ tên hàm, đổi ruột — không đổi call site; xoá regex cũ
- [x] Portal React (`MathText`/`MathBlock`) sanitize trước ensureMathWrapped — đường render pretest F1 thật
- [x] Verify: `npm run test` PASS

### Nhóm 2 — D2: localStorage theo học sinh (fix F3, F4, F13)
- [x] `adaptiveEngine.ts`: key `dewey-notebook-v3-<lessonId>-<studentCode>`
- [x] Truyền studentCode: portal → `renderDeweyLesson` → `renderHtmlShell` → `getAdaptiveEngineScript`
- [x] F4: xác nhận chuỗi "Olympia" đã hết trong code (ghost storage) — không cần sửa thêm

### Nhóm 3 — Lỗi nhỏ render/UX
- [x] F5: fallback pack label → "Nhận biết/Thông hiểu/Vận dụng"
- [x] F12: TOC đánh số liên tục (kể cả Luyện tập/Vận dụng/Tổng kết)
- [x] F7 (D4): `navTo` cập nhật `#final-score` khi vào screen-summary
- [x] F6 (D5): wheel-rescue listener + bỏ `scroll-behavior:smooth` (không thêm overscroll-contain — giữ chain tự nhiên)
- [x] F9: builder heading dùng mathText.toPlainText

### Nhóm 4 — D6: pipeline minh bạch lỗi (F8, F10, F11)
- [x] `visual_cards_failed` ghi rõ nguyên nhân (message + nhận diện 429)
- [x] Lỗi relay personalization throw kèm body response (soi được 429 vs env var)
- [x] TikZ: validate qua Kroki lúc sinh + retry 1 lần kèm lỗi Kroki cho AI sửa (`checkTikzWithKroki` — chuyển `buildTikzKrokiUrl` sang `krokiRender.ts` thuần)

### Nhóm 5 — D1#4: sạch từ nguồn
- [x] `repairMathDeep` cuối `runAdaptivePipeline` (bỏ qua HTML/URL/TikZ/id)

### Verification
- [x] `npx tsc --noEmit` 0 lỗi + `npm run test` 131/131 PASS + `npm run build` PASS
- [x] Script render hậu kiểm (D7#4): 11/11 PASS
- [x] Cập nhật `tasks/adaptive_qa_bugs.md` (mục ĐỢT 9), HANDOFF.md (1.0i), `tasks/lessons.md` (5 quy tắc D7)
- [x] KHÔNG push main khi chưa có lệnh — đang ở nhánh `fix/qa-dot9-conic`

### Result
12/13 lỗi xử lý xong bằng 6 fix kiến trúc (D1–D6) + 2 quy trình (golden tests, repair-at-source). Còn lại cần NGƯỜI: F6/F13/F3 retest thủ công sau deploy; E9 Phần 2 + E10 nghiệm thu cần user tạo BÀI MỚI; quota Gemini 429 là vận hành (nâng billing key).

### Ghi chú
- F8/F10 phần quota 429 là VẬN HÀNH (nâng billing) — ngoài phạm vi code
- F13 (E5) retest thủ công sau khi F3 deploy; E9/E10 cần user TẠO BÀI MỚI

---

## Task cũ: Nối hình ảnh & mô phỏng vào bài Dewey ("bài toàn chữ") — 2026-06-22

Nguồn: `docs/BAOCAO_DoiChieu_App_vs_Gemini.md` + báo cáo Gemini. Gốc bệnh: hình/mô phỏng
sống ở đường render B (cổng React) nhưng bài học chính render ở đường A (Dewey HTML iframe);
template Dewey bỏ qua các slot `illustrationHtml`/`simulationHtml`/`engage.illustration`.
Phạm vi đã chốt: **cả 3 Phase**, tikzCode **render qua Kroki**.

### Phase 1 — Vá hiển thị (rủi ro thấp)
- [x] `template.ts` `renderSocraticStep`: render `step.illustrationHtml` (raw) dưới prompt
- [x] `template.ts` `renderKnowledgeUnit`: render `unit.simulationHtml` thành iframe sandbox (`renderUnitSimulation`)
- [x] `template.ts` `renderEngageIllustration`: gallery chạy sẵn qua nhánh non-image (data thô)
- [x] `htmlShell.ts`: CSS cho `.vc-gallery` + `.unit-simulation` + `.step-illustration`
- [x] `adaptiveToDewey.ts`: map `engage.visualCards` → `engage.illustration` (gallery)
- [x] `adaptiveToDewey.ts`: map `unit.simulationSpec.html?.srcDoc` → `unit.simulationHtml`
- [x] `adaptiveToDewey.ts`: tham số optional `assets` (map theo unitId) cho HTML Firestore
- [x] `AdaptiveStudentPortalPage.tsx`: `loadDeweyAssets` pre-fetch Firestore sim HTML → truyền `assets`
- [x] `npm run build` 0 lỗi

### Phase 2 — Khôi phục sinh mô phỏng tương tác (Gemini-style)
- [x] system prompt cứng: cấm `<img>`/`<image>` URL ngoài trong visual cards
- [x] call chuyên dụng `buildUnitSimulationPrompt` xuất HTML thô → `sanitizeGeneratedSimulationHtml` → `unit.simulationSpec` (htmlMiniApp); có cờ `options.generateSimulations`
- [x] geometry3d giữ đường React (bỏ qua sinh sim HTML cho unit 3D)
- [x] `npm run build` 0 lỗi

### Phase 3 — tikzCode (Kroki) + QA
- [x] tikzCode → `buildTikzKrokiUrl` (URL Kroki `tikz/svg`) → `<img>` trong `illustrationHtml`
- [x] TC4–TC8 vào `docs/features/07-adaptive-learning.md`
- [x] `npm run build` 0 lỗi

### Result
- 3 chỗ rò rỉ đã nối: visualCards→engage gallery; simulationSpec/Firestore→unit iframe; tikz→Kroki img.
- Pipeline sinh thêm mô phỏng tương tác vanilla-JS (call HTML thô, fault-isolated, cờ tắt được).
- Template Dewey nay render `illustrationHtml` + `simulationHtml` (trước đây bỏ qua dù type có sẵn).
- Build sạch 0 lỗi TS qua cả 3 lần kiểm. Cần nghiệm thu chạy thật 1 bài để xác nhận trực quan.

---


## Completed Sessions

### Puppeteer E2E Live DOM Test — 2026-05-27

- [x] Task 1: Install Puppeteer Dependency
- [x] Task 2: Create E2E Test Script `live_dom_test.js`
- [x] Task 3: Configure E2E script in `package.json`
- [x] Task 4: Run E2E Test and Verify Browser Launches
- [x] **Verification**: E2E test runs successfully against Production Vercel using `domcontentloaded` wait strategy. Safely clicks "Chế độ dùng thử", enters Dashboard, and performs sidebar navigation flow.

### QA Audit + Bug Fixes — 2026-04-21

- [x] Full codebase QA audit (18 issues found)
- [x] BUG-001: Firebase session persistence fix
- [x] BUG-002: persistSession try/catch
- [x] BUG-003: Remove console.log from gemini.ts
- [x] BUG-004: File upload size limit (20MB)
- [x] BUG-005: Bulk generation cancel button
- [x] BUG-006: API key banner shows active provider
- [x] BUG-007: Empty states in LibraryTab
- [x] BUG-008: handleRename syncs to Firestore

### Grading AI Improvements — 2026-04-21

- [x] Inline student name editing (double-click)
- [x] Custom max score input
- [x] ETA countdown during batch grading
- [x] Weakness aggregation panel (GradingWeaknessPanel)
- [x] Per-student print/PDF report

### Superpowers + CLAUDE.md Setup — 2026-04-21

- [x] Install obra/superpowers (14 skills)
- [x] Create CLAUDE.md with Anthropic internal workflow
- [x] Create tasks/lessons.md with current learned patterns
