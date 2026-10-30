import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashPackage, CHECKER_REGISTRY } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';
import katex from 'katex';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const grade = read('tasks/r23-hkii/ppct-hkii.json').grades.find(row => row.grade === 11);
const data = read('content/lessons/hkii-2026-g11.json');
const bank = read('tasks/r23-hkii/g11-practice-bank.json');
const sourceText = readFileSync(new URL('scripts/content/build-hkii-g11.mjs', root),'utf8');
const sourceTree = ts.createSourceFile('author.mjs',sourceText,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function checkEscapes(node) {
  if(ts.isStringLiteral(node)) assert.equal(/(?<!\\)\\(?![\\'"bfnrtv0xu\r\n])/.test(node.getText(sourceTree)),false,`Use raw strings for LaTeX: ${node.getText(sourceTree)}`);
  ts.forEachChild(node,checkEscapes);
}
checkEscapes(sourceTree);
let mathFields=0;
function checkMath(value) {
  if(typeof value==='string') for(const match of value.matchAll(/\$([^$]+)\$/g)) {katex.renderToString(match[1],{throwOnError:true});mathFields++;}
  else if(Array.isArray(value))value.forEach(checkMath);
  else if(value&&typeof value==='object')Object.values(value).forEach(checkMath);
}
checkMath(bank);
assert.equal(bank.conceptCount,88);
assert.equal(bank.questionCount,704);
for(const concept of bank.concepts)assert.equal(new Set(concept.questions.map(row=>row.prompt)).size,8);
assert.equal(data.entries.length, 126);
assert.equal(data.exams.length, 2);
assert.equal(data.coverage.length, 130);
assert.deepEqual(new Set(data.coverage.map(row => row.sourcePeriodId)), new Set(grade.lessons.map(row => row.id)));
const periods = new Map([...grade.hki_prerequisites.lessons, ...grade.lessons].map(row => [row.id, row]));
let tasks = 0;
for (const entry of data.entries) {
  const pkg = entry.pkg;
  assert.equal(pkg.status, 'draft');
  assert.equal(pkg.contentHash, hashPackage(pkg), pkg.id);
  assert.equal(validateLessonPackage(pkg).ok, true, pkg.id);
  checkMath(pkg.tasks.map(task=>task.metadata?.workedSolution));
  assert.equal(pkg.budget.slotMinutes, 40);
  assert.equal(Object.entries(pkg.budget).filter(([key]) => key !== 'slotMinutes').reduce((sum, [, value]) => sum + value, 0), 40);
  const recheck = pkg.activities.findIndex(row => row.phase === 'recheck');
  const prompts = pkg.tasks.filter(row => row.type !== 'reflection').map(row => row.prompt);
  assert.equal(new Set(prompts).size, prompts.length, `${pkg.id}: distinct questions`);
  for (const task of pkg.tasks) {
    tasks++;
    if (task.branch === 'support') assert.equal(task.hintIds.length, 4, task.id);
    if (task.branch === 'extension') assert.ok(pkg.activities.findIndex(row => row.id === task.activityId) > recheck, task.id);
    if (task.type === 'closed') assert.equal(CHECKER_REGISTRY[task.evaluation.checkerId](task.evaluation.answerKey, task).ok, true, task.prompt);
    if (task.inputSchema?.options) assert.equal(new Set(task.inputSchema.options.map(row => row.label)).size, task.inputSchema.options.length, task.prompt);
  }
  for (const objective of pkg.objectives) {
    assert.match(objective.code, /^r23-/);
    const checks = pkg.evidenceRules.filter(row => row.objectiveIds.includes(objective.id) && row.countsForMastery);
    assert.deepEqual(new Set(checks.map(row => row.kind)), new Set(['individual_recheck', 'exit']));
    assert.equal(new Set(checks.map(row => row.taskId)).size, 2);
  }
  if (entry.kind === 'elective') {
    assert.ok(entry.conceptIds.length >= 2);
    assert.ok(entry.cumulativeScope.selectedSourcePeriodIds.every(id => periods.get(id).week < entry.week));
    assert.ok(entry.cumulativeScope.selectedSourcePeriodIds.some(id => periods.get(id).week <= 18));
    assert.ok(pkg.tasks.some(task=>task.type==='closed'&&['shared','core'].includes(task.branch)&&pkg.activities.some(activity=>activity.id===task.activityId&&activity.phase==='practice')),`${pkg.id}: auto-checkable game route`);
  }
}
for (const exam of data.exams) {
  assert.equal(exam.minutes, 80);
  assert.equal(exam.sourcePeriodIds.length, 2);
  const normalized = read(exam.files.normalizedExam);
  checkMath(normalized);
  assert.equal(normalized.durationMin, 80);
  assert.equal(normalized.questions.reduce((sum, row) => sum + row.points, 0), 10);
  assert.ok(normalized.questions.every(row => row.text && row.solution && (row.type !== 'essay' || row.rubric)));
}
// Coordinate oracles independently check the synthetic geometry used in proofs.
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
let geometryChecks=0,probabilityChecks=0;
for(let a=2;a<=8;a++)for(let b=2;b<=7;b++)for(let h=3;h<=8;h++) {
  const AB=[a,0,0],BC=[0,b,0],CC=[0,0,h],ADp=[0,b,h],normal=cross(BC,[-a,0,h]);
  near(dot(AB,BC),0);near(dot(CC,BC),0);near(dot(AB,ADp),0);
  near(Math.abs(dot([a,b,0],cross(AB,CC)))/length(cross(AB,CC)),b);
  near(length(cross(ADp,AB))/length(AB),Math.sqrt(b*b+h*h));
  near(Math.abs(dot([-a,0,0],normal))/length(normal),a*h/Math.sqrt(a*a+h*h));
  near(2*Math.abs(dot(AB,cross(BC,CC)))/6,a*b*h/3);
  geometryChecks+=7;
}
for(let total=10;total<=12;total++)for(let a=2;a<=6;a++)for(let b=3;b<=7;b++) {
  let both=0,any=0,one=0;
  for(let i=0;i<total;i++)for(let j=0;j<total;j++) {const x=i<a,y=j<b;both+=Number(x&&y);any+=Number(x||y);one+=Number(x!==y);}
  near(both/(total*total),a*b/(total*total));
  near(any/(total*total),1-(total-a)*(total-b)/(total*total));
  near(one/(total*total),(a*(total-b)+(total-a)*b)/(total*total));
  probabilityChecks+=3;
}
console.log(JSON.stringify({ grade: 11, lessons: data.entries.length, exams: data.exams.length, periodRows: data.coverage.length, tasks, mathematicalChecks: data.summary.numericChecks,geometryChecks,probabilityChecks,mathFields }));
