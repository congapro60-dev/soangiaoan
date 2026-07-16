# Track A — Product Quality Gates (branch: feat/track-a-quality-gates)

Nguồn tiêu chí: skill `lesson-plan-generator` + `ultimate-slides` (đọc từ ~/.gemini/config/skills).
Nguyên tắc: tái dùng hạ tầng audit + repair loop đã có, KHÔNG destabilize luồng Toán mature.

## 1. Mở rộng mathStandards.ts (giáo án) ✅
- [x] `checkLearningIntentionSuccessCriteria` (id `success-criteria`) — WALT/WILF hoặc tiêu chí thành công. medium.
- [x] `checkTeacherScript` (id `teacher-script`) — cột hoạt động có thoại/câu hỏi GV cụ thể. medium.
- [x] `checkWorksheetAppendix` (id `worksheet-appendix`) — Phiếu học tập ở Phụ lục. medium.
- Placeholder: ĐÃ CÓ (`no-internal-instructions`) → không nhân bản.
- Learning Objectives: ĐÃ CÓ (`differentiated-objectives`) → không nhân bản.
- [x] Detector nhận biến thể tiếng Việt để giáo án tốt vẫn PASS.

## 2. Gate repair (toanLessonQuality.ts) ✅
- [x] Whitelist 3 id medium mới vào diện auto-repair (`REPAIRABLE_MEDIUM_IDS`).
- [x] Giữ nguyên hành vi cho các medium cũ (test khẳng định guiding-questions không vào repair).
- [x] Cập nhật COMPLETE_KNOWLEDGE fixture (thêm Phiếu học tập) để "giáo án đủ vẫn passed".
- [x] Test mới: giáo án thiếu 3 tiêu chí → failures chứa đúng id. (8/8 pass)

## 3. Slide Quality Gateway (slideQuality.ts — file mới) ✅
- [x] Audit JSON slide: title dài, >6 bullet, bullet dài, text density, thiếu visualSuggestion. LaTeX không tính độ dài.
- [x] `buildSlideRepairBrief` — giữ số lượng slide, đính kèm JSON.
- [x] Wire `applySlideQualityGate` vào CẢ generateSlideData + generateTextToSlideData: audit → repair → audit lại.
- [x] Test golden cho slideQuality. (9/9 pass)

## 4. Verify
- [ ] `npx tsc --noEmit` sạch. (đang chờ classifier)
- [ ] `npm run test` xanh (toàn bộ suite).
