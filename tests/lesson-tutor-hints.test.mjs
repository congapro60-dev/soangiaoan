import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLessonSession,reduceLessonSession} from '../lib/lesson/runtime.js';
import {serializeForStudent} from '../lib/lesson/serialize.js';
import {hashPackage} from '../lib/lesson/schema.js';

test('authored practice hints shown to a consented tutor guide calculation without stating either answer',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url)));
 pkg.status='approved';for(const ref of pkg.sourceRefs)ref.verification='verified';pkg.contentHash=hashPackage(pkg); // Synthetic QA only.
 let state=createLessonSession({package:pkg,mode:'live',learningPolicyVersion:0,hostId:'teacher',sessionId:'hint-qa',learners:[{id:'tutor',name:'A'},{id:'peer',name:'B'}],now:1000}),serial=0;
 const send=(type,payload={},id='teacher')=>{const out=reduceLessonSession(state,{type,payload,eventId:'hint'+(++serial),activityId:state.timeline.currentActivityId,round:state.round,revision:state.revision},{actor:{role:id==='teacher'?'teacher':'student',id},now:state.clock.lastNow+1});assert.equal(out.result.ok,true,out.result.code);state=out.state;};
 send('START');while(state.timeline.currentActivityId!=='act-prac')send('NEXT');
 for(const task of pkg.tasks.filter(t=>t.activityId==='act-prac'&&(!t.branch||['shared','core'].includes(t.branch))))send('SUBMIT',{taskId:task.id,answer:task.evaluation.answerKey},'tutor');
 send('TUTOR_NEED',{needed:true},'peer');send('TUTOR_REQUEST',{recipientId:'peer'},'tutor');
 const requestId=serializeForStudent(state,'peer').tutor.pair.id;send('TUTOR_RESPOND',{requestId,accept:true},'peer');
 const hint=serializeForStudent(state,'tutor').tutor.hints.find(h=>h.id==='hint-core-1');
 assert.ok(hint,'A method hint remains available');
 assert.doesNotMatch(hint.text,/\b(?:30|66)\b/,'The core hint must not state either correct answer');
 assert.match(hint.text,/n\s*=\s*7/);assert.match(hint.text,/n\s*=\s*25/);
});
