# Chính sách API key riêng (branch: feat/require-own-api-key) — 2026-07-21

User quyết định: bỏ TOÀN BỘ key dự phòng phía giáo viên — ai dùng AI phải nhập key riêng.

- [x] aiProviders: xóa ROUTER_POOLS (key chia sẻ hardcode) + provider free-router + mọi
      fallback relay (no-key/quota/vision/stream). Thêm `assertOwnApiKey` chặn sớm với
      thông báo hướng dẫn; `isMissingApiKeyError` để UI hiện nguyên văn.
- [x] GIỮ `/api/gemini-relay` CÓ CHỦ ĐÍCH — chỉ phục vụ cổng học sinh (chấm ảnh bài làm +
      cá nhân hóa PA3, học sinh không thể có key). Không đụng generate-simulation (server
      key, giáo viên bấm) — chờ user quyết riêng.
- [x] Settings: bỏ tab Router Free; migrate settings cũ 'free-router' → gemini (chống crash).
- [x] Banner App/AITools/Exams: đổi thông điệp "cần API key của riêng bạn".
- [x] types.ts + apiLimits.ts: bỏ 'free-router' khỏi union.
- [x] E2E Browser pane: banner mới ✅; Settings không crash với settings cũ ✅; generate
      không key → 0 request mạng + toast hướng dẫn nguyên văn ✅.
- [x] tsc 0 lỗi; 185/185 test; build OK.
- [x] Cập nhật prompt cowork (relay key giờ CHỈ cho cổng học sinh) + memory api-key-backup-co-y.

---

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

## 4. Verify ✅
- [x] `npx tsc --noEmit` sạch (sau khi exclude `outputs/`, `test_downloads/` — file scratch gây lỗi pre-existing).
- [x] `npm run test` xanh: 185/185, 28 file.
- [x] `npm run build` OK (warning chunk-size là pre-existing).
- [x] Smoke test thực chiến (`npx tsx` trên `docs/giaoan_mau_test.md`): gate bắt 7 failure
      vào diện repair (gồm 2 tiêu chí mới teacher-script + worksheet-appendix);
      success-criteria trả warn đúng độ nhạy (có mục tiêu, thiếu tiêu chí thành công → không phạt oan).
      Slide gate bắt đúng 3 blocking trên slide draft lỗi cài sẵn.
- [x] Commit `303d35b` trên branch feat/track-a-quality-gates (CHƯA push main).

## 5. E2E thực chiến trong app thật (Browser pane, demo mode) ✅
- [x] Dev-proxy `/api` → https://giaoandewey.vercel.app trong vite.config (Vite không serve Vercel Function).
- [x] Luồng Text-to-Slide chạy thật: paste giáo án → generate → **gate bắt lỗi → gọi repair → nhận bản sửa**
      (quan sát 2 AI call: generate + repair; AI stub qua fetch-intercept vì relay prod đang cạn quota).
- [x] Preview board render bản ĐÃ SỬA với KaTeX; bấm "Tải file PPTX" → blob 86.895 bytes đúng MIME.
- [x] File `outputs/slide_tile_thuc_e2e.pptx`: zip OK, 6 slide + 6 notes; slide 3 chứa tiêu đề ngắn đã sửa,
      KHÔNG còn bản lỗi 7 bullet/title 79 ký tự.
- ⚠️ Phát hiện prod: relay https://giaoandewey.vercel.app/api/gemini-relay trả 500
      "All fallback providers exhausted" — giáo viên không có key cá nhân hiện KHÔNG gọi được AI.
- ⚠️ free-router pool (MiniMax/Conduit) lỗi "Connection error" khi gọi từ browser (khả năng CORS).

## 6. Fix tràn tiêu đề PPTX + Ship ✅
- [x] QA bằng mắt (LibreOffice→PNG) bắt lỗi title 33 ký tự tràn thanh xanh → fix co font
      bậc thang 32/26/22pt + siết maxTitleChars 64→48 (`a1bbf55`). Verify render v2: 1 dòng gọn.
- [x] Full suite 185/185, tsc 0 lỗi, build OK.
- [x] Push `feat/track-a-quality-gates` + merge `main` + push (user ra lệnh "làm hết").
- [x] Vercel deploy XÁC NHẬN: prod serve `index-D42gwlsR.js` chứa marker gate code.
- [x] Viết prompt cowork: `tasks/prompt_cowork_fix_relay_va_test_live.md`
      (Việc 1: thay GEMINI_FALLBACK_KEY/GROK_FALLBACK_KEY/DEEPSEEK_FALLBACK_KEYS trong
      Vercel env + redeploy; Việc 2: test live model thật; Việc 3: kiểm CORS free-router).
- [ ] CHỜ COWORK/USER: relay prod vẫn 500 "All fallback providers exhausted" — AI trên
      production chưa dùng được cho user không có key cá nhân.

## Ghi chú kiến trúc (chốt với user)
- Track B để ở branch `academic-os-next`, tài liệu đặt tại `docs/architecture/academic-os/`
  (vision/, knowledge-base/, rule-registry/, subject-packs/, design-system/) — KHÔNG tạo
  thư mục academic-os trong src/. src/ chỉ chứa code đang chạy.
