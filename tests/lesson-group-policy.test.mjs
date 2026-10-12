import test from 'node:test';
import assert from 'node:assert/strict';

const policy = await import('../lib/lesson/group-policy.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
const ids = n => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const group = n => ({ id: 'fixed-team', memberIds: ids(n), roles: {}, contributions: [] });
const roster = n => Object.fromEntries(ids(n).map(id => [id, { present: true }]));
const check = (name, run) => test(name, { skip: !policy }, run);

test('approved group policy primitives exist', () => assert.ok(policy, 'group-policy.js is missing'));

check('roles cover every learner, rotate and retain fixed membership for 2 through 8', () => {
  for (let n = 2; n <= 8; n++) {
    const original = group(n), before = structuredClone(original);
    const assigned = policy.rotateGroupRoles(original, { stationIndex: 0, roster: roster(n) });
    assert.deepEqual(assigned.memberIds, original.memberIds);
    assert.deepEqual(new Set(Object.values(assigned.roles)), new Set(ids(n)));
    assert.equal(assigned.roleDefinitions.length, Math.max(4, n));
    const rotated = policy.rotateGroupRoles(assigned, { stationIndex: 1, roster: roster(n) });
    assert.notEqual(rotated.roles.discover, assigned.roles.discover);
    assert.deepEqual(original, before);
  }
});

check('45 member fixed team has subgroups of 2 or 3, each member has a role', () => {
  for (const n of [9, 10, 11, 45]) {
    const layout = policy.groupRoleLayout(ids(n));
    assert.ok(layout.subgroups.every(sub => sub.memberIds.length >= 2 && sub.memberIds.length <= 3));
    assert.deepEqual(layout.subgroups.flatMap(sub => sub.memberIds), ids(n));
    assert.deepEqual(new Set(Object.values(layout.roles)), new Set(ids(n)));
    assert.equal(new Set(layout.roleDefinitions.map(role => role.id)).size, layout.roleDefinitions.length);
  }
});

check('absent members retain fixed membership but receive no active roles', () => {
  const presence = roster(5); presence.p2.present = false;
  const assigned = policy.rotateGroupRoles(group(5), { stationIndex: 0, roster: presence });
  assert.deepEqual(assigned.memberIds, ids(5));
  assert.equal(Object.values(assigned.roles).includes('p2'), false);
  assert.throws(() => policy.groupRoleLayout(['p1', 'p1']), /INVALID_GROUP_MEMBERS/);
  assert.throws(() => policy.groupRoleLayout(ids(3), { stationIndex: -1 }), /INVALID_STATION/);
});

check('exact current proposal needs a distinct present majority', () => {
  const presence = roster(4);
  let state = policy.proposeGroupDraft(group(4), { id: 'proposal-1', taskId: 'task-1', answer: { a: 'b' }, learnerId: 'p1' }, presence);
  const hash = state.proposal.hash;
  assert.deepEqual(policy.groupDraftConsent(state, hash, presence), { approved: false, votes: 1, required: 3 });
  state = policy.voteGroupDraft(state, { learnerId: 'p2', proposalHash: hash }, presence);
  state = policy.voteGroupDraft(state, { learnerId: 'p2', proposalHash: hash }, presence);
  assert.equal(state.proposal.votes.length, 2);
  state = policy.voteGroupDraft(state, { learnerId: 'p3', proposalHash: hash }, presence);
  assert.deepEqual(policy.groupDraftConsent(state, hash, presence), { approved: true, votes: 3, required: 3 });
  presence.p3.present = false;
  assert.deepEqual(policy.groupDraftConsent(state, hash, presence), { approved: true, votes: 2, required: 2 });
  presence.p2.present = false;
  assert.equal(policy.groupDraftConsent(state, hash, presence).approved, false);
});

check('replacement resets votes; canonical identical proposal retains them without mutating input', () => {
  const presence = roster(3);
  let state = policy.proposeGroupDraft(group(3), { id: 'proposal-1', taskId: 'task-1', answer: { a: 'b', c: 'd' }, learnerId: 'p1' }, presence);
  state = policy.voteGroupDraft(state, { learnerId: 'p2', proposalHash: state.proposal.hash }, presence);
  const before = structuredClone(state), oldHash = state.proposal.hash;
  const identical = policy.proposeGroupDraft(state, { id: 'proposal-1', taskId: 'task-1', answer: { c: 'd', a: 'b' }, learnerId: 'p1' }, presence);
  assert.equal(identical.proposal.hash, oldHash);
  assert.deepEqual(identical.proposal.votes, ['p1', 'p2']);
  const replaced = policy.proposeGroupDraft(state, { id: 'proposal-2', taskId: 'task-1', answer: 'new', learnerId: 'p2' }, presence);
  assert.notEqual(replaced.proposal.hash, oldHash);
  assert.deepEqual(replaced.proposal.votes, ['p2']);
  assert.throws(() => policy.voteGroupDraft(replaced, { learnerId: 'p1', proposalHash: oldHash }, presence), /STALE_GROUP_PROPOSAL/);
  assert.throws(() => policy.groupDraftConsent(replaced, oldHash, presence), /STALE_GROUP_PROPOSAL/);
  assert.deepEqual(state, before);
});

check('outsiders, absent learners and non JSON answers cannot propose or vote', () => {
  const presence = roster(3); presence.p3.present = false;
  const initial = group(3), draft = { id: 'draft', taskId: 'task', answer: ['a'], learnerId: 'p1' };
  assert.throws(() => policy.proposeGroupDraft(initial, { ...draft, learnerId: 'outsider' }, presence), /NOT_GROUP_MEMBER/);
  assert.throws(() => policy.proposeGroupDraft(initial, { ...draft, learnerId: 'p3' }, presence), /NOT_GROUP_MEMBER/);
  for (const answer of [undefined, NaN, { a: undefined }, { a: () => 1 }]) {
    assert.throws(() => policy.proposeGroupDraft(initial, { ...draft, answer }, presence), /INVALID_GROUP_ANSWER/);
  }
  const proposed = policy.proposeGroupDraft(initial, draft, presence);
  for (const learnerId of ['outsider', 'p3']) assert.throws(() => policy.voteGroupDraft(proposed, { learnerId, proposalHash: proposed.proposal.hash }, presence), /NOT_GROUP_MEMBER/);
});

check('group dice require completed product and current roller, rotate once per gate', () => {
  const fixed = group(3), presence = roster(3), initial = policy.createGroupDice(fixed, 0);
  const input = { learnerId: 'p1', gateId: 'gate-1', completed: true, activeMs: 100, die: 6, gatePosition: 4 };
  assert.throws(() => policy.rollGroupDice(fixed, initial, { ...input, completed: false }, presence), /GROUP_TASK_INCOMPLETE/);
  assert.throws(() => policy.rollGroupDice(fixed, initial, { ...input, learnerId: 'p2' }, presence), /NOT_DICE_TURN/);
  const rolled = policy.rollGroupDice(fixed, initial, input, presence);
  assert.equal(rolled.position, 4); assert.equal(rolled.carry, 2);
  assert.equal(rolled.rolls, 1); assert.equal(rolled.turnIndex, 1);
  assert.deepEqual(rolled.completedGates, ['gate-1']);
  assert.throws(() => policy.rollGroupDice(fixed, rolled, { ...input, learnerId: 'p2', activeMs: 200 }, presence), /GROUP_GATE_ALREADY_ROLLED/);
  const next = policy.rollGroupDice(fixed, rolled, { ...input, learnerId: 'p2', gateId: 'gate-2', gatePosition: 12, activeMs: 200, die: 2 }, presence);
  assert.equal(next.position, 8); assert.equal(next.turnIndex, 2);
  assert.equal(initial.rolls, 0);
});

check('absence skips only after 15 seconds active time; pause represented by unchanged activeMs', () => {
  const fixed = group(3), presence = roster(3); presence.p1.present = false;
  let dice = policy.advanceGroupDiceTurn(fixed, policy.createGroupDice(fixed, 0), presence, 100);
  assert.equal(dice.turnIndex, 0); assert.equal(dice.absentSinceActiveMs, 100);
  dice = policy.advanceGroupDiceTurn(fixed, dice, presence, 100);
  assert.equal(dice.turnIndex, 0);
  dice = policy.advanceGroupDiceTurn(fixed, dice, presence, 15100);
  assert.equal(dice.turnIndex, 0);
  dice = policy.advanceGroupDiceTurn(fixed, dice, presence, 15101);
  assert.equal(dice.turnIndex, 1); assert.equal(dice.absentSinceActiveMs, null);
  assert.throws(() => policy.advanceGroupDiceTurn(fixed, dice, presence, 15000), /INVALID_ACTIVE_CLOCK/);
});

check('returned roller clears absence, no present members leaves dice blocked', () => {
  const fixed = group(2), presence = roster(2); presence.p1.present = false;
  let dice = policy.advanceGroupDiceTurn(fixed, policy.createGroupDice(fixed), presence, 0);
  presence.p1.present = true;
  dice = policy.advanceGroupDiceTurn(fixed, dice, presence, 500);
  assert.equal(dice.absentSinceActiveMs, null);
  presence.p1.present = false; presence.p2.present = false;
  dice = policy.advanceGroupDiceTurn(fixed, dice, presence, 1000);
  dice = policy.advanceGroupDiceTurn(fixed, dice, presence, 20000);
  assert.equal(dice.turnIndex, 0);
  assert.throws(() => policy.rollGroupDice(fixed, dice, { learnerId: 'p1', gateId: 'g1', completed: true, activeMs: 20001, die: 2, gatePosition: 8 }, presence), /NOT_GROUP_MEMBER/);
});
