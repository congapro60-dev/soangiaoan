# Plan V27 — Chuẩn THPTQG cho nhiệm vụ Toán

- **Spec**: `docs/superpowers/specs/2026-10-23-thptqg-task-types-design.md`
- **Nhánh**: `codex/universal-content-release` — worktree `C:\Users\ADMIN\.codex\worktrees\universal-content-release`
- **Lệnh chạy (PowerShell, KHÔNG dùng `cd /d`)**:
  - Test mới một file: `node --test tests/lesson-thptqg-v27.test.mjs` (chạy trong worktree)
  - Full: `npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run test`
  - Typecheck: `npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run typecheck`
  - Build: `npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run build`
- **Trạng thái nền**: full test 1409/1409; chưa có task nào của V27 trong code.

## File Structure

```
tests/lesson-thptqg-v27.test.mjs        (mới) — toàn bộ test V27
lib/lesson/schema.js                    TF_RATIO, verdictMeta, decimal_4
lib/lesson/validate.js                  SHORT_ANSWER_4_FORMATS + validShortAnswerVector decimal_4
lib/lesson/runtime.js                   SUBMIT/GROUP_SUBMIT lưu ratio + perItem
lib/lesson/class-events.js              điểm mini-game × ratio
components/lesson/TaskInput.tsx         keypad thập phân + ✓/✗ từng phát biểu
lib/lesson/generation-provider.js       prompt 4 dạng THPTQG + minh họa
scripts/thptqg-v27-pilot.mjs            (mới) patch 3 entry pilot
content/lessons/hki-2026-g11.json       (sửa qua script)
app/globals.css hoặc file css đang chứa .task-*  (tìm bằng grep `task-short-answer-cell`)
```

---

## Task 1 — Thang điểm đúng/sai: `TF_RATIO` + `verdictMeta` trong `schema.js`

### 1a. Viết test trước (thất bại)

Tạo `tests/lesson-thptqg-v27.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHECKER_REGISTRY } from '../lib/lesson/schema.js';

const tfStatements = [
  { id: 's1', label: 'a' }, { id: 's2', label: 'b' }, { id: 's3', label: 'c' }, { id: 's4', label: 'd' }
];
const tfTask = {
  id: 'tf-task', type: 'closed',
  inputSchema: { type: 'true_false_4', statements: tfStatements },
  evaluation: { checkerId: 'true_false_4', answerKey: [true, true, false, false] }
};

test('true_false_4 trả ratio theo thang THPT 2025, ok nhị phân giữ nguyên', () => {
  const checker = CHECKER_REGISTRY.true_false_4;
  const full = checker([true, true, false, false], tfTask);
  assert.equal(full.ok, true);
  assert.equal(full.ratio, 1);
  const zero = checker([false, false, true, true], tfTask);
  assert.equal(zero.ok, false);
  assert.equal(zero.ratio, 0);
  const half = checker([true, true, true, false], tfTask);
  assert.equal(half.ok, false);
  assert.deepEqual(half.perItem, [true, true, false, true]);
  assert.equal(half.ratio, 0.5);
  assert.equal(checker([true, false, true, true], tfTask).ratio, 0.1); // trúng 1/4 (chỉ ô 1 khớp)
  assert.equal(checker([true, false, false, true], tfTask).ratio, 0.25); // trúng 2/4
  assert.equal(checker([true, false, false, false], tfTask).ratio, 0.5); // trúng 3/4
});
```

Chạy: `node --test tests/lesson-thptqg-v27.test.mjs` → **kỳ vọng FAIL** (`full.ratio` là `undefined`).

### 1b. Cài đặt

Trong `lib/lesson/schema.js`, ngay trên `export const CHECKER_REGISTRY` (dòng 109) chèn:

```js
// Thang điểm phần trúng/treo của câu đúng–sai theo đề THPT 2025 — khớp lib/exam/scoring.js (TF_RATIO).
export const TF_RATIO = Object.freeze([0, 0.1, 0.25, 0.5, 1]);

// Chuẩn hóa kết quả checker thành {ratio, perItem} để runtime lưu vào submission.
// Checker không có ratio (numeric_exact, choice_exact, ...) → ratio nhị phân theo isCorrect.
export function verdictMeta(checkRes, isCorrect) {
  const ratio = Number.isFinite(checkRes?.ratio) ? checkRes.ratio : (isCorrect ? 1 : 0);
  const perItem = Array.isArray(checkRes?.perItem) && checkRes.perItem.length === 4 ? checkRes.perItem : undefined;
  return { ratio, perItem };
}
```

Sửa dòng return của `true_false_4` (hiện là `return { ok: perItem.every(Boolean), perItem };` tại dòng 133):

```js
    return { ok: perItem.every(Boolean), perItem, ratio: TF_RATIO[perItem.filter(Boolean).length] };
```

### 1c. Verify + commit

`node --test tests/lesson-thptqg-v27.test.mjs` → **PASS**.

```powershell
git -C "C:\Users\ADMIN\.codex\worktrees\universal-content-release" add -A
git -C "C:\Users\ADMIN\.codex\worktrees\universal-content-release" commit -m "feat(lesson): TF ratio THPT 2025 in true_false_4 verdict + verdictMeta helper"
```

---

## Task 2 — `decimal_4` cho trả lời ngắn (`schema.js` + `validate.js`)

### 2a. Test trước

Thêm vào `tests/lesson-thptqg-v27.test.mjs`:

```js
test('short_answer_4 decimal_4: chấm↔phẩy tương đương, luật vị trí 4 ký tự', () => {
  const checker = CHECKER_REGISTRY.short_answer_4;
  const task = {
    id: 'sa-decimal', type: 'closed',
    inputSchema: { type: 'short_answer_4', format: 'decimal_4' },
    evaluation: { checkerId: 'short_answer_4', answerKey: ['0', '.', '2', '5'] }
  };
  assert.equal(checker(['0', ',', '2', '5'], task).ok, true);
  assert.equal(checker(['0', '.', '2', '5'], task).ok, true);
  assert.equal(checker(['0', ',', '2', '6'], task).ok, false);
  const negTask = { ...task, evaluation: { checkerId: 'short_answer_4', answerKey: ['-', '3', ',', '5'] } };
  assert.equal(checker(['-', '3', ',', '5'], negTask).ok, true);
  assert.equal(checker([',', '2', '5', '0'], task).ok, false);
  assert.equal(checker(['-', '-', '1', '2'], task).ok, false);
  assert.equal(checker(['0', ',', ',', '5'], task).ok, false);
  assert.equal(checker(['a', ',', '2', '5'], task).ok, false);
  // dạng cũ không đổi
  const digitsTask = { ...task, inputSchema: { type: 'short_answer_4', format: 'digits' }, evaluation: { checkerId: 'short_answer_4', answerKey: ['1', '2', '0', '6'] } };
  assert.equal(checker(['1', '2', '0', '6'], digitsTask).ok, true);
  assert.equal(checker(['1', '2', '0', '7'], digitsTask).ok, false);
});
```

Chạy → **FAIL** (key `decimal_4` rơi vào whitelist thiếu → checker trả `{ok:false}` cho cả input đúng).

### 2b. `lib/lesson/schema.js`

Tìm hàm `shortAnswerFormat` (dòng ~93-97, whitelist `['digits','signed_digits','alphanumeric']`) — thêm `'decimal_4'` vào mảng.

Trong `normalizeShortAnswerVector`, thêm nhánh trước dòng cuối `return format === 'alphanumeric' ? ...`:

```js
  if (format === 'decimal_4') {
    const normalized = cells.map(cell => cell.replace('.', ','));
    if (!/^[-\d]$/.test(normalized[0]) || normalized.slice(1).some(cell => !/^[\d,]$/.test(cell))) return null;
    if (normalized.filter(cell => cell === ',').length > 1) return null;
    const commaAt = normalized.indexOf(',');
    if (commaAt > 0 && !/^\d$/.test(normalized[commaAt - 1])) return null;
    return normalized;
  }
```

### 2c. `lib/lesson/validate.js`

- Dòng 131: `const SHORT_ANSWER_4_FORMATS = new Set(['digits', 'signed_digits', 'alphanumeric', 'decimal_4']);`
- Trong `validShortAnswerVector` (189-197), thêm nhánh trước `return false;` cuối:

```js
  if (format === 'decimal_4') {
    const normalized = cells.map(cell => cell.replace('.', ','));
    if (!/^[-\d]$/.test(normalized[0]) || normalized.slice(1).some(cell => !/^[\d,]$/.test(cell))) return false;
    if (normalized.filter(cell => cell === ',').length > 1) return false;
    const commaAt = normalized.indexOf(',');
    if (commaAt > 0 && !/^\d$/.test(normalized[commaAt - 1])) return false;
    return true;
  }
```

### 2d. Verify + commit

`node --test tests/lesson-thptqg-v27.test.mjs` → **PASS**. Đồng thời chạy nhanh nhóm schema sẵn có:

`npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run test` (ghi nhận số test nền; full check ở Task 8).

Commit: `feat(lesson): decimal_4 short answer format (THPTQG 4-character decimal)`.

---

## Task 3 — Runtime lưu `ratio` + `perItem` vào submission / sản phẩm nhóm

Mục đích: UI đọc từ prop `submission` (đã có sẵn) để hiển thị ✓/✗ từng phát biểu + điểm một phần. Không thêm plumbing mới; **không đổi** các consumer `.ok`.

### 3a. Test trước (thất bại)

Thêm vào test file:

```js
test('verdictMeta chuẩn hóa ratio/perItem cho mọi checker', async () => {
  const { verdictMeta } = await import('../lib/lesson/schema.js');
  assert.deepEqual(verdictMeta({ ok: true, perItem: [true, false, true, true], ratio: 0.75 }, false), { ratio: 0.75, perItem: [true, false, true, true] });
  assert.deepEqual(verdictMeta({ ok: true }, true), { ratio: 1, perItem: undefined });
  assert.deepEqual(verdictMeta({ ok: false }, false), { ratio: 0, perItem: undefined });
});
```

Chạy → **FAIL** (chưa có `verdictMeta`… nếu Task 1 đã tạo helper thì test này PASS ngay — khi đó dùng chính nó làm kiểm tra hồi quy; phần verify runtime thật ở bước 3c bằng full test suite).

### 3b. `lib/lesson/runtime.js`

**Import**: thêm `verdictMeta` vào import từ `'./schema.js'` (cùng dòng với `CHECKER_REGISTRY` — tìm `from './schema.js'`).

**SUBMIT** (khối `case 'SUBMIT'`, vùng dòng 1223-1258):

1. Sửa khai báo + nhánh closed:

```js
      let isCorrect = false;
      let assessmentStatus = 'assessed';
      let checkRes = null;

      if (task.type === 'closed') {
        const checker = CHECKER_REGISTRY[task.evaluation?.checkerId];
        if (!checker) {
          return { state, result: { ok: false, code: 'INVALID_TASK' } };
        }
        checkRes = checker(answer, task);
        isCorrect = Boolean(checkRes?.ok);
      } else if (task.type === 'open') {
```

2. Ngay sau chuỗi nhánh if/else (trước `const isRevealed ...`), thêm:

```js
      const verdict = task.type === 'closed' ? verdictMeta(checkRes, isCorrect) : { ratio: isCorrect ? 1 : 0, perItem: undefined };
```

3. Đối tượng `subRecord` (dòng 1246-1256) → thêm 2 dòng:

```js
      const subRecord = {
        submissionId,
        learnerId: actor.id,
        taskId,
        activityId: currAct.id,
        answer,
        ok: isCorrect,
        assessmentStatus,
        assisted: isAssisted,
        ratio: verdict.ratio,
        ...(verdict.perItem ? { perItem: verdict.perItem } : {}),
        at: now
      };
```

**GROUP_SUBMIT** (vùng 1739-1759):

1. Sửa khối tính điểm closed:

```js
      let isCorrect = null;
      let verdict = { ratio: 0, perItem: undefined };
      if (task.type === 'closed') {
        const checker = CHECKER_REGISTRY[task.evaluation?.checkerId];
        if (!checker) return { state, result: { ok: false, code: 'INVALID_TASK' } };
        const checkRes = checker(answer, task);
        isCorrect = Boolean(checkRes?.ok);
        verdict = verdictMeta(checkRes, isCorrect);
      }
```

2. Trong `next.groupProducts[productKey] = {` — thêm sau `ok: isCorrect,`:

```js
        ratio: verdict.ratio,
        ...(verdict.perItem ? { perItem: verdict.perItem } : {}),
```

Reward ledger (`runtime.js:1295-1300`) **giữ nguyên** nhị phân theo spec.

### 3c. Verify + commit

- Full suite: `npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run test` → xanh (nếu có test deepEqual cứng trên submissions/groupProducts, cập nhật kỳ vọng — trường mới là chủ đích).
- Commit: `feat(lesson): store ratio/perItem on submissions and group products`.

---

## Task 4 — Điểm mini-game × ratio (`class-events.js`)

### 4a. Test trước

Thêm vào test file (fixture khớp khuôn `tests/lesson-class-events.test.mjs:15-27`):

```js
test('mini-game trao điểm thưởng một phần cho đúng/sai theo ratio THPT 2025', async () => {
  const events = await import('../lib/lesson/class-events.js');
  const teacher = { role: 'teacher', id: 'teacher' };
  const base = () => ({
    id: 'session', hostId: 'teacher', status: 'active', seed: 7, round: 1,
    timeline: { currentActivityId: 'practice', activityIndex: 0, locked: false }, clock: { arenaBudgetUsedMs: 0 },
    roster: { a: { id: 'a', present: true }, b: { id: 'b', present: true }, c: { id: 'c', present: true } },
    branches: { practice: { a: 'support', b: 'core', c: 'extension' } },
    package: {
      budget: { reserveMinutes: 5 },
      activities: [{ id: 'practice', phase: 'practice', taskIds: ['support', 'core', 'extension'] }],
      tasks: ['support', 'core', 'extension'].map((branch, i) => ({
        id: branch, type: 'closed', branch, prompt: 'Câu đúng/sai ' + i,
        evaluation: { checkerId: 'true_false_4', answerKey: [true, true, false, false] },
        inputSchema: { type: 'true_false_4', statements: [
          { id: 's1', label: 'a' }, { id: 's2', label: 'b' }, { id: 's3', label: 'c' }, { id: 's4', label: 'd' }
        ] }
      }))
    }
  });
  // trúng 3/4 → ratio 0,5 → điểm = round(10 × 0,5) = 5; trạng thái vẫn "chưa đúng" (chưa đủ 4/4)
  const started = events.startClassEvent(base(), { type: 'tug', seed: 2, durationMs: 180000 }, teacher, 1000);
  const answered = events.answerClassEvent(started, { learnerId: 'b', step: started.participants.b.step, answer: [true, true, true, false], requestId: 'tf-1' }, 2000);
  assert.equal(answered.lastResult.correct, false);
  assert.equal(answered.lastResult.points, 5);
  assert.equal(answered.participants.b.score, 5);
  // trúng đủ 4/4 → đúng + đủ 10 điểm
  const started2 = events.startClassEvent(base(), { type: 'tug', seed: 2, durationMs: 180000 }, teacher, 1000);
  const answered2 = events.answerClassEvent(started2, { learnerId: 'b', step: started2.participants.b.step, answer: [true, true, false, false], requestId: 'tf-2' }, 2000);
  assert.equal(answered2.lastResult.correct, true);
  assert.equal(answered2.participants.b.score, 10);
});
```

Chạy → **FAIL** (hiện `points = 0` khi `correct === false`).

### 4b. Cài đặt — `lib/lesson/class-events.js` dòng 168-172

Thay:

```js
  const correct = Boolean(CHECKER_REGISTRY[task.evaluation.checkerId](input.answer, task).ok);
  let points = correct ? (cell?.points || 10) : 0;
  const surfCombo = event.type === 'surf' && event.comboVersion === 1;
  const streak = surfCombo && correct ? Math.min(3,(player.streak || 0)+1) : 0;
  if (surfCombo) points = correct ? 10*streak : 0;
```

Bằng:

```js
  const verdict = CHECKER_REGISTRY[task.evaluation.checkerId](input.answer, task);
  const correct = Boolean(verdict.ok);
  const ratio = Number.isFinite(verdict.ratio) ? verdict.ratio : (correct ? 1 : 0);
  // Tỉ lệ nhân thẳng (không bọc `correct ?`): câu đúng/sai trúng một phần có correct=false nhưng vẫn phải có điểm.
  // Trúng 0 ý → ratio 0 → 0 điểm; số học sai/sai hoàn toàn → ratio 0 → 0 điểm (hành vi cũ giữ nguyên).
  let points = Math.round((cell?.points || 10) * ratio);
  const surfCombo = event.type === 'surf' && event.comboVersion === 1;
  const streak = surfCombo && correct ? Math.min(3,(player.streak || 0)+1) : 0;
  if (surfCombo) points = Math.round(10*streak*ratio); // streak=0 khi chưa đủ 4/4 → surf không combo, không điểm
```

Không đổi: cooldown (181), nhánh `estimate` (173-176 — numeric_exact không có ratio → 1), `correct/score` cập nhật (178), thăng tiến (183-188).

### 4c. Verify + commit

`node --test tests/lesson-thptqg-v27.test.mjs` → PASS; chạy `node --test tests/lesson-class-events.test.mjs` → PASS (không ai trong test cũ dùng checker có ratio).

Commit: `feat(lesson): partial credit for true/false tasks in class events`.

---

## Task 5 — UI: bàn phím thập phân + phản hồi từng phát biểu (`TaskInput.tsx`)

### 5a. Test trước

Thêm vào test file — khuôn transpileTaskInput đã có trong `tests/lesson-new-question-types.test.mjs` (ưu tiên copy hàm harness `editor()`/`renderTaskInput` từ đó; khung dưới là phần test mới):

```js
test('TaskInput: keypad thập phân + phản hồi từng phát biểu từ submission', () => {
  // (dùng harness transpile của tests/lesson-new-question-types.test.mjs — biến React + renderToStaticMarkup đã import sẵn)
  const decTask = {
    id: 't-decimal', type: 'closed', prompt: 'Viết 0,25',
    inputSchema: { type: 'short_answer_4', format: 'decimal_4' },
    evaluation: { checkerId: 'short_answer_4', answerKey: ['0', ',', '2', '5'] }
  };
  const decHtml = render(decTask, {});
  assert.ok(decHtml.includes('Bàn phím thập phân'), 'thiếu keypad decimal_4');
  assert.ok(decHtml.includes('task-helper-text'), 'thiếu hướng dẫn dấu phẩy');

  const tfTask = {
    id: 't-tf', type: 'closed', prompt: 'Đúng sai',
    inputSchema: { type: 'true_false_4', statements: [
      { id: 's1', label: 'a' }, { id: 's2', label: 'b' }, { id: 's3', label: 'c' }, { id: 's4', label: 'd' }
    ] },
    evaluation: { checkerId: 'true_false_4', answerKey: [true, true, false, false] }
  };
  const tfHtml = render(tfTask, { submission: { submissionId: 's1', ok: false, ratio: 0.5, perItem: [true, true, false, false] } });
  assert.ok(tfHtml.includes('task-tf-item'), 'thiếu phản hồi từng phát biểu');
  assert.ok(tfHtml.includes('✗'), 'thiếu dấu ✗');
  assert.ok(tfHtml.includes('Điểm ý'), 'thiếu chip điểm một phần');
  const tfHtml2 = render(tfTask, {});
  assert.ok(!tfHtml2.includes('task-tf-item'), 'không hiện phản hồi khi chưa có submission');
});
```

Chạy → **FAIL** (chưa có keypad, chưa có feedback).

### 5b. Cài đặt — `components/lesson/TaskInput.tsx`

1. **Dòng 22** — mở rộng union:

```tsx
      format?: "digits" | "signed_digits" | "alphanumeric" | "decimal_4";
```

2. **Interface `submission` (dòng 38-45)** — thêm 2 trường:

```tsx
  submission?: {
    submissionId?: string;
    answer?: unknown;
    ok?: boolean;
    assessmentStatus?: string;
    assisted?: boolean;
    at?: number;
    ratio?: number;
    perItem?: boolean[];
  } | null;
```

3. **Khối `isTrueFalse4` (dòng 675-696)** — trước `</fieldset>` (sau `</div>` của `task-options-grid`) chèn:

```tsx
          {Array.isArray(submission?.perItem) && (
            <div className="task-tf-feedback" role="status">
              {(submission?.perItem as boolean[]).map((itemOk, index) => (
                <span key={index} className={itemOk ? "task-tf-item task-tf-item-ok" : "task-tf-item task-tf-item-miss"}>
                  Phát biểu {index + 1}: {itemOk ? "✓" : "✗"}
                </span>
              ))}
              {typeof submission?.ratio === "number" && (
                <span className="task-ratio-chip">Điểm ý: {Math.round((submission?.ratio ?? 0) * 100) / 100}</span>
              )}
            </div>
          )}
```

4. **Khối `isShortAnswer4` (dòng 827-866)** — trước `</fieldset>` chèn keypad + trợ giúp:

```tsx
          {schema.format === "decimal_4" && (
            <>
              <div className="task-decimal-keypad" role="group" aria-label="Bàn phím thập phân">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ",", "-"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="task-short-answer-key"
                    disabled={disabled}
                    onClick={() => {
                      const next: string[] = [...answers];
                      const empty = next.findIndex(cell => !cell);
                      const target = empty === -1 ? 3 : empty;
                      next[target] = key;
                      handleValueChange(next);
                      const nextEmpty = next.findIndex(cell => !cell);
                      cellInputRefs.current[nextEmpty === -1 ? 3 : nextEmpty]?.focus();
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <small className="task-helper-text">Dấu phẩy là dấu thập phân (ví dụ 0,25). Ô đầu có thể là dấu trừ.</small>
            </>
          )}
```

5. **CSS** — `grep -rn "task-short-answer-cell" --include=*.css .` để tìm file css đang chứa style `task-*`; thêm cạnh đó:

```css
.task-tf-feedback { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
.task-tf-item { font-weight: 600; }
.task-tf-item-ok { color: #16a34a; }
.task-tf-item-miss { color: #dc2626; }
.task-ratio-chip { background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 2px 10px; font-size: 0.85em; }
.task-decimal-keypad { display: grid; grid-template-columns: repeat(6, minmax(44px, 56px)); gap: 6px; margin-top: 10px; }
.task-short-answer-key { padding: 10px 0; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; font-size: 1.05em; cursor: pointer; }
.task-short-answer-key:disabled { opacity: 0.5; cursor: not-allowed; }
```

### 5c. Verify + commit

- `node --test tests/lesson-thptqg-v27.test.mjs` → PASS.
- `npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run typecheck` → 0 lỗi.
- Commit: `feat(lesson): decimal keypad + per-statement TF feedback in TaskInput`.

---

## Task 6 — Bộ soạn AI: prompt 4 dạng THPTQG + minh họa bắt buộc

### 6a. Test trước

Thêm vào test file:

```js
test('prompt bộ soạn AI yêu cầu đủ 4 dạng THPTQG + minh họa hình học', async () => {
  const source = await readFile(new URL('../lib/lesson/generation-provider.js', import.meta.url), 'utf8');
  for (const marker of ['true_false_4', 'short_answer_4', 'decimal_4', 'diagramUrl', 'image']) {
    assert.ok(source.includes(marker), `thiếu hướng dẫn: ${marker}`);
  }
});
```

### 6b. Cài đặt — `lib/lesson/generation-provider.js` dòng 68

Thay nguyên chuỗi hiện tại:

```js
    'evaluation luôn là object; ưu tiên đủ 4 dạng câu chuẩn THPTQG trong phần luyện tập: trắc nghiệm {checkerId:"choice_exact",answerKey:"A",inputSchema:{options:[4 phương án id "A"-"D",label]}}; đúng/sai {checkerId:"true_false_4",inputSchema:{type:"true_false_4",statements:[4 {id,label}, mỗi phát biểu một mệnh đề có thể kiểm chứng]},answerKey:[true/false ×4]}; trả lời ngắn {checkerId:"short_answer_4",inputSchema:{type:"short_answer_4",format:"decimal_4"},answerKey: đúng 4 ký tự, thập phân dùng dấu phẩy ví dụ ["0",",","2","5"], trừ chỉ ở ô đầu} hoặc {checkerId:"numeric_exact",answerKey:số}; tự luận open {rubric:{criteria:[string],lookFor:[string]}}. Nhiệm vụ hình học/geometrie bắt buộc kèm hình minh họa: thêm "image" (URL hoặc data URI SVG) hoặc "diagramUrl" vào task. Không chắc đáp án dùng open; recheck và exit phải có nhiệm vụ kiểm tra cá nhân (không thay bằng reflection).',
```

(Giữ đúng cấu trúc phần tử trong mảng — chỉ thay nội dung chuỗi; sửa chữ "geometrie" thành "hình học" khi chèn.)

### 6c. Verify + commit

- `node --test tests/lesson-thptqg-v27.test.mjs` → PASS; chạy cả nhóm test generation sẵn có (`node --test tests/lesson-generation-provider.test.mjs`) → PASS.
- Commit: `feat(lesson): AI-authored tasks follow THPTQG formats with geometry illustrations`.

---

## Task 7 — Nội dung pilot: 3 entry (r013, r028, r108) + kiểm содержимого

### 7a. Script `scripts/thptqg-v27-pilot.mjs` (mới)

Chiến lược: **không sửa tay JSON 5MB** — script patches: clone cấu trúc một nhiệm vụ closed đang có của cùng activity để giữ đúng các trường hệ thống (`activityId`, `branch`, `participation`...), rồi thêm 3 nhiệm vụ mới + gắn `taskIds`. Giữ nguyên nhiệm vụ cũ (event `estimate` vẫn còn `numeric_exact` — ràng buộc `teacher-setup.js:49`).

Khung script (nội dung đề đầy đủ viết trực tiếp trong script, tiếng Việt có màu sắc lớp học):

```js
// Patch 3 entry pilot theo chuẩn THPTQG — chạy: node scripts/thptqg-v27-pilot.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../content/lessons/hki-2026-g11.json', import.meta.url);
const db = JSON.parse(readFileSync(FILE, 'utf8'));

const PILOTS = {
  'g11-discover-r013': [
    // 1 trắc nghiệm
    { id: 'thptqg-mc-1', checker: 'choice_exact', answerKey: 'B', prompt: 'Góc 120\u00b0 có số đo bằng bao nhiêu radian?', options: [
      { id: 'A', label: '\\frac{\\pi}{3}' }, { id: 'B', label: '\\frac{2\\pi}{3}' }, { id: 'C', label: '\\frac{3\\pi}{4}' }, { id: 'D', label: '\\frac{5\\pi}{6}' }] },
    // 1 đúng/sai
    { id: 'thptqg-tf-1', checker: 'true_false_4', answerKey: [true, true, false, true], prompt: 'Xét các phát biểu sau về số đo góc:', statements: [
      'Góc 120\u00b0 có số đo \\frac{2\\pi}{3} rad.',
      'Góc 45\u00b0 có số đo \\frac{\\pi}{4} rad.',
      'Góc 270\u00b0 có số đo \\frac{3\\pi}{4} rad.',
      'Trên đường tròn đơn vị, cung ứng góc 60\u00b0 có chiều dài \\frac{\\pi}{3}.' ] },
    // 1 trả lời ngắn decimal_4
    { id: 'thptqg-sa-1', checker: 'short_answer_4', format: 'decimal_4', answerKey: ['1', ',', '7', '4'],
      prompt: 'Dùng \\pi \\approx 3{,}14. Số đo radian của góc 100\u00b0, làm tròn đến hàng phần trăm, được ghi vào 4 ô (dấu phẩy là ô phân cách).' },
  ],
  'g11-discover-r028': [
    { id: 'thptqg-mc-1', checker: 'choice_exact', answerKey: 'A', image: 'data:image/svg+xml;utf8,' + encodeURIComponent(NHAN_SVG_HINH_CHOP), prompt: 'Cho tứ diện đều ABCD cạnh a (xem hình). Thể tích khối tứ diện bằng:', options: [
      { id: 'A', label: '\\frac{a^3\\sqrt{2}}{12}' }, { id: 'B', label: '\\frac{a^3}{6}' }, { id: 'C', label: '\\frac{a^3\\sqrt{3}}{12}' }, { id: 'D', label: '\\frac{a^3}{12}' }] },
    { id: 'thptqg-tf-1', checker: 'true_false_4', answerKey: [true, false, true, true], image: '...SVG chóp S.ABC...', prompt: 'Cho hình chóp S.ABC có SA \\perp (ABC), đáy ABC vuông tại B:', statements: [
      'SA vuông góc với BC.',
      'SB vuông góc với BC.',
      'BC \\perp (SAB) khi và chỉ khi BC \\perp AB và BC \\perp SA.',
      'Hai mặt phẳng (SAB) và (SAC) cắt nhau theo giao tuyến SA.' ] },
    { id: 'thptqg-sa-1', checker: 'short_answer_4', format: 'decimal_4', answerKey: ['7', ',', '5', '0'],
      prompt: 'Hình chóp có đáy là hình vuông cạnh 3, chiều cao 2{,}5. Thể tích khối chóp bằng bao nhiêu (dùng dấu phẩy trong 4 ô)?' },
  ],
  'g11-discover-r108': [
    { id: 'thptqg-mc-1', checker: 'choice_exact', answerKey: 'B', prompt: 'Tam giác ABC có M, N lần lượt thuộc AB, AC sao cho MN \\parallel BC, AM = 4, MB = 6, BC = 10. Độ dài MN là:', options: [
      { id: 'A', label: '5' }, { id: 'B', label: '4' }, { id: 'C', label: '6' }, { id: 'D', label: '8' }] },
    { id: 'thptqg-tf-1', checker: 'true_false_4', answerKey: [true, false, true, true], prompt: 'Về hai mặt phẳng song song, xét các phát biểu:', statements: [
      'Hai mặt phẳng phân biệt cùng song song với một mặt phẳng thứ ba thì song song với nhau.',
      'Đường thẳng song song với mặt phẳng thì song song với mọi đường thẳng nằm trong mặt phẳng đó.',
      'Hai mặt phẳng lần lượt chứa hai đường thẳng chéo nhau thì có thể song song với nhau.',
      'Nếu (\\alpha) \\parallel (\\beta) và (\\alpha) \\cap (\\gamma) = a thì (\\beta) \\cap (\\gamma) = b với b \\parallel a.' ] },
    { id: 'thptqg-sa-1', checker: 'short_answer_4', format: 'decimal_4', answerKey: ['4', ',', '8', '0'],
      prompt: 'Tam giác ABC có MN \\parallel BC với \\frac{AM}{AB} = 0{,}4 và BC = 12. Độ dài MN ghi vào 4 ô.' },
    ],
};

const SVG = (label) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><rect width="240" height="160" fill="#f8fafc"/><polygon points="120,20 40,130 200,130" fill="#dbeafe" stroke="#1e40af" stroke-width="2"/><text x="112" y="14" font-size="14" fill="#1e40af">${label}</text><text x="26" y="146" font-size="14" fill="#1e40af">B</text><text x="196" y="146" font-size="14" fill="#1e40af">C</text></svg>`);
// (vẽ thật từng hình khi cài đặt — mỗi entry dùng SVG riêng, đã check encodeURI)

for (const [periodId, additions] of Object.entries(PILOTS)) {
  const entry = db.entries.find(e => e.sourcePeriodId === periodId);
  if (!entry) throw new Error('Không tìm thấy entry ' + periodId);
  const pkg = entry.pkg;
  if (pkg.tasks.some(t => t.id === 'thptqg-mc-1')) { console.log('bỏ qua (đã patch):', periodId); continue; }
  const host = pkg.activities.find(a => a.phase === 'formation') || pkg.activities.find(a => a.phase === 'practice');
  if (!host) throw new Error('Không có activity formation/practice trong ' + periodId);
  const template = pkg.tasks.find(t => t.activityId === host.id && t.type === 'closed');
  if (!template) throw new Error('Không có nhiệm vụ closed mẫu trong ' + periodId);
  for (const add of additions) {
    const task = { ...structuredClone(template), id: add.id, prompt: add.prompt };
    if (add.checker === 'choice_exact') {
      task.evaluation = { checkerId: 'choice_exact', answerKey: add.answerKey };
      task.inputSchema = { type: 'choice', options: add.options };
    } else if (add.checker === 'true_false_4') {
      task.evaluation = { checkerId: 'true_false_4', answerKey: add.answerKey };
      task.inputSchema = { type: 'true_false_4', statements: add.statements.map((label, i) => ({ id: 's' + (i + 1), label })) };
    } else if (add.checker === 'short_answer_4') {
      task.evaluation = { checkerId: 'short_answer_4', answerKey: add.answerKey };
      task.inputSchema = { type: 'short_answer_4', format: add.format };
    }
    if (add.image) task.image = add.image;
    pkg.tasks.push(task);
    host.taskIds.push(add.id);
  }
  console.log('đã patch:', periodId, '+', additions.length, 'nhiệm vụ vào', host.id);
}

writeFileSync(FILE, JSON.stringify(db));
console.log('Hoàn tất.');
```

**Lưu ý khi cài đặt** (đọc kỹ, không copy mù):
- `(từ lỗi đánh máy trong khung trên)` các dòng chứa `NHAN_SVG_HINH_CHOP`, `ASCADE` là chỗ phải viết thật — SVG hình chóp/tứ diện với nhãn tiếng Việt, `encodeURIComponent` xử lý dấu.
- `contentHash`: nếu `npm run test` nhóm nội dung (hki-content) báo lệch hash → import `hashPackage` từ module mà `runtime.js` đang import và gán lại `pkg.contentHash = hashPackage(pkg)` cuối vòng lặp.
- Kiểm tra inputSchema `type: 'choice'` khớp quy ước choice hiện có trong catalogue: chạy `validateLessonPackage` trên từng pkg đã patch (bước 7b sẽ bắt); nếu validator đòi key khác (ví dụ `options` trực tiếp trên `evaluation` như `generation-outline.js:67`) thì sửa theo mẫu nhiệm vụ choice có sẵn trong `lib/lesson` test/engine.
- Sau khi script chạy XONG MỘT LẦN, nó re-runnable (bỏ qua entry đã patch) — dùng khi cần chỉnh đề.

Chạy: `node scripts/thptqg-v27-pilot.mjs` → kỳ vọng log `đã patch: …` ×3 + `Hoàn tất.`

### 7b. Test lint nội dung

Thêm vào test file:

```js
test('nội dung pilot V27 đủ 4 dạng THPTQG + minh họa + validate pass', async () => {
  const { validateLessonPackage } = await import('../lib/lesson/validate.js');
  const j = JSON.parse(await readFile(new URL('../content/lessons/hki-2026-g11.json', import.meta.url), 'utf8'));
  for (const periodId of ['g11-discover-r013', 'g11-discover-r028', 'g11-discover-r108']) {
    const entry = j.entries.find(e => e.sourcePeriodId === periodId);
    assert.ok(entry, 'thiếu entry ' + periodId);
    const closed = entry.pkg.tasks.filter(t => t.type === 'closed');
    const checkers = new Set(closed.map(t => t.evaluation?.checkerId));
    for (const kind of ['choice_exact', 'true_false_4', 'short_answer_4']) {
      assert.ok(checkers.has(kind), periodId + ' thiếu dạng ' + kind);
    }
    const dec = closed.find(t => t.evaluation?.checkerId === 'short_answer_4');
    assert.equal(dec?.inputSchema?.format, 'decimal_4');
    assert.ok(entry.pkg.tasks.some(t => t.image || t.diagramUrl), periodId + ' thiếu minh họa');
    const validation = validateLessonPackage(entry.pkg);
    assert.equal(validation.ok, true, JSON.stringify((validation.errors || []).slice(0, 3)));
  }
});
```

### 7c. Verify + commit

- `node scripts/thptqg-v27-pilot.mjs` → patch thành công (3 entry).
- `node --test tests/lesson-thptqg-v27.test.mjs` → PASS.
- `node --test tests/hki-content.test.mjs` (nếu tồn tại — `ls tests/hki-*`) → PASS; nếu lỗi contentHash thì xử lý theo lưu ý 7a rồi chạy lại.
- Commit: `feat(content): THPTQG pilot tasks for r013, r028, r108`.

---

## Task 8 — Kiểm chứng tổng + docs + deploy v27

### 8a. Kiểm chứng tổng (bắt buộc đều xanh)

```powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run test        # toàn bộ xanh (nền 1409 + test mới)
npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run typecheck   # 0 lỗi TS
npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run build       # build thành công
```

Nếu test nào fail vì kỳ vọng deepEqual cứng trên `submissions`/`groupProducts` (trường mới `ratio`/`perItem` là chủ đích) → cập nhật test đó trong commit riêng `test: expect ratio/perItem fields on submissions`.

### 8b. Docs

- `tasks/plan-hoan-thien-game-va-day-hoc.md` — thêm mục v27: ngày, commit, phạm vi (TF ratio + decimal_4 + runtime/UI/mini-game + prompt 4 dạng + pilot r013/r028/r108), lệnh verify, trạng thái QA live còn treo (chờ GV đăng nhập).
- `tasks/lessons.md` — ghi 2 bài học nếu phát sinh: (1) prompt bộ soạn bó dạng → catalogue nghèo dạng (đã fix ở generation-provider:68); (2) JSON 5MB sửa bằng script migration, không sửa tay.

### 8c. Commit docs + deploy

```powershell
git -C "C:\Users\ADMIN\.codex\worktrees\universal-content-release" add -A
git -C "C:\Users\ADMIN\.codex\worktrees\universal-content-release" commit -m "docs: v27 THPTQG task types release notes"
```

Deploy theo recipe v26 đã chuẩn hóa (xem `tasks/lessons.md` mục deploy + log mẫu `C:\Users\ADMIN\AppData\Local\Temp\opencode\deploy-v26-run.log`):

- Bump version `26` → `27` (file version trong repo — tìm theo chỗ đã bump v26).
- `codex exec` với prompt file đưa qua stdin, bắt buộc `[Console]::InputEncoding`/`$OutputEncoding = New-Object System.Text.UTF8Encoding $false` để tiếng Việt không vỡ; audience giữ `public`; deploy trên nhánh `codex/universal-content-release` (flow Sites source credential như v26).
- Verify sau deploy: HTTP 200, bundle live chứa marker mới (ví dụ chuỗi `Bàn phím thập phân` hoặc `true_false_4` trong chunk nhiệm vụ), version hiển thị `27`.

### 8d. QA live (giữ lại khi GV đăng nhập lại)

- Phòng mới từ catalogue (`campus.hki-2026` bình thường): HS làm nhiệm vụ đúng/sai → thấy ✓/✗ từng phát biểu + chip "Điểm ý"; trả lời ngắn thập phân → dùng được keypad `,`/`-`.
- Mini-game (tug…): câu đúng/sai trúng 3/4 → +5 điểm thay vì +0.
- QA nộp ảnh v26 (còn nợ) làm cùng phiên.

---

## Checklist tự soi khi thực thi (mỗi task)

- [ ] Mọi dòng code thay đổi truy vết được về spec §3; không "cải thiện" code lân cận.
- [ ] Hành vi nhị phân `.ok` tại arena / mode-bridge / ngưỡng mở cổng / reward ledger không đổi.
- [ ] Tiếng Việt trong nội dung + prompt không vỡ dấu (commit UTF-8, deploy recipe có encoding dòng).
- [ ] Mỗi task commit riêng, message rõ; build xanh trước khi tuyên bố xong Task 8.

## Rủi ro & phương án

| Rủi ro | Phương án |
|---|---|
| Validator chặn `inputSchema.type` của choice / `image` data-URI trong pilot | Bám mẫu nhiệm vụ đang pass; nếu `image` bị chặn → đổi `diagramUrl` (cùng nhóm key cho phép, validate.js:105/143) |
| Test sâu trong kho dùng deepEqual cứng trên submissions | Cập nhật kỳ vọng có chủ đích (commit riêng) |
| contentHash lệch sau patch | Gán lại qua `hashPackage` trong script pilot (7a) |
| Deploy vỡ tiếng Việt | Bắt buộc UTF-8 stdin theo recipe v26; kiểm marker tiếng Việt trên bundle live |




