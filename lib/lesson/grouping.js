/**
 * Activity grouping and role assignment module.
 */

export const ROLE_DEFINITIONS = Object.freeze([
  { id: 'discover', label: 'Phát hiện dữ kiện' },
  { id: 'represent', label: 'Dựng biểu diễn' },
  { id: 'check', label: 'Kiểm chứng' },
  { id: 'explain', label: 'Giải thích, tổng hợp' }
]);

/**
 * Creates activity groups for present learners.
 *
 * @param {{
 *   activity: { id: string },
 *   learners: Array<string | { id: string, present?: boolean }>,
 *   seed?: number,
 *   now?: number,
 *   groupSize?: number
 * }} param0
 * @returns {Object}
 */
export function createActivityGroups({
  activity,
  learners = [],
  seed = 0,
  now = Date.now(),
  groupSize = 4,
  groupPolicyVersion = 0,
  stationIndex = 0
}) {
  const fixed = new Map();
  if (groupPolicyVersion === 1) {
    for (const learner of learners) {
      if (typeof learner === 'object' && learner?.teamId && learner.id) {
        const memberIds = fixed.get(learner.teamId) || [];
        memberIds.push(learner.id); fixed.set(learner.teamId, memberIds);
      }
    }
  }
  const ids = (learners || [])
    .filter((l) => (typeof l === 'string' ? true : l?.present !== false && !(groupPolicyVersion === 1 && l?.teamId)))
    .map((l) => (typeof l === 'string' ? l : l?.id))
    .filter(Boolean);

  const total = ids.length;
  if (total === 0 && fixed.size === 0) {
    return {
      activityId: activity?.id || '',
      selectionDeadline: now + 15000,
      groups: []
    };
  }

  // Determine group sizes (aiming for ~4, between 2 and 5)
  const groupSlices = [];
  if (total > 0 && total <= 5) {
    groupSlices.push([...ids]);
  } else if (total > 0) {
    let numGroups = Math.max(1, Math.round(total / groupSize));
    let base = Math.floor(total / numGroups);
    let rem = total % numGroups;

    let offset = 0;
    for (let i = 0; i < numGroups; i++) {
      const size = base + (i < rem ? 1 : 0);
      groupSlices.push(ids.slice(offset, offset + size));
      offset += size;
    }
  }

  const groupMembers = [...fixed.entries()].map(([teamId, memberIds]) => ({ teamId, memberIds }));
  groupMembers.push(...groupSlices.map(memberIds => ({ memberIds })));
  const groups = groupMembers.map(({ memberIds, teamId }, idx) => ({
    id: groupPolicyVersion === 1 ? teamId ? `team:${teamId}` : `grp-${idx + 1}` : `grp-${activity?.id || 'act'}-${idx + 1}`,
    ...(teamId ? { teamId } : {}),
    memberIds,
    roles: {},
    contributions: [],
    productSubmissionIds: [],
    seed
  }));

  return {
    activityId: activity?.id || '',
    selectionDeadline: now + 15000,
    ...(groupPolicyVersion === 1 ? { stationIndex } : {}),
    groups
  };
}

/**
 * Assigns a role to a learner within their group.
 *
 * @param {Object} groupState
 * @param {{ learnerId: string, roleId: string, now: number }} param1
 * @returns {Object} new groupState
 */
export function chooseGroupRole(groupState, { learnerId, roleId, now }) {
  const newState = JSON.parse(JSON.stringify(groupState));
  if (typeof now === 'number' && newState.selectionDeadline && now > newState.selectionDeadline) {
    return newState;
  }
  const validRole = newState.groups.some(group => (group.roleDefinitions || ROLE_DEFINITIONS).some((r) => r.id === roleId));
  if (!validRole) {
    return newState;
  }

  for (const grp of newState.groups) {
    if (grp.memberIds.includes(learnerId)) {
      if (!(grp.roleDefinitions || ROLE_DEFINITIONS).some(role => role.id === roleId)) return newState;
      // Role uniqueness: cannot take if already assigned to someone else
      if (grp.roles[roleId] && grp.roles[roleId] !== learnerId) {
        return newState;
      }
      grp.roles[roleId] = learnerId;
      break;
    }
  }

  return newState;
}

/**
 * Automatically assigns unassigned roles to group members deterministically.
 *
 * @param {Object} groupState
 * @param {{ now?: number, seed?: number, roster?: Object }} [options]
 * @returns {Object} new groupState
 */
export function autoAssignRemainingRoles(groupState, { now = Date.now(), seed = 0, roster = null } = {}) {
  const newState = JSON.parse(JSON.stringify(groupState));
  if (typeof now === 'number' && newState.selectionDeadline) {
    newState.rolesAutoAssignedAt = now;
  }

  for (const grp of newState.groups) {
    // Purge roles assigned to learners who are absent in roster
    if (roster) {
      for (const [rId, mId] of Object.entries(grp.roles)) {
        if (roster[mId]?.present === false) {
          delete grp.roles[rId];
        }
      }
    }

    const activeMembers = (grp.memberIds || []).filter(
      (m) => !roster || roster[m]?.present !== false
    );
    if (activeMembers.length === 0) {
      continue;
    }

    const assignedRoles = new Set(Object.keys(grp.roles));
    const unassigned = (grp.roleDefinitions || ROLE_DEFINITIONS).filter((r) => !assignedRoles.has(r.id));
    if (unassigned.length === 0) {
      continue;
    }

    const membersWithRole = new Set(Object.values(grp.roles));
    const membersWithoutRole = activeMembers.filter((m) => !membersWithRole.has(m));

    let memberIndex = Number.isFinite(seed) ? Math.abs(seed) : 0;
    for (const role of unassigned) {
      const candidates = role.subgroupId ? (grp.subgroups?.find(subgroup => subgroup.id === role.subgroupId)?.memberIds || []).filter(id => activeMembers.includes(id)) : activeMembers;
      if (!candidates.length) continue;
      let chosenMember;
      const preferred = grp.defaultRoles?.[role.id];
      const available = membersWithoutRole.filter(id => candidates.includes(id));
      if (preferred && candidates.includes(preferred) && (!available.length || available.includes(preferred))) {
        chosenMember = preferred;
        const index = membersWithoutRole.indexOf(preferred);
        if (index >= 0) membersWithoutRole.splice(index, 1);
      } else if (available.length > 0) {
        chosenMember = available[0];
        membersWithoutRole.splice(membersWithoutRole.indexOf(chosenMember), 1);
      } else {
        chosenMember = candidates[memberIndex % candidates.length];
        memberIndex++;
      }
      grp.roles[role.id] = chosenMember;
    }
  }

  return newState;
}
