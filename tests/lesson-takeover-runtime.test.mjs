import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLessonSession, reduceLessonSession, groupActiveMs } from '../lib/lesson/runtime.js';
import { serializeForTeacher, serializeForStudent, serializeForPresenter } from '../lib/lesson/serialize.js';
import { hashPackage } from '../lib/lesson/schema.js';

const fixture = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
const teacher = { role: 'teacher', id: 'host' }, pupil = { role: 'student', id: 'p1' }, system = { role: 'system', id: 'system' };
function classroom() {
  const pkg = structuredClone(fixture); pkg.budget.reserveMinutes += 3; pkg.budget.slotMinutes += 3;
  pkg.activities.find(activity => activity.budgetRole === 'reserve').minutes += 3; pkg.contentHash = hashPackage(pkg);
  let state = createLessonSession({ package: pkg, hostId: 'host', sessionId: 'takeover', now: 0, learners: [{ id: 'p1', name: 'An' }, { id: 'p2', name: 'Bình' }] });
  let serial = 0;
  const send = (type, payload = {}, actor = teacher, now = state.clock.lastNow + 1) => {
    const event = { eventId: 'takeover-' + ++serial, type, payload, activityId: state.timeline.currentActivityId, round: state.round, revision: state.revision };
    const next = reduceLessonSession(state, event, { actor, now }); if (next.result.ok) state = next.state; return { ...next, event };
  };
  send('START', {}, teacher, 1000);
  return { get state() { return state; }, set state(value) { state = value; }, send };
}

test('class event pauses main/group clocks, owns timer excluding teacher pause, settlement is once only', () => {
  const room = classroom(), deadline = room.state.clock.activityDeadline;
  assert.equal(room.send('CLASS_EVENT_OPEN', { type: 'tug', durationMs: 180000 }, teacher, 1100).result.ok, true);
  const active = groupActiveMs(room.state, 1100);
  assert.equal(groupActiveMs(room.state, 121100), active);
  room.send('PAUSE', {}, teacher, 121100);
  assert.equal(serializeForStudent(room.state, 'p1').classEvent.remainingMs, 60000);
  room.send('TICK', {}, system, 241100);
  assert.equal(room.state.classEvent.status, 'active');
  room.send('RESUME', {}, teacher, 241100);
  room.send('TICK', {}, system, 301100);
  assert.equal(room.state.classEvent.status, 'closed');
  assert.equal(room.state.clock.activityDeadline, deadline + 300000);
  assert.equal(room.state.clock.classEventBudgetUsedMs, 180000);
  assert.equal(groupActiveMs(room.state, 301100), active);
  const budget = room.state.clock.classEventBudgetUsedMs;
  room.send('TICK', {}, system, 301101); assert.equal(room.state.clock.classEventBudgetUsedMs, budget);
  assert.equal(room.send('CLASS_EVENT_ANSWER', { eventId: room.state.classEvent.id, step: 0, answer: 'x', requestId: 'after-event' }, pupil).result.ok, false);
});

test('CONCLUDE closes class event; event answers never change passport or wallet', () => {
  const room = classroom(), passports = structuredClone(room.state.passports), wallets = structuredClone(room.state.gameWallets);
  room.send('CLASS_EVENT_OPEN', { type: 'boss', durationMs: 180000 }, teacher, 1100);
  const event = room.state.classEvent, task = event.tasks.find(task => task.id === event.participants.p1.taskIds[0]);
  assert.equal(room.send('CLASS_EVENT_ANSWER', { eventId: event.id, step: 0, answer: task.evaluation.answerKey, requestId: 'answer-1' }, pupil, 2100).result.ok, true);
  room.send('CONCLUDE', {}, teacher, 3100);
  assert.equal(room.state.classEvent.status, 'closed');
  assert.deepEqual(room.state.passports, passports); assert.deepEqual(room.state.gameWallets, wallets);
});

test('teacher TV response records actual pupil work as pending assisted evidence; no actor spoof or forced mastery', () => {
  const room = classroom(), task = room.state.package.tasks.find(task => task.id === 'task-exp-predict');
  const submitted = room.send('TEACHER_RESPONSE', { learnerId: 'p1', taskId: task.id, answer: task.evaluation.answerKey });
  assert.equal(submitted.result.ok, true);
  const sub = room.state.submissions[submitted.result.submissionId];
  assert.equal(sub.learnerId, 'p1'); assert.equal(sub.source, 'teacher_recorded_response');
  assert.equal(sub.assessmentStatus, 'pending'); assert.equal(sub.assisted, true);
  assert.equal(room.send('ASSESS', { submissionId: sub.submissionId, criteriaMet: true }).result.code, 'INVALID_ASSESSMENT');
  assert.equal(room.send('ASSESS', { submissionId: sub.submissionId, criteriaMet: true, nonMastery: true }).result.ok, true);
  assert.equal(room.state.passports.p1.submissions.at(-1).assisted, true);
  assert.equal(room.send('TEACHER_RESPONSE', { learnerId: 'p2', taskId: task.id, answer: 'x' }, pupil).result.ok, false);
});

test('values remain scoped, teacher-only badges and truthful AI disclosure taint independence', () => {
  const room = classroom();
  assert.equal(room.send('SET_VALUES', { integrationIds: ['ai', 'digital-media'], aiPolicy: 'off' }).result.ok, true);
  const reflection = { integrity: true, usedAI: true, aiHelp: 'Gợi ý cách làm', ownChanges: 'Em kiểm tra lại', reflection: 'Trước em nghĩ khác\nGiờ em đã kiểm chứng' };
  assert.equal(room.send('VALUE_REFLECT', { reflection }, pupil).result.ok, true);
  assert.equal(room.send('VALUE_BADGE', { learnerId: 'p1', valueId: 'integrity', evidenceId: 'observed-1', reason: 'Em nói rõ hỗ trợ đã dùng' }).result.ok, true);
  assert.equal(room.send('VALUE_BADGE', { learnerId: 'p2', valueId: 'integrity', evidenceId: 'forged', reason: 'x' }, pupil).result.ok, false);
  const own = serializeForStudent(room.state, 'p1'), other = serializeForStudent(room.state, 'p2'), tv = serializeForPresenter(room.state), host = serializeForTeacher(room.state);
  assert.equal(own.valueBadges.length, 1); assert.equal(other.valueBadges.length, 0);
  assert.equal(host.aiPolicy, 'off'); assert.deepEqual(host.lessonIntegrations, ['ai', 'digital-media']);
  assert.ok(host.qualityReport); assert.equal(JSON.stringify(tv).includes('observed-1') || JSON.stringify(tv).includes('Gợi ý cách làm'), false);
});

test('new integrity policy requires consent in live recheck; legacy persisted state stays compatible', () => {
  const room = classroom(); while (room.state.timeline.currentActivityId !== 'act-recheck') room.send('NEXT');
  room.state.mode = 'live';
  const taskId = 'task-recheck-18', answer = room.state.package.tasks.find(task => task.id === taskId).evaluation.answerKey;
  assert.equal(room.send('SUBMIT', { taskId, answer }, pupil).result.code, 'INTEGRITY_REQUIRED');
  room.send('INTEGRITY', { confirmed: true, usedAI: false }, pupil);
  assert.equal(room.send('SUBMIT', { taskId, answer }, pupil).result.ok, true);
  delete room.state.learningPolicyVersion; delete room.state.integrity;
  assert.equal(room.send('SUBMIT', { taskId, answer }, pupil).result.ok, true);
});

test('nine approved lesson rules initialize real engine state on START and accept actual assessments without rollback', () => {
  for (const rule of ['campaign','duel','zones','survival','escort','treasure','relay','lockdown','merchant']) {
    const room = classroom(); room.state.status = 'waiting'; room.state.gamePlan = { rule };
    assert.equal(room.send('START').result.ok, true, rule);
    assert.equal(room.state.lessonMode.rule, rule); assert.ok(room.state.lessonMode.ruleState.players['mode-1']);
    room.send('NEXT');
    const taskId = 'task-pre-finite-inf', answer = room.state.package.tasks.find(task => task.id === taskId).evaluation.answerKey;
    const submitted = room.send('SUBMIT', { taskId, answer }, pupil);
    assert.equal(submitted.result.ok, true, rule); assert.equal(room.state.submissions[submitted.result.submissionId].ok, true);
    assert.ok(Object.keys(room.state.lessonMode.receipts).length > 0, `${rule} real registered progress`);
    assert.equal(room.send('ADD_LEARNER', { learner: { id: 'late', name: 'Em đến sau' } }).result.ok, true);
    assert.ok(room.state.lessonMode.units.some(unit => unit.members.some(member => member.id === 'late')));
  }
});

test('teacher explicitly chooses individual/pair/team gameplay without replacing lesson evidence',()=>{
 const room=classroom();for(const learner of Object.values(room.state.roster))learner.teamId='fixed';
 const before=structuredClone(room.state.passports);
 assert.equal(room.send('SET_MODE',{rule:'merchant',participation:'group'}).result.ok,true);assert.equal(room.state.lessonMode.units.length,1);
 assert.equal(room.send('SET_MODE',{rule:'merchant',participation:'individual'}).result.ok,true);assert.equal(room.state.lessonMode.units.length,2);assert.deepEqual(room.state.passports,before);
 assert.equal(room.send('SET_MODE',{rule:'merchant',participation:'everyone-has-mastered'}).result.code,'INVALID_EVENT');
});
