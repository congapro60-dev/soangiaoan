// Cập nhật HANDOFF.md cho R4 Pha B (edit theo UTF-8 chuẩn qua node, tránh mojibake console)
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'HANDOFF.md';
let t = readFileSync(P, 'utf8');

// 1. Goal hiện tại
t = t.replace(
  'và **R3 trọn vẹn kèm fix1+fix2** (`11-11-78`: timeline Gate D per-lesson + binding theo phase, re-QA Production A–F ĐẠT — xem `tasks/qa-w11-batch2-acceptance.md`). Còn R4–R7',
  'và **R3 trọn vẹn kèm fix1+fix2** (`11-11-78`: timeline Gate D per-lesson + binding theo phase, re-QA Production A–F ĐẠT — xem `tasks/qa-w11-batch2-acceptance.md`), **R4 Pha B** (`11-11-79`, practice — code + test ĐẠT, chờ QA A–F). Còn R5–R7',
);
if (!t.includes('R4 Pha B')) throw new Error('goal replace failed');

// 2. Recipe item 1 — thêm file 79
t = t.replace(
  '`tasks/giaoan-goc-11-11-78.md` = `175b65bf…`)',
  '`tasks/giaoan-goc-11-11-78.md` = `175b65bf…`, `tasks/giaoan-goc-11-11-79.md` = `dc74b984…6726`)',
);
if (!t.includes('dc74b984')) throw new Error('recipe files replace failed');

// 3. Recipe item 3 — fingerprint mới
t = t.replace(
  'Giá trị sau R3·fix1 (27/10, thêm `timelineKey` vào spec 78): `54d92529bc0c133464fdc5b2c6a60fc74880d85ec7b481a437e5d920b8983c6f` (hex-64; trước đó R3: `f10723f4…`, R2+fix ký hiệu: `36c18d6d…`).',
  'Giá trị sau R4 (28/10, thêm spec 79 + file giáo án 79): `b6dfa109aaf14022404bbe5f533b9eeba0ea6293c4e375717a466ea67a77be24` (hex-64; trước đó R3·fix1: `54d92529…83c6f`, R3: `f10723f4…`, R2+fix ký hiệu: `36c18d6d…`).',
);
if (!t.includes('b6dfa109')) throw new Error('recipe fp replace failed');

// 4. Test section — cập nhật số
t = t.replace(
  '- v4 (`src/lib/liveLesson/v4`): 27 file / **274 tests PASS** (baseline R2: 269; +3 it.each R3; +2 test timeline fix1). `npm run build` 0 TS error.',
  '- v4 (`src/lib/liveLesson/v4`): 27 file / **284 tests PASS** (baseline fix2: 279; +5 R4: it.each 79 ×3 + timeline gateD79 + binding phase 79). `npm run build` 0 TS error.',
);
if (!t.includes('284 tests PASS')) throw new Error('test replace failed');

// 5. Chèn mục R4 trước "## Việc kế tiếp"
const r4 = `## R4 \`11-11-79\` — "Hai mặt phẳng song song — Tiết 3" (g11, practice)
- Gate D ĐÃ DUYỆT (thầy, 27/10): \`tasks/gate-d-11-11-79.md\` — nguồn nội dung duy nhất, KHÔNG sửa. Thầy duyệt 4 mục: phân bổ S0–S10 = 1-4-2-5-3-1-8-5-6-3-2 phút; [HỆ QUẢ] giàn giáo bỏ chuỗi cơ học (giữ mảng hình học — tiền lệ Burj 78); đáp án tự lập luận PHT Khá c) SAI vì AB ∥ CD không cắt nhau; kind \`practice\` + timeline key \`gateD79\`.
- Giáo án gốc: \`tasks/giaoan-goc-11-11-79.md\` (Firestore lessonPlans/c8453c88-…, 28 115 ký tự, tải 27/10). Fetch qua \`tasks/tmp-giaoan-fetch-11-11-79.cjs\` — trang V8.8 mở thư viện bằng nút sidebar "Thư viện" trên tab dashboard (KHÔNG còn ở /adaptive-lessons; nút "Tạo từ giáo án nguồn" dẫn sang /adaptive-builder/new — KHÔNG bấm). Cấm viết script tiếng Việt qua PowerShell Set-Content (double-encode hỏng chuỗi — viết bằng write tool).
- Spec: kind/lessonType \`practice\`; examples×2 = Polya chữa chung + dựng thiết diện (solution nguyên bản mục III.1/III.2); exercises×6 = PHT số 1 (NB điền khuyết / TH a / TH b / TH c) + VD "GK ∥ (ABCD)" (tự lập luận đã duyệt: I trung điểm AB, trung tuyến SI, Thales đảo trong △SIC) + VD thiết diện PHT số 2; quick×3 (đáp án C/B/hình bình hành mục IV); mistakes×4; boardKnowledge công khai không đáp án PHT; timelineKey \`gateD79\` (dải 0-60-300-420-720-900-960-1440-1740-2100-2280-2400).
- aiError \`ai-error-11-11-79\`: category "Thiếu điều kiện"; bẫy bỏ điều kiện cắt nhau a ∩ b = {I} (bài làm sai "MN ∥ AB, PQ ∥ CD ⇒ (MNPQ) ∥ (ABCD)" — đúng lỗi 38% HS quên điều kiện cắt nhau theo căn cứ điều chỉnh gốc); wrongSolution TRẦN chỉ bài làm sai; proof gộp [Gộp whyAiError/boardPrompt] như R2/R3; 5 trường plain Unicode không $.
- Code: \`TIMELINE_BY_KEY\` thêm \`gateD79\` (\`lessonAdapter.ts\`); snapshot thêm spec + aiError + file 79 (fingerprint \`b6dfa109…\`); \`INTERACTIVE_SOURCE_KEYS\` thêm \`'11-11-79'\`; \`W11BATCH2\` entry thứ 4; exact-keys 7 mã (alphabet \`['10-11-79','10-11-80','11-11-75','11-11-76','11-11-78','11-11-79','12-11-80']\`, tên test 6→7).
- No-spoiler tokens QA: \`d_S\`, \`HÌNH THANG\` (viết hoa — chỉ trong đáp án mục III.2; đề phân hóa chữ thường giữ nguyên theo gốc).

`;

t = t.replace('## Việc kế tiếp', r4 + '## Việc kế tiếp');
if (!t.includes('## R4 `11-11-79`')) throw new Error('r4 section insert failed');

// 6. Việc kế tiếp — R4 xong, R5 lên đầu
t = t.replace(
  '1. R4 — `11-11-79` (g11, "Hai mặt phẳng song song — Tiết 3", kind khả năng `practice`): Pha A Gate P+D theo plan → thầy duyệt → Pha B. Sau fix2 chỉ cần thêm key vào `TIMELINE_BY_KEY` + khai báo `timelineKey` trong spec — binding tự theo phase; validateContract sẽ bắt stepId mồ côi ngay khi build.',
  '1. R4 `11-11-79`: Pha B xong (build + vitest 284/284) — **còn QA A–F trên Production (B8) rồi báo thầy (B9)**. LessonId dự kiến `adaptive-v4-11-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2`.',
  '',
);
t = t.replace('2. R5–R7 theo plan.', '2. R5–R7 theo plan (R5 `12-11-77` Pha A Gate P+D trước).');

writeFileSync(P, t, 'utf8');
console.log('HANDOFF updated, lines=' + t.split('\n').length);
