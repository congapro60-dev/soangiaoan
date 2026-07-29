# Sửa lỗi QA module dự giờ Danielson — 2026-07-28

Nguồn: báo cáo QA module dự giờ Danielson do owner cung cấp ngày 2026-07-28.

- [x] P0: sửa `allow list` của tổ trưởng dùng `resource.data.nguoiDuUid`.
- [x] P1: thêm test list cho BGH/tổ trưởng có và không có bộ lọc hợp lệ.
- [x] P1: bắt buộc và đóng băng `gvUid`.
- [x] P2: thêm test vai trò `giao_vien` không được tạo/sửa.
- [x] P2: thêm composite index `duGio(nguoiDuUid ASC, ngay DESC)`.
- [x] P2: thêm tài liệu thiết kế và kế hoạch triển khai.
- [x] Nit: khai báo Node types cục bộ cho `scripts/gan-vai-tro.ts`.
- [x] Verify: rules tests 28/28, unit tests 196/196, lint, build và code review đều đạt.

## Review

- TDD RED: 3 lỗi được tái hiện đúng — list hợp lệ của tổ trưởng bị deny, thiếu `gvUid` vẫn create được, đổi `gvUid` vẫn update được.
- TDD GREEN: Firestore emulator đạt 28/28 ca.
- Full suite: 196/196 unit tests; TypeScript lint exit 0; Vite build exit 0; main entry 974.15 KB.
- Code review độc lập: không có Critical/Important; một lỗi tài liệu Minor đã sửa.

---

# Cập nhật model Gemini mới nhất (Gemini 3.6 Flash) — 2026-07-22

Nguồn: 2 ảnh user gửi (email Google Developers) + tra cứu web. Google phát hành 21/07/2026:
Gemini 3.6 Flash (`gemini-3.6-flash`) + Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`).

- [x] `src/data/models.ts`: thêm `gemini-3.6-flash` (isLatest, flagship) lên đầu; `gemini-3.5-flash`
      tụt xuống (gỡ isLatest, gỡ tag flagship); thay `gemini-3.1-flash-lite` → `gemini-3.5-flash-lite`.
- [x] `src/lib/gemini.ts`: `DEFAULT_GEMINI_RUNTIME_MODEL` = `gemini-3.6-flash` (user chốt);
      runtime list giữ lại 3.5-flash làm lựa chọn, thay flash-lite cũ.
- [x] Bỏ qua `gemini-3.5-flash-cyber` (chuyên dò lỗ hổng bảo mật, không liên quan app giáo dục).
- [x] tsc 0 lỗi; 196/196 test (31 file).
- [x] E2E Browser pane (demo mode → Cài đặt → AI Providers): danh sách Gemini render đúng thứ tự
      3.6 Flash → 3.5 Flash → 3.1 Pro Preview → 3 Flash Preview → 3.5 Flash-Lite → 2.5 ×3;
      3.6 Flash gắn nhãn "Mặc định runtime an toàn"; không còn 3.1 Flash-Lite; 0 console error
      liên quan model (chỉ có Firebase permission-denied do demo mode chưa đăng nhập).
- ⚠️ CHƯA ĐỤNG: `src/lib/adaptive/studentAiKey.ts:62` vẫn hardcode fallback `gemini-2.5-flash`
      cho chấm ảnh cổng học sinh — ngoài phạm vi "model trong Cài đặt", chờ user quyết.

---

# Cổng học sinh: key AI riêng của học sinh (branch: fix/format-agent-fallback) — 2026-07-21 lần 2

User làm rõ thêm: cổng học sinh CŨNG phải để học sinh tự nhập API key (free hoặc do giáo
viên phát), KHÔNG phải giữ relay key server như dự định trước.

- [x] `src/lib/adaptive/studentAiKey.ts` (mới) — get/setStudentAiKey (localStorage),
      callStudentGemini (gọi @google/genai trực tiếp, text + optional ảnh),
      isStudentKeyMissingError. 4 test (localStorage stub vì vitest environment=node).
- [x] AdaptiveStudentPortalPage: thêm ô nhập/lưu API key ở màn Bước 1 (cạnh Họ tên/Lớp/Mã HS),
      link lấy key free, ghi rõ "không có key vẫn học được, chỉ mất tính năng AI".
- [x] Thay 2 điểm gọi `/api/gemini-relay` (chấm ảnh bài làm + cá nhân hóa PA3) bằng
      `callStudentGemini`; không có key → cá nhân hóa fallback về bài gốc (im lặng, đúng thiết
      kế sẵn có "falls back to original lesson"); chấm ảnh → hiện message hướng dẫn nhập key.
- [x] XÓA `api/gemini-relay.ts` — không còn ai gọi (client giáo viên đã bỏ ở bước trước; giờ
      client học sinh cũng bỏ). Giảm 1 Vercel Function (9 → 8), đóng luôn cổng có thể bị dò quét.
- [x] Cập nhật lại prompt cowork: bỏ hẳn "Việc 1 sửa key Vercel" (không còn cần), đổi thành
      test live ô nhập key học sinh.
- [x] Cập nhật memory `api-key-backup-co-y.md` (ghi rõ 2 bước đảo chính sách trong cùng phiên).
- [x] E2E Browser pane: panel API key render đúng vị trí trên `/adaptive-portal` (sample lesson);
      lưu key → localStorage đúng; reload → key được nhớ lại vào ô input; 0 network request
      ra gemini-relay sau khi xóa key.
- [x] tsc 0 lỗi; 193/193 test (30 file); build OK.

---

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
# Live QA: student-owned AI key + teacher slide export — 2026-07-21

- [x] Pre-flight: 193/193 unit tests pass; build succeeds; commit `1fce655`; main index 965.27 KB.
- [x] Production student portal: API-key field/link/save feedback/persistence verified in Chrome.
- [x] Production student flow: completed pre-test and reached the Advanced routed lesson; no console errors.
- [ ] **FAIL/BLOCKED** Production image grading: Dewey conversion drops `responseMode: image_upload`; `InteractiveWorkedExampleCard` is defined but never rendered, so upload/grading UI is unreachable.
- [x] Production teacher flow (continued by user request): personal Gemini key active; Text-to-Slide generated an 8-slide draft and downloaded `baigiang.pptx` without console errors.
- [x] Inspect PPTX: valid 121,466-byte file; 9 rendered pages (1 cover + 8 content); automated overflow test passed; all content titles fit and bullet counts are 4/3/4/4/4/3/4/3 (all <= 6). Minor: cover title is generic `baigiang` instead of the lesson title.
- [x] Capture screenshots and write QA sign-off with PASS/FAIL/NOT RUN evidence.
- [x] Tạo báo cáo bàn giao lỗi cho Claude Code: `docs/BAOCAO_QA_PRODUCTION_PORTAL_HOC_SINH_VA_SLIDE_2026-07-21.md`.

---
