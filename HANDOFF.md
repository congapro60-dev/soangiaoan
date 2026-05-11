# HANDOFF — Tiếp tục session

**Cập nhật**: 2026-05-11
**Mục đích**: File này để Claude Code session mới (hoặc Roo Code) đọc và tiếp tục công việc mà không cần hỏi lại context.

---

## 1. Trạng thái repo

- **Branch hiện tại**: `main`
- **Branch dev session trước**: `claude/review-api-exports-4J5Fj` (đã merge PR #3 + PR #4)
- **Commit mới nhất trên main**: `30f7d03` (sau merge PR #3)
- **Build**: clean (`npm run build` pass)

## 2. Vừa làm xong (session này)

### Fix CI TypeScript (`tsc --noEmit`) — PR #3
| Fix | Mô tả |
|-----|-------|
| `tsconfig.json` | Thêm `"exclude": ["api", "vite.config.ts"]` để tách Node.js context ra khỏi browser tsc |
| `api/*.ts` | Thêm `/// <reference types="node" />` (belt-and-suspenders cho Vercel) |
| `api/render-word-core.ts` | Fix conditional spread trong ordered list + export `normalizeLatexMarkers` |
| `src/components/modals/PushToDriveModal.tsx` | Fix `filter(Boolean)` → typed predicate `(r): r is PushFileResult` |

**Root cause**: `"types": ["vite/client"]` trong tsconfig giới hạn global types về browser only, nên `Buffer`/`process.env` trong `api/` fail. Solution: exclude `api/` và `vite.config.ts` khỏi browser tsc check.

### UI Features — PR #4
| Feature | File | Mô tả |
|---------|------|-------|
| Bot API settings | `src/components/modals/SettingsModal.tsx` | Thêm section "Bot API" với 2 input: `botApiUrl` + `botApiToken` |
| Điền trực tiếp/PPCT radio | `src/components/features/creator/LessonControls.tsx` | Radio toggle trong single mode để chọn nhập tay vs. dùng PPCT |

## 3. Việc đang chờ — Tích hợp Web ↔ Bot Telegram

### 3.1 Bối cảnh
Tích hợp `soangiaoan` (web React) với `edu-lesson-bot` (Python, Railway).
Sau khi GV soạn giáo án trên web → đẩy tự động lên Google Drive theo đúng tuần/môn.

### 3.2 Kiến trúc đã chốt

```
Web (React)
  → generate lesson với Gemini
  → export DOCX/PDF qua api/export-lesson.ts (anti đã làm)
  → POST file sang Bot endpoint
Bot (Python/Railway)
  → /api/drive/upload (FastAPI, cần thêm)
  → drive_client.py upload lên thư mục đúng tuần
Google Drive
```

**Nguyên tắc**: Bot KHÔNG gọi AI nữa — chỉ làm cầu nối Drive. Export do web tự làm (fix lỗi font/công thức).

### 3.3 TODO Web (`soangiaoan`) — còn lại

- [x] Review 5 commits export API mới của anti (`38a032e` → `8f50620`) — done trước khi fix CI
- [x] UI radio "Điền trực tiếp" vs "Lấy từ phân phối (PPCT)" — **done session này**
- [x] Modal "Đẩy lên Drive" (`PushToDriveModal.tsx`) — đã merge PR #3
- [x] Cài đặt Bot API (URL + token) trong SettingsModal — **done session này**
- [ ] Service `src/services/pushLessonToBot.ts` — gọi bot endpoint POST /api/drive/upload
- [ ] Thêm field `period?: number` vào `LessonPlan` interface — `src/types.ts:8-23`
- [ ] Wiring: nút "Đẩy lên Drive" trong PushToDriveModal gọi `pushLessonToBot.ts`

### 3.4 TODO Bot (`edu-lesson-bot`)

- [ ] FastAPI server mới `bot_api_server.py`:
  - `POST /api/lessons/check` — kiểm tra giáo án đã tồn tại trên Drive
  - `POST /api/drive/upload` — nhận file + metadata → upload Drive
- [ ] Patch `lesson_generator.py` + `drive_client.py` cho flow mới
- [ ] **User tự thêm** env var `WEB_API_TOKEN` ở Railway dashboard

## 4. Quy tắc workflow (user thiết lập — BẮT BUỘC)

1. **Auto-tạo PR sau khi push** branch — KHÔNG push thẳng main (Claude Code proxy chặn 403)
2. **Hỏi trước khi code** — đừng tự tiện sửa code khi không rõ; hỏi user trước
3. **Build phải clean** — `npm run build` 0 errors trước khi declare done
4. **Branch convention**: `claude/...` cho session branches
5. **Cập nhật `tasks/lessons.md`** sau mỗi correction từ user
6. **Plan mode** cho mọi task 3+ bước hoặc có quyết định kiến trúc
7. **Hỏi trước khi tạo file mới** ở cả 2 repo

## 5. Files quan trọng

| File | Purpose |
|------|---------|
| `src/types.ts` | `LessonPlan`, `Exam`, `ExamQuestion`, `ExamSubmission` |
| `src/hooks/useExams.ts` | Submissions CRUD, `getSubmissions(examId)` |
| `src/pages/StudentExamPage.tsx` | HS làm bài thi |
| `src/pages/StudentResultPage.tsx` | Kết quả + nút "Xem lại chi tiết" |
| `src/pages/AnswerReviewPage.tsx` | Sidebar điều hướng câu |
| `src/pages/TeacherGradingPage.tsx` | GV chấm tự luận prev/next |
| `src/utils/examImportUtils.ts` | Parse đề từ PDF/ảnh (Vision API fallback) |
| `src/utils/examScoring.ts` | THPT 2025 scoring 10/25/50/100% |
| `src/components/tabs/ExamsTab.tsx` | GV quản lý đề, stats, QR |
| `src/components/features/testing/ImportExamModal.tsx` | Import đề (PDF/Excel/Vision) |
| `src/lib/aiProviders.ts` | Multi-AI provider chain |
| `api/gemini-relay.ts` | Vercel serverless relay (đã support Vision) |
| `api/export-lesson.ts` | Export giáo án DOCX/PDF (anti vừa thêm) |
| `api/render-word.ts` + `render-word-core.ts` | Word rendering |
| `src/components/modals/SettingsModal.tsx` | AI providers config + **Bot API section** |
| `src/components/modals/PushToDriveModal.tsx` | Modal đẩy giáo án lên Drive |
| `src/components/features/creator/LessonControls.tsx` | Creator sidebar — **có radio Điền/PPCT** |
| `CLAUDE.md` | Project working guidelines |
| `tasks/lessons.md` | Patterns học được, đọc đầu session |

## 6. Roadmap còn lại

| Giai đoạn | Tính năng | Status |
|-----------|-----------|--------|
| 1 | Stats BarChart + QR | Done |
| 2 | AnswerReview + Grading page | Done |
| 3 | Excel + Vision import | Done |
| 3.5 | Export DOCX/PDF + Drive integration | In Progress |
| **4** | Anti-cheat UI, Leaderboard, AI tools | Next |
| 5 | Drill-down analytics, ExamConfigPage | Pending |
| 6 | ExamEditorPage, CreateExamPage | Pending |

Plan file gốc: `/root/.claude/plans/cozy-growing-rocket.md`

## 7. Quy ước AI

- **Web**: Gemini 3 Preview là default, fallback Claude → OpenAI → Grok → DeepSeek
- **Bot** (cũ): Claude API — sau khi tích hợp xong sẽ bỏ AI, chỉ giữ Drive client
- **Vision**: dùng Gemini 1.5 Pro hoặc Claude qua `api/gemini-relay.ts`

## 8. Cách session mới bắt đầu

1. Đọc file này (`HANDOFF.md`)
2. Đọc `CLAUDE.md` (project rules)
3. Đọc `tasks/lessons.md` (lessons học được)
4. Hỏi user: *"Tiếp tục integration bot (pushLessonToBot service + wiring Drive button), hay làm Giai đoạn 4 (anti-cheat + leaderboard)?"*
5. KHÔNG re-implement những thứ đã Done ở mục 2 và 6
