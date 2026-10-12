import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startClassEvent,classEventView,answerClassEvent} from '../lib/lesson/class-events.js';
import {createLessonSession,reduceLessonSession} from '../lib/lesson/runtime.js';
const teacher={role:'teacher',id:'teacher'};
function fixture(){return{id:'duel',hostId:'teacher',status:'active',seed:1,round:1,timeline:{activityIndex:0,locked:false},clock:{},roster:Object.fromEntries(['a','b','c','d'].map(id=>[id,{id,present:true}])),branches:{act:{}},package:{budget:{reserveMinutes:5},activities:[{id:'act',phase:'practice',taskIds:['q']}],tasks:[{id:'q',type:'closed',branch:'shared',prompt:'Own question',evaluation:{checkerId:'numeric_exact',answerKey:5}}]}};}
test('server-owned device pairs are exact/disjoint, remaining pupils randomly pair; own relation excludes peer work',()=>{
 const event=startClassEvent(fixture(),{type:'duel',seed:1,durationMs:180000}, {...teacher,duelDevicePairs:[['a','c']]},1000);
 assert.equal(event.duelPairingVersion,1);assert.equal(event.participants.a.opponent,'c');assert.equal(event.participants.c.opponent,'a');assert.equal(event.participants.b.opponent,'d');
 const own=classEventView(event,'a',1000);assert.equal(own.own.opponentId,'c');assert.equal(own.own.sharedDuel,true);assert.equal(classEventView(event,'b',1000).own.sharedDuel,false);
 assert.equal(classEventView(event,null,1000,{presenter:true}).own,null);assert.equal(JSON.stringify(own).includes('answerKey'),false);assert.equal(JSON.stringify(own).includes('participants'),false);
 const left=answerClassEvent(event,{learnerId:'a',step:0,answer:5,requestId:'left'},2000),both=answerClassEvent(left,{learnerId:'c',step:0,answer:5,requestId:'right'},2001);assert.equal(both.participants.a.score,10);assert.equal(both.participants.c.score,10);
 for(const pairs of [[['a','a']],[['a','b'],['a','c']],[['a','missing']],[['a','b','c']],['a'],[,['a','b']],[[,'b']],null])assert.throws(()=>startClassEvent(fixture(),{type:'duel',seed:1,durationMs:180000},{...teacher,duelDevicePairs:pairs},1000),/INVALID_EVENT_PAIRS/);
 const absent=fixture();absent.roster.c.present=false;assert.throws(()=>startClassEvent(absent,{type:'duel',seed:1,durationMs:180000},{...teacher,duelDevicePairs:[['a','c']]},1000),/INVALID_EVENT_PAIRS/);
 const empty=startClassEvent(fixture(),{type:'duel',seed:1,durationMs:180000},{...teacher,duelDevicePairs:[]},1000);assert.equal(classEventView(empty,'a',1000).own.sharedDuel,false);
 const legacy=startClassEvent(fixture(),{type:'duel',seed:1,durationMs:180000},teacher,1000);assert.equal(legacy.duelPairingVersion,undefined);assert.equal(classEventView(legacy,'a',1000).own.sharedDuel,false);
});
test('only trusted actor pairing reaches runtime; public payload cannot bind or spoof device pairs',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url)));let state=createLessonSession({package:pkg,hostId:'teacher',sessionId:'trusted-pairs',learners:['a','b','c','d'].map(id=>({id,name:id})),now:1000}),seq=0;
 const send=(type,payload={},actor=teacher)=>{const result=reduceLessonSession(state,{type,payload,eventId:'e'+(++seq),activityId:state.timeline.currentActivityId,round:state.round,revision:state.revision},{actor,now:state.clock.lastNow+1});if(result.result.ok)state=result.state;return result.result;};
 send('START');while(state.timeline.currentActivityId!=='act-prac')send('NEXT');state.package.budget.reserveMinutes=3;
 assert.equal(send('CLASS_EVENT_OPEN',{type:'duel',durationMs:180000,duelDevicePairs:[['a','c']]}).code,'INVALID_EVENT');assert.equal(send('CLASS_EVENT_OPEN',{type:'duel',durationMs:180000}, {...teacher,duelDevicePairs:[['a','c']]}).ok,true);assert.equal(state.classEvent.participants.a.opponent,'c');
});
