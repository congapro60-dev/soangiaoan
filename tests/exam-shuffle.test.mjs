import test from 'node:test';
import assert from 'node:assert/strict';
import { buildView, viewQuestion, toCanonicalAnswer, toDisplayAnswer, readExamCodes } from '../lib/exam/shuffle.js';
import { scoreAttempt } from '../lib/exam/scoring.js';
import { normalizeExamInput, normalizeQuestions } from '../lib/exam/validate.js';
import { errorResponse } from '../lib/exam/http.js';

const questions = normalizeQuestions([
  { section: 'I', type: 'mc', points: 1, label: 'Câu 1', key: 'C', text: 'Tính', choiceText: { A: '1', B: '2', C: '3', D: '4' } },
  { section: 'I', type: 'mc', points: 1, label: 'Câu 2', key: 'B', text: 'Tính tiếp', choiceText: { A: '5', B: '6', C: '7', D: '8' } },
  { section: 'II', type: 'tf', points: 1, label: 'Câu 1', key: [true, false, true, false], statementText: { a: 'Một', b: 'Hai', c: 'Ba', d: 'Bốn' } },
  { section: 'III', type: 'essay', points: 2, label: 'Bài 1', text: 'a) Chứng minh; b) Kết luận', rubric: 'Thang chấm' },
]);
const settings = { shuffleQuestions: true, shuffleOptions: true };

test('seeded permutations are stable bijections inside each fixed part', () => {
  const view = buildView(questions, settings, 'server-seed');
  assert.deepEqual(buildView(questions, settings, 'server-seed'), view);
  assert.deepEqual([...view.order].sort(), questions.map(q => q.id).sort());
  assert.deepEqual(view.order.slice(0, 2).sort(), ['q1', 'q2']);
  assert.deepEqual(view.order.slice(2), ['q3', 'q4']);
  assert.deepEqual([...view.options.q1].sort(), ['A', 'B', 'C', 'D']);
  assert.deepEqual([...view.statements.q3].sort(), ['a', 'b', 'c', 'd']);
  assert.ok(Array.from({ length: 8 }, (_, i) => JSON.stringify(buildView(questions, settings, 'seed-' + i))).some(v => v !== JSON.stringify(view)));
});

test('every displayed answer maps bijectively to canonical answers and keeps its grade', () => {
  for (let seed = 0; seed < 20; seed++) {
    const view = buildView(questions, settings, 'seed-' + seed);
    for (const answer of ['A', 'B', 'C', 'D', null]) {
      const display = toDisplayAnswer(questions[0], answer, view);
      assert.equal(toCanonicalAnswer(questions[0], display, view), answer);
    }
    for (let mask = 0; mask < 16; mask++) {
      const canonical = [0, 1, 2, 3].map(i => Boolean(mask & (1 << i)));
      const display = toDisplayAnswer(questions[2], canonical, view);
      assert.deepEqual(toCanonicalAnswer(questions[2], display, view), canonical);
    }
    const logical = { q1: 'C', q2: 'B', q3: [true, false, null, false], q4: { text: 'Bài' } };
    const mapped = Object.fromEntries(questions.map(q => [q.id, toCanonicalAnswer(q, toDisplayAnswer(q, logical[q.id], view), view)]));
    assert.deepEqual(scoreAttempt(questions, mapped, { q4: 1 }), scoreAttempt(questions, logical, { q4: 1 }));
    const publicQ = viewQuestion(questions[0], view);
    assert.equal(publicQ.key, undefined);
    assert.equal(publicQ.rubric, undefined);
    const reviewQ = viewQuestion(questions[0], view, true);
    assert.equal(toCanonicalAnswer(questions[0], reviewQ.key, view), 'C');
    assert.equal(reviewQ.choiceText[reviewQ.key], '3');
  }
});

test('incomplete separated items and cross references stay protected unless teacher explicitly overrides', () => {
  const list = normalizeQuestions([
    { type: 'mc', key: 'A', choiceText: { A: 'Cả A và B', B: '2', C: '3', D: '4' } },
    { type: 'mc', key: 'A', choiceText: { A: 'Cả A và B', B: '2', C: '3', D: '4' }, noShuffle: false },
    { type: 'tf', key: [true, false, true, false], statementText: { a: 'Như ý a', b: '2', c: '3', d: '4' } },
    { type: 'mc', key: 'A', choiceText: { A: '1' } },
  ]);
  assert.equal(list[0].noShuffle, true);
  assert.equal(list[1].noShuffle, false);
  assert.equal(list[2].noShuffle, true);
  const view = buildView(list, settings, 'seed');
  assert.deepEqual(view.options.q1, ['A', 'B', 'C', 'D']);
  assert.deepEqual(view.statements.q3, ['a', 'b', 'c', 'd']);
  assert.deepEqual(view.options.q4, ['A', 'B', 'C', 'D']);
});

test('codes validate at the trust boundary and legacy question arrays retain their identity', () => {
  const base = { title: 'Đề', durationMin: 45 };
  const clean = normalizeExamInput({ ...base, codes: [{ code: '101', label: 'Đề một', questions }, { code: '102', questions }] });
  assert.deepEqual(clean.codes.map(c => [c.code, c.questions[0].id]), [['101', '101_q1'], ['102', '102_q1']]);
  assert.equal(clean.settings.assignment, 'alternate');
  assert.equal(clean.settings.shuffleOptions, false);
  assert.equal(clean.settings.showCode, false);
  for (const codes of [[], [{ code: 'A01', questions }], [{ code: '101', questions }, { code: '101', questions }], Array.from({ length: 9 }, (_, i) => ({ code: String(101 + i), questions }))]) {
    assert.throws(() => normalizeExamInput({ ...base, codes }), /INVALID_EXAM/);
  }
  assert.equal(normalizeExamInput({ ...base, questions }).questions[0].id, 'q1');
  assert.deepEqual(readExamCodes(questions), [{ code: null, questions }]);
  const identity = buildView(questions, {}, 'seed');
  assert.deepEqual(identity.order, questions.map(q => q.id));
  const interleaved = [questions[0], questions[2], questions[1]];
  assert.deepEqual(buildView(interleaved, {}, '').order, interleaved.map(q => q.id));
  assert.equal(viewQuestion(questions[1], identity).label, 'Câu 2');
  assert.deepEqual(viewQuestion({ id: 's', type: 'short', key: { accept: ['2'] } }, {}, true).key, { accept: ['2'] });
});

test('displayed stem numbering follows the pupil label and AI errors stay safe machine codes', async () => {
  const question = { ...questions[0], text: 'Câu 1. Tính tổng', label: 'Câu 1' };
  assert.equal(viewQuestion(question, { labels: { q1: 'Câu 2' } }).text, 'Tính tổng');
  assert.equal(viewQuestion(question, { labels: { q1: 'Câu 1' } }).text, question.text);
  for (const [code, status] of [['AI_CONSENT_REQUIRED', 400], ['SOURCE_CHANGED', 409], ['AI_QUOTA_EXCEEDED', 429], ['AI_TIMEOUT', 504], ['VARIANT_NOT_ALLOWED', 400], ['INVALID_PROPOSAL', 400], ['PROPOSAL_TOO_LARGE', 413]]) {
    const response = errorResponse(new Error(code));
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: code });
  }
});
