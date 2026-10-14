import assert from 'node:assert/strict';
import test from 'node:test';
import katex from 'katex';
import {createCampaign,campaignPublic,mathQuestion,numericAnswer,TOPICS,THEMES} from '../lib/campaign.js';

test('public campaign metadata never exposes configured learner roster', () => {
  const cfg = createCampaign({grade: 10, topics: ['sets'], roster: ['Alice', 'Bình'], rule: 'duel', participation: 'pairs'}, 7);
  const view = campaignPublic({...cfg, rule: 'duel', participation: 'pairs', roster: ['Alice', 'Bình']});
  assert.equal('roster' in view, false);
  assert.equal(view.rule, 'duel');
});
import {stationLogic} from '../lib/station-logic.js';
import {safePuzzle,checkPuzzle} from '../lib/challenges.js';
import {initRace,roll,finishStation,advanceMath,racePublic} from '../lib/race.js';
assert.equal(TOPICS.length,44);assert.equal(Object.keys(THEMES).length,12);
assert.throws(()=>createCampaign({grade:10,topics:['integral']}));assert.throws(()=>createCampaign({topics:[]}));assert.throws(()=>createCampaign({minLevel:3,maxLevel:2}));assert.throws(()=>createCampaign({stationMax:9}));
assert(numericAnswer('2/3',2/3));assert(numericAnswer('0,5',.5));assert(!numericAnswer('1/0',1));assert(!numericAnswer('1+1',2));assert(!numericAnswer('',0));
let total=0;
for(const topic of TOPICS)for(let l=0;l<5;l++)for(let seed=0;seed<100;seed++){
 let p=mathQuestion(topic.id,l,seed*997);assert(Number.isFinite(p.answer),topic.id);assert(numericAnswer(String(p.answer),p.answer));assert(!numericAnswer(String(p.answer+1),p.answer));
 for(const text of [p.question,...p.steps])for(const m of text.matchAll(/\\\(([\s\S]*?)\\\)/g))katex.renderToString(m[1],{throwOnError:true,strict:'ignore'});
 assert(p.points===40+l*20);total++;
}
for(let seed=0;seed<120;seed++)for(let i=0;i<5;i++)for(let l=0;l<5;l++){
 let p=stationLogic(i,l,seed),input={...p.expected};if(i===2)input.circuit='1,0,0,0,0,0,0,0,1';assert(checkPuzzle(p,input),`${seed}/${i}/${l}`);assert(!checkPuzzle(p,{...input,digit:-1,channel:-1}));let safe=safePuzzle(p);assert(!('expected'in safe));assert(!('digit'in safe));
 if(i===1){let order=input.order;assert.equal(new Set(order).size,p.widget.letters.length);for(const line of p.question.filter(x=>x.includes('phải thực hiện trước'))){let [a,b]=line.match(/[A-E]/g);assert(order.indexOf(a)<order.indexOf(b));}}
}
let journeys=0;
for(let seed=0;seed<600;seed++){
 let cfg=createCampaign({grade:10,topics:['sets','quadratic','vectors'],stationMax:2},seed),s={seed:seed*977,id:'test',status:'active',solved:[],events:[],score:0,penalty:0,cooldown:0,drafts:{},campaign:cfg};initRace(s);finishStation(s,1,0);let math=[],skips=0;
 while(s.race.outcomes.length<5){if(s.race.bonus&&!s.race.bonus.done){math.push(s.race.bonus.serial);s.race.bonus.done=true;advanceMath(s);continue;}if(s.race.phase==='challenge'){finishStation(s,1,0);continue;}roll(s,0);if(++skips>50)throw Error('Journey stuck');}
 assert.equal(math.length,5);assert.equal(new Set(math).size,5);assert.equal(s.race.mathVisited.length,4);assert.equal(s.race.encounters.length,6);assert(!('seed'in campaignPublic(cfg)));let pub=racePublic(s);assert(!('bonusQueue'in pub));if(pub.bonus){assert(!('answer'in pub.bonus));assert(!('steps'in pub.bonus));}journeys++;
}
console.log(`Campaign checks passed: ${total} rendered Math templates; 3,000 logic variants; ${journeys} journeys with 5 queued Math questions and 6 balanced events.`);
const {contextQuestion,checkContext,CATEGORIES,FORMATS}=await import('../lib/context-questions.js');
let contextCases=0,hit=[0,0,0];
for(const category of CATEGORIES)for(const format of FORMATS)for(let level=0;level<5;level++)for(let seed=0;seed<30;seed++){
 let q=contextQuestion({topic:'quadratic',level,category:category.id,format:format.id},seed*13+7);let raw=q.answer;assert(format.id==='short'?numericAnswer(String(raw),q.answer):checkContext(q,raw));if(format.id==='tf'){assert.equal(q.statements.length,4);assert.equal(q.maxAttempts,1);}if(format.id==='mcq'){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.equal(q.maxAttempts,1);}for(const text of [q.question,...q.steps])for(const m of text.matchAll(/\\\(([\s\S]*?)\\\)/g))katex.renderToString(m[1],{throwOnError:true,strict:'ignore'});contextCases++;
}
for(let seed=0;seed<9000;seed++){let s={seed,id:'fair',status:'active',solved:[],events:[],score:0,penalty:0,cooldown:0,campaign:createCampaign({},seed),drafts:{}};initRace(s);assert.equal(s.race.stationSchedule.filter(Boolean).length,2);s.race.stationSchedule.forEach((x,i)=>hit[i]+=Number(x));assert(!('stationSchedule'in racePublic(s)));}
for(let value of hit)assert(Math.abs(value/9000-2/3)<.025,JSON.stringify(hit));
console.log(`Cross-context checks passed: ${contextCases} question/format cases; 9,000 station decks with exactly 2 encounters; marginal counts ${hit}.`);

// Every contextual variant must retain the selected mathematical topic and its computation.
for(const topic of TOPICS)for(const category of CATEGORIES)for(let level=0;level<5;level++){
 let base=mathQuestion(topic.id,level,81),q=contextQuestion({topic:topic.id,level,category:category.id,format:'short'},81);
 assert.equal(q.topic,topic.id);assert.equal(q.topicName,topic.name);assert.equal(q.answer,base.answer);assert(q.question.includes(base.question));
}
const mixed=createCampaign({grade:0,topics:['sets','integral','derivative'],categories:['global']},91);
assert(mixed.plan.every(p=>mixed.topics.includes(p.topic)&&p.category==='global'));
console.log('All 840 topic/context/level combinations preserve the selected Math content; mixed grade 10–12 configuration passed.');
