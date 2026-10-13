import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {recommendTeacherSetup,normalizeTeacherSetup,teacherSetupAvailability,EVENT_LABELS} from '../lib/lesson/teacher-setup.js';
import {createLessonService,validateSessionBody} from '../lib/lesson/service.js';
import {CLASS_EVENT_TYPES} from '../lib/lesson/class-events.js';
import {pilotDraft} from '../lib/lesson/director.js';
const pkg=JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url)));
function realDb() {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys=ON');
  database.exec(`
    CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,display_name TEXT,created_at INTEGER NOT NULL);
    CREATE TABLE rooms(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,admin_hash TEXT NOT NULL,title TEXT NOT NULL,created INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 0,mode TEXT NOT NULL,owner_account_id TEXT,deleted_at INTEGER);
    CREATE TABLE room_memberships(room_id TEXT NOT NULL,account_id TEXT NOT NULL,role TEXT NOT NULL,granted_at INTEGER NOT NULL,granted_by TEXT,revoked_at INTEGER,UNIQUE(room_id,account_id));
    CREATE TABLE system_hosts(account_id TEXT PRIMARY KEY,role TEXT NOT NULL,created_at INTEGER NOT NULL,revoked_at INTEGER);
    CREATE TABLE admin_audit(id TEXT PRIMARY KEY,actor_account_id TEXT,room_id TEXT,action TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL);
     CREATE TABLE lesson_packages(row_id TEXT PRIMARY KEY,owner_account_id TEXT NOT NULL,package_id TEXT NOT NULL,version TEXT NOT NULL,content_hash TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,parent_row_id TEXT,created_at INTEGER NOT NULL,UNIQUE(owner_account_id,package_id,version),UNIQUE(row_id,version,content_hash));
     CREATE TABLE lesson_approvals(id TEXT PRIMARY KEY,package_row_id TEXT NOT NULL,actor_account_id TEXT NOT NULL,reviewed_parent_hash TEXT NOT NULL,approved_hash TEXT NOT NULL,source_ack TEXT NOT NULL,created_at INTEGER NOT NULL);
      CREATE TABLE lesson_session_plans(row_id TEXT PRIMARY KEY,owner_account_id TEXT NOT NULL,package_row_id TEXT NOT NULL,package_version TEXT NOT NULL,package_hash TEXT NOT NULL,plan_hash TEXT NOT NULL,data TEXT NOT NULL,source_review TEXT NOT NULL,approved_by TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(row_id,plan_hash,package_row_id,package_version,package_hash),FOREIGN KEY(package_row_id,package_version,package_hash) REFERENCES lesson_packages(row_id,version,content_hash));
      CREATE TABLE lesson_sessions(id TEXT PRIMARY KEY,room_id TEXT UNIQUE NOT NULL,package_row_id TEXT NOT NULL,package_version TEXT NOT NULL,package_hash TEXT NOT NULL,plan_row_id TEXT,plan_hash TEXT,owner_account_id TEXT NOT NULL,request_id TEXT,request_fingerprint TEXT,state TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL,mutation_nonce TEXT NOT NULL,presenter_token_hash TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(owner_account_id,request_id),FOREIGN KEY(package_row_id,package_version,package_hash) REFERENCES lesson_packages(row_id,version,content_hash),FOREIGN KEY(plan_row_id,plan_hash,package_row_id,package_version,package_hash) REFERENCES lesson_session_plans(row_id,plan_hash,package_row_id,package_version,package_hash));
    CREATE TABLE lesson_learners(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,learner_id TEXT NOT NULL,name TEXT NOT NULL,name_key TEXT NOT NULL,token_hash TEXT UNIQUE NOT NULL,present INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,UNIQUE(session_id,learner_id),UNIQUE(session_id,name_key));
     CREATE TABLE lesson_event_receipts(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,actor_key TEXT NOT NULL,event_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(session_id,actor_key,event_id));
     CREATE TRIGGER lesson_session_plans_immutable_update BEFORE UPDATE ON lesson_session_plans BEGIN SELECT RAISE(ABORT, 'lesson_session_plans are immutable'); END;
     CREATE TRIGGER lesson_session_plans_immutable_delete BEFORE DELETE ON lesson_session_plans BEGIN SELECT RAISE(ABORT, 'lesson_session_plans are immutable'); END;
  `);
  const prepare = sql => ({ bind: (...values) => { const statement = database.prepare(sql); return { first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) }; } });
  // D1 executes a batch atomically; serialize batches so overlapping callers cannot nest BEGIN.
  let batchTail = Promise.resolve();
  const runBatch = async statements => { database.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); database.exec('COMMIT'); return results; } catch (error) { database.exec('ROLLBACK'); throw error; } };
  const db = { prepare, batch: statements => { const result = batchTail.then(() => runBatch(statements)); batchTail = result.catch(() => {}); return result; } };
  return { db, database };
}

test('recommendation respects actual groups, whole-class is not group, events need usable reserve',()=>{
 const cramped={...pkg,activities:Array.from({length:100},(_,i)=>({id:'a'+i,phase:i===0?'formation':'exit'}))};assert.equal(recommendTeacherSetup(cramped).explorationEnabled,false);
 assert.equal(recommendTeacherSetup(pkg).participation,'group');
 const solo={...pkg,tasks:pkg.tasks.map(t=>({...t,participation:'whole_class'}))};assert.equal(recommendTeacherSetup(solo).participation,'individual');
 assert.equal(recommendTeacherSetup({...pkg,budget:{reserveMinutes:2}}).event.type,'none');
 assert.equal(teacherSetupAvailability({...pkg,tasks:pkg.tasks.map(t=>({...t,type:'open'})),budget:{reserveMinutes:5}}).eventAvailable,false);
 assert.deepEqual(Object.keys(EVENT_LABELS).filter(id=>id!=='none'),CLASS_EVENT_TYPES);
 assert.equal(recommendTeacherSetup(pkg).aiPolicy,'off');
});
test('strict setup boundary rejects forged keys, prototypes, IDs and excessive budget',()=>{
 const good=recommendTeacherSetup(pkg);assert.deepEqual(normalizeTeacherSetup(good,pkg),good);
 for(const edit of [{admin:true},{rule:'constructor'},{rule:['campaign']},{participation:'whole_class'},{integrationIds:['__proto__']},{integrationIds:['ai','ai']},{event:{type:'buzzer',minutes:5}},{event:{type:'none',minutes:3,autoOpen:true}},{aiPolicy:'answers'}])assert.throws(()=>normalizeTeacherSetup({...good,...edit},pkg),/INVALID_TEACHER_SETUP/);
 assert.throws(()=>normalizeTeacherSetup(Object.assign(Object.create({admin:true}),good),pkg),/INVALID_TEACHER_SETUP/);
});
test('world and device choices accept canonical values; legacy seven fields stay unchanged',()=>{
 const good=recommendTeacherSetup(pkg);assert.equal(good.worldTheme,'modern');assert.equal(good.deviceMode,'A');
 const legacy={...good};delete legacy.worldTheme;delete legacy.deviceMode;
 assert.equal(Object.keys(legacy).length,7);assert.deepEqual(normalizeTeacherSetup(legacy,pkg),legacy);
 assert.deepEqual(normalizeTeacherSetup({...legacy,worldTheme:undefined,deviceMode:undefined},pkg),legacy);
 for(const edit of [{worldTheme:'__proto__'},{worldTheme:'constructor'},{worldTheme:'history'},{worldTheme:[]},{deviceMode:'D'},{deviceMode:'a'},{deviceMode:null}])assert.throws(()=>normalizeTeacherSetup({...good,...edit},pkg),/INVALID_TEACHER_SETUP/);
 for(const deviceMode of ['A','B','C'])assert.equal(normalizeTeacherSetup({...good,worldTheme:'historical',deviceMode},pkg).deviceMode,deviceMode);
});
test('atomic create stores setup, fingerprints changes, owner authorization, GET never reapplies',async()=>{
 const {db,database}=realDb();try{
 database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1','owner@example.invalid','Owner',1);
 const service=createLessonService({db,now:()=>1000}),saved=await service.savePackage({ownerAccountId:'owner-1',package:structuredClone(pkg)});
 const setup={...recommendTeacherSetup(pkg),rule:'treasure',participation:'individual'};delete setup.worldTheme;delete setup.deviceMode;
 const input={ownerAccountId:'owner-1',packageRowId:saved.row.rowId,mode:'preview',title:'Setup',requestId:'setup',teacherSetup:setup};
 validateSessionBody({action:'create',packageRowId:saved.row.rowId,mode:'preview',title:'Setup',requestId:'setup',teacherSetup:setup});
 const created=await service.createSession(input);assert.equal((await service.createSession(input)).replay,true);
 await assert.rejects(()=>service.createSession({...input,teacherSetup:{...setup,revisitEnabled:false}}),/REQUEST_ID_CONFLICT/);
 await assert.rejects(()=>service.createSession({...input,ownerAccountId:'intruder',requestId:'forged'}),/FORBIDDEN/);
 await assert.rejects(()=>service.createSession({...input,requestId:'bad',teacherSetup:{...setup,unknown:true}}),/INVALID_TEACHER_SETUP/);
 assert.equal(database.prepare('SELECT COUNT(*) n FROM lesson_sessions').get().n,1);
 const read=()=>JSON.parse(database.prepare('SELECT state FROM lesson_sessions WHERE id=?').get(created.session.id).state);
 const initial=read();assert.deepEqual(initial.teacherSetup,setup);assert.equal(initial.modeParticipation,'individual');assert.equal(initial.exploration.enabled,true);assert.equal(initial.exploration.openedAtActiveMs,null);assert.equal(initial.classEvent,undefined);
 initial.aiPolicy='check';initial.revisitEnabled=false;initial.lessonIntegrations=[];database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(initial),created.session.id);
 const view=await service.getSession({id:created.session.id,accountId:'owner-1'});assert.equal(view.view.aiPolicy,'check');assert.equal(view.view.revisitEnabled,false);assert.deepEqual(read().lessonIntegrations,[]);
 await service.event({sessionId:created.session.id,accountId:'owner-1',event:{type:'START',payload:{},eventId:'start',round:initial.round,revision:initial.revision}});assert.equal(read().lessonMode,undefined,'unapproved preview has no game engine');
 }finally{database.close();}
});
test('approved room starts selected rule and keeps setup private; legacy room stays unset',async()=>{
 const {db,database}=realDb();try{
 database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1','owner@example.invalid','Owner',1);
 const service=createLessonService({db,now:()=>1000}),saved=await service.savePackage({ownerAccountId:'owner-1',package:structuredClone(pkg)});
 const approved=await service.approvePackage({actorAccountId:'owner-1',id:saved.row.rowId,parentHash:saved.row.contentHash,version:'1.0.1',sourceReviewAck:pkg.sourceRefs.map(s=>({...s,numericReviewConfirmed:true}))});
 const draft=pilotDraft({package:{...approved.package,rowId:approved.row.rowId}});
 const plan=await service.approvePlan({actorAccountId:'owner-1',packageRowId:approved.row.rowId,packageVersion:approved.row.version,packageHash:approved.row.contentHash,planHash:draft.plan.contentHash,sourceReview:approved.package.sourceRefs});
 const input={ownerAccountId:'owner-1',packageRowId:approved.row.rowId,packageVersion:approved.row.version,packageHash:approved.row.contentHash,planRowId:plan.row.rowId,planHash:plan.row.planHash,mode:'live',title:'Setup',requestId:'live',teacherSetup:{...recommendTeacherSetup(pkg),worldTheme:'historical',rule:'treasure',participation:'individual'}};
 const approvedBefore=database.prepare('SELECT data,plan_hash FROM lesson_session_plans WHERE row_id=?').get(plan.row.rowId);
 await assert.rejects(()=>service.createSession({...input,packageHash:'stale'}),/PACKAGE_TUPLE_MISMATCH/);
 const room=await service.createSession(input);await service.joinSession({code:room.session.code,name:'A',token:'A'.repeat(43)});
 let view=(await service.getSession({id:room.session.id,accountId:'owner-1'})).view;assert.deepEqual(view.teacherSetup,input.teacherSetup);assert.equal(view.worldTheme,'historical');assert.equal(view.deviceMode,'A');assert.equal(view.gamePlan.theme,draft.plan.theme);
 await assert.rejects(()=>service.createSession({...input,teacherSetup:{...input.teacherSetup,worldTheme:'future'}}),/REQUEST_ID_CONFLICT/);
 await service.event({sessionId:room.session.id,accountId:'owner-1',event:{type:'START',payload:{},eventId:'start',round:view.round,revision:view.revision}});
 view=(await service.getSession({id:room.session.id,accountId:'owner-1'})).view;assert.equal(view.lessonMode.rule,'treasure');assert.equal(view.lessonMode.participation,'individual');
 assert.equal((await service.getSession({id:room.session.id,learnerToken:'A'.repeat(43)})).view.teacherSetup,undefined);
 assert.equal((await service.getSession({id:room.session.id,presenterToken:room.presenterToken})).view.teacherSetup,undefined);
 assert.equal((await service.getSession({id:room.session.id,learnerToken:'A'.repeat(43)})).view.worldTheme,'historical');
 assert.equal((await service.getSession({id:room.session.id,presenterToken:room.presenterToken})).view.worldTheme,'historical');
 assert.deepEqual(database.prepare('SELECT data,plan_hash FROM lesson_session_plans WHERE row_id=?').get(plan.row.rowId),approvedBefore);
 const legacy={...input};delete legacy.teacherSetup;const old=await service.createSession({...legacy,requestId:'old'});assert.equal((await service.getSession({id:old.session.id,accountId:'owner-1'})).view.teacherSetup,undefined);
 }finally{database.close();}
});

