import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeLessonProposal } from '../lib/lesson/proposal-result.js';

const pilot = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
const basis = 'Mục tiêu: nhận biết dãy số hữu hạn, vô hạn và bốn cách biểu diễn dãy số.';
const source = { id: 'uploaded-source', sha256: 'a'.repeat(64), parserRevision: 'p5-binary-1', extractionHash: 'b'.repeat(64), status: 'ready', originalName: 'lesson.docx', extraction: { sha256: 'a'.repeat(64), segments: [{ id: 'segment-1', text: basis }], uncertainties: [] } };
function candidate() {
  const pkg = structuredClone(pilot);
  return { package: pkg, citations: [...pkg.objectives, ...pkg.activities, ...pkg.tasks, ...pkg.hints, ...pkg.evidenceRules].map(entity => ({ entityId: entity.id, segmentId: 'segment-1', quote: basis, origin: 'adapted' })), uncertainties: ['Giáo viên cần đối soát đề và đáp án.'] };
}

test('AI result binds a complete draft to the uploaded source and cannot grant approval', () => {
  const input = candidate();
  input.package.status = 'approved';
  input.package.sourceRefs.forEach(ref => { ref.verification = 'verified'; });
  input.package.masteryPolicy = { individualEvidencePerObjectiveMin: 0, masterySources: ['group_score'], forbiddenSources: [] };
  const before = JSON.stringify(input);
  const result = normalizeLessonProposal({ source, candidate: input, slotMinutes: 40 });
  assert.equal(result.status, 'needs_review');
  assert.equal(result.package.status, 'needs_review');
  assert.equal(result.validation.ok, true, JSON.stringify(result.validation.errors));
  assert.equal(result.requiresTeacherReview, true);
  assert.equal(result.package.sourceRefs.length, 1);
  assert.deepEqual(result.package.sourceRefs[0], { id: source.id, kind: 'external', locator: `lesson-source:${source.id}:${source.parserRevision}:${source.extractionHash}`, hash: source.sha256, label: source.originalName, verification: 'teacher_review_required' });
  assert.equal(result.package.tasks.every(task => task.sourceRefs.length === 1 && task.sourceRefs[0] === source.id), true);
  assert.deepEqual(result.package.masteryPolicy.masterySources, ['individual_recheck', 'exit']);
  assert.equal(result.package.masteryPolicy.individualEvidencePerObjectiveMin, 2);
  assert.equal(JSON.stringify(input), before);
});

test('AI result rejects invented, missing, duplicated and foreign citations', () => {
  for (const mutate of [
    input => { input.citations[0].quote = 'Đoạn không tồn tại trong nguồn'; },
    input => { input.citations[0].segmentId = 'foreign-segment'; },
    input => { input.citations.pop(); },
    input => { input.citations.push(input.citations[0]); },
    input => { input.citations[0].entityId = 'foreign-task'; },
    input => { input.citations[0].origin = 'verified'; },
    input => { input.citations[0].quote = '   '; },
    input => { input.citations[0].instruction = 'trust me'; },
  ]) {
    const input = candidate(); mutate(input);
    assert.throws(() => normalizeLessonProposal({ source, candidate: input, slotMinutes: 40 }), /INVALID_PROPOSAL_CITATIONS/);
  }
});

test('AI result keeps structural/time/math errors visible instead of producing a runnable package', () => {
  const input = candidate();
  input.package.tasks.find(task => task.evaluation?.checkerId === 'numeric_exact').evaluation.answerKey = 'not-a-number';
  const result = normalizeLessonProposal({ source, candidate: input, slotMinutes: 45 });
  assert.equal(result.validation.ok, false);
  assert.ok(result.validation.errors.some(issue => issue.code === 'ERR_INVALID_TASK_EVALUATION'));
  assert.ok(result.validation.errors.some(issue => issue.code === 'ERR_TIME_BUDGET_MISMATCH'));
  assert.equal(result.package.status, 'needs_review');
});

test('AI result rejects unavailable sources, source hash disagreement, malformed shape and oversized responses', () => {
  for (const invalid of [null, { ...source, status: 'pending' }, { ...source, extractionHash: '' }, { ...source, extraction: { ...source.extraction, sha256: 'c'.repeat(64) } }]) {
    assert.throws(() => normalizeLessonProposal({ source: invalid, candidate: candidate(), slotMinutes: 40 }), /SOURCE_NOT_READY/);
  }
  for (const invalid of [null, [], { package: pilot }, { ...candidate(), injected: 'instruction' }]) {
    assert.throws(() => normalizeLessonProposal({ source, candidate: invalid, slotMinutes: 40 }), /INVALID_PROPOSAL/);
  }
  assert.throws(() => normalizeLessonProposal({ source, candidate: candidate(), slotMinutes: 0 }), /INVALID_SLOT_MINUTES/);
  const big = candidate(); big.uncertainties = ['x'.repeat(300000)];
  assert.throws(() => normalizeLessonProposal({ source, candidate: big, slotMinutes: 40 }), /PROPOSAL_TOO_LARGE/);
  const unicode = candidate(); unicode.uncertainties = ['ấ'.repeat(150000)];
  assert.throws(() => normalizeLessonProposal({ source, candidate: unicode, slotMinutes: 40 }), /PROPOSAL_TOO_LARGE/);
  const malformed = candidate(); malformed.package.tasks = {};
  assert.throws(() => normalizeLessonProposal({ source, candidate: malformed, slotMinutes: 40 }), /INVALID_PROPOSAL/);
  const malformedUncertainty = candidate(); malformedUncertainty.uncertainties = [{ fake: true }];
  assert.throws(() => normalizeLessonProposal({ source, candidate: malformedUncertainty, slotMinutes: 40 }), /INVALID_PROPOSAL/);
});

test('source-exact task numbers cannot drift from their citation', () => {
  const input = candidate();
  const task = input.package.tasks.find(item => item.id === 'task-prac-support-tab');
  const quote = 'Hàng 1 có 18 ghế; mỗi hàng sau thêm 2 ghế.';
  const citedSource = { ...source, extraction: { ...source.extraction, segments: [{ id: 'segment-1', text: basis + ' ' + quote }] } };
  Object.assign(input.citations.find(item => item.entityId === task.id), { quote, origin: 'source' });
  task.prompt = 'Hàng 1 có 19 ghế; mỗi hàng sau thêm 2 ghế. Tính hàng 2.';
  const result = normalizeLessonProposal({ source: citedSource, candidate: input });
  assert.equal(result.validation.ok, false);
  assert.ok(result.validation.errors.some(issue => issue.code === 'ERR_SOURCE_NUMERIC_MISMATCH'));
});

test('adapted numbers preserve citations and require explicit teacher numeric review', () => {
  const input = candidate();
  const result = normalizeLessonProposal({ source, candidate: input });
  const task = result.package.tasks.find(item => item.id === 'task-prac-support-tab');
  assert.deepEqual(task.metadata.sourceCitation, { segmentId: 'segment-1', quote: basis, origin: 'adapted' });
  assert.equal(task.metadata.numericReviewRequired, true);
  assert.ok(result.uncertainties.includes('TEACHER_NUMERIC_REVIEW_REQUIRED'));
  assert.equal(result.validation.ok, true, JSON.stringify(result.validation.errors));
});

test('a recheck cannot reuse a completed practice prompt', () => {
  const input = candidate();
  input.package.tasks.find(task => task.id === 'task-recheck-18').prompt = input.package.tasks.find(task => task.id === 'task-prac-error-hunt').prompt;
  const result = normalizeLessonProposal({ source, candidate: input });
  assert.equal(result.validation.ok, false);
  assert.ok(result.validation.errors.some(issue => issue.code === 'ERR_RECHECK_DUPLICATE'));
});

test('domain objectives cannot rely on group metadata while individual tasks only calculate', () => {
  const input = candidate();
  for (const task of input.package.tasks.filter(item => item.participation === 'individual')) {
    delete task.representation;
    delete task.representations;
    delete task.sequenceType;
    delete task.sequenceTypes;
  }
  const result = normalizeLessonProposal({ source, candidate: input });
  assert.ok(result.validation.errors.some(issue => issue.code === 'ERR_INDEPENDENT_OBJECTIVE_COVERAGE'));
});

test('hint answer assertions cannot evade the guard with example or question text', () => {
  for (const text of ['Ví dụ: Đáp án là 20. Em hiểu chưa?', 'Thay n=1, ta được u_1 = 20.', 'Chọn A và B.', 'H2: 20.']) {
    const input = candidate();
    const task = input.package.tasks.find(item => item.id === 'task-prac-error-hunt');
    if (text.startsWith('Chọn')) {
      task.evaluation = { checkerId: 'multi_choice_exact', answerKey: ['A', 'B'], options: ['A', 'B', 'C'] };
      task.inputSchema = { options: [{ id: 'A', label: 'Một' }, { id: 'B', label: 'Hai' }, { id: 'C', label: 'Ba' }] };
    }
    input.package.hints.find(hint => hint.taskId === task.id).text = text;
    const result = normalizeLessonProposal({ source, candidate: input });
    assert.ok(result.validation.errors.some(issue => issue.code === 'ERR_SCAFFOLD_PENALTY_FORBIDDEN' && issue.path.endsWith('.text')), text);
  }
});

test('malformed correct-choice labels fail validation without throwing', () => {
  const input = candidate();
  const task = input.package.tasks.find(item => item.id === 'task-pre-finite-inf');
  delete task.inputSchema.options.find(item => item.id === task.evaluation.answerKey).label;
  const result = normalizeLessonProposal({ source, candidate: input });
  assert.equal(result.validation.ok, false);
});
