// Task 9 + Task 10: append báo cáo vào acceptance + HANDOFF + todo (chốt đợt)
import { readFileSync, writeFileSync } from 'node:fs';

let a = readFileSync('tasks/qa-w11-batch2-acceptance.md', 'utf8');
const rep = `
---

## Task 9 · QA 2 bài batch1 chưa từng QA trình duyệt (\`10-11-79\` g10 · \`11-11-75\` g11) · 28/10/2026

Không deploy, không đụng code — QA A–F trên Production sau khi registry ổn định 10 key. Trình tự đúng quy tắc R6: route choice (probe7) chạy trước exit.

### Task 9 · \`10-11-79\` — Số gần đúng và sai số (g10) · phiên \`8DIcKxBIDeFTlyVivIMV\` · lớp \`7W288E\` · HS Trần Thùy Anh PIN 2143

| Khoản | Kết quả | Verdict |
|---|---|---|
| A·Phiên mới + timeline template | bands HS **0–3 / 3–5 / 5–8 / 8–16 / 16–19 / 19–20 / 20–27 / 27–30 / 30–35 / 35–38 / 38–40 phút** (timeline chung — bài không có timelineKey); Sau disabled, stage 12, "Kế hoạch 40–40′" | ✓ |
| A·Think window | 63 reads, saw10, lockedAll, minSeen=6; **13 cửa sổ đều decreasing+locked** | ✓ |
| B·AI-error chặng 5 | HS + TV: **"AI" + "Fansipan"** (bẫy quy tròn sai hàng — d = 0,2); PHẢN HỒI NHANH + 4 nhãn | ✓ |
| B·No-spoiler | dump chặng 7/8/9 HS/TV/GV: "hàng đơn vị" + "Quy tắc: hàng quy tròn" (chỉ-GV) = **0/9 lộ** | ✓ |
| C·Join / route choice / nháp | \`view-stable\`; probe7 thẻ S → task "ā = 10 và a = 9,8 — sai số tuyệt đối" (\`taskAppeared=true\`); reload \`keptInField=true\`, \`nhapPanel=true\`, tự rejoin không PIN | ✓ |
| D·Exit | trống chặn; gửi trọn "Đã gửi." + "Đã xác nhận trên máy chủ."; GV+TV "Tiến độ gửi · 1 HS" | ✓ |
| F·mode=tv | \`tvButtons = []\` | ✓ |

### Task 9 · \`11-11-75\` — Mẫu số liệu ghép nhóm (g11) · phiên \`3f6l2fI1RriYA1ZWfnJe\` · lớp \`R6RCFC\` · HS Đặng Tuệ Minh PIN 2750

| Khoản | Kết quả | Verdict |
|---|---|---|
| A·Phiên mới + timeline template | bands HS **0–3 / 3–5 / 5–8 / 8–16 / 16–19 / 19–20 / 20–27 / 27–30 / 30–35 / 35–38 / 38–40 phút**; Sau disabled, stage 12 | ✓ |
| A·Think window | 62 reads, saw10, lockedAll, minSeen=0; 18 cửa sổ — **17/18 decreasing+locked; 1 cửa sổ artifact poll** (10 reads gộp 2 lượt nav — lockedAll 62/62, không phải lỗi sản phẩm) | ✓ |
| B·AI-error chặng 5 | HS + TV: **"AI" + "Internet"** (bẫy "90 thuộc nhóm [60; 90)"); PHẢN HỒI NHANH + 4 nhãn | ✓ |
| B·No-spoiler | token chỉ-GV: "không chứa 90" + "90 < 90" (proof) = **false** ở chặng 7/8/9 HS/TV; token "nửa khoảng" = true **nhưng nằm trong hint công khai của task** ("Em dùng kí hiệu nửa khoảng để chứng minh…") — không phải correction/proof; "[90; 120)" (correction) = false trên màn HS | ✓ (false positive marker đã loại trừ) |
| C·Join / route choice / nháp | \`view-stable\`; probe7 thẻ S → task "Nhóm [20;30) — độ dài nhóm và giá trị đại diện" (\`taskAppeared=true\`); reload \`keptInField=true\`, \`nhapPanel=true\`, tự rejoin không PIN | ✓ |
| D·Exit | trống chặn; gửi trọn; GV+TV "Tiến độ gửi · 1 HS" | ✓ |
| F·mode=tv | \`tvButtons = []\` | ✓ |

### Task 9 · Step 3 — CasioKeyGuide PHẢI ẨN với cả 2 bài

Dump HS toàn chặng (t9a s7/s8/s9 + t9b): **0 lần** xuất hiện "Casio fx-580VN X" / "σx = 0,89443" / "Máy tính của em" — \`getCasioGuideForLesson\` trả null cho bài không phải 12-11-80 (\`casioGuide.ts:57-64\`). | ✓ ẨN

---

## Task 10 · QA hồi quy bài 12 (\`12-11-80\` — Phương sai) sau khi registry 3→10 key · 28/10/2026

Phiên live \`2vuuqC9VtmVhVGihSyD6\` · lớp \`AD4GKT\` (g12) · HS Lò Mai Phương Chi PIN 7859.

**Step 1 — kiểm code nhanh:** vitest v4 **300/300 PASS** (thêm cổng chốt Task 11 Step 1b); \`g12VarianceNumbers.test.ts\` + \`casioGuide.test.ts\`: **17/17 PASS** (không đổi).

**Step 2 — QA hồi quy trên Production:**

| Khoản | Kết quả | Verdict |
|---|---|---|
| Contract nạp đúng | GV mở phiên 12-11-80; HS join \`view-stable\` | ✓ |
| Timeline 2400s (template) | bands HS **0–3 / 3–5 / 5–8 / 8–16 / 16–19 / 19–20 / 20–27 / 27–30 / 30–35 / 35–38 / 38–40 phút**; think 62 reads, 11 cửa sổ decreasing+locked | ✓ |
| AI-error chặng 5 | HS + TV: **"AI" + "±3"** (bẫy "s² = 9 nên s = ±3"); PHẢN HỒI NHANH + 4 nhãn; correction/proof ("căn bậc hai số học") không lộ | ✓ |
| Exit ticket chặng 11 | trống chặn; gửi trọn "Đã gửi." + "Đã xác nhận trên máy chủ."; GV+TV "Tiến độ gửi · 1 HS" | ✓ |
| Chặng 12 disabled Sau | \`{exists:true, disabled:true}\`; stage giữ 12; "Kế hoạch 40–40′" | ✓ |
| **CasioKeyGuide PHẢI HIỆN** | Màn HS: **"Casio fx-580VN X" + "MENU" + "Freq · On" + "OPTN" + "σx = 0,89443…"** — đủ 4 bước hướng dẫn (\`casioGuide.ts\` CASIO_FX580_STEPS) | ✓ |
| Số đã duyệt nguyên trạng | σx = 0,89443… hiện **nguyên trạng trên màn HS**; s²(An) = 0,8 và s²(Bình) = 2,8, x̄ = 9 nằm trong \`boardKnowledge\` "Casio kiểm chứng" — view chỉ-GV/offline pack (đúng bảng phân quyền đã duyệt; test pin \`g12VarianceNumbers.test.ts\` đảm bảo không đổi); bẫy "s = ±3" chiếu lại ở chặng 9 là nội dung công khai hợp lệ | ✓ |
| C·Route choice / nháp | probe7 thẻ S → task "n = 10, Σn_ic_i² = 250, x̄ = 4" (\`taskAppeared=true\`); reload \`keptInField=true\`, tự rejoin không PIN | ✓ |

**Bài 12 không vỡ sau khi registry 3→10 key.**

---

## Task 11 · Chốt đợt batch2 — 10/10 bài Tuần 11 V8.8 · 28/10/2026

- **Step 1**: báo cáo này đủ 10 mục QA — R1→R7 (7 bài mới), Task 9 (2 bài batch1), Task 10 (hồi quy bài 12). Mỗi mục có ngày, lớp + HS, checklist A–F, bằng chứng log/ảnh.
- **Step 1b**: cổng chốt \`expect(W11BATCH2).toHaveLength(7)\` + đúng thứ tự 7 key đã thêm vào \`week11Batch2Catalog.test.ts\` — vitest v4 **300/300 PASS**.
- **Step 2**: mọi mục ĐẠT → đợt batch2 **HOÀN THÀNH, chốt nghiệm thu** (0 mục sự cố).
- **Tiêu chí nghiệm thu cuối đợt** (plan): build 0 TS ✔; vitest toàn bộ PASS ✔; MAIN snapshot \`banToan-w5-w6.snapshot.json\` **không đụng** (git diff trống so với main) ✔; snapshot batch2 7 specs/7 aiErrors/7 files, fingerprint \`a83ce82d…e242b\` ✔.
`;
if (!a.includes('## Task 9 · QA 2 bài batch1')) writeFileSync('tasks/qa-w11-batch2-acceptance.md', a.trimEnd() + '\n' + rep, 'utf8');
console.log('acceptance appended (Task 9 + 10 + 11)');

// HANDOFF cuối đợt
let h = readFileSync('HANDOFF.md', 'utf8');
h = h.replace(
  '**R7 HOÀN TẤT kèm QA A–F ĐẠT** (`12-11-79`, practice — commit `a5b090d`, republish 58 bài, phiên `3jpow388uY6B6aCx0EH7`). **BATCH2 HOÀN TẤT 7/7 BÀI — tất cả QA A–F ĐẠT trên Production.**',
  '**R7 HOÀN TẤT kèm QA A–F ĐẠT** (`12-11-79`, practice — commit `a5b090d`, republish 58 bài, phiên `3jpow388uY6B6aCx0EH7`). **BATCH2 HOÀN TẤT 7/7 BÀI — tất cả QA A–F ĐẠT trên Production.**\n\n## CHỐT ĐỢT — 10/10 bài Tuần 11 V8.8 (Task 9–11, 28/10)\n- **Task 9**: QA 2 bài batch1 lần đầu trên trình duyệt — \`10-11-79\` (g10, lớp 7W288E, Thùy Anh 2143, phiên \`8DIcKxBIDeFTlyVivIMV\`) + \`11-11-75\` (g11, R6RCFC, Tuệ Minh, phiên \`3f6l2fI1RriYA1ZWfnJe\`): A–F ĐẠT (timeline template, AI-error riêng "Fansipan"/"Internet", route choice, nháp giữ reload, exit, Sau disabled, tvButtons=[]) + **CasioKeyGuide ẨN** đúng thiết kế (0 lần trên HS). Lưu ý: token "nửa khoảng" ở bài 75 nằm trong hint công khai của task — không phải lộ correction.\n- **Task 10**: hồi quy bài 12 \`12-11-80\` (g12, lớp AD4GKT, Phương Chi 7859, phiên \`2vuuqC9VtmVhVGihSyD6\`): A–F rút gọn ĐẠT; **CasioKeyGuide HIỆN đủ 4 bước trên HS** (MENU/Freq/OPTN + σx = 0,89443… nguyên trạng); s²(An)=0,8, s²(Bình)=2,8 thuộc boardKnowledge chỉ-GV (đúng phân quyền, test pin PASS); vitest 17/17 cho 2 file hồi quy.\n- **Task 11**: cổng chốt \`expect(W11BATCH2).toHaveLength(7)\` + đúng thứ tự 7 key — vitest v4 **300/300 PASS**. Báo cáo nghiệm thu tổng hợp 10 mục trong \`tasks/qa-w11-batch2-acceptance.md\` (untracked). Trạng thái cuối: **10/10 bài Tuần 11 có bản tự học đều là V8.8; registry 10 key; MAIN snapshot nguyên byte; fingerprint batch2 \`a83ce82d…e242b\`**. Việc treo: nhóm xoay tua tự động vẫn chờ thầy (nếu có).',
);
if (!h.includes('## CHỐT ĐỢT')) throw new Error('handoff chot failed');
writeFileSync('HANDOFF.md', h, 'utf8');

let td = readFileSync('tasks/todo.md', 'utf8');
td = td.replace(
  '# TODO - 28/10/2026: R7 Pha B (Gate C) bài `12-11-79` - batch2 Tuần 11 (BÀI CUỐI)',
  '# TODO - 28/10/2026: Batch2 HOÀN THÀNH — 10/10 bài Tuần 11 V8.8 (R1–R7 + Task 9–11 chốt đợt)',
);
td += `
## Task 9–11 (chốt đợt — 28/10)

- [x] Task 9 - QA 2 bài batch1: \`10-11-79\` (g10, 7W288E, phiên \`8DIcKxBIDeFTlyVivIMV\`) + \`11-11-75\` (g11, R6RCFC, phiên \`3f6l2fI1RriYA1ZWfnJe\`) — A–F ĐẠT + CasioKeyGuide ẨN (bằng chứng dump 0 lần).
- [x] Task 10 - hồi quy bài 12 \`12-11-80\` (g12, AD4GKT, phiên \`2vuuqC9VtmVhVGihSyD6\`) — ĐẠT + CasioKeyGuide HIỆN đủ 4 bước (σx = 0,89443 nguyên trạng); g12VarianceNumbers + casioGuide test 17/17.
- [x] Task 11 Step 1/1b - báo cáo 10 mục QA + cổng chốt \`expect(W11BATCH2).toHaveLength(7)\` — vitest v4 **300/300 PASS**.
- [x] Task 11 Step 2 - chốt: mọi mục ĐẠT, đợt batch2 hoàn thành (0 sự cố).
- [x] Task 11 Step 3 - HANDOFF cuối đợt (10/10 bài V8.8; registry 10 key).
- [x] Task 11 Step 4 - commit + push tài liệu.
`;
writeFileSync('tasks/todo.md', td, 'utf8');
console.log('HANDOFF + todo chốt đợt done');
