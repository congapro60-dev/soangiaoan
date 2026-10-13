import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEvidence } from '../lib/lesson/learning-records.js';
const row=(values={})=>({member_id:'m',session_id:'s',package_hash:'p',task_id:'a',submission_id:'1',objective_code:'LO1',objective_statement:'Mục tiêu',kind:'individual_recheck',level:'must',assessed:1,assisted:0,ok:1,counts_for_mastery:1,submitted_at:1,...values});
test('R15 namespaces objectives; retries/variants one family/session; pending supersedes prior assessment',()=>{
 const summary=summarizeEvidence([row(),row({task_id:'variant:a:2',submission_id:'2',submitted_at:2}),row({package_hash:'other',task_id:'exit',kind:'exit'}),row({session_id:'next',task_id:'different',kind:'exit'})]);
 assert.equal(summary.length,2);assert.equal(summary[0].independentCount,2);assert.equal(summary[1].independentCount,1);
 const pending=summarizeEvidence([row(),row({submission_id:'2',submitted_at:2,assessed:0,ok:0})])[0];
 assert.equal(pending.status,'pending');assert.equal(pending.independentCount,0);assert.equal(pending.pendingCount,1);
});
test('R15 supported, failure, group, Should and recheck remain separate',()=>{
 assert.equal(summarizeEvidence([row({assisted:1})])[0].status,'supported');
 assert.equal(summarizeEvidence([row({ok:0})])[0].status,'needs_support');
 assert.equal(summarizeEvidence([row({kind:'group_product'})])[0].status,'no_evidence');
 assert.equal(summarizeEvidence([row(),row({task_id:'exit',kind:'exit',level:'should'})])[0].status,'standard_mastery');
 assert.equal(summarizeEvidence([row({kind:'exit'}),row({task_id:'other',kind:'exit'})])[0].status,'supported');
});
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createLessonClassService} from '../lib/lesson/class-service.js';
function setup(beforeWrite=()=>{},beforeRead=()=>{}) {
 const database=new DatabaseSync(':memory:');database.exec(`PRAGMA foreign_keys=ON;CREATE TABLE accounts(id TEXT PRIMARY KEY);CREATE TABLE system_hosts(account_id TEXT PRIMARY KEY,revoked_at INTEGER);CREATE TABLE lesson_packages(row_id TEXT PRIMARY KEY,content_hash TEXT,status TEXT,data TEXT);CREATE TABLE rooms(id TEXT PRIMARY KEY,owner_account_id TEXT,deleted_at INTEGER);CREATE TABLE lesson_sessions(id TEXT PRIMARY KEY,room_id TEXT,owner_account_id TEXT,package_row_id TEXT,package_hash TEXT,state TEXT,revision INTEGER,status TEXT);CREATE TABLE lesson_learners(id TEXT PRIMARY KEY,session_id TEXT,learner_id TEXT,name TEXT,token_hash TEXT);INSERT INTO accounts VALUES('owner'),('other');`);
 for(const file of ['0017_lesson_classes.sql','0018_lesson_leagues.sql','0021_lesson_content_deletions.sql','0022_site_trash.sql','0023_r15_learning_records.sql'])for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split('--> statement-breakpoint'))if(sql.trim())database.exec(sql);
 let queries=0,writes=0;const db={prepare:sql=>({bind:(...args)=>({first:async()=>{queries++;beforeRead(sql,database);return database.prepare(sql).get(...args)??null;},all:async()=>{queries++;beforeRead(sql,database);return {results:database.prepare(sql).all(...args)};},run:async()=>{queries++;writes++;beforeWrite(sql,database);return {meta:{changes:Number(database.prepare(sql).run(...args).changes)}};}})}),batch:async statements=>{database.exec('BEGIN');try{const out=[];for(const stmt of statements)out.push(await stmt.run());database.exec('COMMIT');return out;}catch(error){database.exec('ROLLBACK');throw error;}}};
 database.exec("INSERT INTO lesson_classes(id,owner_account_id,code,title,request_id,created_at,updated_at) VALUES('c','owner','CL2345','QA','class-123',1,1)");
 const member=id=>database.prepare('INSERT INTO lesson_class_members(id,class_id,member_code,name,pin_hash,request_id,request_fingerprint,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,'c',id,'Synthetic '+id,'invalid',id,'fingerprint',1,1);member('m');member('empty');
 const pkg={objectives:[{id:'o',code:'LO1',statement:'Mục tiêu'}],tasks:[{id:'a',type:'closed',participation:'individual',branch:'shared'},{id:'exit',type:'closed',participation:'individual',branch:'shared'}],evidenceRules:[{taskId:'a',objectiveIds:['o'],kind:'individual_recheck',individual:true,countsForMastery:true},{taskId:'exit',objectiveIds:['o'],kind:'exit',individual:true,countsForMastery:true}]};
 function session(id='s',hash='hash',mode='live') {
  database.prepare('INSERT OR IGNORE INTO lesson_packages VALUES(?,?,?,?)').run('p-'+hash,hash,'approved',JSON.stringify(pkg));database.prepare('INSERT INTO rooms VALUES(?,?,NULL)').run('r-'+id,'owner');
  const state={mode,passports:{learner:{submissions:[{taskId:'a',submissionId:'one',assessmentStatus:'assessed',ok:true,at:1},{taskId:'exit',submissionId:'two',assessmentStatus:'assessed',ok:true,at:2}],supportHistory:[],revealedTasks:{}}}};
  database.prepare('INSERT INTO lesson_sessions(id,room_id,owner_account_id,package_row_id,package_hash,state,revision,status,class_id) VALUES(?,?,?,?,?,?,1,?,?)').run(id,'r-'+id,'owner','p-'+hash,hash,JSON.stringify(state),'concluded','c');database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,token_hash,class_member_id) VALUES(?,?,?,?,?,?)').run('l-'+id,id,'learner','Synthetic','t-'+id,'m');return state;
 }
 const service=createLessonClassService({db,now:()=>1000});return {database,db,service,member,session,pkg,metrics:()=>({queries,writes}),reset:()=>{queries=0;writes=0;}};
}
const args={ownerAccountId:'owner',classId:'c',memberId:'m'};
test('R15 compact roster is read-only/scoped, all members included; preview/withdrawals/regrade reconcile',async()=>{
 const env=setup(),state=env.session();env.session('preview','hash','preview');await env.service.syncSessionEvidence({...args,sessionId:'preview',memberId:null});assert.equal(env.database.prepare('SELECT count(*) n FROM lesson_class_evidence').get().n,0);
 let data=await env.service.getRecords(args);assert.equal(data.backfillRequired,true);assert.equal(data.members.length,2);assert.equal(data.members[0].objectives.length,0);
 await env.service.backfill(args);data=await env.service.getRecords(args);assert.equal(data.backfillRequired,false);assert.equal(data.members.find(m=>m.id==='m').objectives[0].status,'minimum_mastery');
 env.reset();await env.service.getRecords(args);assert.equal(env.metrics().writes,0);assert.ok(env.metrics().queries<=9);
 for(const wrong of [{...args,ownerAccountId:'other'},{...args,classId:'other'}])await assert.rejects(env.service.getRecords(wrong),/NOT_FOUND/);
 state.passports.learner.submissions.splice(1,1);env.database.prepare('UPDATE lesson_sessions SET state=?,revision=revision+1 WHERE id=?').run(JSON.stringify(state),'s');assert.equal((await env.service.getRecords(args)).members.find(m=>m.id==='m').objectives.length,0);await env.service.backfill(args);assert.equal((await env.service.getRecord(args)).evidence.length,1);
 state.passports.learner.submissions[0].ok=false;env.database.prepare('UPDATE lesson_sessions SET state=?,revision=revision+1 WHERE id=?').run(JSON.stringify(state),'s');await env.service.backfill(args);assert.equal((await env.service.getRecord(args)).objectives[0].status,'needs_support');
 env.database.prepare("INSERT INTO lesson_content_deletions VALUES('package','p-hash','owner',100)").run();assert.equal((await env.service.getRecord(args)).evidence.length,0);await assert.rejects(env.service.syncSessionEvidence({...args,sessionId:'s'}),/NOT_FOUND/);
});
test('R15 plan edit/approve/version/stale/Trash restore and CAS',async()=>{
 const env=setup();env.session();await env.service.backfill(args);let {plan}=await env.service.suggestPlan(args);assert.equal(plan.status,'draft');assert.equal(plan.body.items[0].evidenceIds.length,2);
 ({plan}=await env.service.savePlan({...args,planId:plan.id,revision:plan.revision,body:{...plan.body,teacherNote:'GV sửa'},status:'approved'}));assert.equal(plan.revision,2);assert.equal(env.database.prepare('SELECT count(*) n FROM lesson_learning_plan_versions').get().n,2);
 await assert.rejects(env.service.savePlan({...args,planId:plan.id,revision:1,body:plan.body,status:'approved'}),/PLAN_CONFLICT/);
 const before=JSON.stringify(plan);env.database.exec("UPDATE lesson_sessions SET revision=revision+1 WHERE id='s'");const detail=await env.service.getRecord(args),plans=await env.service.listPlans(args,detail);assert.equal(plans[0].stale,true);assert.equal(plans[0].status,'approved');assert.equal(JSON.stringify(plan),before);
 await assert.rejects(env.service.savePlan({...args,planId:plan.id,revision:2,body:plan.body,status:'approved'}),/STALE_PLAN|EVIDENCE_SNAPSHOT_CHANGED/);
 await env.service.deletePlan({...args,planId:plan.id,revision:2});assert.equal((await env.service.listPlans(args,detail)).length,0);await assert.rejects(env.service.restorePlan({ownerAccountId:'other',id:plan.id}),/NOT_FOUND/);await env.service.restorePlan({ownerAccountId:'owner',id:plan.id});assert.equal((await env.service.listPlans(args,detail))[0].status,'approved');
 env.database.exec("UPDATE lesson_class_members SET revoked_at=2 WHERE id='m'");await assert.rejects(env.service.getRecord(args),/NOT_FOUND/);await assert.rejects(env.service.suggestPlan(args),/NOT_FOUND/);
});
test('R15 approval SQL source guard rejects grading race; empty plans cannot approve',async()=>{
 let armed=false;const env=setup((sql,database)=>{if(armed&&sql.startsWith('UPDATE lesson_learning_plans')){armed=false;database.exec("UPDATE lesson_sessions SET revision=revision+1 WHERE id='s'");}});env.session();await env.service.backfill(args);const {plan}=await env.service.suggestPlan(args);armed=true;await assert.rejects(env.service.savePlan({...args,planId:plan.id,revision:1,body:plan.body,status:'approved'}),/PLAN_CONFLICT/);assert.equal(env.database.prepare('SELECT revision FROM lesson_learning_plans').get().revision,1);
 const empty={...args,memberId:'empty'},draft=await env.service.suggestPlan(empty);await assert.rejects(env.service.savePlan({...empty,planId:draft.plan.id,revision:1,body:{...draft.plan.body,items:[]},status:'approved'}),/INVALID_BODY/);
});
test('R15 150x20 synthetic compact records performance',async()=>{
 const env=setup();env.database.exec('BEGIN');for(let i=0;i<148;i++)env.member('m'+String(i).padStart(3,'0'));for(let j=0;j<20;j++){env.session('session'+j,'hash'+j);env.database.prepare('INSERT INTO lesson_evidence_sync VALUES(?,?,?)').run('session'+j,1,1000);for(const m of env.database.prepare('SELECT id FROM lesson_class_members').all())env.database.prepare('INSERT INTO lesson_class_evidence VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(m.id,'session'+j,'hash'+j,'a','submission'+j,'LO1','Mục tiêu','must','individual_recheck',1,0,1,1,j+1,1000);}env.database.exec('COMMIT');
 const durations=[];let output;for(let i=0;i<10;i++){env.reset();const start=performance.now();output=await env.service.getRecords({...args,limit:50});durations.push(performance.now()-start);assert.equal(env.metrics().writes,0);assert.ok(env.metrics().queries<=9);}assert.equal(output.members.length,50);assert.equal(output.total,150);const p95=durations.sort((a,b)=>a-b)[9],bytes=Buffer.byteLength(JSON.stringify(output));assert.ok(p95<2000);assert.ok(bytes<500000);console.log(JSON.stringify({fixture:'R15 150x20 SQLite synthetic',queries:env.metrics().queries,payloadBytes:bytes,p95Ms:Math.round(p95)}));
});

test('R15 class/member/teacher revocation and date bounds fail closed; stale checkpoints refuse plans',async()=>{
 const env=setup();env.session();await assert.rejects(env.service.suggestPlan(args),/EVIDENCE_SNAPSHOT_CHANGED/);await env.service.backfill(args);
 assert.equal((await env.service.getRecord({...args,from:2,to:2})).evidence.length,1);
 assert.equal((await env.service.getRecords({...args,from:3,to:9})).members.find(m=>m.id==='m').objectives.length,0);
 for(const changes of [{limit:51},{limit:0},{offset:-1},{from:9,to:2}])await assert.rejects(env.service.getRecords({...args,...changes}),/INVALID_QUERY/);
 env.database.exec("INSERT INTO system_hosts VALUES('owner',5)");for(const method of ['getRecords','getRecord','suggestPlan'])await assert.rejects(env.service[method](args),/NOT_FOUND/);
 env.database.exec("DELETE FROM system_hosts;UPDATE lesson_classes SET deleted_at=5");await assert.rejects(env.service.getRecords(args),/NOT_FOUND/);
});
test('R15 detail 500 truncation cannot drive suggestions; summary still uses all latest families',async()=>{
 const env=setup();const state=env.session();state.passports.learner.submissions=Array.from({length:502},(_,i)=>({taskId:i===0?'exit':'a',submissionId:'submission-'+i,assessmentStatus:'assessed',ok:true,at:i+1}));env.database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(state),'s');await env.service.backfill(args);const detail=await env.service.getRecord(args);assert.equal(detail.evidence.length,500);assert.equal(detail.truncated,true);assert.equal(detail.objectives[0].status,'minimum_mastery');await assert.rejects(env.service.suggestPlan(args),/RECORD_TRUNCATED/);
});

test('R15 source change during compact read and partial sync remain invisible until bounded collect',async()=>{
 let armed=false;const env=setup(()=>{},(sql,database)=>{if(armed&&sql.startsWith('SELECT e.*,s.revision')){armed=false;database.exec("UPDATE lesson_sessions SET revision=revision+1 WHERE id='s'");}});env.session();await env.service.backfill(args);armed=true;await assert.rejects(env.service.getRecord(args),/EVIDENCE_SNAPSHOT_CHANGED/);await assert.rejects(env.service.suggestPlan(args),/EVIDENCE_SNAPSHOT_CHANGED/);
 let inserts=0,change=false;const partial=setup((sql,database)=>{if(change&&sql.startsWith('INSERT INTO lesson_class_evidence')&&++inserts===110){change=false;database.exec("UPDATE lesson_sessions SET revision=revision+1 WHERE id='s'");}}),state=partial.session();state.passports.learner.submissions=Array.from({length:130},(_,i)=>({taskId:'a',submissionId:'sub-'+i,assessmentStatus:'assessed',ok:true,at:i+1}));partial.database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(state),'s');change=true;await assert.rejects(partial.service.backfill(args),/EVIDENCE_SNAPSHOT_CHANGED/);assert.equal((await partial.service.getRecords(args)).members.find(m=>m.id==='m').objectives.length,0);await partial.service.backfill(args);assert.equal((await partial.service.getRecord(args)).evidence.length,130);
});
test('R15 no-evidence pupil gets approved diagnostic; mastery gets literal approved extension with namespace',async()=>{
 const env=setup();env.pkg.tasks[0].prompt='Tính $u_2$ từ quy luật đã cho.';env.pkg.tasks[1].prompt='Giải thích cách kiểm tra kết quả.';env.pkg.tasks.push({id:'extend',type:'open',participation:'individual',branch:'extension',prompt:'So sánh hai mô hình $u_n$ đã học.'});env.pkg.evidenceRules.push({taskId:'extend',objectiveIds:['o'],kind:'individual_reasoning',individual:true,countsForMastery:false});env.pkg.activities=[{id:'approved-activity',minutes:6,taskIds:['a','exit','extend']}];env.session();await env.service.backfill(args);
 const emptyArgs={...args,memberId:'empty'},missing=await env.service.suggestPlan(emptyArgs);assert.equal(missing.plan.body.items.length,1);assert.match(missing.plan.body.items[0].activity,/Tính \$u_2\$/);assert.deepEqual(missing.plan.body.items[0].evidenceIds,[]);await env.service.savePlan({...emptyArgs,planId:missing.plan.id,revision:1,status:'approved',body:missing.plan.body});
 const achieved=await env.service.suggestPlan(args);assert.match(achieved.plan.body.items[0].activity,/So sánh hai mô hình \$u_n\$/);assert.match(achieved.plan.body.items[0].recheck,/Tính \$u_2\$/);
 env.session('other','different');await env.service.backfill({...args,cursor:'s'});const namespaced=await env.service.suggestPlan(emptyArgs);assert.equal(namespaced.plan.body.items.length,2);assert.notEqual(namespaced.plan.body.items[0].objectiveKey,namespaced.plan.body.items[1].objectiveKey);
 env.database.exec("INSERT INTO lesson_content_deletions VALUES('package','p-hash','owner',100)");assert.equal((await env.service.listPlans(emptyArgs)).find(p=>p.id===missing.plan.id).stale,true);await assert.rejects(env.service.savePlan({...emptyArgs,planId:missing.plan.id,revision:2,status:'approved',body:missing.plan.body}),/STALE_PLAN/);
});

test('R15 plan approved material selection preserves pending, supported, class isolation and missing-task fallback',async()=>{
 const env=setup();env.pkg.tasks[0].prompt='Kiểm tra lại cá nhân đã duyệt.';env.pkg.tasks[1].prompt='Bài thoát đã duyệt.';env.pkg.activities=[{id:'activity',minutes:4,taskIds:['a','exit']}];const state=env.session();state.passports.learner.submissions[0].assisted=true;state.passports.learner.submissions.splice(1,1);env.database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(state),'s');await env.service.backfill(args);let {plan}=await env.service.suggestPlan(args);assert.match(plan.body.items[0].activity,/Kiểm tra lại cá nhân đã duyệt/);
 state.passports.learner.submissions[0].assessmentStatus='pending';env.database.prepare('UPDATE lesson_sessions SET state=?,revision=revision+1 WHERE id=?').run(JSON.stringify(state),'s');await env.service.backfill(args);({plan}=await env.service.suggestPlan(args));assert.match(plan.body.items[0].activity,/GV chấm minh chứng/);assert.doesNotMatch(plan.body.items[0].activity,/Kiểm tra lại cá nhân đã duyệt/);
 const emptyArgs={...args,memberId:'empty'},missing=await env.service.suggestPlan(emptyArgs);env.database.exec("UPDATE lesson_sessions SET revision=revision+1 WHERE id='s'");assert.equal((await env.service.listPlans(emptyArgs)).find(p=>p.id===missing.plan.id).stale,false,'unrelated learner source revision does not stale known-package diagnostic');
 env.database.exec("UPDATE lesson_packages SET status='draft'");const noKnown=await env.service.suggestPlan(emptyArgs);assert.equal(noKnown.plan.body.items.length,0);await assert.rejects(env.service.savePlan({...emptyArgs,planId:noKnown.plan.id,revision:1,body:noKnown.plan.body,status:'approved'}),/INVALID_BODY/);
});
test('R15 missing-evidence plan class material guard rejects withdrawal during approval SQL',async()=>{
 let armed=false;const env=setup((sql,database)=>{if(armed&&sql.startsWith('UPDATE lesson_learning_plans')){armed=false;database.exec("UPDATE lesson_packages SET status='draft'");}});env.pkg.tasks[0].prompt='Kiểm tra cá nhân.';env.pkg.activities=[{id:'a',minutes:3,taskIds:['a']}];env.session();const emptyArgs={...args,memberId:'empty'},{plan}=await env.service.suggestPlan(emptyArgs);armed=true;await assert.rejects(env.service.savePlan({...emptyArgs,planId:plan.id,revision:1,body:plan.body,status:'approved'}),/PLAN_CONFLICT/);assert.equal(env.database.prepare('SELECT status FROM lesson_learning_plans WHERE id=?').get(plan.id).status,'draft');
});
test('R15 literal task options preserved; unrelated/overlong tasks do not enter approved plan',async()=>{
 const env=setup();env.pkg.tasks[0].prompt='Chọn số đúng.';env.pkg.tasks[0].inputSchema={options:[{id:'one',label:'$1$'},{id:'two',label:'$2$'}]};env.pkg.tasks[1].prompt='x'.repeat(1600);env.pkg.activities=[{id:'act',minutes:3,taskIds:['a','exit']}];env.session();const emptyArgs={...args,memberId:'empty'},draft=await env.service.suggestPlan(emptyArgs);assert.match(draft.plan.body.items[0].activity,/Chọn số đúng\.\n\$1\$ · \$2\$/);assert.match(draft.plan.body.items[0].recheck,/\$1\$ · \$2\$/);assert.ok(draft.plan.body.items[0].activity.length<=1500);assert.ok(draft.plan.body.items[0].recheck.length<=1000);await env.service.savePlan({...emptyArgs,planId:draft.plan.id,revision:1,body:draft.plan.body,status:'approved'});
});
