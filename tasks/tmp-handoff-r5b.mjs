// Hoàn tất HANDOFF cho R5 (test count + mục R5 + việc kế tiếp)
import { readFileSync, writeFileSync } from 'node:fs';
let h = readFileSync('HANDOFF.md', 'utf8');

h = h.replace(
  '- v4 (`src/lib/liveLesson/v4`): 27 file / **284 tests PASS** (baseline fix2: 279; +5 R4: it.each 79 ×3 + timeline gateD79 + binding phase 79). `npm run build` 0 TS error.',
  '- v4 (`src/lib/liveLesson/v4`): 27 file / **289 tests PASS** (baseline R4: 284; +5 R5: it.each 77 ×3 + timeline gateD77 + binding phase 77). `npm run build` 0 TS error.',
);
if (!h.includes('289 tests PASS')) throw new Error('test failed');

const r5 = `## R5 \`12-11-77\` — "Nguyên hàm — Tiết 2" (g12, practice)
- Gate D ĐÃ DUYỆT (thầy, 28/10): \`tasks/gate-d-12-11-77.md\` — nguồn nội dung duy nhất, KHÔNG sửa. Thầy duyệt 4 mục: phân bổ S0–S10 = 1-5-3-4-3-1-5-4-7-5-2 phút; [HỆ QUẢ] quên C bỏ cụ thể hóa "sập gãy công trình" (giữ "bỏ trạng thái ban đầu → mô hình dự báo sai lệch"); \`category\` AI-error "Thiếu điều kiện"; kind \`practice\` + timeline key \`gateD77\`.
- Giáo án gốc: \`tasks/giaoan-goc-12-11-77.md\` (Firestore lessonPlans/1761870e-…, 28 031 ký tự, tải 28/10 qua \`tasks/tmp-giaoan-fetch-12-11-77.cjs\` — kwList "nguyên hàm"). Vướng: replace đường dẫn dump phải khớp "tmp-…" (khuôn dùng path.join, KHÔNG có prefix tasks/) — lần đầu ghi đè dump 79, đã fetch lại (không ảnh hưởng dữ liệu 79 đã commit).
- Spec: kind/lessonType \`practice\`; formulas×4; examples×2 = đoàn tàu s(0)=0 + đường cong M(1;2) mức Giỏi (nguyên bản mục II); exercises×6 = PHT1 Nhiệm vụ A/B/C.a/C.b + PHT2 TB/Khá (đáp án nguyên bản; A.b/B.b áp dụng trực tiếp bảng — ghi rõ nguồn); **quick×3 gộp từ 5 câu ĐGTX gốc** (mini-check ∫sin + ∫e^{2x} gộp 1 entry — gốc đã ghép 2 phép tính trong 1 hoạt động; mini-quiz câu 1 riêng; câu 2+3 gộp 1 entry — parser chỉ nhận 2–3 entries; mọi câu giữ nguyên văn đề + đáp án mục IV); mistakes×4; boardKnowledge (bảng 10 công thức + cảnh báo 2 lỗi + quy trình 2 bước + Hình 2 mô tả lời + kinh tế học); timelineKey \`gateD77\` (0-60-360-540-780-960-1020-1320-1560-1980-2280-2400).
- aiError \`ai-error-12-11-77\`: category "Thiếu điều kiện"; bẫy "bạn Nam" ∫(1/x)dx = ln x + C thiếu trị tuyệt đối (đúng lỗi "⚠ Lỗi phổ biến cần tránh" gốc); wrongSolution TRẦN chỉ bài làm sai; proof đạo hàm 2 nhánh + [Gộp whyAiError/boardPrompt]; 5 trường plain Unicode không $.
- Code: \`TIMELINE_BY_KEY\` thêm \`gateD77\`; snapshot specs=5/aiErrors=5/files=5 (fingerprint \`7bfadfbe…c702\`); INTERACTIVE_SOURCE_KEYS 8 mã; W11BATCH2 entry thứ 5; exact-keys 8 mã (alphabet \`['10-11-79','10-11-80','11-11-75','11-11-76','11-11-78','11-11-79','12-11-77','12-11-80']\`, tên test 7→8).
- No-spoiler tokens QA: \`20,41\` (mini-quiz câu 3) + \`2\\ln\` (PHT2 Giỏi trong example 2).
- **Test**: v4 27 file / **289 PASS** (baseline R4: 284). \`npm run build\` 0 TS.

`;
h = h.replace('## Việc kế tiếp', r5 + '## Việc kế tiếp');
if (!h.includes('## R5 `12-11-77`')) throw new Error('r5 section failed');

h = h.replace(
  '2. R5–R7 theo plan (R5 `12-11-77` Pha A Gate P+D trước).',
  '2. R6 `12-11-78` (formation — Khoảng biến thiên, tứ phân vị, độ lệch chuẩn) Pha A Gate P+D trước; sau đó R7 `12-11-79` (practice).',
);
if (!h.includes('R6 `12-11-78`')) throw new Error('next failed');

writeFileSync('HANDOFF.md', h, 'utf8');
console.log('HANDOFF R5 done, lines=' + h.split('\n').length);
