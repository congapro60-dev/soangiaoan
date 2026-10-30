// Append mục R5 vào acceptance + cập nhật HANDOFF/todo sau B8
import { readFileSync, writeFileSync } from 'node:fs';

// 1. Acceptance
let a = readFileSync('tasks/qa-w11-batch2-acceptance.md', 'utf8');
const r5 = `
---

## R5 · \`12-11-77\` — Nguyên hàm — Tiết 2 (practice, g12) · QA A–F Production 28/10/2026

Phiên live \`sWYnJAWlwke3c76fafp3\` (definitionKey \`12-11-77\`, lessonId \`adaptive-v4-12-11-77-24YyULmWgBOM6HZCfJ56RN5tiet2\`; lớp \`R6RCFC\`, HS Đặng Tuệ Minh PIN 2750, Edge 9223). Deploy \`7781984\` success cả 2 Vercel; Production chunk \`liveLessonService-BAMF4i49.js\` (index \`index-DGj-AgFn.js\`) chứa \`gateD77\` + fingerprint \`7bfadfbe…c702\`.

| Khoản | Cách đo | Kết quả | Verdict |
|---|---|---|---|
| A·Phiên mới + contract | \`node tasks/tmp-r5-qa-session.cjs\` | Phiên tạo cho 12-11-77, joinCode R6RCFC | ✓ |
| A·Timeline 12 chặng (dải Gate D 77 riêng) | Quét 11 chặng GV→HS | HS bands **0–1 / 1–6 / 6–9 / 9–13 / 13–16 / 16–17 / 17–22 / 22–26 / 26–33 / 33–38 / 38–40 phút** — khớp đúng phân bổ thầy duyệt 1-5-3-4-3-1-5-4-7-5-2; chặng 12 "Sau" disabled, stage giữ 12, "Kế hoạch 40–40′" | ✓ |
| A·Think window | Poll dày ~700ms | **62 reads**, \`saw10\`, \`lockedAll\`, \`minSeen=6\`; **10 cửa sổ đều \`decreasing=true\` + \`lockedAll=true\`** | ✓ |
| B·AI-error chặng 5 (S4 780–960s) | Dump HS/TV tại band 13–16′ | HS + TV hiện **"AI" + "ln x" + "1/x"** (bẫy "bạn Nam" thiếu trị tuyệt đối — riêng của bài 77); "PHẢN HỒI NHANH" + đủ 4 nhãn; **không lộ** correction/proof (không "trị tuyệt đối", không "ℝ", không "(−∞") | ✓ |
| C·HS join thật | Join qua form (Đặng Tuệ Minh + PIN 2750) | \`view-stable\` | ✓ |
| C·Route choice chặng 6 | \`tmp-r5-probe7.cjs\` (chờ thinkGone) | Clicked **"Bắt đầu với hỗ trợ"** (thẻ S), **taskAppeared=true** — task "PHT số 1 — Nhiệm vụ A (Mức TB): f(x) = x⁴ + 3x²…" đúng bài 77 | ✓ |
| C·Nháp giữ sau reload + tự rejoin không PIN | \`tmp-r5-reload.cjs\` | \`relogged=view\` (không cần PIN); \`keptInField=true\`, \`nhapPanel=true\`; band về đúng 13–16′, AI-error vẫn hiện | ✓ |
| D·Exit trống bị chặn | Bấm Gửi khi trống | \`{exists:false}\` → blocked | ✓ |
| D·Exit gửi trọn + "Tiến độ gửi · 1 HS" | Điền → Gửi → GV "Hiện kết quả lớp" | **"Đã gửi." + "Đã xác nhận trên máy chủ."**; GV + TV **"Tiến độ gửi · 1 học sinh đã gửi"** | ✓ |
| F·mode=tv \`buttons: []\` + no-spoiler | Dump nút TV chặng 7; regex \`20,41\` + \`2\\ln\` ở HS/TV/GV chặng 7/8/9 | \`tvButtons = []\`; **0/6 lộ** | ✓ |

### Ghi chú R5

- Spec \`quick\` gộp 5 câu ĐGTX gốc thành 3 entry (parser chỉ nhận 2–3): mini-check (∫sin x + ∫e^{2x} — gốc đã ghép 1 hoạt động) + mini-quiz câu 1 + câu 2+3; mọi câu giữ nguyên văn đề + đáp án mục IV.
- Think \`minSeen=6\` — như R4 (poll bắt giữa cửa sổ), không phải regression.
- Log + ảnh: \`tasks/tmp-r5-qa-log.json\`, \`tmp-r5-probe7-log.json\`, \`tmp-r5-reload.json\`, ảnh \`tasks/tmp-r5-*.png\` (tmp-* không commit).
`;
if (!a.includes('## R5 · `12-11-77`')) writeFileSync('tasks/qa-w11-batch2-acceptance.md', a.trimEnd() + '\n' + r5, 'utf8');

// 2. HANDOFF
let h = readFileSync('HANDOFF.md', 'utf8');
h = h.replace(
  '**R5 Pha B** (`12-11-77`, practice — code + test ĐẠT, chờ QA A–F). Còn R6–R7',
  '**R5 HOÀN TẤT kèm QA A–F ĐẠT** (`12-11-77`, practice — commit `7781984`, republish 56 bài, phiên `sWYnJAWlwke3c76fafp3`). Còn R6–R7',
);
h = h.replace(
  '1. **R5 `12-11-77`',
  '1. R5 `12-11-77` HOÀN TẤT (QA ĐẠT) — nhưng mục này chỉ đánh dấu',
);
h = h.replace(
  '1. R4 `11-11-79` HOÀN TẤT (QA ĐẠT)',
  '1. **R5 `12-11-77` HOÀN TẤT** (28/10): Pha B commit `7781984` (push feat+main, deploy success) + republish "Tạo và xuất bản 56 bài" (hàng "Lớp 12 · Tuần 11 · Tiết 77") + **QA A–F ĐẠT** trên Production — phiên `sWYnJAWlwke3c76fafp3`; bands HS 12/12 khớp Gate D (0–1/1–6/6–9/9–13/13–16/16–17/17–22/22–26/26–33/33–38/38–40 + Sau disabled); AI-error "ln x" chặng 5; route choice thẻ S → PHT số 1 Nhiệm vụ A; nháp giữ reload + tự rejoin không PIN; exit trống chặn → gửi trọn → "Tiến độ gửi · 1 HS"; think 62 reads, 10 windows decreasing+locked; tvButtons=[]; no-spoiler `20,41`/`2\\ln` 0/6. Chi tiết `tasks/qa-w11-batch2-acceptance.md` mục R5 (untracked).',
);
writeFileSync('HANDOFF.md', h, 'utf8');

// 3. todo
let td = readFileSync('tasks/todo.md', 'utf8');
td = td.replace('- [ ] B6 - HANDOFF + todo → commit chọn lọc (KHÔNG `tasks/tmp-*`) → push feat+main → kiểm deploy → republish (bài 77 mới tạo).',
  '- [x] B6 - commit `7781984` (11 files) → push feat+main (`0490ac5..7781984`, exit 0) → deploy success 2 Vercel → **republish "Tạo và xuất bản 56 bài"**: hàng "Lớp 12 · Tuần 11 · Tiết 77" xuất hiện (`tmp-r5-publish.json`).');
td = td.replace('- [ ] B8 - QA A–F trên Production (khuôn `tmp-r4-qa.cjs`/`tmp-r4-probe7.cjs`/`tmp-r4-reload.cjs` — đổi session + marker S4 "ln x" + token no-spoiler).',
  '- [x] B8 - QA A–F ĐẠT trên Production, phiên `sWYnJAWlwke3c76fafp3`: bands 12/12 khớp Gate D 77; AI-error chặng 5 ("AI"+"ln x"+"1/x", không lộ proof); route choice thẻ S → PHT số 1 Nhiệm vụ A (taskAppeared); nháp giữ reload + tự rejoin không PIN; exit trống chặn + gửi trọn + "Tiến độ gửi · 1 HS" GV+TV; think 62 reads, 10 windows decreasing+locked; Sau disabled stage 12; tvButtons=[]; no-spoiler `20,41`/`2\\ln` 0/6.');
td = td.replace('- [ ] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R5 + báo thầy.',
  '- [x] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R5 (untracked) + báo thầy.');
writeFileSync('tasks/todo.md', td, 'utf8');
console.log('acceptance + HANDOFF + todo updated');
