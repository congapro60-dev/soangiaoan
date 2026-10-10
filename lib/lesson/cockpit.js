export function normalizeSupportMinutes(value) {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 60 ? minutes : 5;
}

// Teacher-only display derivation. Movement and submitted work never confer mastery.
export function cockpitLearners(view, minutes = 5) {
  if (!view) return [];
  const activities = view.package?.activities || [];
  const tasks = view.package?.tasks || [];
  const current = activities.find(activity => activity.id === view.timeline?.currentActivityId);
  const units = view.map?.unitsPerActivity || 8;
  const core = activities.filter(activity => activity.budgetRole === 'core' ||
    view.gamePlan?.activityPlans?.some(plan => plan.id === activity.id && plan.mapSegment?.coreGate === true));
  const rechecks = new Set((view.package?.evidenceRules || []).filter(rule =>
    rule.individual === true && ['individual_recheck', 'independent_recheck'].includes(rule.kind)).map(rule => rule.taskId));
  const active = view.gateClockActive !== false && view.status === 'active' && !view.timeline?.locked && view.clock?.arenaPausedAt == null;
  const peers = new Map((view.map?.peers || []).map(peer => [peer.id, peer]));
  return Object.entries(view.roster || {}).flatMap(([learnerId, learner], index) => {
    const peerId = 'm' + index;
    const peer = peers.get(peerId);
    if (learner.present === false || !peer) return [];
    const submissions = [...new Map(Object.values(view.submissions || {}).filter(sub =>
      sub.learnerId === learnerId && Number.isFinite(sub.at)).map(sub => [sub.submissionId, sub])).values()].sort((a, b) => a.at - b.at);
    const latest = new Map(submissions.map(sub => [`${sub.activityId}:${sub.taskId}`, sub]));
    const applicable = activity => {
      const branch = view.branches?.[activity.id]?.[learnerId] || 'core';
      return tasks.filter(task => activity.taskIds?.includes(task.id) &&
        (task.participation || activity.participation) === 'individual' &&
        (!task.branch || task.branch === 'shared' || task.branch === branch));
    };
    const passed = sub => sub?.assessmentStatus === 'assessed' && sub.ok === true;
    const currentTasks = current ? applicable(current) : [];
    const currentSubmissions = currentTasks.map(task => latest.get(`${current.id}:${task.id}`));
    const completed = currentTasks.length > 0 && currentSubmissions.every(passed);
    const awaitingReview = currentTasks.length > 0 && currentSubmissions.every(sub =>
      passed(sub) || sub?.assessmentStatus === 'pending') && currentSubmissions.some(sub => sub?.assessmentStatus === 'pending');
    let wrongRechecks = 0;
    for (const sub of submissions) {
      if (sub.activityId !== current?.id || !rechecks.has(sub.taskId) || sub.assessmentStatus !== 'assessed') continue;
      if (sub.ok === true) wrongRechecks = 0;
      else if (sub.ok === false) wrongRechecks++;
    }
    const timing = view.gateTiming?.[learnerId];
    const timingValid = timing?.activityId === current?.id && timing?.gatePosition === view.map?.gatePosition &&
      peer.position >= timing.gatePosition && Number.isFinite(timing.activeMs) && timing.activeMs >= 0;
    const activeMs = timingValid ? timing.activeMs : null;
    const evidenceActivities = core.filter(activity => applicable(activity).length > 0);
    const stationIndex = Math.max(0, Math.min(activities.length - 1, Math.ceil(peer.position / units) - 1));
    const hintHistory = view.passports?.[learnerId]?.supportHistory || [];
    return [{
      learnerId, peerId, name: learner.name, mascot: peer.mascot, position: peer.position,
      stationIndex, stationPhase: activities[stationIndex]?.phase, currentActivityId: current?.id,
      activeMs, enteredAt: timingValid ? timing.enteredAt : null,
      lastSubmittedAt: submissions.at(-1)?.at ?? null,
      hintCount: hintHistory.length, hintTiers: [...new Set(hintHistory.map(hint => hint.tier).filter(Boolean))],
      wrongRechecks, completed, awaitingReview,
      needsSupport: Boolean(active && core.includes(current) && currentTasks.length && !completed && !awaitingReview &&
        ((activeMs !== null && activeMs >= normalizeSupportMinutes(minutes) * 60000) || wrongRechecks >= 2)),
      movementDone: core.filter(activity => (activities.indexOf(activity) + 1) * units <= peer.position).length,
      movementTotal: core.length,
      evidenceDone: evidenceActivities.filter(activity => applicable(activity).every(task => passed(latest.get(`${activity.id}:${task.id}`)))).length,
      evidenceTotal: evidenceActivities.length
    }];
  });
}

// "3 việc nên làm bây giờ": at most three short, teacher-only suggestions derived from the same rows.
export function cockpitActions(view, minutes = 5) {
  if (!view) return [];
  const rows = cockpitLearners(view, minutes);
  if (!rows.length) return [];
  const actions = [];
  const support = rows.filter(row => row.needsSupport)
    .sort((a, b) => (b.activeMs ?? -1) - (a.activeMs ?? -1) || b.wrongRechecks - a.wrongRechecks);
  if (support.length) {
    const names = support.slice(0, 3).map(row => row.name).join(', ');
    actions.push({ kind: 'support', learnerId: support[0].learnerId,
      text: `Hỗ trợ ${support.length} em đang kẹt: ${names}${support.length > 3 ? '…' : ''}` });
  }
  const currentId = view.timeline?.currentActivityId;
  const present = new Set(rows.map(row => row.learnerId));
  const current = (view.package?.activities || []).find(activity => activity.id === currentId);
  const tasks = new Map((view.package?.tasks || []).filter(task => current?.taskIds?.includes(task.id) &&
    (task.participation || current.participation) === 'individual').map(task => [task.id, task]));
  const latest = new Map();
  for (const sub of Object.values(view.submissions || {})) {
    const task = tasks.get(sub.taskId);
    const branch = view.branches?.[currentId]?.[sub.learnerId] || 'core';
    if (sub.activityId !== currentId || !present.has(sub.learnerId) || !task || !Number.isFinite(sub.at) ||
      (task.branch && task.branch !== 'shared' && task.branch !== branch)) continue;
    const key = `${sub.learnerId}:${sub.taskId}`;
    if (!latest.has(key) || latest.get(key).at <= sub.at) latest.set(key, sub);
  }
  const wrong = new Map();
  for (const sub of latest.values()) if (sub.assessmentStatus === 'assessed' && sub.ok === false) wrong.set(sub.taskId, (wrong.get(sub.taskId) || 0) + 1);
  const [taskId, count] = [...wrong.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  if (count >= Math.max(2, Math.ceil(rows.length * 0.2))) {
    const task = (view.package?.tasks || []).find(item => item.id === taskId);
    const label = String(task?.title || task?.prompt || taskId).split(/\$|\\\(|\\\[/, 1)[0].replace(/\s+/g, ' ').trim().slice(0, 60) || 'nhiệm vụ hiện tại';
    actions.push({ kind: 'error', taskId, text: `Lỗi phổ biến: ${count} em đang sai ở “${label}” — nên chữa chung trước lớp` });
  }
  const pending = [...latest.values()].filter(sub => sub.assessmentStatus === 'pending' &&
    view.openAssessments?.[sub.submissionId]?.status === 'pending').length;
  const done = rows.filter(row => row.completed).length;
  if (pending) actions.push({ kind: 'review', text: `Chấm ${pending} bài đang chờ giáo viên` });
  else if (['active', 'paused'].includes(view.status) && done >= Math.ceil(rows.length * 0.8)) actions.push({ kind: 'wrap', text: `${done}/${rows.length} em đã xong hoạt động này — có thể chốt kiến thức và chuyển tiếp` });
  return actions.slice(0, 3);
}
