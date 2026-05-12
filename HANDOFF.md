# HANDOFF — Tiếp tục session

**Cập nhật**: 2026-05-12
**Mục đích**: File này để Claude Code session mới (đoạc Roo Code) đọc và tiếp tục công việc mà không cần hỏi lại context.

---

## 1. Trạng thái repo

- **Branch hiện tại**: `claude/review-api-exports-4J5Fj`
- **Build**: clean (`npm run build` pass)

## 2. Vừa làm xong (session 2026-05-12)

### Fix `render-word-core.ts` — render công thức thành Word equation (OMML)
| Fix | File | Mô tả |
|-----|------|-------|
| LaTeX → OMML | `api/render-word-core.ts` | Thêm pipeline KaTeX MathML → `mml2omml` → OMML `<m:oMath>` chèn vào DOCX qua `convertToXmlComponent` |
| Display math centered | `api/render-word-core.ts` | Đoạn chỉ chứa `$$...$$` → `AlignmentType.CENTER` |
| Suppress mml2omml warns | `api/render-word-core.ts` | Tạm thay `console.warn` để không spam "Type not supported: annotation" |
| New deps | `package.json` | `mathml2omml@0.5.0` + `xml-js@1.6.11` |

**Trước fix**: DOCX hiển thị `$x^2$` dạng text thô (giống wordExportA4.ts ở frontend).
**Sau fix**: DOCX có Word equation thực sự — xem được, edit được trong Microsoft Word. Trong bài test: 7 công thức ($x^2$, fraction, integral, sum, hệ phương trình) đều render đúng, kể cả trong table cell.

### Fix `/api/export-lesson` — render công thức trong PDF
| Fix | File | Mô tả |
|-----|------|-------|
| Pre-render KaTeX server-side | `api/export-lesson.ts` | Thêm `katex.renderToString()` cho `$...$` và `$$...$$` TRƯỚC marked → tránh `_*` bị marked hiểu là italic |
| Inline KaTeX CSS + fonts | `api/export-lesson.ts` | Đọc `katex.min.css` + woff2 fonts từ `node_modules`, base64 → data: URL → Lambda no-internet vẫn render được |
| Placeholder tokens | `api/export-lesson.ts` | `@@KMATH<N>@@` giữ HTML KaTeX nguyên vẹn khi qua marked |
| Wait fonts.ready | `api/export-lesson.ts` | `await document.fonts.ready` trước `page.pdf()` |
| Bỏ `normalizeLatexMarkers` import | `api/export-lesson.ts` | Logic đã chuyển vào `stashMathAsPlaceholders` (vẫn xử lý `\(...\)` + `\[...\]`) |

**Trước fix**: PDF hiển thị `$x_1^2$` thô vì MathJax CDN bị remove (Lambda no internet) + marked phá ký tự `_*`.
**Sau fix**: KaTeX render thành HTML hoàn chỉnh trong server, Chromium chỉ in PDF (không cần internet, không cần MathJax).

## 3. Vừa làm xong (session 2026-05-11)

### Fix CI TypeScript — ✅ merged
| Fix | Mô tả |
|-----|-------|
| `tsconfig.json` | `exclude: ["api", "vite.config.ts"]` — tách Node.js context |
| `api/*.ts` | `/// <reference types="node" />` |
| `api/render-word-core.ts` | Fix conditional spread + export `normalizeLatexMarkers` |
| `src/components/modals/PushToDriveModal.tsx` | Fix typed predicate `(r): r is PushFileResult` |

### UI Features — ✅ merged
| Feature | File | Mô tả |
|---------|------|-------|
| Bot API settings | `src/components/modals/SettingsModal.tsx` | Section "Bot API" với 2 input: `botApiUrl` + `botApiToken` |
| Radio Điền trực tiếp/PPCT | `src/components/features/creator/LessonControls.tsx` | Radio toggle trong single mode |

### Security/Logic fixes — ✅ merged
| Fix | File | Mô tả |
|-----|------|-------|
| Auth `Authorization: Bearer` | `src/services/pushLessonToBot.ts` | Thay `X-API-Token` bằng chuẩn Bearer token |
| `ConflictError` class | `src/services/pushLessonToBot.ts` | Throw khi server trả 409 |
| `replaceExisting` default `false` | `src/components/modals/PushToDriveModal.tsx` | Không ghi đè mặc định |
| Hộp thoại xác nhận ghi đè | `src/components/modals/PushToDriveModal.tsx` | Step `conflict` — user phải bấm "Ghi đè" để xác nhận |

## 3. Tích hợp Web ↔ Bot — ĐÃ HOÀN CHỈNH

| File | Trạng thái | Mô tả |
|------|-----------|-------|
| `src/services/pushLessonToBot.ts` | ✅ main | Export `checkLessonExists` + `pushLessonToBot` + `ConflictError` |
| `src/components/modals/PushToDriveModal.tsx` | ✅ main | Modal đẩy lên Drive, xử lý conflict |
| `app/bot_api_server.py` | ✅ main (edu-lesson-bot) | FastAPI với auth Bearer, 409 conflict, no-replace default |
| `app/drive_client.py` | ✅ main (edu-lesson-bot) | `upload_to_week_folder`, `find_week_folder` (hỗ trợ Tuần 1/01) |

## 4. Việc còn lại — CHỈ CẦU HÌNH, KHÔNG CODE

### 4.1 Cấu hình Railway (user tự làm)

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

> Folder ID lấy từ URL Drive: `https://drive.google.com/drive/folders/**{FOLDER_ID}**`

**Bước 3 — Lấy URL Railway:**
Settings → Networking → Generate Domain → copy URL dạng `https://edu-lesson-bot-production-xxxx.up.railway.app`

### 4.2 Cấu hình Settings modal trên web

1. Mở web → icon ⚙️ Cài đặt → cuộn xuống section **Bot API**
2. Nhập URL Railway (Bước 3 trên)
3. Nhập `WEB_API_TOKEN` (Bước 1 trên)
4. Click **Lưu thay đổi**

### 4.3 Kiểm tra end-to-end

1. Soạn một giáo án bất kỳ trong Creator tab
2. Click **Đẩy lên Drive**
3. Click **Kiểm tra Drive** — phải thấy thông tin thư mục tuần
4. Click **Đẩy lên Drive** — chờ 10-30s
5. Nếu file trùng tên: modal hỏi xác nhận → bấm "Ghi đè" hoặc "Huỷ"
6. Link Drive xuất hiện → click mở kiểm tra

**Lỗi thường gặp:**
- `401 Invalid or missing auth token` → sai `WEB_API_TOKEN`
- `400 Drive folder not configured` → thiếu `TDS_G1X_FOLDER_ID` trong Railway
- `409 '...' đã tồn tại` → bấm "Ghi đè" trong modal
- `500 Google credentials` → chưa cấu hình `GOOGLE_TOKEN_JSON`

## 5. Kiến trúc đã chốt

```
Web (React / Vercel)
  → soạn giáo án (Gemini AI)
  → POST /api/export-lesson  →  DOCX/PDF base64
  → POST bot/api/drive/upload (Authorization: Bearer)
    → 200: file lên Drive OK
    → 409: file trùng → modal hỏi xác nhận → push lại với replace=true

Bot (Python / Railway)
  → FastAPI server (thread) — nhận file từ web
  → GoogleDriveClient — tìm/tạo thư mục tuần, upload file
  → Telegram bot (thread) — vẫn hoạt động song song
```

## 6. Quy tắc workflow (bắt buộc)

1. Auto-tạo PR sau khi push branch — KHÔNG push thẳng main
2. Hỏi trước khi code — đừng tự tiện sửa khi không rõ
3. Build phải clean — `npm run build` 0 errors trước khi declare done
4. Branch convention: `claude/...` cho session branches
5. Cập nhật `tasks/lessons.md` sau mỗi correction từ user
6. Plan mode cho mọi task 3+ bước hoặc có quyết định kiến trúc
7. Hỏi trước khi tạo file mới ở cả 2 repo
8. Cập nhật HANDOFF.md sau mỗi session (cả 2 repo)

## 7. Files quan trọng

| File | Purpose |
|------|--------|
| `src/types.ts` | `LessonPlan`, `Exam`, `AppData` (có `botApiUrl`, `botApiToken`) |
| `src/services/pushLessonToBot.ts` | Service gọi bot API — export/upload DOCX+PDF, `ConflictError` |
| `src/components/modals/SettingsModal.tsx` | AI config + **Bot API section** |
| `src/components/modals/PushToDriveModal.tsx` | Modal đẩy giáo án — xử lý conflict 409 |
| `src/components/features/creator/LessonControls.tsx` | Creator sidebar — radio Điền/PPCT |
| `api/export-lesson.ts` | Vercel serverless — export DOCX/PDF |
| `app/bot_api_server.py` | FastAPI: `/api/lessons/check` + `/api/drive/upload` (409 conflict) |
| `app/drive_client.py` | `GoogleDriveClient` — `upload_to_week_folder`, `find_week_folder` |
| `app/main.py` | Entrypoint — start FastAPI thread + Telegram bot |
| `CLAUDE.md` | Project working guidelines |
| `tasks/lessons.md` | Patterns học được, đọc đầu session |

## 8. Roadmap còn lại

| Giai đoạn | Tính năng | Status |
|-----------|-----------|--------|
| 1 | Stats BarChart + QR | Done |
| 2 | AnswerReview + Grading page | Done |
| 3 | Excel + Vision import | Done |
| 3.5 | Export DOCX/PDF + Drive integration | **Done** (chỉ còn cấu hình Railway) |
| **4** | Anti-cheat UI, Leaderboard, AI tools | Next |
| 5 | Drill-down analytics, ExamConfigPage | Pending |
| 6 | ExamEditorPage, CreateExamPage | Pending |

## 9. Cách session mới bắt đầu

1. Đọc file này (`HANDOFF.md`)
2. Đọc `CLAUDE.md` (project rules)
3. Đọc `tasks/lessons.md` (lessons học được)
4. Hỏi user: *"Cấu hình Railway xong chưa? Hay tiếp tục Giai đoạn 4 (anti-cheat + leaderboard)?"*
5. KHÔNG re-implement những thứ đã Done
