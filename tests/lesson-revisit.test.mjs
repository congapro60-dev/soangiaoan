import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLessonSession, reduceLessonSession } from '../lib/lesson/runtime.js';
import { hashPackage } from '../lib/lesson/schema.js';
import { serializeForStudent } from '../lib/lesson/serialize.js';
import { computeObjectiveMastery } from '../lib/lesson/passport.js';
import { practiceVariants } from '../lib/lesson/practice-variants.js';

const pkg = JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url)));
pkg.tasks[0].metadata = { ...pkg.tasks[0].metadata, practiceVariants: [{ prompt: 'Một hội trường có đúng 12 hàng ghế. Dãy số ghế của các hàng là hữu hạn hay vô hạn?', evaluation: pkg.tasks[0].evaluation, inputSchema: pkg.tasks[0].inputSchema }] };
pkg.contentHash = hashPackage(pkg);
const teacher = { role: 'teacher', id: 'teacher' }, pupil = { role: 'student', id: 'pupil' };
function setup() {
  let state = createLessonSession({ package: pkg, hostId: teacher.id, sessionId: 'revisit', learners: [{ id: pupil.id, name: 'Em' }, { id: 'other', name: 'Khác' }], now: 1000 });
  const send = (type, payload = {}, actor = teacher) => {
    const result = reduceLessonSession(state, { type, payload, round: state.round, revision: state.revision, eventId: type + state.revision }, { actor, now: state.clock.lastNow + 1 });
    if (result.result.ok) state = result.state;
    return result;
  };
  send('START'); send('NEXT');
  return { send, state: () => state };
}
test('revisit cannot open future gates and never rewinds the class clock', () => {
  const run = setup(), before = run.state();
  assert.equal(run.send('REVISIT', { activityId: pkg.activities[2].id }, pupil).result.code, 'REVISIT_LOCKED');
  const opened = run.send('REVISIT', { activityId: pkg.activities[0].id }, pupil);
  assert.equal(opened.result.ok, true);
  assert.deepEqual(opened.state.timeline, before.timeline);
  assert.equal(opened.state.clock.activityDeadline, before.clock.activityDeadline);
  const view = serializeForStudent(opened.state, pupil.id);
  assert.ok(view.practice?.task.prompt);
  assert.equal('answerKey' in view.practice.task.evaluation, false);
  assert.equal(serializeForStudent(opened.state, 'other').practice, null);
});
test('revisit scores once, updates own evidence and best stars without game-wallet rewards', () => {
  const run = setup();
  run.send('REVISIT', { activityId: pkg.activities[0].id }, pupil);
  const before = run.state(), task = before.practice.pupil.task;
  const answer = task.evaluation.answerKey;
  const result = run.send('REVISIT_SUBMIT', { answer, attemptId: before.practice.pupil.attemptId }, pupil);
  assert.equal(result.result.ok, true);
  assert.equal(result.result.correct, true);
  assert.deepEqual(result.state.gameWallets, before.gameWallets);
  assert.equal(run.send('REVISIT_SUBMIT', { answer, attemptId: before.practice.pupil.attemptId }, pupil).result.code, 'PRACTICE_ALREADY_ASSESSED');
  assert.ok(serializeForStudent(result.state, pupil.id).gateStars[0].stars > 0);
  assert.equal(run.send('SET_REVISIT', { enabled: false }).result.ok, true);
  assert.equal(run.send('REVISIT', { activityId: pkg.activities[0].id }, pupil).result.code, 'REVISIT_DISABLED');
});

test('old practice tabs cannot assess a newer attempt or change original mastery records', () => {
 const run=setup();run.send('REVISIT',{activityId:pkg.activities[0].id},pupil);const before=run.state();
 assert.equal(run.send('REVISIT_SUBMIT',{answer:before.practice.pupil.task.evaluation.answerKey,attemptId:'wrong'},pupil).result.code,'STALE_PRACTICE');
 const result=run.send('REVISIT_SUBMIT',{answer:before.practice.pupil.task.evaluation.answerKey,attemptId:before.practice.pupil.attemptId},pupil);
 assert.ok(result.state.passports.pupil.submissions.every(sub=>sub.taskId.startsWith('variant:')));
 assert.equal(result.state.practice.pupil.task.hintIds.length,0);
});

test('practice cannot request a base-task hint whose numbers belong to the original question', () => {
 const {source,base}=authoredOpenSource(), run=concludedPractice(source);run.send('REVISIT',{activityId:base.activityId});
 assert.equal(run.send('REVISIT_HINT',{attemptId:run.state().practice[pupil.id].attemptId,hintId:base.hintIds[0]}).result.code,'INVALID_HINT');
});

test('only explicitly reviewed equivalent checks add independent variant evidence; repeated variants count once', () => {
 const source=structuredClone(pkg), base=source.tasks.find(task=>task.id==='task-recheck-18');
 for(const task of source.tasks)if(task.metadata)delete task.metadata.practiceVariants;
 base.metadata={practiceVariants:[{prompt:'Dãy số a_n = n + 4 với mọi n nguyên dương là hữu hạn hay vô hạn?',evaluation:base.evaluation,inputSchema:base.inputSchema,masteryEvidence:true}]};
 source.contentHash=hashPackage(source);
 let state=createLessonSession({package:source,hostId:teacher.id,sessionId:'variant-evidence',learners:[{id:pupil.id,name:'Em'}],now:1000});
 state.status='concluded';
 for(let i=0;i<2;i++){
  const opened=reduceLessonSession(state,{type:'REVISIT',payload:{activityId:base.activityId},round:state.round,revision:state.revision,eventId:'open-'+i},{actor:pupil,now:20000+i*20000});assert.equal(opened.result.ok,true);state=opened.state;
  const done=reduceLessonSession(state,{type:'REVISIT_SUBMIT',payload:{confirmed:true,usedAI:false,answer:base.evaluation.answerKey,attemptId:state.practice.pupil.attemptId},round:state.round,revision:state.revision,eventId:'answer-'+i},{actor:pupil,now:20001+i*20000});assert.equal(done.result.ok,true);state=done.state;
 }
 assert.equal(computeObjectiveMastery(state.passports.pupil,'obj-t11-18',source).independentCount,1);
 assert.equal(computeObjectiveMastery(state.passports.pupil,'obj-t11-18',source).status,'supported');
 assert.equal(state.passports.pupil.submissions.every(sub=>sub.evidenceIds.length===1),true);
 assert.equal(state.passports.pupil.submissions.every(sub=>sub.taskId.startsWith('variant:')),true);
});

function authoredOpenSource(evidence = true) {
 const source=structuredClone(pkg), base=source.tasks.find(task=>task.id==='task-recheck-19');
 for(const task of source.tasks)if(task.metadata)delete task.metadata.practiceVariants;
 base.metadata={...base.metadata,practiceVariants:[{prompt:'Dãy số b_n có b_1 = 5 và b_n = b_(n-1) + 2 với n >= 2. Viết bốn cách cho dãy số, kiểm chứng ba số hạng đầu.',evaluation:{rubric:{criteria:['Viết đúng bốn cách','Đối chiếu ba số hạng đầu'],lookFor:['5, 7, 9; b_n = 2n + 3']}},inputSchema:{},masteryEvidence:evidence}]};
 source.contentHash=hashPackage(source);
 return {source,base};
}
function concludedPractice(source) {
 let state=createLessonSession({package:source,hostId:teacher.id,sessionId:'open-variant',learners:[{id:pupil.id,name:'Em'},{id:'other',name:'Khác'}],now:1000});
 state.status='concluded'; let serial=0;
 const send=(type,payload={},actor=pupil,now=state.clock.lastNow+1)=>{
  const result=reduceLessonSession(state,{type,payload,activityId:state.timeline.currentActivityId,round:state.round,revision:state.revision,eventId:'open-variant-'+(++serial)},{actor,now});
  if(result.result.ok)state=result.state;
  return result;
 };
 return {send,state:()=>state};
}

test('authored open practice remains pending, freezes the exact task, teacher assesses after conclusion without rewards', () => {
 const {source,base}=authoredOpenSource(), run=concludedPractice(source);
 assert.equal(practiceVariants(source,base.activityId).length,1);
 assert.equal(run.send('REVISIT',{activityId:base.activityId}).result.ok,true);
 const practice=run.state().practice[pupil.id], wallets=structuredClone(run.state().gameWallets), timeline=structuredClone(run.state().timeline);
 const submitted=run.send('REVISIT_SUBMIT',{confirmed:true,usedAI:false,answer:'5,7,9; b_n = 2n + 3; lời giải đủ bốn cách',attemptId:practice.attemptId});
 assert.equal(submitted.result.pending,true); assert.equal(submitted.result.correct,undefined);
 const submissionId=submitted.result.submissionId, before=run.state();
 assert.equal(before.submissions[submissionId].ok,null);
 assert.equal(before.openAssessments[submissionId].practiceTask.prompt,practice.task.prompt);
 assert.equal(before.openAssessments[submissionId].practiceTask.type,'open');
 assert.equal(run.send('REVISIT_SUBMIT',{answer:'thay bài',attemptId:practice.attemptId}).result.code,'PRACTICE_ASSESSMENT_PENDING');
 assert.equal(run.send('REVISIT',{activityId:base.activityId},pupil,before.clock.lastNow+20000).result.code,'PRACTICE_ASSESSMENT_PENDING');
 assert.equal(run.send('ASSESS',{submissionId,criteriaMet:true},pupil).result.code,'UNAUTHORIZED');
 assert.equal(run.send('ASSESS',{submissionId,criteriaMet:true}, {role:'teacher',id:'outsider'}).result.code,'UNAUTHORIZED');
 const assessed=run.send('ASSESS',{submissionId,criteriaMet:true,feedback:'Bốn cách nhất quán.'},teacher);
 assert.equal(assessed.result.ok,true); assert.equal(assessed.state.practice[pupil.id].assessed,true);
 assert.equal(assessed.state.passports[pupil.id].submissions.at(-1).taskId,'variant:'+practice.variantId);
 assert.equal(computeObjectiveMastery(assessed.state.passports[pupil.id],'obj-t11-19',source).independentCount,1);
 assert.deepEqual(assessed.state.gameWallets,wallets); assert.deepEqual(assessed.state.timeline,timeline);
 assert.equal(serializeForStudent(assessed.state,'other').practice,null);
 assert.equal(run.send('ASSESS',{submissionId,criteriaMet:true,feedback:'Bốn cách nhất quán.'},teacher).result.preserved,true);
});

test('unreviewed open variant never contributes evidence; cache callers cannot mutate the frozen authored pool', () => {
 const {source,base}=authoredOpenSource(false);
 const pool=practiceVariants(source,base.activityId); pool[0].task.prompt='tampered';
 assert.notEqual(practiceVariants(source,base.activityId)[0].task.prompt,'tampered');
 const run=concludedPractice(source);run.send('REVISIT',{activityId:base.activityId});
 const submitted=run.send('REVISIT_SUBMIT',{answer:'bài làm',attemptId:run.state().practice[pupil.id].attemptId});
 assert.equal(run.send('ASSESS',{submissionId:submitted.result.submissionId,criteriaMet:true},teacher).result.ok,true);
 assert.equal(run.state().passports[pupil.id].submissions.at(-1).evidenceIds.length,0);
 assert.equal(computeObjectiveMastery(run.state().passports[pupil.id],'obj-t11-19',source).independentCount,0);
});

test('altered open practice snapshot fails assessment; explicit non-mastery remains supported', () => {
 const {source,base}=authoredOpenSource(), run=concludedPractice(source);run.send('REVISIT',{activityId:base.activityId});
 const submitted=run.send('REVISIT_SUBMIT',{answer:'bài làm',attemptId:run.state().practice[pupil.id].attemptId}), submissionId=submitted.result.submissionId;
 const state=structuredClone(run.state());state.openAssessments[submissionId].practiceTask.prompt='đề bị thay';
 const attempted=reduceLessonSession(state,{type:'ASSESS',payload:{submissionId,criteriaMet:true},round:state.round,revision:state.revision,eventId:'tampered-assessment'},{actor:teacher,now:state.clock.lastNow+1});
 assert.equal(attempted.result.code,'STALE_PRACTICE');
 assert.equal(run.send('ASSESS',{submissionId,criteriaMet:true,nonMastery:true},teacher).result.ok,true);
 const mastery=computeObjectiveMastery(run.state().passports[pupil.id],'obj-t11-19',source);
 assert.equal(mastery.independentCount,0);assert.equal(mastery.supportedCount,1);
 assert.equal(run.send('ASSESS',{submissionId,criteriaMet:false,nonMastery:true},teacher).result.code,'PRACTICE_ALREADY_ASSESSED');
});

test('an assessed original open task powers the own game once; changed rubric verdict never replays engine state', () => {
 const run=concludedPractice(pkg);run.state().status='waiting';
 assert.equal(run.send('START',{},teacher).result.ok,true);
 while(run.state().timeline.currentActivityId!=='act-recheck')assert.equal(run.send('NEXT',{},teacher).result.ok,true);
 assert.equal(run.send('SET_MODE',{rule:'merchant'},teacher).result.ok,true);
 const submit=run.send('SUBMIT',{taskId:'task-recheck-19',answer:'Bài làm gốc'}), submissionId=submit.result.submissionId;
 assert.equal(submit.result.pending,true);
 const first=run.send('ASSESS',{submissionId,criteriaMet:true,feedback:'Đạt'},teacher);
 assert.equal(first.result.ok,true);assert.equal(first.state.lessonMode.ruleState.players['mode-1'].coins,9);
 assert.equal(first.state.submissions[submissionId].modeApplied,true);
 assert.equal(first.state.lessonModeErrors?.[teacher.id],undefined);
 const engine=structuredClone(first.state.lessonMode);
 assert.equal(run.send('ASSESS',{submissionId,criteriaMet:false,feedback:'Cần sửa'},teacher).result.ok,true);
 assert.deepEqual(run.state().lessonMode.ruleState,engine.ruleState);
 assert.deepEqual(run.state().lessonMode.receipts,engine.receipts);
});

test('extension revisit accepts only pupils with the original independent must recheck', () => {
 const source=structuredClone(pkg), base=source.tasks.find(task=>task.id==='task-prac-ext-rules');
 base.metadata={...base.metadata,practiceVariants:[{prompt:'Tính v_5 của dãy v_n = 18 + 2(n-1) + (n-1)(n-2)(n-3).',evaluation:{checkerId:'numeric_exact',answerKey:50},inputSchema:{}}]};
 source.contentHash=hashPackage(source);const run=concludedPractice(source);
 assert.equal(run.send('REVISIT',{activityId:base.activityId,branch:'extension'}).result.code,'BRANCH_LOCKED');
 run.state().passports[pupil.id].submissions.push({submissionId:'must',taskId:'task-recheck-18',activityId:'act-recheck',ok:true,assessmentStatus:'assessed',assisted:false,evidenceIds:['ev-recheck-18']});
 run.state().passports[pupil.id].submissions.push({submissionId:'must-19',taskId:'task-recheck-19',activityId:'act-recheck',ok:true,assessmentStatus:'assessed',assisted:false,evidenceIds:['ev-recheck-19']});
 assert.equal(run.send('REVISIT',{activityId:base.activityId,branch:'extension'}).result.ok,true);
 assert.equal(run.state().practice[pupil.id].task.branch,'extension');
 const attemptId=run.state().practice[pupil.id].attemptId;
 assert.equal(run.send('REVISIT_SUBMIT',{answer:50,attemptId}).result.correct,true);
});

test('missing independence disclosure never promotes closed or teacher-assessed open practice', () => {
 for(const open of [false,true]){
  const {source,base}=authoredOpenSource(true);
  if(!open){const task=source.tasks.find(task=>task.id===base.id);task.type='closed';task.evaluation={checkerId:'numeric_exact',answerKey:5};task.metadata.practiceVariants[0].evaluation={checkerId:'numeric_exact',answerKey:5};source.contentHash=hashPackage(source);}
  const run=concludedPractice(source);assert.equal(run.send('REVISIT',{activityId:base.activityId}).result.ok,true);
  const submitted=run.send('REVISIT_SUBMIT',{answer:open?'bài làm':5,attemptId:run.state().practice[pupil.id].attemptId});
  assert.equal(submitted.result.ok,true);
  if(open)assert.equal(run.send('ASSESS',{submissionId:submitted.result.submissionId,criteriaMet:true},teacher).result.ok,true);
  assert.equal(run.state().passports[pupil.id].submissions.at(-1).assisted,true);
  assert.equal(computeObjectiveMastery(run.state().passports[pupil.id],'obj-t11-19',source).independentCount,0);
 }
});

test('class event and expired live gate lock practice without advancing history or assessing stale work',()=>{
 const run=setup();run.send('REVISIT',{activityId:pkg.activities[0].id},pupil);const practice=run.state().practice.pupil;
 run.state().clock.classEventPausedAt=run.state().clock.lastNow;run.state().classEvent={status:'active',endsAt:999999};
 assert.equal(run.send('REVISIT_SUBMIT',{answer:practice.task.evaluation.answerKey,attemptId:practice.attemptId},pupil).result.code,'REVISIT_LOCKED');
 run.state().clock.classEventPausedAt=null;run.state().classEvent=null;run.state().clock.activityDeadline=run.state().clock.lastNow;
 assert.equal(run.send('REVISIT',{activityId:pkg.activities[0].id},pupil).result.code,'REVISIT_LOCKED');
 assert.equal(run.state().practice.pupil.assessed,false);
});

test('latest assessed variant replaces its same-family older success, best map stars remain',()=>{
 const {source,base}=authoredOpenSource();const run=concludedPractice(source);run.send('REVISIT',{activityId:base.activityId});
 let submitted=run.send('REVISIT_SUBMIT',{confirmed:true,usedAI:false,answer:'bài đúng',attemptId:run.state().practice.pupil.attemptId});run.send('ASSESS',{submissionId:submitted.result.submissionId,criteriaMet:true},teacher);
 assert.equal(computeObjectiveMastery(run.state().passports.pupil,'obj-t11-19',source).independentCount,1);
 run.send('REVISIT',{activityId:base.activityId},pupil,run.state().clock.lastNow+20000);
 submitted=run.send('REVISIT_SUBMIT',{confirmed:true,usedAI:false,answer:'bài sai',attemptId:run.state().practice.pupil.attemptId});run.send('ASSESS',{submissionId:submitted.result.submissionId,criteriaMet:false},teacher);
 assert.equal(computeObjectiveMastery(run.state().passports.pupil,'obj-t11-19',source).independentCount,0);
 assert.equal(serializeForStudent(run.state(),pupil.id).gateStars.find(gate=>gate.activityId===base.activityId).stars,3);
});
