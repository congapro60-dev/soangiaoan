// Bổ sung QA verdict vào HANDOFF.md + todo.md sau B8
import { readFileSync, writeFileSync } from 'node:fs';

let h = readFileSync('HANDOFF.md', 'utf8');
h = h.replace(
  '1. R4 `11-11-79`: Pha B xong (build + vitest 284/284) — **còn QA A–F trên Production (B8) rồi báo thầy (B9)**. LessonId dự kiến `adaptive-v4-11-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2`.',
  '1. **R4 `11-11-79` HOÀN TẤT** (28/10): Pha B commit `b14d0db` (push feat+main, deploy success 2 Vercel) + republish 55 bài (hàng "Lớp 11 · Tuần 11 · Tiết 79" xuất hiện) + **QA A–F ĐẠT** trên Production — phiên `T5lfCYGxrpRSg1aikwhj`; bands HS 12/12 khớp Gate D (0–1/1–5/5–7/7–12/12–15/15–16/16–24/24–29/29–35/35–38/38–40 + Sau disabled); AI-error "MN ∥ AB" chặng 5; route choice thẻ S (probe7); nháp giữ reload + tự rejoin không PIN; exit trống chặn → gửi trọn → "Tiến độ gửi · 1 HS"; think 63 reads, 11 windows decreasing+locked; tvButtons=[]; no-spoiler `d_S`/`HÌNH THANG` 0/6. Chi tiết `tasks/qa-w11-batch2-acceptance.md` mục R4 (untracked).',
);
if (!h.includes('R4 `11-11-79` HOÀN TẤT')) throw new Error('handoff replace failed');
// Test dòng 31 vẫn ghi 284 (đúng). Thêm ghi chú QA quirks vào mục R4 của HANDOFF
h = h.replace(
  '- No-spoiler tokens QA: `d_S`, `HÌNH THANG` (viết hoa — chỉ trong đáp án mục III.2; đề phân hóa chữ thường giữ nguyên theo gốc).',
  '- No-spoiler tokens QA: `d_S`, `HÌNH THANG` (viết hoa — chỉ trong đáp án mục III.2; đề phân hóa chữ thường giữ nguyên theo gốc). QA quirk: bấm route choice phải chờ `thinkGone` trước (nút render sau think window — lần đầu bấm khi còn "Chờ 2s" trả null, không phải bug).',
);
if (!h.includes('thinkGone')) throw new Error('handoff quirk failed');
writeFileSync('HANDOFF.md', h, 'utf8');

let td = readFileSync('tasks/todo.md', 'utf8');
td = td.replace('- [ ] B6 - HANDOFF + todo cập nhật → commit chọn lọc (KHÔNG `tasks/tmp-*`) → push `feat/nop-bai-da-cham` + `main` → kiểm deploy → republish 54 bài (bài 79 mới tạo).',
  '- [x] B6 - commit `b14d0db` (11 files) → push feat+main (`addbbbf..b14d0db`, exit 0) → deploy success 2 Vercel → **republish "Tạo và xuất bản 55 bài"**: hàng "Lớp 11 · Tuần 11 · Tiết 79" xuất hiện, bài 78 giữ nguyên (`tmp-r4-publish.json`).');
td = td.replace('- [ ] B8 - QA A–F trên Production (khuôn `tmp-r3-fix2-rea.cjs` + probe6/probe7; phiên live mới; lớp R6RCFC, HS Tuệ Minh PIN 2750).',
  '- [x] B8 - QA A–F ĐẠT trên Production, phiên `T5lfCYGxrpRSg1aikwhj`: bands 12/12 khớp Gate D 79; AI-error chặng 5 đúng riêng bài ("AI" + "MN ∥ AB" + "MNPQ", không lộ proof); route choice thẻ S + taskAppeared (probe7, chờ thinkGone); nháp giữ reload + tự rejoin không PIN; exit trống chặn + gửi trọn + "Tiến độ gửi · 1 HS" GV+TV; think 63 reads, 11 windows decreasing+locked; Sau disabled stage 12; tvButtons=[]; no-spoiler 0/6.');
td = td.replace('- [ ] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R4 + báo thầy.',
  '- [x] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R4 (untracked, không commit) + báo thầy.');
if (!td.includes('B8 - QA A–F ĐẠT')) throw new Error('todo replace failed');
writeFileSync('tasks/todo.md', td, 'utf8');
console.log('HANDOFF + todo updated');
