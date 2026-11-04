import { readFileSync, writeFileSync } from 'node:fs';
const p = 'PENDING.md';
let t = readFileSync(p, 'utf8');
t = t.replace(
  '| 3 | Chức năng 2 (ASS-MDP-01): Student Surface Mobile/Desktop Parity — audit Bước 0 chưa làm — spec `tasks/spec-parity.md` | CHỜ LÀM | sau khi chức năng 1 qua gate |',
  '| 3 | Chức năng 2 (ASS-MDP-01): **Pha A xong** — inventory 19 hành vi + capability matrix + audit CSS + kế hoạch 30 test MDP — `tasks/gate-d2-parity-pha-a.md` | CHỜ DUYỆT | duyệt xong mới code (Pha B) |',
);
writeFileSync(p, t, 'utf8');
console.log('PENDING updated');
