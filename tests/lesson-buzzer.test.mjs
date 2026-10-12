import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as events from '../lib/lesson/class-events.js';
import {createLessonSession,reduceLessonSession} from '../lib/lesson/runtime.js';
import {serializeForStudent} from '../lib/lesson/serialize.js';
const teacher={role:'teacher',id:'teacher'};
function source(){return{id:'room',hostId:'teacher',status:'active',seed:1,round:1,timeline:{activityIndex:0,locked:false},clock:{},roster:{p:{present:true},q:{present:true}},branches:{act:{}},package:{budget:{reserveMinutes:5},activities:[{id:'act',phase:'practice',taskIds:['a','b']}],tasks:['a','b'].map(id=>({id,type:'closed',branch:'shared',prompt:'Private event question',evaluation:{checkerId:'numeric_exact',answerKey:5}}))}};}
const start=()=>events.startClassEvent(source(),{type:'buzzer',seed:1,durationMs:180000},teacher,1000);
const press=(event,requestId='buzz',now=2000,learnerId='p')=>events.buzzClassEvent(event,{learnerId,step:event.participants[learnerId]?.step||0,requestId},now);
const answer=(event,value=5,requestId='answer',now=2001)=>events.answerClassEvent(event,{learnerId:'p',step:event.participants.p.step,answer:value,requestId},now);
test('server buzzer opens only own question for30 active seconds, no points until correct answer',()=>{
 let event=start();assert.equal(event.buzzerVersion,1);assert.equal(typeof events.buzzClassEvent,'function');
 let view=events.classEventView(event,'p',1000);assert.equal(view.own.task,null);assert.equal(view.own.buzzer.canBuzz,true);assert.equal(view.own.canAnswer,false);
 assert.throws(()=>answer(event),/EVENT_BUZZ_REQUIRED/);event=press(event);assert.equal(event.participants.p.score,0);assert.equal(event.participants.p.step,0);
 view=events.classEventView(event,'p',2000);assert.equal(view.own.buzzer.remainingMs,30000);assert.equal(view.own.canAnswer,true);assert.ok(view.own.task.prompt);
 assert.equal(events.classEventView(event,'q',2000).own.task,null);assert.equal(events.classEventView(event,null,2000,{presenter:true}).own,null);
 event=answer(event);assert.equal(event.participants.p.score,10);assert.equal(event.fastest.elapsedMs,1001);assert.equal(event.participants.p.buzz,null);
});
test('press replay cannot extend deadline or score; expired/absent/closed/stale and forged requests rejected',()=>{
 const initial=start(),event=press(initial),replayed=press(event);assert.equal(replayed.lastResult.replay,true);assert.equal(replayed.participants.p.buzz.expiresAt,32000);
 assert.throws(()=>press(event,'second',2001),/EVENT_ALREADY_BUZZED/);assert.throws(()=>answer(event,5,'late',32000),/EVENT_BUZZ_REQUIRED/);
 assert.throws(()=>events.buzzClassEvent(event,{learnerId:'p',step:1,requestId:'buzz'},2001),/EVENT_REQUEST_CONFLICT/);
 assert.equal(events.classEventView(event,'p',32000).own.task,null);assert.equal(events.classEventView(event,'p',32000).own.buzzer.canBuzz,true);
 const retry=press(event,'new',32000);assert.equal(retry.participants.p.buzz.expiresAt,62000);
 assert.throws(()=>events.buzzClassEvent(event,{learnerId:'p',step:1,requestId:'stale'},2001),/STALE_EVENT_STEP/);
 assert.throws(()=>events.buzzClassEvent(event,{learnerId:'p',step:0,requestId:'forged',points:10},2001),/INVALID_EVENT_INPUT/);
 const absent=events.leaveClassEvent(event,'p',teacher,2001);assert.throws(()=>press(absent,'absent',2002),/EVENT_LEARNER_UNAVAILABLE/);
 assert.throws(()=>press(events.finishClassEvent(initial,teacher,2001),'closed',2002),/EVENT_CLOSED/);assert.throws(()=>press(initial,'expired',initial.endsAt),/EVENT_EXPIRED/);
});
test('wrong answer clears buzz and keeps cooldown; legacy no-version events retain prior direct answer behavior',()=>{
 let event=press(start());event=answer(event,4);assert.equal(event.participants.p.buzz,null);assert.equal(event.participants.p.score,0);assert.throws(()=>press(event,'early',2002),/EVENT_ANSWER_COOLDOWN/);event=press(event,'afterwait',12001);assert.equal(event.participants.p.buzz.step,1);
 let legacy=start();delete legacy.buzzerVersion;legacy=answer(legacy);assert.equal(legacy.participants.p.score,10);assert.equal(events.classEventView(legacy,'p',2002).own.buzzer,undefined);
});
test('reducer trusted pupil buzz rejects pause, teacher, stale activity; logical pause freezes own deadline',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url)));let state=createLessonSession({package:pkg,hostId:'teacher',sessionId:'buzz-runtime',learners:[{id:'p',name:'Em'}],now:1000}),serial=0,now=1000;
 const send=(type,payload={},actor=teacher)=>{const out=reduceLessonSession(state,{type,payload,eventId:'e'+(++serial),activityId:state.timeline.currentActivityId,round:state.round,revision:state.revision},{actor,now:++now});if(out.result.ok)state=out.state;return out.result;};
 send('START');while(state.timeline.currentActivityId!=='act-prac')send('NEXT');state.package.budget.reserveMinutes=3;send('CLASS_EVENT_OPEN',{type:'buzzer',durationMs:180000,seed:1});const payload={eventId:state.classEvent.id,step:0,requestId:'own-press'},pupil={role:'student',id:'p'};
 assert.equal(send('CLASS_EVENT_BUZZ',payload,teacher).code,'UNAUTHORIZED');assert.equal(send('CLASS_EVENT_BUZZ',{...payload,learnerId:'q'},pupil).ok,false);assert.equal(send('CLASS_EVENT_BUZZ',payload,pupil).ok,true);const expires=state.classEvent.participants.p.buzz.expiresAt;
 send('PAUSE');now+=120000;assert.equal(send('CLASS_EVENT_BUZZ',{...payload,requestId:'paused'},pupil).code,'PAUSED');send('RESUME');assert.equal(state.classEvent.participants.p.buzz.expiresAt,expires);assert.equal(serializeForStudent(state,'p').classEvent.own.canAnswer,true);
 const stale=reduceLessonSession(state,{type:'CLASS_EVENT_BUZZ',payload:{...payload,requestId:'stale'},activityId:'old',eventId:'stale',round:state.round,revision:state.revision},{actor:pupil,now:++now});assert.equal(stale.result.code,'STALE_ACTIVITY');
});
