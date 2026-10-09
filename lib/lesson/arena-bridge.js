import {
  createArenaEvent,
  arenaEntries,
  arenaAnswer,
  arenaCombat,
  publicArena,
  settleArena,
  arenaPhase
} from '../arena-community.js';
import { CHECKER_REGISTRY } from './schema.js';

const HISTORICAL = 'historical';
const LONG_THANH = 'Long Thành';

export function lessonArenaDescriptor({package: pkg} = {}) {
  const maps = [pkg?.gamePlan?.map, pkg?.gamePlan?.theme, pkg?.map];
  const historicalPlan = pkg?.status === 'approved' && maps.some(map => map === HISTORICAL || map === LONG_THANH);
  if (!historicalPlan) return {authored: false, reason: 'ARENA_NOT_AUTHORED'};
  return {authored: true, theme: HISTORICAL, map: LONG_THANH, source: 'historical-plan'};
}

function active(state, now) {
  return state?.status === 'active' && !state.timeline?.locked && state.status !== 'paused' &&
    (state.clock?.arenaPausedAt != null || state.clock?.activityDeadline == null || now < state.clock.activityDeadline);
}

function safeRoster(state) {
  return Object.values(state.roster || {}).filter(s => s.present !== false).map((s, i) => ({
    id: s.id,
    name: s.name || s.id,
    mascot: Number.isInteger(s.mascot) ? s.mascot : i % 8,
    status: 'active'
  }));
}

function lessonArenaTasks(state) {
  const activity = state.package?.activities?.[state.timeline?.activityIndex];
  if (['recheck', 'exit'].includes(activity?.phase)) return [];
  const ids = new Set(activity?.taskIds || []);
  return (state.package?.tasks || []).filter(task => ids.has(task.id) && task.type === 'closed' && CHECKER_REGISTRY[task.evaluation?.checkerId] && !['support', 'extension'].includes(task.branch)).slice(0, 8);
}

function lessonArenaQuestion(state, entry) {
  const taskId = state.arena?.taskIds?.[entry.step];
  const task = state.package?.tasks?.find(task => task.id === taskId);
  return task ? {question: task.prompt, task, answer: task.evaluation.answerKey, steps: [], topicName: 'Bài học', categoryName: 'Lôi Đài', points: 1} : null;
}

export function openLessonArena(state, {activityId, seed, eventId = 'lesson-arena', actor} = {}, now) {
  if (!actor || actor.role !== 'teacher' || (actor.id !== state.hostId && actor.authorizedHostId !== state.hostId)) return {ok: false, code: 'UNAUTHORIZED'};
  if (!active(state, now) || activityId !== state.timeline?.currentActivityId) return {ok: false, code: 'ARENA_BOUNDARY'};
  const descriptor = lessonArenaDescriptor({package: {...state.package, gamePlan: state.gamePlan || state.package?.gamePlan}, activity: state.package?.activities?.[state.timeline.activityIndex]});
  if (!descriptor.authored) return {ok: false, code: 'ARENA_NOT_AUTHORED'};
  const tasks = lessonArenaTasks(state);
  if (!tasks.length) return {ok: false, code: 'ARENA_NO_QUESTION'};
  if (state.arena?.event) return {ok: false, code: 'ARENA_ALREADY_OPEN'};
  const event = createArenaEvent({roster: safeRoster(state), wall: now, triggerId: eventId, seed, round: state.round});
  const duration = event.resumeAt - now;
  const used = state.clock.arenaBudgetUsedMs || 0;
  const reserveMinutes = state.package.budget?.reserveMinutes;
  if (!Number.isFinite(reserveMinutes) || used + duration > reserveMinutes * 60000) return {ok: false, code: 'ARENA_BUDGET_EXCEEDED'};
  event.questions = tasks.length;
  return {ok: true, state: {...state, clock: {...state.clock, arenaPausedAt: now, arenaBudgetUsedMs: used + duration}, arena: {event, entries: arenaEntries(event), activityId, descriptor, taskIds: tasks.map(task => task.id), settled: false}}};
}

export function answerLessonArena(state, {answer, step, requestId}, learnerId, now) {
  if (!state.arena?.event || state.arena.activityId !== state.timeline.currentActivityId || !active(state, now)) return {ok: false, code: 'ARENA_UNAVAILABLE'};
  const entry = state.arena.entries.find(e => e.id === learnerId);
  if (!entry) return {ok: false, code: 'UNAUTHORIZED'};
  const result = arenaAnswer(state.arena.event, null, entry, {answer, step, requestId, wall: now}, {
    questionProvider: (_event, _campaign, entry) => lessonArenaQuestion(state, entry),
    checkAnswer: (answer, question) => CHECKER_REGISTRY[question.task.evaluation.checkerId](answer, question.task).ok
  });
  if (!result.ok) return {ok: false, code: `ARENA_${String(result.reason).toUpperCase().replaceAll('-', '_')}`};
  result.entry.log[result.entry.log.length - 1].answer = JSON.parse(JSON.stringify(answer ?? null));
  return {ok: true, correct: result.correct, state: {...state, arena: {...state.arena, entries: state.arena.entries.map(e => e.id === learnerId ? result.entry : e)}}};
}

export function combatLessonArena(state, input, learnerId, now) {
  if (!state.arena?.event || state.arena.activityId !== state.timeline.currentActivityId || !active(state, now)) return {ok: false, code: 'ARENA_UNAVAILABLE'};
  const actor = state.arena.entries.find(e => e.id === learnerId);
  const target = state.arena.entries.find(e => e.id === input.target);
  if (!actor) return {ok: false, code: 'UNAUTHORIZED'};
  const result = arenaCombat(state.arena.event, {...input, actor, target, wall: now});
  if (!result.ok) return {ok: false, code: `ARENA_${String(result.reason).toUpperCase().replaceAll('-', '_')}`};
  const entries = state.arena.entries.map(e => e.id === actor.id ? result.actor : e.id === result.target?.id ? result.target : e);
  return {ok: true, effect: result.effect, state: {...state, arena: {...state.arena, entries}}};
}

export function settleLessonArena(state, now) {
  const a = state.arena;
  if (!a?.event || arenaPhase(a.event, now) !== 'done') return {ok: false, code: 'ARENA_NOT_FINISHED'};
  let next = {...state, rewardLedger: {...state.rewardLedger}, gameWallets: {...state.gameWallets, learners: {...state.gameWallets.learners}}};
  if (!a.settled && state.clock.arenaPausedAt != null) {
    const duration = Math.max(0, a.event.resumeAt - state.clock.arenaPausedAt);
    next.clock = {...state.clock, arenaPausedAt: null, activityDeadline: state.clock.activityDeadline == null ? null : state.clock.activityDeadline + duration, totalPausedMs: (state.clock.totalPausedMs || 0) + duration, activityPausedMs: (state.clock.activityPausedMs || 0) + duration};
    next.arena = {...a, settled: true};
  }
  for (const player of a.event.roster) {
    const key = `${state.id}:${state.round}:${a.activityId}:arena:${player.id}`;
    if (next.rewardLedger[key]) continue;
    const fake = {id: player.id, score: 0, events: []};
    if (settleArena(fake, {paused: 0}, a.event, a.entries, now)) {
      const points = fake.score;
      next.rewardLedger[key] = {amount: points, recipientType: 'arena', recipientId: player.id, active: true};
      next.gameWallets.learners[player.id] = {...(next.gameWallets.learners[player.id] || {earned: 0, bonus: 0}), earned: (next.gameWallets.learners[player.id]?.earned || 0) + points};
    }
  }
  return {ok: true, state: next};
}

export function serializeLessonArena(state, learnerId, now, teacher = false) {
  if (!state?.arena?.event) return null;
  const view = publicArena(state.arena.event, null, state.arena.entries, now, learnerId, teacher, (_event, _campaign, entry) => lessonArenaQuestion(state, entry));
  view.settled = Boolean(state.arena.settled);
  if (view.own?.question) {
    const task = lessonArenaQuestion(state, state.arena.entries.find(entry => entry.id === learnerId))?.task;
    const schema = task?.inputSchema;
    view.own.question.task = {
      id: task.id, type: 'closed', prompt: task.prompt,
      evaluation: {checkerId: task.evaluation.checkerId},
      inputSchema: {
        ...(typeof schema?.type === 'string' ? {type: schema.type} : {}),
        ...Object.fromEntries(['options', 'representations', 'cards'].filter(key => Array.isArray(schema?.[key])).map(key => [key, schema[key].map(item => ({id: item.id, label: item.label}))]))
      }
    };
  }
  if (learnerId !== null || teacher) return view;
  const slots = new Map(state.arena.entries.map(entry => [entry.id, `${entry.match}/${entry.slot}`]));
  const anonymous = id => `Đấu thủ ${slots.get(id) || 'spectator'}`;
  return {
    ...view,
    bracket: view.bracket.map(pair => ({
      ...pair,
      left: pair.left && {...pair.left, name: anonymous(pair.left.id)},
      right: pair.right && {...pair.right, name: anonymous(pair.right.id)}
    })),
    entries: view.entries.map(entry => ({...entry, name: anonymous(entry.id)}))
  };
}
