import { createHash } from 'node:crypto';
import { canonicalize } from './schema.js';
import { ROLE_DEFINITIONS } from './grouping.js';

export const GROUP_ROLE_DEFINITIONS = Object.freeze([
  ...ROLE_DEFINITIONS,
  { id: 'question', label: 'Người hỏi khó' },
  { id: 'present', label: 'Người trình bày' },
  { id: 'time', label: 'Người canh giờ' },
  { id: 'check2', label: 'Kiểm chứng 2' }
]);
export const GROUP_DICE_ABSENCE_MS = 15000;

const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !forbidden.has(value);
const fail = code => { throw new Error(code); };
function members(group) {
  const ids = Array.isArray(group) ? group : group?.memberIds;
  if (!Array.isArray(ids) || ids.some(id => !identifier(id)) || new Set(ids).size !== ids.length) fail('INVALID_GROUP_MEMBERS');
  return ids;
}
const present = (id, roster) => !roster || roster[id]?.present !== false;
function requireMember(group, learnerId, roster) {
  if (!members(group).includes(learnerId) || !present(learnerId, roster)) fail('NOT_GROUP_MEMBER');
}

/** Fixed membership order is authoritative; stationIndex rotates assignments, never membership. */
export function groupRoleLayout(memberIds, { stationIndex = 0 } = {}) {
  const ids = members(memberIds);
  if (!Number.isSafeInteger(stationIndex) || stationIndex < 0) fail('INVALID_STATION');
  const roles = {}, roleDefinitions = [], subgroups = [];
  const count = ids.length >= 9 ? Math.ceil(ids.length / 3) : 1;
  let offset = 0;
  for (let i = 0; i < count && ids.length; i++) {
    const size = Math.floor(ids.length / count) + Number(i < ids.length % count);
    const part = ids.slice(offset, offset += size);
    const prefix = count > 1 ? `sub-${i + 1}-` : '';
    if (count > 1) subgroups.push({ id: `sub-${i + 1}`, memberIds: part });
    for (const [roleIndex, definition] of GROUP_ROLE_DEFINITIONS.slice(0, Math.max(4, part.length)).entries()) {
      const id = prefix + definition.id;
      roles[id] = part[(roleIndex + stationIndex) % part.length];
      roleDefinitions.push({ ...definition, id, ...(prefix ? { subgroupId: `sub-${i + 1}` } : {}) });
    }
  }
  return { roles, roleDefinitions, subgroups };
}

export function rotateGroupRoles(group, { stationIndex = 0, roster } = {}) {
  const ids = members(group).filter(id => present(id, roster));
  return { ...structuredClone(group), ...groupRoleLayout(ids, { stationIndex }) };
}

function validAnswer(value, depth = 0) {
  if (depth > 8) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 8000;
  if (Array.isArray(value)) return value.length <= 100 && value.every(item => validAnswer(item, depth + 1));
  return Boolean(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).every(key => !forbidden.has(key) && validAnswer(value[key], depth + 1)));
}

/** Parent reducer owns activity/branch authorization, event replay and assessment. */
export function proposeGroupDraft(group, { id, taskId, answer, learnerId }, roster) {
  requireMember(group, learnerId, roster);
  if (!identifier(id) || !identifier(taskId)) fail('INVALID_GROUP_PROPOSAL');
  if (!validAnswer(answer)) fail('INVALID_GROUP_ANSWER');
  const content = { id, taskId, answer, proposer: learnerId };
  const serialized = canonicalize(content);
  if (serialized.length > 16000) fail('INVALID_GROUP_ANSWER');
  const hash = createHash('sha256').update(serialized).digest('hex');
  return { ...structuredClone(group), proposal: { ...structuredClone(content), hash,
    votes: group.proposal?.hash === hash ? [...group.proposal.votes] : [learnerId] } };
}

function currentProposal(group, proposalHash) {
  if (!group.proposal || typeof proposalHash !== 'string' || group.proposal.hash !== proposalHash) fail('STALE_GROUP_PROPOSAL');
  return group.proposal;
}

export function voteGroupDraft(group, { learnerId, proposalHash }, roster) {
  requireMember(group, learnerId, roster);
  const proposal = currentProposal(group, proposalHash);
  return { ...structuredClone(group), proposal: { ...structuredClone(proposal), votes: [...new Set([...proposal.votes, learnerId])] } };
}

export function groupDraftConsent(group, proposalHash, roster) {
  const proposal = currentProposal(group, proposalHash);
  const active = members(group).filter(id => present(id, roster));
  const votes = new Set(proposal.votes.filter(id => active.includes(id))).size;
  const required = Math.floor(active.length / 2) + 1;
  return { approved: active.length > 0 && votes >= required, votes, required };
}

function clock(dice, activeMs) {
  if (!Number.isFinite(activeMs) || activeMs < 0 || activeMs < (dice?.lastActiveMs || 0)) fail('INVALID_ACTIVE_CLOCK');
}

export function createGroupDice(group, activeMs = 0) {
  members(group); clock(null, activeMs);
  return { position: 0, carry: 0, rolls: 0, turnIndex: 0, completedGates: [], absentSinceActiveMs: null, lastActiveMs: activeMs };
}

function nextPresentIndex(ids, index, roster) {
  for (let i = 1; i <= ids.length; i++) {
    const next = (index + i) % ids.length;
    if (present(ids[next], roster)) return next;
  }
  return index;
}

/** activeMs is cumulative lesson activity time; a paused call supplies unchanged activeMs. */
export function advanceGroupDiceTurn(group, dice, roster, activeMs) {
  const ids = members(group); clock(dice, activeMs);
  const next = { ...structuredClone(dice), lastActiveMs: activeMs };
  if (!ids.length) return next;
  if (present(ids[next.turnIndex], roster)) next.absentSinceActiveMs = null;
  else {
    next.absentSinceActiveMs ??= activeMs;
    if (activeMs - next.absentSinceActiveMs > GROUP_DICE_ABSENCE_MS) {
      const index = nextPresentIndex(ids, next.turnIndex, roster);
      if (index !== next.turnIndex) {
        next.turnIndex = index;
        next.absentSinceActiveMs = null;
      }
    }
  }
  return next;
}

/** completed/die/gatePosition are server-owned; result never awards mastery or game points. */
export function rollGroupDice(group, dice, { learnerId, gateId, completed, activeMs, die, gatePosition }, roster) {
  requireMember(group, learnerId, roster);
  if (!identifier(gateId)) fail('INVALID_GROUP_GATE');
  if (completed !== true) fail('GROUP_TASK_INCOMPLETE');
  if (!Number.isInteger(die) || die < 1 || die > 6 || !Number.isFinite(gatePosition) || gatePosition < dice.position) fail('INVALID_GROUP_ROLL');
  const next = advanceGroupDiceTurn(group, dice, roster, activeMs), ids = members(group);
  if (next.completedGates.includes(gateId)) fail('GROUP_GATE_ALREADY_ROLLED');
  if (ids[next.turnIndex] !== learnerId) fail('NOT_DICE_TURN');
  const target = next.position + next.carry + die;
  return { ...next, position: Math.min(gatePosition, target), carry: Math.max(0, target - gatePosition), rolls: next.rolls + 1,
    turnIndex: nextPresentIndex(ids, next.turnIndex, roster), completedGates: [...next.completedGates, gateId], absentSinceActiveMs: null };
}
