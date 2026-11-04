// Ghi nhận Việc 2 xong + Việc 1 chờ phương án
import { readFileSync, writeFileSync } from 'node:fs';

let h = readFileSync('HANDOFF.md', 'utf8');
if (!h.includes('Việc 2 xong — nhãn Tuần 11')) {
  h = h.replace(
    '- **Lưu ý**: bài mở từ thư viện là nguyên bản bài tự học (khác luồng GV giao đã strip đáp án) — nếu cần bản học lại strip đáp án thì báo thêm, làm qua máy chủ.',
    '- **Lưu ý**: bài mở từ thư viện là nguyên bản bài tự học (khác luồng GV giao đã strip đáp án) — nếu cần bản học lại strip đáp án thì báo thêm, làm qua máy chủ.\n- **Việc 2 xong** (commit `db016a1` + `938d97a`): 10 bài nguồn Tuần 11 hiện đúng nhãn **Tuần 11 · Tiết 75–80** trên thư viện (override client `SELF_STUDY_WEEK11_OVERRIDE` trong `adaptiveLessonService.ts` — không đụng data Firestore; QA Production 10/10 ✓).',
  );
  if (!h.includes('Việc 2 xong')) throw new Error('handoff replace failed');
  writeFileSync('HANDOFF.md', h, 'utf8');
}

let td = readFileSync('tasks/todo.md', 'utf8');
if (!td.includes('Việc 2 xong')) {
  td += '- [x] Việc 2 - nhãn Tuần 11 · Tiết 75–80 cho 10 bài nguồn trên thư viện (override client, QA 10/10 ✓).\n- [ ] Việc 1 - bản học lại strip đáp án qua máy chủ — CHỜ thầy chọn phương án (khuyến nghị: hoãn — luồng /adaptive-portal/:id đã có chấm tại chỗ client-side).\n';
  writeFileSync('tasks/todo.md', td, 'utf8');
}
console.log('recorded');
