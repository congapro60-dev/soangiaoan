import {nativeVmModule} from './helpers/vm-native.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { createLessonService, validateSessionBody } from '../lib/lesson/service.js';
import { createLessonClassService } from '../lib/lesson/class-service.js';
import { createLessonDeviceService } from '../lib/lesson/device-service.js';
import { recommendTeacherSetup } from '../lib/lesson/teacher-setup.js';
import { pilotDraft } from '../lib/lesson/director.js';
const fixture=JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url),'utf8'));
function setup(beforeWrite = () => {}) {
  const database = new DatabaseSync(':memory:'); database.exec('PRAGMA foreign_keys=ON');
  const journal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')).entries;
  const migrations = [...journal.map(entry => entry.tag + '.sql'), ...['0018_lesson_leagues.sql', '0019_lesson_devices.sql'].filter(file => !journal.some(entry => entry.tag + '.sql' === file))];
  for (const file of migrations) for (const sql of readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8').split('--> statement-breakpoint')) if (sql.trim()) database.exec(sql);
  for (const id of ['owner-1', 'other']) database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(id, id + '@test', id, 1);
  const prepare = sql => ({ bind: (...args) => {
    // D1 allows at most 100 bound parameters per query; SQLite alone allows more.
    if(args.length>100)throw Error('D1_BOUND_PARAMETER_LIMIT');
    return { first: async () => { if (/^(UPDATE|INSERT|DELETE)/.test(sql)) beforeWrite(sql, database); return database.prepare(sql).get(...args) ?? null; }, all: async () => ({ results: database.prepare(sql).all(...args) }), run: async () => { beforeWrite(sql, database); return { meta: { changes: Number(database.prepare(sql).run(...args).changes) } }; } };
  } });
  let tail = Promise.resolve();
  const db = { prepare, batch: statements => { const result = tail.then(async () => { database.exec('BEGIN'); try { const out = []; for (const statement of statements) out.push(await statement.run()); database.exec('COMMIT'); return out; } catch (error) { database.exec('ROLLBACK'); throw error; } }); tail = result.catch(() => {}); return result; } };
  const clock = { t: 1_000_000 };
  return { database, db, clock, service: createLessonService({ db, now: () => clock.t }), classes: createLessonClassService({ db, now: () => clock.t }), devices: createLessonDeviceService({ db, now: () => clock.t }) };
}
const owner='owner-1';
async function prepare(env,deviceMode='B') {
 const {class:cls}=await env.classes.createClass({ownerAccountId:owner,title:'Synthetic launch',requestId:'launch-class'});
 const members=[];for(let i=0;i<3;i++)members.push(await env.classes.addMember({ownerAccountId:owner,classId:cls.id,name:'Synthetic pupil '+i,requestId:'member-'+i}));
 const saved=await env.service.savePackage({ownerAccountId:owner,package:structuredClone(fixture)});
 const approved=await env.service.approvePackage({actorAccountId:owner,id:saved.row.rowId,parentHash:saved.row.contentHash,version:'1.0.1',sourceReviewAck:fixture.sourceRefs.map(s=>({...s,numericReviewConfirmed:true}))});
 const draft=pilotDraft({package:{...approved.package,rowId:approved.row.rowId}});
 const plan=await env.service.approvePlan({actorAccountId:owner,packageRowId:approved.row.rowId,packageVersion:approved.row.version,packageHash:approved.row.contentHash,planHash:draft.plan.contentHash,sourceReview:approved.package.sourceRefs});
 const input={ownerAccountId:owner,packageRowId:approved.row.rowId,packageVersion:approved.row.version,packageHash:approved.row.contentHash,planRowId:plan.row.rowId,planHash:plan.row.planHash,mode:'live',title:'Synthetic attendance',requestId:'launch',classId:cls.id,classMemberIds:members.slice(0,2).map(m=>m.member.id),teacherSetup:{...recommendTeacherSetup(fixture),worldTheme:'historical',deviceMode}};
 return {cls,members,approved,plan,input};
}
async function event(env,created,type,payload={}){
 const current=await env.service.getSession({id:created.session.id,accountId:owner});
 return env.service.event({sessionId:created.session.id,accountId:owner,event:{type,payload,eventId:type+'-'+current.revision,round:current.view.round,revision:current.revision,...(type==='TEACHER_RESPONSE'?{activityId:current.view.timeline.currentActivityId}:{})}});
}

test('B/C launch requires owned class and explicit valid present members, with no partial rooms',async()=>{
 const env=setup();try{
 const data=await prepare(env);
 for(const deviceMode of ['B','C'])for(const edit of [{classId:undefined,classMemberIds:undefined},{classMemberIds:[]},{classMemberIds:undefined}])await assert.rejects(()=>env.service.createSession({...data.input,...edit,teacherSetup:{...data.input.teacherSetup,deviceMode}}),/CLASS_ATTENDANCE_REQUIRED/);
 for(const ids of [['missing'],[data.members[0].member.id,data.members[0].member.id],[null],[''],[1],Array.from({length:151},(_,i)=>'x'+i)])await assert.rejects(()=>env.service.createSession({...data.input,classMemberIds:ids}),/INVALID_CLASS_MEMBERS/);
 const {class:other}=await env.classes.createClass({ownerAccountId:owner,title:'Other class',requestId:'other-class'}),foreign=await env.classes.addMember({ownerAccountId:owner,classId:other.id,name:'Other pupil',requestId:'other-member'});
 await assert.rejects(()=>env.service.createSession({...data.input,classMemberIds:[foreign.member.id]}),/INVALID_CLASS_MEMBERS/);
 await env.classes.revokeMember({ownerAccountId:owner,classId:data.cls.id,memberId:data.members[0].member.id});
 await assert.rejects(()=>env.service.createSession(data.input),/INVALID_CLASS_MEMBERS|FORBIDDEN/);
 await assert.rejects(()=>env.service.createSession({...data.input,ownerAccountId:'other',classMemberIds:[data.members[1].member.id]}),/FORBIDDEN|NOT_FOUND/);
 for(const table of ['rooms','lesson_sessions','lesson_learners','room_memberships'])assert.equal(env.database.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
 }finally{env.database.close();}
});

test('selected roster persists atomically, replay fingerprints attendance and approved content stays unchanged',async()=>{
 const env=setup();try{
 const data=await prepare(env),before=env.database.prepare('SELECT data,content_hash FROM lesson_packages WHERE row_id=?').get(data.approved.row.rowId),planBefore=env.database.prepare('SELECT data,plan_hash FROM lesson_session_plans WHERE row_id=?').get(data.plan.row.rowId);
 const created=await env.service.createSession(data.input),teacher=(await env.service.getSession({id:created.session.id,accountId:owner})).view;
 const bound=env.database.prepare('SELECT learner_id,class_member_id,name FROM lesson_learners WHERE session_id=?').all(created.session.id);
 assert.equal(bound.length,2);assert.deepEqual(bound.map(r=>r.class_member_id).sort(),data.input.classMemberIds.toSorted());assert.deepEqual(Object.keys(teacher.roster).sort(),bound.map(r=>r.learner_id).sort());assert.ok(Object.values(teacher.roster).every(r=>r.present===true));
 assert.equal(teacher.worldTheme,'historical');assert.equal(teacher.deviceMode,'B');
 const replay=await env.service.createSession(data.input);assert.equal(replay.replay,true);assert.equal(replay.session.id,created.session.id);assert.equal(env.database.prepare('SELECT COUNT(*) n FROM lesson_learners').get().n,2);
 await assert.rejects(()=>env.service.createSession({...data.input,classMemberIds:[data.members[2].member.id]}),/REQUEST_ID_CONFLICT/);
 assert.deepEqual(env.database.prepare('SELECT data,content_hash FROM lesson_packages WHERE row_id=?').get(data.approved.row.rowId),before);assert.deepEqual(env.database.prepare('SELECT data,plan_hash FROM lesson_session_plans WHERE row_id=?').get(data.plan.row.rowId),planBefore);
 const member=data.members[0],profile=await env.classes.joinClass({classCode:data.cls.code,memberCode:member.member.code,pin:member.pin}),token=randomBytes(32).toString('base64url');
 const joined=await env.service.joinSession({code:created.session.code,name:'FORGED NAME',classToken:profile.token,token});
 assert.equal(joined.learnerId,bound.find(r=>r.class_member_id===member.member.id).learner_id);assert.equal(env.database.prepare('SELECT COUNT(*) n FROM lesson_learners').get().n,2);assert.equal(joined.projection.teacherSetup,undefined);assert.equal(joined.projection.roster,undefined);
 await env.classes.revokeMember({ownerAccountId:owner,classId:data.cls.id,memberId:member.member.id});await assert.rejects(()=>env.service.createSession(data.input),/INVALID_CLASS_MEMBERS/);
 }finally{env.database.close();}
});

test('150 prepared pupils fit the D1 query parameter ceiling',async()=>{
 const env=setup();try{
 const data=await prepare(env,'C'),ids=data.members.map(m=>m.member.id);
 // Synthetic pupils have deliberately unusable PIN hashes; this is attendance, not login QA.
 const add=env.database.prepare('INSERT INTO lesson_class_members(id,class_id,member_code,name,pin_hash,request_id,request_fingerprint,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)');
 for(let i=3;i<150;i++){const id='synthetic-member-'+i;add.run(id,data.cls.id,String(i).padStart(6,'0'),'Synthetic pupil '+i,'unusable-synthetic-hash','bulk-'+i,'synthetic-fingerprint',1,1);ids.push(id);}
 const created=await env.service.createSession({...data.input,classMemberIds:ids});assert.equal(env.database.prepare('SELECT COUNT(*) n FROM lesson_learners WHERE session_id=?').get(created.session.id).n,150);
 assert.equal(Object.keys((await env.service.getSession({id:created.session.id,accountId:owner})).view.roster).length,150);
 }finally{env.database.close();}
});

test('teacher can issue B device and record C board response without student-owned logins',async()=>{
 for(const mode of ['B','C']){
 const env=setup();try{
 const data=await prepare(env,mode),created=await env.service.createSession(data.input);await event(env,created,'START');
 const bound=env.database.prepare('SELECT learner_id FROM lesson_learners WHERE session_id=?').all(created.session.id).map(r=>r.learner_id);
 if(mode==='B'){
 const issued=await env.devices.issueDevice({accountId:owner,sessionId:created.session.id,kind:'B',memberIds:bound,requestId:'device'});
 const own=await env.service.getSession({id:created.session.id,learnerToken:issued.token,actingLearnerId:bound[1]});assert.equal(own.view.passport.learnerId,bound[1]);assert.equal(own.view.roster,undefined);
 await assert.rejects(()=>env.service.getSession({id:created.session.id,learnerToken:issued.token}),/DEVICE_UNAVAILABLE/);
 }else{
 const task=fixture.tasks.find(t=>t.activityId===fixture.activities[0].id&&t.participation!=='group');
 const result=await event(env,created,'TEACHER_RESPONSE',{learnerId:bound[0],taskId:task.id,answer:String(task.evaluation.answerKey)}),sub=result.view.submissions[result.result.submissionId];
 assert.equal(result.result.pending,true);assert.equal(sub.assisted,true);assert.equal(sub.recordedBy,owner);assert.equal(sub.assessmentStatus,'pending');
 await assert.rejects(()=>env.devices.authorizeBoardResponse({accountId:'other',sessionId:created.session.id,learnerId:bound[0],taskId:task.id,answer:'x'}),/FORBIDDEN/);
 }
 assert.equal(env.database.prepare('SELECT COUNT(*) n FROM lesson_class_login_sessions').get().n,0);
 }finally{env.database.close();}
 }
});

test('member revocation between precheck and batch cannot create a partially enrolled room',async()=>{
 let armed=false;
 const env=setup((sql,db)=>{if(armed&&sql.startsWith('INSERT INTO rooms')){armed=false;db.exec('UPDATE lesson_class_members SET revoked_at=1');}});try{
 const data=await prepare(env);armed=true;await assert.rejects(()=>env.service.createSession(data.input),/FORBIDDEN/);
 for(const table of ['rooms','lesson_sessions','lesson_learners','room_memberships'])assert.equal(env.database.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
 }finally{env.database.close();}
});

test('create boundary enforces exact keys, own required fields and flat bounded attendance IDs',()=>{
 const good={action:'create',packageRowId:'pkg',mode:'preview',title:'QA',requestId:'id',classId:'class',classMemberIds:['member']};
 validateSessionBody(good);
 for(const patch of [{admin:true},{classMemberIds:'member'},{classMemberIds:['x','x']},{classMemberIds:[false]},{classMemberIds:[[]]},{classMemberIds:[{}]},{classMemberIds:['']},{classMemberIds:['x'.repeat(129)]},{classMemberIds:Array.from({length:151},(_,i)=>'m'+i)},{classId:undefined}])assert.throws(()=>validateSessionBody({...good,...patch}),/INVALID_BODY/);
 for(const body of [Object.assign(Object.create({forged:true}),good),Object.create(good),Object.assign(Object.create(null),good)])assert.throws(()=>validateSessionBody(body),/INVALID_BODY/);
 for(const key of ['action','packageRowId','mode','title','requestId']){const missing={...good};delete missing[key];assert.throws(()=>validateSessionBody(missing),/INVALID_BODY/);}
});

async function publicRoute(env){
 const context=createContext({structuredClone,crypto:globalThis.crypto,Request,Response,URL,TextEncoder,console}),cache=new Map();
 const moduleAt=async path=>{if(cache.has(path))return cache.get(path);const mod=path===resolve('lib/storage.js')?new SyntheticModule(['stmt','db','getEnv'],function(){this.setExport('stmt',(sql,...args)=>env.db.prepare(sql).bind(...args));this.setExport('db',()=>env.db);this.setExport('getEnv',()=>({}));},{context,identifier:path}):new SourceTextModule(readFileSync(path,'utf8'),{context,identifier:path});cache.set(path,mod);return mod;};
 const api=await moduleAt(resolve('app/api/escape/route.js'));await api.link((name,parent)=>name.startsWith('node:')?nativeVmModule(name,context):moduleAt(resolve(dirname(parent.identifier),name)));await api.evaluate();return api.namespace;
}
test('public room lookup exposes only whether class profile is needed, never roster or setup',async()=>{
 const env=setup();try{
 const data=await prepare(env),created=await env.service.createSession(data.input),api=await publicRoute(env);
 const ask=async code=>{const response=await api.POST(new Request('https://game.test/api/escape',{method:'POST',headers:{'content-type':'application/json',origin:'https://game.test'},body:JSON.stringify({action:'room-info',code})}));return {status:response.status,data:await response.json()};};
 const found=await ask(created.session.code);assert.equal(found.status,200);assert.equal(found.data.kind,'lesson');assert.equal(found.data.needsProfile,true);assert.equal(found.data.joinPath,'/play');assert.doesNotMatch(JSON.stringify(found.data),/Synthetic pupil|memberIds|roster|teacherSetup|token|pin|answerKey|owner_account_id/);
 const plain=await env.service.createSession({...data.input,requestId:'plain',classId:undefined,classMemberIds:undefined,teacherSetup:{...data.input.teacherSetup,deviceMode:'A'}});assert.equal((await ask(plain.session.code)).data.needsProfile,false);
 }finally{env.database.close();}
});

