import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { hashPackage, CHECKER_REGISTRY } from '../lib/lesson/schema.js';
import { validateLessonPackage } from '../lib/lesson/validate.js';
import { extractStructuredLessons } from '../scripts/content/import-smartplan-math.mjs';

const bank = JSON.parse(await readFile(new URL('../content/smartplan-math-week6.json', import.meta.url)));
const pilot = await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url));

test('eight source-backed Week6 lessons preserve actual objectives and review state', () => {
  assert.deepEqual(bank.lessons.map(l => l.period), [34, 35, 36, 37, 38, 39, 40, 41]);
  assert.equal(bank.contentHash, hashPackage(bank));
  assert.equal(bank.status, 'draft');
  assert.equal(bank.lessons.reduce((n, l) => n + l.examples.length + l.exercises.length + l.quick.length, 0), 80);
  for (const l of bank.lessons) {
    assert.equal(l.status, 'draft');
    assert.equal(l.objectives.length, 3);
    assert.deepEqual(l.objectives.map(o => o.level), ['must', 'should', 'could']);
    assert(l.objectives.every(o => o.provenance.verification === 'teacher_review_required'));
    assert(l.sourceRefs.every(s => s.verification === 'teacher_review_required' && /^[a-f0-9]{64}$/.test(s.hash)));
    assert(l.sourceRefs[0].locator.includes(`d(11,6,${l.period})`));
    assert.equal(l.sourceRefs[0].hash, 'aea0f73b2164b78d8a62ecd40bf01ee43c528bf4e68918120120f4843fdef8fc');
    assert.equal(l.sourceYear, '2026-2027');
    assert(l.objectives.every(o => !('code' in o)));
  }
  assert(bank.reviewRequirements.some(s => s.includes('2025-2026')));
  assert.doesNotMatch(JSON.stringify(bank), /Hồ sơ lớp|Giáo viên|Nhật Bản|teacherName|studentName/);
});

test('AST extraction preserves raw LaTeX, rejects executable expressions', () => {
  const args = String.raw`d(11,6,39,'Dãy số','Hiệu',[String.raw\`u_n=\frac{n}{n+1}\`],[e(\`Tính $\tan x$\`,\`$\cos x$\`)],[x('NB','Q','A')],[e('Q','A')],['Sai'])`.replaceAll('\\`', '`');
  const lessons = extractStructuredLessons(args);
  assert.equal(lessons[0].formulas[0], String.raw`u_n=\frac{n}{n+1}`);
  assert.equal(lessons[0].examples[0].question, String.raw`Tính $\tan x$`);
  assert.equal(lessons[0].examples[0].solution, String.raw`$\cos x$`);
  for (const expression of ['process.exit()', '(()=>1)()', "require('node:fs')", 'String.raw`a${process.exit()}`']) {
    assert.throws(() => extractStructuredLessons(args.replace("'Hiệu'", expression)), /Unsupported|Rejected/);
  }
  const seq = bank.lessons.find(l => l.period === 39);
  assert(seq.examples[0].question.includes(String.raw`\frac{n}{n+1}`));
  assert(seq.examples[0].solution.includes(String.raw`\frac1{(n+1)(n+2)}`));
  assert(bank.lessons[2].examples[1].solution.includes(String.raw`\tan x`));
});

test('P2 draft is valid, individually assessed, source-bound and does not mutate pilot', async () => {
  const pkg = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p2.json', import.meta.url)));
  const result = validateLessonPackage(pkg);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(pkg.status, 'draft');
  assert.equal(pkg.contentHash, hashPackage(pkg));
  assert.equal(pkg.budget.slotMinutes, 40);
  assert(pkg.objectives.every(o => o.code.startsWith('SP-') && o.metadata.canonicalCodeVerified === false));
  for (const obj of pkg.objectives) {
    const evidence = pkg.evidenceRules.filter(e => e.objectiveIds.includes(obj.id) && e.countsForMastery);
    assert(evidence.some(e => e.kind === 'individual_recheck'));
    assert(evidence.some(e => e.kind === 'exit'));
    assert(evidence.every(e => e.individual));
  }
  for (const task of pkg.tasks.filter(t => t.type === 'closed')) {
    assert.equal(CHECKER_REGISTRY[task.evaluation.checkerId](task.evaluation.answerKey, task).ok, true);
  }
  assert(pkg.tasks.filter(t => t.branch === 'support').length > 0);
  assert(pkg.tasks.filter(t => t.branch === 'core').length > 0);
  assert(pkg.tasks.filter(t => t.branch === 'extension').length > 0);
  assert.equal(createHash('sha256').update(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url))).digest('hex'), createHash('sha256').update(pilot).digest('hex'));
});

test('source sequence computations corroborate exact keys without replacing proof', () => {
  const eps = 1e-12;
  for (let n = 1; n <= 20; n++) {
    const u = n / (n + 1), v = (2 * n + 1) / (n + 1);
    assert(Math.abs((n + 1) / (n + 2) - u - 1 / ((n + 1) * (n + 2))) < eps);
    assert(Math.abs((2 * (n + 1) + 1) / (n + 2) - v - 1 / ((n + 1) * (n + 2))) < eps);
    assert(u > 0 && u < 1 && v < 2);
    assert(1 / (n + 1) < 1 / n);
    assert((-1) ** n >= -1 && (-1) ** n <= 1);
  }
  assert.equal(((-1) ** 2) / ((-1) ** 1), ((-1) ** 3) / ((-1) ** 2));
  assert.equal((-1) ** 2 - (-1) ** 1, 2);
  assert.equal((-1) ** 3 - (-1) ** 2, -2);
});
