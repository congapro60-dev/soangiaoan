import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import katex from 'katex';

const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const text = readFileSync(new URL('scripts/content/build-hki-g10.mjs', root), 'utf8');
const context = { assert, R: String.raw, math: value => `$${value}$` };
vm.createContext(context);
vm.runInContext(text.slice(text.indexOf('const n ='), text.indexOf('const introductions =')) + '\nglobalThis.review = {bank, byPeriod};', context);
const { bank } = context.review;
const data = read('content/lessons/hki-2026-g10.json');
const ppct = read('tasks/r22/ppct-hki.json').grades.find(g => g.grade === 10);
const rows = new Map(ppct.lessons.map(p => [p.id, p]));
let cases = 0;
for (const [id, concept] of Object.entries(bank)) {
  for (let seed = 0; seed < 34; seed++) for (let difficulty = 0; difficulty < 5; difficulty++) {
    const q = concept.question(seed, difficulty);
    assert.doesNotMatch(q.prompt + q.solution, /(?<!\\)overrightarrow|[AB]setminus|x\+2yle\d/, id);
    if (q.inputSchema) {
      assert.equal(new Set(q.inputSchema.options.map(o => o.label)).size, q.inputSchema.options.length, id);
      assert.ok(q.inputSchema.options.some(o => o.id === q.evaluation.answerKey), id);
    }
    for (const field of [q.prompt, q.solution, ...q.hints, ...(q.inputSchema?.options || []).map(o => o.label)]) {
      for (const match of field.matchAll(/\$([^$\n]+)\$/g)) katex.renderToString(match[1], { throwOnError: true, strict: 'ignore' });
    }
    cases++;
  }
}
for (const difficulty of [2, 3]) {
  const scale = bank.vectorScale.question(8, difficulty);
  assert.equal(scale.type, 'open');
  assert.match(scale.prompt, /hướng/);
  assert.match(scale.prompt, /phân phối/);
  const midpoint = bank.coordinateMidpoint.question(8, difficulty);
  assert.match(midpoint.prompt, /trọng tâm/);
  assert.match(midpoint.prompt, /trung điểm/);
  assert.match(midpoint.prompt, /thẳng hàng/);
  const angle = bank.perpendicular.question(8, difficulty);
  assert.equal(angle.type, 'open');
  assert.match(angle.prompt, /cos/);
  assert.match(angle.prompt, /vuông góc/);
  for (const [id, expected] of Object.entries({
    numberSets: [/khoảng/, /đếm số nguyên/, /Phân loại/],
    inclusion: [/ít nhất một/, /đúng một/],
    trigValue: [/\\sin/, /\\cos/, /\\tan/, /dấu/],
    supplement: [/\\sin/, /\\cos/, /\\tan/, /đối xứng/],
    cosine: [/bình phương/, /độ dài/],
    cosineAngle: [/\\cos/, /nhọn, vuông hay tù/],
    areaSin: [/đường cao/, /sin/, /diện tích/],
    inequality: [/bậc nhất hai ẩn/, /kiểm tra/],
    system: [/cả ba điều kiện/, /phần giao hay phần hợp/],
    optimize: [/Lập hệ ràng buộc/, /lãi lớn nhất/],
    vectorChain: [/trung điểm/, /cộng thêm/],
    coordinateOperations: [/\|\\vec w\|\^2/, /\|\\vec w\|\$/],
    dotAngle: [/Xác định góc/, /overrightarrow\{BA\}/, /\\cdot/],
    dotCoordinates: [/vuông góc/, /phân phối/, /cộng tọa độ/],
  })) {
    const q = bank[id].question(8, difficulty);
    for (const pattern of expected) assert.match(q.prompt, pattern, id);
  }
}
const vectorMath = bank.vectorSum.question(8, 0).prompt.match(/\$([^$]*overrightarrow[^$]*)\$/)[1];
assert.match(katex.renderToString(vectorMath, { output: 'mathml' }), /<mover/);
assert.match(katex.renderToString(bank.halfplane.question(8, 0).prompt.match(/\$([^$]+)\$/)[1], { output: 'mathml' }), /≥|≤/);
assert.equal(data.entries.length, 137);
assert.equal(data.entries.filter(e => e.kind === 'elective').length, 37);
assert.equal(new Set([...data.entries.map(e => e.sourcePeriodId), ...data.exams.flatMap(e => e.sourcePeriodIds)]).size, 141);
for (const entry of data.entries) {
  assert.equal(rows.get(entry.sourcePeriodId).period, entry.period);
  for (const task of entry.pkg.tasks) assert.doesNotMatch(task.prompt, /(?<!\\)overrightarrow|[AB]setminus|x\+2yle\d/);
  for (const sourceId of entry.cumulativeScope?.sourcePeriodIds || []) assert.ok(rows.get(sourceId).week < entry.week);
  const phases = new Map(entry.pkg.activities.map(a => [a.id, a.phase]));
  for (const objective of entry.pkg.objectives) {
    const rechecks = entry.pkg.tasks.filter(t => phases.get(t.activityId) === 'recheck' && t.objectiveIds.includes(objective.id));
    const exits = entry.pkg.tasks.filter(t => phases.get(t.activityId) === 'exit' && t.objectiveIds.includes(objective.id));
    assert.equal(rechecks.length, 1); assert.equal(exits.length, 1);
    assert.notEqual(rechecks[0].prompt, exits[0].prompt);
  }
}
for (const [file, mc, tf, shorts] of [
  ['g10-giua-hki-exam.json', ['B','B','A','C','D','C','C','B'], [[true,true,false,true],[true,false,true,true]], [28,224,17,72]],
  ['g10-cuoi-hki-exam.json', ['B','A','B','C','C','C','C','C'], [[true,true,false,true],[true,true,true,false]], [13,98,16,1539]],
]) {
  const exam = read('tasks/r22/' + file).exam;
  assert.equal(exam.durationMin, 80);
  assert.equal(exam.questions.reduce((sum, q) => sum + q.points, 0), 10);
  assert.deepEqual(exam.questions.filter(q => q.type === 'mc').map(q => q.key), mc);
  assert.deepEqual(exam.questions.filter(q => q.type === 'tf').map(q => q.key), tf);
  assert.deepEqual(exam.questions.filter(q => q.type === 'short').map(q => Number(q.key.accept[0])), shorts);
  assert.ok(exam.questions.filter(q => q.type === 'essay').every(q => q.solution && q.rubric));
}
console.log(JSON.stringify({ concepts: Object.keys(bank).length, cases, sourcePeriods: 141, lessons: 137, electives: 37, exams: 2, result: 'PASS' }));
