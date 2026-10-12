import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleLessonOutline } from '../lib/lesson/generation-outline.js';
import { normalizeLessonProposal } from '../lib/lesson/proposal-result.js';

const citation = { segmentId: 's1', quote: 'Dãy số với u_n=18+2(n-1)', origin: 'adapted' };
const source = { id: 'source-a', status: 'ready', originalName: 'source.docx', sha256: 'a'.repeat(64), parserRevision: 'p5', extractionHash: 'b'.repeat(64), extraction: { sha256: 'a'.repeat(64), segments: [{ id: 's1', text: citation.quote }], uncertainties: [] } };
function outline() {
  const phases = ['experience', 'formation', 'practice', 'recheck', 'exit'];
  return {
    format: 'lesson-outline-v1', essentialQuestion: 'Làm thế nào tính đúng một số hạng?',
    objectives: [{ statement: 'Tính số hạng dựa trên công thức cho trước.', source: citation }],
    activities: phases.map((phase,index) => ({
      phase, minutes: 8, participation: index === 2 ? 'group' : 'individual',
      objectiveIndexes: [0], studentAction: 'Tính và giải thích số hạng.', expectedProduct: 'Kết quả có giải thích.', teacherLookFor: 'Thay đúng chỉ số.', source: citation,
      tasks: [{ type: 'closed', prompt: 'Tính $u_' + (index + 1) + '$ với $u_n=18+2(n-1)$.', minutes: 5, evaluation: { checkerId: 'numeric_exact', answerKey: 18 }, hints: ['Thay chỉ số của số hạng vào công thức.'], source: citation }]
    })),
    uncertainties: []
  };
}
test('multi-scope section links survive outline assembly on objectives and tasks only as metadata',()=>{
 const input=outline();input.objectives[0].scopeSectionId='lesson/section';for(const activity of input.activities)for(const task of activity.tasks)task.scopeSectionId='lesson/section';
 const result=assembleLessonOutline(input,{slotMinutes:40,subject:'math',grade:11});
 assert.equal(result.package.objectives[0].metadata.scopeSectionId,'lesson/section');assert.ok(result.package.tasks.every(task=>task.metadata.scopeSectionId==='lesson/section'));assert.equal('scopeSectionId' in result.package.tasks[0],false);
 for(const bad of ['',[],{},null,128]){const changed=outline();changed.objectives[0].scopeSectionId=bad;assert.throws(()=>assembleLessonOutline(changed,{slotMinutes:40,subject:'math',grade:11}),/INVALID_PROPOSAL/);}
});

test('outline assembler creates reciprocal references, evidence and free hints without inventing answers', () => {
  const input = outline(), before = JSON.stringify(input);
  const candidate = assembleLessonOutline(input, { slotMinutes: 40, subject: 'math', grade: 11 });
  assert.equal(JSON.stringify(input), before);
  const result = normalizeLessonProposal({ source, candidate, slotMinutes: 40 });
  assert.equal(result.validation.ok, true, JSON.stringify(result.validation.errors));
  assert.equal(result.package.tasks.length, 5);
  assert.equal(result.package.tasks[0].evaluation.answerKey, 18);
  assert.ok(result.package.hints.every(hint => hint.notAnswer && hint.penalty.score === 0 && hint.penalty.time === 0 && hint.penalty.freeze === 0));
  const groupEvidence = result.package.evidenceRules[2];
  assert.equal(groupEvidence.kind, 'group_product');
  assert.equal(groupEvidence.countsForMastery, false);
  assert.deepEqual(result.package.evidenceRules.slice(-2).map(item => item.kind), ['individual_recheck', 'exit']);
  assert.equal(result.package.evidenceRules.filter(item => item.countsForMastery).length, 2);
  assert.equal(candidate.citations.length, 21);
});

test('outline assembler rejects unknown fields/references and leaves wrong answers to the existing validator', () => {
  const settings = { slotMinutes: 40, subject: 'math', grade: 11 };
  for (const mutate of [
    input => { input.approved = true; },
    input => { input.activities[0].objectiveIndexes = [99]; },
    input => { input.activities[0].tasks[0].hints = null; },
    input => { input.objectives = []; },
  ]) {
    const input = outline(); mutate(input);
    assert.throws(() => assembleLessonOutline(input, settings), /INVALID_PROPOSAL/);
  }
  const bad = outline(); bad.activities[0].tasks[0].evaluation.answerKey = '18';
  const result = normalizeLessonProposal({ source, candidate: assembleLessonOutline(bad, settings), slotMinutes: 40 });
  assert.equal(result.validation.ok, false);
  assert.ok(result.validation.errors.some(issue => issue.code === 'ERR_INVALID_TASK_EVALUATION'));
});

test('an explicit curriculum code in the quoted source is retained for domain coverage checks', () => {
  const input = outline();
  input.objectives[0].code = 'LO1';
  input.objectives[0].source = { ...citation, quote: 'Mục tiêu T11.18: nhận biết dãy hữu hạn và vô hạn.' };
  const candidate = assembleLessonOutline(input, { slotMinutes: 40, subject: 'math', grade: 11 });
  assert.equal(candidate.package.objectives[0].code, 'T11.18');
  const extendedSource = { ...source, extraction: { ...source.extraction, segments: [...source.extraction.segments, { id: 's2', text: input.objectives[0].source.quote }] } };
  candidate.citations.find(item => item.entityId === 'obj-1').segmentId = 's2';
  const result = normalizeLessonProposal({ source: extendedSource, candidate, slotMinutes: 40 });
  assert.equal(result.validation.ok, false);
  assert.ok(result.validation.errors.some(item => item.code === 'ERR_MISSING_FINITE_INFINITE_DISTINCTION'));
});

test('curriculum codes are not guessed from missing or ambiguous source quotes', () => {
  for (const quote of [citation.quote, 'Mục tiêu T11.18 và T11.19.', 'Không phải xT11.18 hay T11.18.1.']) {
    const input = outline();
    input.objectives[0].source = { ...citation, quote };
    assert.equal(assembleLessonOutline(input, { slotMinutes: 40, subject: 'math', grade: 11 }).package.objectives[0].code, 'LO1');
  }
});
