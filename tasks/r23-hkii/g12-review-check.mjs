import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import katex from 'katex';
import {skills,firstPeriod} from '../../scripts/content/build-hkii-g12.mjs';
import {hashPackage} from '../../lib/lesson/schema.js';
import {validateLessonPackage} from '../../lib/lesson/validate.js';

const root=new URL('../../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const manifest=read('content/lessons/hkii-2026-g12.json');
const ppct=read('tasks/r23-hkii/ppct-hkii.json').grades.find(g=>g.grade===12);
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-7,message+`: ${actual} / ${expected}`);
const sum=a=>a.reduce((x,y)=>x+y,0);
const scalar=(x)=>String(x).match(/[-+]?\d+(?:\.\d+)?/g)?.map(Number)||[];
function area(f,a,b){const n=200,h=(b-a)/n;return h/3*(f(a)+f(b)+sum(Array.from({length:n-1},(_,i)=>(i%2?2:4)*f(a+(i+1)*h))));}
function table(a,b,c,d,event,condition=()=>true){const rows=[];for(const[count,row]of[[a,[1,1]],[b,[1,0]],[c,[0,1]],[d,[0,0]]])for(let i=0;i<count;i++)rows.push(row);const given=rows.filter(condition);return given.filter(event).length/given.length;}
function draws(r,b,mixed){let good=0,total=0;for(let x=0;x<r+b;x++)for(let y=0;y<r+b;y++)if(x!==y){total++;if(mixed?(x<r)!==(y<r):x<r&&y<r)good++;}return good/total;}
function boxes(a,b,c,d,posterior){let all=0,red=0,fromFirst=0;for(let box=0;box<2;box++)for(let x=0;x<a+b;x++)for(let y=0;y<c+d;y++){all++;if(box===0?x<a:y<c){red++;if(box===0)fromFirst++;}}return posterior?fromFirst/red:red/all;}
const numericOracle={
  extremaCalc:s=>{const x=s%4+1;return x**3-3*x*x*x+s%6;},
  vectorSum:s=>(s%4+2)**2+(s%3+3)**2,
  maxTable:s=>Math.max(s%4+2,s%4+5,-1),
  maxClosed:s=>{const a=s%4+1,b=s%5+2;return Math.max(...[-1,a,a+2].map(x=>x*x-2*a*x+b));},
  vectorScale:s=>Math.hypot(-(s%3+2)*(s%4+2),0,0),
  dotGeo:s=>2*(s%3+1)*(s%4+2)*Math.cos((s%2?60:120)*Math.PI/180),
  dotCoord:s=>{const u=[s%4+1,-2,3],v=[2,s%3+1,-1];return (sum(u.map((x,i)=>(x+v[i])**2))-sum(u.map(x=>x*x))-sum(v.map(x=>x*x)))/2;},
  angleCoord:s=>{const a=s%4+1;return a*a/(Math.hypot(a,a)*Math.hypot(a,a));},
  groupRange:s=>{const l=s%5*10,h=s%3+2;return l+3*h-l;},
  quartile:s=>{const h=4*(s%3+1),l=s%11*10;function percentile(p){let before=0;for(const[i,f]of[4,8,8].entries()){if(before+f>=p)return l+i*h+(p-before)*h/f;before+=f;}}return percentile(15)-percentile(5);},
  primitiveCondition:s=>area(x=>2*(s%4+1)*x,0,1)+s%5+1,
  curvedArea:s=>(s%3+1)*((s%4+1)*(s%3+1))/2,
  definite:s=>area(x=>2*(s%4+1)*x+s%4,0,s%3+1),
  integralLinearity:s=>area(()=>((s%3+2)*(s%5+2)-2*(s%4+1))/2,0,2),
  integralIntervals:s=>-area(()=>s%5+2,0,1)-area(()=>(s%4+1)/2,1,3),
  integralPoly:s=>area(x=>3*(s%3+1)*x*x+2,0,s%3+1),
  areaPositive:s=>area(x=>3*(s%3+1)*x*x,0,s%3+1),
  areaSign:s=>{const c=s%3+1,d=s%2+1;return area(x=>c-x,0,c)+area(x=>x-c,c,c+d);},
  areaTwo:s=>area(x=>(s%4+1)*x-x*x,0,s%4+1),
  volumeSlice:s=>area(x=>3*(s%3+1)*x*x,0,s%3+1),
  volumeRotate:s=>area(x=>((s%3+1)*x)**2,0,s%3+1),
  condSpace:s=>table(3+s%7,4+s%9,2+s%5,5+s%6,r=>r[1],r=>r[0]),
  condTable:s=>table(8+s%9,3+s%7,4+s%8,6+s%5,r=>r[0],r=>r[1]),
  condComplement:s=>table(3+s%6,7+s%9,4,3,r=>!r[1],r=>r[0]),
  multiply:s=>draws(3+s%7,4+s%6,false),multiplyMixed:s=>draws(3+s%6,5+s%8,true),
  totalRule:s=>table(3+s%6,4+s%7,2+s%5,6+s%8,r=>r[1]),
  totalTree:s=>boxes(2+s%5,3+s%6,4+s%7,2+s%4,false),
  bayes:s=>table(4+s%8,6+s%7,2+s%5,7+s%9,r=>r[0],r=>r[1]),
  bayesBox:s=>boxes(2+s%5,3+s%6,4+s%7,2+s%4,true),
  planePoint:s=>-dot([2,-1,3],[1+s%5,2+s%6,3+s%7]),
  planeThree:s=>{const a=2+s%6,b=3+s%7,c=4+s%8;return -dot([b*c,a*c,a*b],[0,b,0]);},
  planeFromSpan:s=>-dot([2,-2,1],[1+s%7,2+s%6,2]),
  planePerp:s=>-(2*(2+s%7)-3*(3+s%6)),
  planeDistance:s=>{const M=[1+s%7,2+s%8,3+s%5],k=(dot([3,4,0],M)-(s%5+1))/25;const foot=M.map((x,i)=>x-[3,4,0][i]*k);return Math.hypot(...M.map((x,i)=>x-foot[i]));},
  lineTwoPoints:s=>{const A=[1+s%6,2+s%7,3],B=A.map((x,i)=>x+[2,-3,4][i]);return sum(B.map((x,i)=>2*x-A[i]));},
  linePerp:s=>-(3*(2+s%8)-2*(3+s%7)),
  linePlane:s=>{const t=1+s%8,a=1+s%6,b=2+s%7,D=-(2*(a+t)-(b+2*t)+(1+3*t));return -(2*a-b+1+D)/3;},
  lineReal:s=>{const height=4+3*(2+s%6);return (height-4)/3;},
  angleLines:s=>{const a=1+s%7,u=[1,a,0],v=[1,0,a];return (dot(u,v)/Math.hypot(...u)/Math.hypot(...v))**2;},
  angleLinePlane:s=>{const a=1+s%7,b=2+s%6;const angle=Math.atan2(3,Math.hypot(a,b));return Math.sin(angle)**2;},
  anglePlanes:s=>{const a=1+s%7,u=[1,a,1],v=[1,0,-1-a];return (dot(u,v)/Math.hypot(...u)/Math.hypot(...v))**2;},
  sphereRead:s=>(2+s%8)**2,
  spherePoint:s=>Math.hypot(2+s%5,-3,1+s%4)**2,
  sphereTangent:s=>{const x=2+s%7,y=3+s%6,k=(3*x+4*y-1)/25;return Math.hypot(3*k,4*k);},
  sequenceTerm:s=>{let n=3+s%8,v=1+s%5;while(n--)v+=2+s%7;return v;},
  arithmetic:s=>sum(Array.from({length:4+s%6},(_,i)=>2+s%7+i*(1+s%5))),
  geometric:s=>Array.from({length:2+s%5}).reduce(v=>v*(2+s%2),1+s%7),
  sequenceLimit:s=>{const n=1e15;return ((2+s%7)*n+1+s%6)/((3+s%5)*n+1);},
  expLog:s=>{let x=(2+s%3)**(2+s%7),k=0;while(x>1){x/=2+s%3;k++;}assert.equal(x,1);return k;},
  rational11:s=>s%3+2,
};
const expressions=new Set();
function inspect(value){if(typeof value==='string'){assert.doesNotMatch(value,/(?<!\\)\binfty\b|F_\{trước\}/u);for(const[,expr]of value.matchAll(/\$([^$]+)\$/g))expressions.add(expr);}else if(value&&typeof value==='object')Object.values(value).forEach(inspect);}
let numericCases=0,choiceCases=0,openCases=0;
for(const[key,spec]of Object.entries(skills))for(let seed=0;seed<120;seed++)for(const stage of ['precheck','recheck']){
  const q=spec.make(seed,stage);inspect(q);
  if(q.evaluation.checkerId==='numeric_exact'){assert.ok(numericOracle[key],`Missing independent oracle: ${key}`);near(q.evaluation.answerKey,numericOracle[key](seed),`${key} seed ${seed}`);numericCases++;}
  else if(q.evaluation.checkerId==='choice_exact'){
    const options=q.inputSchema.options;assert.equal(new Set(options.map(o=>o.label)).size,options.length);assert.equal(options.filter(o=>o.id===q.evaluation.answerKey).length,1);choiceCases++;
    const correct=options.find(o=>o.id===q.evaluation.answerKey).label;
    if(key==='normalCross'){const a=1+seed%6,b=2+seed%7,n=scalar(correct);assert.equal(dot(n,[1,a,0]),0);assert.equal(dot(n,[0,1,b]),0);}
    if(key==='lineSymmetric'){const p=scalar(correct),m=[1+seed%6,2+seed%7,3+seed%8];near((p[0]-m[0])/2,(p[1]-m[1])/-1,key);near((p[0]-m[0])/2,(p[2]-m[2])/3,key);}
    if(key==='planeParallel')assert.equal(correct,seed%2?'Hai mặt phẳng trùng nhau.':'Hai mặt phẳng song song phân biệt.');
    if(key==='linePosition')assert.equal(correct,seed%2?'Hai đường cắt nhau.':'Hai đường chéo nhau.');
    if(key==='expIneq')assert.equal(correct,`$x>${2+seed%9}$`);
    if(key==='logIneq')assert.equal(correct,`$${1+seed%8}<x<${1+seed%8+2**(2+seed%4)}$`);
  }else{assert.equal(q.type,'open');assert.ok(q.solution.length>30);assert.ok(q.evaluation.rubric.criteria.length>=2);assert.equal(q.evaluation.answerKey,undefined);openCases++;}
}
assert.equal(manifest.entries.length,152);assert.equal(manifest.exams.length,2);
assert.deepEqual(new Set(manifest.coverage.map(x=>x.sourcePeriodId)),new Set(ppct.lessons.map(x=>x.id)));
assert.equal(new Set(manifest.coverage.map(x=>x.sourcePeriodId)).size,156);
const gamePairs=new Set();
for(const entry of manifest.entries){
  const p=entry.pkg;assert.equal(p.status,'draft');assert.equal(p.contentHash,hashPackage(p));assert.equal(validateLessonPackage(p).ok,true);
  assert.equal(p.budget.slotMinutes,40);assert.equal(p.budget.coreMinutes+p.budget.reserveMinutes+p.budget.optionalMinutes+p.budget.transitionMinutes,40);
  for(const objective of p.objectives){
    assert.match(objective.code,/^r23-/);
    const tasks=p.tasks.filter(t=>t.objectiveIds.includes(objective.id));
    const recheck=tasks.find(t=>p.evidenceRules.some(e=>e.taskId===t.id&&e.kind==='individual_recheck'));
    const exit=tasks.find(t=>p.evidenceRules.some(e=>e.taskId===t.id&&e.kind==='exit'));
    for(const t of [recheck,exit]){assert.ok(t);assert.equal(t.participation,'individual');assert.ok(p.evidenceRules.some(e=>e.taskId===t.id&&e.countsForMastery));for(const other of p.tasks.filter(x=>x.id!==t.id))assert.ok(!other.prompt.startsWith(t.prompt),`${p.id}: assessment reused`);}
    for(const branch of ['support','core','extension'])assert.ok(tasks.some(t=>t.branch===branch));
  }
  const recheckIndex=p.activities.findIndex(a=>a.phase==='recheck');
  for(const task of p.tasks.filter(t=>t.branch==='extension'))assert.ok(p.activities.findIndex(a=>a.id===task.activityId)>recheckIndex);
  for(const task of p.tasks.filter(t=>t.branch==='support')){const hints=task.hintIds.map(id=>p.hints.find(h=>h.id===id));assert.deepEqual(hints.map(h=>h.tier),['H1','H2','H3','H4']);assert.ok(hints.every(h=>h.notAnswer&&h.text.trim()));}
  if(entry.kind==='elective'){
    assert.equal(entry.cumulativeScope.rule,'previous_weeks_only');assert.ok(entry.conceptIds.length>=2);assert.equal(new Set(entry.conceptIds).size,entry.conceptIds.length);
    assert.ok(entry.conceptIds.some(key=>firstPeriod[key].week<=18));
    for(const key of entry.conceptIds)assert.ok(firstPeriod[key].week<entry.week);
    gamePairs.add(entry.conceptIds.join('|'));
  }
}
assert.equal(gamePairs.size,39);
inspect(manifest);inspect(read('tasks/r23-hkii/g12-solutions.json'));inspect(read('tasks/r23-hkii/g12-practice-bank.json'));
let fractionChoices=0;
for(const ref of manifest.exams){
  const exam=read(ref.files.normalizedExam);assert.equal(ref.minutes,80);assert.equal(ref.sourcePeriodIds.length,2);assert.equal(sum(exam.questions.map(q=>q.points)),10);assert.equal(exam.questions.length,12);inspect(exam);
  for(const[qIndex,q]of exam.questions.entries())if(q.type==='mc'){
    const original=skills[ref.conceptIds[qIndex]].make(1000+qIndex*31,'exam');
    if(original.evaluation.checkerId==='numeric_exact'){
      const label=q.choiceText[q.key],fraction=label.match(/^\$\\frac\{(-?\d+)\}\{(\d+)\}\$$/);
      const actual=fraction?Number(fraction[1])/Number(fraction[2]):Number(label.replaceAll('$',''));
      near(actual,original.evaluation.answerKey,`${ref.id} MC ${qIndex+1}`);
      if(fraction)fractionChoices++;
      if(!Number.isInteger(original.evaluation.answerKey))assert.ok(fraction,'Noninteger exam choices must preserve exact fractions, not rounded decimals.');
    }
  }
}
assert.ok(fractionChoices>=4,'Regression must exercise exact rational exam choices.');
for(const expression of expressions)assert.doesNotThrow(()=>katex.renderToString(expression,{throwOnError:true,strict:'error'}),expression);
const report={packages:152,sourcePeriods:156,games:39,distinctGamePairs:gamePairs.size,examSets:2,concepts:Object.keys(skills).length,seedCases:Object.keys(skills).length*240,numericCases,choiceCases,openCases,fractionChoices,distinctMath:expressions.size,checks:{numericOracles:'PASS',exactExamFractions:'PASS',sourceCoverage:'PASS',individualRecheckExit:'PASS',threeLanes:'PASS',supportH1H4:'PASS',strictKatex:'PASS',hashes:'PASS'},limitations:['Authored content remains draft and teacher_review_required.','Open proofs have worked solutions and rubric; automated checks do not certify pedagogical approval.','Source Unit I/II plans are older partial sources, not complete HKII objectives.','No browser, runtime change, full build, publication or classroom trial performed by this author.']};
writeFileSync(new URL('tasks/r23-hkii/g12-validation.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
