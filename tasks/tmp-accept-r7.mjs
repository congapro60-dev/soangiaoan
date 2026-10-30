// Append mục R7 + tổng kết loạt batch2 vào acceptance + cập nhật HANDOFF/todo
import { readFileSync, writeFileSync } from 'node:fs';

let a = readFileSync('tasks/qa-w11-batch2-acceptance.md', 'utf8');
const r7 = `
---

## R7 · \`12-11-79\` — Các số đặc trưng đo mức độ phân tán — Tiết 2: Luyện tập (practice, g12) · QA A–F Production 28/10/2026 — **BÀI CUỐI BATCH2**

Phiên live \`3jpow388uY6B6aCx0EH7\` (definitionKey \`12-11-79\`, lessonId \`adaptive-v4-12-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2\`; lớp \`R6RCFC\`, HS Đặng Tuệ Minh PIN 2750). Deploy \`a5b090d\` success cả 2 Vercel; Production chunk \`liveLessonService-CE5hMEae.js\` (index \`index-BD053Mku.js\`) chứa \`gateD1279\` + fingerprint \`a83ce82d…e242b\`.

| Khoản | Cách đo | Kết quả | Verdict |
|---|---|---|---|
| A·Phiên mới + contract | \`node tasks/tmp-r7-qa-session.cjs\` | Phiên tạo cho 12-11-79, joinCode R6RCFC | ✓ |
| A·Timeline 12 chặng (dải Gate D riêng, key \`gateD1279\`) | Quét 11 chặng GV→HS | HS bands **0–1 / 1–5 / 5–7 / 7–12 / 12–14 / 14–15 / 15–23 / 23–25 / 25–32 / 32–36 / 36–40 phút** — khớp đúng phân bổ thầy duyệt 1-4-2-5-2-1-8-2-7-4-4; chặng 12 "Sau" disabled, stage giữ 12, "Kế hoạch 40–40′" | ✓ |
| A·Think window | Poll dày ~700ms | **63 reads**, \`saw10\`, \`lockedAll\`, \`minSeen=3\`; **11 cửa sổ đều \`decreasing=true\` + \`lockedAll=true\`** | ✓ |
| B·AI-error chặng 5 (S4 720–840s) | Dump HS/TV tại band 12–14′ | HS + TV hiện **"AI" + "176,7"** (bẫy làm tròn x̄ sớm — riêng của bài 79 g12); "PHẢN HỒI NHANH" + đủ 4 nhãn; **không lộ** correction/proof (không "530/3", không "1247,22", không "STO") | ✓ |
| C·HS join thật | Join qua form (Đặng Tuệ Minh + PIN 2750) | \`view-stable\` | ✓ |
| C·Route choice chặng 6 | \`tmp-r7-probe7.cjs\` | Clicked **"Bắt đầu với hỗ trợ"** (thẻ S), **taskAppeared=true** — task "PHT số 1 — Mức Trung bình (Phiếu Xanh): 40 công nhân…" đúng bài 79 g12 | ✓ |
| C·Nháp giữ sau reload + tự rejoin không PIN | \`tmp-r7-reload.cjs\` | \`relogged=view\`; \`keptInField=true\`, \`nhapPanel=true\`; band về đúng 12–14′, AI-error vẫn hiện | ✓ |
| D·Exit trống bị chặn | Bấm Gửi khi trống | \`{exists:false}\` → blocked | ✓ |
| D·Exit gửi trọn + "Tiến độ gửi · 1 HS" | Điền → Gửi (exit chạy SAU route choice — quy tắc đã ghi ở R6) | **"Đã gửi." + "Đã xác nhận trên máy chủ."**; GV + TV **"Tiến độ gửi · 1 học sinh đã gửi"** | ✓ |
| F·mode=tv \`buttons: []\` + no-spoiler | Dump nút TV chặng 7; regex \`13,75\` + \`20982\` ở HS/TV/GV chặng 7/8/9 | \`tvButtons = []\`; **0/6 lộ** | ✓ |

### Ghi chú R7

- Think \`minSeen=3\` (poll bắt sâu cửa sổ band 2′) — vẫn decreasing+locked trọn từng cửa sổ.
- Log + ảnh: \`tasks/tmp-r7-qa-log.json\`, \`tmp-r7-probe7-log.json\`, \`tmp-r7-reload.json\`, ảnh \`tasks/tmp-r7-*.png\` (tmp-* không commit).

---

## TỔNG KẾT LOẠT BATCH2 — 7/7 BÀI HOÀN TẤT (QA A–F ĐẠT trên Production)

| Vòng | Key | Lớp/Tiết | Kind | AI-error (bẫy riêng) | Timeline key | Commit Pha B | Fingerprint sau vòng |
|---|---|---|---|---|---|---|---|
| R1 | \`10-11-80\` | 10 · "Các số đặc trưng đo xu thế trung tâm" | formation | "bạn An" chia k vs n | (template) | \`5d044cb\` | \`d32bae2f…f498c9\` |
| R2 | \`11-11-76\` | 11 · "Các số đặc trưng đo xu thế trung tâm" | formation | "bạn Nam" công tần số | (template) | (R2) | \`36c18d6d…\` |
| R3 | \`11-11-78\` | 11 · Hai mặt phẳng song song — Tiết 2 | formation | thiếu đồng phẳng (γ) | \`gateD78\` | \`a27cb17\`+\`20d114e\` | \`54d92529…83c6f\` |
| R4 | \`11-11-79\` | 11 · Hai mặt phẳng song song — Tiết 3 | practice | bỏ điều kiện cắt nhau a∩b | \`gateD79\` | \`b14d0db\` | \`b6dfa109…7be24\` |
| R5 | \`12-11-77\` | 12 · Nguyên hàm — Tiết 2 | practice | "bạn Nam" ln x thiếu \|x\| | \`gateD77\` | \`7781984\` | \`7bfadfbe…c702\` |
| R6 | \`12-11-78\` | 12 · Khoảng biến thiên và khoảng tứ phân vị — Tiết 1 | formation | R = 35 − 10 = 25 đảo chiều | \`gateD1278\` | \`83ac5f3\` | \`929c3bb9…02e3a\` |
| R7 | \`12-11-79\` | 12 · Các số đặc trưng đo mức độ phân tán — Tiết 2 | practice | làm tròn x̄ sớm | \`gateD1279\` | \`a5b090d\` | \`a83ce82d…e242b\` |

- **7 bài đều QA A–F ĐẠT trên Production** (khuôn QA chuẩn hoá dần: think window poll, probe route choice chờ thinkGone, reload giữ nháp, exit chạy sau route choice).
- **4 timeline key riêng** (\`gateD78\`, \`gateD79\`, \`gateD77\`, \`gateD1278\`, \`gateD1279\` — 5 key) + binding fix2 theo PHASE; rule \`STEP_REFERENCE_INVALID\` chặn stepId mồ côi.
- **7 BLOCKER/chốt sửa số nguồn** (Thales 2 họ, tứ giác, Hệ quả, Burj; Hệ quả giàn giáo 79-g11; Hệ quả giàn giáo + PHT Khá c) 79-g11; Hệ quả quên C 77-g12; mức VD hai xí nghiệp 78-g12; vinh danh + PM2.5 + ẩn số 79-g12) — tất cả tự kiểm bằng tay, thầy chốt từng vòng.
- Snapshot cuối: **specs = 7 + MAIN 51 (pin) = 58 bài interactive Tuần 11** (10 mã source key); fingerprint \`a83ce82d…e242b\`; vitest v4 **299 PASS**; build 0 TS.
`;
if (!a.includes('## R7 · `12-11-79`')) writeFileSync('tasks/qa-w11-batch2-acceptance.md', a.trimEnd() + '\n' + r7, 'utf8');

let h = readFileSync('HANDOFF.md', 'utf8');
h = h.replace(
  '**R7 Pha B** (`12-11-79`, practice — code + test ĐẠT, chờ QA A–F). **Hết 7/7 bài batch2.**',
  '**R7 HOÀN TẤT kèm QA A–F ĐẠT** (`12-11-79`, practice — commit `a5b090d`, republish 58 bài, phiên `3jpow388uY6B6aCx0EH7`). **BATCH2 HOÀN TẤT 7/7 BÀI — tất cả QA A–F ĐẠT trên Production.**',
);
h = h.replace(
  '4. **R7 `12-11-79` Pha B xong** (28/10): build + vitest 299/299 — còn QA A–F trên Production (B8) rồi báo thầy (B9). LessonId dự kiến `adaptive-v4-12-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2`. Sau QA: tổng kết toàn loạt batch2 (7/7 bài).',
  '4. **R7 `12-11-79` HOÀN TẤT** (28/10): Pha B commit `a5b090d` (push feat+main `c94c12b..a5b090d`, deploy success) + republish "Tạo và xuất bản 58 bài" (hàng "Lớp 12 · Tuần 11 · Tiết 79") + **QA A–F ĐẠT** — phiên `3jpow388uY6B6aCx0EH7`; bands HS 12/12 khớp Gate D (0–1/1–5/5–7/7–12/12–14/14–15/15–23/23–25/25–32/32–36/36–40 + Sau disabled); AI-error "176,7" chặng 5; route choice thẻ S → PHT Mức TB; nháp giữ reload + tự rejoin không PIN; exit trống chặn → gửi trọn → "Tiến độ gửi · 1 HS" (sau route choice); think 63 reads, 11 windows decreasing+locked; tvButtons=[]; no-spoiler `13,75`/`20982` 0/6. Chi tiết `tasks/qa-w11-batch2-acceptance.md` mục R7 + TỔNG KẾT LOẠT (untracked). **BATCH2 7/7 BÀI HOÀN TẤT.**',
);
writeFileSync('HANDOFF.md', h, 'utf8');

let td = readFileSync('tasks/todo.md', 'utf8');
td = td.replace('- [ ] B6 - HANDOFF + todo → commit chọn lọc (KHÔNG `tasks/tmp-*`) → push feat+main → kiểm deploy → republish (bài 79 g12 mới tạo, đủ 58 bài).',
  '- [x] B6 - commit `a5b090d` (11 files) → push feat+main (`c94c12b..a5b090d`, exit 0) → deploy success 2 Vercel → **republish "Tạo và xuất bản 58 bài"**: hàng "Lớp 12 · Tuần 11 · Tiết 79" xuất hiện (`tmp-r7-publish.json`).');
td = td.replace('- [ ] B8 - QA A–F trên Production (khuôn r6 — đổi session + ROW_RX "Lớp 12 · Tiết 79" + marker S4 "176,7" + token no-spoiler `13,75`/`20982`).',
  '- [x] B8 - QA A–F ĐẠT trên Production, phiên `3jpow388uY6B6aCx0EH7`: bands 12/12 khớp Gate D; AI-error chặng 5 ("AI"+"176,7", không lộ proof); route choice thẻ S → PHT Mức TB (taskAppeared); nháp giữ reload + tự rejoin không PIN; exit trống chặn + gửi trọn + "Tiến độ gửi · 1 HS"; think 63 reads, 11 windows decreasing+locked; Sau disabled stage 12; tvButtons=[]; no-spoiler 0/6.');
td = td.replace('- [ ] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R7 + báo thầy + tổng kết toàn loạt batch2 (7/7).',
  '- [x] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R7 + TỔNG KẾT LOẠT 7/7 (untracked) + báo thầy.');
writeFileSync('tasks/todo.md', td, 'utf8');
console.log('acceptance + HANDOFF + todo updated (R7 + tổng kết)');
