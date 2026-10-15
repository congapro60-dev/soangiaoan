import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import katex from 'katex';
import {createLessonSession} from '../../lib/lesson/runtime.js';
import {serializeForStudent,serializeForPresenter} from '../../lib/lesson/serialize.js';
import {validateLessonPackage} from '../../lib/lesson/validate.js';
import {hashPackage} from '../../lib/lesson/schema.js';
import {parseExamLines} from '../../lib/exam/parse.js';

const root=new URL('../../',import.meta.url),read=path=>JSON.parse(readFileSync(new URL(path,root)));
const data=read('content/lessons/hki-2026-g11.json'),bank=read('tasks/r22/g11-practice-bank.json');
const ppct=read('tasks/r22/ppct-hki.json').grades.find(grade=>grade.grade===11);
let formulas=0,views=0;
for(const row of bank.concepts){
 const period=ppct.lessons.find(period=>period.id===row.introducedBy);
 assert.equal(period.kind,'core');assert.equal(period.week,row.introducedWeek);
 assert.ok(data.entries.find(entry=>entry.sourcePeriodId===period.id).conceptIds.includes(row.conceptId));
 assert.equal(row.questions.length,4);
 for(const question of row.questions)for(const text of [question.prompt,question.solution,...question.hints]){
  for(const match of text.matchAll(/\$([^$]+)\$/g)){katex.renderToString(match[1],{throwOnError:true});formulas++;}
 }
}
for(const entry of data.entries){
 const pkg=entry.pkg,activities=pkg.activities,recheckIndex=activities.findIndex(activity=>activity.phase==='recheck');
 assert.equal(hashPackage(pkg),pkg.contentHash);assert.equal(validateLessonPackage(pkg).ok,true);
 assert.equal(Object.entries(pkg.budget).filter(([key])=>key!=='slotMinutes').reduce((sum,[,value])=>sum+value,0),40);
 assert.ok(pkg.tasks.filter(task=>task.branch==='extension').every(task=>activities.findIndex(activity=>activity.id===task.activityId)>recheckIndex));
 for(const objective of pkg.objectives){
  assert.match(objective.code,/^r22-/);
  const rules=pkg.evidenceRules.filter(rule=>rule.objectiveIds.includes(objective.id)&&rule.countsForMastery&&rule.individual);
  assert.ok(new Set(rules.map(rule=>rule.taskId)).size>=2);
 }
 if(entry.mode==='game'){
  const expected=bank.concepts.filter(concept=>concept.introducedWeek<entry.week).map(concept=>concept.conceptId).sort();
  assert.deepEqual([...entry.cumulativeScope.eligibleConceptIds].sort(),expected);
  assert.equal(entry.cumulativeScope.bankQuestionCount,expected.length*4);
  assert.ok(entry.conceptIds.every(id=>expected.includes(id)));
 }
 const state=createLessonSession({package:pkg,sessionId:'review',hostId:'teacher',learners:[{id:'student'}],now:1});
 for(let index=0;index<activities.length;index++){
  state.timeline.activityIndex=index;state.timeline.currentActivityId=activities[index].id;state.timeline.currentPhase=activities[index].phase;
  for(const view of [serializeForStudent(state,'student'),serializeForPresenter(state)]){
   assert.ok(!/workedSolution|answerKey|Lời giải đối soát:|teacher_review_required/.test(JSON.stringify(view)));views++;
  }
 }
}
const tasks=period=>data.entries.find(entry=>entry.period===period).pkg.tasks;
assert.ok(tasks(22).filter(task=>task.type!=='reflection').every(task=>task.prompt.includes('\\sin')&&task.prompt.includes('\\cos')));
assert.ok(tasks(110).filter(task=>['task-4-1','task-6-1'].includes(task.id)).every(task=>/\\sqrt\[n\]/.test(task.prompt)&&task.prompt.includes('n chẵn')&&task.prompt.includes('n lẻ')));
assert.ok(tasks(111).filter(task=>['task-4-1','task-6-1'].includes(task.id)).every(task=>task.prompt.includes('\\sqrt2')&&task.prompt.includes('r_j')));
assert.ok(!data.entries.some(entry=>entry.pkg.tasks.some(task=>/x\^1\d/.test(task.prompt))));
assert.ok(bank.concepts.find(concept=>concept.conceptId==='linePlaneProperty').questions.at(-1).prompt.includes('khác S và A'));
for(const exam of data.exams){
 const parsed=parseExamLines(readFileSync(new URL(exam.files.questionText,root),'utf8').split(/\r?\n/).map(text=>({text})));
 assert.equal(parsed.questions.length,10);assert.equal(parsed.durationMin,80);
 assert.equal(parsed.questions.reduce((sum,question)=>sum+question.points,0),10);assert.ok(parsed.questions.every(question=>question.type==='essay'));
}
assert.equal(ppct.lessons.length,137);
assert.ok(ppct.lessons.every(period=>Number(data.entries.some(entry=>entry.sourcePeriodId===period.id))+Number(data.exams.some(exam=>exam.sourcePeriodIds.includes(period.id)))===1));
console.log(JSON.stringify({packages:data.entries.length,periods:137,games:data.entries.filter(entry=>entry.mode==='game').length,bankConcepts:bank.concepts.length,bankQuestions:bank.concepts.reduce((sum,concept)=>sum+concept.questions.length,0),bankFormulaChecks:formulas,privacyViews:views,exams:data.exams.length,result:'PASS'}));
