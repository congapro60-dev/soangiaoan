import { readFileSync, writeFileSync } from 'node:fs';
let h = readFileSync('HANDOFF.md', 'utf8');
if (!h.includes('QUY TẮC KIỂM THỬ BẮT BUỘC trước push')) {
  const anchor = '## VIỆC MỚI 29/10 — 2 chức năng V8.8 (addendum thầy giao)';
  if (!h.includes(anchor)) throw new Error('anchor missing');
  const rule = [
    '## QUY TẮC KIỂM THỬ BẮT BUỘC trước push (sau lỗi TDZ 29/10 — thầy xác nhận)',
    '- **Bài học từ lỗi TDZ `participantUid` (commit `bbc901c`)**: chạy `vitest run src/lib/liveLesson/v4` (305 test thuần) + `npm run build` vẫn lọt lỗi runtime TDZ trên màn HS vì **không chạy test component render** (`LiveLessonPage.test.ts` có bắt lỗi này). Codex phiên song song đã sửa trong `f220cff`.',
    '- **Quy tắc mới**: trước mọi push, chạy đủ:',
    '  1. `npx vitest run src/lib/liveLesson/v4 src/components src/pages` (gồm test render component)',
    '  2. `npm run build` (0 TS)',
    '  3. Với thay đổi chạm live/portal: mở thử 1 trang thật qua Edge debug trước khi push.',
    '- Khi thêm `useEffect` trong function component: **deps array không được tham chiếu biến khai báo phía sau** (TDZ); đặt effect sau mọi `const` nó dùng.',
    '',
  ].join('\n');
  h = h.replace(anchor, rule + anchor);
  writeFileSync('HANDOFF.md', h, 'utf8');
  console.log('HANDOFF updated');
}
let td = readFileSync('tasks/todo.md', 'utf8');
if (!td.includes('Quy tắc kiểm thử mở rộng đã ghi HANDOFF')) {
  td += '- [x] Quy tắc kiểm thử mở rộng (test component + TDZ check) đã ghi HANDOFF sau lỗi TDZ participantUid.\n';
  writeFileSync('tasks/todo.md', td, 'utf8');
}
console.log('done');
