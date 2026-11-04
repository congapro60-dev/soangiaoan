// Ghi nhận Việc 3 vào acceptance + HANDOFF + todo
import { readFileSync, writeFileSync } from 'node:fs';

let a = readFileSync('tasks/qa-w11-batch2-acceptance.md', 'utf8');
const v3 = `
### Việc 3 · Giao 10 bài tự học Tuần 11 hàng loạt cho 3 lớp · 28/10/2026

Giao qua action \`teacherAssignAdaptiveLesson\` (idToken GV từ phiên Edge 9222) — **10/10 → 200**, assignmentId \`{classId}_{lessonId}\`, \`isOpen: true\`:

| Lớp | Bài tự học đã giao |
|---|---|
| g10 · 7W288E | Số gần đúng và sai số T1 (\`adaptive-1792827090625\`) · Các số đặc trưng T1 (\`adaptive-1792826324771\`) |
| g11 · R6RCFC | Mẫu số liệu ghép nhóm T1 · Các số đặc trưng T1 · Hai mặt phẳng T2 · Hai mặt phẳng T3 |
| g12 · AD4GKT | Nguyên hàm T2 · Khoảng biến thiên T1 · Mức độ phân tán T2 · Phương sai T1 |

QA portal HS (lớp g12 đang phiên, Edge 9223): \`studentAdaptiveList\` trả đúng 4 bài g12 mới + 1 bài cũ, \`closed: false\` — HS bấm "Vào bài" chạy luồng chấm có điểm chuẩn. Lưu ý UI "Giao bài" trên GV chỉ list bài tương tác V8.8 — bài tự học nguồn phải giao qua action (đã thực hiện).
`;
if (!a.includes('### Việc 3 · Giao 10 bài tự học')) writeFileSync('tasks/qa-w11-batch2-acceptance.md', a.trimEnd() + '\n' + v3, 'utf8');

let h = readFileSync('HANDOFF.md', 'utf8');
if (!h.includes('Việc 3 xong — giao 10 bài')) {
  h = h.replace(
    '- **Việc 2 xong** (commit `db016a1` + `938d97a`): 10 bài nguồn Tuần 11 hiện đúng nhãn **Tuần 11 · Tiết 75–80** trên thư viện (override client `SELF_STUDY_WEEK11_OVERRIDE` trong `adaptiveLessonService.ts` — không đụng data Firestore; QA Production 10/10 ✓).',
    '- **Việc 2 xong** (commit `db016a1` + `938d97a`): 10 bài nguồn Tuần 11 hiện đúng nhãn **Tuần 11 · Tiết 75–80** trên thư viện (override client `SELF_STUDY_WEEK11_OVERRIDE` trong `adaptiveLessonService.ts` — không đụng data Firestore; QA Production 10/10 ✓).\n- **Việc 1 (phương án B) xong** (commits `668d4a6`–`2a7848e`): chế độ học lại không tính điểm — route `/adaptive-library/:libraryLessonId`, server `studentAdaptiveLibraryOpen` (bản strip) + `studentAdaptiveLibrarySubmit` (`gradeLibraryAssessment` chấm thuần, scored: false, không ghi Firestore); HS tự đăng nhập ẩn danh; QA Production ĐẠT (mở bài + notice + nộp diagnostic scored:false).\n- **Việc 3 xong**: giao 10 bài tự học Tuần 11 cho 3 lớp qua `teacherAssignAdaptiveLesson` (10/10 → 200; g10 2 bài, g11 4 bài, g12 4 bài; QA portal g12 hiện đúng 4 bài). Lưu ý: UI "Giao bài" chỉ list bài tương tác — bài tự học nguồn giao qua action.',
  );
  if (!h.includes('Việc 3 xong')) throw new Error('handoff failed');
  writeFileSync('HANDOFF.md', h, 'utf8');
}

let td = readFileSync('tasks/todo.md', 'utf8');
td = td.replace('- [ ] Việc 1 - bản học lại strip đáp án qua máy chủ — CHỜ thầy chọn phương án (khuyến nghị: hoãn — luồng /adaptive-portal/:id đã có chấm tại chỗ client-side).',
  '- [x] Việc 1 (phương án B, thầy chọn) - server strip + chấm không ghi điểm: `studentAdaptiveLibraryOpen`/`studentAdaptiveLibrarySubmit` (`gradeLibraryAssessment`); route `/adaptive-library/:libraryLessonId`; auto đăng nhập ẩn danh; QA ĐẠT (mở bài strip + nộp diagnostic scored:false). Lưu ý: quickCheck nhúng Dewey giữ hành vi luồng công khai nguyên trạng.');
td += '- [x] Việc 3 - giao 10 bài tự học Tuần 11 cho 3 lớp (g10 2, g11 4, g12 4 — 10/10 → 200; QA portal g12 hiện đúng 4 bài).\n';
writeFileSync('tasks/todo.md', td, 'utf8');
console.log('recorded Việc 3');
