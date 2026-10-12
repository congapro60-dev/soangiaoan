import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLessonSession,reduceLessonSession} from '../lib/lesson/runtime.js';
import {serializeForStudent,serializeForTeacher,serializeForPresenter} from '../lib/lesson/serialize.js';
const pkg=JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url)));
const teacher={role:'teacher',id:'teacher'};
function run(type='relay',count=4){
 let state=createLessonSession({package:pkg,hostId:'teacher',sessionId:'absence',learners:Array.from({length:count},(_,i)=>({id:'p'+i,name:'Em'+i})),now:1000}),serial=0;
 const send=(type,payload={},actor=teacher)=>{const event={type,payload,eventId:'e'+(++serial),activityId:state.timeline.currentActivityId,round:state.round,revision:state.revision};const result=reduceLessonSession(state,event,{actor,now:state.clock.lastNow+1});if(result.result.ok)state=result.state;return{...result,event};};
 send('START');while(state.timeline.currentActivityId!=='act-prac')send('NEXT');state.package.budget.reserveMinutes=3;assert.equal(send('CLASS_EVENT_OPEN',{type,durationMs:180000,seed:1}).result.ok,true);
 return{send,state:()=>state};
}
function answer(run,id,requestId){const event=run.state().classEvent,player=event.participants[id],task=event.tasks.find(task=>task.id===player.taskIds[player.step]);return run.send('CLASS_EVENT_ANSWER',{eventId:event.id,step:player.step,answer:task.evaluation.answerKey,requestId},{role:'student',id});}
test('teacher marks runner absent during event; frozen roster/statistics remain, relay skips now and future turns',()=>{
 const lesson=run(),team=lesson.state().classEvent.teams[0],first=team.memberIds[team.turn],next=team.memberIds[1];
 const frozen=structuredClone(lesson.state().classEvent),left=lesson.send('LEAVE_LEARNER',{learnerId:first});assert.equal(left.result.ok,true);
 const event=lesson.state().classEvent;assert.deepEqual(Object.keys(event.participants),Object.keys(frozen.participants));assert.deepEqual(event.teams[0].memberIds,frozen.teams[0].memberIds);assert.ok(event.participants[first].absentAt);assert.equal(event.teams[0].memberIds[event.teams[0].turn],next);
 assert.equal(serializeForStudent(lesson.state(),first).classEvent.own.canAnswer,false);assert.equal(serializeForStudent(lesson.state(),first).classEvent.own.task,null);
 assert.equal(serializeForStudent(lesson.state(),next).classEvent.own.canAnswer,true);assert.equal(answer(lesson,next,'next').result.ok,true);
 assert.equal(lesson.state().classEvent.teams[0].memberIds[lesson.state().classEvent.teams[0].turn],next);
 assert.equal(serializeForTeacher(lesson.state()).classEvent.players,4);assert.equal(serializeForPresenter(lesson.state()).classEvent.own,null);
 const replay=reduceLessonSession(lesson.state(),left.event,{actor:teacher,now:lesson.state().clock.lastNow+1});assert.equal(replay.result.replay,true);assert.equal(replay.state.classEvent.participants[first].absentAt,event.participants[first].absentAt);
});
test('departed actor cannot rejoin an active frozen event; newly added pupils never enter its roster',()=>{
 const lesson=run(),team=lesson.state().classEvent.teams[0],first=team.memberIds[0];lesson.send('LEAVE_LEARNER',{learnerId:first});
 assert.equal(lesson.send('ADD_LEARNER',{learner:{id:first,name:lesson.state().roster[first].name}}).result.ok,true);
 assert.equal(answer(lesson,first,'returned').result.code,'EVENT_LEARNER_UNAVAILABLE');assert.equal(serializeForStudent(lesson.state(),first).classEvent.own.canAnswer,false);
 assert.equal(lesson.send('ADD_LEARNER',{learner:{id:'late',name:'Muộn'}}).result.ok,true);assert.equal(lesson.state().classEvent.participants.late,undefined);assert.equal(serializeForStudent(lesson.state(),'late').classEvent.own,null);
});
test('absence is teacher-only and works while paused without advancing event clock; Jeopardy closes absent choice',()=>{
 const lesson=run('mountain'),id=Object.keys(lesson.state().classEvent.participants)[0],before=lesson.state().classEvent.lastNow;
 assert.equal(lesson.send('LEAVE_LEARNER',{learnerId:id},{role:'student',id}).result.code,'UNAUTHORIZED');lesson.send('PAUSE');assert.equal(lesson.send('LEAVE_LEARNER',{learnerId:id}).result.ok,true);
 assert.equal(lesson.state().classEvent.lastNow,before);lesson.send('RESUME');assert.equal(lesson.send('ADD_LEARNER',{learner:{id,name:lesson.state().roster[id].name}}).result.ok,true);
 const view=serializeForStudent(lesson.state(),id).classEvent.own;assert.equal(view.canPick,false);assert.equal(view.task,null);
 const cell=lesson.state().classEvent.participants[id].board[0].id;assert.equal(lesson.send('CLASS_EVENT_PICK',{eventId:lesson.state().classEvent.id,cellId:cell,requestId:'absent-pick'},{role:'student',id}).result.code,'EVENT_LEARNER_UNAVAILABLE');
});
test('single pupil and fully absent teams remain closed without inventing a new event participant',()=>{
 const lesson=run('relay',1);assert.equal(lesson.send('LEAVE_LEARNER',{learnerId:'p0'}).result.ok,true);assert.equal(serializeForStudent(lesson.state(),'p0').classEvent.own.canAnswer,false);assert.equal(lesson.state().classEvent.teams[1].memberIds.length,0);
 const all=run();for(const id of Object.keys(all.state().roster))assert.equal(all.send('LEAVE_LEARNER',{learnerId:id}).result.ok,true);assert.ok(Object.values(all.state().classEvent.participants).every(player=>player.absentAt!=null));
});
