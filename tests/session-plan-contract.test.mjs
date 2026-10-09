import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createSessionPlan, hashSessionPlan } from '../lib/lesson/session-plan.js';
import { validateSessionPlan } from '../lib/lesson/validate-session-plan.js';
import { hashPackage } from '../lib/lesson/schema.js';

const pkg = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url)));
const plan = createSessionPlan({ package: pkg });

test('SessionPlan is immutable, canonical-hashed, and package-bound', () => {
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(plan.contentHash, hashSessionPlan(plan));
  assert.equal(validateSessionPlan(plan, { package: pkg }).ok, true);
  assert.throws(() => { plan.rule = 'duel'; }, TypeError);
});

test('validator rejects unknown registries, timing gaps, and incompatible mappings', () => {
  const unknown = { ...plan, theme: 'not-a-theme', contentHash: '' };
  const result = validateSessionPlan(unknown, { package: pkg });
  assert.ok(result.errors.some((error) => error.code === 'UNKNOWN_THEME'));
  const broken = { ...plan, activityPlans: plan.activityPlans.map((a, i) => i === 0 ? { ...a, minutes: a.minutes + 1 } : a) };
  broken.contentHash = hashSessionPlan(broken);
  assert.ok(validateSessionPlan(broken, { package: pkg }).errors.some((error) => error.code === 'TIME_GAP'));
});

test('approved plan blocks unverified source references', () => {
  const approvedPackage = { ...pkg, rowId: 'row-1' };
  approvedPackage.contentHash = hashPackage(approvedPackage);
  const approved = createSessionPlan({ package: approvedPackage, status: 'approved' });
  const result = validateSessionPlan(approved, { package: approvedPackage, mode: 'approved' });
  assert.ok(result.errors.some((error) => error.code === 'UNVERIFIED_SOURCE'));
});

test('validator returns structured errors for malformed nested plans and exact ownership', () => {
  assert.doesNotThrow(() => validateSessionPlan(null));
  const malformed = { ...plan, devices: null, story: null, policies: { branch: null }, contentHash: '' };
  const result = validateSessionPlan(malformed, { package: pkg });
  assert.equal(result.ok, false);
  assert.ok(result.errors.every((error) => typeof error.code === 'string' && typeof error.path === 'string'));

  const removed = { ...plan, activityPlans: plan.activityPlans.slice(1) };
  removed.contentHash = hashSessionPlan(removed);
  assert.ok(validateSessionPlan(removed, { package: pkg }).errors.some((error) => error.code === 'ACTIVITY_OWNERSHIP'));
});

test('must objectives require individual non-empty recheck checkpoints and group rechecks fail', () => {
  const broken = { ...plan, checkpoints: plan.checkpoints.map((checkpoint) => checkpoint.activityId === 'act-recheck' ? { ...checkpoint, evidenceIds: [] } : checkpoint) };
  broken.contentHash = hashSessionPlan(broken);
  assert.ok(validateSessionPlan(broken, { package: pkg }).errors.some((error) => error.code === 'MUST_OBJECTIVE_CHECKPOINT_MISSING'));

  const group = { ...plan, checkpoints: plan.checkpoints.map((checkpoint) => checkpoint.activityId === 'act-recheck' ? { ...checkpoint, activityId: 'act-form-19' } : checkpoint) };
  group.contentHash = hashSessionPlan(group);
  const groupResult = validateSessionPlan(group, { package: pkg });
  assert.ok(groupResult.errors.some((error) => ['MASTERY_NOT_INDIVIDUAL', 'GROUP_RECHECK_FORBIDDEN'].includes(error.code)));
});

test('approval requires verified sources, a valid package, and persisted rowId', () => {
  const approved = createSessionPlan({ package: pkg, status: 'approved' });
  const result = validateSessionPlan(approved, { package: pkg, mode: 'approved' });
  assert.ok(result.errors.some((error) => error.code === 'PACKAGE_ROW_ID_REQUIRED'));
  assert.ok(result.errors.some((error) => error.code === 'UNVERIFIED_SOURCE'));
});

test('validator rejects mastery-through-game policies, invalid confidence, and mismatched stories', () => {
  const reward = { ...plan, policies: { ...plan.policies, reward: { ...plan.policies.reward, group: 'mastery' } } };
  reward.contentHash = hashSessionPlan(reward);
  assert.ok(validateSessionPlan(reward, { package: pkg }).errors.some((error) => error.code === 'GROUP_GAME_MAP_MASTERY'));

  const confidence = { ...plan, director: { ...plan.director, confidence: 2 } };
  confidence.contentHash = hashSessionPlan(confidence);
  assert.ok(validateSessionPlan(confidence, { package: pkg }).errors.some((error) => error.code === 'INVALID_DIRECTOR'));

  assert.throws(() => createSessionPlan({ package: pkg, theme: 'modern', map: 'historical' }), /STORY_MISMATCH/);
});

test('legacy package tuples remain draft-compatible but require rowId for approval', () => {
  assert.equal(validateSessionPlan(plan, { package: pkg }).ok, true);
  assert.ok(validateSessionPlan({ ...plan, status: 'approved', contentHash: hashSessionPlan({ ...plan, status: 'approved' }) }, { package: pkg, mode: 'approved' }).errors.some((error) => error.code === 'PACKAGE_ROW_ID_REQUIRED'));
});

test('validator enforces authored participation, budget gates, and contiguous order', () => {
  const broken = structuredClone(plan);
  broken.activityPlans[0].participation = 'group';
  broken.activityPlans[0].budgetRole = undefined;
  broken.activityPlans[1].order = 4;
  broken.contentHash = hashSessionPlan(broken);
  const errors = validateSessionPlan(broken, { package: pkg }).errors;
  assert.ok(errors.some((error) => error.code === 'ACTIVITY_PARTICIPATION_MISMATCH'));
  assert.ok(errors.some((error) => error.code === 'INVALID_BUDGET_ROLE'));
  assert.ok(errors.some((error) => error.code === 'INVALID_ACTIVITY_ORDER'));
});

test('validator rejects unregistered devices, mutable story, and branch default outside allowlist', () => {
  const broken = structuredClone(plan);
  broken.devices = ['unknown-device'];
  broken.story.title = 'forged story';
  broken.policies.branch = { allowed: ['shared', 'core'], default: 'extension' };
  broken.contentHash = hashSessionPlan(broken);
  const errors = validateSessionPlan(broken, { package: pkg }).errors;
  assert.ok(errors.some((error) => error.code === 'INVALID_DEVICES'));
  assert.ok(errors.some((error) => error.code === 'STORY_OWNERSHIP'));
  assert.ok(errors.some((error) => error.code === 'UNKNOWN_BRANCH'));
});

test('validator rejects structured nulls and non-array uncertainty metadata', () => {
  const broken = structuredClone(plan);
  broken.director.uncertainties = { sourceRefs: true };
  broken.story.places = null;
  broken.contentHash = hashSessionPlan(broken);
  const result = validateSessionPlan(broken, { package: pkg });
  assert.ok(result.errors.some((error) => error.code === 'INVALID_DIRECTOR'));
  assert.ok(result.errors.some((error) => error.code === 'INVALID_STORY'));
});
