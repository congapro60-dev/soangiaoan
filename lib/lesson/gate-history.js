function currentGate(state, unitsPerActivity) {
  const activity = state.package?.activities?.[state.timeline?.activityIndex];
  const plan = state.gamePlan?.activityPlans?.find(item => item.id === activity?.id);
  if (!activity || (activity.budgetRole !== 'core' && plan?.mapSegment?.coreGate !== true)) return null;
  return { activityId: activity.id, gatePosition: (state.timeline.activityIndex + 1) * unitsPerActivity };
}

function activeDelta(state, from, now) {
  if (state.status !== 'active' || state.timeline?.locked) return 0;
  const arenaStart = state.clock?.arenaPausedAt;
  const arenaEnd = state.arena?.event?.resumeAt;
  const hasArena = arenaStart != null && Number.isFinite(arenaEnd);
  const deadline = Number.isFinite(state.clock?.activityDeadline) ? state.clock.activityDeadline : Infinity;
  const end = Math.min(now, deadline + (hasArena ? Math.max(0, arenaEnd - arenaStart) : 0));
  const elapsed = Math.max(0, end - from);
  const arenaOverlap = hasArena ? Math.max(0, Math.min(end, arenaEnd) - Math.max(from, arenaStart)) : 0;
  return Math.max(0, elapsed - arenaOverlap);
}

function currentRecords(state, gate) {
  return Object.entries(state.gateHistory || {}).filter(([id, record]) =>
    gate && record.round === state.round && record.activityId === gate.activityId &&
    record.gatePosition === gate.gatePosition && state.roster?.[id]?.present !== false &&
    state.roster?.[id] && state.diceTrack?.[id]?.position >= gate.gatePosition);
}

export function projectGateTiming(state, now, unitsPerActivity) {
  const wall = Math.max(Number.isFinite(now) ? now : state.clock?.lastNow || 0, state.clock?.lastNow || 0);
  const gate = currentGate(state, unitsPerActivity);
  return Object.fromEntries(currentRecords(state, gate).map(([id, record]) => [id, {
    activityId: record.activityId,
    gatePosition: record.gatePosition,
    enteredAt: record.enteredAt,
    activeMs: record.activeMs + activeDelta(state, record.updatedAt, wall)
  }]));
}

export function gateClockActive(state, now) {
  const wall = Math.max(Number.isFinite(now) ? now : state.clock?.lastNow || 0, state.clock?.lastNow || 0);
  return activeDelta(state, wall, wall + 1) > 0;
}

export function updateGateHistory(previous, next, event, actor, now, unitsPerActivity) {
  const gate = currentGate(next, unitsPerActivity);
  // ponytail: one current interval per present learner; a full journey history needs a separate contract.
  next.gateHistory = Object.fromEntries(currentRecords(next, gate).map(([id, record]) => [id, {
    ...record, activeMs: record.activeMs + activeDelta(previous, record.updatedAt, now), updatedAt: now
  }]));
  if (!gate) return;
  let learnerId;
  if (event.type === 'ROLL' && previous.diceTrack?.[actor.id]?.position < gate.gatePosition &&
    next.diceTrack?.[actor.id]?.position >= gate.gatePosition) learnerId = actor.id;
  if (event.type === 'ADD_LEARNER') {
    const id = event.payload.learner.id;
    if (previous.roster?.[id]?.present === false && next.roster?.[id]?.present !== false &&
      next.diceTrack?.[id]?.position >= gate.gatePosition) learnerId = id;
  }
  if (learnerId && !next.gateHistory[learnerId]) {
    next.gateHistory[learnerId] = { round: next.round, ...gate, enteredAt: now, activeMs: 0, updatedAt: now };
  }
}
