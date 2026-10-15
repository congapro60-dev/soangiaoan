import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assembleHkiPackage } from '../scripts/content/hki-package.mjs';
import { hashPackage } from '../lib/lesson/schema.js';
import { validateLessonPackage } from '../lib/lesson/validate.js';
import { createLessonSession } from '../lib/lesson/runtime.js';
import { serializeForStudent, serializeForTeacher, serializeForPresenter } from '../lib/lesson/serialize.js';

const ppct = JSON.parse(readFileSync(new URL('../tasks/r22/ppct-hki.json', import.meta.url)));
const units = JSON.parse(readFileSync(new URL('../tasks/r22/unit-objectives.json', import.meta.url))).units;
const period = ppct.grades[0].lessons[1], unit = units[0], lo = unit.sourceLOexact[0];
const source = { segmentId: lo.id, quote: lo.statement, origin: 'adapted' };

// Runnable authoring example: supply the mathematical work; the assembler only binds it.
function input() {
  const questions = [
    ['Is $2+3=5$ true?', 'yes'], ['Is $4+1=6$ true?', 'no'],
    ['Is $3+4=7$ true?', 'yes'], ['Is $6-2=5$ true?', 'no'], ['Is $8-3=5$ true?', 'yes'],
  ];
  return {
    period: structuredClone(period), title: 'Truth of arithmetic propositions', prerequisites: ['Whole-number addition and subtraction'],
    unitReferences: [{ id: lo.id, ...lo.reference, hash: unit.sourceSha256 }],
    outline: {
      format: 'lesson-outline-v1', essentialQuestion: 'How do we decide whether a proposition is true?',
      objectives: [{ statement: 'Decide the truth of an arithmetic proposition.', source }],
      activities: ['experience', 'formation', 'practice', 'recheck', 'exit'].map((phase, index) => {
        const task = { type: 'closed', prompt: questions[index][0], minutes: 5, source,
          inputSchema: { options: [{ id: 'yes', label: 'True' }, { id: 'no', label: 'False' }] },
          evaluation: { checkerId: 'choice_exact', answerKey: questions[index][1] },
          hints: ['Calculate the left side before comparing it with the right side.'] };
        return { phase, minutes: 8, participation: phase === 'formation' ? 'whole_class' : 'individual', objectiveIndexes: [0], source,
          studentAction: 'Calculate each side independently, then choose true or false.', expectedProduct: 'A choice supported by both calculated values.',
          teacherLookFor: 'Ask learners to explain equality; distinguish false statements from questions.', transition: 'Stop the devices and compare the two values on the board.',
          tasks: phase === 'practice' ? ['support', 'core', 'extension'].map(branch => ({ ...task, branch,
            hints: branch === 'support' ? ['Read the equality sign.', 'Evaluate the left side.', 'Start by adding the first two quantities.', 'For another example, compare $1+1$ with $3$.'] : task.hints })) : [task] };
      }), uncertainties: [],
    },
  };
}

test('binds exact PPCT and unit citations, creates a stable validated draft without changing input', () => {
  const authored = input(), before = structuredClone(authored), entry = assembleHkiPackage(authored), { pkg } = entry;
  assert.deepEqual(authored, before);
  assert.equal(pkg.id, `r22-${period.id}`);
  assert.equal(entry.sourcePeriodId, period.id);
  assert.equal(entry.period, period.period);
  assert.equal(pkg.status, 'draft');
  assert.equal(pkg.contentHash, hashPackage(pkg));
  assert.equal(assembleHkiPackage(input()).pkg.contentHash, pkg.contentHash);
  assert.equal(validateLessonPackage(pkg).ok, true);
  assert.equal(pkg.budget.coreMinutes, 40);
  assert.equal(pkg.budget.slotMinutes, 40);
  assert.ok(pkg.objectives.every(objective => objective.code.startsWith('r22-')));
  assert.ok(pkg.sourceRefs.every(ref => ref.verification === 'teacher_review_required'));
  assert.ok(pkg.tasks.every(task => task.sourceRefs.includes(lo.id) && task.metadata.numericReviewRequired));
  assert.equal(pkg.evidenceRules.filter(rule => rule.countsForMastery).length, 2);
  assert.equal(entry.citations.find(row => row.entityId === 'obj-1').quote, lo.statement);
  assert.equal(validateLessonPackage(pkg, { mode: 'publish' }).ok, false);
});

test('rejects changed PPCT, exam rows, invented sources/codes, missing recheck and over-budget outlines', () => {
  for (const mutate of [
    value => { value.period.period += 1; },
    value => { value.period = ppct.grades[0].lessons.find(row => row.kind === 'assessment'); },
    value => { value.unitReferences[0].sourceURL = 'https://example.com/invented'; },
    value => { value.outline.objectives[0].code = 'T10.1'; },
    value => { value.outline.activities[0].tasks[0].source = { ...source, segmentId: 'missing' }; },
    value => { value.outline.activities[0].tasks[0].source = { ...source, quote: 'Invented source quote' }; },
    value => { value.outline.activities[3].phase = 'practice'; },
    value => { value.slotMinutes = 30; },
  ]) { const authored = input(); mutate(authored); assert.throws(() => assembleHkiPackage(authored)); }
});

test('draft stays out of live rooms; student and presenter projections contain no source or answer data', () => {
  const { pkg } = assembleHkiPackage(input());
  assert.throws(() => createLessonSession({ package: pkg, mode: 'live' }), /ERR_PACKAGE_NOT_APPROVED/);
  const state = createLessonSession({ package: pkg, sessionId: 'hki-test', hostId: 'teacher', learners: [{ id: 'student' }], now: 1 });
  const teacher = JSON.stringify(serializeForTeacher(state));
  assert.ok(teacher.includes(unit.sourceURL));
  for (const view of [serializeForStudent(state, 'student'), serializeForPresenter(state)]) {
    const json = JSON.stringify(view);
    for (const secret of ['sourceCitation', 'answerKey', 'teacher_review_required', unit.sourceURL, lo.statement]) assert.equal(json.includes(secret), false, secret);
  }
});

test('accepts the two owner-confirmed cumulative slots while preserving blank PPCT cells', () => {
  const unit12 = units.find(item => item.grade === 12), lo12 = unit12.sourceLOexact[0];
  for (const slot of ppct.grades.find(item => item.grade === 12).lessons.filter(row => row.kind === 'unspecified')) {
    const authored = input(), citation = { segmentId: lo12.id, quote: lo12.statement, origin: 'adapted' };
    authored.period = structuredClone(slot);
    authored.unitReferences = [{ id: lo12.id, ...lo12.reference, hash: unit12.sourceSha256 }];
    for (const entity of [...authored.outline.objectives, ...authored.outline.activities, ...authored.outline.activities.flatMap(activity => activity.tasks)]) entity.source = citation;
    const entry = assembleHkiPackage(authored);
    assert.equal(entry.kind, 'elective');
    assert.equal(authored.period.source.content.cached, null);
    delete authored.period.ownerOverride;
    assert.throws(() => assembleHkiPackage(authored));
  }
});
