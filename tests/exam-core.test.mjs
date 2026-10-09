import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { checkImage } from '../lib/exam/validate.js';

import { scoreQuestion, scoreAttempt, tfRatio, parseNumber, shortMatches, cleanAnswer, describeKey } from '../lib/exam/scoring.js';
import { parseExamLines, groupPdfLines, sectionType } from '../lib/exam/parse.js';
import { parseAnswerKey } from '../lib/exam/answer-key.js';

const mc = { id: 'q1', type: 'mc', points: 0.25, options: ['A', 'B', 'C', 'D'], key: 'C', section: 'I' };
const tf = { id: 'q2', type: 'tf', points: 1, statements: ['a', 'b', 'c', 'd'], key: [true, true, true, false], section: 'II' };
const short = { id: 'q3', type: 'short', points: 0.5, key: { accept: ['1,5', '3/2'] }, section: 'III' };
const essay = { id: 'q4', type: 'essay', points: 1.5, section: 'III' };

test('offline answer clearing survives reload and is included in the final submission snapshot', () => {
  const code = ts.transpileModule(readFileSync(new URL('../components/exam/answer-sync.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const storage = new Map();
  const moduleExports = {};
  vm.runInNewContext(code, {
    exports: moduleExports,
    require: () => ({ pupilPost: async () => new Promise(() => {}), ApiError: Error }),
    window: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } },
    setTimeout: () => 1, clearTimeout: () => {},
  });
  const options = { token: 'synthetic', storageKey: 'draft', onState: () => {}, onEnded: () => {} };
  const sync = new moduleExports.AnswerSync(options);
  sync.set('q1', 'C');
  sync.set('q1', null);
  assert.equal(sync.local().q1, null);
  const restored = new moduleExports.AnswerSync(options);
  assert.equal(restored.local().q1, null);
  restored.reconcile({ q1: 'C' });
  assert.equal(restored.local().q1, null);
});

test('image base64 roundtrip rejects noncanonical pad bits and uses decoded length', () => {
  assert.throws(() => checkImage('image/jpeg', 'A'.repeat(396) + 'AB==', 700000), /INVALID_IMAGE/);
  assert.equal(checkImage('image/jpeg', 'A'.repeat(396) + 'AA==', 700000).bytes, 298);
});

test('a stale autosave stays pending and retries once at the next server second', async () => {
  const source = readFileSync(new URL('../components/exam/answer-sync.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const moduleExports = {}, timers = [], states = [], requests = [];
  let clock = 1000500;
  vm.runInNewContext(code, {
    exports: moduleExports, Date: { now: () => clock },
    require: () => ({ ApiError: Error, pupilPost: async body => { requests.push({ ...body }); return { stale: requests.length === 1, savedAt: clock }; } }),
    window: { localStorage: { getItem: () => null, setItem: () => {} } },
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return 1; }, clearTimeout: () => {},
  });
  const sync = new moduleExports.AnswerSync({ token: 'synthetic', storageKey: 'test', onState: (state, count) => states.push([state, count]), onEnded: () => {} });
  sync.set('q1', 'C');
  await new Promise(setImmediate);
  assert.ok(!states.some(([state]) => state === 'saved'), 'a stale reply is not saved');
  assert.equal(timers.length, 1);
  clock += 1000;
  timers[0].callback();
  await new Promise(setImmediate);
  assert.equal(requests.length, 2);
  assert.ok(requests[1].seq > requests[0].seq);
  assert.deepEqual(states.at(-1), ['saved', 0]);
});

test('multiple choice: only the exact letter scores, blank is not wrong-but-empty', () => {
  assert.equal(scoreQuestion(mc, 'C').points, 0.25);
  assert.equal(scoreQuestion(mc, 'c').points, 0.25);
  assert.equal(scoreQuestion(mc, 'B').points, 0);
  assert.equal(scoreQuestion(mc, 'Z').correct, null);
  assert.equal(scoreQuestion(mc, null).correct, null);
});

test('true/false follows the THPT 2025 scale: 1, 2, 3, 4 right statements = 10%, 25%, 50%, 100%', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((n) => tfRatio(n, 4)), [0, 0.1, 0.25, 0.5, 1]);
  assert.equal(scoreQuestion(tf, [true, true, true, false]).points, 1);
  assert.equal(scoreQuestion(tf, [true, true, true, true]).points, 0.5);
  assert.equal(scoreQuestion(tf, [true, true, false, true]).points, 0.25);
  assert.equal(scoreQuestion(tf, [true, false, false, true]).points, 0.1);
  assert.equal(scoreQuestion(tf, [false, false, false, true]).points, 0);
  // an unanswered statement counts as wrong, the others still score
  assert.equal(scoreQuestion(tf, [true, true, true, null]).points, 0.5);
  assert.equal(scoreQuestion(tf, [null, null, null, null]).correct, null);
});

test('short answers accept Vietnamese decimals, fractions and several spellings', () => {
  assert.equal(parseNumber('1,5'), 1.5);
  assert.equal(parseNumber('−3'), -3);
  assert.equal(parseNumber(' 3 / 2 '), 1.5);
  assert.equal(parseNumber('abc'), null);
  assert.equal(scoreQuestion(short, '1.5').points, 0.5);
  assert.equal(scoreQuestion(short, '3/2').points, 0.5);
  assert.equal(scoreQuestion(short, '1,50').points, 0.5);
  assert.equal(scoreQuestion(short, '2').points, 0);
  assert.equal(shortMatches('Hà Nội', ['hà  nội']), true);
});

test('an essay waits for the teacher and is capped at its points', () => {
  assert.deepEqual(scoreQuestion(essay, { text: 'bài làm' }), { points: 0, max: 1.5, pending: true, correct: null });
  assert.equal(scoreQuestion(essay, null, 1).points, 1);
  assert.equal(scoreQuestion(essay, null, 9).points, 1.5);
  assert.equal(scoreQuestion(essay, null, -2).points, 0);
});

test('an attempt adds up by section and reports essays still to mark', () => {
  const result = scoreAttempt([mc, tf, short, essay], { q1: 'C', q2: [true, true, true, true], q3: '3/2' }, { q4: 1 });
  assert.equal(result.total, 0.25 + 0.5 + 0.5 + 1);
  assert.equal(result.max, 0.25 + 1 + 0.5 + 1.5);
  assert.equal(result.sections.III.points, 1.5);
  assert.equal(result.pendingEssays, 0);
  assert.equal(scoreAttempt([mc, essay], {}, {}).pendingEssays, 1);
  assert.equal(result.answered, 3);
});

test('answers are cleaned to the shape of their question and the key is described for the teacher', () => {
  assert.equal(cleanAnswer(mc, ' b '), 'B');
  assert.deepEqual(cleanAnswer(tf, [true, 'x', false]), [true, null, false, null]);
  assert.equal(cleanAnswer(short, '   '), null);
  assert.equal(describeKey(tf), 'Đ Đ Đ S');
  assert.equal(describeKey(short), '1,5 | 3/2');
});

// ---- the file reader ---------------------------------------------------------------------------------------------

test('sections are recognised from their wording', () => {
  assert.equal(sectionType('PHẦN I. (12 câu/3 điểm) Trắc nghiệm nhiều phương án lựa chọn'), 'mc');
  assert.equal(sectionType('PHẦN II. Trắc nghiệm Đúng - Sai'), 'tf');
  assert.equal(sectionType('PHẦN III. (3 điểm) Tự luận.'), 'essay');
  assert.equal(sectionType('PHẦN III. Trả lời ngắn'), 'short');
});

const text = (t, extra = {}) => ({ text: t, ...extra });

test('plain text: types, points and statements come from the headings; nothing else is invented', () => {
  const lines = [
    text('ĐỀ KIỂM TRA GIỮA KỲ'), text('MÔN TOÁN 11'), text('Thời gian làm bài: 45 phút'),
    text('PHẦN I. (2 câu/1 điểm) Trắc nghiệm nhiều phương án lựa chọn.'),
    text('Câu 1. Giá trị của sin 30° là'), text('A. 1/2 B. 1 C. 0 D. -1'),
    text('Câu 2. Chu kỳ của y = cos x là'), text('A. π B. 2π C. 3π D. 4π'),
    text('PHẦN II. (1 câu/1 điểm) Trắc nghiệm Đúng - Sai.'),
    text('Câu 1. Cho hàm số y = x^2. Xét các khẳng định:'), text('a) Hàm số chẵn.'), text('b) Hàm số lẻ.'), text('c) y(0) = 0.'), text('d) y(1) = 2.'),
    text('PHẦN III. (2 điểm) Tự luận.'),
    text('Bài 1. (1,5 điểm) Giải phương trình sin x = 1/2.'),
    text('Bài 2. (0,5 điểm) Tính giới hạn.'),
  ];
  const out = parseExamLines(lines);
  assert.equal(out.durationMin, 45);
  assert.match(out.title, /ĐỀ KIỂM TRA GIỮA KỲ/);
  assert.deepEqual(out.questions.map((q) => [q.id, q.type, q.points]), [['q1', 'mc', 0.5], ['q2', 'mc', 0.5], ['q3', 'tf', 1], ['q4', 'essay', 1.5], ['q5', 'essay', 0.5]]);
  assert.deepEqual(out.questions[0].options, ['A', 'B', 'C', 'D']);
  assert.deepEqual(out.questions[2].statements, ['a', 'b', 'c', 'd']);
  assert.equal(out.questions[0].regions, undefined);
  assert.deepEqual(out.warnings, []);
  for (const q of out.questions) assert.equal(q.key, undefined, 'no answer is ever invented');
});

test('a file without "Câu 1." lines says so instead of guessing', () => {
  const out = parseExamLines([text('Hello'), text('world')]);
  assert.equal(out.questions.length, 0);
  assert.match(out.warnings[0], /Không tìm thấy/);
});

test('a section total that does not match its questions is reported', () => {
  const out = parseExamLines([text('PHẦN I. (3 câu/3 điểm) Trắc nghiệm nhiều phương án lựa chọn.'), text('Câu 1. a'), text('Câu 2. b')]);
  assert.ok(out.warnings.some((w) => /3 câu/.test(w)));
});

test('PDF lines: items on one baseline join into a line; pages cut into one strip per question, figures included', () => {
  const H = 800;
  const item = (str, x, y, size = 10) => ({ str, transform: [1, 0, 0, size, x, y], width: str.length * 5, height: size });
  const page1 = groupPdfLines([
    item('PHẦN I. (2 câu/1 điểm) Trắc nghiệm nhiều phương án lựa chọn.', 40, 760),
    item('Câu 1.', 40, 740), item('Hình vẽ dưới đây', 80, 740),
    item('A. 1', 40, 500), item('B. 2', 100, 500), item('C. 3', 160, 500), item('D. 4', 220, 500),
    item('Câu 2.', 40, 470), item('Tính', 80, 470),
    item('A. 1', 40, 440), item('B. 2', 100, 440), item('C. 3', 160, 440), item('D. 4', 220, 440),
    item('Đề thi - Trang 1', 200, 20),
  ], H, 1);
  assert.equal(page1.length, 6);
  assert.equal(page1[1].text, 'Câu 1. Hình vẽ dưới đây');
  const out = parseExamLines(page1, { pages: [{ height: H }] });
  assert.equal(out.questions.length, 2);
  const [q1, q2] = out.questions;
  // question 1 runs from its header down to where question 2 starts, so the figure between them is inside the strip
  assert.equal(q1.regions.length, 1);
  assert.ok(q1.regions[0].top < 800 - 740 && q1.regions[0].bottom > 800 - 500, JSON.stringify(q1.regions));
  assert.ok(q1.regions[0].bottom <= q2.regions[0].top + 1);
  // the last question ends above the page footer
  assert.ok(q2.regions[0].bottom < 800 - 20);
});

test('a question that continues on the next page gets a strip on each page', () => {
  const H = 800;
  const item = (str, x, y) => ({ str, transform: [1, 0, 0, 10, x, y], width: str.length * 5, height: 10 });
  const p1 = groupPdfLines([item('Câu 1.', 40, 300), item('Đề bài dài', 80, 300), item('Đề - Trang 1', 200, 20)], H, 1);
  const p2 = groupPdfLines([item('A. 1', 40, 770), item('B. 2', 100, 770), item('C. 3', 160, 770), item('D. 4', 220, 770), item('Câu 2.', 40, 700), item('Đề - Trang 2', 200, 20)], H, 2);
  const out = parseExamLines([...p1, ...p2], { pages: [{ height: H }, { height: H }] });
  assert.deepEqual(out.questions[0].regions.map((r) => r.page), [1, 2]);
  assert.deepEqual(out.questions[1].regions.map((r) => r.page), [2]);
});

// ---- the answer key ------------------------------------------------------------------------------------------------

const questions = [
  ...Array.from({ length: 4 }, (_, i) => ({ id: 'q' + (i + 1), type: 'mc' })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: 'q' + (i + 5), type: 'tf', statements: ['a', 'b', 'c', 'd'] })),
  { id: 'q7', type: 'short' },
];

test('answer key: several formats of multiple choice on one line', () => {
  for (const text of ['1.C 2.B 3.A 4.D', '1C 2B 3A 4D', '1-C, 2-B, 3-A, 4-D', 'Câu 1: C\nCâu 2: B\nCâu 3: A\nCâu 4: D']) {
    const { keys, problems } = parseAnswerKey(text, questions);
    assert.deepEqual([keys.q1, keys.q2, keys.q3, keys.q4], ['C', 'B', 'A', 'D'], text);
    assert.deepEqual(problems, [], text);
  }
});

test('answer key: true/false in compact and labelled form, and short answers', () => {
  const { keys, problems } = parseAnswerKey('PHẦN II\nCâu 1: Đ Đ Đ S\n2. ĐSĐĐ\nPHẦN III\nCâu 1: 1,5 | 3/2', questions);
  assert.deepEqual(keys.q5, [true, true, true, false]);
  assert.deepEqual(keys.q6, [true, false, true, true]);
  assert.deepEqual(keys.q7, { accept: ['1,5', '3/2'] });
  assert.deepEqual(problems, []);
  const labelled = parseAnswerKey('PHẦN II\n1: a-Đ b-Đ c-S d-Đ', questions);
  assert.deepEqual(labelled.keys.q5, [true, true, false, true]);
});

test('answer key: a letter D inside Part I is an answer, not "đúng"; wrong counts are reported', () => {
  const part1 = parseAnswerKey('PHẦN I\n1.D 2.D 3.D 4.D', questions);
  assert.deepEqual([part1.keys.q1, part1.keys.q4], ['D', 'D']);
  const wrong = parseAnswerKey('PHẦN II\nCâu 1: Đ Đ S', questions);
  assert.equal(wrong.keys.q5, undefined);
  assert.match(wrong.problems[0], /4 ý/);
  const missing = parseAnswerKey('PHẦN I\n9.A', questions);
  assert.equal(missing.applied, 0);
  assert.equal(missing.problems.length, 1);
});
