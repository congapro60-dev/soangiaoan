# Lỗi AI trong tuần Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Tích hợp hoạt động kiểm định lời giải AI vào 48 giáo án Ban Toán W5–W6: 48 phiên bản vi mô, 20 phiên bản đầy đủ, dữ liệu thư viện local, PPTX và thẻ công cụ đồng bộ, không làm tăng timeline P0–P40.

**Architecture:** Tạo một nguồn dữ liệu `AiErrorPlan` riêng cho 48 mã tiết. `buildLessonModelForSpec` đọc nguồn này để đưa bản vi mô vào các hàng hoạt động hiện có, bản đầy đủ vào HĐ2 P25–P32, và đáp án chi tiết vào Teacher Key/phụ lục. Export JSON, tool cards và builder PPTX dùng cùng trường dữ liệu; mọi artifact được sinh ở staging rồi mới promotion.

**Tech Stack:** TypeScript/tsx, Node.js, `docx`, OOXML/OMML QA, JavaScript ES module với `@oai/artifact-tool`, LibreOffice render, PowerShell staging/copy.

---

## Phạm vi tệp

- Create: `giao an manus tao/_qa/ban_toan_rebuild/aiErrorOfWeek.ts` — kiểu dữ liệu, 48 thẻ lỗi, tập 20 mã đầy đủ và hàm tra cứu.
- Create: `giao an manus tao/_qa/ban_toan_rebuild/aiErrorOfWeek.contract.ts` — contract test cho số lượng, phân loại, trường bắt buộc và tính nhất quán thư viện.
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/generateBanToanDocs.ts` — model, kịch bản GV–HS, ghi bảng, Teacher Key và phụ lục.
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/exportLessonDeckData.ts` — truyền thẻ lỗi sang dữ liệu PPTX.
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/generateToolGuides.ts` — thêm hướng dẫn vận hành AI Error và fallback vào thẻ local.
- Create: `giao an manus tao/_qa/ban_toan_rebuild/generateAiErrorLibrary.ts` — sinh thư viện local chỉ gồm các thẻ đầy đủ.
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/pptx_lotK/buildLessonDecks.mjs` — hiển thị câu hỏi/lỗi AI ngắn trong slide hiện có, không tăng mật độ bằng cách thêm slide mới.
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/contentToolsContract.contract.ts` — kiểm tra mọi tiết có AI Error và kênh hiển thị không bị đưa vào cột ghi bảng sai phạm vi.

## Nguồn chuẩn 20 tiết đầy đủ

```ts
const FULL_AI_ERROR_KEYS = new Set([
  '10-5-35', '10-5-37', '10-5-38', '10-6-40', '10-6-41', '10-6-44', '10-6-45',
  '11-5-31', '11-5-32', '11-6-35', '11-6-37', '11-6-40', '11-6-41',
  '12-5-27', '12-5-29', '12-5-32', '12-5-33', '12-6-38', '12-6-40', '12-6-41',
]);
```

28 mã còn lại dùng `mode: 'micro'`. Mỗi thẻ phải có lời giải sai cụ thể, loại lỗi tiếng Việt, lời giải sửa, phép kiểm, lý do AI có thể sai, câu hỏi GV và fallback; không dùng chuỗi mô tả chung chung thay cho một mệnh đề Toán.

## Task 1: Viết contract test trước khi thêm dữ liệu

**Files:**
- Create: `giao an manus tao/_qa/ban_toan_rebuild/aiErrorOfWeek.contract.ts`

- [ ] **Step 1: Viết test đỏ**

Test import `AI_ERROR_PLANS`, `FULL_AI_ERROR_KEYS` và `getAiErrorPlan` từ `./aiErrorOfWeek`; kiểm tra:

```ts
import assert from 'node:assert/strict';
import { LESSON_SPECS } from './banToanContent';
import { AI_ERROR_PLANS, FULL_AI_ERROR_KEYS, getAiErrorPlan } from './aiErrorOfWeek';

assert.equal(Object.keys(AI_ERROR_PLANS).length, 48);
assert.equal(FULL_AI_ERROR_KEYS.size, 20);
assert.equal(new Set(Object.keys(AI_ERROR_PLANS)).size, 48);
for (const spec of LESSON_SPECS) {
  const card = getAiErrorPlan(spec.key);
  assert.equal(card.key, spec.key);
  assert.ok(['micro', 'full'].includes(card.mode));
  assert.ok(['Lỗi khái niệm', 'Lỗi đại số', 'Lỗi logic', 'Thiếu điều kiện'].includes(card.category));
  for (const field of ['wrongSolution', 'correction', 'proof', 'whyAiError', 'teacherPrompt', 'studentProduct', 'boardPrompt', 'offlineFallback']) {
    assert.ok(card[field as keyof typeof card], `${spec.key} thiếu ${field}`);
  }
  assert.equal(card.mode === 'full', FULL_AI_ERROR_KEYS.has(spec.key));
}
assert.ok(Object.values(AI_ERROR_PLANS).every((card) => !/WALT|WILF|NOW\/|PRODUCT\/|CHECK\/|NEXT\//i.test(card.teacherPrompt)));
console.log('aiErrorOfWeek: RED/GREEN assertions passed');
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Run: `npx tsx "giao an manus tao/_qa/ban_toan_rebuild/aiErrorOfWeek.contract.ts"`
Expected: fail vì `aiErrorOfWeek.ts` chưa tồn tại.

## Task 2: Tạo nguồn dữ liệu 48 thẻ lỗi

**Files:**
- Create: `giao an manus tao/_qa/ban_toan_rebuild/aiErrorOfWeek.ts`

- [ ] **Step 1: Khai báo type tối thiểu**

```ts
export type AiErrorMode = 'micro' | 'full';
export type AiErrorCategory = 'Lỗi khái niệm' | 'Lỗi đại số' | 'Lỗi logic' | 'Thiếu điều kiện';

export interface AiErrorPlan {
  key: string;
  mode: AiErrorMode;
  category: AiErrorCategory;
  wrongSolution: string;
  correction: string;
  proof: string;
  whyAiError: string;
  teacherPrompt: string;
  studentProduct: string;
  boardPrompt: string;
  offlineFallback: string;
  libraryTitle: string;
}
```

- [ ] **Step 2: Thêm đủ 48 record**

Mỗi record bám `spec.focus`, `spec.examples` và `spec.mistakes`; dùng công thức/ký hiệu đã có trong nguồn, không tự thêm chủ đề ngoài PPCT. 20 record full phải có lời giải nhiều bước và phép kiểm độc lập; 28 record micro có một mệnh đề sai đủ xác định để HS chỉ ra và sửa trong 1–2 phút.

- [ ] **Step 3: Chạy lại test để xác nhận GREEN**

Run: `npx tsx "giao an manus tao/_qa/ban_toan_rebuild/aiErrorOfWeek.contract.ts"`
Expected: `aiErrorOfWeek: RED/GREEN assertions passed`.

## Task 3: Tích hợp model và DOCX mà không phình cột ghi bảng

**Files:**
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/generateBanToanDocs.ts`

- [ ] **Step 1: Viết regression đỏ trong contract hiện có**

Thêm vào vòng lặp 48 tiết các kiểm tra `lesson.aiError`, 20 `mode === 'full'`, 28 `mode === 'micro'`, và kiểm tra `boardText` chỉ có `boardPrompt` ngắn; kiểm tra `teacherKey`/phụ lục có `wrongSolution`, `correction`, `proof`, `whyAiError`.

- [ ] **Step 2: Thêm trường model và helper script**

Import `AiErrorPlan`, thêm `aiError: AiErrorPlan` vào `LessonModel`, rồi gán `aiError: getAiErrorPlan(spec.key)` trong `buildLessonModelForSpec`. Tạo hai helper nội bộ:

```ts
const aiErrorMicroScript = (card: AiErrorPlan): string => [
  `── KIỂM LỖI AI (1–2 phút) ── GV chiếu thẻ: ${card.teacherPrompt}`,
  `HS làm: ${card.studentProduct}`,
  '→ Chờ ≥ 3 giây, gọi ngẫu nhiên; hỏi thêm “Bằng chứng nào?”',
  `Đáp án GV: ${card.correction} Phép kiểm: ${card.proof}`,
].join('\n');

const aiErrorFullScript = (card: AiErrorPlan): string => [
  '── LỖI AI TRONG TUẦN (7 phút) ── GV chiếu lời giải sai; không chiếu đáp án.',
  `[PHÁT HIỆN] GV hỏi: “Dòng nào chưa hợp lệ?” → Chờ ≥ 3 giây, gọi ngẫu nhiên.`,
  `[PHÂN LOẠI] GV hỏi: “Đây là ${card.category} hay loại khác? Bằng chứng nào?” → Chờ ≥ 5 giây.`,
  `[SỬA] HS viết lại lời giải; GV hỏi: “Điều kiện/bước biến đổi nào phải thay?”`,
  `[CHỨNG MINH] HS dùng phép kiểm: ${card.proof}`,
  `[AI LITERACY] GV hỏi: “Vì sao một đầu ra có vẻ hợp lý vẫn có thể sai?” HS nêu: ${card.whyAiError}`,
  `Sản phẩm bắt buộc: ${card.studentProduct}`,
].join('\n');
```

- [ ] **Step 3: Chèn script vào hàng hiện có**

  - Bản full: thêm `aiErrorFullScript` vào hàng `hd2` P25–P32 của 20 tiết; không tạo hàng/thời lượng mới.
  - Bản micro: thêm `aiErrorMicroScript` vào hàng chuẩn hóa/nhìn lại hiện có của 28 tiết; không chèn vào trước khi HS được tiếp cận quy tắc cốt lõi.
  - `boardOnlyContent` chỉ thêm `card.boardPrompt`, không thêm lời thoại, tuyến TV–GV–HS, QR, công cụ hay fallback.

- [ ] **Step 4: Đưa đáp án xuống Teacher Key/phụ lục**

Trong `teacherKeyBody` thêm mục “LỖI AI — ĐÁP ÁN GV” gồm thẻ sai, loại lỗi, sửa, phép kiểm, lý do AI sai và rubric 4 ô. Trong `operationAppendixBody` thêm cách chiếu, việc HS ghi vở, Slido cho phân loại, Padlet cho lời giải dài và fallback giấy.

- [ ] **Step 5: Chạy contract DOCX model**

Run: `npx tsx "giao an manus tao/_qa/ban_toan_rebuild/generateBanToanDocs.contract.ts"` và `npx tsx "giao an manus tao/_qa/ban_toan_rebuild/contentToolsContract.contract.ts"`
Expected: cả hai in PASS; không có tiếng Anh ngoài cầu nối ghi bảng và không có vận hành công cụ trong `noiDung`.

## Task 4: Đồng bộ dữ liệu deck, thẻ công cụ và thư viện local

**Files:**
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/exportLessonDeckData.ts`
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/generateToolGuides.ts`
- Create: `giao an manus tao/_qa/ban_toan_rebuild/generateAiErrorLibrary.ts`

- [ ] **Step 1: Export `aiError`**

Thêm `aiError: model.aiError` vào mỗi record JSON; không sao chép lại nội dung ở nhiều nguồn.

- [ ] **Step 2: Thêm mục vận hành vào mỗi thẻ**

Sau phần kịch bản hoạt động, thêm mục `LỖI AI TRONG TUẦN` với prompt, sản phẩm, công cụ tùy chọn, fallback; full card thêm đáp án/rubric, micro card giữ bản ngắn và trỏ sang Teacher Key.

- [ ] **Step 3: Sinh thư viện local**

`generateAiErrorLibrary.ts` đọc `LESSON_SPECS`, gọi `getAiErrorPlan`, lọc `mode === 'full'`, ghi một file Markdown nhóm theo khối/tuần vào `Cong cu so/AI_ERROR_LIBRARY.md`. Không tạo URL hay tuyên bố có board online.

- [ ] **Step 4: Chạy kiểm tra export**

Run: `npx tsx "giao an manus tao/_qa/ban_toan_rebuild/exportLessonDeckData.ts" "$env:AI_ERROR_STAGING_DATA"`
Expected: JSON có 48 record, mỗi record có `aiError`, 20 record full.

## Task 5: Cập nhật PPTX dùng slide hiện có

**Files:**
- Modify: `giao an manus tao/_qa/ban_toan_rebuild/pptx_lotK/buildLessonDecks.mjs`

- [ ] **Step 1: Thêm câu hỏi AI vào slide “Chuỗi câu hỏi và tiến trình”**

Dùng `lesson.aiError.boardPrompt` và `lesson.aiError.studentProduct` trong panel hiện có; rút gọn bằng `readable` để không vượt khung. Không tạo thêm slide cho từng lỗi.

- [ ] **Step 2: Chạy artifact builder bằng runtime được load**

Trước lần authoring PPTX đầu tiên chạy đúng một lần `mark_artifact_operation_started.mjs --operation-kind edit --expected-output-count 48 --output-format pptx`. Dùng `RUNTIME_NODE`, `RUNTIME_NODE_MODULES`, `RUNTIME_BIN_DIR` từ `codex_app__load_workspace_dependencies`; không dùng runtime hệ thống hoặc cài package mới.

- [ ] **Step 3: Kiểm tra render deck**

Run `render_slides.py` cho 48 deck và `slides_test.py` cho từng deck; expected không có overflow, slide trống, chữ cắt hoặc prompt AI bị tràn.

## Task 6: Sinh staging và QA DOCX/PPTX

**Files:**
- Use existing: `generateBanToanDocs.ts`, `generateToolGuides.ts`, `exportLessonDeckData.ts`, `checkWordXml.py`, `check_docs.py`, `check_weekly_cis.py`, `checkRenderBatch.py`.

- [ ] **Step 1: Chạy baseline test/build trước promotion**

Run `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run test` và `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run build`; ghi lại exit code và số test để phân biệt lỗi có sẵn.

- [ ] **Step 2: Sinh DOCX vào thư mục staging riêng**

Tạo thư mục tạm theo timestamp trong `Temp`, chạy `generateToStaging`, kiểm 48 file và không chạm output production.

- [ ] **Step 3: Chạy QA cấu trúc và nội dung**

Chạy contract TypeScript, `checkWordXml.py`, `check_docs.py`, `check_weekly_cis.py`, `checkRenderBatch.py`; kiểm 48/48 có AI Error, 20/20 full, 28/28 micro, 0 cột ghi bảng chứa vận hành.

- [ ] **Step 4: Render và xem ảnh**

Dùng LibreOffice/render helper hiện có để tạo PNG từng DOCX; xem contact sheet và trang đại diện của cả ba khối, cả hai mode. Render/inspect toàn bộ PPTX; nếu có lỗi layout thì sửa nguồn, sinh lại và kiểm lại.

## Task 7: Promotion có backup và hậu kiểm

- [ ] **Step 1: Chốt manifest 48 DOCX + 48 PPTX + thẻ công cụ/library**

So sánh danh sách staging với output đích; không dùng glob rộng hoặc `git add .`.

- [ ] **Step 2: Tạo backup scoped**

Copy đúng các file sẽ bị ghi đè sang thư mục `Temp` có timestamp; không xóa backup trong bước này.

- [ ] **Step 3: Promotion**

Copy staging vào đúng thư mục `giao an manus tao/TDS`, giữ nguyên file ngoài W5–W6 và file ngoài manifest.

- [ ] **Step 4: Hậu kiểm**

Chạy SHA-256 staging–đích, kiểm Word XML sau promotion, kiểm số lượng file, mở/render representative sau promotion và chạy lại test/build nếu generator hoặc source app bị ảnh hưởng.

- [ ] **Step 5: Commit chỉ phần thuộc task**

Stage đúng source/contract/generator/plan/spec; không stage các tệp dirty/untracked khác của người dùng. Không push.

## Self-review

- Đã phủ đủ yêu cầu 48 vi mô, 20 full, 28 micro, bốn loại lỗi, phân hóa, ngôn ngữ, CIS, công cụ/fallback, DOCX, PPTX, thư viện và QA.
- Không có bước yêu cầu tạo board online hoặc dùng dữ liệu cá nhân.
- Không có bước thêm hoạt động mới ngoài timeline; mọi nội dung full thay thế một lượt phản biện hiện có.
- Tất cả mã tiết trong manifest đều tồn tại trong 48 `LESSON_SPECS`; 20 mã full đều là tiết luyện tập.
- TDD bắt đầu bằng contract đỏ; implementation chỉ được giữ sau khi contract xanh.
