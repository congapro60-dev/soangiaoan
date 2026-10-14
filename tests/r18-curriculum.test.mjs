import assert from 'node:assert/strict';
import test from 'node:test';
import katex from 'katex';
import {TOPICS,createCampaign,mathQuestion,numericAnswer,MATH_POINTS,COMMUNITY_MODES} from '../lib/campaign.js';
import {EXTRA_TOPICS} from '../lib/curriculum-coverage.js';
import {contextQuestion,checkContext,CATEGORIES,FORMATS} from '../lib/context-questions.js';
import {curriculumPlan,issueChallenge,verifyChallenge,publicChallenge} from '../lib/mode-engine/challenge.js';
const close=(actual,expected,tolerance=1e-7)=>assert(Math.abs(actual-expected)<tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const render=text=>{assert(!text.includes('undefined'));for(const match of text.matchAll(/\\\(([\s\S]*?)\\\)/g))katex.renderToString(match[1],{throwOnError:true,strict:'ignore'});};
test('R18 curriculum exposes actual supported forms and provenance, separate from game rewards',()=>{
 assert.equal(TOPICS.length,44);assert.equal(EXTRA_TOPICS.length,23);assert.equal(new Set(TOPICS.map(t=>t.id)).size,44);
 assert.deepEqual([10,11,12].map(grade=>TOPICS.filter(t=>t.grade===grade).length),[15,15,14]);
 for(const topic of TOPICS){assert(topic.chapter&&topic.lesson&&topic.objective&&topic.scope);assert(topic.forms.length);assert.deepEqual(topic.formats,['short','mcq','tf']);assert.equal(topic.source.sheet,`G${topic.grade}`);assert.equal(topic.source.kind,'adapted');assert(topic.source.note.includes('chưa phủ toàn bộ'));assert.equal('loId' in topic,false);}
 for(const topic of TOPICS)for(let level=0;level<5;level++)for(let seed=0;seed<20;seed++){
  const q=mathQuestion(topic.id,level,seed*997);assert(Number.isFinite(q.answer),topic.id);assert(numericAnswer(String(q.answer),q.answer));assert(!numericAnswer(String(q.answer+1),q.answer));
  assert.equal(q.points,MATH_POINTS[level]);assert(['Thông hiểu','Vận dụng'].includes(q.cognitiveLevel));assert(q.steps.length>=2);render(q.question);q.steps.forEach(render);
 }
});
test('R18 independently worked examples for every added subject',()=>{
 // Seed 0 gives coefficients 2,3,5. Answers below are solved independently, including endpoint conventions.
 const examples={quadratic_sign:2,quadratic_roots:4,line_equation:-3,circle_equation:16,ellipse:16,binomial:96,descriptive_quantiles:14,geometric_sequences:16,sequence_formula:32,trig_equations:5,continuity:4,exponential_growth:212.18,space_parallel:2,space_perpendicular:4/13,grouped_median11:41/3,monotonicity:3,asymptotes:2,antiderivative:7,area_integral:8,integral_exponential:6,integral_trig:4,line_oxyz:9,grouped_quartiles:20/3};
 assert.equal(Object.keys(examples).length,EXTRA_TOPICS.length);
 for(const [topic,expected] of Object.entries(examples))close(mathQuestion(topic,0,0).answer,expected);
 close(mathQuestion('geometric_sequences',4,0).answer,-170); // 2−4+8−16+32−64+128−256
 close(mathQuestion('integral_trig',4,0).answer,1); // I=pi, answer requested I/pi
 close(mathQuestion('area_integral',4,0).answer,72); // area between y=2x² and y=12x over [0,6]
 close(mathQuestion('ellipse',4,0).answer,144*36/25);
 close(mathQuestion('monotonicity',4,0).answer,6); // roots 2 and 9, strict derivative negative excludes endpoints
 close(mathQuestion('asymptotes',4,0).answer,13); // (2x²+3x+1)/(x−5), quotient 2x+13
 close(mathQuestion('antiderivative',4,0).answer,147); // F(x)=2x³/3+3, F(6)=147
 close(mathQuestion('line_oxyz',4,0).answer,35); // x+y+z=70, t=6, z=5+5t
});
test('R18 new templates satisfy independent geometric, polynomial and numerical checks',()=>{
 for(let seed=0;seed<20;seed++)for(let level=0;level<5;level++){
  let q=mathQuestion('quadratic_roots',level,seed),[A,D]=q.question.match(/\\sqrt\{(\d+)x\+(\d+)\}/).slice(1).map(Number);assert(q.answer>=0);close(q.answer,Math.sqrt(A*q.answer+D));
  q=mathQuestion('quadratic_sign',level,seed);const [left,right]=q.question.match(/x\\in\[(\d+);(\d+)\]/).slice(1).map(Number),[r,s]=q.question.match(/\(x-(\d+)\)\(x-(\d+)\)/).slice(1).map(Number),nonnegative=q.question.includes('\\ge0');let count=0;for(let x=left;x<=right;x++)if(nonnegative?(x-r)*(x-s)>=0:(x-r)*(x-s)<0)count++;assert.equal(q.answer,count);
  q=mathQuestion('binomial',level,seed);const [a,b,n]=q.question.match(/\((\d+)\+(\d+)x\)\^\{(\d+)\}/).slice(1).map(Number),p=Number(q.question.match(/hệ số của \\\(x\^\{(\d+)\}/)[1]);let polynomial=[1];for(let i=0;i<n;i++){let next=Array(polynomial.length+1).fill(0);polynomial.forEach((coefficient,j)=>{next[j]+=a*coefficient;next[j+1]+=b*coefficient;});polynomial=next;}assert.equal(q.answer,polynomial[p]);
  q=mathQuestion('geometric_sequences',level,seed);const [first,ratio]=q.question.match(/u_1=(\d+),\\ q=(-?\d+)/).slice(1).map(Number),index=Number([...q.question.matchAll(/[uS]_\{?(\d+)\}?/g)].at(-1)[1]),sequence=Array.from({length:index},(_,i)=>first*ratio**i);assert.equal(q.answer,level>=2?sequence.reduce((sum,v)=>sum+v,0):sequence.at(-1));
  q=mathQuestion('exponential_growth',level,seed);const [,initial,percent,years]=q.question.match(/vốn (\d+) đơn vị tăng (\d+)%[\s\S]*Sau (\d+) năm/);let amount=Number(initial);for(let i=0;i<Number(years);i++)amount+=amount*Number(percent)/100;close(q.answer,amount);
  q=mathQuestion('area_integral',level,seed);const coeff=Number(q.question.match(/y=(\d+)x/)[1]),end=level+2;let area=0,N=1000;for(let i=0;i<N;i++){let x=(i+.5)*end/N;area+=(level>=2?coeff*end*x-coeff*x*x:2*coeff*x)*end/N;}close(q.answer,area,1e-6);
  for(const id of ['grouped_median11','grouped_quartiles']){
   q=mathQuestion(id,level,seed);const intervals=[...q.question.matchAll(/\[(\d+);(\d+)\)/g)].map(m=>m.slice(1).map(Number)),f=q.question.match(/tương ứng ([\d, ]+)\./)[1].split(',').map(Number),total=f.reduce((sum,v)=>sum+v,0);
   // Invert the piecewise-uniform cumulative distribution by binary search, independent of interpolation implementation.
   const quantile=fraction=>{let lo=intervals[0][0],hi=intervals.at(-1)[1];for(let iteration=0;iteration<60;iteration++){const x=(lo+hi)/2,mass=f.reduce((sum,n,i)=>sum+n*Math.min(1,Math.max(0,(x-intervals[i][0])/(intervals[i][1]-intervals[i][0]))),0);if(mass/total<fraction)lo=x;else hi=x;}return (lo+hi)/2;};
   close(q.answer,id==='grouped_median11'?quantile(.5):quantile(.75)-quantile(.25));
  }
 }
});
test('R18 all topics work in each context and format without undefined prose or duplicate choices',()=>{
 for(const topic of TOPICS)for(let level=0;level<5;level++)for(const category of CATEGORIES)for(const format of FORMATS){
  const base=mathQuestion(topic.id,level,991),q=contextQuestion({topic:topic.id,level,category:category.id,format:format.id},991);assert(q.question.includes(base.question));assert(!q.question.includes('undefined'));assert.equal(q.topic,topic.id);
  if(format.id==='short')assert.equal(q.answer,base.answer);
  if(format.id==='mcq'){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);close(Number(q.options[Number(q.answer)]),base.answer);assert.equal(q.options.filter((_,i)=>checkContext(q,String(i))).length,1);}
  if(format.id==='tf'){assert.equal(q.statements.length,4);assert(checkContext(q,q.answer));assert(!checkContext(q,q.answer.replace(/D/g,'X')));assert.equal(q.answer.split('').filter(c=>c==='D').length,2);}
 }
});
test('R18 selected new topic reaches seeded campaign and all nine mode challenge paths',()=>{
 for(const topic of EXTRA_TOPICS){
  const input={grade:topic.grade,topics:[topic.id],minLevel:4,maxLevel:4,categories:['digital'],formats:['mcq']},curriculum=curriculumPlan(input,719);assert(curriculum.plan.every(plan=>plan.topic===topic.id));assert.deepEqual(createCampaign(input,719),createCampaign(input,719));
  for(const rule of ['campaign','duel','zones','survival','escort','treasure','relay','lockdown','merchant']){
   const action={type:rule},challenge=issueChallenge({seed:719,serial:1,unitId:'unit-1',action,gameNow:0,context:rule,round:1,curriculum});assert.equal(challenge.topic,topic.id);assert(verifyChallenge(challenge,{unitId:'unit-1',action,answer:challenge.answer,gameNow:1,context:rule,round:1}));assert.equal('answer' in publicChallenge(challenge),false);assert.equal('steps' in publicChallenge(challenge),false);
  }
 }
 for(const community of COMMUNITY_MODES){const cfg=createCampaign({grade:10,community,theme:community==='arena'?'historical':'modern'},41);if(!['none','arena'].includes(community)){assert.equal(cfg.communityCell,18);assert(!cfg.cells.includes(18));}}
});
test('R18 rejects untrusted topic, grade, level, seed, context and format',()=>{
 for(const args of [['no-topic',0,0],['ellipse',-1,0],['ellipse',5,0],['ellipse',1.5,0],['ellipse',0,NaN],['ellipse',0,Infinity]])assert.throws(()=>mathQuestion(...args));
 for(const input of [null,[],{topics:'ellipse'},{categories:'digital'},{formats:'mcq'},{grade:11,topics:['ellipse']},{grade:12,topics:['line_equation']},{topics:['__proto__']},{minLevel:2,maxLevel:1}])assert.throws(()=>createCampaign(input,1));
 for(const plan of [null,[],{topic:'ellipse',level:0,category:'oops'},{topic:'ellipse',level:0,format:'oops'},{topic:'ellipse',level:0,format:''}])assert.throws(()=>contextQuestion(plan,1));
});
