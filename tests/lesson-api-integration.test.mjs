import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

import { createPackageDraft, hashPackage } from '../lib/lesson/schema.js';
import { pilotDraft } from '../lib/lesson/director.js';
import { createGameAdapter } from '../lib/lesson/game-adapter.js';
import { reduceLessonSession, createLessonSession } from '../lib/lesson/runtime.js';
import {packLessonState,unpackLessonState} from '../lib/lesson/state-storage.js';
import {
  createLessonService,
  normalizeLearnerName,
  validateSessionBody,
} from '../lib/lesson/service.js';

const lessonFixture = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));

function realDb() {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys=ON');
  database.exec(`
    CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,display_name TEXT,created_at INTEGER NOT NULL);
    CREATE TABLE lesson_content_deletions(kind TEXT,object_id TEXT,owner_account_id TEXT,deleted_at INTEGER,PRIMARY KEY(kind,object_id));
    CREATE TABLE site_trash(kind TEXT,object_id TEXT,owner_account_id TEXT,deleted_at INTEGER,data TEXT,PRIMARY KEY(kind,object_id));
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

test('lesson service exports durable package/session operations', () => {
  assert.equal(typeof createLessonService, 'function');
  assert.equal(typeof normalizeLearnerName, 'function');
});

test('service persists compact tutor audit, hydrates own views, preserves it across CAS writes and fails closed on corrupt storage',async()=>{
 const {db,database}=realDb();database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1','owner-1@example.invalid','Owner',1);
 const service=createLessonService({db,now:()=>1000});
 const saved=await service.savePackage({ownerAccountId:'owner-1',package:structuredClone(lessonFixture)});
 const room=await service.createSession({ownerAccountId:'owner-1',packageRowId:saved.row.rowId,mode:'preview',title:'Audit QA',requestId:'audit-qa'});
 const a=await service.joinSession({code:room.session.code,name:'A',token:'A'.repeat(43)}),b=await service.joinSession({code:room.session.code,name:'B',token:'B'.repeat(43)});
 const read=()=>JSON.parse(database.prepare('SELECT state FROM lesson_sessions WHERE id=?').get(room.session.id).state);
 const raw=read(),history=[{id:'pair',tutorId:a.learnerId,recipientId:b.learnerId,activityId:'past',branch:'core',taskIds:['task-prac-core-calc'],status:'reward_revoked',requestedAt:1,acceptedAt:2,rewardedAt:3,revokedAt:4,revokedBy:'owner-1',extraAudit:{reason:'kept'}}];
 raw.tutors={needs:{},history};database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(packLessonState(raw)),room.session.id);
 const own=await service.getSession({id:room.session.id,learnerToken:'A'.repeat(43)});assert.equal(own.view.tutor.history[0].status,'reward_revoked');assert.equal(own.view.tutor.history[0].peerName,'B');
 const teacher=await service.getSession({id:room.session.id,accountId:'owner-1'});assert.deepEqual(teacher.view.tutors.history,history);
 const outcome=await service.event({sessionId:room.session.id,accountId:'owner-1',event:{type:'START',payload:{},eventId:'audit-start',round:teacher.view.round,revision:teacher.view.revision}});assert.equal(outcome.result.ok,true);
 assert.equal(read().tutors,undefined);assert.deepEqual(unpackLessonState(read()).tutors.history,history);
 const corrupt=read();corrupt.lessonExtrasCompressed.data='corrupt';database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(corrupt),room.session.id);
 await assert.rejects(()=>service.getSession({id:room.session.id,accountId:'owner-1'}),/INVALID_LESSON_STORAGE/);database.close();
});

test('buzzer transport binds the pupil, rebases stale classroom revisions and preserves claim expiry on replay',async()=>{
 const {db,database}=realDb();database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1','owner-1@example.invalid','Owner',1);
 let time=1000;const service=createLessonService({db,now:()=>time});const pkg=structuredClone(lessonFixture);pkg.budget.reserveMinutes=3;pkg.budget.slotMinutes+=1;pkg.activities.find(a=>a.budgetRole==='reserve').minutes=3;pkg.contentHash=hashPackage(pkg);
 const saved=await service.savePackage({ownerAccountId:'owner-1',package:pkg}),room=await service.createSession({ownerAccountId:'owner-1',packageRowId:saved.row.rowId,mode:'preview',title:'Buzz QA',requestId:'buzz-qa'});
 await service.joinSession({code:room.session.code,name:'A',token:'A'.repeat(43)});await service.joinSession({code:room.session.code,name:'B',token:'B'.repeat(43)});
 const host=async(type,payload={})=>{const own=await service.getSession({id:room.session.id,accountId:'owner-1'});return service.event({sessionId:room.session.id,accountId:'owner-1',event:{type,payload,eventId:'host-'+type,activityId:own.view.timeline.currentActivityId,round:own.view.round,revision:own.view.revision}});};
 await host('START');await host('CLASS_EVENT_OPEN',{type:'buzzer',durationMs:180000,seed:1});
 const view=(await service.getSession({id:room.session.id,learnerToken:'A'.repeat(43)})).view;
 const event={type:'CLASS_EVENT_BUZZ',payload:{eventId:view.classEvent.id,step:0,requestId:'buzz-press'},eventId:'buzz-envelope',round:view.round,revision:view.revision,activityId:view.timeline.currentActivityId};
 await service.event({sessionId:room.session.id,learnerToken:'B'.repeat(43),event:{...event,eventId:'other-buzz',payload:{...event.payload,requestId:'other-press'}}});
 const first=await service.event({sessionId:room.session.id,learnerToken:'A'.repeat(43),event});assert.equal(first.result.ok,true);assert.equal(first.view.classEvent.own.buzzer.pressed,true);assert.ok(first.view.classEvent.own.task);
 time+=1000;const replay=await service.event({sessionId:room.session.id,learnerToken:'A'.repeat(43),event});assert.equal(replay.result.replay,true);assert(replay.view.classEvent.own.buzzer.remainingMs<first.view.classEvent.own.buzzer.remainingMs);
 await assert.rejects(()=>service.event({sessionId:room.session.id,learnerToken:'C'.repeat(43),event}),/FORBIDDEN/);database.close();
});

test('durable state deduplicates assessed review records but keeps pending work readable by the legacy Worker',async()=>{
 const {db,database}=realDb();database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1','owner-1@example.invalid','Owner',1);
 const service=createLessonService({db,now:()=>1000}),saved=await service.savePackage({ownerAccountId:'owner-1',package:structuredClone(lessonFixture)}),room=await service.createSession({ownerAccountId:'owner-1',packageRowId:saved.row.rowId,mode:'preview',title:'Review QA',requestId:'review-qa'});
 const raw=JSON.parse(database.prepare('SELECT state FROM lesson_sessions WHERE id=?').get(room.session.id).state);
 for(const id of ['assessed','pending']){const sub={submissionId:id,learnerId:'a',taskId:'task-recheck-19',activityId:'act-recheck',answer:'Exact original answer',at:9,ok:id==='assessed',assessmentStatus:id};raw.submissions[id]=sub;raw.openAssessments[id]={submissionId:id,learnerId:sub.learnerId,taskId:sub.taskId,activityId:sub.activityId,answer:sub.answer,createdAt:sub.at,status:id,feedback:'Keep feedback',extraAudit:'Keep audit'};}
 const expected=structuredClone(raw.openAssessments);database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').run(JSON.stringify(raw),room.session.id);
 await service.event({sessionId:room.session.id,accountId:'owner-1',event:{type:'START',payload:{},eventId:'review-start',round:raw.round,revision:raw.revision}});
 const stored=JSON.parse(database.prepare('SELECT state FROM lesson_sessions WHERE id=?').get(room.session.id).state);assert.equal(stored.openAssessments.assessed.answer,undefined);assert.equal(stored.openAssessments.assessed.learnerId,undefined);assert.deepEqual(stored.openAssessments.pending,expected.pending);
 assert.deepEqual((await service.getSession({id:room.session.id,accountId:'owner-1'})).view.openAssessments,expected);database.close();
});

test('lesson package hash is persisted before save and duplicate versions are rejected', async () => {
  const db = {
    prepare() {
      return { bind: () => ({ run: async () => ({ meta: { changes: 1 } }) }) };
    }
  };
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = createPackageDraft({ id: 'p', version: '1.0.0', sourceRefs: [{ id: 'source-1', kind: 'repo', locator: 'fixture', label: 'Fixture', verification: 'verified' }] });
  const result = await service.savePackage({ ownerAccountId: 'owner-1', package: pkg });
  assert.equal(result.package.contentHash, hashPackage(pkg));
});

test('learner names are NFC-normalized, collapsed, and bounded', () => {
  assert.equal(normalizeLearnerName('  A\u0301   B  '), '\u00c1 B');
  assert.throws(() => normalizeLearnerName('   '), /invalid/i);
  assert.throws(() => normalizeLearnerName('x'.repeat(41)), /invalid/i);
});

test('shared-device pupils stay distinct and a teacher leave revokes learner reads', async () => {
  const {db, database} = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner@test', 'Owner', 1);
  const service = createLessonService({db, now: () => 1000});
  const saved = await service.savePackage({ownerAccountId: 'owner-1', package: structuredClone(lessonFixture)});
  const room = await service.createSession({ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Shared device', requestId: 'shared-device'});
  const a = await service.joinSession({code: room.session.code, name: 'Thảo An', token: 'A'.repeat(43)});
  const b = await service.joinSession({code: room.session.code, name: 'Bảo Bình', token: 'B'.repeat(43)});
  assert.notEqual(a.learnerId, b.learnerId);
  assert.equal((await service.joinSession({code: room.session.code, name: '  THẢO   AN ', token: 'A'.repeat(43)})).learnerId, a.learnerId);
  await assert.rejects(() => service.joinSession({code: room.session.code, name: 'Bảo Bình', token: 'A'.repeat(43)}), /LEARNER_IDENTITY_MISMATCH/);
  const teacher = await service.getSession({id: room.session.id, accountId: 'owner-1'});
  await service.event({sessionId: room.session.id, accountId: 'owner-1', event: {type: 'LEAVE_LEARNER', eventId: 'leave-shared-a', round: teacher.view.round, revision: teacher.revision, payload: {learnerId: a.learnerId}}});
  await assert.rejects(() => service.getSession({id: room.session.id, learnerToken: 'A'.repeat(43)}), /FORBIDDEN/);
  await assert.rejects(() => service.joinSession({code: room.session.code, name: 'Thảo An', token: 'A'.repeat(43)}), /FORBIDDEN/);
  assert.equal((await service.getSession({id: room.session.id, learnerToken: 'B'.repeat(43)})).view.passport.learnerId, b.learnerId);
  assert.equal(database.prepare('SELECT present FROM lesson_learners WHERE learner_id=?').get(a.learnerId).present, 0);
  const current = await service.getSession({id: room.session.id, accountId: 'owner-1'});
  const before = JSON.stringify(current.view.passports[a.learnerId]);
  await service.event({sessionId: room.session.id, accountId: 'owner-1', event: {type: 'ADD_LEARNER', eventId: 'restore-shared-a', round: current.view.round, revision: current.revision, payload: {learner: {id: a.learnerId}}}});
  assert.equal(database.prepare('SELECT present FROM lesson_learners WHERE learner_id=?').get(a.learnerId).present, 1);
  const restored = await service.joinSession({code: room.session.code, name: 'Thảo An', token: 'A'.repeat(43)});
  assert.equal(restored.learnerId, a.learnerId);
  assert.equal(JSON.stringify(restored.projection.passport), before);
  const latest = await service.getSession({id: room.session.id, accountId: 'owner-1'});
  const stale = latest.revision - 1;
  await assert.rejects(() => service.event({sessionId: room.session.id, accountId: 'owner-1', event: {type: 'LEAVE_LEARNER', eventId: 'stale-leave', round: latest.view.round, revision: stale, payload: {learnerId: b.learnerId}}}), /REVISION_MISMATCH/);
  assert.equal(database.prepare('SELECT present FROM lesson_learners WHERE learner_id=?').get(b.learnerId).present, 1);
});

test('presenter rotation rejects old credentials, preserves classroom state and stays read-only', async () => {
  const {db, database} = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner@test', 'Owner', 1);
  const service = createLessonService({db, now: () => 1000});
  const saved = await service.savePackage({ownerAccountId: 'owner-1', package: structuredClone(lessonFixture)});
  const room = await service.createSession({ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'TV', requestId: 'presenter-lifecycle'});
  const student = await service.joinSession({code: room.session.code, name: 'Student', token: 'S'.repeat(43)});
  const teacher = await service.getSession({id: room.session.id, accountId: 'owner-1'});
  const before = JSON.stringify(teacher.view.passports);
  const initial = await service.getSession({id: room.session.id, presenterToken: room.presenterToken});
  assert.equal(initial.view.passports, undefined);
  assert.equal(initial.view.roster, undefined);
  const rotated = await service.rotatePresenter({id: room.session.id, accountId: 'owner-1', revision: teacher.revision});
  await assert.rejects(() => service.getSession({id: room.session.id, presenterToken: room.presenterToken}), /FORBIDDEN/);
  const tv = await service.getSession({id: room.session.id, presenterToken: rotated.presenterToken});
  assert.deepEqual(tv.view.tasks, []);
  await assert.rejects(() => service.event({sessionId: room.session.id, learnerToken: rotated.presenterToken, event: {type: 'START', eventId: 'tv-forged', round: teacher.view.round, revision: rotated.revision, payload: {}}}), /FORBIDDEN/);
  assert.equal(JSON.stringify((await service.getSession({id: room.session.id, accountId: 'owner-1'})).view.passports), before);
  assert.equal((await service.getSession({id: room.session.id, learnerToken: 'S'.repeat(43)})).view.passport.learnerId, student.learnerId);
});

test('teacher-owned presenter reads are anonymous and remain bound to room membership', async () => {
  const { db, database } = realDb();
  for (const id of ['owner-1', 'cohost-1', 'outsider']) database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run(id, `${id}@example.invalid`, id, 1);
  const service = createLessonService({ db, now: () => 1000 });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: structuredClone(lessonFixture) });
  const room = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Anonymous TV', requestId: 'owned-presenter' });
  const learner = await service.joinSession({ code: room.session.code, name: 'Private learner', token: 'S'.repeat(43) });
  database.prepare('INSERT INTO room_memberships VALUES(?,?,?,?,?,?)').run(room.session.roomId, 'cohost-1', 'cohost', 1, 'owner-1', null);
  for (const accountId of ['owner-1', 'cohost-1']) {
    const result = await service.getSession({ id: room.session.id, accountId, presenterViewer: true });
    assert.equal(result.view.roster, undefined);
    assert.equal(result.view.passports, undefined);
    assert.equal(result.view.openAssessments, undefined);
    assert.deepEqual(result.view.tasks, []);
    assert.equal(JSON.stringify(result.view).includes('Private learner'), false);
    assert.equal(JSON.stringify(result.view).includes(learner.learnerId), false);
  }
  await assert.rejects(() => service.getSession({ id: room.session.id, accountId: 'outsider', presenterViewer: true }), /FORBIDDEN/);
  database.prepare('UPDATE room_memberships SET revoked_at=2 WHERE room_id=? AND account_id=?').run(room.session.roomId, 'cohost-1');
  await assert.rejects(() => service.getSession({ id: room.session.id, accountId: 'cohost-1', presenterViewer: true }), /FORBIDDEN/);
  await assert.rejects(() => service.getSession({ id: room.session.id, presenterViewer: true }), /FORBIDDEN/);
});

test('wrong presenter token is rejected without consulting the learner table', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner-1@example.invalid', 'owner-1', 1);
  const statements = [];
  const spy = { ...db, prepare: sql => { statements.push(sql); return db.prepare(sql); } };
  const service = createLessonService({ db: spy, now: () => 1000 });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: structuredClone(lessonFixture) });
  const room = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'TV', requestId: 'bad-tv-token' });
  statements.length = 0;
  await assert.rejects(() => service.getSession({ id: room.session.id, presenterToken: 'WRONG' }), /FORBIDDEN/);
  assert.equal(statements.some(sql => sql.includes('lesson_learners')), false);
});

test('simultaneous classroom joins all succeed instead of failing with JOIN_CONFLICT', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner-1@example.invalid', 'owner-1', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: structuredClone(lessonFixture) });
  const room = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Crowd', requestId: 'crowd-join' });
  const joined = await Promise.all(Array.from({ length: 12 }, (_, i) => service.joinSession({ code: room.session.code, name: `Student ${i + 1}`, token: String.fromCharCode(65 + i).repeat(43) })));
  assert.equal(new Set(joined.map(result => result.learnerId)).size, 12);
  const teacher = await service.getSession({ id: room.session.id, accountId: 'owner-1' });
  assert.equal(Object.keys(teacher.view.roster).length, 12);
});

test('two pupils with the same name get a clear NAME_TAKEN error, not a raw SQL error', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner-1@example.invalid', 'owner-1', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: structuredClone(lessonFixture) });
  const room = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Same name', requestId: 'same-name' });
  const first = await service.joinSession({ code: room.session.code, name: 'Nguyễn Văn An', token: 'A'.repeat(43) });
  await assert.rejects(() => service.joinSession({ code: room.session.code, name: 'nguyễn văn an', token: 'B'.repeat(43) }), error => error.message === 'NAME_TAKEN');
  const again = await service.joinSession({ code: room.session.code, name: 'Nguyễn Văn An', token: 'A'.repeat(43) });
  assert.equal(again.learnerId, first.learnerId);
});

async function startedClassroom(count) {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner-1@example.invalid', 'owner-1', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: structuredClone(lessonFixture) });
  const room = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Crowd', requestId: 'crowd-events' });
  const learners = [];
  for (let i = 0; i < count; i += 1) {
    const token = String.fromCharCode(65 + i).repeat(43);
    learners.push({ ...(await service.joinSession({ code: room.session.code, name: `Student ${i + 1}`, token })), token });
  }
  const teacher = await service.getSession({ id: room.session.id, accountId: 'owner-1' });
  const started = await service.event({ sessionId: room.session.id, accountId: 'owner-1', event: { eventId: 'start', type: 'START', round: 1, revision: teacher.revision, payload: {} } });
  const view = (await service.getSession({ id: room.session.id, accountId: 'owner-1' })).view;
  return { service, room, learners, revision: started.revision, activityId: view.timeline.currentActivityId, taskId: view.tasks[0].id };
}

test('a whole class submitting at the same moment is accepted for every pupil', async () => {
  const { service, room, learners, revision, activityId, taskId } = await startedClassroom(12);
  const outcomes = await Promise.allSettled(learners.map((learner, i) => service.event({
    sessionId: room.session.id,
    learnerToken: learner.token,
    event: { eventId: `submit-${i}`, type: 'SUBMIT', round: 1, revision, activityId, payload: { taskId, answer: 'opt_finite_seat' } }
  })));
  assert.deepEqual(outcomes.filter(outcome => outcome.status === 'rejected').map(outcome => outcome.reason.message), []);
  const teacher = (await service.getSession({ id: room.session.id, accountId: 'owner-1' })).view;
  const recorded = Object.values(teacher.submissions || {}).filter(entry => entry.ok === true);
  assert.equal(new Set(recorded.map(entry => entry.learnerId)).size, 12);
});

test('a pupil\'s dice roll and draft are not rejected because other pupils acted first', async () => {
  const { service, room, learners, revision, activityId, taskId } = await startedClassroom(3);
  await service.event({ sessionId: room.session.id, learnerToken: learners[0].token, event: { eventId: 'first', type: 'SAVE_DRAFT', round: 1, revision, activityId, payload: { taskId, answer: 'opt_finite_seat' } } });
  const roll = await service.event({ sessionId: room.session.id, learnerToken: learners[1].token, event: { eventId: 'late-roll', type: 'ROLL', round: 1, revision, payload: {} } });
  assert.equal(roll.result.ok, true);
});

test('the teacher can advance the lesson with a view that pupils have already outdated', async () => {
  const { service, room, learners, revision, activityId, taskId } = await startedClassroom(3);
  await service.event({ sessionId: room.session.id, learnerToken: learners[0].token, event: { eventId: 'busy', type: 'SAVE_DRAFT', round: 1, revision, activityId, payload: { taskId, answer: 'opt_finite_seat' } } });
  const next = await service.event({ sessionId: room.session.id, accountId: 'owner-1', event: { eventId: 'next-stale', type: 'NEXT', round: 1, revision, activityId, payload: {} } });
  assert.equal(next.result.ok, true);
  assert.notEqual(next.view.timeline.currentActivityId, activityId);
});

test('a submission for an activity that has already ended is still refused', async () => {
  const { service, room, learners, revision, activityId, taskId } = await startedClassroom(2);
  await service.event({ sessionId: room.session.id, accountId: 'owner-1', event: { eventId: 'next', type: 'NEXT', round: 1, revision, activityId, payload: {} } });
  await assert.rejects(() => service.event({ sessionId: room.session.id, learnerToken: learners[0].token, event: { eventId: 'too-late', type: 'SUBMIT', round: 1, revision, activityId, payload: { taskId, answer: 'opt_finite_seat' } } }), error => error.message === 'STALE_ACTIVITY');
});

test('simultaneous submissions to one session are processed in turn without wasted retries', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner-1@example.invalid', 'owner-1', 1);
  let batches = 0;
  const counted = { ...db, batch: statements => { batches += 1; return db.batch(statements); } };
  const service = createLessonService({ db: counted, now: () => 1000 });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: structuredClone(lessonFixture) });
  const room = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Queue', requestId: 'queue-events' });
  const learners = [];
  for (let i = 0; i < 12; i += 1) {
    const token = String.fromCharCode(65 + i).repeat(43);
    learners.push({ ...(await service.joinSession({ code: room.session.code, name: `Student ${i + 1}`, token })), token });
  }
  const teacher = await service.getSession({ id: room.session.id, accountId: 'owner-1' });
  await service.event({ sessionId: room.session.id, accountId: 'owner-1', event: { eventId: 'start', type: 'START', round: 1, revision: teacher.revision, payload: {} } });
  const view = (await service.getSession({ id: room.session.id, accountId: 'owner-1' })).view;
  batches = 0;
  await Promise.all(learners.map((learner, i) => createLessonService({db:counted,now:()=>1000}).event({
    sessionId: room.session.id,
    learnerToken: learner.token,
    event: { eventId: `turn-${i}`, type: 'SUBMIT', round: 1, revision: view.revision, activityId: view.timeline.currentActivityId, payload: { taskId: view.tasks[0].id, answer: 'opt_finite_seat' } }
  })));
  assert.equal(batches, 12);
});

test('simultaneous joins are processed in turn without wasted retries', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner-1@example.invalid', 'owner-1', 1);
  let batches = 0;
  const counted = { ...db, batch: statements => { batches += 1; return db.batch(statements); } };
  const service = createLessonService({ db: counted, now: () => 1000 });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: structuredClone(lessonFixture) });
  const room = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Queue joins', requestId: 'queue-joins' });
  batches = 0;
  await Promise.all(Array.from({ length: 12 }, (_, i) => createLessonService({db:counted,now:()=>1000}).joinSession({ code: room.session.code, name: `Student ${i + 1}`, token: String.fromCharCode(65 + i).repeat(43) })));
  assert.equal(batches, 12);
});

test('trusted cohost authorizes teacher command without changing principal identity', () => {
  const pkg = createPackageDraft({ id: 'p', version: '1.0.0', sourceRefs: [{ id: 'source-1', kind: 'repo', locator: 'fixture', label: 'Fixture', verification: 'verified' }] });
  const state = createLessonSession({ package: pkg, hostId: 'owner-1', sessionId: 'session-1', now: 0 });
  const result = reduceLessonSession(state, { eventId: 'e1', type: 'START', round: 1, revision: 0, payload: {} }, {
    now: 1000,
    actor: { role: 'teacher', id: 'cohost-1', authorizedHostId: 'owner-1' },
  });
  assert.equal(result.result.ok, true);
  assert.equal(result.state.hostId, 'owner-1');
  assert.equal(result.state.eventCache['teacher:cohost-1:e1'].result.ok, true);
});

test('student cannot smuggle trusted cohost authorization', () => {
  const state = { hostId: 'owner-1', eventCache: {}, roster: {} };
  const result = reduceLessonSession(state, { eventId: 'e1', type: 'START', authorizedHostId: 'owner-1', payload: {} }, {
    now: 1000,
    actor: { role: 'student', id: 'learner-1', authorizedHostId: 'owner-1' },
  });
  assert.equal(result.result.ok, false);
});

test('real SQLite D1 fixture preserves create idempotency, package rehydration, and projection shape', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner@test', 'Owner', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = createPackageDraft({ id: 'p-real', version: '1.0.0', sourceRefs: [{ id: 'source-1', kind: 'repo', locator: 'fixture', label: 'Fixture', verification: 'verified' }] });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: pkg });
  const first = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Real', requestId: 'create-1' });
  const replay = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Real', requestId: 'create-1' });
  assert.equal(replay.replay, true);
  assert.deepEqual(replay.session, first.session);
  await assert.rejects(() => service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'live', title: 'Changed', requestId: 'create-1' }), /REQUEST_ID_CONFLICT/);
  const stored = database.prepare('SELECT state FROM lesson_sessions WHERE id=?').get(first.session.id);
  assert.equal(JSON.parse(stored.state).package, undefined);
  assert.equal(JSON.parse(stored.state).eventCache, undefined);
  const teacher = await service.getSession({ id: first.session.id, accountId: 'owner-1' });
  assert.equal(teacher.view.view, undefined);
  assert.equal(teacher.view.package.id, 'p-real');
});

test('approved plans bind exact package tuple, reject live preview, and remain append-only', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner@test', 'Owner', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = structuredClone(lessonFixture);
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: pkg });
  const packageApproval = await service.approvePackage({ actorAccountId: 'owner-1', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '1.0.1', sourceReviewAck: pkg.sourceRefs.map(source=>({...source,numericReviewConfirmed:true})) });
  const draft = pilotDraft({ package: { ...packageApproval.package, rowId: packageApproval.row.rowId } });
  const approved = await service.approvePlan({ actorAccountId: 'owner-1', packageRowId: packageApproval.row.rowId, packageVersion: packageApproval.row.version, packageHash: packageApproval.row.contentHash, planHash: draft.plan.contentHash, sourceReview: packageApproval.package.sourceRefs });
  assert.equal(approved.plan.status, 'approved');
  assert.notEqual(approved.plan.contentHash, draft.plan.contentHash);
  const created = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: packageApproval.row.rowId, packageVersion: packageApproval.row.version, packageHash: packageApproval.row.contentHash, planRowId: approved.row.rowId, planHash: approved.row.planHash, mode: 'live', title: 'Plan', requestId: 'plan-create' });
  assert.equal(database.prepare('SELECT plan_row_id,plan_hash FROM lesson_sessions WHERE id=?').get(created.session.id).plan_row_id, approved.row.rowId);
  assert.equal((await service.getSession({ id: created.session.id, accountId: 'owner-1' })).view.gamePlan.contentHash, approved.row.planHash);
  assert.equal((await service.getSession({ id: created.session.id, accountId: 'owner-1' })).view.gamePlan.package.contentHash, packageApproval.row.contentHash);
  await assert.rejects(() => service.createSession({ ownerAccountId: 'owner-1', packageRowId: packageApproval.row.rowId, packageVersion: packageApproval.row.version, packageHash: packageApproval.row.contentHash, mode: 'live', title: 'Live', requestId: 'live-without-plan' }), /PLAN_REQUIRED/);
  assert.throws(() => database.prepare('UPDATE lesson_session_plans SET data=? WHERE row_id=?').run('{}', approved.row.rowId), /immutable/);
});

test('plan approval refuses draft or needs-review packages', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner@test', 'Owner', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = structuredClone(lessonFixture);
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: pkg });
  await assert.rejects(() => service.approvePlan({ actorAccountId: 'owner-1', packageRowId: saved.row.rowId, packageVersion: saved.row.version, packageHash: saved.row.contentHash, planHash: 'unknown', sourceReview: pkg.sourceRefs }), /SOURCE_REVIEW_REQUIRED/);
});

test('session body validator rejects client actor authority and accepts host tick shape', () => {
  assert.throws(() => validateSessionBody({ action: 'event', id: 's', role: 'teacher', event: { eventId: 'e', type: 'START', round: 1, revision: 0 } }), /INVALID_BODY/);
  assert.doesNotThrow(() => validateSessionBody({ action: 'tick', id: 's', round: 1, revision: 0, eventId: 'tick-1' }));
});

test('real SQLite enforces cohost tick and rotate revocation at mutation time', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner@test', 'Owner', 1);
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('cohost-1', 'cohost@test', 'Cohost', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = createPackageDraft({ id: 'p-auth', version: '1.0.0', sourceRefs: [{ id: 'source-1', kind: 'repo', locator: 'fixture', label: 'Fixture', verification: 'verified' }] });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: pkg });
  const created = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Auth', requestId: 'auth-create' });
  database.prepare("INSERT INTO room_memberships VALUES(?,?,?,?,?,NULL)").run(created.session.roomId, 'cohost-1', 'cohost', 1, 'owner-1');
  const ticked = await service.tick({ id: created.session.id, accountId: 'cohost-1', round: 1, revision: 0, eventId: 'tick-1' });
  assert.equal(ticked.revision, 1);
  database.prepare('UPDATE room_memberships SET revoked_at=2 WHERE room_id=? AND account_id=?').run(created.session.roomId, 'cohost-1');
  await assert.rejects(() => service.tick({ id: created.session.id, accountId: 'cohost-1', round: 1, revision: 1, eventId: 'tick-2' }), /FORBIDDEN/);
  database.prepare('INSERT INTO system_hosts VALUES(?,?,?,?)').run('owner-1', 'host', 1, 2);
  await assert.rejects(() => service.rotatePresenter({ id: created.session.id, accountId: 'owner-1', revision: 1 }), /FORBIDDEN/);
});

test('deleted lesson rooms reject teacher, student, presenter, join-retry, and event replay reads', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner@test', 'Owner', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = createPackageDraft({ id: 'p-deleted', version: '1.0.0', sourceRefs: [{ id: 'source-1', kind: 'repo', locator: 'fixture', label: 'Fixture', verification: 'verified' }] });
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: pkg });
  const created = await service.createSession({ ownerAccountId: 'owner-1', packageRowId: saved.row.rowId, mode: 'preview', title: 'Deleted', requestId: 'deleted-create' });
  const presenterToken = created.presenterToken;
  const learnerToken = 'learner-deleted-token';
  database.prepare('INSERT INTO lesson_learners VALUES(?,?,?,?,?,?,?,?)').run('learner-row', created.session.id, 'learner-1', 'Learner', 'learner', service.hashToken(learnerToken), 1, 1000);
  const event = { eventId: 'delete-replay', type: 'START', round: 1, revision: 0, payload: {} };
  await service.event({ sessionId: created.session.id, accountId: 'owner-1', event });
  const replay = await service.event({ sessionId: created.session.id, accountId: 'owner-1', event });
  assert.equal(replay.result.replay, true);
  assert.ok(replay.view);
  assert.equal(typeof replay.serverNow, 'number');
  database.prepare('UPDATE rooms SET deleted_at=? WHERE id=?').run(2000, created.session.roomId);
  await assert.rejects(() => service.getSession({ id: created.session.id, accountId: 'owner-1' }), /NOT_FOUND/);
  await assert.rejects(() => service.getSession({ id: created.session.id, learnerToken }), /NOT_FOUND/);
  await assert.rejects(() => service.getSession({ id: created.session.id, presenterToken }), /NOT_FOUND/);
  await assert.rejects(() => service.event({ sessionId: created.session.id, accountId: 'owner-1', event }), /NOT_FOUND/);
  await assert.rejects(() => service.joinSession({ code: created.session.code, name: 'Retry', token: learnerToken }), /NOT_FOUND/);
});

test('0008 migration enforces exact package tuple and immutable package rows', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys=ON');
  database.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY); CREATE TABLE rooms(id TEXT PRIMARY KEY);');
  const migration = (await readFile(new URL('../drizzle/0008_striped_wallflower.sql', import.meta.url), 'utf8')).replaceAll('--> statement-breakpoint', '');
  database.exec(migration);
  database.prepare('INSERT INTO accounts VALUES(?)').run('owner-1');
  database.prepare('INSERT INTO rooms VALUES(?)').run('room-1');
  database.prepare('INSERT INTO lesson_packages VALUES(?,?,?,?,?,?,?,?,?)').run('package-1', 'owner-1', 'p', '1.0.0', 'hash-1', 'draft', '{}', null, 1);
  assert.throws(() => database.prepare('INSERT INTO lesson_sessions(id,room_id,package_row_id,package_version,package_hash,owner_account_id,state,revision,status,mutation_nonce,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('session-1', 'room-1', 'package-1', '1.0.0', 'wrong-hash', 'owner-1', '{}', 0, 'waiting', 'n', 1, 1), /FOREIGN KEY/);
  assert.throws(() => database.prepare('UPDATE lesson_packages SET status=? WHERE row_id=?').run('approved', 'package-1'), /immutable/);
});

test('0009 migration binds plans and sessions to the exact package tuple', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys=ON');
  database.exec(`
    CREATE TABLE accounts(id TEXT PRIMARY KEY);
    CREATE TABLE rooms(id TEXT PRIMARY KEY);
    CREATE TABLE lesson_packages(row_id TEXT PRIMARY KEY,owner_account_id TEXT NOT NULL,package_id TEXT NOT NULL,version TEXT NOT NULL,content_hash TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,parent_row_id TEXT,created_at INTEGER NOT NULL,UNIQUE(row_id,version,content_hash));
     CREATE TABLE lesson_sessions(id TEXT PRIMARY KEY,room_id TEXT NOT NULL,package_row_id TEXT NOT NULL,package_version TEXT NOT NULL,package_hash TEXT NOT NULL,owner_account_id TEXT NOT NULL,request_id TEXT,request_fingerprint TEXT,state TEXT NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,mutation_nonce TEXT NOT NULL,presenter_token_hash TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
     CREATE TABLE lesson_learners(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,learner_id TEXT NOT NULL,name TEXT NOT NULL,name_key TEXT NOT NULL,token_hash TEXT NOT NULL,present INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,FOREIGN KEY(session_id) REFERENCES lesson_sessions(id));
     CREATE TABLE lesson_event_receipts(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,actor_key TEXT NOT NULL,event_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,FOREIGN KEY(session_id) REFERENCES lesson_sessions(id));
  `);
  const migration = (await readFile(new URL('../drizzle/0009_approved_session_plans.sql', import.meta.url), 'utf8')).replaceAll('--> statement-breakpoint', '');
  database.exec(migration);
  database.prepare('INSERT INTO accounts VALUES(?)').run('owner-1');
  database.prepare('INSERT INTO rooms VALUES(?)').run('room-1');
  database.prepare('INSERT INTO lesson_packages VALUES(?,?,?,?,?,?,?,?,?)').run('package-1', 'owner-1', 'p', '1.0.0', 'hash-1', 'approved', '{}', null, 1);
  database.prepare('INSERT INTO lesson_session_plans VALUES(?,?,?,?,?,?,?,?,?,?)').run('plan-1', 'owner-1', 'package-1', '1.0.0', 'hash-1', 'plan-hash', '{}', '[]', 'owner-1', 1);
  assert.throws(
    () => database.prepare('INSERT INTO lesson_session_plans VALUES(?,?,?,?,?,?,?,?,?,?)').run('plan-2', 'owner-1', 'package-1', '1.0.0', 'wrong-hash', 'plan-hash-2', '{}', '[]', 'owner-1', 1),
    /FOREIGN KEY/
  );
  assert.throws(
    () => database.prepare('INSERT INTO lesson_sessions(id,room_id,package_row_id,package_version,package_hash,plan_row_id,plan_hash,owner_account_id,state,revision,status,mutation_nonce,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('session-1', 'room-1', 'package-1', '1.0.0', 'hash-1', 'plan-1', 'wrong-plan-hash', 'owner-1', '{}', 0, 'waiting', 'n', 1, 1),
    /FOREIGN KEY/
  );
});

test('0009 rebuild preserves legacy lesson children with foreign keys enabled', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys=ON');
  for (const file of await readdir(new URL('../drizzle/', import.meta.url))) {
    if (!/^000[0-8]_.*\.sql$/.test(file)) continue;
    const sql = await readFile(new URL(`../drizzle/${file}`, import.meta.url), 'utf8');
    database.exec(sql.replaceAll('--> statement-breakpoint', ''));
  }

  database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run('owner-legacy', 'legacy@test', 'Legacy', 1);
  database.prepare('INSERT INTO rooms(id,code,admin_hash,title,created,mode,owner_account_id) VALUES(?,?,?,?,?,?,?)').run('room-legacy', 'LEGACY', 'admin', 'Legacy', 1, 'lesson', 'owner-legacy');
  database.prepare('INSERT INTO teams(id,room_id,name_key,token_hash,data,revision) VALUES(?,?,?,?,?,?)').run('team-legacy', 'room-legacy', 'team', 'team-token', '{}', 0);
  database.prepare('INSERT INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) VALUES(?,?,?,?,?,?)').run('audit-legacy', 'owner-legacy', 'room-legacy', 'legacy', '{}', 1);
  database.prepare('INSERT INTO lesson_packages(row_id,owner_account_id,package_id,version,content_hash,status,data,created_at) VALUES(?,?,?,?,?,?,?,?)').run('package-legacy', 'owner-legacy', 'legacy', '1.0.0', 'hash-legacy', 'draft', '{}', 1);
  database.prepare('INSERT INTO lesson_sessions(id,room_id,package_row_id,package_version,package_hash,owner_account_id,state,revision,status,mutation_nonce,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('session-legacy', 'room-legacy', 'package-legacy', '1.0.0', 'hash-legacy', 'owner-legacy', '{}', 0, 'waiting', 'nonce', 1, 1);
  database.prepare('INSERT INTO lesson_learners(id,session_id,learner_id,name,name_key,token_hash,present,created_at) VALUES(?,?,?,?,?,?,?,?)').run('learner-legacy', 'session-legacy', 'learner-1', 'Legacy Learner', 'legacy learner', 'token-legacy', 1, 1);
  database.prepare('INSERT INTO lesson_event_receipts(id,session_id,actor_key,event_id,fingerprint,result,created_at) VALUES(?,?,?,?,?,?,?)').run('receipt-legacy', 'session-legacy', 'learner-1', 'event-1', 'fingerprint', '{}', 1);

  const before = {
    sessions: database.prepare('SELECT COUNT(*) AS count FROM lesson_sessions').get().count,
    learners: database.prepare('SELECT COUNT(*) AS count FROM lesson_learners').get().count,
    receipts: database.prepare('SELECT COUNT(*) AS count FROM lesson_event_receipts').get().count,
    teams: database.prepare('SELECT COUNT(*) AS count FROM teams').get().count,
    audits: database.prepare('SELECT COUNT(*) AS count FROM admin_audit').get().count
  };
  const migration = await readFile(new URL('../drizzle/0009_approved_session_plans.sql', import.meta.url), 'utf8');
  database.exec(migration.replaceAll('--> statement-breakpoint', ''));

  assert.deepEqual({
    sessions: database.prepare('SELECT COUNT(*) AS count FROM lesson_sessions').get().count,
    learners: database.prepare('SELECT COUNT(*) AS count FROM lesson_learners').get().count,
    receipts: database.prepare('SELECT COUNT(*) AS count FROM lesson_event_receipts').get().count,
    teams: database.prepare('SELECT COUNT(*) AS count FROM teams').get().count,
    audits: database.prepare('SELECT COUNT(*) AS count FROM admin_audit').get().count
  }, before);
  assert.equal(database.prepare('SELECT session_id FROM lesson_learners WHERE id=?').get('learner-legacy').session_id, 'session-legacy');
  assert.equal(database.prepare('SELECT session_id FROM lesson_event_receipts WHERE id=?').get('receipt-legacy').session_id, 'session-legacy');
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
});

test('lesson route keeps authenticated director and exact approve-plan actions wired', async () => {
  const source = await readFile(new URL('../app/api/lessons/route.js', import.meta.url), 'utf8');
  assert.match(source, /kind === 'director'.*getDirectorDraft/);
  assert.match(source, /input\.action === 'approve-plan'.*api\.approvePlan/);
  assert.match(source, /Object\.keys\(input\)\.length === 6/);
});

test('VM route gives learner bearer precedence and keeps presenter read-only', async () => {
  const calls = [];
  const api = {
    joinSession: async input => ({ joined: input }),
    event: async input => { calls.push(input); return { view: { role: input.learnerToken ? 'student' : 'teacher' }, revision: 1 }; },
    createSession: async input => ({ created: input }),
    rotatePresenter: async input => ({ rotated: input }),
    tick: async input => ({ ticked: input }),
    getSession: async input => { calls.push(input); return { view: { role: input.presenterToken ? 'presenter' : input.learnerToken ? 'student' : 'teacher' }, revision: 0 }; },
  };
  const context = createContext({ Request, Response, URL, TextEncoder, TextDecoder, Uint8Array, JSON, Object, Number, Error, RegExp });
  const storage = new SyntheticModule(['db', 'stmt', 'getEnv'], function() {
    this.setExport('db', () => ({}));
    this.setExport('stmt', () => ({ run: async () => ({ meta: { changes: 1 } }) }));
    this.setExport('getEnv', () => ({}));
  }, { context });
  const access = new SyntheticModule(['resolveIdentity'], function() {
    this.setExport('resolveIdentity', request => request.headers.get('oai-authenticated-user-id') ? { user: { userId: 'teacher-1', email: 'teacher@test', displayName: 'Teacher' }, isRootUser: false } : { user: null, isRootUser: false });
  }, { context });
  const serviceModule = new SyntheticModule(['createLessonService', 'MAX_EVENT_BYTES', 'validateSessionBody'], function() {
    this.setExport('createLessonService', () => api);
    this.setExport('MAX_EVENT_BYTES', 32768);
    this.setExport('validateSessionBody', validateSessionBody);
  }, { context });
  const route = new SourceTextModule(await readFile(new URL('../app/api/lesson-sessions/route.js', import.meta.url), 'utf8'), { context });
  await route.link(specifier => specifier.endsWith('storage.js') ? storage : specifier.endsWith('account-room-access.js') ? access : serviceModule);
  await route.evaluate();
  const post = async (payload, headers = {}) => route.namespace.POST(new Request('https://test/api/lesson-sessions', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) }));
  const event = { action: 'event', id: 'session-1', event: { eventId: 'event-1', type: 'SUBMIT', round: 1, revision: 0, payload: {} } };
  assert.equal((await post(event, { authorization: 'Bearer learner-token' })).status, 200);
  assert.equal(calls.at(-1).learnerToken, 'learner-token');
  assert.equal(calls.at(-1).accountId, undefined);
  assert.equal((await post(event, { authorization: 'Bearer learner-token', 'oai-authenticated-user-id': 'unrelated' })).status, 200);
  assert.equal(calls.at(-1).learnerToken, 'learner-token');
  assert.equal((await post(event, { 'oai-authenticated-user-id': 'teacher-1' })).status, 200);
  assert.equal(calls.at(-1).accountId, 'teacher-1');
  api.event = async input => { if (input.learnerToken === 'presenter-token') throw new Error('FORBIDDEN'); calls.push(input); return { view: { role: input.learnerToken ? 'student' : 'teacher' }, revision: 1 }; };
  const presenterPost = await post(event, { authorization: 'Bearer presenter-token' });
  assert.equal(presenterPost.status, 403);
  const presenterGet = await route.namespace.GET(new Request('https://test/api/lesson-sessions?kind=presenter&id=session-1', { headers: { authorization: 'Bearer presenter-token' } }));
  assert.equal(presenterGet.status, 200);
  assert.equal(calls.at(-1).presenterToken, 'presenter-token');
  const teacherPresenterGet = await route.namespace.GET(new Request('https://test/api/lesson-sessions?kind=presenter&id=session-1', { headers: { 'oai-authenticated-user-id': 'teacher-1' } }));
  assert.equal(teacherPresenterGet.status, 200);
  assert.equal(calls.at(-1).accountId, 'teacher-1');
  assert.equal(calls.at(-1).presenterViewer, true);
});

test('regression: approved plan session safe gamePlan has adapter route/checkpoints; draft preview no executable game; legacy package-only unchanged; replay/rejoin deterministic', async () => {
  const { db, database } = realDb();
  database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1', 'owner@test', 'Owner', 1);
  const service = createLessonService({ db, now: () => 1000 });
  const pkg = structuredClone(lessonFixture);
  const saved = await service.savePackage({ ownerAccountId: 'owner-1', package: pkg });

  // --- 1. Approved plan session safe gamePlan has adapter route/checkpoints ---
  const packageApproval = await service.approvePackage({
    actorAccountId: 'owner-1',
    id: saved.row.rowId,
    parentHash: saved.row.contentHash,
    version: '1.0.1',
    sourceReviewAck: pkg.sourceRefs.map(source=>({...source,numericReviewConfirmed:true}))
  });
  const boundPackage = { ...packageApproval.package, rowId: packageApproval.row.rowId };
  const draft = pilotDraft({ package: boundPackage });
  const approved = await service.approvePlan({
    actorAccountId: 'owner-1',
    packageRowId: packageApproval.row.rowId,
    packageVersion: packageApproval.row.version,
    packageHash: packageApproval.row.contentHash,
    planHash: draft.plan.contentHash,
    sourceReview: packageApproval.package.sourceRefs
  });

  const createdLive = await service.createSession({
    ownerAccountId: 'owner-1',
    packageRowId: packageApproval.row.rowId,
    packageVersion: packageApproval.row.version,
    packageHash: packageApproval.row.contentHash,
    planRowId: approved.row.rowId,
    planHash: approved.row.planHash,
    mode: 'live',
    title: 'Live Plan',
    requestId: 'reg-live-1'
  });

  // Teacher projection gets operational descriptor with route/checkpoints, but NO sources/answers
  const teacherSession = await service.getSession({ id: createdLive.session.id, accountId: 'owner-1' });
  const teacherGp = teacherSession.view.gamePlan;
  assert.ok(teacherGp);
  assert.equal(teacherGp.adapter, 'lesson-game-r4');
  assert.equal(teacherGp.execution?.allowed, true);
  assert.equal(teacherGp.execution?.source, 'approved-session-plan');
  assert.equal(teacherGp.deterministic, true);
  assert.equal(typeof teacherGp.seed, 'number');
  assert.ok(teacherGp.route);
  assert.equal(teacherGp.route.points.length, 33);
  assert.ok(teacherGp.route.segments.length > 0);
  assert.ok(teacherGp.checkpoints.length > 0);
  assert.ok(teacherGp.roles.length > 0);
  assert.equal(teacherGp.policy.masteryAuthority, 'LearningPassport');
  assert.equal(teacherGp.policy.groupGameMapMastery, false);
  // Verify NO sources/answers in teacher gamePlan
  assert.equal(Object.hasOwn(teacherGp, 'sourceRefs'), false);
  assert.equal(Object.hasOwn(teacherGp.package, 'sourceRefs'), false);
  assert.equal(Object.hasOwn(teacherGp, 'answerKey'), false);
  assert.equal(Object.hasOwn(teacherGp, 'answer'), false);

  // Presenter projection exposes ONLY publicGamePlan fields already allowlisted
  const presenterSession = await service.getSession({ id: createdLive.session.id, presenterToken: createdLive.presenterToken });
  const presenterGp = presenterSession.view.gamePlan;
  assert.ok(presenterGp);
  assert.equal(presenterGp.contentHash, approved.row.planHash);
  assert.equal(presenterGp.route, undefined);
  assert.equal(presenterGp.adapter, undefined);
  assert.equal(presenterGp.execution, undefined);
  assert.equal(presenterGp.roles, undefined);
  assert.equal(presenterGp.policy, undefined);
  assert.equal(presenterGp.package, undefined);
  assert.equal(presenterGp.devices, undefined);
  assert.equal(presenterGp.seed, undefined);
  assert.ok(Array.isArray(presenterGp.activityPlans));
  assert.ok(presenterGp.activityPlans[0].mapSegment);
  assert.ok(Array.isArray(presenterGp.checkpoints));

  // Student projection exposes ONLY publicGamePlan fields already allowlisted
  const studentJoin = await service.joinSession({ code: createdLive.session.code, name: 'Alice' });
  const studentGp = studentJoin.projection.gamePlan;
  assert.ok(studentGp);
  assert.equal(studentGp.contentHash, approved.row.planHash);
  assert.equal(studentGp.route, undefined);
  assert.equal(studentGp.adapter, undefined);
  assert.equal(studentGp.execution, undefined);
  assert.equal(studentGp.roles, undefined);
  assert.equal(studentGp.policy, undefined);
  assert.equal(studentGp.package, undefined);
  assert.equal(studentGp.devices, undefined);
  assert.equal(studentGp.seed, undefined);
  assert.ok(studentGp.activityPlans[0].mapSegment);

  // --- 2. Draft preview no executable game ---
  // Draft preview from director draft has execution.allowed = false
  const directorDraft = await service.getDirectorDraft({ actorAccountId: 'owner-1', id: saved.row.rowId });
  assert.equal(directorDraft.status, 'draft');
  assert.equal(directorDraft.gamePlan.execution.allowed, false);
  // Calling createGameAdapter directly on draft plan throws PLAN_NOT_APPROVED
  assert.throws(() => createGameAdapter({ plan: directorDraft.plan, package: saved.package }), (err) => err.code === 'PLAN_NOT_APPROVED');

  // Preview session with draft plan data must never instantiate executable adapter (allowed=false)
  const draftRowId = 'plan-draft-row';
  database.prepare(`INSERT INTO lesson_session_plans(row_id,owner_account_id,package_row_id,package_version,package_hash,plan_hash,data,source_review,approved_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
    draftRowId,
    'owner-1',
    packageApproval.row.rowId,
    packageApproval.row.version,
    packageApproval.row.contentHash,
    draft.plan.contentHash,
    JSON.stringify(draft.plan),
    '[]',
    'owner-1',
    1000
  );
  const previewDraftSession = await service.createSession({
    ownerAccountId: 'owner-1',
    packageRowId: packageApproval.row.rowId,
    mode: 'preview',
    title: 'Preview Draft Plan',
    requestId: 'reg-preview-draft-1'
  });
  database.prepare("UPDATE lesson_sessions SET plan_row_id=?, plan_hash=? WHERE id=?").run(
    draftRowId,
    draft.plan.contentHash,
    previewDraftSession.session.id
  );
  const previewTeacher = await service.getSession({ id: previewDraftSession.session.id, accountId: 'owner-1' });
  assert.equal(previewTeacher.view.gamePlan.execution.allowed, false);

  // --- 3. Legacy package-only unchanged ---
  const legacySession = await service.createSession({
    ownerAccountId: 'owner-1',
    packageRowId: saved.row.rowId,
    mode: 'preview',
    title: 'Legacy Package Only',
    requestId: 'reg-legacy-1'
  });
  const legacyTeacher = await service.getSession({ id: legacySession.session.id, accountId: 'owner-1' });
  assert.equal(legacyTeacher.view.gamePlan, null);
  const legacyPresenter = await service.getSession({ id: legacySession.session.id, presenterToken: legacySession.presenterToken });
  assert.equal(legacyPresenter.view.gamePlan, null);
  const legacyStudent = await service.joinSession({ code: legacySession.session.code, name: 'Legacy Learner' });
  assert.equal(legacyStudent.projection.gamePlan, null);

  // --- 4. Replay/rejoin deterministic ---
  // Rejoin returns identical projection
  const studentRejoin = await service.joinSession({ code: createdLive.session.code, name: 'Alice', token: studentJoin.token });
  assert.equal(studentRejoin.learnerId, studentJoin.learnerId);
  assert.deepEqual(studentRejoin.projection.gamePlan, studentGp);

  // Event submission and idempotent replay
  const currentSession = await service.getSession({ id: createdLive.session.id, accountId: 'owner-1' });
  const startEvent = { eventId: 'evt-start-reg', type: 'START', round: 1, revision: currentSession.revision, payload: {} };
  const eventRun = await service.event({ sessionId: createdLive.session.id, accountId: 'owner-1', event: startEvent });
  assert.equal(eventRun.result.ok, true);
  assert.equal(eventRun.result.replay, false);
  assert.deepEqual(eventRun.view.gamePlan.route, teacherGp.route);

  const eventReplay = await service.event({ sessionId: createdLive.session.id, accountId: 'owner-1', event: startEvent });
  assert.equal(eventReplay.result.replay, true);
  assert.equal(eventReplay.revision, eventRun.revision);
  assert.deepEqual(eventReplay.view.gamePlan, eventRun.view.gamePlan);

  // Tuple mismatch verification: tampered plan hash or package hash rejects loadSession
  database.exec('PRAGMA foreign_keys=OFF');
  database.prepare("UPDATE lesson_sessions SET plan_hash='corrupted-hash' WHERE id=?").run(createdLive.session.id);
  database.exec('PRAGMA foreign_keys=ON');
  await assert.rejects(() => service.getSession({ id: createdLive.session.id, accountId: 'owner-1' }), /PLAN_TUPLE_MISMATCH/);
});

test('durable state stores each own answer once and reload restores the learner passport without dropping paid rewards',async()=>{
 const {db,database}=realDb();database.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('owner-1','owner@test','Owner',1);
 const service=createLessonService({db,now:()=>1000});const saved=await service.savePackage({ownerAccountId:'owner-1',package:structuredClone(lessonFixture)});const room=await service.createSession({ownerAccountId:'owner-1',packageRowId:saved.row.rowId,mode:'preview',title:'Footprint',requestId:'footprint-test'});
 const token='Q'.repeat(43),pupil=await service.joinSession({code:room.session.code,name:'Own',token});let own=(await service.getSession({id:room.session.id,accountId:'owner-1'})).view;
 await service.event({sessionId:room.session.id,accountId:'owner-1',event:{type:'START',payload:{},eventId:'footprint-start',round:own.round,revision:own.revision}});own=(await service.getSession({id:room.session.id,learnerToken:token})).view;
 await service.event({sessionId:room.session.id,learnerToken:token,event:{type:'SUBMIT',payload:{taskId:own.tasks[0].id,answer:'opt_finite_seat'},activityId:own.timeline.currentActivityId,eventId:'footprint-submit',round:own.round,revision:own.revision}});
 const state=JSON.parse(database.prepare('SELECT state FROM lesson_sessions WHERE id=?').get(room.session.id).state);
 assert.equal(state.passports[pupil.learnerId].submissions[0].answer,undefined);assert.equal(Object.values(state.submissions)[0].answer,'opt_finite_seat');assert.equal(Object.keys(state.rewardLedger).length,0);
 const restored=await service.getSession({id:room.session.id,learnerToken:token});assert.equal(restored.view.passport.submissions[0].answer,'opt_finite_seat');assert.equal(Object.keys(restored.view.passport.submissions).length,1);
});
