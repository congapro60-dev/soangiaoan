import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hashPackage} from '../../lib/lesson/schema.js';
import {validateLessonPackage} from '../../lib/lesson/validate.js';
import {normalizeExamInput} from '../../lib/exam/validate.js';
import {parseExamLines} from '../../lib/exam/parse.js';

const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const source=read('tasks/r23-hkii/ppct-hkii.json').grades.find(g=>g.grade===10);
const data=read('content/lessons/hkii-2026-g10.json');
const scopes=read('tasks/r23-hkii/g10-source-coverage.json');
const sourceById=new Map([...source.hki_prerequisites.lessons,...source.lessons].map(p=>[p.id,p]));
const introductions=new Map(scopes.concepts.map(c=>[c.conceptId,sourceById.get(c.introducedBy)]));
assert.equal(data.entries.length,126);assert.equal(data.exams.length,2);
const represented=[...data.entries.map(e=>e.sourcePeriodId),...data.exams.flatMap(e=>e.sourcePeriodIds)];
assert.equal(new Set(represented).size,130);
assert.deepEqual([...represented].sort(),source.lessons.map(p=>p.id).sort());
assert.ok(!represented.some(id=>source.post_hkii.lessons.some(p=>p.id===id)));
let games=0,unitAligned=0;
for(const entry of data.entries){
  const pkg=entry.pkg,p=sourceById.get(entry.sourcePeriodId);
  assert.equal(pkg.status,'draft');assert.equal(entry.reviewStatus,'teacher_review_required');
  assert.equal(pkg.contentHash,hashPackage(pkg));assert.equal(validateLessonPackage(pkg,{mode:'draft'}).ok,true);
  assert.equal(validateLessonPackage(pkg,{mode:'publish'}).ok,false);
  assert.equal(pkg.budget.slotMinutes,40);assert.ok(pkg.budget.reserveMinutes>=3);
  assert.equal(pkg.budget.coreMinutes+pkg.budget.optionalMinutes+pkg.budget.reserveMinutes+pkg.budget.transitionMinutes,40);
  assert.ok(pkg.sourceRefs.every(r=>r.verification==='teacher_review_required'));
  assert.ok(pkg.activities[0].teacherLookFor.includes('bảng trắng'));
  const extension=pkg.activities.find(a=>a.budgetRole==='optional');
  assert.ok(pkg.activities.indexOf(extension)>pkg.activities.findIndex(a=>a.phase==='exit'));
  for(const objective of pkg.objectives){
    const evidence=['individual_recheck','exit'].map(kind=>pkg.evidenceRules.find(e=>e.kind===kind&&e.objectiveIds.includes(objective.id)&&e.individual&&e.countsForMastery));
    assert.ok(evidence.every(Boolean));
    assert.notEqual(...evidence.map(e=>pkg.tasks.find(t=>t.id===e.taskId).prompt));
    for(const branch of ['support','core','extension']){
      const task=pkg.tasks.find(t=>t.branch===branch&&t.objectiveIds.includes(objective.id));assert.ok(task);
      if(branch==='support')assert.equal(task.hintIds.length,4);
      if(branch==='extension')assert.ok(task.prompt.includes('Mở rộng:'));
    }
  }
  for(const task of pkg.tasks.filter(t=>t.type!=='reflection')){
    assert.ok(task.metadata.workedSolution.length>20);
    if(task.type==='open')assert.deepEqual(task.evaluation.rubric.lookFor,[task.metadata.workedSolution]);
    else assert.ok(['numeric_exact','choice_exact'].includes(task.evaluation.checkerId));
  }
  if(pkg.sourceRefs.some(r=>r.id==='r22-g10-u2-lo04'||r.id==='r22-g10-u2-lo05'||r.id==='r22-g10-u2-lo06'))unitAligned++;
  if(entry.kind==='elective'){
    games++;const scope=entry.cumulativeScope;
    assert.equal(scope.rule,'previous_weeks_only');assert.equal(scope.selectedConceptIds.length,2);
    assert.deepEqual(scope.selectedConceptIds,entry.conceptIds);assert.equal(new Set(entry.conceptIds).size,2);
    assert.ok(entry.conceptIds.some(id=>introductions.get(id).week<=18));
    assert.ok(scope.latestSourceWeek<p.week);
    assert.ok(scope.eligibleSourcePeriodIds.every(id=>sourceById.get(id).week<p.week));
    assert.ok(entry.conceptIds.every(id=>introductions.get(id).week<p.week));
    assert.ok(scope.description.includes('Không xem lượt chơi là kiểm tra toàn bộ'));
    for(const activity of pkg.activities.filter(a=>['experience','recheck','exit'].includes(a.phase)||a.phase==='practice'&&a.budgetRole==='core')){
      assert.ok(activity.taskIds.every(id=>pkg.tasks.find(t=>t.id===id).type==='closed'));
    }
    assert.ok(pkg.objectives.every(o=>o.statement===scopes.concepts.find(c=>c.conceptId===entry.conceptIds[pkg.objectives.indexOf(o)]).automaticTarget));
  }
}
assert.equal(games,28);assert.ok(unitAligned>0);
const hkiCovered=new Set(data.entries.filter(e=>e.kind==='elective').flatMap(e=>e.conceptIds).filter(id=>introductions.get(id).week<=18));
assert.equal(hkiCovered.size,28);
for(const id of ['proposition','quantifier','inequality','halfplane','system','optimize','trigValue','cosine','sine','areaSin','heron','vectorIntro','vectorSum','vectorDifference','vectorScale','coordinates','coordinateMidpoint','approximation','quartileMode','mode','spread','variance'])assert.ok(hkiCovered.has(id),id);
for(const metadata of data.exams){
  const exam=read(metadata.files.json);assert.equal(metadata.minutes,80);assert.equal(metadata.sourcePeriodIds.length,2);
  assert.equal(exam.durationMin,80);assert.equal(exam.questions.length,16);
  assert.equal(exam.questions.reduce((a,q)=>a+q.points,0),10);
  assert.equal(normalizeExamInput(exam).questions.length,16);
  const text=readFileSync(new URL(metadata.files.text,root),'utf8');
  const parsed=parseExamLines(text.split(/\r?\n/).map(text=>({text})));
  assert.deepEqual(parsed.questions.map(q=>q.type),exam.questions.map(q=>q.type));
  assert.equal(parsed.durationMin,80);
  assert.ok(exam.questions.every(q=>q.solution?.length));
}
console.log(JSON.stringify({ok:true,sourcePeriods:represented.length,packages:data.entries.length,games,exams:2,unitAlignedPackages:unitAligned,mathematicalChecks:data.summary.mathematicalChecks}));
