import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { MAX_STATE_BYTES } from '../../lib/lesson/service.js';

// Actual compiled Worker + isolated workerd/D1/R2. Never contact production or an AI provider.
const root = resolve(import.meta.dirname, '../..');
const buildRoot = process.env.TAKEOVER_BUILD_ROOT ? resolve(process.env.TAKEOVER_BUILD_ROOT) : root;
assert.ok(!process.env.TAKEOVER_BUILD_ROOT || /^(?:[A-Za-z]:[\\/]|\/)/.test(process.env.TAKEOVER_BUILD_ROOT), 'TAKEOVER_BUILD_ROOT must be absolute');
const coreOnly = process.argv.includes('--core-only');
const directory = join(root, '.sites-runtime/takeover-e2e-qa', new Date().toISOString().replace(/[:.]/g, '-'));
const artifact = join(root, coreOnly ? 'tasks/codex-takeover-e2e-core.json' : 'tasks/codex-takeover-e2e.json');
const workerDirectory = join(buildRoot, 'dist/server');
const sha = value => createHash('sha256').update(value).digest('hex');
const bearer = token => ({ Authorization: 'Bearer ' + token });
const owner = 'qa-takeover-e2e-' + Date.now();
const teacher = { 'oai-authenticated-user-id': owner, 'oai-authenticated-user-email': owner + '@example.invalid' };
const other = { 'oai-authenticated-user-id': owner + '-other', 'oai-authenticated-user-email': owner + '-other@example.invalid' };
const report = { generatedAt: new Date().toISOString(), command: 'node scripts/qa/codex-takeover-e2e.mjs' + (coreOnly ? ' --core-only' : ''), coreOnly, result: 'HOLD', productionTouched: false, externalRequests: 0, persistence: directory, stages: [], checks: [], load: null };
const loadConcurrency = Number(process.argv.find(arg => arg.startsWith('--concurrency='))?.split('=')[1] || 15);
assert.ok(Number.isInteger(loadConcurrency) && loadConcurrency >= 1 && loadConcurrency <= 150, 'Invalid --concurrency');
const secrets = new Set();
const transportFailures = [];
let mf, database, serial = 0;
const secret = value => { if (value) secrets.add(value); return value; };
const rid = prefix => prefix + '-' + ++serial;
function cleanError(error) {
  let message = [error?.message || error, error?.cause?.code, error?.cause?.message].filter(Boolean).join(' / ');
  for (const value of secrets) message = message.replaceAll(value, '[redacted]');
  return message.slice(0, 2000);
}
const stage = name => { report.stages.push({ name, result: 'PASS', checks: report.checks.length }); console.log(JSON.stringify({ stage: name, result: 'PASS', checks: report.checks.length })); };
const stat = entries => {
  const sorted = entries.map(entry => entry.ms).sort((a, b) => a - b);
  return { requests: entries.length, errors: entries.filter(entry => entry.status !== 200).length, p50Ms: Math.round(sorted[Math.ceil(sorted.length * .5) - 1] || 0), p95Ms: Math.round(sorted[Math.ceil(sorted.length * .95) - 1] || 0), maxMs: Math.round(sorted.at(-1) || 0) };
};
async function pooled(items, concurrency, fn) {
  let cursor = 0;
  const results = new Array(items.length);
  const attempts = await Promise.allSettled(Array.from({ length: Math.min(items.length, concurrency) }, async () => {
    while (cursor < items.length) { const index = cursor++; results[index] = await fn(items[index], index); }
  }));
  const rejected = attempts.find(attempt => attempt.status === 'rejected');
  if (rejected) throw rejected.reason;
  return results;
}
await mkdir(directory, { recursive: true });
try {
  const require = createRequire(import.meta.url), wrangler = require.resolve('wrangler');
  const { Miniflare } = await import(pathToFileURL(require.resolve('miniflare', { paths: [wrangler] })).href);
  const files = (await readdir(workerDirectory, { recursive: true })).filter(file => file.endsWith('.js')).sort();
  const workerParts = await Promise.all(files.map(async file => ({ path: file, sha256: sha(await readFile(join(workerDirectory, file))) })));
  report.worker = { entrySha256: workerParts.find(item => item.path === 'index.js')?.sha256, treeSha256: sha(JSON.stringify(workerParts)), modules: files.length, buildRoot, runtime: 'actual compiled candidate Worker in workerd + D1 + R2', sourceClaims: 'Only this compiled tree; rebuild and rerun after source changes' };
  mf = new Miniflare({ rootPath: workerDirectory, modules: ['index.js', ...files.filter(file => file !== 'index.js')].map(file => ({ type: 'ESModule', path: join(workerDirectory, file) })), compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'takeover-e2e-qa' }, d1Persist: join(directory, 'd1'), r2Buckets: { LESSON_SOURCES: 'takeover-e2e-qa' }, r2Persist: join(directory, 'r2'), port: 0, host: '127.0.0.1', outboundService: () => { report.externalRequests++; return new Response('External requests disabled in takeover QA', { status: 403 }); } });
  const base = String(await mf.ready).replace(/\/$/, '');
  assert.equal(new URL(base).hostname, '127.0.0.1');
  database = await mf.getD1Database('DB');
  const journal = JSON.parse(await readFile(join(buildRoot, 'drizzle/meta/_journal.json'), 'utf8')).entries;
  report.migrations = journal.map(entry => entry.tag);
  for (const entry of journal) for (const sql of (await readFile(join(buildRoot, 'drizzle', entry.tag + '.sql'), 'utf8')).split('--> statement-breakpoint').filter(sql => sql.trim())) await database.prepare(sql).run();
  const request = async (path, body, headers = teacher, expected = 200, sample) => {
    const started = performance.now();
    let response, transportRetries = 0;
    for (;;) {
      try { response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }); break; }
      catch (error) {
        transportFailures.push({ path: path.split('?')[0], action: body?.action || 'GET', ms: Math.round(performance.now() - started), error: cleanError(error), retry: transportRetries });
        if (error?.cause?.code === 'UND_ERR_SOCKET' && transportRetries < 2) { transportRetries++; continue; }
        const entry = { path: path.split('?')[0], action: body?.action || 'GET', status: 0, expected, ms: Math.round(performance.now() - started), error: cleanError(error), transportRetries };
        report.checks.push(entry); sample?.push(entry);
        if (expected === null) return { data: { error: 'QA_TRANSPORT_FAILURE' }, response: { status: 0 } };
        throw error;
      }
    }
    const data = await response.json();
    const entry = { path: path.split('?')[0], action: body?.action || 'GET', status: response.status, expected, ms: Math.round(performance.now() - started), ...(transportRetries ? { transportRetries } : {}), ...(data.error ? { error: data.error } : {}) };
    report.checks.push(entry); sample?.push(entry);
    if (expected !== null) assert.equal(response.status, expected, JSON.stringify(entry));
    return { data, response };
  };
  const api = async (...args) => (await request(...args)).data;
  const cls = (await api('/api/lesson-classes', { action: 'create', title: 'Lớp giả QA 150', requestId: rid('create-class') })).class;
  secret(cls.code);
  await api('/api/lesson-classes?id=' + cls.id, undefined, other, 404);
  await api('/api/lesson-classes', undefined, {}, 401);
  const team = (await api('/api/lesson-classes', { action: 'team-create', classId: cls.id, title: 'Đội QA', requestId: rid('create-team') })).team;
  const pupils = [];
  async function member(index, teamId = undefined) {
    const result = await api('/api/lesson-classes', { action: 'member-add', classId: cls.id, name: 'HS giả ' + index, ...(teamId ? { teamId } : {}), requestId: rid('member') });
    if (!result.pin) { const reset = await api('/api/lesson-classes', { action: 'member-reset-pin', classId: cls.id, memberId: result.member.id }); result.pin = reset.pin; }
    secret(result.pin); secret(result.member.code);
    const logged = await api('/api/lesson-classes', { action: 'join', classCode: cls.code, memberCode: result.member.code, pin: result.pin }, {});
    secret(logged.token);
    return { member: result.member, pin: result.pin, classToken: logged.token, token: secret(randomBytes(32).toString('base64url')) };
  }
  for (let index = 0; index < 4; index++) pupils.push(await member(index, team.id));
  const packageFixture = JSON.parse(await readFile(join(buildRoot, 'content/lessons/g11-sequences-p1.json'), 'utf8'));
  report.fixtureSource = { path: 'content/lessons/g11-sequences-p1.json', buildRoot, sha256: sha(await readFile(join(buildRoot, 'content/lessons/g11-sequences-p1.json'))), declaredContentHash: packageFixture.contentHash, modifications: ['Synthetic package ID/version; reserve3min/slot41min with matching reserveactivity; approved by synthetic QA teacher'] };
  packageFixture.id = 'qa-takeover-e2e'; packageFixture.version = '0.0.1'; packageFixture.status = 'draft'; delete packageFixture.contentHash;
  packageFixture.budget.reserveMinutes = 3; packageFixture.budget.slotMinutes = 41;
  packageFixture.activities.find(activity => activity.budgetRole === 'reserve').minutes = 3;
  const saved = await api('/api/lessons', { action: 'save', package: packageFixture });
  const approved = await api('/api/lessons', { action: 'approve', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '0.0.2', sourceReviewAck: packageFixture.sourceRefs.map(ref => ({ ...ref, numericReviewConfirmed: true })) });
  const draft = await api('/api/lessons?kind=director&id=' + approved.row.rowId);
  assert.ok(draft.plan?.contentHash);
  const plan = await api('/api/lessons', { action: 'approve-plan', packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planHash: draft.plan.contentHash, sourceReview: approved.package.sourceRefs });
  const tuple = { packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planRowId: plan.row.rowId, planHash: plan.row.planHash, classId: cls.id, mode: 'live' };
  const created = await api('/api/lesson-sessions', { action: 'create', ...tuple, title: 'Phiên giả QA', requestId: rid('create-session') });
  secret(created.session.code); secret(created.presenterToken);
  const sid = created.session.id;
  for (const pupil of pupils) {
    const joined = await api('/api/lesson-sessions', { action: 'join', code: created.session.code, name: 'TÊN GIẢ MẠO', classToken: pupil.classToken, requestId: rid('join') }, bearer(pupil.token));
    pupil.id = joined.learnerId;
    assert.equal(joined.projection.passport.learnerId, pupil.id);
  }
  const get = async (credentials = teacher, actingLearnerId) => (await api('/api/lesson-sessions?id=' + sid + (actingLearnerId ? '&actingLearnerId=' + actingLearnerId : ''), undefined, credentials)).view;
  const event = async (type, payload = {}, credentials = teacher, { expected = 200, actingLearnerId, eventId } = {}) => {
    const view = await get(credentials, actingLearnerId);
    return api('/api/lesson-sessions', { action: 'event', id: sid, ...(actingLearnerId ? { actingLearnerId } : {}), event: { type, payload, round: view.round, revision: view.revision, activityId: view.timeline.currentActivityId, eventId: eventId || rid(type) } }, credentials, expected);
  };
  let teacherView = await get();
  assert.deepEqual(Object.values(teacherView.roster).map(item => item.name).sort(), pupils.map(pupil => pupil.member.name).sort());
  await event('START');
  await api('/api/lesson-sessions?id=' + sid, undefined, other, 403);
  await api('/api/lesson-sessions?id=' + sid, undefined, bearer(randomBytes(32).toString('base64url')), 403);
  const tv = (await api('/api/lesson-sessions?id=' + sid + '&kind=presenter', undefined, bearer(created.presenterToken))).view;
  assert.equal(tv.roster, undefined); assert.equal(tv.passports, undefined);
  for (const pupil of pupils) assert.equal(JSON.stringify(tv).includes(pupil.member.name), false);
  const own = await get(bearer(pupils[0].token));
  assert.equal(own.roster, undefined); assert.equal(own.passports, undefined); assert.equal(JSON.stringify(own.tasks).includes('answerKey'), false);
  stage('class PIN → approved package/plan → live join; authority and public projections');

  // Independently exercise the actual R2 upload/extraction/original-download boundary.
  const sourceText = 'Dãy số lớp 11. Học sinh phân biệt chỉ số n và số hạng u_n; nhận biết dãy hữu hạn và vô hạn.';
  const upload = await fetch(base + '/api/lessons/sources', { method: 'POST', headers: { ...teacher, 'Content-Type': 'text/plain', 'x-file-name': encodeURIComponent('qa-nguon.txt'), 'x-request-id': rid('qa-source') }, body: sourceText });
  assert.equal(upload.status, 201); const source = (await upload.json()).source; assert.equal(source.status, 'ready');
  const original = await fetch(base + '/api/lessons/sources?id=' + source.id + '&download=original', { headers: teacher }); assert.equal(original.status, 200); assert.equal(await original.text(), sourceText);
  await api('/api/lessons/sources?id=' + source.id, undefined, other, 404);
  report.r2 = { uploadStatus: 201, ready: true, originalDownloadMatches: true, foreignReadStatus: 404, sourceBoundToLesson: false };
  stage('R2 source upload/extraction/download remains owner private');

  const b = await api('/api/lesson-devices', { action: 'create', sessionId: sid, kind: 'B', memberIds: pupils.map(pupil => pupil.id), requestId: rid('shared-B') }); secret(b.token);
  const c = await api('/api/lesson-devices', { action: 'create', sessionId: sid, kind: 'C', memberIds: [pupils[2].id], requestId: rid('board-C') }); secret(c.token);
  assert.equal((await api('/api/lesson-devices?sessionId=' + sid, undefined, bearer(b.token))).members.length, 4);
  await api('/api/lesson-sessions?id=' + sid, undefined, bearer(b.token), 403);
  await event('CHOOSE_MASCOT', { mascot: 3 }, bearer(b.token), { actingLearnerId: pupils[1].id });
  teacherView = await get(); assert.equal(teacherView.roster[pupils[1].id].mascot, 3); assert.notEqual(teacherView.roster[pupils[0].id].mascot, 3);
  const firstTask = packageFixture.tasks.find(task => task.id === packageFixture.activities[0].taskIds[0]);
  const board = await event('TEACHER_RESPONSE', { learnerId: pupils[2].id, taskId: firstTask.id, answer: firstTask.evaluation.answerKey });
  assert.equal(board.result.pending, true); assert.equal(board.view.submissions[board.result.submissionId].assisted, true);
  await event('ASSESS', { submissionId: board.result.submissionId, criteriaMet: true }, teacher, { expected: 400 });
  const assessedBoard = await event('ASSESS', { submissionId: board.result.submissionId, criteriaMet: true, nonMastery: true });
  assert.equal(assessedBoard.view.passports[pupils[2].id].submissions.at(-1).assisted, true);
  const boardAudit = await database.prepare("SELECT COUNT(*) AS n FROM admin_audit WHERE actor_account_id=? AND json_extract(payload,'$.type')='TEACHER_RESPONSE'").bind(owner).first(); assert.equal(boardAudit.n, 1);
  assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM lesson_class_evidence WHERE submission_id=? AND counts_for_mastery=1').bind(board.result.submissionId).first()).n, 0);
  stage('B explicit pupil switching; C board pending assessment/nonMastery/audit');

  await event('NEXT');
  const livePractice = await event('REVISIT', { activityId: 'act-exp' }, bearer(pupils[0].token));
  assert.ok(livePractice.view.practice?.attemptId);
  const deadlineRow = await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(sid).first();
  const expiredState = JSON.parse(deadlineRow.state); expiredState.clock.activityDeadline = Date.now() - 1;
  await database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').bind(JSON.stringify(expiredState), sid).run();
  try {
    const denied = await event('REVISIT', { activityId: 'act-exp' }, bearer(pupils[1].token), { expected: 400 }); assert.equal(denied.error, 'REVISIT_LOCKED');
    const deniedSubmit = await event('REVISIT_SUBMIT', { attemptId: livePractice.view.practice.attemptId, answer: 'opt_finite_seat', confirmed: true, usedAI: false }, bearer(pupils[0].token), { expected: 400 }); assert.equal(deniedSubmit.error, 'REVISIT_LOCKED');
  }
  finally { await database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').bind(deadlineRow.state, sid).run(); }
  report.expiredPractice = { result: 'PASS', commands: ['REVISIT', 'REVISIT_SUBMIT'], boundary: 'HTTP rejection after isolated QA D1 deadline set to past; restored immediately', productionTouched: false };
  report.modes = [];
  for (const rule of ['campaign','duel','zones','survival','escort','treasure','relay','lockdown','merchant']) {
    await event('SET_MODE', { rule, participation: 'individual' });
    const own = await get(bearer(pupils[0].token)), mode = own.lessonMode;
    assert.equal(mode.rule, rule); assert.equal(mode.own.teamSize, 1);
    const choice = mode.own.actions.find(choice => choice.kind === 'assessment'); assert.ok(choice, rule + ' own registered action');
    const modePayload = current => ({ requestId: rid('mode-action'), rule: current.rule, round: current.round, startedAt: current.startedAt, instanceId: current.instanceId, sequence: current.own.actionSequence + 1 });
    const selected = await event('MODE_ACTION', { ...modePayload(mode), action: choice.action }, bearer(pupils[0].token)); assert.equal(selected.result.ok, true);
    const posted = await event('SUBMIT', { taskId: 'task-pre-finite-inf', answer: 'opt_B' }, bearer(pupils[0].token)); assert.equal(posted.result.correct, true);
    const mechanical = posted.view.lessonMode.own.actions.find(choice => choice.kind === 'mechanical');
    if (mechanical) await event('MODE_ACTION', { ...modePayload(posted.view.lessonMode), action: mechanical.action }, bearer(pupils[0].token));
    const publicMode = (await api('/api/lesson-sessions?id=' + sid + '&kind=presenter', undefined, bearer(created.presenterToken))).view.lessonMode;
    assert.equal(publicMode.own, undefined);
    report.modes.push({ rule, registeredAction: choice.action.type, mechanicalAction: mechanical?.action.type || null, result: 'PASS', ownUnitSize: 1, presenterAggregateOnly: true });
  }
  while ((await get()).timeline.currentActivityId !== 'act-form-19') await event('NEXT');
  const groupTask = packageFixture.tasks.find(task => task.id === 'task-form-four-rep');
  await event('GROUP_SUBMIT', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey }, bearer(pupils[0].token), { expected: 400 });
  for (const pupil of pupils) {
    await event('SAVE_DRAFT', { taskId: groupTask.id, answer: 'Nháp cá nhân QA' }, bearer(pupil.token));
    await event('GROUP_CONTRIBUTE', { taskId: groupTask.id, text: 'Ý kiến cá nhân QA' }, bearer(pupil.token));
  }
  const proposed = await event('GROUP_PROPOSE', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey, proposalId: rid('proposal') }, bearer(pupils[0].token));
  const proposalHash = proposed.view.group.proposal.hash;
  for (const pupil of pupils.slice(1, 3)) await event('GROUP_VOTE', { taskId: groupTask.id, proposalHash }, bearer(pupil.token));
  const submitted = await event('GROUP_SUBMIT', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey, proposalHash }, bearer(pupils[0].token)); assert.equal(submitted.result.correct, true);
  const group = submitted.view.group;
  const roller = pupils.find(pupil => pupil.id === group.memberIds[group.dice.turnIndex]);
  const roll = await event('ROLL', {}, bearer(roller.token)); assert.equal(roll.result.ok, true);
  await event('ROLL', {}, bearer(roller.token), { expected: 400 });
  stage('individual draft → own-group contribution/proposal/majority/submit → single shared die');

  await event('NEXT');
  const beforeArena = await get();
  await event('CLASS_EVENT_OPEN', { type: 'boss', durationMs: 180000, seed: 2 });
  const guardedPractice = await event('REVISIT', { activityId: 'act-exp' }, bearer(pupils[1].token), { expected: 400 }); assert.equal(guardedPractice.error, 'REVISIT_LOCKED');
  const late = await member(150);
  const lateJoined = await api('/api/lesson-sessions', { action: 'join', code: created.session.code, name: 'IGNORED', classToken: late.classToken, requestId: rid('late-event-join') }, bearer(late.token));
  assert.equal(lateJoined.projection.classEvent.own, null); assert.equal(lateJoined.projection.classEvent.players, 4);
  await event('CLASS_EVENT_ANSWER', { eventId: lateJoined.projection.classEvent.id, step: 0, answer: 0, requestId: rid('late-answer') }, bearer(late.token), { expected: 400 });
  await api('/api/lesson-classes', { action: 'member-revoke', classId: cls.id, memberId: late.member.id });
  const eventOwn = await get(bearer(pupils[0].token)); assert.ok(eventOwn.classEvent.own.task);
  assert.equal(JSON.stringify(eventOwn.classEvent).includes('answerKey'), false);
  const eventTask = packageFixture.tasks.find(task => task.id === eventOwn.classEvent.own.task.id);
  const answered = await event('CLASS_EVENT_ANSWER', { eventId: eventOwn.classEvent.id, step: eventOwn.classEvent.own.step, answer: eventTask.evaluation.answerKey, requestId: rid('event-answer') }, bearer(pupils[0].token)); assert.equal(answered.result.correct, true);
  await event('PAUSE');
  const paused = await get();
  await new Promise(resolve => setTimeout(resolve, 30));
  const stillPaused = await get();
  assert.equal(stillPaused.status, 'paused'); assert.equal(stillPaused.classEvent.now, paused.classEvent.now, 'Teacher pause cannot consume event active time');
  await event('RESUME'); await event('CLASS_EVENT_CLOSE');
  const afterArena = await get();
  assert.equal(afterArena.classEvent.status, 'closed'); assert.ok(afterArena.clock.activityDeadline >= beforeArena.clock.activityDeadline);
  assert.equal(afterArena.passports[pupils[0].id].submissions.length, beforeArena.passports[pupils[0].id].submissions.length, 'Mini-event cannot add mastery submissions');
  const settled = afterArena.clock.classEventBudgetUsedMs;
  await event('CLASS_EVENT_CLOSE'); assert.equal((await get()).clock.classEventBudgetUsedMs, settled);
  stage('mini-event answers/pause/resume/settle once; no mastery side effect');

  const league = (await api('/api/lesson-leagues', { action: 'create', title: 'Giải giả QA', format: 'async', requestId: rid('league') })).league;
  await api('/api/lesson-leagues', { action: 'class-add', leagueId: league.id, classId: cls.id });
  const linked = await api('/api/lesson-leagues', { action: 'link', leagueId: league.id, classId: cls.id, sessionId: sid, round: 1 }); assert.equal(linked.round.participantCount, 4);
  while ((await get()).timeline.currentActivityId !== 'act-recheck') await event('NEXT');
  const recheckTask = packageFixture.tasks.find(task => task.id === 'task-recheck-18');
  const nonMasteryBoard = await event('TEACHER_RESPONSE', { learnerId: pupils[2].id, taskId: recheckTask.id, answer: recheckTask.evaluation.answerKey });
  await event('ASSESS', { submissionId: nonMasteryBoard.result.submissionId, criteriaMet: true, nonMastery: true });
  const boardEvidence = (await database.prepare('SELECT counts_for_mastery FROM lesson_class_evidence WHERE submission_id=?').bind(nonMasteryBoard.result.submissionId).all()).results;
  assert.ok(boardEvidence.length); assert.ok(boardEvidence.every(row => row.counts_for_mastery === 0));
  report.nonMasteryBoard = { result: 'PASS', approved: true, cumulativeEvidenceRows: boardEvidence.length, masteryCountingRows: 0 };
  for (const pupil of pupils.slice(0, 2)) {
    await event('SUBMIT', { taskId: 'task-recheck-18', answer: 'opt_recheck_infinite' }, bearer(pupil.token), { expected: 400 });
    await event('INTEGRITY', { confirmed: true, usedAI: false }, bearer(pupil.token));
    await event('SUBMIT', { taskId: 'task-recheck-18', answer: 'opt_recheck_infinite' }, bearer(pupil.token));
    const open = await event('SUBMIT', { taskId: 'task-recheck-19', answer: 'w_n=3n+1; 4,7,10; w_1=4, w_n=w_(n-1)+3' }, bearer(pupil.token));
    assert.equal(open.result.pending, true);
    await event('ASSESS', { submissionId: open.result.submissionId, criteriaMet: true });
  }
  while ((await get()).timeline.currentActivityId !== 'act-exit') await event('NEXT');
  for (const pupil of pupils.slice(0, 2)) {
    await event('INTEGRITY', { confirmed: true, usedAI: false }, bearer(pupil.token));
    const open = await event('SUBMIT', { taskId: 'task-exit-ticket', answer: 'n là chỉ số; u_n là giá trị. u_n=3n+1 cho 4,7,10.' }, bearer(pupil.token));
    await event('ASSESS', { submissionId: open.result.submissionId, criteriaMet: true });
  }
  await event('VALUE_REFLECT', { reflection: { integrity: true, usedAI: false, aiHelp: '', ownChanges: '', reflection: 'Trước em nhầm n và u_n.\nGiờ em kiểm tra từng chỉ số.' } }, bearer(pupils[0].token));
  await event('VALUE_BADGE', { learnerId: pupils[0].id, valueId: 'integrity', evidenceId: 'qa-observation', reason: 'QA quan sát lời giải cá nhân được kiểm tra.' });
  await event('CONCLUDE');
  const openPractice = await event('REVISIT', { activityId: 'act-exit' }, bearer(pupils[3].classToken));
  assert.equal(openPractice.view.practice.task.type, 'open');
  const openVariant = await event('REVISIT_SUBMIT', { attemptId: openPractice.view.practice.attemptId, answer: 'a_n=2n+1 có chín số hạng. b_n=4n+2; 6,10,14; b_1=6, b_n=b_(n-1)+4; mỗi bước tăng4.', confirmed: true, usedAI: false }, bearer(pupils[3].classToken));
  assert.equal(openVariant.result.pending, true);
  const blockedReplacement = await event('REVISIT', { activityId: 'act-exp' }, bearer(pupils[3].classToken), { expected: 400 }); assert.equal(blockedReplacement.error, 'PRACTICE_ASSESSMENT_PENDING');
  const peerBeforeAssessment = await api('/api/lesson-classes', undefined, bearer(pupils[3].classToken)); assert.ok(peerBeforeAssessment.passport.objectives.every(objective => objective.independentCount === 0));
  await event('ASSESS', { submissionId: openVariant.result.submissionId, criteriaMet: true, feedback: 'QA: Bốn cách nhất quán.' });
  const peerAfterAssessment = await api('/api/lesson-classes', undefined, bearer(pupils[3].classToken));
  assert.ok(peerAfterAssessment.passport.objectives.some(objective => objective.independentCount === 1));
  assert.ok(peerAfterAssessment.passport.objectives.every(objective => !['minimum_mastery','standard_mastery'].includes(objective.status)));
  const variantRows = (await database.prepare('SELECT task_id,counts_for_mastery FROM lesson_class_evidence WHERE submission_id=?').bind(openVariant.result.submissionId).all()).results;
  assert.ok(variantRows.some(row => row.counts_for_mastery === 1));
  report.openPractice = { result: 'PASS', afterConclusion: true, pendingUntilTeacherAssessment: true, replacementBlockedWhilePending: true, virtualEvidenceRows: variantRows.length, independentTaskCount: 1, masteryAwardedFromSingleVariant: false };
  const passport = await api('/api/lesson-classes', undefined, bearer(pupils[0].classToken));
  assert.equal(passport.member.id, pupils[0].member.id);
  assert.ok(passport.passport.objectives.every(objective => objective.independentCount >= 2));
  assert.ok(passport.passport.values.some(badge => badge.valueId === 'integrity'));
  assert.ok(passport.passport.reflections.length);
  assert.ok(Array.isArray(passport.sessions), 'Compiled Worker lacks own-session passport integration; rebuild candidate');
  assert.ok(passport.sessions.some(session => session.id === sid && session.status === 'concluded'));
  assert.ok(Array.isArray(passport.leagues), 'Compiled Worker lacks enrolled-league passport integration; rebuild candidate');
  assert.ok(passport.leagues.some(item => item.id === league.id));
  const peerPassport = await api('/api/lesson-classes', undefined, bearer(pupils[2].classToken)); assert.ok(peerPassport.passport.objectives.every(objective => objective.independentCount === 0));
  const home = await event('REVISIT', { activityId: 'act-exp' }, bearer(pupils[0].classToken)); assert.ok(home.view.practice?.attemptId);
  const correctPractice = packageFixture.tasks.find(task => task.id === home.view.practice.task.id).metadata.practiceVariants.find(variant => variant.prompt === home.view.practice.task.prompt).evaluation.answerKey;
  const homeAnswer = await event('REVISIT_SUBMIT', { attemptId: home.view.practice.attemptId, answer: correctPractice, confirmed: true, usedAI: false }, bearer(pupils[0].classToken)); assert.equal(homeAnswer.result.correct, true);
  assert.ok(homeAnswer.view.gateStars.find(gate => gate.activityId === 'act-exp')?.stars > 0);
  await event('REVISIT_SUBMIT', { attemptId: home.view.practice.attemptId, answer: correctPractice }, bearer(pupils[0].classToken), { expected: 400 });
  const finalized = await api('/api/lesson-leagues', { action: 'finalize', leagueId: league.id, classId: cls.id, round: 1 }); assert.equal(finalized.round.participantCount, 4);
  const again = await api('/api/lesson-leagues', { action: 'finalize', leagueId: league.id, classId: cls.id, round: 1 }); assert.equal(again.round.meanScore, finalized.round.meanScore);
  const boardPublic = await api('/api/lesson-leagues?id=' + league.id, undefined, bearer(pupils[0].classToken));
  assert.equal(boardPublic.readOnly, true); for (const pupil of pupils) assert.equal(JSON.stringify(boardPublic).includes(pupil.member.name), false);
  await api('/api/lesson-devices?sessionId=' + sid, undefined, bearer(b.token), 403);
  stage('independent recheck/exit + teacher assessment → own cumulative passport/home practice/league finalize');

  if (!coreOnly) {
  // Add 146 profiles through HTTP, then exercise a separate current live room with all 150.
  const extra = await pooled(Array.from({ length: 146 }, (_, index) => index + 4), 4, index => member(index)); pupils.push(...extra);
  const loadRoom = await api('/api/lesson-sessions', { action: 'create', ...tuple, title: 'Phiên tải 150 giả QA', requestId: rid('load-session') }); secret(loadRoom.session.code); secret(loadRoom.presenterToken);
  const joinSamples = [], submitSamples = [], pollSamples = [];
  report.load = { learners: 150, concurrency: { memberCreation: 4, join: loadConcurrency, submit: loadConcurrency, poll: 150 }, result: 'HOLD' };
  const loadStarted = performance.now();
  await pooled(pupils, loadConcurrency, async pupil => {
    pupil.token = secret(randomBytes(32).toString('base64url'));
    const result = await request('/api/lesson-sessions', { action: 'join', code: loadRoom.session.code, name: 'IGNORED', classToken: pupil.classToken, requestId: rid('load-join') }, bearer(pupil.token), null, joinSamples);
    pupil.loadId = result.data.learnerId;
  });
  report.load.join = stat(joinSamples); assert.equal(report.load.join.errors, 0, 'Load join failures; see redacted request statuses');
  let loadView = (await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view;
  assert.equal(Object.keys(loadView.roster).length, 150);
  await api('/api/lesson-sessions', { action: 'event', id: loadRoom.session.id, event: { type: 'START', payload: {}, round: loadView.round, revision: loadView.revision, eventId: rid('load-start') } });
  loadView = (await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view;
  await pooled(pupils, loadConcurrency, async pupil => {
    await request('/api/lesson-sessions', { action: 'event', id: loadRoom.session.id, event: { type: 'SUBMIT', payload: { taskId: firstTask.id, answer: firstTask.evaluation.answerKey }, activityId: loadView.timeline.currentActivityId, round: loadView.round, revision: loadView.revision, eventId: rid('load-submit') } }, bearer(pupil.token), null, submitSamples);
  });
  report.load.submit = stat(submitSamples); assert.equal(report.load.submit.errors, 0, 'Load submit failures; see redacted request statuses');
  await pooled(pupils, 150, async pupil => { const own = (await request('/api/lesson-sessions?id=' + loadRoom.session.id, undefined, bearer(pupil.token), null, pollSamples)).data.view; assert.equal(own?.learnerId, pupil.loadId); assert.equal(own?.roster, undefined); assert.equal(own?.submissions.length, 1); });
  report.load.poll = stat(pollSamples); assert.equal(report.load.poll.errors, 0);
  const stored = await database.prepare('SELECT state,revision FROM lesson_sessions WHERE id=?').bind(loadRoom.session.id).first();
  const loadState = JSON.parse(stored.state);
  assert.equal(Object.keys(loadState.submissions).length, 150); assert.equal(Object.keys(loadState.roster).length, 150);
  const count = await database.prepare('SELECT COUNT(*) AS n FROM lesson_learners WHERE session_id=?').bind(loadRoom.session.id).first(); assert.equal(count.n, 150);
  const receipts = await database.prepare("SELECT COUNT(*) AS n FROM lesson_event_receipts WHERE session_id=? AND event_id LIKE 'load-submit-%'").bind(loadRoom.session.id).first(); assert.equal(receipts.n, 150);
  report.load = { ...report.load, result: 'HOLD', individualResult: 'PASS', elapsedMs: Math.round(performance.now() - loadStarted), stateBytes: Buffer.byteLength(stored.state), maxStateBytes: MAX_STATE_BYTES, revision: stored.revision, persistedLearners: count.n, persistedSubmissions: Object.keys(loadState.submissions).length, distinctSubmissionReceipts: receipts.n, casLostWrites: 0, note: `Local single workerd + D1, ${loadConcurrency} simultaneous join/submit and 150 simultaneous poll; no production/edge CPU/latency certification.` };
  assert.ok(report.load.stateBytes < report.load.maxStateBytes);
  stage('150 live HTTP joins/submits/polls; final D1 learner/submission/receipt counts');
  const loadControl = async (type, payload = {}, expected = 200) => { const current = (await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view; return api('/api/lesson-sessions', { action: 'event', id: loadRoom.session.id, event: { type, payload, round: current.round, revision: current.revision, eventId: rid(type) } }, teacher, expected); };
  report.load.individualGates = [];
  async function individualGate(activityId) {
    while ((await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view.timeline.currentActivityId !== activityId) await loadControl('NEXT');
    await loadControl('EXTEND', { minutes: 10 });
    const current = (await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view, samples = [], open = [];
    const activity = packageFixture.activities.find(activity => activity.id === activityId);
    const tasks = packageFixture.tasks.filter(task => activity.taskIds.includes(task.id) && task.participation === 'individual' && ['shared', 'core'].includes(task.branch) && task.type !== 'reflection');
    await pooled(pupils, loadConcurrency, async pupil => {
      const command = async (type, payload) => (await request('/api/lesson-sessions', { action: 'event', id: loadRoom.session.id, event: { type, payload, activityId, round: current.round, revision: current.revision, eventId: rid('full-' + type) } }, bearer(pupil.token), null, samples)).data;
      if (['recheck', 'exit'].includes(activity.phase)) await command('INTEGRITY', { confirmed: true, usedAI: false });
      for (const task of tasks) {
        const submitted = await command('SUBMIT', { taskId: task.id, answer: task.type === 'closed' ? task.evaluation.answerKey : task.id === 'task-recheck-19' ? 'w_n=3n+1; 4,7,10; w_1=4; w_n=w_(n-1)+3; kiểm tra n=1,2,3.' : 'n là chỉ số; u_n là giá trị. u_n=3n+1 cho 4,7,10; kiểm tra n=1,2,3.' });
        if (submitted.result?.pending) open.push(submitted.result.submissionId);
      }
    });
    const measured = { activityId, tasks: tasks.map(task => task.id), ...stat(samples), pendingOpen: open.length };
    report.load.individualGates.push(measured);
    measured.stateBytesBeforeAssessment = Number((await database.prepare('SELECT length(CAST(state AS BLOB)) AS n FROM lesson_sessions WHERE id=?').bind(loadRoom.session.id).first()).n);
    assert.equal(measured.errors, 0, '150-pupil individual gate failure ' + activityId);
    // Teacher assessments depend on current shared revision; keep them sequential.
    let assessmentView = open.length ? (await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view : null;
    for (const submissionId of open) {
      const assessed = await api('/api/lesson-sessions', { action: 'event', id: loadRoom.session.id, event: { type: 'ASSESS', payload: { submissionId, criteriaMet: true }, round: assessmentView.round, revision: assessmentView.revision, activityId, eventId: rid('full-ASSESS') } });
      assessmentView = assessed.view;
    }
    const stored = await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(loadRoom.session.id).first();
    measured.stateBytes = Buffer.byteLength(stored.state); measured.teacherAssessed = open.length;
    assert.ok(measured.stateBytes < report.load.maxStateBytes);
    stage('150 pupils completed individual gate ' + activityId + '; approved open assessments persisted');
  }
  await individualGate('act-pre'); await individualGate('act-form-18');
  while ((await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view.timeline.currentActivityId !== 'act-form-19') await loadControl('NEXT');
  await loadControl('EXTEND', { minutes: 10 });
  const groupLoadView = (await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view, groupSamples = [];
  const groupSend = async (pupil, type, payload) => (await request('/api/lesson-sessions', { action: 'event', id: loadRoom.session.id, event: { type, payload, activityId: 'act-form-19', round: groupLoadView.round, revision: groupLoadView.revision, eventId: rid('load-' + type) } }, bearer(pupil.token), null, groupSamples)).data;
  const groupStarted = performance.now();
  await pooled(pupils, loadConcurrency, async pupil => { await groupSend(pupil, 'SAVE_DRAFT', { taskId: groupTask.id, answer: 'Nháp riêng QA' }); await groupSend(pupil, 'GROUP_CONTRIBUTE', { taskId: groupTask.id, text: 'Ý kiến riêng QA' }); });
  const loadGroups = (await api('/api/lesson-sessions?id=' + loadRoom.session.id)).view.groups['act-form-19'].groups;
  const byLoadId = new Map(pupils.map(pupil => [pupil.loadId, pupil]));
  await pooled(loadGroups, 5, async group => {
    const proposer = byLoadId.get(group.memberIds[0]);
    const proposed = await groupSend(proposer, 'GROUP_PROPOSE', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey, proposalId: rid('load-proposal') });
    const hash = proposed.view?.group?.proposal?.hash;
    if (!hash) return;
    for (const id of group.memberIds.slice(1, Math.floor(group.memberIds.length / 2) + 1)) await groupSend(byLoadId.get(id), 'GROUP_VOTE', { taskId: groupTask.id, proposalHash: hash });
    await groupSend(proposer, 'GROUP_SUBMIT', { taskId: groupTask.id, answer: groupTask.evaluation.answerKey, proposalHash: hash });
  });
  const groupStored = await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(loadRoom.session.id).first(), completedGroups = JSON.parse(groupStored.state);
  report.load.group = { ...stat(groupSamples), elapsedMs: Math.round(performance.now() - groupStarted), groups: loadGroups.length, contributions: Object.values(completedGroups.groups['act-form-19'].groups).reduce((count, group) => count + group.contributions.length, 0), correctProducts: Object.values(completedGroups.groupProducts).filter(product => product.ok).length, stateBytes: Buffer.byteLength(groupStored.state), concurrency: { individualWrites: loadConcurrency, groupWorkflows: 5 } };
  assert.equal(report.load.group.errors, 0, '150-pupil group HTTP failures');
  assert.equal(report.load.group.contributions, 150); assert.equal(report.load.group.correctProducts, loadGroups.length); assert.ok(report.load.group.stateBytes < report.load.maxStateBytes);
  report.load.result = 'PASS';
  stage('150 live pupils → individual drafts/contributions → every group majority/product, persisted D1');
  report.load.result = 'HOLD';
  await individualGate('act-prac'); await individualGate('act-recheck'); await individualGate('act-exit');
  const completeStored = await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(loadRoom.session.id).first(), completeState = JSON.parse(completeStored.state);
  const expectedIndividual = 1 + report.load.individualGates.reduce((count, gate) => count + gate.tasks.length, 0);
  assert.ok(pupils.every(pupil => completeState.passports[pupil.loadId].submissions.filter(submission => submission.assessmentStatus === 'assessed').length === expectedIndividual));
  report.load.fullLesson = { result: 'PASS', pupils: 150, individualAssessedPerPupil: expectedIndividual, openTeacherAssessments: report.load.individualGates.reduce((count, gate) => count + gate.teacherAssessed, 0), stateBytes: Buffer.byteLength(completeStored.state), allGroupProductsCorrect: true };
  report.load.result = 'PASS';
  const loadDevice = await api('/api/lesson-devices', { action: 'create', sessionId: loadRoom.session.id, kind: 'B', memberIds: [pupils[0].loadId, pupils[1].loadId], requestId: rid('load-device') }); secret(loadDevice.token);
  await api('/api/lesson-devices', { action: 'revoke', sessionId: loadRoom.session.id, deviceId: loadDevice.device.id });
  await api('/api/lesson-devices?sessionId=' + loadRoom.session.id, undefined, bearer(loadDevice.token), 403);
  const reset = await api('/api/lesson-classes', { action: 'member-reset-pin', classId: cls.id, memberId: pupils[0].member.id }); secret(reset.pin);
  await api('/api/lesson-classes', undefined, bearer(pupils[0].classToken), 401);
  await api('/api/lesson-sessions?id=' + loadRoom.session.id, undefined, bearer(pupils[0].token), 403);
  const freshLogin = await api('/api/lesson-classes', { action: 'join', classCode: cls.code, memberCode: pupils[0].member.code, pin: reset.pin }, {}); secret(freshLogin.token);
  const freshToken = secret(randomBytes(32).toString('base64url'));
  const rejoined = await api('/api/lesson-sessions', { action: 'join', code: loadRoom.session.code, name: 'IGNORED', classToken: freshLogin.token, requestId: rid('reset-rejoin') }, bearer(freshToken)); assert.equal(rejoined.learnerId, pupils[0].loadId);
  await api('/api/lesson-classes', { action: 'member-revoke', classId: cls.id, memberId: pupils[1].member.id });
  await api('/api/lesson-sessions?id=' + loadRoom.session.id, undefined, bearer(pupils[1].token), 403);
  await loadControl('CONCLUDE');
  stage('150 HTTP class joins/submits/polls persist without loss; device revoke/PIN reset/member revoke');
  }
  assert.equal(report.externalRequests, 0);
  report.result = 'PASS';
  report.limits = ['Synthetic profiles/packages only; real classroom accounts not used.', 'Browser layout and interaction QA is separate.', 'Mini-event expiry is covered in deterministic runtime tests; this HTTP rehearsal closes it manually.', 'Home practice here covers an experience variant; independent mastery practice needs its authored evidence contract.', 'R2 lifecycle exercised independently; package fixture still references reviewed external sources.', 'No deployment performed. Local load cannot prove production edge limits.'];
} catch (error) {
  report.failure = cleanError(error); process.exitCode = 1;
} finally {
  await mf?.dispose();
  try {
    const files = (await readdir(join(directory, 'd1'), { recursive: true })).filter(file => /(?:^|[\\/])[0-9a-f]{64}\.sqlite$/.test(file));
    if (files.length === 1) {
      const checked = new DatabaseSync(join(directory, 'd1', files[0]), { readOnly: true });
      try {
        report.persistedSqlite = { integrityCheck: checked.prepare('PRAGMA integrity_check').get().integrity_check, foreignKeyViolations: checked.prepare('PRAGMA foreign_key_check').all().length };
        report.persistedSessions = checked.prepare('SELECT status,revision,length(CAST(state AS BLOB)) AS stateBytes,json_extract(state,\'$.timeline.currentActivityId\') AS activityId,(SELECT COUNT(*) FROM lesson_learners l WHERE l.session_id=s.id) AS learners FROM lesson_sessions s ORDER BY created_at').all();
        assert.equal(report.persistedSqlite.integrityCheck, 'ok'); assert.equal(report.persistedSqlite.foreignKeyViolations, 0);
      } finally { checked.close(); }
    }
  } catch (error) { report.failure ||= cleanError(error); report.result = 'HOLD'; process.exitCode = 1; }
  report.transportFailures = transportFailures;
  let serialized = JSON.stringify(report, null, 2);
  for (const value of secrets) serialized = serialized.replaceAll(value, '[redacted]');
  await writeFile(artifact, serialized + '\n');
  console.log(JSON.stringify({ artifact, result: report.result, stages: report.stages.length, checks: report.checks.length, externalRequests: report.externalRequests, ...(report.failure ? { failure: report.failure } : {}) }));
}
