import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as parser from '../lib/exam/answer-key.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/exam-hdc-toan11-de01.json', import.meta.url), 'utf8'));
const questions = [
  ...Array.from({ length: 12 }, (_, i) => ({ id: 'q' + (i + 1), section: 'I', label: 'Câu ' + (i + 1), type: 'mc' })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: 'q' + (i + 13), section: 'II', label: 'Câu ' + (i + 1), type: 'tf', statements: ['a', 'b', 'c', 'd'] })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: 'q' + (i + 17), section: 'III', label: 'Bài ' + (i + 1), type: 'essay' })),
];

test('the actual HDC tables yield exactly the sixteen published MC/TF keys', () => {
  const parsed = parser.parseAnswerKey(fixture.lines.map((l) => l.text).join('\n'), questions);
  assert.deepEqual(Object.values(parsed.keys), ['C', 'B', 'B', 'B', 'A', 'B', 'B', 'C', 'B', 'A', 'A', 'A', [true,true,true,false], [true,true,true,false], [true,false,true,true], [true,true,true,false]]);
});

test('the actual HDC solutions stay within their repeated-number sections; spans preserve PDF geometry', () => {
  assert.equal(typeof parser.parseMarkingGuide, 'function');
  const result = parser.parseMarkingGuide(fixture.lines.map((l) => l.text).join('\n'), questions);
  assert.equal(result.applied, 16);
  assert.equal(Object.keys(result.solutions).length, 20);
  assert.match(result.solutions.q1, /chu kỳ/);
  assert.match(result.solutions.q12, /song song/);
  assert.match(result.solutions.q13, /Mô hình vòng quay/);
  assert.match(result.solutions.q16, /Hình chóp/);
  assert.match(result.solutions.q17, /Tập giá trị/);
  assert.match(result.rubrics.q19, /Ta-lét/);
  assert.match(result.rubrics.q20, /10 năm/);
  assert.doesNotMatch(result.solutions.q16, /Bài 1/);
  for (const [qid, span] of Object.entries(result.spans)) {
    assert.equal(fixture.lines.slice(span.startIndex, span.endIndex).map((l) => l.text).join('\n'), result.solutions[qid]);
  }
  assert.equal(Object.keys(result.rubrics).length, 4);
});

test('a Word guide with explicit keys, solutions and marking steps is parsed without taking prose as a short answer', () => {
  assert.equal(typeof parser.parseMarkingGuide, 'function');
  const qs = [{ id:'a',section:'I',label:'Câu 1',type:'mc' },{ id:'b',section:'III',label:'Câu 1',type:'short' },{ id:'c',section:'IV',label:'Bài 1',type:'essay' }];
  const result = parser.parseMarkingGuide('PHẦN I\nCâu 1: B\nDùng công thức $u_n$.\nPHẦN III. Trả lời ngắn\nCâu 1. Tính tổng\nĐáp số: 1,5 | 3/2\nPHẦN IV. Tự luận\nBài 1. Chứng minh\nLập luận (0,25đ)\nKết luận (0,25đ)', qs);
  assert.equal(result.keys.a, 'B');
  assert.deepEqual(result.keys.b, {accept:['1,5','3/2']});
  assert.match(result.solutions.b, /Tính tổng/);
  assert.match(result.rubrics.c, /0,25đ/);
});

test('ambiguous headings and missing keys warn instead of assigning to the wrong question', () => {
  assert.equal(typeof parser.parseMarkingGuide, 'function');
  const ambiguous = [{id:'a',section:'I',label:'Câu 1',type:'mc'},{id:'b',section:'II',label:'Câu 1',type:'tf'}];
  const result = parser.parseMarkingGuide('Câu 1. Giải bằng cách đặt ẩn\nKết luận', ambiguous);
  assert.deepEqual(result.keys, {});
  assert.deepEqual(result.solutions, {});
  assert.ok(result.problems.some((p) => /không xác định|trùng|nhiều/i.test(p)));
  const short = parser.parseMarkingGuide('PHẦN III. Trả lời ngắn\nCâu 1. Giải bằng cách đặt ẩn\nKết luận', [{id:'s',section:'III',label:'Câu 1',type:'short'}]);
  assert.deepEqual(short.keys, {});
  assert.ok(short.problems.some((p) => /chưa có đáp án/i.test(p)));
});

test('explicit short answers accept text; prose is not a key and duplicate conflicting keys warn', () => {
  const qs = [{id:'s',section:'III',label:'Câu 1',type:'short'}];
  const parsed = parser.parseMarkingGuide('PHẦN III. Trả lời ngắn\nCâu 1. Xét vị trí hai đường thẳng\nĐáp án: chéo nhau', qs);
  assert.deepEqual(parsed.keys, {s:{accept:['chéo nhau']}});
  const duplicate = parser.parseMarkingGuide('PHẦN I\nCâu 1: B\nCâu 1: C', [{id:'a',section:'I',label:'Câu 1',type:'mc'}]);
  assert.ok(duplicate.problems.some((p) => /nhiều đáp án/.test(p)));
});

test('keys stay scoped when two sections use the same question type and restart numbering', () => {
  const qs = [{id:'a',section:'I',label:'Câu 1',type:'mc'},{id:'b',section:'II',label:'Câu 1',type:'mc'}];
  const result = parser.parseMarkingGuide('PHẦN I. Trắc nghiệm\nCâu 1: B\nPHẦN II. Trắc nghiệm\nCâu 1: C', qs);
  assert.deepEqual(result.keys, {a:'B',b:'C'});
  assert.match(result.solutions.a, /B/);
  assert.match(result.solutions.b, /C/);
  const unknown = parser.parseAnswerKey('PHẦN IV. Trắc nghiệm\nCâu 1: A', qs);
  assert.deepEqual(unknown.keys, {});
});

test('guide headings accept a marking weight before the punctuation', () => {
  const qs = [{id:'a',section:'I',label:'Câu 1',type:'mc'}];
  const result = parser.parseMarkingGuide('PHẦN I\nCâu 1 (0,25 điểm).\nĐáp án: C\nDùng công thức', qs);
  assert.deepEqual(result.keys, {a:'C'});
  assert.match(result.solutions.a, /Dùng công thức/);
});
