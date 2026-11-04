// Hoàn tất HANDOFF R5 (goal + recipe files + việc kế tiếp chèn R5)
import { readFileSync, writeFileSync } from 'node:fs';
let h = readFileSync('HANDOFF.md', 'utf8');

// Goal
h = h.replace(
  '**R4 Pha B** (`11-11-79`, practice — code + test ĐẠT, chờ QA A–F). Còn R5–R7 (mỗi vòng: Pha A Gate P+D → thầy duyệt → Pha B Gate C + QA).',
  '**R4 hoàn tất kèm QA A–F ĐẠT** (`11-11-79`), **R5 hoàn tất kèm QA A–F ĐẠT** (`12-11-77`, practice — commit `7781984` + docs `3d52fe9`, republish 56 bài, phiên `sWYnJAWlwke3c76fafp3`). Còn R6–R7 (mỗi vòng: Pha A Gate P+D → thầy duyệt → Pha B Gate C + QA).',
);
if (!h.includes('R5 hoàn tất kèm QA')) throw new Error('goal failed');

// Recipe files (kiểm đã có chưa)
if (!h.includes('c45daa12')) {
  h = h.replace(
    '`tasks/giaoan-goc-11-11-79.md` = `dc74b984…6726`)',
    '`tasks/giaoan-goc-11-11-79.md` = `dc74b984…6726`, `tasks/giaoan-goc-12-11-77.md` = `c45daa12…db10`)',
  );
}
if (!h.includes('c45daa12')) throw new Error('recipe files failed');

// Việc kế tiếp — chèn item R5 sau item R4
if (!h.includes('1. R5 `12-11-77` HOÀN TẤT')) {
  const anchor = 'Chi tiết `tasks/qa-w11-batch2-acceptance.md` mục R4 (untracked).';
  const r5Item = anchor + '\n2. **R5 `12-11-77` HOÀN TẤT** (28/10): Pha B commit `7781984` (push feat+main `0490ac5..7781984`, deploy success) + republish "Tạo và xuất bản 56 bài" (hàng "Lớp 12 · Tuần 11 · Tiết 77") + **QA A–F ĐẠT** — phiên `sWYnJAWlwke3c76fafp3`; bands HS 12/12 khớp Gate D (0–1/1–6/6–9/9–13/13–16/16–17/17–22/22–26/26–33/33–38/38–40 + Sau disabled); AI-error "ln x" chặng 5; route choice thẻ S → PHT số 1 Nhiệm vụ A; nháp giữ reload + tự rejoin không PIN; exit trống chặn → gửi trọn → "Tiến độ gửi · 1 HS"; think 62 reads, 10 windows decreasing+locked; tvButtons=[]; no-spoiler `20,41`/`2\\ln` 0/6. Spec quick gộp 5 câu ĐGTX gốc thành 3 entry (parser 2–3). Chi tiết `tasks/qa-w11-batch2-acceptance.md` mục R5 (untracked).';
  if (!h.includes(anchor)) throw new Error('anchor failed');
  h = h.replace(anchor, r5Item);
  // đánh số lại các item sau
  h = h.replace('\n2. R6 `12-11-78`', '\n3. R6 `12-11-78`');
  h = h.replace('\n3. Sau R7:', '\n4. Sau R7:');
  h = h.replace('\n4. Hạ tầng QA:', '\n5. Hạ tầng QA:');
}
writeFileSync('HANDOFF.md', h, 'utf8');
console.log('HANDOFF final, lines=' + h.split('\n').length);
