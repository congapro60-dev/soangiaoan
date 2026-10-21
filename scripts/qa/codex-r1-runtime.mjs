import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(import.meta.dirname, '../..');
const buildRoot = resolve(process.env.TAKEOVER_BUILD_ROOT || join(root, '.sites-runtime/takeover-candidate-20261011'));
assert.equal(buildRoot, resolve(root, '.sites-runtime/takeover-candidate-20261011'), 'R1 QA requires isolated candidate');
const directory = join(root, '.sites-runtime/r1-native-qa', new Date().toISOString().replace(/[:.]/g, '-'));
const artifact = join(root, 'tasks/codex-r1-runtime.json');
const sha = value => createHash('sha256').update(value).digest('hex');
const secrets = new Set();
const secret = value => { if (value) secrets.add(value); return value; };
const clean = error => { let text = String(error?.stack || error); for (const value of secrets) text = text.replaceAll(value, '[redacted]'); return text.slice(0, 2000); };
const bearer = token => ({ Authorization: 'Bearer ' + token });
const owner = 'qa-r1-' + Date.now();
const teacher = { 'oai-authenticated-user-id': owner, 'oai-authenticated-user-email': owner + '@example.invalid' };
const other = { 'oai-authenticated-user-id': owner + '-other', 'oai-authenticated-user-email': owner + '-other@example.invalid' };
const report = { harnessRepairs: ['Initial module order selected a non-entry module; corrected index.js first.', 'Synthetic request IDs were too short; corrected qa-r1 prefix.', 'A retry overlapped parent candidate rebuild; waited for GO.', 'Reusing one session bearer in a different session conflicted with global token identity; corrected fresh bearer per session while preserving class member.'], generatedAt: new Date().toISOString(), result: 'HOLD', productionTouched: false, externalRequests: 0, persistence: directory, checks: [], stages: [], limits: ['Synthetic accounts and local compiled Worker only.', 'No 150-pupil load certification.', 'No browser or physical device claim.', 'Exam time is advanced only through isolated synthetic D1 deadline fixture. API authorization and save handlers are unmodified.'] };
let mf, database, serial = 0;
const rid = prefix => 'qa-r1-' + prefix + '-' + ++serial;
const stage = name => { report.stages.push({ name, checks: report.checks.length, result: 'PASS' }); console.log(JSON.stringify(report.stages.at(-1))); };
await mkdir(directory, { recursive: true });
try {
  const require = createRequire(import.meta.url);
  const { Miniflare } = await import(pathToFileURL(require.resolve('miniflare', { paths: [require.resolve('wrangler')] })).href);
  const workerDir = join(buildRoot, 'dist/server');
  const files = (await readdir(workerDir, { recursive: true })).filter(file => file.endsWith('.js')).sort();
  const parts = await Promise.all(files.map(async file => ({ path: file, sha256: sha(await readFile(join(workerDir, file))) })));
  report.worker = { buildRoot, entrySha256: parts.find(part => part.path === 'index.js')?.sha256, treeSha256: sha(JSON.stringify(parts)), modules: parts.length, runtime: 'actual compiled candidate in workerd/D1/R2' };
  mf = new Miniflare({ rootPath: workerDir, modules: ['index.js', ...files.filter(file => file !== 'index.js')].map(file => ({ type: 'ESModule', path: join(workerDir, file) })), compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'r1-native-qa' }, d1Persist: join(directory, 'd1'), r2Buckets: { LESSON_SOURCES: 'r1-native-qa' }, r2Persist: join(directory, 'r2'), host: '127.0.0.1', port: 0, outboundService: () => { report.externalRequests++; return new Response('External disabled', { status: 403 }); } });
  const base = String(await mf.ready).replace(/\/$/, '');
  assert.equal(new URL(base).hostname, '127.0.0.1');
  database = await mf.getD1Database('DB');
  const journal = JSON.parse(await readFile(join(buildRoot, 'drizzle/meta/_journal.json'), 'utf8')).entries;
  report.migrations = journal.map(entry => entry.tag);
  for (const entry of journal) for (const sql of (await readFile(join(buildRoot, 'drizzle', entry.tag + '.sql'), 'utf8')).split('--> statement-breakpoint')) if (sql.trim()) await database.prepare(sql).run();
  async function api(path, body, headers = teacher, expected = 200) {
    const start = Date.now();
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    const check = { path: path.split('?')[0], action: body?.action || 'GET', type: body?.event?.type, status: response.status, expected, ms: Date.now() - start, ...(data.error ? { error: data.error } : {}) };
    report.checks.push(check);
    assert.equal(response.status, expected, JSON.stringify(check));
    return data;
  }

  const exam = (await api('/api/exams', { action: 'create', requestId: rid('exam-create'), exam: { title: 'QA R1 synthetic exam', durationMin: 5, settings: { graceSeconds: 0 }, questions: [{ label: 'Câu 1', section: 'I', type: 'short', text: 'Tính 2+3', key: { accept: ['5'] }, points: 1 }] } }, teacher, 201)).exam;
  secret(exam.code);
  await api('/api/exams', { action: 'control', id: exam.id, command: 'open' });
  const examPupils = [];
  for (const name of ['HS giả thi A', 'HS giả thi B']) { const p = await api('/api/exam-play', { action: 'join', code: exam.code, name }, {}); secret(p.token); examPupils.push(p); }
  await api('/api/exams', { action: 'control', id: exam.id, command: 'start' });
  for (const pupil of examPupils) await api('/api/exam-play', { action: 'integrity', integrity: { confirmed: true, usedAI: false } }, bearer(pupil.token));
  const accommodation = { action: 'accommodation', id: exam.id, attemptId: examPupils[0].attemptId, expectedRevision: 0, extraMinutes: 5, textScale: 1.5 };
  await api('/api/exams', accommodation, other, 404);
  await api('/api/exams', accommodation, {}, 401);
  await api('/api/exams', accommodation);
  await api('/api/exams', accommodation);
  const accommodationRow = await database.prepare('SELECT extra_minutes,text_scale,accommodation_revision FROM exam_attempts WHERE id=?').bind(examPupils[0].attemptId).first();
  assert.deepEqual({ ...accommodationRow }, { extra_minutes: 5, text_scale: 1.5, accommodation_revision: 1 });
  await database.prepare('UPDATE exams SET ends_at=? WHERE id=?').bind(Date.now() - 1000, exam.id).run();
  const extended = await api('/api/exam-play', undefined, bearer(examPupils[0].token));
  const expired = await api('/api/exam-play', undefined, bearer(examPupils[1].token));
  assert.equal(extended.finished, false); assert.equal(extended.exam.status, 'running'); assert.equal(extended.attempt.textScale, 1.5);
  assert.equal(expired.finished, true); assert.equal(expired.attempt.textScale, 1); assert.equal(expired.review, undefined);
  await api('/api/exam-play', { action: 'answer', qid: 'q1', value: '5', seq: 1 }, bearer(examPupils[0].token));
  await api('/api/exam-play', { action: 'answer', qid: 'q1', value: '5', seq: 1 }, bearer(examPupils[1].token), 410);
  await api('/api/exam-play', { action: 'join', code: exam.code, name: 'HS giả trễ' }, {}, 410);
  await api('/api/exams', { action: 'accommodation', id: exam.id, attemptId: examPupils[1].attemptId, expectedRevision: 0, extraMinutes: 5, textScale: 1.5 }, teacher, 409);
  assert.equal((await api('/api/exams?id=' + exam.id)).exam.status, 'running');
  await api('/api/exams', { action: 'control', id: exam.id, command: 'close' });
  await api('/api/exam-play', { action: 'answer', qid: 'q1', value: '6', seq: 2 }, bearer(examPupils[0].token), 410);
  report.exam = { individualExtraMinutes: 5, textScale: 1.5, unchangedOtherScale: 1, retryRevision: 1, expiredPupilSealed: true, extendedPupilSaved: true, manualCloseStopsExtended: true, timeFixture: 'Only synthetic exam ends_at set to Date.now()-1000 in isolated D1' };
  stage('A10 actual Worker own deadline/font/CAS retry/owner boundary/manual close');

  const cls = (await api('/api/lesson-classes', { action: 'create', title: 'Lớp giả R1', requestId: rid('class') })).class; secret(cls.code);
  const pupils = [];
  for (let i = 0; i < 4; i++) {
    const p = await api('/api/lesson-classes', { action: 'member-add', classId: cls.id, name: 'HS giả R1 ' + i, requestId: rid('member') });
    secret(p.pin); secret(p.member.code);
    const login = await api('/api/lesson-classes', { action: 'join', classCode: cls.code, memberCode: p.member.code, pin: p.pin }, {}); secret(login.token);
    pupils.push({ member: p.member, classToken: login.token, token: secret(randomBytes(32).toString('base64url')) });
  }
  const pkgBytes = await readFile(join(buildRoot, 'content/lessons/g11-sequences-p1.json'));
  const pkg = JSON.parse(pkgBytes);
  report.package = { source: 'content/lessons/g11-sequences-p1.json', sha256: sha(pkgBytes), modifications: ['Synthetic ID/version only; reserve3/slot41 with matching reserveactivity; source review acknowledged by synthetic teacher'] };
  pkg.id = 'qa-r1-native'; pkg.version = '0.0.1'; pkg.status = 'draft'; delete pkg.contentHash;
  pkg.budget.reserveMinutes = 3; pkg.budget.slotMinutes = 41; pkg.activities.find(a => a.budgetRole === 'reserve').minutes = 3;
  const saved = await api('/api/lessons', { action: 'save', package: pkg });
  const approved = await api('/api/lessons', { action: 'approve', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '0.0.2', sourceReviewAck: pkg.sourceRefs.map(ref => ({ ...ref, numericReviewConfirmed: true })) });
  const director = await api('/api/lessons?kind=director&id=' + approved.row.rowId);
  const plan = await api('/api/lessons', { action: 'approve-plan', packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planHash: director.plan.contentHash, sourceReview: approved.package.sourceRefs });
  const tuple = { packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planRowId: plan.row.rowId, planHash: plan.row.planHash, classId: cls.id, mode: 'live' };
  async function createRoom(label) {
    const created = await api('/api/lesson-sessions', { action: 'create', ...tuple, title: 'QA R1 ' + label, requestId: rid('room') }); secret(created.session.code); secret(created.presenterToken);
    const sid = created.session.id, players = [];
    const room = { sid, created, players, get: async (credentials = teacher, actor) => (await api('/api/lesson-sessions?id=' + sid + (actor ? '&actingLearnerId=' + actor : ''), undefined, credentials)).view };
    room.event = async (type, payload = {}, credentials = teacher, expected = 200, actor) => {
      const view = await room.get(credentials, actor);
      return api('/api/lesson-sessions', { action: 'event', id: sid, ...(actor ? { actingLearnerId: actor } : {}), event: { type, payload, eventId: rid(type), round: view.round, revision: view.revision, activityId: view.timeline.currentActivityId } }, credentials, expected);
    };
    for (const p of pupils.slice(0, 3)) { const roomToken = secret(randomBytes(32).toString('base64url')); const joined = await api('/api/lesson-sessions', { action: 'join', code: created.session.code, name: 'IGNORED', classToken: p.classToken, requestId: rid('join') }, bearer(roomToken)); players.push({ ...p, token: roomToken, id: joined.learnerId }); }
    await room.event('START');
    while ((await room.get()).timeline.currentActivityId !== 'act-prac') await room.event('NEXT');
    for (const task of pkg.tasks.filter(t => t.activityId === 'act-prac' && t.participation === 'individual' && (!t.branch || ['shared', 'core'].includes(t.branch)))) await room.event('SUBMIT', { taskId: task.id, answer: task.evaluation.answerKey }, bearer(players[0].token));
    assert.equal((await room.get(bearer(players[0].token))).tutor.eligible, true);
    return room;
  }
  const room = await createRoom('main');
  const [tutor, recipient] = room.players;
  const evidenceBeforeEvent = (await database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence WHERE session_id=?').bind(room.sid).first()).n;
  const submissionsBeforeEvent = (await room.get()).passports[tutor.id].submissions.length;
  await room.event('CLASS_EVENT_OPEN', { type: 'mountain', durationMs: 180000, seed: 2 });
  const mountain = (await room.get(bearer(tutor.token))).classEvent;
  assert.equal(mountain.own.task, null); assert.ok(mountain.own.board.length);
  const lastCell = mountain.own.board.at(-1), pick = { eventId: mountain.id, cellId: lastCell.id, requestId: rid('pick') };
  await room.event('CLASS_EVENT_ANSWER', { eventId: mountain.id, step: 0, answer: 0, requestId: rid('before-pick') }, bearer(tutor.token), 400);
  const stale = await room.event('CLASS_EVENT_PICK', { ...pick, eventId: 'old' }, bearer(tutor.token), 400); assert.equal(stale.error, 'STALE_CLASS_EVENT');
  await room.event('PAUSE');
  assert.equal((await room.event('CLASS_EVENT_PICK', pick, bearer(tutor.token), 400)).error, 'PAUSED');
  await room.event('RESUME');
  const shared = await api('/api/lesson-devices', { action: 'create', sessionId: room.sid, kind: 'B', memberIds: room.players.map(p => p.id), requestId: rid('shared') }); secret(shared.token);
  await room.event('CLASS_EVENT_PICK', pick, bearer(shared.token), 200, tutor.id);
  assert.equal((await room.get(bearer(shared.token), tutor.id)).classEvent.own.task.id, lastCell.id);
  assert.equal((await room.get(bearer(shared.token), recipient.id)).classEvent.own.task, null);
  const chosenTask = pkg.tasks.find(t => t.id === lastCell.id);
  const scored = await room.event('CLASS_EVENT_ANSWER', { eventId: mountain.id, step: 0, answer: chosenTask.evaluation.answerKey, requestId: rid('chosen') }, bearer(shared.token), 200, tutor.id);
  assert.equal(scored.result.points, lastCell.points);
  await room.event('CLASS_EVENT_PICK', pick, bearer(tutor.token));
  assert.equal((await room.get(bearer(tutor.token))).classEvent.own.task, null);
  const late = await api('/api/lesson-sessions', { action: 'join', code: room.created.session.code, name: 'IGNORED', classToken: pupils[3].classToken, requestId: rid('late') }, bearer(pupils[3].token));
  assert.equal(late.projection.classEvent.own, null);
  assert.equal((await room.event('CLASS_EVENT_PICK', pick, bearer(pupils[3].token), 400)).error, 'EVENT_LEARNER_UNAVAILABLE');
  const tv = (await api('/api/lesson-sessions?id=' + room.sid + '&kind=presenter', undefined, bearer(room.created.presenterToken))).view;
  assert.equal(tv.classEvent.own, null); assert.doesNotMatch(JSON.stringify(tv.classEvent), /answerKey|prompt|selectedCellId|boardCategories/);
  await room.event('CLASS_EVENT_CLOSE');
  assert.equal((await room.event('CLASS_EVENT_PICK', { ...pick, requestId: rid('closed-pick') }, bearer(tutor.token), 400)).error, 'EVENT_CLOSED');
  const eventState = JSON.parse((await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(room.sid).first()).state);
  assert.equal(eventState.passports[tutor.id].submissions.length, submissionsBeforeEvent);
  assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence WHERE session_id=?').bind(room.sid).first()).n, evidenceBeforeEvent);
  assert.equal(eventState.rewardLedger[Object.keys(eventState.rewardLedger).find(key => key.includes('class-event'))], undefined);
  report.jeopardy = { ownCells: mountain.own.board.length, selectedStake: lastCell.points, sharedActorIsolation: true, lateParticipantFrozen: true, stalePauseCloseGuard: true, pointsSeparate: true, reserveUsedMs: eventState.clock.classEventBudgetUsedMs };
  stage('Jeopardy actual Worker choose→answer/shareddisplay/actor/clock/late roster/privacy');

  async function consent(activeRoom, exercisePrivacy = false) {
    const [t, r, s] = activeRoom.players;
    if (exercisePrivacy) await activeRoom.event('SAVE_DRAFT', { taskId: 'task-prac-error-hunt', answer: 'QA_PRIVATE_PEER_WORK' }, bearer(r.token));
    await activeRoom.event('TUTOR_NEED', { needed: true }, bearer(r.token));
    await activeRoom.event('TUTOR_REQUEST', { recipientId: r.id }, bearer(t.token));
    const pending = await activeRoom.get(bearer(t.token));
    const pair = (await activeRoom.get(bearer(r.token))).tutor.pair;
    assert.equal(pending.tutor.hints.length, 0);
    assert.equal((await activeRoom.get(bearer(s.token))).tutor.pair, null);
    assert.equal((await activeRoom.event('TUTOR_RESPOND', { requestId: pair.id, accept: true }, bearer(s.token), 400)).error, 'TUTOR_NOT_AVAILABLE');
    await activeRoom.event('TUTOR_RESPOND', { requestId: pair.id, accept: true }, bearer(r.token));
    const active = await activeRoom.get(bearer(t.token));
    assert.ok(active.tutor.hints.length);
    assert.doesNotMatch(JSON.stringify(active.tutor), /QA_PRIVATE_PEER_WORK|answerKey|evaluation|supportRationale|submissions/);
    return pair.id;
  }
  async function reward(activeRoom, pairId) {
    const [t, r] = activeRoom.players;
    const before = await activeRoom.get();
    const n = before.passports[t.id].submissions.length;
    const helped = await activeRoom.event('SUBMIT', { taskId: 'task-prac-error-hunt', answer: 20 }, bearer(r.token));
    assert.equal(helped.view.passport.submissions.at(-1).assisted, true);
    await activeRoom.event('TUTOR_END', { requestId: pairId }, bearer(r.token));
    await activeRoom.event('NEXT');
    await activeRoom.event('INTEGRITY', { confirmed: true, usedAI: false }, bearer(r.token));
    const recheck = await activeRoom.event('SUBMIT', { taskId: 'task-recheck-19', answer: 'w_n=3n+1; 4,7,10; w_1=4; w_n=w_(n-1)+3; kiểm tra n=1,2,3.' }, bearer(r.token));
    assert.equal(recheck.result.pending, true);
    await activeRoom.event('ASSESS', { submissionId: recheck.result.submissionId, criteriaMet: true, feedback: 'QA synthetic teacher checked' });
    const teacherView = await activeRoom.get();
    assert.equal(teacherView.tutors.history.find(p => p.id === pairId).status, 'rewarded');
    assert.equal(teacherView.passports[t.id].submissions.length, n, 'help cannot invent tutor maths evidence');
    assert.equal((await activeRoom.get(bearer(t.token))).tutor.stars, 1);
    const cumulative = await api('/api/lesson-classes', undefined, bearer(t.classToken));
    assert.ok(cumulative.passport.tutorHistory.some(item => item.id === pairId && !item.revokedAt));
    return recheck.result.submissionId;
  }
  const pairId = await consent(room, true);
  const recheckSubmissionId = await reward(room, pairId);
  await room.event('TUTOR_REVOKE', { requestId: pairId });
  assert.equal((await room.get(bearer(tutor.token))).tutor.stars, 0);
  await room.event('CONCLUDE');
  const cumulative = await api('/api/lesson-classes', undefined, bearer(tutor.classToken));
  assert.ok(cumulative.passport.tutorHistory.some(item => item.id === pairId && item.revokedAt));
  stage('Tutor actual bearer consent/private hints/new open recheck/teacher assessment/cumulative/revoke-before-conclude');

  const second = await createRoom('post-conclude');
  const secondPair = await consent(second);
  await reward(second, secondPair);
  await second.event('CONCLUDE');
  await second.event('TUTOR_REVOKE', { requestId: secondPair });
  assert.equal((await second.get(bearer(second.players[0].token))).tutor.stars, 0);
  const durable = await api('/api/lesson-classes', undefined, bearer(second.players[0].classToken));
  assert.ok(durable.passport.tutorHistory.some(item => item.id === secondPair && item.revokedAt));
  const secondState = JSON.parse((await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(second.sid).first()).state);
  assert.equal(Object.values(secondState.rewardLedger).filter(item => item.kind === 'tutor' && item.active).length, 0);
  assert.equal(secondState.gameWallets.learners[second.players[0].id].bonus, 0);
  stage('Tutor post-conclude revoke clears durable star/wallet/ledger, preserves revoked audit');

  const third = await createRoom('branch-scope');
  await third.event('TUTOR_NEED', { needed: true }, bearer(third.players[1].token));
  await third.event('TUTOR_REQUEST', { recipientId: third.players[1].id }, bearer(third.players[0].token));
  const requestOnly = (await third.get(bearer(third.players[1].token))).tutor.pair.id;
  await third.event('SELECT_BRANCH', { branch: 'support' }, bearer(third.players[1].token));
  assert.equal((await third.get(bearer(third.players[0].token))).tutor.hints.length, 0);
  assert.equal((await third.event('TUTOR_RESPOND', { requestId: requestOnly, accept: true }, bearer(third.players[1].token), 400)).error, 'TUTOR_NOT_AVAILABLE');
  await third.event('CONCLUDE');
  report.tutor = { successfulRecheckSubmissionId: recheckSubmissionId, privateWorkNotLeaked: true, strangerConsentDenied: true, teacherAssessmentRequired: true, starBeforeRevoke: 1, starAfterBeforeConcludeRevoke: 0, starAfterPostConcludeRevoke: 0, requestBranchChangeInvalidated: true };
  stage('Tutor request-only branch change cancels scope and discloses no hints');
  assert.equal(report.externalRequests, 0);
  report.result = 'PASS';
} catch (error) {
  report.failure = clean(error); process.exitCode = 1;
} finally {
  if (mf) await mf.dispose();
  try {
    const sqliteFiles = (await readdir(join(directory, 'd1'), { recursive: true })).filter(file => /(?:^|[\\/])[0-9a-f]{64}\.sqlite$/.test(file));
    assert.ok(sqliteFiles.length, 'Expected persisted synthetic D1 SQLite file');
    if (sqliteFiles.length) {
      const checked = new DatabaseSync(join(directory, 'd1', sqliteFiles[0]), { readOnly: true });
      try { report.sqlite = { integrityCheck: checked.prepare('PRAGMA integrity_check').get().integrity_check, foreignKeyViolations: checked.prepare('PRAGMA foreign_key_check').all().length }; report.sessions = checked.prepare("SELECT status,revision,length(CAST(state AS BLOB)) AS stateBytes,(SELECT COUNT(*) FROM lesson_learners l WHERE l.session_id=s.id) AS learners FROM lesson_sessions s ORDER BY created_at").all(); assert.equal(report.sqlite.integrityCheck, 'ok'); assert.equal(report.sqlite.foreignKeyViolations, 0); }
      finally { checked.close(); }
    }
  } catch (error) { report.failure ||= clean(error); report.result = 'HOLD'; process.exitCode = 1; }
  let serialized = JSON.stringify(report, null, 2); for (const value of secrets) serialized = serialized.replaceAll(value, '[redacted]');
  await writeFile(artifact, serialized + '\n');
  console.log(JSON.stringify({ artifact, result: report.result, stages: report.stages.length, checks: report.checks.length, externalRequests: report.externalRequests, ...(report.failure ? { failure: report.failure } : {}) }));
}
