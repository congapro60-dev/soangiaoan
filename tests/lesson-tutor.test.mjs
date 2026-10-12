import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLessonSession, reduceLessonSession } from '../lib/lesson/runtime.js';
import { serializeForStudent, serializeForTeacher, serializeForPresenter } from '../lib/lesson/serialize.js';
import { hashPackage } from '../lib/lesson/schema.js';

const pkg = JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url)));
pkg.status='approved';for(const ref of pkg.sourceRefs)ref.verification='verified';pkg.contentHash=hashPackage(pkg); // Synthetic fixture only.
const teacher = {role:'teacher',id:'teacher'}, tutor={role:'student',id:'tutor'}, peer={role:'student',id:'peer'}, stranger={role:'student',id:'stranger'};
function setup() {
 let state=createLessonSession({package:pkg,mode:'live',learningPolicyVersion:0,hostId:teacher.id,sessionId:'tutor-test',learners:[{id:'tutor',name:'An'},{id:'peer',name:'Bình'},{id:'stranger',name:'Chi'}],now:1000});let serial=0;
 const send=(type,payload={},actor=teacher)=>{const event={type,payload,activityId:state.timeline.currentActivityId,round:state.round,revision:state.revision,eventId:'t'+(++serial)};const out=reduceLessonSession(state,event,{actor,now:state.clock.lastNow+1});if(out.result.ok)state=out.state;return{...out,event};};
 send('START');while(state.timeline.currentActivityId!=='act-prac')send('NEXT');
 for(const task of pkg.tasks.filter(task=>task.activityId==='act-prac'&&(!task.branch||['shared','core'].includes(task.branch))))send('SUBMIT',{taskId:task.id,answer:task.evaluation.answerKey},tutor);
 return{send,state:()=>state,replace:next=>{state=next;}};
}
function consent(run) {
 assert.equal(run.send('TUTOR_NEED',{needed:true},peer).result.ok,true);
 assert.equal(run.send('TUTOR_REQUEST',{recipientId:'peer'},tutor).result.ok,true);
 const id=serializeForStudent(run.state(),'peer').tutor.pair.id;
 assert.equal(run.send('TUTOR_RESPOND',{requestId:id,accept:true},peer).result.ok,true);
 return id;
}
test('support is voluntary, completed tutor requests one peer, only recipient consents',()=>{
 const run=setup();assert.equal(run.send('TUTOR_REQUEST',{recipientId:'peer'},tutor).result.code,'TUTOR_NOT_AVAILABLE');
 run.send('TUTOR_NEED',{needed:true},peer);
 assert.deepEqual(serializeForStudent(run.state(),'stranger').tutor.candidates,[]);
 assert.deepEqual(serializeForStudent(run.state(),'tutor').tutor.candidates,[{id:'peer',name:'Bình'}]);
 const request=run.send('TUTOR_REQUEST',{recipientId:'peer'},tutor);assert.equal(request.result.ok,true);
 const id=serializeForStudent(run.state(),'peer').tutor.pair.id;
 assert.equal(serializeForStudent(run.state(),'tutor').tutor.hints.length,0);
 assert.equal(run.send('TUTOR_RESPOND',{requestId:id,accept:true},stranger).result.code,'TUTOR_NOT_AVAILABLE');
 assert.equal(run.send('TUTOR_RESPOND',{requestId:id,accept:true},peer).result.ok,true);
 assert.ok(serializeForStudent(run.state(),'tutor').tutor.hints.length);
 assert.equal(run.send('TUTOR_REQUEST',{recipientId:'stranger'},tutor).result.code,'TUTOR_NOT_AVAILABLE');
});
test('tutor view never includes peer drafts, answers, keys, rubric, performance or third-party pair',()=>{
 const run=setup();run.send('SAVE_DRAFT',{taskId:'task-prac-error-hunt',answer:'PRIVATE_PEER_DRAFT'},peer);consent(run);
 const view=serializeForStudent(run.state(),'tutor').tutor, json=JSON.stringify(view);
 for(const secret of ['PRIVATE_PEER_DRAFT','answerKey','evaluation','supportRationale','submissions','score'])assert.equal(json.includes(secret),false,secret);
 assert.equal(serializeForStudent(run.state(),'stranger').tutor.pair,null);
 assert.deepEqual(serializeForStudent(run.state(),'stranger').tutor.history,[]);
 assert.equal('tutor' in serializeForPresenter(run.state()),false);
 assert.equal(serializeForTeacher(run.state()).tutors.history.length,1);
});
test('pause, lock, event, stale phase, rejection, cancel and session end stop help commands',()=>{
 const run=setup();const id=consent(run);run.send('PAUSE');assert.equal(run.send('TUTOR_END',{requestId:id},tutor).result.code,'PAUSED');
 assert.equal(serializeForStudent(run.state(),'tutor').tutor.hints.length,0);run.send('RESUME');run.send('LOCK');assert.equal(run.send('TUTOR_END',{requestId:id},tutor).result.code,'LOCKED');run.send('UNLOCK');
 assert.equal(run.send('TUTOR_END',{requestId:id},tutor).result.ok,true);assert.equal(serializeForStudent(run.state(),'tutor').tutor.pair,null);
 assert.equal(run.send('TUTOR_END',{requestId:id},tutor).result.code,'TUTOR_NOT_AVAILABLE');
 run.send('CONCLUDE');assert.equal(run.send('TUTOR_NEED',{needed:true},peer).result.code,'SESSION_CONCLUDED');
 const other=setup();other.send('TUTOR_NEED',{needed:true},peer);other.send('TUTOR_REQUEST',{recipientId:'peer'},tutor);const pending=serializeForStudent(other.state(),'peer').tutor.pair.id;
 other.send('TUTOR_RESPOND',{requestId:pending,accept:false},peer);assert.equal(serializeForStudent(other.state(),'tutor').tutor.history[0].status,'rejected');
 const expired=setup();const eid=consent(expired);expired.send('NEXT');assert.equal(expired.send('TUTOR_RESPOND',{requestId:eid,accept:true},peer).result.code,'TUTOR_NOT_AVAILABLE');
});
test('recipient help marks current work assisted; later independent recheck awards one star and no tutor maths evidence',()=>{
 const run=setup();const id=consent(run),before=structuredClone(run.state().passports.tutor);
 const same=run.send('SUBMIT',{taskId:'task-prac-error-hunt',answer:20},peer);assert.equal(same.state.submissions[same.result.submissionId].assisted,true);
 assert.equal(run.state().gameWallets.learners.tutor.bonus,0);
 run.send('NEXT');const answer=pkg.tasks.find(task=>task.id==='task-recheck-18').evaluation.answerKey;
 const done=run.send('SUBMIT',{taskId:'task-recheck-18',answer},peer);assert.equal(done.result.correct,true);
 assert.equal(run.state().gameWallets.learners.tutor.bonus,1);
 assert.deepEqual(run.state().passports.tutor.submissions,before.submissions);
 assert.equal(run.state().passports.tutor.tutorHistory[0].recipientName,'Bình');
 assert.equal(run.state().tutors.history.find(pair=>pair.id===id).status,'rewarded');
 const replay=reduceLessonSession(run.state(),done.event,{actor:peer,now:run.state().clock.lastNow+1});assert.equal(replay.result.replay,true);assert.equal(replay.state.gameWallets.learners.tutor.bonus,1);
 run.send('SUBMIT',{taskId:'task-recheck-18',answer},peer);assert.equal(run.state().gameWallets.learners.tutor.bonus,1);
});
test('hinted, revealed, AI-assisted, board or wrong rechecks cannot award; teacher can revoke pairing',()=>{
 for(const assistance of ['hint','reveal','ai','wrong','board']){
  const run=setup();consent(run);run.send('NEXT');let answer=pkg.tasks.find(task=>task.id==='task-recheck-18').evaluation.answerKey;
  if(assistance==='hint')run.send('HINT',{taskId:'task-recheck-18',hintId:'hint-recheck-1'},peer);
  if(assistance==='reveal')run.send('REVEAL',{taskId:'task-recheck-18'});
  if(assistance==='ai')run.send('INTEGRITY',{confirmed:true,usedAI:true},peer);
  if(assistance==='wrong')answer='wrong';
  run.send(assistance==='board'?'TEACHER_RESPONSE':'SUBMIT',{...(assistance==='board'?{learnerId:'peer'}:{}),taskId:'task-recheck-18',answer},assistance==='board'?teacher:peer);
  assert.equal(run.state().gameWallets.learners.tutor.bonus,0,assistance);
 }
 const run=setup();const id=consent(run);assert.equal(run.send('TUTOR_REVOKE',{requestId:id},teacher).result.ok,true);assert.equal(serializeForStudent(run.state(),'tutor').tutor.hints.length,0);
});
test('transport-shaped actor spoofing and malformed consent cannot mutate tutoring',()=>{
 const run=setup();assert.equal(run.send('TUTOR_NEED',{needed:'true'},peer).result.code,'INVALID_EVENT');
 const event={type:'TUTOR_NEED',eventId:'missing-payload',activityId:run.state().timeline.currentActivityId,round:run.state().round,revision:run.state().revision};
 assert.equal(reduceLessonSession(run.state(),event,{actor:peer,now:run.state().clock.lastNow+1}).result.code,'INVALID_EVENT');
 assert.equal(run.send('TUTOR_REQUEST',{recipientId:'peer',learnerId:'tutor'},peer).result.ok,false);
 assert.equal(run.send('TUTOR_NEED',{needed:true},{role:'student',id:'absent'}).result.code,'UNAUTHORIZED');
 assert.equal(run.send('TUTOR_NEED',{needed:true},teacher).result.code,'UNAUTHORIZED');
});
test('only real completed independent work qualifies; whole-class group scores and assisted tasks do not',()=>{
 const run=setup();const next=structuredClone(run.state());next.submissions={};next.gameWallets.learners.tutor.earned=1000;run.replace(next);
 run.send('TUTOR_NEED',{needed:true},peer);assert.equal(run.send('TUTOR_REQUEST',{recipientId:'peer'},tutor).result.code,'TUTOR_NOT_AVAILABLE');
 const assisted=setup();assisted.send('HINT',{taskId:'task-prac-error-hunt',hintId:'hint-hunt-1'},tutor);assisted.send('TUTOR_NEED',{needed:true},peer);
 assert.equal(assisted.send('TUTOR_REQUEST',{recipientId:'peer'},tutor).result.code,'TUTOR_NOT_AVAILABLE');
});
test('event blocks tutoring; absence expires consent; 900-record cap preserves complete audit without truncation',()=>{
 const run=setup();const id=consent(run);const eventState=structuredClone(run.state());eventState.package.budget.reserveMinutes=3;run.replace(eventState);assert.equal(run.send('CLASS_EVENT_OPEN',{type:'tug',durationMs:180000,seed:1}).result.ok,true);
 assert.equal(run.send('TUTOR_END',{requestId:id},tutor).result.code,'CLASS_EVENT_ACTIVE');
 const absent=setup();consent(absent);absent.send('LEAVE_LEARNER',{learnerId:'peer'});assert.equal(absent.state().tutors.history[0].status,'expired');
 const bounded=setup();bounded.send('TUTOR_NEED',{needed:true},peer);const next=structuredClone(bounded.state());next.tutors.history=Array.from({length:900},(_,i)=>({id:'old'+i,tutorId:'old',recipientId:'oldpeer',activityId:'old',status:'rejected'}));bounded.replace(next);
 assert.equal(bounded.send('TUTOR_REQUEST',{recipientId:'peer'},tutor).result.code,'TUTOR_LIMIT');assert.equal(bounded.state().tutors.history.length,900);
});
test('a teacher correction or revealed recheck revokes tutor reward without removing historical audit',()=>{
 const run=setup();consent(run);run.send('NEXT');const task=pkg.tasks.find(task=>task.id==='task-recheck-19');
 const submitted=run.send('SUBMIT',{taskId:task.id,answer:'Reasoned answer'},peer);assert.equal(submitted.result.pending,true);
 run.send('ASSESS',{submissionId:submitted.result.submissionId,criteriaMet:true,feedback:'Valid'});assert.equal(run.state().gameWallets.learners.tutor.bonus,1);
 run.send('ASSESS',{submissionId:submitted.result.submissionId,criteriaMet:false,feedback:'Corrected'});assert.equal(run.state().gameWallets.learners.tutor.bonus,0);
 assert.equal(run.state().tutors.history[0].status,'reward_revoked');assert.equal(run.state().passports.tutor.tutorHistory[0].revokedAt,run.state().clock.lastNow);
 const shown=setup();consent(shown);shown.send('NEXT');shown.send('SUBMIT',{taskId:'task-recheck-18',answer:pkg.tasks.find(task=>task.id==='task-recheck-18').evaluation.answerKey},peer);
 shown.send('REVEAL',{taskId:'task-recheck-18'});assert.equal(shown.state().gameWallets.learners.tutor.bonus,0);
 const hinted=setup();consent(hinted);hinted.send('NEXT');hinted.send('SUBMIT',{taskId:'task-recheck-18',answer:pkg.tasks.find(task=>task.id==='task-recheck-18').evaluation.answerKey},peer);
 hinted.send('HINT',{taskId:'task-recheck-18',hintId:'hint-recheck-1'},peer);assert.equal(hinted.state().gameWallets.learners.tutor.bonus,0);
 const pending=setup();consent(pending);pending.send('NEXT');const open=pending.send('SUBMIT',{taskId:'task-recheck-19',answer:'Pending answer'},peer);pending.send('HINT',{taskId:'task-recheck-19',hintId:'hint-recheck-2'},peer);
 pending.send('ASSESS',{submissionId:open.result.submissionId,criteriaMet:true,feedback:'Helped'});assert.equal(pending.state().gameWallets.learners.tutor.bonus,0);
});
test('consent marks a pending existing answer as assisted before the teacher assesses it',()=>{
 const source=structuredClone(pkg), task=source.tasks.find(task=>task.id==='task-prac-error-hunt');task.type='open';task.evaluation={rubric:{criteria:['Reasoning'],lookFor:['Reasoning']}};source.contentHash=hashPackage(source);
 const run=setup(), next=structuredClone(run.state());next.package=source;run.replace(next);
 const pending=run.send('SUBMIT',{taskId:task.id,answer:'My pending explanation'},peer);assert.equal(pending.result.pending,true);consent(run);
 assert.equal(run.state().submissions[pending.result.submissionId].assisted,true);
 assert.equal(run.state().passports.peer.submissions.find(sub=>sub.submissionId===pending.result.submissionId).assisted,true);
 run.send('ASSESS',{submissionId:pending.result.submissionId,criteriaMet:true,feedback:'Reasoned with support'});
 assert.equal(run.state().submissions[pending.result.submissionId].assisted,true);assert.equal(run.state().gameWallets.learners.tutor.bonus,0);
});
test('recipient changes branch: active hints end immediately, pending invitation cancels, history remains',()=>{
 const run=setup();consent(run);
 run.send('SUBMIT',{taskId:'task-prac-error-hunt',answer:-1},peer);run.send('SELECT_BRANCH',{branch:'core'},peer);
 assert.equal(run.send('SELECT_BRANCH',{branch:'support'},peer).result.ok,true);
 const view=serializeForStudent(run.state(),'tutor').tutor;assert.equal(view.hints.length,0);assert.equal(view.pair,null);assert.equal(view.history[0].status,'awaiting_recheck');assert.equal(run.state().gameWallets.learners.tutor.bonus,0);
 const pending=setup();pending.send('TUTOR_NEED',{needed:true},peer);pending.send('TUTOR_REQUEST',{recipientId:'peer'},tutor);pending.send('SELECT_BRANCH',{branch:'support'},peer);
 assert.equal(serializeForStudent(pending.state(),'tutor').tutor.history[0].status,'cancelled');assert.equal(serializeForStudent(pending.state(),'peer').tutor.pair,null);
});
test('tutor hint projection excludes request tasks removed from recipient current branch',()=>{
 const run=setup();consent(run);const next=structuredClone(run.state());next.tutors.history[0].taskIds=['task-prac-core-calc'];next.branches['act-prac'].peer='support';run.replace(next);
 assert.equal(serializeForStudent(run.state(),'tutor').tutor.hints.length,0);
});
test('teacher revokes an awarded tutor star exactly once; replay preserves wallet and historical badge',()=>{
 const run=setup();const id=consent(run);run.send('NEXT');run.send('SUBMIT',{taskId:'task-recheck-18',answer:pkg.tasks.find(task=>task.id==='task-recheck-18').evaluation.answerKey},peer);
 assert.equal(run.state().gameWallets.learners.tutor.bonus,1);
 const revoked=run.send('TUTOR_REVOKE',{requestId:id},teacher);assert.equal(revoked.result.ok,true);assert.equal(run.state().gameWallets.learners.tutor.bonus,0);
 assert.equal(run.state().tutors.history[0].status,'reward_revoked');assert.equal(run.state().tutors.history[0].revokedBy,'teacher');assert.equal(run.state().passports.tutor.tutorHistory[0].revokedAt,run.state().clock.lastNow);
 assert.equal(Object.values(run.state().rewardLedger).find(entry=>entry.kind==='tutor').active,false);
 const replay=reduceLessonSession(run.state(),revoked.event,{actor:teacher,now:run.state().clock.lastNow+1});assert.equal(replay.result.replay,true);assert.equal(replay.state.gameWallets.learners.tutor.bonus,0);
 assert.equal(run.send('TUTOR_REVOKE',{requestId:id},teacher).result.code,'TUTOR_NOT_AVAILABLE');assert.equal(run.state().gameWallets.learners.tutor.bonus,0);
});
test('two tutors sequentially help one pupil in a gate; anti-farming grants exactly one tutor star',()=>{
 const run=setup(),second={role:'student',id:'stranger'};
 for(const task of pkg.tasks.filter(task=>task.activityId==='act-prac'&&(!task.branch||['shared','core'].includes(task.branch))))assert.equal(run.send('SUBMIT',{taskId:task.id,answer:task.evaluation.answerKey},second).result.ok,true);
 const first=consent(run);run.send('TUTOR_END',{requestId:first},tutor);
 assert.equal(run.send('TUTOR_REQUEST',{recipientId:'peer'},second).result.ok,true);const secondId=serializeForStudent(run.state(),'peer').tutor.pair.id;
 assert.equal(run.send('TUTOR_RESPOND',{requestId:secondId,accept:true},peer).result.ok,true);run.send('TUTOR_END',{requestId:secondId},second);run.send('NEXT');
 run.send('SUBMIT',{taskId:'task-recheck-18',answer:pkg.tasks.find(task=>task.id==='task-recheck-18').evaluation.answerKey},peer);
 assert.equal(run.state().gameWallets.learners.tutor.bonus+run.state().gameWallets.learners.stranger.bonus,1);
 assert.equal(Object.values(run.state().rewardLedger).filter(entry=>entry.kind==='tutor'&&entry.active).length,1);
 assert.equal(run.state().tutors.history.filter(pair=>pair.status==='rewarded').length,1);
});
test('leaving tutor expires pending consent immediately; opt-out cancels live requests and frees both actors',()=>{
 const run=setup();run.send('TUTOR_NEED',{needed:true},peer);run.send('TUTOR_REQUEST',{recipientId:'peer'},tutor);
 run.send('LEAVE_LEARNER',{learnerId:'tutor'});assert.equal(run.state().tutors.history[0].status,'expired');assert.equal(serializeForStudent(run.state(),'peer').tutor.pair,null);
 const active=setup();consent(active);active.send('TUTOR_NEED',{needed:false},peer);
 for(const id of ['peer','tutor'])assert.equal(serializeForStudent(active.state(),id).tutor.pair,null);
 assert.equal(serializeForStudent(active.state(),'tutor').tutor.eligible,true);
 assert.equal(active.state().tutors.history[0].status,'cancelled');assert.ok(active.state().tutors.history[0].endedAt);assert.equal(active.state().gameWallets.learners.tutor.bonus,0);
});
test('awaiting recheck appears only in own history; malformed tutor commands cannot crash or spoof consent',()=>{
 const run=setup(),id=consent(run);run.send('TUTOR_END',{requestId:id},tutor);
 for(const learnerId of ['peer','tutor']){const view=serializeForStudent(run.state(),learnerId).tutor;assert.equal(view.pair,null);assert.equal(view.history[0].status,'awaiting_recheck');}
 for(const payload of [{},{recipientId:null},{recipientId:[]},{recipientId:{}},{recipientId:'__proto__'},{recipientId:'constructor'},{recipientId:'peer',actor:{id:'tutor'}}])assert.doesNotThrow(()=>assert.equal(run.send('TUTOR_REQUEST',payload,tutor).result.ok,false));
});

test('teacher can correct an awarded tutor badge after conclusion; students cannot',()=>{
 const run=setup();const id=consent(run);run.send('NEXT');run.send('SUBMIT',{taskId:'task-recheck-18',answer:pkg.tasks.find(task=>task.id==='task-recheck-18').evaluation.answerKey},peer);run.send('CONCLUDE');
 assert.equal(run.state().gameWallets.learners.tutor.bonus,1);assert.equal(run.send('TUTOR_REVOKE',{requestId:id},peer).result.ok,false);
 assert.equal(run.send('TUTOR_REVOKE',{requestId:id},teacher).result.ok,true);assert.equal(run.state().gameWallets.learners.tutor.bonus,0);assert.ok(run.state().passports.tutor.tutorHistory[0].revokedAt);
});
