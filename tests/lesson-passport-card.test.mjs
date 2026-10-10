import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildPassportCard } from '../lib/lesson/passport.js';
import { cockpitActions } from '../lib/lesson/cockpit.js';

const pkg = {
  objectives: [
    { id: 'o1', code: 'M1', statement: 'Nhận biết dãy số tăng' },
    { id: 'o2', code: 'M2', statement: 'Tính số hạng tổng quát' },
    { id: 'o3', code: 'M3', statement: 'Tính tổng n số hạng đầu' },
  ],
  masteryPolicy: { individualEvidencePerObjectiveMin: 1 },
  evidenceRules: [
    { objectiveId: 'o1', taskId: 't1', kind: 'individual_recheck', countsForMastery: true },
    { objectiveId: 'o2', taskId: 't2', kind: 'individual_recheck', countsForMastery: true },
    { objectiveId: 'o3', taskId: 't3', kind: 'individual_recheck', countsForMastery: true },
  ],
};
const assessed = (taskId, ok) => ({ taskId, ok, assessmentStatus: 'assessed' });

test('cockpit error label does not expose a truncated LaTeX fragment', () => {
  const v = view();
  v.package.tasks[0].prompt = 'Kiểm tra dãy số: $u_n = \\frac{1}{n}$ với $n \\in \\mathbb{N}$';
  v.submissions = Object.fromEntries([1, 2].map(i => ['s' + i, { submissionId: 's' + i, learnerId: 'l' + i, taskId: 'q', activityId: 'r', at: 1, ok: false, assessmentStatus: 'assessed' }]));
  const action = cockpitActions(v).find(item => item.kind === 'error');
  assert.doesNotMatch(action.text, /\$|\\frac|\\mathbb/);
  assert.match(action.text, /Kiểm tra dãy số/);
});

test('passport card groups objectives into own / with help / next, and points to the first gap', () => {
  const passport = {
    submissions: [assessed('t1', true), assessed('t2', true), assessed('t3', false)],
    supportHistory: [{ taskId: 't2', tier: 'H1', at: 1 }],
  };
  const card = buildPassportCard(passport, pkg);
  assert.deepEqual(card.objectives.map((o) => [o.id, o.status]), [['o1', 'independent'], ['o2', 'supported'], ['o3', 'next']]);
  assert.match(card.nextStep, /Tính tổng n số hạng đầu/);
  assert.equal(card.hints, 1);
});

test('passport card with everything independent suggests an extension, and never ranks', () => {
  const card = buildPassportCard({ submissions: [assessed('t1', true), assessed('t2', true), assessed('t3', true)], supportHistory: [] }, pkg);
  assert.ok(card.objectives.every((o) => o.status === 'independent'));
  assert.match(card.nextStep, /nâng cao/);
  assert.equal(JSON.stringify(card).includes('rank'), false);
});

test('passport card when only supported work exists asks to redo without hints', () => {
  const card = buildPassportCard({ submissions: [assessed('t1', true)], supportHistory: [{ taskId: 't1' }] }, { ...pkg, objectives: [pkg.objectives[0]] });
  assert.equal(card.objectives[0].status, 'supported');
  assert.match(card.nextStep, /không dùng gợi ý/);
});

test('partial independent evidence is a next step, not a claim that help was used', () => {
  const card = buildPassportCard({ submissions: [assessed('t1', true)], supportHistory: [] }, {
    ...pkg, objectives: [pkg.objectives[0]], masteryPolicy: { individualEvidencePerObjectiveMin: 2 },
  });
  assert.equal(card.objectives[0].status, 'next');
  assert.doesNotMatch(card.nextStep, /không dùng gợi ý/);
});

test('pilot recheck alone does not label an unassisted learner as supported', async () => {
  const pilot = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
  const card = buildPassportCard({ submissions: [assessed('task-recheck-18', true)], supportHistory: [] }, pilot);
  assert.equal(card.objectives.find(item => item.id === 'obj-t11-18').status, 'next');
});

function view() {
  const roster = {};
  const peers = [];
  const gateTiming = {};
  for (let i = 0; i < 5; i++) {
    roster['l' + i] = { id: 'l' + i, name: 'HS ' + i, present: true };
    peers.push({ id: 'm' + i, mascot: 0, position: 8 });
    gateTiming['l' + i] = { activityId: 'r', gatePosition: 8, enteredAt: 0, activeMs: 60000 };
  }
  return {
    status: 'active', timeline: { currentActivityId: 'r', locked: false }, clock: { arenaPausedAt: null },
    roster, map: { unitsPerActivity: 8, gatePosition: 8, peers }, gateTiming,
    package: {
      activities: [{ id: 'r', budgetRole: 'core', participation: 'individual', taskIds: ['q'] }],
      tasks: [{ id: 'q', participation: 'individual', branch: 'shared', prompt: 'Tìm u5 của cấp số cộng' }],
      evidenceRules: [{ taskId: 'q', kind: 'individual_recheck', individual: true }],
    },
    submissions: {}, passports: {}, branches: {},
  };
}

test('cockpit actions: stuck pupils, a common error and the wrap-up suggestion, at most three', () => {
  const v = view();
  v.gateTiming.l0.activeMs = 9 * 60000;
  v.submissions = {
    a: { submissionId: 'a', learnerId: 'l1', taskId: 'q', activityId: 'r', at: 10, ok: false, assessmentStatus: 'assessed' },
    b: { submissionId: 'b', learnerId: 'l2', taskId: 'q', activityId: 'r', at: 11, ok: false, assessmentStatus: 'assessed' },
  };
  const actions = cockpitActions(v, 5);
  assert.deepEqual(actions.map((a) => a.kind), ['support', 'error']);
  assert.equal(actions[0].learnerId, 'l0');
  assert.match(actions[1].text, /2 em đang sai ở “Tìm u5 của cấp số cộng”/);
});

test('cockpit actions: suggests moving on when most pupils finished, and nothing for an empty class', () => {
  const v = view();
  v.submissions = Object.fromEntries([0, 1, 2, 3].map((i) => ['s' + i, { submissionId: 's' + i, learnerId: 'l' + i, taskId: 'q', activityId: 'r', at: 5, ok: true, assessmentStatus: 'assessed' }]));
  assert.deepEqual(cockpitActions(v, 5).map((a) => a.kind), ['wrap']);
  assert.deepEqual(cockpitActions(null), []);
  assert.deepEqual(cockpitActions({ ...v, roster: {} }), []);
});

const submission = (id, learnerId, at, ok, assessmentStatus = 'assessed', taskId = 'q', activityId = 'r') =>
  ({ submissionId: id, learnerId, taskId, activityId, at, ok, assessmentStatus });

test('common errors exclude absent and unknown learners', () => {
  const v = view();
  for (const i of [3, 4]) v.roster['l' + i].present = false;
  v.map.peers = v.map.peers.slice(0, 3);
  v.submissions = {
    a: submission('a', 'l3', 1, false), b: submission('b', 'l4', 2, false),
    foreign: submission('foreign', 'unknown', 3, false),
  };
  assert.deepEqual(cockpitActions(v), []);
});

test('a newer pending attempt replaces an older wrong verdict in common errors', () => {
  const v = view();
  v.submissions = {
    a: submission('a', 'l0', 1, false), b: submission('b', 'l1', 2, false),
    a2: submission('a2', 'l0', 1, false, 'pending'), b2: submission('b2', 'l1', 3, false, 'pending'),
  };
  v.openAssessments = { a2: { status: 'pending' }, b2: { status: 'pending' } };
  const actions = cockpitActions(v);
  assert.equal(actions.some(action => action.kind === 'error'), false);
  assert.equal(actions.find(action => action.kind === 'review')?.text, 'Chấm 2 bài đang chờ giáo viên');
});

test('review counts pending submissions even before the learner submits every current task', () => {
  const v = view();
  v.package.activities[0].taskIds.push('open', 'other-open');
  v.package.tasks.push({ id: 'open', participation: 'individual' }, { id: 'other-open', participation: 'individual' });
  v.submissions = {
    a: submission('a', 'l0', 1, false, 'pending', 'open'),
    b: submission('b', 'l0', 2, false, 'pending', 'other-open'),
  };
  v.openAssessments = { a: { status: 'pending' }, b: { status: 'pending' } };
  assert.deepEqual(cockpitActions(v), [{ kind: 'review', text: 'Chấm 2 bài đang chờ giáo viên' }]);
  v.status = 'paused';
  assert.deepEqual(cockpitActions(v), [{ kind: 'review', text: 'Chấm 2 bài đang chờ giáo viên' }]);
});

test('actions ignore group, foreign activity, unavailable branch and stale pending records', () => {
  const v = view();
  v.package.activities[0].taskIds.push('group', 'extra');
  v.package.tasks.push({ id: 'group', participation: 'group' }, { id: 'extra', participation: 'individual', branch: 'support' });
  v.submissions = {
    group0: submission('group0', 'l0', 1, false, 'assessed', 'group'),
    group1: submission('group1', 'l1', 2, false, 'assessed', 'group'),
    extra0: submission('extra0', 'l0', 3, false, 'assessed', 'extra'),
    extra1: submission('extra1', 'l1', 4, false, 'assessed', 'extra'),
    old0: submission('old0', 'l0', 5, false, 'pending', 'q', 'old'),
    stale: submission('stale', 'l0', 6, false, 'pending'),
    fresh: submission('fresh', 'l0', 7, true),
  };
  v.openAssessments = { old0: { status: 'pending' }, stale: { status: 'pending' } };
  assert.deepEqual(cockpitActions(v), []);
});

test('waiting and concluded sessions never suggest moving to the next activity', () => {
  const v = view();
  v.submissions = Object.fromEntries([0, 1, 2, 3].map(i => ['s' + i, submission('s' + i, 'l' + i, i, true)]));
  for (const status of ['waiting', 'concluded']) {
    v.status = status;
    assert.equal(cockpitActions(v).some(action => action.kind === 'wrap'), false, status);
  }
});
