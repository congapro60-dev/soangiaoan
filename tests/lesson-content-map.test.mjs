import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createPackageDraft, hashPackage } from '../lib/lesson/schema.js';
import { validateLessonPackage } from '../lib/lesson/validate.js';
import { createGenerationScope, GENERATION_SCOPE, selectLessonScope, validateMultiGenerationScope } from '../lib/lesson/content-map.js';

const pilot = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
const catalogue = JSON.parse(await readFile(new URL('../content/lesson-catalogue.json', import.meta.url), 'utf8'));

test('multi-lesson scope resolves only catalogue selections in canonical order with unknown objectives retained',()=>{
 const first=catalogue.lessons[0],last=catalogue.lessons.at(-1);
 const request={selections:[{lessonId:last.id,sectionIds:[last.sections[0].id]},{lessonId:first.id,sectionIds:[first.sections[0].id]}]};
 const result=createGenerationScope(catalogue,request);assert.equal(result.ok,true,JSON.stringify(result.issues));
 assert.equal(result.scope.format,'lesson-generation-scope-v2');assert.deepEqual(result.scope.lessonIds,[first.id,last.id]);assert.equal(result.scope.sections.length,2);
 assert.equal(result.scope.sections[0].scopeSectionId,first.id+'/'+first.sections[0].id);assert.equal(result.scope.sections[0].lessonId,first.id);
 assert.ok(result.scope.uncertainties.includes('OBJECTIVES_UNKNOWN'));assert.equal(result.scope.requiresTeacherReview,true);
 assert.deepEqual(result.scope.sources.map(source=>source.id),catalogue.sources.filter(source=>first.sourceIds.includes(source.id)||last.sourceIds.includes(source.id)).map(source=>source.id));
 result.scope.sections[0].title='changed';assert.notEqual(catalogue.lessons[0].sections[0].title,'changed');
 assert.deepEqual(createGenerationScope(catalogue,{selections:request.selections.toReversed()}).scope.sectionIds,result.scope.sectionIds);
});
test('multi-scope rejects duplicate lessons, forged claims, empty sections, unknown lessons and oversized selections',()=>{
 const one={lessonId:catalogue.lessons[0].id,sectionIds:[catalogue.lessons[0].sections[0].id]},two={lessonId:catalogue.lessons[1].id,sectionIds:[catalogue.lessons[1].sections[0].id]};
 for(const request of [{selections:[]},{selections:[one]},{selections:[,one]},{selections:[one,{...two,sectionIds:[,]}]},{selections:[one,one]},{selections:[one,two],grade:12},{selections:[one,{...two,sectionIds:[]}]},{selections:[one,{...two,lessonId:'forged'}]},{selections:[one,{...two,objectiveCodes:['FAKE']}]},{selections:Array.from({length:13},(_,i)=>({...one,lessonId:'id'+i}))}])assert.equal(createGenerationScope(catalogue,request).ok,false,JSON.stringify(request));
});

function exclusivePackage() {
  const pkg = createPackageDraft({ id: 'scope-fixture', curriculumRefs: ['LOA', 'LOB'],
    sourceRefs: ['a', 'b'].map(id => ({ id: 'src-' + id, kind: 'external', locator: id, label: id, verification: 'verified' })),
    essentialQuestion: 'A và UNSELECTED_B', prerequisites: [],
    rubric: { criteria: ['A', 'UNSELECTED_B'], lookFor: ['UNSELECTED_B'] } });
  for (const id of ['a', 'b']) {
    pkg.objectives.push({ id, code: 'LO' + id.toUpperCase(), level: 'must', statement: id === 'a' ? 'A' : 'UNSELECTED_B', prerequisiteIds: [] });
    for (const phase of ['guided', 'formation', 'recheck', 'exit']) {
      const taskId = `${id}-${phase}`, evidenceId = 'ev-' + taskId;
      pkg.activities.push({ id: 'act-' + taskId, phase, budgetRole: 'core', minutes: 1, objectiveIds: [id], taskIds: [taskId], participation: 'individual', studentAction: id, expectedProduct: id, evidenceIds: [evidenceId], supportIds: [], teacherLookFor: id, transition: '' });
      pkg.tasks.push({ id: taskId, type: 'closed', activityId: 'act-' + taskId, objectiveIds: [id], participation: 'individual', prompt: `${id === 'a' ? 'A' : 'UNSELECTED_B'} ${phase}: tính ${phase.length} + 1.`, sourceRefs: ['src-' + id], evidenceIds: [evidenceId], evaluation: { checkerId: 'numeric_exact', answerKey: phase.length + 1 }, isCore: false, requiresFullScaffold: false, supportRationale: '', minutes: 1, hintIds: [], branch: 'shared' });
      pkg.evidenceRules.push({ id: evidenceId, taskId, objectiveIds: [id], kind: phase === 'guided' ? 'precheck' : phase === 'formation' ? 'practice' : phase === 'recheck' ? 'individual_recheck' : 'exit', individual: true, countsForMastery: ['recheck', 'exit'].includes(phase) });
    }
  }
  pkg.budget = { slotMinutes: 8, coreMinutes: 8, reserveMinutes: 0, optionalMinutes: 0, transitionMinutes: 0 };
  pkg.contentHash = hashPackage(pkg);
  assert.equal(validateLessonPackage(pkg).ok, true, JSON.stringify(validateLessonPackage(pkg).errors));
  return pkg;
}
test('multi-scope drafts require every selected section, correct task links and independent recheck plus exit',()=>{
 const scope={format:'lesson-generation-scope-v2',sections:[{scopeSectionId:'lesson/a',objectiveCodes:['LOA']},{scopeSectionId:'lesson/b',objectiveCodes:[]}]};
 const pkg=exclusivePackage();for(const objective of pkg.objectives)objective.metadata={scopeSectionId:'lesson/'+objective.id};for(const task of pkg.tasks)task.metadata={scopeSectionId:'lesson/'+task.objectiveIds[0]};
 assert.deepEqual(validateMultiGenerationScope(scope,pkg),[]);
 for(const mutate of [draft=>{draft.objectives[0].metadata.scopeSectionId='outside';},draft=>{draft.tasks[0].metadata.scopeSectionId='lesson/b';},draft=>{draft.tasks=draft.tasks.filter(task=>task.id!=='b-exit');},draft=>{draft.objectives=draft.objectives.filter(objective=>objective.id!=='b');},draft=>{draft.objectives[0].code='WRONG';},draft=>{draft.objectives[1].code='T11.999';}]){
  const draft=structuredClone(pkg);mutate(draft);assert.ok(validateMultiGenerationScope(scope,draft).length);
 }
});

test('whole lesson selection preserves content, returns a new draft and recomputes its hash', () => {
  const source = structuredClone(pilot), before = JSON.stringify(source);
  const result = selectLessonScope(source);
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.package.status, 'draft');
  assert.equal(result.package.contentHash, hashPackage(result.package));
  assert.notEqual(result.package.contentHash, pilot.contentHash);
  assert.deepEqual(result.package.tasks, pilot.tasks);
  assert.equal(validateLessonPackage(result.package).ok, true);
  result.package.tasks[0].prompt = 'changed';
  assert.equal(JSON.stringify(source), before);
});

test('exclusive partial scope removes content, references and objectives from the unselected scope', () => {
  const pkg = exclusivePackage(), before = JSON.stringify(pkg);
  const result = selectLessonScope(pkg, { objectiveIds: ['a'] });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(result.package.objectives.map(o => o.id), ['a']);
  assert.deepEqual(result.package.sourceRefs.map(s => s.id), ['src-a']);
  assert.deepEqual(result.package.curriculumRefs, ['LOA']);
  assert.equal(result.package.activities.length, 4);
  assert.doesNotMatch(JSON.stringify(result.package), /UNSELECTED_B|b-formation|ev-b-recheck/);
  assert.equal(result.package.budget.coreMinutes, 4);
  assert.equal(result.package.budget.slotMinutes, 4);
  assert.equal(result.package.contentHash, hashPackage(result.package));
  assert.equal(validateLessonPackage(result.package).ok, true);
  assert.equal(JSON.stringify(pkg), before);
});

test('mixed tasks are explicit conflicts, never relabelled as a partial lesson', () => {
  const result = selectLessonScope(pilot, { objectiveIds: ['obj-t11-18'] });
  assert.equal(result.ok, false);
  assert.equal(result.package, null);
  assert.ok(result.issues.some(i => i.code === 'SCOPE_MIXED_OBJECTIVES' && i.taskId === 'task-exit-ticket'));
});

test('selecting activities cannot omit precheck, two mastery tasks, recheck or exit', () => {
  const pkg = exclusivePackage();
  for (const omitted of ['guided', 'formation', 'recheck', 'exit']) {
    const activityIds = pkg.activities.filter(a => a.id.startsWith('act-a-') && a.phase !== omitted).map(a => a.id);
    const result = selectLessonScope(pkg, { objectiveIds: ['a'], activityIds });
    assert.equal(result.ok, false, omitted);
    assert.equal(result.package, null);
    assert.ok(result.issues.length, omitted);
  }
});

test('selection rejects malformed and unknown IDs, fields, tampered packages and empty objectives', () => {
  const pkg = exclusivePackage();
  for (const request of [null, [], { objectiveIds: [] }, { objectiveIds: ['missing'] }, { objectiveIds: ['a', 'a'] }, { objectiveIds: 'a' }, { objectiveIds: ['a'], activityIds: ['missing'] }, { objectiveIds: ['a'], activityIds: [] }, { objectiveIds: ['a'], grantsMastery: true }]) {
    const result = selectLessonScope(pkg, request);
    assert.equal(result.ok, false, JSON.stringify(request));
    assert.equal(result.package, null);
  }
  for (const input of [null, [], { ...pkg, contentHash: 'bad' }, { ...pkg, objectives: [] }]) assert.equal(selectLessonScope(input).ok, false);
  for (const field of ['prerequisites', 'curriculumRefs']) {
    const malformed = structuredClone(pkg); malformed[field] = null; malformed.contentHash = hashPackage(malformed);
    assert.doesNotThrow(() => assert.equal(selectLessonScope(malformed, { objectiveIds: ['a'] }).ok, false));
  }
});

test('partial selection rejects unmet prerequisites and does not silently erase them', () => {
  const pkg = exclusivePackage();
  pkg.objectives[1].prerequisiteIds = ['a']; pkg.contentHash = hashPackage(pkg);
  const result = selectLessonScope(pkg, { objectiveIds: ['b'] });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(i => i.code === 'SCOPE_PREREQUISITE_REQUIRED'));
  const withText = exclusivePackage();
  withText.prerequisites = ['Known prior learning']; withText.contentHash = hashPackage(withText);
  assert.ok(selectLessonScope(withText, { objectiveIds: ['a'] }).issues.some(i => i.code === 'SCOPE_PREREQUISITES_REVIEW_REQUIRED'));
});

test('partial selection keeps hint and assessment provenance only for retained tasks', () => {
  const pkg = exclusivePackage();
  for (const id of ['a', 'b']) {
    const hintId = 'hint-' + id, task = pkg.tasks.find(t => t.id === id + '-formation');
    task.hintIds = [hintId];
    pkg.activities.find(a => a.id === task.activityId).supportIds = [hintId];
    pkg.hints.push({ id: hintId, tier: 'H1', text: id === 'a' ? 'Identify the given terms.' : 'UNSELECTED_B', taskId: task.id, objectiveIds: [id], order: 1, notAnswer: true, penalty: { time: 0, score: 0, freeze: 0 }, supportRationale: 'Identify givens.' });
  }
  pkg.contentHash = hashPackage(pkg);
  const result = selectLessonScope(pkg, { objectiveIds: ['a'] });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(result.package.hints.map(h => h.id), ['hint-a']);
  assert.deepEqual(result.package.tasks.find(t => t.id === 'a-formation').hintIds, ['hint-a']);
  assert.ok(result.package.evidenceRules.every(e => e.objectiveIds.every(id => id === 'a')));
  assert.doesNotMatch(JSON.stringify(result.package), /UNSELECTED_B|hint-b/);
});

test('each objective needs its own individual exit evidence, even when another objective has an exit', () => {
  const pkg = exclusivePackage();
  pkg.evidenceRules.find(e => e.taskId === 'a-exit').kind = 'individual_recheck';
  pkg.contentHash = hashPackage(pkg);
  assert.equal(validateLessonPackage(pkg).ok, true);
  const result = selectLessonScope(pkg);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(i => i.code === 'SCOPE_OBJECTIVE_CHECK_REQUIRED' && i.objectiveId === 'a'));
});

test('catalogue preserves seven PPCT lesson names, source years and unknown objectives', () => {
  assert.equal(catalogue.lessons.length, 7);
  assert.equal(catalogue.status, 'draft');
  assert.equal(catalogue.sources.find(s => s.id === 'smartplan-ppct-g11').schoolYear, '2026 - 2027');
  assert.equal(catalogue.sources.find(s => s.id === 'smartplan-unitplan-g11').sourceDocument, 'Dis_Toán 11 Kế-hoạch-học-phần-I năm 25-26.docx');
  assert.ok(catalogue.lessons.every(l => l.sections.every(s => s.sourceRows.length && s.locator)));
  assert.ok(catalogue.lessons.filter(l => l.id !== 'g11-sequences').every(l => l.sections.every(s => s.objectiveCodes.length === 0)));
  const sequence = catalogue.lessons.find(l => l.id === 'g11-sequences');
  assert.deepEqual(sequence.sections[0].objectiveCodes, ['T11.18', 'T11.19']);
  assert.equal(sequence.sections[1].title, 'Tiết 2: Dãy số tăng, giảm, bị chặn');
  assert.deepEqual(sequence.sections[1].objectiveCodes, []);
  for (const type of sequence.sections[0].knowledge.flatMap(item => item.types)) for (const taskId of Object.values(type.taskLevels).flat()) assert.notEqual(pilot.tasks.find(task => task.id === taskId).type, 'reflection');
});

test('generation scope resolves only trusted catalogue selections, known codes and source locators', () => {
  const lesson = catalogue.lessons.find(l => l.id === 'g11-sequences');
  const before = JSON.stringify(catalogue);
  const result = createGenerationScope(catalogue, { lessonId: lesson.id, sectionIds: [lesson.sections[0].id] });
  assert.equal(result.ok, true);
  assert.equal(result.scope.format, GENERATION_SCOPE);
  assert.deepEqual(result.scope.objectiveCodes, ['T11.18', 'T11.19']);
  assert.equal(result.scope.sections[0].locator, lesson.sections[0].locator);
  assert.equal(result.scope.requiresTeacherReview, true);
  assert.equal(result.scope.sources.find(source => source.id === 'sequences-pilot').contentHash, pilot.contentHash);
  assert.ok(result.scope.uncertainties.includes('SOURCE_YEAR_CONFLICT'));
  result.scope.sections[0].title = 'changed';
  assert.equal(JSON.stringify(catalogue), before);
});

test('generation scope for PPCT-only sections keeps objectives unknown', () => {
  const lesson = catalogue.lessons[0];
  const result = createGenerationScope(catalogue, { lessonId: lesson.id, sectionIds: [lesson.sections[0].id] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.scope.objectiveCodes, []);
  assert.ok(result.scope.uncertainties.includes('OBJECTIVES_UNKNOWN'));
  assert.equal(result.scope.curriculumVerification, 'teacher_review_required');
});

test('generation scope resolves known descendant IDs to one source objective, never client curriculum codes', () => {
  const result = createGenerationScope(catalogue, { lessonId: 'g11-sequences', sectionIds: ['obj-t11-18'] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.scope.objectiveCodes, ['T11.18']);
  assert.equal(result.scope.sections[0].sourceTitle, 'Tiết 1: Dãy số');
  assert.match(result.scope.sections[0].locator, /knowledge\/obj-t11-18$/);
});

test('generation scope rejects unknown, duplicate, empty or forged section selections', () => {
  const lesson = catalogue.lessons[0], sectionId = lesson.sections[0].id;
  for (const request of [null, { lessonId: 'missing', sectionIds: [sectionId] }, { lessonId: lesson.id, sectionIds: [] }, { lessonId: lesson.id, sectionIds: [sectionId, sectionId] }, { lessonId: lesson.id, sectionIds: ['missing'] }, { lessonId: lesson.id, sectionIds: [sectionId], objectiveCodes: ['FAKE'] }]) assert.equal(createGenerationScope(catalogue, request).ok, false);
  assert.equal(createGenerationScope({ lessons: [] }, { lessonId: 'missing', sectionIds: ['x'] }).ok, false);
});
