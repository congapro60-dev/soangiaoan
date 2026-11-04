// Append mục R6 vào acceptance + cập nhật HANDOFF/todo sau B8
import { readFileSync, writeFileSync } from 'node:fs';

let a = readFileSync('tasks/qa-w11-batch2-acceptance.md', 'utf8');
const r6 = `
---

## R6 · \`12-11-78\` — Khoảng biến thiên và khoảng tứ phân vị — Tiết 1 (formation, g12) · QA A–F Production 28/10/2026

Phiên live \`1slj6yFtDrmpkWUxkpNR\` (definitionKey \`12-11-78\`, lessonId \`adaptive-v4-12-11-78-24YyULmWgBOM6HZCfJ56RN5tiet2\`; lớp \`R6RCFC\`, HS Đặng Tuệ Minh PIN 2750). Deploy \`83ac5f3\` success cả 2 Vercel; Production chunk \`liveLessonService-DFQK1_Vg.js\` (index \`index-BZ0yV7Gw.js\`) chứa \`gateD1278\` + fingerprint \`929c3bb9…02e3a\`.

| Khoản | Cách đo | Kết quả | Verdict |
|---|---|---|---|
| A·Phiên mới + contract | \`node tasks/tmp-r6-qa-session.cjs\` | Phiên tạo cho 12-11-78, joinCode R6RCFC | ✓ |
| A·Timeline 12 chặng (dải Gate D riêng, key \`gateD1278\`) | Quét 11 chặng GV→HS | HS bands **0–1 / 1–5 / 5–8 / 8–12 / 12–15 / 15–16 / 16–24 / 24–29 / 29–35 / 35–39 / 39–40 phút** — khớp đúng phân bổ thầy duyệt 1-4-3-4-3-1-8-5-6-3-2; chặng 12 "Sau" disabled, stage giữ 12, "Kế hoạch 40–40′" | ✓ |
| A·Think window | Poll dày ~700ms | **61 reads**, \`saw10\`, \`lockedAll\`; **16 cửa sổ đều \`decreasing=true\` + \`lockedAll=true\`** (\`minSeen=0\` — poll bắt trọn cửa sổ cuối) | ✓ |
| B·AI-error chặng 5 (S4 720–900s) | Dump HS/TV tại band 12–15′ | HS + TV hiện **"AI" + "35 − 10 = 25"** (bẫy đảo chiều R — riêng của bài 78 g12); "PHẢN HỒI NHANH" + đủ 4 nhãn; **không lộ** correction/proof (không "40 − 5", không định nghĩa đúng) | ✓ |
| C·HS join thật | Join qua form (Đặng Tuệ Minh + PIN 2750) | \`view-stable\` | ✓ |
| C·Route choice chặng 6 | \`tmp-r6-probe7.cjs\` (chờ thinkGone) | Clicked **"Bắt đầu với hỗ trợ"** (thẻ S), **taskAppeared=true** — task "PHT số 1 — NHÁNH 1 (Phiếu Xanh lá): [0;30): 8…" đúng bài 78 g12 | ✓ |
| C·Nháp giữ sau reload + tự rejoin không PIN | \`tmp-r6-reload.cjs\` | \`relogged=view\`; \`keptInField=true\`, \`nhapPanel=true\`; band về đúng 12–15′, AI-error vẫn hiện | ✓ |
| D·Exit trống bị chặn | Bấm Gửi khi trống | \`{exists:false}\` → blocked | ✓ |
| D·Exit gửi trọn + "Tiến độ gửi · 1 HS" | Lần 1 trong rea: \`typed ok:false\` — **nguyên nhân: HS chưa chọn tuyến nhiệm vụ** (thẻ exit khóa theo tuyến; rea chạy exit trước probe7). Lần 2 sau khi probe7 đã chọn tuyến (thẻ S) — \`tmp-r6-exit2.cjs\` | TEXTAREA "Viết câu trả lời ngắn" hiện → gõ → **"Đã gửi." + "Đã xác nhận trên máy chủ."**; GV "Hiện kết quả lớp" → **"Tiến độ gửi · 1 học sinh đã gửi"** | ✓ |
| F·mode=tv \`buttons: []\` + no-spoiler | Dump nút TV chặng 7; regex \`41,25\` + \`30,34\` ở HS/TV/GV chặng 7/8/9 | \`tvButtons = []\`; **0/6 lộ** | ✓ |

### Ghi chú R6

- **Khuôn QA cập nhật cho các vòng sau**: luồng exit phải chạy SAU khi route choice đã chọn (probe7) — thẻ exit khóa theo tuyến; nếu chạy exit trước thì \`typed ok:false\` (không phải bug sản phẩm, là thứ tự kiểm).
- Think \`minSeen=0\` (16 cửa sổ — poll dày hơn nhờ band ngắn 3′/2′) — vẫn decreasing+locked trọn từng cửa sổ.
- Log + ảnh: \`tasks/tmp-r6-qa-log.json\`, \`tmp-r6-probe7-log.json\`, \`tmp-r6-reload.json\`, \`tmp-r6-exit2.cjs\` (inline log), ảnh \`tasks/tmp-r6-*.png\` (tmp-* không commit).
`;
if (!a.includes('## R6 · `12-11-78`')) writeFileSync('tasks/qa-w11-batch2-acceptance.md', a.trimEnd() + '\n' + r6, 'utf8');

let h = readFileSync('HANDOFF.md', 'utf8');
h = h.replace(
  '**R6 Pha B** (`12-11-78`, formation — code + test ĐẠT, chờ QA A–F). Còn R7',
  '**R6 HOÀN TẤT kèm QA A–F ĐẠT** (`12-11-78`, formation — commit `83ac5f3`, republish 57 bài, phiên `1slj6yFtDrmpkWUxkpNR`). Còn R7',
);
h = h.replace(
  '3. **R6 `12-11-78` Pha B xong** (28/10): build + vitest 294/294 — còn QA A–F trên Production (B8) rồi báo thầy (B9). LessonId dự kiến `adaptive-v4-12-11-78-24YyULmWgBOM6HZCfJ56RN5tiet2`.',
  '3. **R6 `12-11-78` HOÀN TẤT** (28/10): Pha B commit `83ac5f3` (push feat+main `5eb3b3b..83ac5f3`, deploy success) + republish "Tạo và xuất bản 57 bài" (hàng "Lớp 12 · Tuần 11 · Tiết 78") + **QA A–F ĐẠT** — phiên `1slj6yFtDrmpkWUxkpNR`; bands HS 12/12 khớp Gate D (0–1/1–5/5–8/8–12/12–15/15–16/16–24/24–29/29–35/35–39/39–40 + Sau disabled); AI-error "35 − 10 = 25" chặng 5; route choice thẻ S → PHT NHÁNH 1; nháp giữ reload + tự rejoin không PIN; exit trống chặn → gửi trọn → "Tiến độ gửi · 1 HS" (⚠ luồng exit phải chạy SAU route choice — thẻ exit khóa theo tuyến, ghi chú khuôn QA); think 61 reads, 16 windows decreasing+locked; tvButtons=[]; no-spoiler `41,25`/`30,34` 0/6. Chi tiết `tasks/qa-w11-batch2-acceptance.md` mục R6 (untracked).',
);
writeFileSync('HANDOFF.md', h, 'utf8');

let td = readFileSync('tasks/todo.md', 'utf8');
td = td.replace('- [ ] B6 - HANDOFF + todo → commit chọn lọc (KHÔNG `tasks/tmp-*`) → push feat+main → kiểm deploy → republish (bài 78 g12 mới tạo).',
  '- [x] B6 - commit `83ac5f3` (11 files) → push feat+main (`5eb3b3b..83ac5f3`, exit 0) → deploy success 2 Vercel → **republish "Tạo và xuất bản 57 bài"**: hàng "Lớp 12 · Tuần 11 · Tiết 78" xuất hiện (`tmp-r6-publish.json`).');
td = td.replace('- [ ] B8 - QA A–F trên Production (khuôn r5 — đổi session + ROW_RX "Lớp 12 · Tiết 78" + marker S4 "R = 35 − 10" + token no-spoiler `41,25`/`30,34`).',
  '- [x] B8 - QA A–F ĐẠT trên Production, phiên `1slj6yFtDrmpkWUxkpNR`: bands 12/12 khớp Gate D; AI-error chặng 5 ("AI"+"35 − 10 = 25", không lộ proof); route choice thẻ S → PHT NHÁNH 1 (taskAppeared); nháp giữ reload + tự rejoin không PIN; exit trống chặn + gửi trọn + "Tiến độ gửi · 1 HS" (chạy SAU route choice — thẻ exit khóa theo tuyến); think 61 reads, 16 windows decreasing+locked; Sau disabled stage 12; tvButtons=[]; no-spoiler 0/6.');
td = td.replace('- [ ] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R6 + báo thầy.',
  '- [x] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R6 (untracked) + báo thầy.');
writeFileSync('tasks/todo.md', td, 'utf8');
console.log('acceptance + HANDOFF + todo updated (R6)');
