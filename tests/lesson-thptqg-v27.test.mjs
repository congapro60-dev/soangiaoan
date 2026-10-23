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
