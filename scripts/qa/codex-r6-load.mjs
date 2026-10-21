import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, copyFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { DatabaseSync } from 'node:sqlite';
import { createLessonSession, reduceLessonSession } from '../../lib/lesson/runtime.js';
import { MAX_STATE_BYTES, MAX_EVENT_BYTES } from '../../lib/lesson/service.js';
import { packLessonState, unpackLessonState } from '../../lib/lesson/state-storage.js';

// Reducer-generated synthetic fixture, then optional actual compiled Worker HTTP proof.
// Run --http only after the parent has approved the rebuilt isolated candidate.
const root = resolve(import.meta.dirname, '../..'), http = process.argv.includes('--http');
const reuse = process.argv.includes('--reuse-fixture');
const assessmentStress = process.argv.includes('--assess-stress');
const explorationMax = process.argv.includes('--exploration-max');
const artifactSuffix=process.argv.find(argument=>argument.startsWith('--suffix='))?.slice('--suffix='.length)||'';
assert.ok(!artifactSuffix||/^[a-z0-9-]{1,48}$/.test(artifactSuffix),'Invalid artifact suffix');
const baselineSuffix=process.argv.find(argument=>argument.startsWith('--baseline='))?.slice('--baseline='.length)||'';
assert.ok(!baselineSuffix||/^[a-z0-9-]{1,48}$/.test(baselineSuffix),'Invalid baseline suffix');
const buildRoot = resolve(process.env.TAKEOVER_BUILD_ROOT || join(root, '.sites-runtime/takeover-candidate-20261011'));
assert.equal(buildRoot, resolve(root, '.sites-runtime/takeover-candidate-20261011'));
const artifact = join(root, 'tasks/codex-r6-load'+(assessmentStress?'-assess':'')+(artifactSuffix?'-'+artifactSuffix:'')+'.json');
const directory = join(root, 'tasks/codex-r6-load-' + (assessmentStress ? 'assess-state-' : 'state-') + new Date().toISOString().replace(/[:.]/g, '-'));
const report = { generatedAt: new Date().toISOString(), result: 'ESTIMATE_ONLY', harness: 'Current reducer/domain fixture; HTTP only with --http',
  productionTouched: false, externalRequests: 0, persistence:directory,capBytes: MAX_STATE_BYTES, maxEventBytes: MAX_EVENT_BYTES, stages: [], measurements: [], commands: 0, samples: [] };
const sha = value => createHash('sha256').update(value).digest('hex');
const teacher = { role: 'teacher' }, secrets = new Set();
const redact = error => { let message = String(error?.stack || error); for (const value of secrets) message = message.replaceAll(value, '[redacted]'); return message.slice(0, 1800); };
const phase = name => { report.stages.push(name); console.log(JSON.stringify({ stage: name, commands: report.commands })); };
let priorDatabase, mf, database, state, serial = 0;
const latencies = [];
async function safeFetch(url, options, action) {
  for(let attempt=0;;attempt++){
    try{return await fetch(url,options);}catch(error){
      report.transportFailures ||= [];
      report.transportFailures.push({action,attempt,error:error.message,cause:error.cause?.code||error.cause?.message||'unknown'});
      if(error.cause?.code!=='UND_ERR_SOCKET'||attempt>=2)throw error;
    }
  }
}
function durableCopy(domain) {
  const stored=structuredClone(domain);delete stored.package;delete stored.eventCache;
  for(const passport of Object.values(stored.passports))for(const submission of passport.submissions)if(stored.submissions[submission.submissionId])delete submission.answer;
  for(const[key,entry]of Object.entries(stored.rewardLedger))if(entry.amount===0)delete stored.rewardLedger[key];
  for(const[id,assessment]of Object.entries(stored.openAssessments||{})) {
    const submission=stored.submissions[id];
    if(assessment.status!=='assessed'||!submission)continue;
    for(const key of ['submissionId','learnerId','taskId','activityId','answer'])if(Object.hasOwn(assessment,key)&&JSON.stringify(assessment[key])===JSON.stringify(submission[key]))delete assessment[key];
    if(assessment.createdAt===submission.at)delete assessment.createdAt;
  }
  return stored;
}
function send(type, payload = {}, actor = teacher) {
  const event = { type, payload, eventId: 'r6-fixture-' + ++serial, activityId: state.timeline.currentActivityId, round: state.round, revision: state.revision };
  assert.ok(Buffer.byteLength(JSON.stringify(event)) <= MAX_EVENT_BYTES);
  const started = performance.now();
  const next = reduceLessonSession(state, event, { actor, now: state.clock.lastNow + 1 });
  latencies.push(performance.now() - started);
  assert.equal(next.result.ok, true, type + ':' + next.result.code);
  state = next.state; state.eventCache = {}; report.commands++;
  return next.result;
}
const stats = values => { const sorted = [...values].sort((a, b) => a - b); return { count: values.length, p50Ms: +((sorted[Math.ceil(sorted.length * .5) - 1] || 0).toFixed(2)), p95Ms: +((sorted[Math.ceil(sorted.length * .95) - 1] || 0).toFixed(2)), maxMs: +(Math.max(0, ...values).toFixed(2)) }; };
function estimate() {
  const stored = durableCopy(state);
  const bytes = Buffer.byteLength(JSON.stringify(stored));
  const compact = packLessonState(stored), compactBytes = Buffer.byteLength(JSON.stringify(compact));
  assert.deepEqual(unpackLessonState(compact), stored);
  report.measurements.push({ activityId: state.timeline.currentActivityId, bytesBeforeTutorCodec: bytes, compactBytes, compactHeadroom: MAX_STATE_BYTES - compactBytes, lossless: true, tutorHistory: state.tutors?.history.length || 0,
    classEventReceiptsBytes: Buffer.byteLength(JSON.stringify(state.classEvent?.receipts || {})),
    eventReceipts: Object.keys(state.classEvent?.receipts || {}).length, submissions: Object.keys(state.submissions).length,
    fields: Object.entries(stored).map(([key, value]) => ({ key, bytes: Buffer.byteLength(JSON.stringify(value)) })).sort((a, b) => b.bytes - a.bytes).slice(0, 8) });
}
async function runAssessmentStress() {
  const baseline=JSON.parse(await readFile(join(root,'tasks/codex-r6-load'+(baselineSuffix?'-'+baselineSuffix:'')+'.json'),'utf8'));assert.equal(baseline.result,'PASS');
  const folders=(await readdir(join(root,'tasks'))).filter(name=>name.startsWith('codex-r6-load-state-')).sort();
  const sourceDir=baseline.persistence?join(baseline.persistence,'d1'):join(root,'tasks',folders.at(-1),'d1'),sourceFile=(await readdir(sourceDir,{recursive:true})).find(file=>/(?:^|[\\/])[0-9a-f]{64}\.sqlite$/.test(file));
  assert.ok(sourceFile);const sourcePath=join(sourceDir,sourceFile),sourceHash=sha(await readFile(sourcePath));
  priorDatabase=new DatabaseSync(sourcePath,{readOnly:true});const sessionId=baseline.fixture.sessionId;
  const row=priorDatabase.prepare('SELECT s.*,p.data AS package_data FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id WHERE s.id=?').get(sessionId);
  assert.equal(Buffer.byteLength(row.state),baseline.finalPersisted.bytes);
  state=unpackLessonState(JSON.parse(row.state));state.package=JSON.parse(row.package_data);const ids=Object.keys(state.roster);assert.equal(ids.length,150);
  const task=state.package.tasks.find(task=>task.id==='task-exit-ticket'),hintId=task.hintIds[0];assert.ok(hintId);
  const targetSubmissions=ids.map(learnerId=>Object.values(state.submissions).filter(sub=>sub.learnerId===learnerId&&sub.taskId===task.id&&sub.assessmentStatus==='pending').sort((a,b)=>b.at-a.at)[0]);
  assert.ok(targetSubmissions.every(Boolean));assert.equal(new Set(targetSubmissions.map(sub=>sub.submissionId)).size,150);
  report.fixture={sessionId,pupils:150,scope:'Additional stress from successful HTTP150 pending submissions; exact existing pending records and current authored exit hint',sourceStateSha256:sourceHash,sourceStateBytes:Buffer.byteLength(row.state)};
  await mkdir(join(directory,'d1',sourceFile,'..'),{recursive:true});await copyFile(sourcePath,join(directory,'d1',sourceFile));
  const copy=new DatabaseSync(join(directory,'d1',sourceFile)),tokens=new Map(),classTokens=new Map();
  for(const row of copy.prepare('SELECT learner_id,class_member_id FROM lesson_learners WHERE session_id=?').all(sessionId)){
    const token=randomBytes(32).toString('base64url'),classToken=randomBytes(32).toString('base64url');secrets.add(token);secrets.add(classToken);tokens.set(row.learner_id,token);classTokens.set(row.learner_id,classToken);
    copy.prepare('UPDATE lesson_learners SET token_hash=? WHERE session_id=? AND learner_id=?').run(sha(token),sessionId,row.learner_id);
    copy.prepare('INSERT INTO lesson_class_login_sessions(id,member_id,token_hash,created_at,expires_at) VALUES(?,?,?,?,?)').run(randomUUID(),row.class_member_id,sha(classToken),Date.now(),Date.now()+86400000);
  }copy.close();
  const require=createRequire(import.meta.url),wrangler=require.resolve('wrangler'),{Miniflare}=await import(pathToFileURL(require.resolve('miniflare',{paths:[wrangler]})).href);
  const workerDirectory=join(buildRoot,'dist/server'),files=(await readdir(workerDirectory,{recursive:true})).filter(file=>file.endsWith('.js')).sort();
  const entryHash=sha(await readFile(join(workerDirectory,'index.js')));assert.equal(entryHash,baseline.worker.entrySha256,'Frozen candidate changed before stress');
  report.worker={...baseline.worker,entrySha256:entryHash};
  mf=new Miniflare({rootPath:workerDirectory,modules:['index.js',...files.filter(file=>file!=='index.js')].map(file=>({type:'ESModule',path:join(workerDirectory,file)})),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'takeover-e2e-qa'},d1Persist:join(directory,'d1'),r2Buckets:{LESSON_SOURCES:'r6-assess-qa'},r2Persist:join(directory,'r2'),port:0,host:'127.0.0.1',outboundService:()=>{report.externalRequests++;return new Response('No external requests',{status:403});}});
  const base=String(await mf.ready).replace(/\/$/,'');assert.equal(new URL(base).hostname,'127.0.0.1');database=await mf.getD1Database('DB');
  const account=priorDatabase.prepare('SELECT email FROM accounts WHERE id=?').get(row.owner_account_id),teacherHeaders={'oai-authenticated-user-id':row.owner_account_id,'oai-authenticated-user-email':account.email};
  const request=async(path,body,headers=teacherHeaders)=>{const started=performance.now(),response=await safeFetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined},body?.event?.type||'GET');const data=await response.json();report.samples.push({action:body?.event?.type||'GET',status:response.status,ms:Math.round(performance.now()-started),...(data.error?{error:data.error}:{})});assert.equal(response.status,200,JSON.stringify(report.samples.at(-1)));if(data.result)assert.equal(data.result.ok,true,data.result.code);return data;};
  const get=async headers=>(await request('/api/lesson-sessions?id='+sessionId,undefined,headers)).view;
  const event=(type,payload,revision,headers=teacherHeaders)=>request('/api/lesson-sessions',{action:'event',id:sessionId,event:{type,payload,eventId:'r6-stress-'+ ++serial,activityId:state.timeline.currentActivityId,round:state.round,revision}},headers);
  const initial=await get();assert.equal(initial.tutors.history.length,900);
  const checkpoint=async stage=>{const persisted=await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(sessionId).first(),decoded=unpackLessonState(JSON.parse(persisted.state)),bytes=Buffer.byteLength(persisted.state);assert.ok(bytes<=MAX_STATE_BYTES);assert.equal(decoded.tutors.history.length,900);assert.equal(Object.keys(decoded.classEvent.receipts).length,600);assert.equal(Object.keys(decoded.submissions).length,1650);report.measurements.push({stage,bytes,headroom:MAX_STATE_BYTES-bytes,pending:Object.values(decoded.openAssessments).filter(item=>item.status==='pending').length,assessed:Object.values(decoded.openAssessments).filter(item=>item.status==='assessed').length});return decoded;};
  await checkpoint('initial successful submission fixture');
  let cursor=0;const hints=await Promise.allSettled(Array.from({length:5},async()=>{while(cursor<ids.length){const learnerId=ids[cursor++];await event('HINT',{taskId:task.id,hintId},initial.revision,{Authorization:'Bearer '+tokens.get(learnerId)});}}));const hintFailure=hints.find(result=>result.status==='rejected');if(hintFailure)throw hintFailure.reason;
  await checkpoint('150 actual authored HINT writes, no new submissions');phase('Actual HINT150 committed');
  let view=await get();for(const submission of targetSubmissions){const response=await event('ASSESS',{submissionId:submission.submissionId,criteriaMet:true},view.revision);view=response.view;}
  const completed=await checkpoint('150 existing pending submissions assessed after hint');
  assert.ok(targetSubmissions.every(sub=>completed.submissions[sub.submissionId].assessmentStatus==='assessed'));
  assert.ok(targetSubmissions.every(sub=>completed.passports[sub.learnerId].submissions.find(record=>record.submissionId===sub.submissionId)?.assisted===true));
  assert.ok(ids.every(id=>completed.passports[id].supportHistory.some(hint=>hint.taskId===task.id&&hint.hintId===hintId)));
  for(const learnerId of ids){const own=await get({Authorization:'Bearer '+tokens.get(learnerId)});assert.equal(own.passport.learnerId,learnerId);assert.equal(own.passports,undefined);assert.equal(own.roster,undefined);assert.equal(JSON.stringify(own.tasks).includes('answerKey'),false);}
  const passport=await request('/api/lesson-classes',undefined,{Authorization:'Bearer '+classTokens.get(ids[0])});assert.ok(passport.passport.objectives);
  assert.equal(sha(await readFile(sourcePath)),sourceHash);assert.equal(report.externalRequests,0);
  report.result='PASS';report.stress={hintRequests:150,teacherAssessments:150,ownReads:150,assessedRemainsAssisted:true,submissionCount:1650,tutorHistory:900,eventReceipts:600,errors:0,latency:stats(report.samples.map(sample=>sample.ms)),privateCumulativePassport:'PASS',sourceBackupHashUnchanged:true};phase('Actual HINT150/ASSESS150/privateGET150 complete');
}
try {
  if(assessmentStress){await runAssessmentStress();}else{
  const prior = JSON.parse(await readFile(join(root, 'tasks/codex-takeover-e2e.json'), 'utf8'));
  assert.equal(prior.result, 'PASS'); assert.ok(prior.persistence.startsWith(root));
  const sqlite = (await readdir(join(prior.persistence, 'd1'), { recursive: true })).find(file => /(?:^|[\\/])[0-9a-f]{64}\.sqlite$/.test(file));
  assert.ok(sqlite);
  const sourcePath = join(prior.persistence, 'd1', sqlite), backupHash = sha(await readFile(sourcePath));
  priorDatabase = new DatabaseSync(sourcePath, { readOnly: true });
  const row = priorDatabase.prepare(`SELECT s.*,p.data AS package_data FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id
    WHERE (SELECT COUNT(*) FROM lesson_learners l WHERE l.session_id=s.id)=150`).get();
  assert.ok(row);
  const original = JSON.parse(row.state), pkg = JSON.parse(row.package_data), learners = Object.values(original.roster);
  assert.equal(learners.length, 150);
  report.backup = { sourceSha256: backupHash, sourceStateBytes: Buffer.byteLength(row.state), readOnly: true, priorGeneratedAt: prior.generatedAt };
  report.fixture = { sessionId: row.id, packageId: pkg.id, packageHash: row.package_hash, packageSource: 'Historical synthetic QA approved package tuple; exact identity retained',
    pupils: 150, historyProvenance: 'Current real reducer TUTOR_NEED/REQUEST/RESPOND/END, four authored help activities; not HTTP-generated', bearerProvenance: 'New random synthetic lesson/class login tokens in isolated copied DB only' };
  teacher.id = row.owner_account_id;
  state = createLessonSession({ package: pkg, mode: 'live', hostId: teacher.id, sessionId: row.id, learners, now: Date.now() - 60000, seed: original.seed });
  if (original.gamePlan) state.gamePlan = structuredClone(original.gamePlan);
  send('START');
  const pupil = id => ({ role: 'student', id }), ids = learners.map(learner => learner.id), tutors = ids.slice(0, 75), recipients = ids.slice(75);
  if (!reuse) {
  function currentTasks() { const activity = state.package.activities[state.timeline.activityIndex]; return state.package.tasks.filter(task => activity.taskIds.includes(task.id) && task.participation !== 'group' && task.type !== 'reflection' && (!task.branch || ['shared', state.branches[activity.id]?.[ids[0]] || 'core'].includes(task.branch))); }
  function submit(id, task) {
    const result = send('SUBMIT', { taskId: task.id, answer: task.type === 'closed' ? task.evaluation.answerKey : 'n là chỉ số; u_n là giá trị. Em đối chiếu danh sách, công thức và truy hồi.' }, pupil(id));
    if (result.pending) send('ASSESS', { submissionId: result.submissionId, criteriaMet: true });
  }
  function fullIndividual() {
    const activity = state.package.activities[state.timeline.activityIndex];
    for (const id of ids) { if (['recheck', 'exit'].includes(activity.phase)) send('INTEGRITY', { confirmed: true, usedAI: false }, pupil(id)); for (const task of currentTasks()) submit(id, task); }
  }
  function helpActivity() {
    for (const id of tutors) for (const task of currentTasks()) submit(id, task);
    for (const id of recipients) send('TUTOR_NEED', { needed: true }, pupil(id));
    for (let round = 0; round < 3; round++) for (let i = 0; i < tutors.length; i++) {
      const tutorId = tutors[i], recipientId = recipients[(i + round) % recipients.length];
      send('TUTOR_REQUEST', { recipientId }, pupil(tutorId));
      const pair = state.tutors.history.at(-1);
      send('TUTOR_RESPOND', { requestId: pair.id, accept: true }, pupil(recipientId));
      send('TUTOR_END', { requestId: pair.id }, pupil(tutorId));
    }
    for (const id of recipients) for (const task of currentTasks()) submit(id, task);
    estimate(); phase('Reducer tutor history ' + state.tutors.history.length + ' at ' + state.timeline.currentActivityId);
  }
  fullIndividual(); send('NEXT'); helpActivity(); send('NEXT'); helpActivity(); send('NEXT');
  const groupTask = state.package.tasks.find(task => task.id === 'task-form-four-rep');
  for (const id of ids) { send('SAVE_DRAFT', { taskId: groupTask.id, answer: 'Nháp riêng QA' }, pupil(id)); send('GROUP_CONTRIBUTE', { taskId: groupTask.id, text: 'Em đối chiếu các biểu diễn trước khi thống nhất.' }, pupil(id)); }
  for (const group of state.groups[state.timeline.currentActivityId].groups) {
    const proposer = pupil(group.memberIds[0]);
    send('GROUP_PROPOSE', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey, proposalId: 'r6-proposal-' + serial }, proposer);
    const hash = state.groups[state.timeline.currentActivityId].groups.find(item => item.id === group.id).proposal.hash;
    for (const id of group.memberIds.slice(1, Math.floor(group.memberIds.length / 2) + 1)) send('GROUP_VOTE', { taskId: groupTask.id, proposalHash: hash }, pupil(id));
    send('GROUP_SUBMIT', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey, proposalHash: hash }, proposer);
  }
  send('NEXT'); helpActivity();
  send('CLASS_EVENT_OPEN', { type: 'mountain', durationMs: 180000, seed: 7 });
  const eventId = state.classEvent.id;
  for (const id of ids) for (const cell of state.classEvent.participants[id].board) {
    send('CLASS_EVENT_PICK', { eventId, cellId: cell.id, requestId: 'r6-pick-' + serial }, pupil(id));
    const entry = state.classEvent.participants[id], task = state.classEvent.tasks.find(task => task.id === cell.id);
    send('CLASS_EVENT_ANSWER', { eventId, step: entry.step, answer: task.evaluation.answerKey, requestId: 'r6-answer-' + serial }, pupil(id));
  }
  send('CLASS_EVENT_CLOSE');
  report.jeopardy = { pupils: 150, domainPickAnswerRequests: Object.keys(state.classEvent.receipts).length, allBoardsUsed: Object.values(state.classEvent.participants).every(player => player.usedCellIds.length === player.board.length), generation: 'Actual current domain through reducer; not HTTP' };
  assert.equal(report.jeopardy.allBoardsUsed, true); estimate(); phase('Reducer Jeopardy150 complete, receipts retained');
  send('NEXT'); fullIndividual(); send('NEXT');
  for (const id of ids) send('SELECT_BRANCH', { branch: 'extension' }, pupil(id));
  helpActivity(); assert.equal(state.tutors.history.length, 900);
  send('NEXT'); fullIndividual(); estimate();
  }
  if (reuse) {
    const cached = JSON.parse(await readFile(join(root,'tasks/codex-r6-load-fixture.json'),'utf8'));
    assert.equal(cached.sourceSha256,backupHash);assert.equal(cached.state.packageHash,row.package_hash);
    state=cached.state;serial=state.revision+100;report.commands=cached.commands;report.jeopardy=cached.jeopardy;
    report.fixture.cachedReducerProvenance=cached.generatedAt;estimate();
  } else {
    await writeFile(join(root,'tasks/codex-r6-load-fixture.json'),JSON.stringify({generatedAt:report.generatedAt,sourceSha256:backupHash,commands:report.commands,jeopardy:report.jeopardy,state})+'\n');
  }
  const rewarded = state.tutors.history.find(pair => pair.status === 'rewarded'); assert.ok(rewarded);
  if(explorationMax){state.exploration={enabled:true,windowActivityId:null,openedAtActiveMs:null,usedMs:120000,learners:Object.fromEntries(Object.keys(state.roster).map(id=>[id,{found:7,fragments:7,choices:[2,2,2]}]))};report.exploration={kind:'Explicit synthetic maximum seed; claims are separately proven through nativeHTTP',learners:150,fragments:450};estimate();}
  report.reducer = { ...stats(latencies), ...(reuse?{timing:'Cached actual reducer fixture; current codec/HTTP measured separately'}:{}),fullIndividualSubmissions: Object.keys(state.submissions).length, tutors: 75, recipients: 75, history: 900,
    rewarded: state.tutors.history.filter(pair => pair.status === 'rewarded').length, requestLimit: 'Three per tutor per activity; one present consenting recipient at a time; 900 global hard refusal' };
  assert.equal(sha(await readFile(sourcePath)), backupHash); phase('Combined150 full lesson +900 reachable tutor rows ready');
  if (http) {
    await mkdir(join(directory, 'd1', sqlite, '..'), { recursive: true });
    await copyFile(sourcePath, join(directory, 'd1', sqlite));
    const clone = new DatabaseSync(join(directory, 'd1', sqlite));
    const tokens = new Map(), classTokens = new Map(), classMemberRows = clone.prepare('SELECT learner_id,class_member_id FROM lesson_learners WHERE session_id=?').all(row.id);
    const shift = Date.now() - state.clock.lastNow;
    for (const key of ['startedAt','lastNow','activityStartedAt','activityDeadline']) if (Number.isFinite(state.clock[key])) state.clock[key] += shift;
    state.clock.activityDeadline += 30 * 60000;
    report.fixture.clockShift = { reason: 'Only isolated synthetic fixture moved to current server wall, exit extended30min for HTTP throughput; no prior audit/submission timestamps rewritten', milliseconds: shift };
    let initialState = durableCopy(state);
    initialState = packLessonState(initialState);
    assert.ok(Buffer.byteLength(JSON.stringify(initialState)) <= MAX_STATE_BYTES, 'Synthetic seed must already respect supported durable-state cap');
    clone.prepare('UPDATE lesson_sessions SET state=?,status=?,revision=? WHERE id=?').run(JSON.stringify(initialState), 'active', state.revision, row.id);
    clone.prepare('UPDATE rooms SET deleted_at=NULL WHERE id=?').run(row.room_id);
    for (const member of classMemberRows) {
      const token = randomBytes(32).toString('base64url'), classToken = randomBytes(32).toString('base64url'); secrets.add(token); secrets.add(classToken);
      tokens.set(member.learner_id, token); classTokens.set(member.learner_id, classToken);
      clone.prepare('UPDATE lesson_learners SET token_hash=?,present=1 WHERE session_id=? AND learner_id=?').run(sha(token), row.id, member.learner_id);
      clone.prepare('UPDATE lesson_class_members SET revoked_at=NULL WHERE id=?').run(member.class_member_id);
      clone.prepare('INSERT INTO lesson_class_login_sessions(id,member_id,token_hash,created_at,expires_at) VALUES(?,?,?,?,?)').run(randomUUID(), member.class_member_id, sha(classToken), Date.now(), Date.now() + 86400000);
    }
    clone.close();
    const require = createRequire(import.meta.url), wrangler = require.resolve('wrangler');
    const { Miniflare } = await import(pathToFileURL(require.resolve('miniflare', { paths: [wrangler] })).href);
    const workerDirectory = join(buildRoot, 'dist/server'), files = (await readdir(workerDirectory, { recursive: true })).filter(file => file.endsWith('.js')).sort();
    report.worker = { buildRoot, entrySha256: sha(await readFile(join(workerDirectory, 'index.js'))), modules: files.length };
    mf = new Miniflare({ rootPath: workerDirectory, modules: ['index.js', ...files.filter(file => file !== 'index.js')].map(file => ({ type: 'ESModule', path: join(workerDirectory, file) })), compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'takeover-e2e-qa' }, d1Persist: join(directory, 'd1'), r2Buckets: { LESSON_SOURCES: 'r6-load-qa' }, r2Persist: join(directory, 'r2'), port: 0, host: '127.0.0.1', outboundService: () => { report.externalRequests++; return new Response('External requests disabled', { status: 403 }); } });
    const base = String(await mf.ready).replace(/\/$/, ''); assert.equal(new URL(base).hostname, '127.0.0.1'); database = await mf.getD1Database('DB');
    const account = priorDatabase.prepare('SELECT email FROM accounts WHERE id=?').get(teacher.id), ownerHeaders = { 'oai-authenticated-user-id': teacher.id, 'oai-authenticated-user-email': account.email };
    const request = async (path, body, headers = ownerHeaders) => {
      const started = performance.now(); const response = await safeFetch(base + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined },body?.event?.type||'GET');
      const data = await response.json(); report.samples.push({ path: path.split('?')[0], action: body?.event?.type || body?.action || 'GET', status: response.status, ms: Math.round(performance.now() - started), ...(data.error ? { error: data.error } : {}) });
      assert.equal(response.status, 200, JSON.stringify(report.samples.at(-1))); if (data.result) assert.equal(data.result.ok, true, data.result.code); return data;
    };
    const event = (type, payload, revision, actor = ownerHeaders) => request('/api/lesson-sessions', { action: 'event', id: row.id, event: { type, payload, eventId: 'r6-http-' + ++serial, activityId: state.timeline.currentActivityId, round: state.round, revision } }, actor);
    const first = (await request('/api/lesson-sessions?id=' + row.id)).view;
    assert.equal(first.tutors.history.length, 900); assert.deepEqual(first.tutors.history, state.tutors.history);
    await request('/api/lesson-sessions',{action:'tick',id:row.id,round:first.round,revision:first.revision,eventId:'r6-first-tick'});
    const persisted = await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(row.id).first();
    report.initialPersisted = { bytes: Buffer.byteLength(persisted.state), headroomBytes: MAX_STATE_BYTES - Buffer.byteLength(persisted.state), seededRawBytes: Buffer.byteLength(JSON.stringify(initialState)), historyVerifiedDecoded: 900 };
    assert.ok(report.initialPersisted.bytes <= MAX_STATE_BYTES);
    phase('Actual Worker writes compact fixture, exact900 history decoded');
    const task = state.package.tasks.find(task => task.id === 'task-exit-ticket'), startRevision = (await request('/api/lesson-sessions?id=' + row.id)).revision;
    let cursor = 0;
    const submissions = await Promise.allSettled(Array.from({ length: 5 }, async () => { while (cursor < ids.length) { const learnerId = ids[cursor++]; await event('SUBMIT', { taskId: task.id, answer: 'Em tự đối chiếu các biểu diễn và giải thích chỉ số n, số hạng u_n.' }, startRevision, { Authorization: 'Bearer ' + tokens.get(learnerId) }); } }));
    const failedSubmission = submissions.find(result=>result.status==='rejected');
    if(failedSubmission)throw failedSubmission.reason;
    const ownViews = [];
    for (const learnerId of ids) ownViews.push(await request('/api/lesson-sessions?id=' + row.id, undefined, { Authorization: 'Bearer ' + tokens.get(learnerId) }));
    assert.ok(ownViews.every(view => !JSON.stringify(view.view.tutor).includes('answerKey')));
    const beforeRevoke = (await request('/api/lesson-sessions?id=' + row.id)).view;
    await event('TUTOR_REVOKE', { requestId: rewarded.id }, beforeRevoke.revision);
    const afterRevoke = (await request('/api/lesson-sessions?id=' + row.id)).view;
    const revoked = afterRevoke.tutors.history.find(pair => pair.id === rewarded.id); assert.equal(revoked.status, 'reward_revoked'); assert.ok(revoked.revokedAt);
    const passport = await request('/api/lesson-classes', undefined, { Authorization: 'Bearer ' + classTokens.get(rewarded.tutorId) });
    assert.ok(passport.passport.objectives); report.cumulativePassportRead = { result: 'PASS', objectiveCount: passport.passport.objectives.length, scope: 'Own synthetic class bearer after actual sync-triggering HTTP writes' };
    const final = await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(row.id).first();
    report.finalPersisted = { bytes: Buffer.byteLength(final.state), headroomBytes: MAX_STATE_BYTES - Buffer.byteLength(final.state), samples: report.samples.length,
      submissionRequests: report.samples.filter(sample => sample.action === 'SUBMIT').length, errors: report.samples.filter(sample => sample.status !== 200).length,
      latency: stats(report.samples.map(sample => sample.ms)), rewardRevocationAfterDecode: true, historyCountAfterWrites: afterRevoke.tutors.history.length, jeopardyReceiptCountAfterWrites: Object.keys(unpackLessonState(JSON.parse(final.state)).classEvent?.receipts || {}).length };
    assert.equal(report.finalPersisted.submissionRequests, 150); assert.equal(report.finalPersisted.historyCountAfterWrites, 900); assert.ok(report.finalPersisted.bytes <= MAX_STATE_BYTES);
    assert.equal(report.finalPersisted.jeopardyReceiptCountAfterWrites, report.jeopardy.domainPickAnswerRequests); assert.equal(report.externalRequests, 0);
    assert.equal(sha(await readFile(sourcePath)), backupHash); report.result = 'PASS'; phase('Actual HTTP150 post-event submits/polls + reward revoke + private passport pass');
  }
  }
} catch (error) { report.result = 'HOLD'; report.failure = redact(error); process.exitCode = 1; }
finally {
  if(database&&report.fixture?.sessionId){try{
    const persisted=await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(report.fixture.sessionId).first();
    const decoded=unpackLessonState(JSON.parse(persisted.state));
    report.persistedAtStop={bytes:Buffer.byteLength(persisted.state),headroomBytes:MAX_STATE_BYTES-Buffer.byteLength(persisted.state),history:decoded.tutors?.history?.length||0,
      eventReceipts:Object.keys(decoded.classEvent?.receipts||{}).length,submissions:Object.keys(decoded.submissions||{}).length,
      acceptedPostEventSubmits:report.samples.filter(sample=>sample.action==='SUBMIT'&&sample.status===200).length,
      failures:report.samples.filter(sample=>sample.status!==200).map(sample=>({action:sample.action,status:sample.status,error:sample.error}))};
  }catch(error){report.snapshotFailure=redact(error);}}
  await mf?.dispose(); priorDatabase?.close();
  await writeFile(artifact, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ artifact, result: report.result, commands: report.commands, capBytes: report.capBytes, ...(report.failure ? { failure: report.failure } : {}) }));
}
