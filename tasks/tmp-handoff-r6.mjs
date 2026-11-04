// HANDOFF + todo cho R6 Pha B (regex theo mốc, tránh lệch chuỗi)
import { readFileSync, writeFileSync } from 'node:fs';

let h = readFileSync('HANDOFF.md', 'utf8');

// 1. Goal
h = h.replace(
  ', **R5 hoàn tất kèm QA A–F ĐẠT** (`12-11-77`, practice — commit `7781984` + docs `3d52fe9`, republish 56 bài, phiên `sWYnJAWlwke3c76fafp3`). Còn R6–R7',
  ', **R5 hoàn tất kèm QA A–F ĐẠT** (`12-11-77`, practice — commit `7781984` + docs `3d52fe9`, republish 56 bài, phiên `sWYnJAWlwke3c76fafp3`) và **R6 Pha B** (`12-11-78`, formation — code + test ĐẠT, chờ QA A–F). Còn R7',
);
if (!h.includes('R6 Pha B')) throw new Error('goal failed');

// 2. Recipe files
h = h.replace(
  '`tasks/giaoan-goc-12-11-77.md` = `c45daa12…db10`)',
  '`tasks/giaoan-goc-12-11-77.md` = `c45daa12…db10`, `tasks/giaoan-goc-12-11-78.md` = `548bf1ff…41b7`)',
);
if (!h.includes('548bf1ff')) throw new Error('recipe files failed');

// 3. Fingerprint (regex mốc)
h = h.replace(/Giá trị sau R5 \(28\/10[^\n]+\)/, 'Giá trị sau R6 (28/10, thêm spec 78 g12 + file giáo án 78): `929c3bb92a77e595929b1368ad61ebda81bf7bbf44b1d9f07506d616e5802e3a` (hex-64; trước đó R5: `7bfadfbe…c702`, R4: `b6dfa109…7be24`).');
if (!h.includes('929c3bb9')) throw new Error('fp failed');

// 4. Test counts
h = h.replace(
  '- v4 (`src/lib/liveLesson/v4`): 27 file / **289 tests PASS** (baseline R4: 284; +5 R5: it.each 77 ×3 + timeline gateD77 + binding phase 77). `npm run build` 0 TS error.',
  '- v4 (`src/lib/liveLesson/v4`): 27 file / **294 tests PASS** (baseline R5: 289; +5 R6: it.each 78g12 ×3 + timeline gateD1278 + binding phase). `npm run build` 0 TS error.',
);
if (!h.includes('294 tests PASS')) throw new Error('test failed');

// 5. Mục R6 trước "## Việc kế tiếp"
const r6 = `## R6 \`12-11-78\` — "Khoảng biến thiên và khoảng tứ phân vị — Tiết 1" (g12, formation)
- Gate D ĐÃ DUYỆT (thầy, 28/10): \`tasks/gate-d-12-11-78.md\` — nguồn nội dung duy nhất, KHÔNG sửa. Thầy chốt 4 mục: phân bổ S0–S10 = 1-4-3-4-3-1-8-5-6-3-2 phút; **BLOCKER đáp án mức VD gốc sai Toán** (bảng Nhiệm vụ 2 ghi Q₃(A) ≈ 11,71 quên nhân h=2; tóm tắt ghi Δ_Q(A) = 2,86; Δ_Q(B) = 5,67) → dùng số tự kiểm **Δ_Q(A) = 4,76; Δ_Q(B) = 5,20**, kết luận "A đồng đều hơn" giữ nguyên; \`category\` AI-error "Lỗi đại số"; kind \`formation\` + timeline key \`gateD1278\` (tên gateD78 đã bị bài 11-11-78 chiếm).
- Giáo án gốc: \`tasks/giaoan-goc-12-11-78.md\` (Firestore lessonPlans/80820147-…, 26 211 ký tự, tải 28/10 — kwList "khoảng biến thiên/tứ phân vị/độ lệch chuẩn"). Ghi chú gốc "Tuần học 10" → theo app tuần 11.
- Spec: kind/lessonType \`formation\`; formulas×4 (R; Q1 nội suy; Q3 + ΔQ; quy trình 3 bước); examples×2 = Internet 50 HS (R = 240) + chữa chung kiểm nhanh 60 thí sinh (30,34); exercises×6 = PHT 3 nhánh NB/TH/VD (nhiệm vụ 1+2, nhiệm vụ 3 tách riêng) + nhiệm vụ neo (nhân đôi tần số) + [SÁNG TẠO] cộng 2/nhân đôi giá trị; quick×3 = kiểm nhanh NB/TH/VDC (60 thí sinh, đáp án nguyên bản 100/30,34/ΔQ bền vững); mistakes×4 (đảo chiều R, C vs n_p "lỗi sai chí mạng", quên nhân h — dẫn BLOCKER gốc, dùng R khi có ngoại lai); boardKnowledge (R + Q1/Q3 + ΔQ + quy trình + mô tả TikZ trục dữ liệu + SÁNG TẠO + ứng dụng); timelineKey \`gateD1278\` (0-60-300-480-720-900-960-1440-1740-2100-2340-2400).
- aiError \`ai-error-12-11-78\`: category "Lỗi đại số"; bẫy [PHẢN BIỆN] HĐ3 Bước 3 "R = 35 − 10 = 25" (đảo chiều + lấy nhầm mút); wrongSolution TRẦN chỉ bài làm sai; proof định nghĩa a(m+1) − a1 + [Gộp whyAiError/boardPrompt]; 5 trường plain Unicode không $.
- Code: \`TIMELINE_BY_KEY\` thêm \`gateD1278\`; snapshot specs=6/aiErrors=6/files=6 (fingerprint \`929c3bb9…02e3a\`); INTERACTIVE_SOURCE_KEYS 9 mã; W11BATCH2 entry thứ 6; exact-keys 9 mã (alphabet \`['10-11-79','10-11-80','11-11-75','11-11-76','11-11-78','11-11-79','12-11-77','12-11-78','12-11-80']\`, tên test 8→9).
- No-spoiler tokens QA: \`41,25\` (PHT NB) + \`30,34\` (kiểm nhanh TH) — mỗi token chỉ 1 lần trong giáo án gốc, đều ở phần đáp án.
- **Test**: v4 27 file / **294 PASS** (baseline R5: 289). \`npm run build\` 0 TS.

`;
h = h.replace('## Việc kế tiếp', r6 + '## Việc kế tiếp');
if (!h.includes('## R6 `12-11-78`')) throw new Error('r6 section failed');

// 6. Việc kế tiếp — chèn item R6 sau item R5, đổi số các item sau
if (!h.includes('3. **R6 `12-11-78` HOÀN TẤT**')) {
  const anchor = 'Spec quick gộp 5 câu ĐGTX gốc thành 3 entry (parser 2–3). Chi tiết `tasks/qa-w11-batch2-acceptance.md` mục R5 (untracked).';
  if (!h.includes(anchor)) throw new Error('anchor R5 failed');
  h = h.replace(anchor, anchor + '\n3. **R6 `12-11-78` Pha B xong** (28/10): build + vitest 294/294 — còn QA A–F trên Production (B8) rồi báo thầy (B9). LessonId dự kiến `adaptive-v4-12-11-78-24YyULmWgBOM6HZCfJ56RN5tiet2`.');
  h = h.replace('\n3. R6 `12-11-78` (formation — Khoảng biến thiên, tứ phân vị, độ lệch chuẩn) Pha A Gate P+D trước; sau đó R7 `12-11-79` (practice).', '\n4. R7 `12-11-79` (g12, practice — "Luyện tập: Khoảng biến thiên…") Pha A Gate P+D.');
  h = h.replace('\n4. R7 `12-11-79` (g12, practice — "Luyện tập: Khoảng biến thiên…") Pha A Gate P+D.\n4. Sau R7:', '\n4. R7 `12-11-79` (g12, practice — "Luyện tập: Khoảng biến thiên…") Pha A Gate P+D.\n5. Sau R7:');
  h = h.replace('\n4. Hạ tầng QA:', '\n6. Hạ tầng QA:');
}
writeFileSync('HANDOFF.md', h, 'utf8');
console.log('HANDOFF R6 done, lines=' + h.split('\n').length);
