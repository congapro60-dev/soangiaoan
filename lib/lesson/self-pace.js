// "HS tự đi" (chủ hệ thống 16/10/2026): mỗi em tự lắc xúc xắc, tới cổng nào làm câu cổng đó rồi đi tiếp.
// Lõi tiết học vẫn tính mọi thứ theo `timeline` của cả lớp; ở chế độ này mỗi lệnh của một em được chạy
// trên bản sao trạng thái có `timeline` của riêng em, rồi ghép lại. Đồng hồ cả tiết giữ chung để GV tạm dừng/cộng giờ.

export const SELF_PACE_MAX_TRIES = 2;

export const isSelfPaced = state => state?.pacing === 'self';

/** Trong chế độ tự đi, nhiệm vụ cả lớp/nhóm được mỗi em làm riêng (không chờ nhóm, không chờ GV). */
function soloPackage(pkg) {
  const solo = item => item.participation === 'individual' ? item : { ...item, participation: 'individual' };
  return { ...pkg, activities: pkg.activities.map(solo), tasks: pkg.tasks.map(solo) };
}

const soloCache = new WeakMap();
export function selfPacedPackage(pkg) {
  if (!pkg || !Array.isArray(pkg.activities)) return pkg;
  if (!soloCache.has(pkg)) soloCache.set(pkg, soloPackage(pkg));
  return soloCache.get(pkg);
}

export function learnerGateIndex(state, learnerId) {
  const index = state.selfProgress?.[learnerId];
  return Number.isInteger(index) ? index : 0;
}

/** Bản sao trạng thái nhìn từ phía một em: timeline = cổng của em, gói bài ở dạng làm cá nhân. */
export function scopeToLearner(state, learnerId) {
  const index = Math.min(learnerGateIndex(state, learnerId), state.package.activities.length - 1);
  const activity = state.package.activities[index];
  const scoped = {
    ...state,
    package: selfPacedPackage(state.package),
    timeline: { ...state.timeline, activityIndex: index, currentActivityId: activity.id, currentPhase: activity.phase }
  };
  // Mức em đang chọn không có câu ở trạm này: cho em làm mức có câu (chuẩn trước), tránh cổng trống.
  const tasks = state.package.tasks.filter(task => activity.taskIds?.includes(task.id));
  const lane = state.branches?.[activity.id]?.[learnerId] || 'core';
  if (tasks.length && !tasks.some(task => !task.branch || task.branch === 'shared' || task.branch === lane)) {
    const fallback = ['core', 'support', 'extension'].find(branch => tasks.some(task => task.branch === branch));
    scoped.branches = { ...state.branches, [activity.id]: { ...(state.branches?.[activity.id] || {}), [learnerId]: fallback } };
  }
  return scoped;
}

function laneTasks(state, learnerId, activity) {
  const lane = state.branches?.[activity.id]?.[learnerId] || 'core';
  const tasks = state.package.tasks.filter(task => activity.taskIds?.includes(task.id));
  const own = tasks.filter(task => !task.branch || task.branch === 'shared' || task.branch === lane);
  if (own.length) return own;
  const fallback = ['core', 'support', 'extension'].find(branch => tasks.some(task => task.branch === branch));
  return tasks.filter(task => task.branch === fallback);
}

/** Một câu xong khi đúng, hoặc chờ GV chấm (tự luận/phản tư), hoặc đã thử đủ số lần. */
export function gateDone(state, learnerId, activity) {
  const tasks = laneTasks(state, learnerId, activity);
  if (!tasks.length) return true;
  const mine = Object.values(state.submissions || {}).filter(sub => sub.learnerId === learnerId && sub.activityId === activity.id);
  return tasks.every(task => {
    const tries = mine.filter(sub => sub.taskId === task.id);
    return tries.some(sub => sub.ok === true || sub.assessmentStatus === 'pending') || tries.length >= SELF_PACE_MAX_TRIES;
  });
}

/** Đưa em sang cổng kế tiếp khi xong cổng hiện tại (bỏ qua hoạt động không có câu như dự phòng). */
export function advanceLearner(state, learnerId) {
  const activities = state.package.activities;
  let index = learnerGateIndex(state, learnerId);
  while (index < activities.length - 1 && gateDone(state, learnerId, activities[index])) index++;
  const finished = index === activities.length - 1 && gateDone(state, learnerId, activities[index]);
  state.selfProgress = { ...(state.selfProgress || {}), [learnerId]: index };
  state.selfFinished = { ...(state.selfFinished || {}), [learnerId]: finished };
}

export function lessonMinutes(pkg) {
  return (pkg.activities || []).reduce((sum, activity) => sum + (activity.budgetRole === 'reserve' ? 0 : Number(activity.minutes) || 0), 0);
}

/** Tiến độ cả lớp cho GV: số em ở từng cổng, số em đã đi hết. */
export function classProgress(state) {
  const learners = Object.keys(state.roster || {}).filter(id => state.roster[id]?.present !== false);
  const gates = state.package.activities.map((activity, index) => ({ activityId: activity.id, count: learners.filter(id => learnerGateIndex(state, id) === index && !state.selfFinished?.[id]).length }));
  return { gates, finished: learners.filter(id => state.selfFinished?.[id]).length, total: learners.length };
}

/** Câu có hơn 50% em làm sai ở lần nộp đầu (ít nhất 4 em đã nộp): gợi ý GV dừng lớp để chữa. */
export function wrongAlerts(state, minLearners = 4) {
  const first = new Map();
  for (const sub of Object.values(state.submissions || {}).sort((a, b) => (a.at || 0) - (b.at || 0))) {
    if (sub.assessmentStatus !== 'assessed' || sub.source === 'practice') continue;
    const key = `${sub.taskId}:${sub.learnerId}`;
    if (!first.has(key)) first.set(key, sub);
  }
  const byTask = new Map();
  for (const sub of first.values()) {
    const row = byTask.get(sub.taskId) || { taskId: sub.taskId, activityId: sub.activityId, total: 0, wrong: 0 };
    row.total++; if (sub.ok !== true) row.wrong++;
    byTask.set(sub.taskId, row);
  }
  return [...byTask.values()].filter(row => row.total >= minLearners && row.wrong * 2 > row.total)
    .map(row => ({ ...row, prompt: String(state.package.tasks.find(task => task.id === row.taskId)?.prompt || '').slice(0, 160) }));
}

/** Cổng mà kế hoạch bài dạy đã tới ở thời điểm này (theo thời gian học thực, trừ lúc tạm dừng). */
export function plannedGateIndex(state, now) {
  const clock = state.clock || {};
  if (state.status === 'waiting' || clock.startedAt == null) return 0;
  const paused = (clock.totalPausedMs || 0) + (clock.pausedAt != null ? Math.max(0, now - clock.pausedAt) : 0);
  const elapsedMinutes = Math.max(0, now - clock.startedAt - paused) / 60000;
  const activities = state.package.activities;
  let end = 0;
  for (let index = 0; index < activities.length; index++) {
    if (activities[index].budgetRole === 'reserve') continue;
    end += Number(activities[index].minutes) || 0;
    if (elapsedMinutes < end) return index;
  }
  return activities.length - 1;
}

/** Em vào sau khi tiết đã chạy: bắt đầu ở cổng theo kế hoạch, như thể đã đi tới mốc đó cùng lớp. */
export function placeLateLearner(state, learnerId, now, unitsPerActivity) {
  const index = plannedGateIndex(state, now);
  if (index <= 0) return;
  state.selfProgress = { ...(state.selfProgress || {}), [learnerId]: index };
  const dice = state.diceTrack?.[learnerId] || { position: 0, carry: 0, rolls: 0, slow: false, boost: false };
  state.diceTrack = { ...(state.diceTrack || {}), [learnerId]: { ...dice, position: Math.max(dice.position, index * unitsPerActivity), carry: 0 } };
  state.lateStart = { ...(state.lateStart || {}), [learnerId]: index };
}

/** Nhiệm vụ cả lớp (16/10): mốc là cổng luyện tập ở khoảng giữa bài; cả lớp qua mốc thì tự mở trò chơi tập thể. */
export function questGateIndex(pkg) {
  const activities = pkg.activities || [];
  const total = lessonMinutes(pkg);
  let end = 0, half = -1;
  for (let index = 0; index < activities.length; index++) {
    if (activities[index].budgetRole === 'reserve') continue;
    end += Number(activities[index].minutes) || 0;
    if (half < 0 && end * 2 >= total) half = index;
  }
  const playable = index => ['practice', 'formation', 'guided'].includes(activities[index]?.phase) &&
    (pkg.tasks || []).some(task => activities[index].taskIds?.includes(task.id) && task.type === 'closed');
  for (let index = half; index >= 0; index--) if (playable(index)) return index;
  return activities.findIndex((_, index) => playable(index));
}

export function initClassQuest(state, eventType) {
  const gateIndex = questGateIndex(state.package);
  if (gateIndex < 0) return;
  state.classQuest = { gateIndex, activityId: state.package.activities[gateIndex].id, eventType, status: 'pending' };
}

export function questProgress(state) {
  const quest = state.classQuest;
  if (!quest) return null;
  const learners = Object.keys(state.roster || {}).filter(id => state.roster[id]?.present !== false);
  const passed = learners.filter(id => learnerGateIndex(state, id) > quest.gateIndex || state.selfFinished?.[id]).length;
  return { ...quest, gate: quest.gateIndex + 1, passed, total: learners.length };
}
