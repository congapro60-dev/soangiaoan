import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { hashPackage } from '../lib/lesson/schema.js';
import { createSessionPlan } from '../lib/lesson/session-plan.js';
import { pilotDraft } from '../lib/lesson/director.js';
import { createGameAdapter, clampMovement, mapLessonEvent, recordGameReward, pilotGameDescriptor } from '../lib/lesson/game-adapter.js';

const original = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url)));
const pkg = { ...original, rowId: 'row-adapter', status: 'approved', sourceRefs: original.sourceRefs.map((source) => ({ ...source, verification: 'verified' })) };
const packageContent = { ...pkg };
delete packageContent.rowId;
pkg.contentHash = hashPackage(packageContent);
const plan = createSessionPlan({ package: pkg, theme: 'historical', map: 'historical', rule: 'campaign', participation: 'group', status: 'approved', director: { seed: 17 } });

test('adapter uses real registries and deterministic route data', () => {
  const a = createGameAdapter({ plan, package: pkg });
  const b = createGameAdapter({ plan, package: pkg });
  assert.deepEqual(a.route, b.route);
  assert.equal(a.themeId, 'historical');
  assert.equal(a.mapId, 'historical');
  assert.equal(a.ruleId, 'campaign');
  assert.equal(a.seed, 17);
  assert.equal(a.deterministic, true);
  assert.equal(a.route.points.length, 33);
  assert.ok(a.route.segments.some((segment) => segment.coreGate));
  assert.deepEqual(a.roles.map((role) => role.id), ['discover', 'represent', 'check', 'explain']);
});

test('route segment positions use explicit index and point coordinates', () => {
  const adapter = createGameAdapter({ plan, package: pkg });
  const segment = adapter.route.segments[0];
  assert.deepEqual(segment.start.point, adapter.route.points[segment.start.index]);
  assert.deepEqual(segment.end.point, adapter.route.points[segment.end.index]);
});

test('movement clamps at a core gate and carries only excess', () => {
  assert.deepEqual(clampMovement({ position: 6, steps: 6, gate: 8 }), { position: 8, carry: 4 });
  assert.deepEqual(clampMovement({ position: 6, steps: 6, carry: 9, gate: 8 }), { position: 8, carry: 13 });
});

test('only movement-safe skills are exposed', () => {
  const adapter = createGameAdapter({ plan, package: pkg });
  assert.deepEqual(adapter.policy.allowedSkills.map((skill) => skill.id), ['time', 'boost', 'double']);
  assert.ok(adapter.policy.disabledSkills.includes('freeze'));
  assert.equal(adapter.policy.groupGameMapMastery, false);
});

test('authored individual SUBMIT and group evidence mappings are preserved', () => {
  const adapter = createGameAdapter({ plan, package: pkg });
  const individual = adapter.activities.find((activity) => activity.id === 'act-pre');
  const individualTask = individual.tasks.find((task) => task.id === 'task-pre-finite-inf');
  assert.equal(mapLessonEvent({ activity: individual, task: individualTask, answer: 'opt_B', eventId: 'e1', round: 1, revision: 0 }).type, 'SUBMIT');
  const group = adapter.activities.find((activity) => activity.id === 'act-form-19');
  const groupTask = group.tasks.find((task) => task.id === 'task-form-four-rep');
  const event = mapLessonEvent({ activity: group, task: groupTask, answer: { rep_list: 'card_list_18_20_22' }, eventId: 'e2', round: 1, revision: 0 });
  assert.equal(event.type, 'GROUP_SUBMIT');
  assert.equal(event.payload.taskId, 'task-form-four-rep');
  assert.equal(Object.hasOwn(event, 'groupId'), false);
  assert.equal(groupTask.evaluation.answerKey, undefined);
  const broadcast = adapter.activities.find((activity) => activity.id === 'act-exp');
  assert.equal(broadcast.participation, 'individual_broadcast');
  assert.equal(mapLessonEvent({ activity: broadcast, task: broadcast.tasks[0], answer: 'opt_finite_seat', eventId: 'e3', round: 1, revision: 0 }).type, 'SUBMIT');
});

test('pilot drafts and source review block execution', () => {
  const draft = pilotDraft({ package: original, theme: 'historical', map: 'historical', seed: 17 });
  assert.equal(draft.status, 'draft');
  assert.equal(draft.plan !== null, true);
  assert.throws(() => createGameAdapter({ plan: draft.plan, package: original }), (error) => error.code === 'PLAN_NOT_APPROVED');
  const descriptor = pilotGameDescriptor({ draft, package: original });
  assert.equal(descriptor.execution.allowed, false);
  assert.equal(descriptor.mapId, 'historical');
  assert.ok(Array.isArray(descriptor.activities));
});

test('reward ledger is exactly once and game events are not mastery', () => {
  const first = recordGameReward({}, { sessionId: 's', activityId: 'a', taskId: 't', recipientId: 'l', amount: 5 });
  const second = recordGameReward(first.ledger, { sessionId: 's', activityId: 'a', taskId: 't', recipientId: 'l', amount: 50 });
  assert.equal(first.replay, false);
  assert.equal(second.replay, true);
  assert.equal(second.entry.amount, 5);
  assert.equal(second.entry.mastery, false);
});

test('legacy mode-engine remains isolated from the adapter', async () => {
  const source = await readFile(new URL('../lib/lesson/game-adapter.js', import.meta.url), 'utf8');
  assert.equal(source.includes("../mode-engine"), false);
  assert.equal(source.includes("../skills.js"), true);
});
