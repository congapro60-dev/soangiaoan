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
  groupSize = 4
}) {
  const ids = (learners || [])
    .filter((l) => (typeof l === 'string' ? true : l?.present !== false))
    .map((l) => (typeof l === 'string' ? l : l?.id))
    .filter(Boolean);

  const total = ids.length;
  if (total === 0) {
    return {
      activityId: activity?.id || '',
      selectionDeadline: now + 15000,
      groups: []
    };
  }

  // Determine group sizes (aiming for ~4, between 2 and 5)
  const groupSlices = [];
  if (total <= 5) {
    groupSlices.push([...ids]);
  } else {
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

  const groups = groupSlices.map((memberIds, idx) => ({
    id: `grp-${activity?.id || 'act'}-${idx + 1}`,
    memberIds,
    roles: {},
    contributions: [],
    productSubmissionIds: [],
    seed
  }));

  return {
    activityId: activity?.id || '',
    selectionDeadline: now + 15000,
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
  const validRole = ROLE_DEFINITIONS.some((r) => r.id === roleId);
  if (!validRole) {
    return newState;
  }

  for (const grp of newState.groups) {
    if (grp.memberIds.includes(learnerId)) {
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
    const unassigned = ROLE_DEFINITIONS.filter((r) => !assignedRoles.has(r.id));
    if (unassigned.length === 0) {
      continue;
    }

    const membersWithRole = new Set(Object.values(grp.roles));
    const membersWithoutRole = activeMembers.filter((m) => !membersWithRole.has(m));

    let memberIndex = Number.isFinite(seed) ? Math.abs(seed) : 0;
    for (const role of unassigned) {
      let chosenMember;
      if (membersWithoutRole.length > 0) {
        chosenMember = membersWithoutRole.shift();
      } else {
        chosenMember = activeMembers[memberIndex % activeMembers.length];
        memberIndex++;
      }
      grp.roles[role.id] = chosenMember;
    }
  }

  return newState;
}
