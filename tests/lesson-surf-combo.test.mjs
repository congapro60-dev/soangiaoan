import test from 'node:test';
import assert from 'node:assert/strict';
import {startClassEvent,answerClassEvent,classEventView} from '../lib/lesson/class-events.js';
const teacher={role:'teacher',id:'teacher'};
function fixture(){return{id:'session',hostId:'teacher',status:'active',seed:1,round:1,timeline:{activityIndex:0,locked:false},clock:{},roster:{p:{id:'p',present:true}},branches:{practice:{p:'core'}},package:{budget:{reserveMinutes:5},activities:[{id:'practice',phase:'practice',taskIds:['a','b','c']}],tasks:['a','b','c'].map(id=>({id,type:'closed',branch:'shared',prompt:'Tính 2 + 3.',evaluation:{checkerId:'numeric_exact',answerKey:5}}))}};}
const start=()=>startClassEvent(fixture(),{type:'surf',seed:1,durationMs:180000},teacher,1000);
function answer(event,value,requestId,now=2000){return answerClassEvent(event,{learnerId:'p',step:event.participants.p.step,answer:value,requestId},now);}
test('new surf events award10,20,30 combo points for consecutive correct answers; replay never grows combo',()=>{
 let event=start();assert.equal(event.comboVersion,1);event=answer(event,5,'a');assert.equal(event.participants.p.score,10);event=answer(event,5,'b',2001);assert.equal(event.participants.p.score,30);
 const replay=answerClassEvent(event,{learnerId:'p',step:1,answer:5,requestId:'b'},2002);assert.equal(replay.lastResult.replay,true);assert.equal(replay.participants.p.score,30);assert.equal(replay.participants.p.streak,2);
 event=answer(event,5,'c',2002);assert.equal(event.participants.p.score,60);assert.equal(classEventView(event,'p',2003).own.combo,3);
 assert.equal(classEventView(event,null,2003,{presenter:true}).own,null);assert.equal(JSON.stringify(event).includes('passport'),false);
});
test('wrong surf answer resets combo; legacy persisted events preserve ten points each',()=>{
 let event=start();event=answer(event,5,'a');event=answer(event,4,'b',2001);assert.equal(event.participants.p.streak,0);assert.throws(()=>answer(event,5,'early',2002),/EVENT_ANSWER_COOLDOWN/);event=answer(event,5,'c',12001);assert.equal(event.participants.p.score,20);assert.equal(classEventView(event,'p',12002).own.combo,1);
 let legacy=start();delete legacy.comboVersion;legacy=answer(legacy,5,'a');legacy=answer(legacy,5,'b',2001);assert.equal(legacy.participants.p.score,20);assert.equal(classEventView(legacy,'p',2002).own.combo,undefined);
});
