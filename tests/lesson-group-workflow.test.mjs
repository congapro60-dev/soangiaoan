import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createLessonSession, reduceLessonSession, groupActiveMs } from '../lib/lesson/runtime.js';
import { hashPackage } from '../lib/lesson/schema.js';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createActivityGroups } from '../lib/lesson/grouping.js';
import { groupRoleLayout } from '../lib/lesson/group-policy.js';
import { computeObjectiveMastery } from '../lib/lesson/passport.js';

const pkg = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
const teacher = { role: 'teacher', id: 'teacher' }, system = { role: 'system', id: 'system' };
function classroom(count = 4, options = {}) {
  let state = createLessonSession({ package: pkg, sessionId: 'group-room', hostId: teacher.id, now: 0,
    learners: Array.from({ length: count }, (_, index) => ({ id: 'p' + index, name: 'Em ' + index, ...options.learners?.[index] })), ...options });
  let serial = 0;
  const send = (type, payload = {}, actor = teacher, now = state.clock.lastNow + 1) => {
    const event = { eventId: 'group-' + ++serial, type, round: state.round, revision: state.revision, activityId: state.timeline.currentActivityId, payload };
    const reduced = reduceLessonSession(state, event, { actor, now });
    if (reduced.result.ok) state = reduced.state;
    return { ...reduced, event };
  };
  assert.equal(send('START').result.ok, true);
  while (state.timeline.currentActivityId !== 'act-form-19') assert.equal(send('NEXT').result.ok, true);
  return { get state() { return state; }, set state(value) { state = value; }, send, pupil: id => ({ role: 'student', id }) };
}
const taskId = 'task-form-four-rep';
const answer = pkg.tasks.find(task => task.id === taskId).evaluation.answerKey;
function discuss(room, ids = ['p0', 'p1', 'p2', 'p3']) {
  for (const id of ids) {
    assert.equal(room.send('SAVE_DRAFT', { taskId, answer: 'Em nghĩ riêng trước' }, room.pupil(id)).result.ok, true);
    assert.equal(room.send('GROUP_CONTRIBUTE', { taskId, text: 'Ý kiến riêng ' + id }, room.pupil(id)).result.ok, true);
  }
}
function propose(room, id = 'p0', supplied = answer) {
  const result = room.send('GROUP_PROPOSE', { taskId, answer: supplied, proposalId: 'proposal-' + room.state.revision }, room.pupil(id));
  assert.equal(result.result.ok, true, JSON.stringify(result.result));
  return room.state.groups['act-form-19'].groups.find(group => group.memberIds.includes(id)).proposal.hash;
}
function agree(room, hash, id) {
  return room.send('GROUP_VOTE', { taskId, proposalHash: hash }, room.pupil(id));
}

function openClassroom() {
  const custom = structuredClone(pkg), task = custom.tasks.find(task => task.id === taskId);
  task.type = 'open'; task.evaluation = { rubric: { criteria: ['Giải thích đủ bốn biểu diễn'], lookFor: ['Các biểu diễn tương đương'] } };
  delete task.inputSchema;
  custom.contentHash = hashPackage(custom);
  return classroom(4, { package: custom });
}
function submitOpen(room) {
  discuss(room); const proposalHash = propose(room, 'p0', 'Bốn cách cho cùng một dãy số');
  agree(room, proposalHash, 'p1'); agree(room, proposalHash, 'p2');
  const submitted = room.send('GROUP_SUBMIT', { taskId, answer: 'Bốn cách cho cùng một dãy số', proposalHash }, room.pupil('p0'));
  assert.equal(submitted.result.ok, true);
  const groupId = room.state.groups['act-form-19'].groups[0].id;
  return { submitted, groupId, proposalHash };
}

test('open group product stays pending and immutable until teacher assesses its exact submitted proposal', () => {
  const room = openClassroom(), wallets = structuredClone(room.state.gameWallets), passports = structuredClone(room.state.passports);
  const { submitted, groupId, proposalHash } = submitOpen(room), key = `${groupId}:${taskId}`;
  assert.equal(submitted.result.pending, true); assert.equal(submitted.result.correct, undefined);
  assert.equal(room.state.groupProducts[key].ok, null); assert.equal(room.state.groupProducts[key].assessmentStatus, 'pending');
  assert.equal(room.state.groupProducts[key].proposalHash, proposalHash); assert.ok(room.state.groupProducts[key].proposalVersion);
  assert.equal(room.send('ROLL', {}, room.pupil('p0')).result.code, 'GROUP_TASK_INCOMPLETE');
  assert.equal(room.send('GROUP_PROPOSE', { taskId, answer: 'Thay nội dung', proposalId: 'new' }, room.pupil('p0')).result.code, 'GROUP_ASSESSMENT_PENDING');
  const assess = { groupId, taskId, proposalHash, criteriaMet: true, feedback: 'Bốn cách biểu diễn nhất quán.' };
  assert.equal(room.send('GROUP_ASSESS', assess, room.pupil('p0')).result.code, 'UNAUTHORIZED');
  assert.equal(room.send('GROUP_ASSESS', { ...assess, proposalHash: 'wrong' }).result.code, 'STALE_GROUP_PROPOSAL');
  assert.equal(room.send('GROUP_ASSESS', { ...assess, criteriaMet: 'yes' }).result.code, 'INVALID_ASSESSMENT');
  assert.deepEqual(room.state.passports, passports); assert.deepEqual(room.state.gameWallets, wallets);
  assert.equal(room.send('GROUP_ASSESS', assess).result.correct, true);
  const earned = room.state.gameWallets.groups[groupId].earned;
  assert.equal(room.state.groupProducts[key].assessmentStatus, 'assessed'); assert.equal(room.state.groupProducts[key].assessment.assessedBy, teacher.id);
  assert.equal(room.send('GROUP_ASSESS', assess).result.preserved, true);
  assert.equal(room.state.gameWallets.groups[groupId].earned, earned);
  assert.equal(room.send('GROUP_ASSESS', { ...assess, criteriaMet: false }).result.code, 'GROUP_ALREADY_ASSESSED');
  assert.equal(room.send('ROLL', {}, room.pupil('p0')).result.ok, true);
  assert.deepEqual(room.state.passports, passports);
});

test('teacher may assess historical group product after next gate without replacing current proposal', () => {
  const room = openClassroom(), { groupId, proposalHash } = submitOpen(room);
  room.send('NEXT');
  assert.notEqual(room.state.timeline.currentActivityId, 'act-form-19');
  assert.equal(room.send('GROUP_ASSESS', { groupId, taskId, proposalHash, criteriaMet: false, feedback: 'Cần đối chiếu hệ thức truy hồi.' }).result.ok, true);
  assert.equal(room.state.groupProducts[`${groupId}:${taskId}`].ok, false);
  assert.equal(room.state.gameWallets.groups[groupId], undefined);
  assert.equal(room.state.groups['act-form-19'].groups[0].phase, 'role_contribution');
  assert.equal(room.send('GROUP_ASSESS', { groupId, taskId: 'task-recheck-19', proposalHash, criteriaMet: true }).result.code, 'GROUP_PRODUCT_REQUIRED');
});

test('resubmitting a rejected open proposal preserves its assessment; only a new agreed version retries', () => {
  const room = openClassroom(), { groupId, proposalHash } = submitOpen(room);
  const assessment = { groupId, taskId, proposalHash, criteriaMet: false, feedback: 'Cần bổ sung kiểm chứng.' };
  assert.equal(room.send('GROUP_ASSESS', assessment).result.ok, true);
  const assessed = structuredClone(room.state.groupProducts[`${groupId}:${taskId}`]);
  const retry = room.send('GROUP_SUBMIT', { taskId, answer: assessed.answer, proposalHash }, room.pupil('p0'));
  assert.equal(retry.result.preserved, true); assert.equal(retry.result.correct, false);
  assert.deepEqual(room.state.groupProducts[`${groupId}:${taskId}`], assessed);
  const replacement = propose(room, 'p0', 'Bốn cách kèm phép kiểm chứng');
  agree(room, replacement, 'p1'); agree(room, replacement, 'p2');
  assert.equal(room.send('GROUP_SUBMIT', { taskId, answer: 'Bốn cách kèm phép kiểm chứng', proposalHash: replacement }, room.pupil('p0')).result.pending, true);
  assert.notEqual(room.state.groupProducts[`${groupId}:${taskId}`].proposalVersion, assessed.proposalVersion);
});

test('teacher group panel presents submitted product/rubric/pending controls and no personal mastery claim', async () => {
  const source = await readFile(new URL('../components/lesson/TeacherGroupAssessment.tsx', import.meta.url), 'utf8');
  const component = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: component, exports: component.exports, require: () => React });
  const room = openClassroom(); submitOpen(room);
  const html = renderToStaticMarkup(React.createElement(component.exports.TeacherGroupAssessment, { products: room.state.groupProducts, tasks: room.state.package.tasks, onCommand() {} }));
  assert.match(html, /Bốn cách cho cùng một dãy số/); assert.match(html, /Giải thích đủ bốn biểu diễn/);
  assert.match(html, /Đạt tiêu chí nhóm/); assert.match(html, /Cần chỉnh sửa/); assert.match(html, /kiểm tra cá nhân/);
  assert.doesNotMatch(html, /thành thạo cá nhân|answerKey/);
});

test('new sessions require individual thinking, exact proposal and distinct majority before group assessment', () => {
  const room = classroom();
  assert.equal(room.state.groupPolicyVersion, 1);
  assert.equal(room.send('GROUP_SUBMIT', { taskId, answer }, room.pupil('p0')).result.code, 'GROUP_CONSENT_REQUIRED');
  assert.equal(room.send('GROUP_CONTRIBUTE', { taskId, text: 'Chưa nghĩ riêng' }, room.pupil('p0')).result.code, 'INDIVIDUAL_THINK_REQUIRED');
  discuss(room);
  const hash = propose(room);
  assert.equal(agree(room, hash, 'p1').result.ok, true);
  assert.equal(agree(room, hash, 'p1').result.ok, true);
  assert.equal(room.send('GROUP_SUBMIT', { taskId, answer, proposalHash: hash }, room.pupil('p0')).result.code, 'GROUP_CONSENT_REQUIRED');
  assert.equal(agree(room, hash, 'p2').result.ok, true);
  const submitted = room.send('GROUP_SUBMIT', { taskId, answer, proposalHash: hash }, room.pupil('p1'));
  assert.equal(submitted.result.ok, true); assert.equal(submitted.result.correct, true);
  assert.equal(room.state.groups['act-form-19'].groups[0].phase, 'individual_recheck');
  for (const id of ['p0', 'p1', 'p2', 'p3']) assert.equal(computeObjectiveMastery(room.state.passports[id], 'obj-t11-19', pkg).independentCount, 0);
  const replay = reduceLessonSession(room.state, submitted.event, { actor: room.pupil('p1'), now: room.state.clock.lastNow + 1 });
  assert.equal(replay.result.replay, true);
});

test('replacement invalidates old votes; substituted answer and cross-group votes are denied', () => {
  const room = classroom(8);
  discuss(room);
  const oldHash = propose(room); assert.equal(agree(room, oldHash, 'p1').result.ok, true);
  const hash = propose(room, 'p0', { ...answer, rep_list: 'wrong' });
  assert.notEqual(hash, oldHash);
  assert.equal(agree(room, oldHash, 'p2').result.code, 'STALE_GROUP_PROPOSAL');
  assert.equal(agree(room, hash, 'p4').result.ok, false);
  assert.equal(room.send('GROUP_SUBMIT', { taskId, answer, proposalHash: hash }, room.pupil('p0')).result.code, 'GROUP_PROPOSAL_MISMATCH');
  assert.deepEqual(room.state.groups['act-form-19'].groups[0].proposal.votes, ['p0']);
});

test('legacy persisted sessions without policy version keep their old direct group submission contract', () => {
  const room = classroom(); delete room.state.groupPolicyVersion;
  const submitted = room.send('GROUP_SUBMIT', { taskId, answer }, room.pupil('p0'));
  assert.equal(submitted.result.ok, true); assert.equal(submitted.result.correct, true);
});

test('fixed team membership supports 45 learners and role groups rotate over stations', () => {
  const learners = Array.from({ length: 45 }, (_, index) => ({ id: 'p' + index, name: 'Em ' + index, teamId: 'team-fixed' }));
  const room = classroom(45, { learners });
  assert.equal(room.state.roster.p0.teamId, 'team-fixed');
  const first = room.state.groups['act-form-19'].groups[0];
  assert.equal(first.memberIds.length, 45); assert.equal(first.subgroups.length, 15);
  assert.equal(room.state.groups['act-form-19'].groups.length, 1);
  room.send('TICK', {}, system, room.state.clock.lastNow + 16000);
  assert.equal(new Set(Object.values(room.state.groups['act-form-19'].groups[0].roles)).size, 45);
  const groupState = createActivityGroups({ activity: { id: 'next-group' }, learners, groupPolicyVersion: 1, stationIndex: 1, now: 17000 });
  assert.equal(groupState.groups[0].id, first.id);
  assert.deepEqual(groupState.groups[0].memberIds, first.memberIds);
  assert.notEqual(groupRoleLayout(groupState.groups[0].memberIds, { stationIndex: 1 }).roles['sub-1-discover'], first.defaultRoles['sub-1-discover']);
});

test('completed group product unlocks one shared die roll, rotating only the authorized member', () => {
  const room = classroom();
  assert.equal(room.send('ROLL', {}, room.pupil('p0')).result.code, 'GROUP_TASK_INCOMPLETE');
  discuss(room); const hash = propose(room); agree(room, hash, 'p1'); agree(room, hash, 'p2');
  room.send('GROUP_SUBMIT', { taskId, answer, proposalHash: hash }, room.pupil('p0'));
  assert.equal(room.send('ROLL', {}, room.pupil('p1')).result.code, 'NOT_DICE_TURN');
  const roll = room.send('ROLL', {}, room.pupil('p0'));
  assert.equal(roll.result.ok, true);
  const group = room.state.groups['act-form-19'].groups[0], dice = room.state.groupDice[group.id];
  assert.equal(dice.turnIndex, 1); assert.equal(dice.rolls, 1);
  assert.ok(dice.position <= 32);
  for (const id of group.memberIds) assert.equal(room.state.diceTrack[id].position, dice.position);
  assert.equal(room.send('ROLL', {}, room.pupil('p1')).result.code, 'GROUP_GATE_ALREADY_ROLLED');
});

test('absent roller changes after 15 seconds active time; long teacher pause does not advance it', () => {
  const room = classroom();
  const started = room.state.clock.lastNow;
  room.send('LEAVE_LEARNER', { learnerId: 'p0' }, teacher, started + 100);
  const group = room.state.groups['act-form-19'].groups[0];
  assert.ok(group.memberIds.includes('p0'), 'version one retains fixed membership while absent');
  room.send('PAUSE', {}, teacher, started + 200);
  room.send('TICK', {}, system, started + 200000);
  assert.equal(room.state.groupDice[group.id].turnIndex, 0);
  room.send('RESUME', {}, teacher, started + 200001);
  room.send('TICK', {}, system, started + 215002);
  assert.equal(room.state.groupDice[group.id].turnIndex, 1);
});

test('three active minutes flags missing participation without treating group work as individual evidence', () => {
  const room = classroom();
  discuss(room, ['p0', 'p1', 'p2']);
  room.send('TICK', {}, system, room.state.clock.activityStartedAt + 180001);
  const group = room.state.groups['act-form-19'].groups[0];
  assert.deepEqual(group.needsSupport.map(entry => entry.learnerId), ['p3']);
  assert.equal(group.needsSupport[0].reason, 'GROUP_WAIT_EXCEEDED');
  assert.equal(room.state.passports.p3.submissions.length, 0);
});

test('150 synthetic learners fit initial/group/draft state with measured reducer latency', () => {
  const started = performance.now(), room = classroom(150);
  assert.equal(Object.keys(room.state.roster).length, 150);
  for (const learnerId of Object.keys(room.state.roster)) {
    assert.equal(room.send('SAVE_DRAFT', { taskId, answer: 'Nháp tổng hợp' }, room.pupil(learnerId)).result.ok, true);
    assert.equal(room.send('GROUP_CONTRIBUTE', { taskId, text: 'Ý kiến tổng hợp' }, room.pupil(learnerId)).result.ok, true);
  }
  for (const group of room.state.groups['act-form-19'].groups) {
    const hash = propose(room, group.memberIds[0]);
    for (const learnerId of group.memberIds.slice(1, Math.floor(group.memberIds.length / 2) + 1)) assert.equal(agree(room, hash, learnerId).result.ok, true);
    assert.equal(room.send('GROUP_SUBMIT', { taskId, answer, proposalHash: hash }, room.pupil(group.memberIds[0])).result.correct, true);
  }
  const bytes = Buffer.byteLength(JSON.stringify(room.state));
  assert.ok(bytes <= 512 * 1024, `synthetic group state ${bytes} bytes`);
  console.log(JSON.stringify({ kind: 'group-runtime-n150', learners: 150, bytes, elapsedMs: Math.round(performance.now() - started) }));
});

test('late fixed-team learner receives current role policy and group die without changing existing membership', () => {
  const learners = Array.from({ length: 5 }, (_, index) => ({ id: 'p' + index, name: 'Em ' + index, teamId: 'team' }));
  const room = classroom(5, { learners });
  assert.equal(room.send('ADD_LEARNER', { learner: { id: 'late', name: 'Đến sau', teamId: 'team' } }).result.ok, true);
  const groups = room.state.groups['act-form-19'].groups;
  assert.equal(groups.length, 1); assert.equal(groups[0].memberIds.length, 6);
  assert.ok(groups[0].roleDefinitions.some(role => role.id === 'present'));
  assert.equal(room.send('ROLL', {}, room.pupil('late')).result.code, 'GROUP_TASK_INCOMPLETE');
});

test('one learner cannot reserve every role or vote through an empty contribution', () => {
  const room = classroom();
  assert.equal(room.send('CHOOSE_ROLE', { roleId: 'discover' }, room.pupil('p0')).result.ok, true);
  assert.equal(room.send('CHOOSE_ROLE', { roleId: 'represent' }, room.pupil('p0')).result.code, 'ROLE_LIMIT');
  room.send('SAVE_DRAFT', { taskId, answer: 'ý kiến' }, room.pupil('p0'));
  assert.equal(room.send('GROUP_CONTRIBUTE', { taskId, text: '   ' }, room.pupil('p0')).result.ok, false);
});

test('active group clock unions an ongoing teacher pause with the arena pause', () => {
  const state = { clock: { startedAt: 1, totalPausedMs: 0, pausedAt: 150, arenaPausedAt: 100 }, arena: { event: { resumeAt: 200 } } };
  assert.equal(groupActiveMs(state, 175), 99);
});
