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
