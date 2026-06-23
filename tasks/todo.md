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

## Active Task: Nối hình ảnh & mô phỏng vào bài Dewey ("bài toàn chữ") — 2026-06-22

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
