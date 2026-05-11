# HANDOFF — Tiếp tục session

**Cập nhật**: 2026-05-11
**Mục đích**: File này để Claude Code session mới (hoặc Roo Code) đọc và tiếp tục công việc mà không cần hỏi lại context.

---

## 1. Trạng thái repo

- **Branch hiện tại**: `main` (sau khi merge PR #3)
- **Branch đang chờ merge**: `claude/review-api-exports-4J5Fj` → PR #4
- **Build**: clean (`npm run build` pass)
- **CI verify**: pass (tsconfig exclude fix)

## 2. Vừa làm xong (session này)

### Fix CI TypeScript (`tsc --noEmit`) — PR #3 ✅
| Fix | Mô tả |
|-----|-------|
| `tsconfig.json` | Thêm `"exclude": ["api", "vite.config.ts"]` — tách Node.js context ra khỏi browser tsc |
| `api/*.ts` | Thêm `/// <reference types="node" />` (belt-and-suspenders cho Vercel) |
| `api/render-word-core.ts` | Fix conditional spread trong ordered list + export `normalizeLatexMarkers` |
| `src/components/modals/PushToDriveModal.tsx` | Fix `filter(Boolean)` → typed predicate `(r): r is PushFileResult` |

**Root cause**: `"types": ["vite/client"]` giới hạn global types về browser only → `Buffer`/`process.env` trong `api/` fail. Solution: exclude `api/` và `vite.config.ts` khỏi browser tsc check.

### UI Features — PR #4 (đang chờ merge) ⏳
| Feature | File | Mô tả |
|---------|------|-------|
| Bot API settings | `src/components/modals/SettingsModal.tsx` | Thêm section "Bot API" với 2 input: `botApiUrl` + `botApiToken` |
| Điền trực tiếp/PPCT radio | `src/components/features/creator/LessonControls.tsx` | Radio toggle trong single mode — chọn nhập tay vs. dùng PPCT |

### Tích hợp Web ↔ Bot — ĐÃ HOÀN CHỈNH ✅
Kiểm tra lại toàn bộ codebase — tất cả đã có sẵn từ trước, **không cần code thêm**:

| File | Trạng thái | Mô tả |
|------|-----------|-------|
| `src/services/pushLessonToBot.ts` | ✅ Có trên main | Export `checkLessonExists` + `pushLessonToBot` + 4 types |
| `src/components/modals/PushToDriveModal.tsx` | ✅ Có trên main | UI modal đẩy lên Drive, đã wired hoàn toàn |
| `app/bot_api_server.py` | ✅ Có trên main | FastAPI với `POST /api/lessons/check` + `POST /api/drive/upload` + CORS |
| `app/drive_client.py` | ✅ Có trên main | `GoogleDriveClient` với `upload_file`, `get_or_create_child_folder` |
| `app/main.py` | ✅ Có trên main | Start FastAPI server (thread) + Telegram bot song song |
| `requirements.txt` | ✅ Có trên main | `fastapi>=0.115`, `uvicorn[standard]>=0.30`, `python-multipart>=0.0.9` |
| `src/types.ts` | ✅ Có trên main | `LessonPlan` đã có `period?: number` |

## 3. Việc còn lại — CHỈ CẦU HÌNH, KHÔNG CODE

### 3.1 Cấu hình Railway (user tự làm)

**Bước 1 — Sinh token:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**Bước 2 — Thêm env vars trên Railway dashboard** (service `edu-lesson-bot` → tab Variables):

| Biến | Giá trị |
|------|--------|
| `WEB_API_TOKEN` | Chuỗi token từ Bước 1 |
| `TDS_G10_FOLDER_ID` | ID thư mục Drive giáo án TDS Lớp 10 |
| `TDS_G11_FOLDER_ID` | ID thư mục Drive giáo án TDS Lớp 11 |
| `TDS_G12_FOLDER_ID` | ID thư mục Drive giáo án TDS Lớp 12 |
| `MOET_G10_FOLDER_ID` | *(tuỳ chọn)* ID thư mục MOET Lớp 10 |
| `MOET_G11_FOLDER_ID` | *(tuỳ chọn)* ID thư mục MOET Lớp 11 |
| `MOET_G12_FOLDER_ID` | *(tuỳ chọn)* ID thư mục MOET Lớp 12 |

> Folder ID lấy từ URL Drive: `https://drive.google.com/drive/folders/**{FOLDER_ID}**`

**Bước 3 — Lấy URL Railway:**  
Settings → Networking → Generate Domain → copy URL dạng `https://edu-lesson-bot-production-xxxx.up.railway.app`

### 3.2 Cấu hình Settings modal trên web (sau khi merge PR #4)

1. Mở web → icon ⚙️ Cài đặt → cuộn xuống section **Bot API**
2. Nhập URL Railway (Bước 3 trên)
3. Nhập `WEB_API_TOKEN` (Bước 1 trên)
4. Click **Lưu thay đổi**

### 3.3 Kiểm tra end-to-end

1. Soạn một giáo án bất kỳ trong Creator tab
2. Click **Đẩy lên Drive**
3. Click **Kiểm tra Drive** — phải thấy thông tin thư mục tuần
4. Click **Đẩy lên Drive** — chờ 10-30s (export DOCX/PDF + upload)
5. Link Drive xuất hiện → click mở kiểm tra

**Lỗi thường gặp:**
- `401 Invalid or missing X-API-Token` → sai `WEB_API_TOKEN`
- `400 Drive folder not configured` → thiếu `TDS_G1X_FOLDER_ID` trong Railway
- `500 Google credentials` → chưa cấu hình `GOOGLE_TOKEN_JSON` / `GOOGLE_CREDENTIALS_JSON`

## 4. Kiến trúc đã chốt

```
Web (React / Vercel)
  → soạn giáo án (Gemini AI)
  → POST /api/export-lesson  →  DOCX/PDF base64
  → POST bot/api/drive/upload (X-API-Token)  →  file lên Drive

Bot (Python / Railway)
  → FastAPI server (thread) — nhận file từ web
  → GoogleDriveClient — tìm/tạo thư mục tuần, upload file
  → Telegram bot (thread) — vẫn hoạt động song song

Google Drive
  → Cấu trúc: Root → Lớp {10/11/12} → Tuần {01..40} → file.docx/pdf
```

**Nguyên tắc**: Bot KHÔNG gọi AI nữa — chỉ làm cầu nối Drive.

## 5. Quy tắc workflow (user thiết lập — BẮT BUỘC)

1. **Auto-tạo PR sau khi push** branch — KHÔNG push thẳng main
2. **Hỏi trước khi code** — đừng tự tiện sửa khi không rõ
3. **Build phải clean** — `npm run build` 0 errors trước khi declare done
4. **Branch convention**: `claude/...` cho session branches
5. **Cập nhật `tasks/lessons.md`** sau mỗi correction từ user
6. **Plan mode** cho mọi task 3+ bước hoặc có quyết định kiến trúc
7. **Hỏi trước khi tạo file mới** ở cả 2 repo

## 6. Files quan trọng

| File | Purpose |
|------|---------|
| `src/types.ts` | `LessonPlan`, `Exam`, `AppData` (có `botApiUrl`, `botApiToken`) |
| `src/services/pushLessonToBot.ts` | Service gọi bot API — export/upload DOCX+PDF |
| `src/components/modals/SettingsModal.tsx` | AI config + **Bot API section** (URL + token) |
| `src/components/modals/PushToDriveModal.tsx` | Modal đẩy giáo án lên Drive — đã hoàn chỉnh |
| `src/components/features/creator/LessonControls.tsx` | Creator sidebar — **radio Điền/PPCT** |
| `api/export-lesson.ts` | Vercel serverless — export DOCX (docx) hoặc PDF (puppeteer) |
| `api/render-word.ts` + `render-word-core.ts` | Word rendering pipeline |
| `app/bot_api_server.py` | FastAPI: `/api/lessons/check` + `/api/drive/upload` |
| `app/drive_client.py` | `GoogleDriveClient` — upload, tạo thư mục, find file |
| `app/main.py` | Entrypoint — start FastAPI thread + Telegram bot |
| `CLAUDE.md` | Project working guidelines |
| `tasks/lessons.md` | Patterns học được, đọc đầu session |

## 7. Roadmap còn lại

| Giai đoạn | Tính năng | Status |
|-----------|-----------|--------|
| 1 | Stats BarChart + QR | Done |
| 2 | AnswerReview + Grading page | Done |
| 3 | Excel + Vision import | Done |
| 3.5 | Export DOCX/PDF + Drive integration | **Done** (chỉ còn cấu hình Railway) |
| **4** | Anti-cheat UI, Leaderboard, AI tools | Next |
| 5 | Drill-down analytics, ExamConfigPage | Pending |
| 6 | ExamEditorPage, CreateExamPage | Pending |

## 8. Cách session mới bắt đầu

1. Đọc file này (`HANDOFF.md`)
2. Đọc `CLAUDE.md` (project rules)
3. Đọc `tasks/lessons.md` (lessons học được)
4. Hỏi user: *"PR #4 đã merge chưa? Cấu hình Railway xong chưa? Hay tiếp tục Giai đoạn 4 (anti-cheat + leaderboard)?"*
5. KHÔNG re-implement những thứ đã Done
