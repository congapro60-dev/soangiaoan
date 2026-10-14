import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc} from 'firebase/firestore';
import {readFileSync} from 'node:fs';
import {beforeAll,beforeEach,afterAll,it} from 'vitest';
let env:RulesTestEnvironment;
beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-ssm-links',firestore:{rules:readFileSync('firestore.rules','utf8'),host:'127.0.0.1',port:8080}})});
afterAll(async()=>{await env?.cleanup()});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'classes/class'),{teacherId:'teacher',ownerId:'teacher'});await setDoc(doc(ctx.firestore(),'classes/foreign'),{teacherId:'other'});await setDoc(doc(ctx.firestore(),'classMembers/class__co'),{uid:'co',classId:'class',status:'active',role:'co_owner'});})});
const link=(userId='teacher',classId='class')=>({userId,classId,ssmClassId:1,ssmClassName:'Lớp SSM',updatedAt:'now'});
it('UID+document ID+current class membership all bind cloud links',async()=>{
 const teacher=env.authenticatedContext('teacher').firestore();await assertSucceeds(setDoc(doc(teacher,'ssmClassLinks/teacher_class'),link()));
 await assertFails(setDoc(doc(teacher,'ssmClassLinks/victim_class'),link()));await assertFails(setDoc(doc(teacher,'ssmClassLinks/teacher_foreign'),link('teacher','foreign')));
 await assertFails(updateDoc(doc(teacher,'ssmClassLinks/teacher_class'),{classId:'foreign'}));await assertFails(setDoc(doc(teacher,'ssmClassLinks/teacher_class'),{...link(),token:'SECRET'}));
 const co=env.authenticatedContext('co').firestore();await assertSucceeds(setDoc(doc(co,'ssmClassLinks/co_class'),link('co')));await assertFails(getDoc(doc(co,'ssmClassLinks/teacher_class')));
 await env.withSecurityRulesDisabled(async ctx=>{await updateDoc(doc(ctx.firestore(),'classMembers/class__co'),{status:'removed'});});await assertFails(getDoc(doc(co,'ssmClassLinks/co_class')));await assertFails(setDoc(doc(co,'ssmClassLinks/co_class'),link('co')));
});
