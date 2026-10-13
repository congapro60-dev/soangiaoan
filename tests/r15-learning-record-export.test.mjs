import test from 'node:test';
import assert from 'node:assert/strict';
import {exportLearningRecords,csvCell,learningRecordsCsv} from '../lib/lesson/learning-record-export.js';
const row={evidenceId:'source-id',sessionId:'session',packageHash:'hash',taskId:'task',submissionId:'submission',objectiveCode:'LO1',objectiveStatement:'$x^2$',kind:'exit',level:'must',assessed:false,assisted:true,ok:null,countsForMastery:true,submittedAt:100,revision:3};
function api(){return {getClassSourceSnapshot:async()=> 'snapshot',getRecords:async()=>({members:[{id:'member'}],offset:0,limit:50,total:150,backfillRequired:false}),getRecord:async()=>({member:{id:'member',code:'CODE',name:'=2+3'},evidence:[row],truncated:false})};}
test('export compact source namespace stable ID revision, no private fields, bounded page',async()=>{
 const one=await exportLearningRecords(api(),{classId:'class',ownerAccountId:'owner'},{now:()=>1000}),two=await exportLearningRecords(api(),{classId:'class',ownerAccountId:'owner'},{now:()=>2000});
 assert.equal(one.nextOffset,50);assert.equal(one.members[0].evidence[0].ok,null);assert.match(one.members[0].evidence[0].evidenceId,/^[a-f0-9]{64}$/);assert.equal(one.members[0].evidence[0].evidenceId,two.members[0].evidence[0].evidenceId);assert.equal(/"(?:ownerAccountId|token|pin|pin_hash|answer|teacherNote)":/.test(JSON.stringify(one)),false);
 assert.match(learningRecordsCsv(one),/"'=2\+3"/);
});
test('export refuses stale/incomplete snapshots or truncated detail',async()=>{
 const stale=api();stale.getRecords=async()=>({backfillRequired:true});await assert.rejects(()=>exportLearningRecords(stale,{classId:'class'}),/EVIDENCE_SNAPSHOT_CHANGED/);
 const large=api();large.getRecord=async()=>({member:{id:'member'},evidence:[],truncated:true});await assert.rejects(()=>exportLearningRecords(large,{classId:'class'}),/EXPORT_TOO_LARGE/);
 const changed=api();let calls=0;changed.getRecord=async()=>({member:{id:'member'},evidence:[{...row,revision:++calls}],truncated:false});await assert.rejects(()=>exportLearningRecords(changed,{classId:'class'}),/EVIDENCE_SNAPSHOT_CHANGED/);
 const mixed=api();let snapshots=0;mixed.getClassSourceSnapshot=async()=>String(++snapshots);await assert.rejects(()=>exportLearningRecords(mixed,{classId:'class'}),/EVIDENCE_SNAPSHOT_CHANGED/);
});
test('CSV neutralizes formula prefixes after whitespace/control, preserves quotes/newline',()=>{
 for(const value of ['=1',' +SUM(A1)','\t@x','-1'])assert.ok(csvCell(value).startsWith('"\''));
 assert.equal(csvCell('một "câu"\nhai'),'"một ""câu""\nhai"');
});
test('export cannot give group/discovery/game evidence mastery eligibility',async()=>{
 for(const kind of ['group_product','discovery','game_star']){
  const source=api();source.getRecord=async()=>({member:{id:'member'},evidence:[{...row,kind,countsForMastery:true}],truncated:false});
  const bundle=await exportLearningRecords(source,{classId:'class'});assert.equal(bundle.members[0].evidence[0].countsForMastery,false);
 }
});
