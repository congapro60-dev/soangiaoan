# HANDOFF — Tiếp tục session

**Cập nhật**: 2026-05-11
**Mục đích**: File này để Claude Code session mới (hoặc Roo Code) đọc và tiếp tục công việc mà không cần hỏi lại context.

---

## 1. Trạng thái repo

- **Branch hiện tại**: `main`
- **Branch dev session trước**: `claude/review-github-project-IgI1M` (đã merge)
- **Commit mới nhất**: `8f50620` "Add lesson export API for Word and PDF"
- **Build**: clean (`npm run build` pass)

## 2. Vừa làm xong (session trước)

QA review code update của "anti" — fix 8 bugs đã merge PR commit `b69b4ce`:

| Bug | File | Mô tả |
|-----|------|-------|
| B2 | `src/pages/StudentExamPage.tsx` | `submittedRef.current = true` đặt sau guard |
| B3 | `src/utils/examImportUtils.ts` | JSON repair regex cho `\frac`/`\sqrt` |
| Progress bar | `src/components/features/testing/ImportExamModal.tsx` | `setInterval` trước `await` |
| T/F padding | ImportExamModal | `Array.from({ length: 4 }, ...)` |
| Race | StudentExamPage | bỏ `tabSwitches` khỏi autosave deps |
| CSS print | `src/index.css` | bỏ `[class*="z-"]` quá rộng |
| Paste/file | ImportExamModal | `e.preventDefault()` + `e.target.value = ''` |
| Canvas leak | examImportUtils | `canvas.width = 0` sau `toDataURL` |

Sau đó "anti" đã commit thêm 5 commits (`38a032e` → `8f50620`) tạo API export DOCX/PDF — **chưa review**, nên kiểm thử trước khi build tiếp.

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

### 3.3 TODO Web (`soangiaoan`)

- [ ] Review 5 commits export API mới của anti (`38a032e` → `8f50620`)
- [ ] Thêm field `period?: number` vào `LessonPlan` interface — `src/types.ts:8-23`
- [ ] UI radio trong Creator tab: "Điền trực tiếp" vs "Lấy từ phân phối (PPCT)"
- [ ] Modal "Đẩy lên Drive" — chọn lớp/tuần/chương trình
- [ ] Service `src/services/pushLessonToBot.ts` — gọi bot endpoint

### 3.4 TODO Bot (`edu-lesson-bot` — cần session mới có access)

- [ ] FastAPI server mới `bot_api_server.py`:
  - `POST /api/lessons/check` — kiểm tra giáo án đã tồn tại trên Drive
  - `POST /api/drive/upload` — nhận file + metadata → upload Drive
- [ ] Patch `lesson_generator.py` + `drive_client.py` cho flow mới
- [ ] **User tự thêm** env var `WEB_API_TOKEN` ở Railway dashboard

## 4. Quy tắc workflow (user thiết lập — BẮT BUỘC)

1. **Auto-tạo PR sau khi push** branch — KHÔNG push thẳng main (Claude Code proxy chặn 403)
2. **Hỏi "anti" trước khi code** — đừng tự tiện sửa code khi không rõ
3. **Build phải clean** — `npm run build` 0 errors trước khi declare done
4. **Branch convention**: `claude/...` cho session branches
5. **Cập nhật `tasks/lessons.md`** sau mỗi correction từ user
6. **Plan mode** cho mọi task 3+ bước hoặc có quyết định kiến trúc

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
| `CLAUDE.md` | Project working guidelines |
| `tasks/lessons.md` | Patterns học được, đọc đầu session |

## 6. Roadmap còn lại

| Giai đoạn | Tính năng | Status |
|-----------|-----------|--------|
| 1 | Stats BarChart + QR | Done |
| 2 | AnswerReview + Grading page | Done |
| 3 | Excel + Vision import | Done |
| **4** | Anti-cheat UI, Leaderboard, AI tools | Next |
| 5 | Drill-down analytics, ExamConfigPage | Pending |
| 6 | ExamEditorPage, CreateExamPage | Pending |

Plan file gốc: `/root/.claude/plans/cozy-growing-rocket.md`

## 7. Quy ước AI

- **Web**: Gemini 3 Preview là default, fallback Claude → OpenAI → Grok → DeepSeek
- **Bot** (cũ): Claude API — sau khi tích hợp xong sẽ bỏ AI, chỉ giữ Drive client
- **Vision**: dùng Gemini 1.5 Pro hoặc Claude qua `api/gemini-relay.ts`

## 8. Phân chia công việc — Claude Code vs Roo Code (VSCode)

### Claude Code (session mới — 2 repo)
Phụ trách toàn bộ phần **web** (`soangiaoan`):
- Review + fix bugs export API của anti
- Thêm `period` field, UI radio "Điền trực tiếp / Lấy từ PPCT"
- Modal "Đẩy lên Drive" + service `pushLessonToBot.ts`
- Giai đoạn 4: anti-cheat UI, leaderboard, AI tools
- Mọi PR, commit, build verification

### Roo Code (VSCode — repo `edu-lesson-bot`)
Phụ trách toàn bộ phần **bot** (Python/Railway):
- Tạo `bot_api_server.py` (FastAPI)
- Refactor `drive_client.py`
- Update `requirements.txt` + `Procfile`/`railway.toml`
- KHÔNG động vào Telegram bot logic hiện tại

### Quy trình phối hợp
1. Claude Code viết spec API (endpoint URL, request/response schema)
2. Claude Code share spec → Roo Code implement bot endpoint
3. Sau khi bot deploy → Claude Code implement phần web gọi bot
4. Test end-to-end: GV soạn xong → click "Đẩy lên Drive" → file xuất hiện trên Drive đúng tuần

---

## 9. Cách session mới bắt đầu

1. Đọc file này (`HANDOFF.md`)
2. Đọc `CLAUDE.md` (project rules)
3. Đọc `tasks/lessons.md` (lessons học được)
4. **Ưu tiên**: Fix bugs export API của anti trước (mục 3.3 — review 5 commits), build clean
5. Sau đó hỏi user muốn tiếp tục integration bot hay Giai đoạn 4
6. KHÔNG re-implement những thứ đã Done ở mục 2 và 6

---

## 10. Prompt sẵn cho Roo Code (VSCode — repo edu-lesson-bot)

> Paste nguyên đoạn này vào Roo Code chat khi mở repo `edu-lesson-bot`:

---

Tôi đang tích hợp bot này với web app `soangiaoan` (React/Vercel).

**Kiến trúc đã chốt**:
- Web tự generate + export DOCX/PDF (đã có `api/export-lesson.ts` bên web)
- Web sẽ POST file + metadata sang bot
- Bot KHÔNG gọi AI — chỉ làm cầu nối Google Drive

**Phân chia**: Claude Code (web) sẽ viết spec API cho tôi trước. Bạn (Roo Code) sẽ implement bot endpoint theo spec đó.

**Việc cần chuẩn bị ngay**:
1. Đọc toàn bộ `drive_client.py` — hiểu interface upload + folder mapping tuần/môn
2. Đọc `app/main.py` — hiểu cách bot đang chạy
3. Đọc `requirements.txt` + `railway.toml`/`Procfile`
4. Báo cáo: drive_client hiện có hàm upload nào? Folder structure trên Drive là gì?

**Chưa code gì** — chỉ đọc và báo cáo. Claude Code sẽ gửi spec API sau khi review web xong.

---
