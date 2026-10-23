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
  const digitsTask = { ...task, inputSchema: { type: 'short_answer_4', format: 'digits' }, evaluation: { checkerId: 'short_answer_4', answerKey: ['1', '2', '0', '6'] } };
  assert.equal(checker(['1', '2', '0', '6'], digitsTask).ok, true);
  assert.equal(checker(['1', '2', '0', '7'], digitsTask).ok, false);
});

test('verdictMeta chuẩn hóa ratio/perItem cho mọi checker', async () => {
  const { verdictMeta } = await import('../lib/lesson/schema.js');
  assert.deepEqual(verdictMeta({ ok: true, perItem: [true, false, true, true], ratio: 0.75 }, false), { ratio: 0.75, perItem: [true, false, true, true] });
  assert.deepEqual(verdictMeta({ ok: true }, true), { ratio: 1, perItem: undefined });
  assert.deepEqual(verdictMeta({ ok: false }, false), { ratio: 0, perItem: undefined });
});

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
  // trúng 3/4 ([t,f,f,f] vs key [t,t,f,f]) → ratio 0,5 → điểm = round(10 × 0,5) = 5; trạng thái vẫn "chưa đúng" (chưa đủ 4/4)
  const started = events.startClassEvent(base(), { type: 'tug', seed: 2, durationMs: 180000 }, teacher, 1000);
  const answered = events.answerClassEvent(started, { learnerId: 'b', step: started.participants.b.step, answer: [true, false, false, false], requestId: 'tf-1' }, 2000);
  assert.equal(answered.lastResult.correct, false);
  assert.equal(answered.lastResult.points, 5);
  assert.equal(answered.participants.b.score, 5);
  // trúng đủ 4/4 → đúng + đủ 10 điểm
  const started2 = events.startClassEvent(base(), { type: 'tug', seed: 2, durationMs: 180000 }, teacher, 1000);
  const answered2 = events.answerClassEvent(started2, { learnerId: 'b', step: started2.participants.b.step, answer: [true, true, false, false], requestId: 'tf-2' }, 2000);
  assert.equal(answered2.lastResult.correct, true);
  assert.equal(answered2.participants.b.score, 10);
});

// ---- Harness render TaskInput (khuôn tests/lesson-new-question-types.test.mjs:35-60) ----
const ts = (await import('typescript')).default;
const vm = (await import('node:vm')).default;
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
const taskInputSource = await readFile(new URL('../components/lesson/TaskInput.tsx', import.meta.url), 'utf8');
const taskInputCode = ts.transpileModule(taskInputSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;

function taskEditor(task, extras = {}) {
  const hooks = [], timers = new Map();
  let cursor = 0, serial = 0;
  const mockReact = { ...React,
    useId() { cursor++; return 'question-input'; },
    useState(initial) { const at = cursor++; if (!(at in hooks)) hooks[at] = typeof initial === 'function' ? initial() : initial; return [hooks[at], value => { hooks[at] = typeof value === 'function' ? value(hooks[at]) : value; }]; },
    useRef(initial) { const at = cursor++; return hooks[at] ||= { current: initial }; },
    useEffect(effect, dependencies) { const at = cursor++, previous = hooks[at]; if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) { previous?.cleanup?.(); hooks[at] = { dependencies, cleanup: effect() }; } }
  };
  const schedule = callback => { const id = ++serial; timers.set(id, callback); return id; };
  const component = { exports: {} };
  vm.runInNewContext(taskInputCode, { module: component, exports: component.exports,
    require: name => name === 'react' ? mockReact : { default: props => React.createElement('span', null, props.text), __esModule: true },
    crypto: globalThis.crypto,
    setTimeout: schedule, clearTimeout: id => timers.delete(id), window: { setTimeout: schedule, clearTimeout: id => timers.delete(id) } });
  const publicTask = structuredClone(task); delete publicTask.evaluation.answerKey;
  const props = { task: publicTask, ...extras };
  return { render() { cursor = 0; return component.exports.TaskInput(props); } };
}

test('TaskInput: keypad thập phân + phản hồi từng phát biểu từ submission', () => {
  const decTask = {
    id: 't-decimal', type: 'closed', prompt: 'Viết 0,25 vào bốn ô',
    inputSchema: { type: 'short_answer_4', format: 'decimal_4' },
    evaluation: { checkerId: 'short_answer_4', answerKey: ['0', ',', '2', '5'] }
  };
  const decHtml = renderToStaticMarkup(taskEditor(decTask).render());
  assert.ok(decHtml.includes('Bàn phím thập phân'), 'thiếu keypad decimal_4');
  assert.ok(decHtml.includes('Dấu phẩy là dấu thập phân'), 'thiếu hướng dẫn dấu phẩy');
  assert.ok(!decHtml.includes('answerKey'), 'không được lộ đáp án');

  const tfTask = {
    id: 't-tf', type: 'closed', prompt: 'Đúng sai',
    inputSchema: { type: 'true_false_4', statements: [
      { id: 's1', label: 'a' }, { id: 's2', label: 'b' }, { id: 's3', label: 'c' }, { id: 's4', label: 'd' }
    ] },
    evaluation: { checkerId: 'true_false_4', answerKey: [true, true, false, false] }
  };
  const tfHtml = renderToStaticMarkup(taskEditor(tfTask, { submission: { submissionId: 'sv1', ok: false, ratio: 0.5, perItem: [true, true, false, false] } }).render());
  assert.ok(tfHtml.includes('task-tf-item'), 'thiếu phản hồi từng phát biểu');
  assert.ok(tfHtml.includes('Phát biểu 3'), 'thiếu nhãn phát biểu');
  assert.ok(tfHtml.includes('✗'), 'thiếu dấu ✗');
  assert.ok(tfHtml.includes('Điểm ý'), 'thiếu chip điểm một phần');
  const tfHtml2 = renderToStaticMarkup(taskEditor(tfTask).render());
  assert.ok(!tfHtml2.includes('task-tf-item'), 'không hiện phản hồi khi chưa có submission');
});

test('prompt bộ soạn AI yêu cầu đủ 4 dạng THPTQG + minh họa hình học', async () => {
  const source = await readFile(new URL('../lib/lesson/generation-provider.js', import.meta.url), 'utf8');
  for (const marker of ['true_false_4', 'short_answer_4', 'decimal_4', 'diagramUrl', 'image']) {
    assert.ok(source.includes(marker), 'thiếu hướng dẫn: ' + marker);
  }
});

test('nội dung pilot THPTQG hki-2026-g11: đủ 3 dạng × 3 entry, đáp án đúng, validator xanh', async () => {
  const { validateLessonPackage } = await import('../lib/lesson/validate.js');
  const db = JSON.parse(await readFile(new URL('../content/lessons/hki-2026-g11.json', import.meta.url), 'utf8'));
  for (const periodId of ['g11-discover-r013', 'g11-discover-r028', 'g11-discover-r108']) {
    const entry = db.entries.find((e) => e.sourcePeriodId === periodId);
    assert.ok(entry, 'thiếu entry ' + periodId);
    const pkg = entry.pkg;
    const checkResult = validateLessonPackage(pkg);
    assert.equal(checkResult.ok, true, periodId + ' validator sai: ' + JSON.stringify((checkResult.errors || []).slice(0, 3)));
    const pilot = pkg.tasks.filter((t) => String(t.id).startsWith('thptqg-'));
    assert.equal(pilot.length, 3, periodId + ' phải có đúng 3 nhiệm vụ thptqg-');
    assert.deepEqual(
      pilot.map((t) => t.evaluation.checkerId).sort(),
      ['choice_exact', 'short_answer_4', 'true_false_4'],
      periodId + ' thiếu dạng nhiệm vụ'
    );
    for (const task of pilot) {
      assert.equal(task.branch, 'shared', periodId + ' nhiệm vụ mới phải dùng chung mọi nhánh');
      assert.equal(task.hintIds.length, 1, periodId + ' mỗi nhiệm vụ mới cần 1 gợi ý H1');
      assert.ok(pkg.hints.some((h) => h.id === task.hintIds[0]), 'gợi ý phải tồn tại trong pkg.hints');
      const checker = CHECKER_REGISTRY[task.evaluation.checkerId];
      assert.equal(checker(task.evaluation.answerKey, task).ok, true, periodId + ' đáp án chính thức phải đạt: ' + task.id);
      if (task.evaluation.checkerId === 'choice_exact') {
        assert.equal(task.inputSchema.options.length, 4, 'trắc nghiệm cần 4 lựa chọn');
        const wrong = task.inputSchema.options.map((o) => o.id).find((id) => id !== task.evaluation.answerKey);
        assert.equal(checker(wrong, task).ok, false, 'lựa chọn sai phải không đạt');
      } else if (task.evaluation.checkerId === 'true_false_4') {
        assert.equal(task.inputSchema.statements.length, 4, 'đúng/sai cần 4 phát biểu');
        assert.ok(task.evaluation.answerKey.some((v) => v === false), 'phải có ít nhất 1 ý sai');
        const flippedOne = task.evaluation.answerKey.map((v, i) => (i === 0 ? !v : v));
        const verdict = checker(flippedOne, task);
        assert.equal(verdict.ok, false, 'trúng 3/4 phải vẫn chưa đạt đủ');
        assert.equal(verdict.ratio, 0.5, 'trúng 3/4 phải được nửa điểm');
      } else {
        assert.equal(task.inputSchema.format, 'decimal_4', 'trả lời ngắn phải dùng decimal_4');
        assert.equal(task.evaluation.answerKey.length, 4, 'decimal_4 cần đúng 4 ký tự');
        const dotted = task.evaluation.answerKey.map((ch) => (ch === ',' ? '.' : ch));
        assert.equal(checker(dotted, task).ok, true, 'chấm↔phẩy phải tương đương');
      }
    }
  }
  const r028 = db.entries.find((e) => e.sourcePeriodId === 'g11-discover-r028').pkg;
  const illustrated = r028.tasks.filter((t) => String(t.id).startsWith('thptqg-') && typeof t.image === 'string');
  assert.equal(illustrated.length, 2, 'r028 cần 2 nhiệm vụ có hình minh họa');
  assert.ok(illustrated.every((t) => t.image.startsWith('data:image/svg+xml')), 'hình minh họa phải là SVG data-URI');
});
