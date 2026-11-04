// HANDOFF + todo cho R7 Pha B (bài cuối batch2)
import { readFileSync, writeFileSync } from 'node:fs';

let h = readFileSync('HANDOFF.md', 'utf8');

h = h.replace(
  '**R6 HOÀN TẤT kèm QA A–F ĐẠT** (`12-11-78`, formation — commit `83ac5f3`, republish 57 bài, phiên `1slj6yFtDrmpkWUxkpNR`). Còn R7',
  '**R6 HOÀN TẤT kèm QA A–F ĐẠT** (`12-11-78`, formation — commit `83ac5f3`, republish 57 bài, phiên `1slj6yFtDrmpkWUxkpNR`) và **R7 Pha B** (`12-11-79`, practice — code + test ĐẠT, chờ QA A–F). **Hết 7/7 bài batch2.**',
);
if (!h.includes('Hết 7/7 bài batch2')) throw new Error('goal failed');

h = h.replace(
  '`tasks/giaoan-goc-12-11-78.md` = `548bf1ff…41b7`)',
  '`tasks/giaoan-goc-12-11-78.md` = `548bf1ff…41b7`, `tasks/giaoan-goc-12-11-79.md` = `ff8ad32e…6a8f8`)',
);
if (!h.includes('ff8ad32e')) throw new Error('recipe files failed');

h = h.replace(/Giá trị sau R6 \(28\/10[^\n]+\)/, 'Giá trị sau R7 (28/10, thêm spec 79 g12 + file giáo án 79 g12): `a83ce82df4c7448f19419c37a341a9989e4cbe3c02da4db46ae0c2d96f9e242b` (hex-64; trước đó R6: `929c3bb9…02e3a`, R5: `7bfadfbe…c702`).');
if (!h.includes('a83ce82d')) throw new Error('fp failed');

h = h.replace(
  '- v4 (`src/lib/liveLesson/v4`): 27 file / **294 tests PASS** (baseline R5: 289; +5 R6: it.each 78g12 ×3 + timeline gateD1278 + binding phase). `npm run build` 0 TS error.',
  '- v4 (`src/lib/liveLesson/v4`): 27 file / **299 tests PASS** (baseline R6: 294; +5 R7: it.each 79g12 ×3 + timeline gateD1279 + binding phase). `npm run build` 0 TS error.',
);
if (!h.includes('299 tests PASS')) throw new Error('test failed');

const r7 = `## R7 \`12-11-79\` — "Các số đặc trưng đo mức độ phân tán — Tiết 2: Luyện tập" (g12, practice) — BÀI CUỐI BATCH2
- Gate D ĐÃ DUYỆT (thầy, 28/10): \`tasks/gate-d-12-11-79.md\` — nguồn nội dung duy nhất, KHÔNG sửa. Thầy chốt 4 mục: phân bổ S0–S10 = 1-4-2-5-2-1-8-2-7-4-4 phút; **3 BLOCKER sửa số** (minh họa vinh danh gốc 29,5/84,75/75 + σx ≈ 9,21 không khớp chữa chung → thay bằng PHT Khá 1247,22 vs 1235,44; PM2.5 gốc 45/8,12/15,46 không khớp bảng → 43/10,13 & 46,33/14,43, kết luận s_A < s_B giữ nguyên; ẩn số Σ = 20982 (gốc 20980 sai cộng) → x = 9 thay x = 8); \`category\` "Lỗi đại số"; kind \`practice\` + timeline key \`gateD1279\`.
- Giáo án gốc: \`tasks/giaoan-goc-12-11-79.md\` (Firestore lessonPlans/315100a6-…, 31 187 ký tự, tải 28/10 — kwList "luyện tập khoảng biến thiên"). Ghi chú: tab dashboard gốc đã đóng → dùng \`tasks/tmp-open-lib-12-79.cjs\` (tạo tab mới + click sidebar "Thư viện").
- Spec: kind/lessonType \`practice\`; formulas×4 (s² rút gọn; c_i + x̄; Q_p nội suy + ΔQ; y = ax+b); examples×2 = chữa chung 40 công nhân (21,25/35/13,75; 28/81/9) + PM2.5 chữa chung (số đã sửa); exercises×6 = PHT TB (Xanh, trùng chữa chung) + PHT Khá (Vàng — đáp án tự tính 530/3; 1247,22 vs 1235,44; Δ ≈ 11,78) + tính chất y = ax+b + ẩn số (x = 9 — số sửa) + PM2.5 A/B; quick×3 = kiểm nhanh NB/TH/VD (B/B/C nguyên bản); mistakes×4; boardKnowledge (biến đổi s² + quy tắc vàng STO A + Polya + σx vs sx + y = ax+b + thông điệp); timelineKey \`gateD1279\` (0-60-300-420-720-840-900-1380-1500-1920-2160-2400).
- aiError \`ai-error-12-11-79\`: category "Lỗi đại số"; bẫy làm tròn x̄ sớm (x̄ ≈ 176,7 → s² ≈ 1235,4 — trần); proof khuếch đại 2ε·x̄ + [Gộp whyAiError/boardPrompt — quy tắc vàng + STO A]; 5 trường plain Unicode không $.
- Code: \`TIMELINE_BY_KEY\` thêm \`gateD1279\`; snapshot specs=7/aiErrors=7/files=7 (fingerprint \`a83ce82d…e242b\`); INTERACTIVE_SOURCE_KEYS **10 mã (đủ loạt)**; W11BATCH2 entry thứ 7; exact-keys 10 mã (alphabet \`['10-11-79','10-11-80','11-11-75','11-11-76','11-11-78','11-11-79','12-11-77','12-11-78','12-11-79','12-11-80']\`, tên test 9→10).
- No-spoiler tokens QA: \`13,75\` (chữa chung) + \`20982\` (số tự kiểm — 0 lần trong giáo án gốc).
- **Test**: v4 27 file / **299 PASS** (baseline R6: 294). \`npm run build\` 0 TS.

`;
h = h.replace('## Việc kế tiếp', r7 + '## Việc kế tiếp');
if (!h.includes('## R7 `12-11-79`')) throw new Error('r7 section failed');

// Việc kế tiếp — chèn R7 sau item R6, đánh số lại
if (!h.includes('4. **R7 `12-11-79` Pha B xong**')) {
  const anchor = 'Chi tiết `tasks/qa-w11-batch2-acceptance.md` mục R6 (untracked).';
  if (!h.includes(anchor)) throw new Error('anchor R6 failed');
  h = h.replace(anchor, anchor + '\n4. **R7 `12-11-79` Pha B xong** (28/10): build + vitest 299/299 — còn QA A–F trên Production (B8) rồi báo thầy (B9). LessonId dự kiến `adaptive-v4-12-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2`. Sau QA: tổng kết toàn loạt batch2 (7/7 bài).');
  h = h.replace('\n4. R7 `12-11-79` (g12, practice — "Luyện tập: Khoảng biến thiên…") Pha A Gate P+D.', '\n5. (R7 xong — kế hoạch thêm bài khác thuộc phạm vi riêng.)');
  h = h.replace('\n5. Sau R7:', '\n6. Sau R7:');
  h = h.replace('\n6. Hạ tầng QA:', '\n7. Hạ tầng QA:');
}
writeFileSync('HANDOFF.md', h, 'utf8');
console.log('HANDOFF R7 done, lines=' + h.split('\n').length);
