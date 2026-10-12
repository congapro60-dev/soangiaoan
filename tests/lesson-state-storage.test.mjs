import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {packLessonState,unpackLessonState} from '../lib/lesson/state-storage.js';
const state=()=>({id:'room',tutors:{needs:{b:'practice'},history:[{id:'one',tutorId:'a',recipientId:'b',taskIds:['task'],status:'reward_revoked',revokedAt:5,extraAudit:{observations:['kept'],optional:null}},{id:'two',taskIds:['task'],status:'rejected'}]},classEvent:{id:'event',receipts:{first:{fingerprint:'exact',result:{points:10}}}},lessonMode:{players:{a:{points:20}}},passports:{a:{tutorHistory:[{id:'one',revokedAt:5}]}},gameWallets:{learners:{a:{bonus:0}}}});
test('lossless extras survive JSON persistence with exact audit/receipt/mode and legacy-readable core fields',()=>{
 const original=state(),before=structuredClone(original),packed=packLessonState(original);assert.deepEqual(original,before);
 for(const key of ['tutors','classEvent','lessonMode'])assert.equal(packed[key],undefined);
 assert.deepEqual(unpackLessonState(JSON.parse(JSON.stringify(packed))),before);assert.deepEqual(packed.passports,before.passports);assert.deepEqual(packed.gameWallets,before.gameWallets);
});
test('decoded audit cells have independent identities and never alias the stored JSON',()=>{
 const packed=packLessonState(state()),decoded=unpackLessonState(packed);decoded.tutors.history[0].taskIds.push('changed');decoded.classEvent.receipts.first.result.points=99;
 assert.deepEqual(decoded.tutors.history[1].taskIds,['task']);assert.deepEqual(unpackLessonState(packed),state());
});
test('legacy state, absent, null and empty extras preserve JSON meaning',()=>{
 for(const old of [{id:'old'}, {classEvent:null}, {tutors:{history:[]}},state()]){assert.deepEqual(unpackLessonState(old),old);assert.deepEqual(unpackLessonState(packLessonState(old)),old);}
});
test('corrupt versions/base64/JSON, overlapping core keys and zip bombs fail closed',()=>{
 const packed=packLessonState(state());for(const patch of [{version:2},{data:'!!'},{data:'Zg=='},{data:packed.lessonExtrasCompressed.data.replace(/=$/,'')}])assert.throws(()=>unpackLessonState({...packed,lessonExtrasCompressed:{...packed.lessonExtrasCompressed,...patch}}),/INVALID_LESSON_STORAGE/);
 assert.throws(()=>unpackLessonState({...packed,tutors:{history:[]}}),/INVALID_LESSON_STORAGE/);
 for(const value of [{other:{}},{tutors:{history:Array(901).fill({})}},{tutors:{history:[null]}},{classEvent:'bad'},{tutors:{history:[],audit:'x'.repeat(1048576)}}]){
  if(!value.other)assert.throws(()=>packLessonState(value),/INVALID_LESSON_STORAGE/);
  const bad={lessonExtrasCompressed:{version:1,data:deflateSync(JSON.stringify(value)).toString('base64')}};assert.throws(()=>unpackLessonState(bad),/INVALID_LESSON_STORAGE/);
 }
});
test('900 complete records compress substantially and boundary agrees in both directions',()=>{
 const fixture=state(),sample=fixture.tutors.history[0];fixture.tutors.history=Array.from({length:900},(_,i)=>({...sample,id:'tutor-'+i,tutorId:'actor-'+(i%150),recipientId:'actor-'+((i+1)%150),requestedAt:10000+i}));
 assert(Buffer.byteLength(JSON.stringify(packLessonState(fixture)))<Buffer.byteLength(JSON.stringify(fixture))*.4);assert.deepEqual(unpackLessonState(packLessonState(fixture)),fixture);
 const boundary={tutors:{history:[],audit:''}};boundary.tutors.audit='x'.repeat(1048576-Buffer.byteLength(JSON.stringify(boundary)));assert.deepEqual(unpackLessonState(packLessonState(boundary)),boundary);
});
