# Lessons Learned

> Updated after every correction. Reviewed at session start.

---

## TypeScript

- **setBulkProgress reset must include all fields** — `{ current: 0, total: 0, currentTitle: '' }` not just `{ current: 0, total: 0 }`. Local Vite build passes but GitHub CI (strict tsc) catches it. Always run `npx tsc --noEmit` before committing. *(2026-04-21)*

- **`replace_all: false` fails when string appears twice** — When using Edit tool, if `old_string` matches more than once the edit fails. Add more surrounding context to make it unique. *(2026-04-21)*

## Firebase

- **`browserSessionPersistence` logs users out on tab close** — Use `browserLocalPersistence` (Firebase default) unless logout-on-close is intentional. *(2026-04-21)*

- **Firestore writes need try/catch + user feedback** — Silent failures destroy trust. Always wrap `setDoc`/`deleteDoc` in try/catch and show error toast on failure. *(2026-04-21)*

## React / State

- **Rename in view mode must sync to Firestore** — When updating `data.gradingSessions` via `setData`, also call `persistSession(updatedSession)` to write through to Firestore. Local state update alone is lost on reload. *(2026-04-21)*

- **Bulk loop needs cancel ref reset at start** — Set `cancelBulkRef.current = false` before the loop begins, otherwise a previous cancel bleeds into the next run. *(2026-04-21)*

## Git Workflow

- **NEVER push to `main` without explicit user order** — All development stays on feature branch. Only push to `main` when user explicitly says "push to main" / "merge" / "ra lệnh". The stop-hook warning is not a reason to push to main automatically. *(2026-04-28)*

## Adaptive / Nội dung Toán học

- **Chọn loại mô phỏng theo ĐÚNG phân môn Toán, không suy từ keyword rời** — Bài Xác suất bị nhét mô hình hình học 3D vì regex bắt cụm "không gian mẫu" thành "không gian" (hình học). Token rời như "không gian", "mặt phẳng", "đường thẳng", "tọa độ" xuất hiện ở nhiều phân môn → đoán loại học liệu bằng chúng là sai bản chất. Nguyên tắc: (1) để AI tự chọn học liệu theo phân môn qua bảng "phân môn → loại học liệu" trong prompt; (2) heuristic code chỉ là fallback BẢO THỦ — chỉ dựng hình học khi có tên hình cụ thể (hình chóp/tam giác/đường tròn…), mơ hồ thì trả undefined; (3) chặn trước các phân môn phi-hình-học (xác suất/thống kê/tổ hợp/giải tích) trước khi xét hình học. Vị trí: `adaptiveFromLessonPlan.ts` `buildDefaultSimulationSpec` + `buildGeometry3DSimulationSpecFromJson` + prompt unit/sim. *(2026-06-24)*

## Firestore Rules

- **Cổng học sinh là link công khai → rule phải cho đọc ẩn danh có điều kiện** — `adaptiveLessons` chỉ `allow read: if request.auth != null` chặn học sinh ẩn danh (quét QR) → cổng "Không tìm thấy bài học". Doc bật cổng (ghi bởi AdaptiveLearningTab) là dạng bọc có `portalEnabled: true`. Fix: `allow read: if request.auth != null || resource.data.get('portalEnabled', false) == true;` (chỉ lộ bài đã bật cổng). Dùng `.get(key, default)` để không lỗi eval khi field vắng. Nhớ `firebase deploy --only firestore:rules`. *(2026-06-24)*

## Workflow / Testing

- **Test bài học phân hóa PHẢI đóng vai học sinh học thật, không chỉ soi DOM** — Đếm số `.sim-frame`/`.vc-gallery` qua DOM KHÔNG phát hiện được: gợi ý/đáp án là placeholder, MathJax không render trong iframe mô phỏng, bước câu hỏi nhồi nguyên khối, nút "Hoàn thành" bị đơ, Vở ghi sai cấu trúc. Phải thực sự: bấm hết nút, đọc nội dung từng gợi ý/đáp án, đi hết các bước/hoạt động, kiểm điều hướng, đọc Vở ghi. Đây là cách user phát hiện 7 lỗi mà 2 vòng test trước (DOM-only) bỏ sót. *(2026-06-26)*

- **Khi viết prompt kiểm thử cho cowork → PHẢI bật dev server trước** — Cowork là sandbox Linux, không chạy được Vite bản Windows (sai platform binary). Tôi chạy trên máy Windows thật nên dùng PowerShell khởi động `npm --prefix "..." run dev` (background, port 3000) TRƯỚC khi đưa prompt, rồi nói rõ "server đã chạy sẵn ở http://localhost:3000, đừng tự chạy". Không bắt cowork tự dựng server. *(2026-06-23)*

## UX Patterns

- **API key banner must name the active provider** — Generic "no API key" message is confusing when user has keys for other providers. Check active provider specifically. *(2026-04-21)*

- **Empty states are mandatory** — Every list/grid must handle `length === 0` with icon + message + CTA. Blank space = broken to new users. *(2026-04-21)*

- **File upload needs size guard** — No size limit = browser hangs on large files with no feedback. Default max: 20MB with clear error toast. *(2026-04-21)*
