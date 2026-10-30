import { readFileSync, writeFileSync } from 'node:fs';
let h = readFileSync('HANDOFF.md', 'utf8');
if (!h.includes('Thầy xác nhận đồng ý kết hợp')) {
  h = h.replace(
    '**BATCH2 HOÀN TẤT 7/7 BÀI — tất cả QA A–F ĐẠT trên Production.**',
    '**BATCH2 HOÀN TẤT 7/7 BÀI — tất cả QA A–F ĐẠT trên Production.** Sau chốt đợt: hoàn thành đợt "kết hợp 2 loại bài" (Thư viện học lại + chế độ học lại không tính điểm + giao 10 bài tự học cho 3 lớp — QA ĐẠT; commits `8aa6f92`→`c62a116`). **Thầy xác nhận đồng ý kết hợp (28/10) — đợt này đóng.**',
  );
  if (!h.includes('Thầy xác nhận đồng ý kết hợp')) throw new Error('replace failed');
  writeFileSync('HANDOFF.md', h, 'utf8');
}
let td = readFileSync('tasks/todo.md', 'utf8');
if (!td.includes('Thầy xác nhận đồng ý kết hợp')) {
  td += '- [x] Thầy xác nhận đồng ý kết hợp 2 loại bài (28/10) — đợt đóng.\n';
  writeFileSync('tasks/todo.md', td, 'utf8');
}
console.log('confirmed');
