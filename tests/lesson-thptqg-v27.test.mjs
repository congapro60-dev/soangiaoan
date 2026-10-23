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
