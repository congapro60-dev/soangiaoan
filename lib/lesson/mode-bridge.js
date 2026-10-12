import { RULES, LIMITS } from '../mode-engine/index.js';
import { randomUUID, createHash } from 'node:crypto';
import { canonical } from '../mode-engine/challenge.js';
import { CHECKER_REGISTRY } from './schema.js';
import { doorCode } from '../race.js';
import { rotateController } from '../mode-engine/roster.js';

export const LESSON_MODE_RULES = Object.freeze(Object.keys(RULES));
const fail = (state, code) => ({ ok: false, state, code });
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const paused = state => state?.status === 'paused' || state?.clock?.arenaPausedAt != null || state?.clock?.classEventPausedAt != null || state?.timeline?.locked;

export function initLessonMode(state, ruleId, activeMs = 0) {
  if (!state || typeof ruleId !== 'string' || !Object.hasOwn(RULES, ruleId)) return fail(state, 'INVALID_RULE');
  if (!Number.isSafeInteger(activeMs) || activeMs < 0) return fail(state, 'INVALID_MODE_CLOCK');
  const participation = ['group', 'pairs'].includes((state.modeParticipation || state.gamePlan?.participation)) ? (state.modeParticipation || state.gamePlan.participation) : 'individual';
  const units = [];
  for (const [learnerId, learner] of Object.entries(state.roster || {})) {
    if (learner.present === false) continue;
    const teamId = participation !== 'individual' && id(learner.teamId) ? learner.teamId : null;
    let unit = teamId && units.find(unit => unit.teamId === teamId && (participation !== 'pairs' || unit.members.length < 2));
    if (!unit) { unit = { id: 'mode-' + (units.length + 1), members: [], teamId, controller: 0, faction: units.length % 4, outcome: 'active', late: false }; units.push(unit); }
    unit.members.push({ id: learnerId, present: true });
  }
  if (!units.length) return fail(state, 'EMPTY_ROSTER');
  const seed = Number.isSafeInteger(state.seed) ? state.seed : 1;
  const game = { instanceId: randomUUID(), rule: ruleId, seed, units, participation, packageHash: state.package?.contentHash, startedAt: activeMs, gameNow: activeMs, deadline: activeMs + LIMITS.duration, paused: false, finished: false, round: state.round, challenges: {}, activeChallenges: {}, receipts: {}, rewarded: {}, ruleState: RULES[ruleId].init(units, activeMs, seed) };
  // Lesson tasks supply every assessment; legacy random math encounters become cosmetic cards.
  if (ruleId === 'campaign') for (const player of Object.values(game.ruleState.players)) player.race.eventOrder = player.race.eventOrder.map(event => event === 'math' ? 'card' : event);
  return { ok: true, state: { ...state, lessonMode: game } };
}

export function syncLessonModeLearner(state, learnerId) {
  const game = state.lessonMode, learner = state.roster?.[learnerId];
  if (!game || !Object.hasOwn(RULES, game.rule) || !learner) return;
  let unit = game.units.find(unit => unit.members.some(member => member.id === learnerId));
  if (!unit) {
    const teamId = game.participation !== 'individual' && id(learner.teamId) ? learner.teamId : null;
    unit = teamId && game.units.find(unit => unit.teamId === teamId && (game.participation !== 'pairs' || unit.members.length < 2));
    if (unit) unit.members.push({ id: learnerId, present: learner.present === true });
    else {
      unit = { id: 'mode-' + (game.units.length + 1), members: [{ id: learnerId, present: learner.present === true }], teamId, controller: 0, faction: game.units.length % 4, outcome: game.rule === 'duel' || game.finished ? 'spectator' : 'active', late: true };
      game.units.push(unit);
      game.ruleState.players[unit.id] = RULES[game.rule].init([unit], game.gameNow, game.seed).players[unit.id];
      if (game.rule === 'campaign') game.ruleState.players[unit.id].race.eventOrder = game.ruleState.players[unit.id].race.eventOrder.map(event => event === 'math' ? 'card' : event);
    }
  }
  unit.members.find(member => member.id === learnerId).present = learner.present === true;
  if (unit.outcome === 'completed') return;
  if (unit.members.every(member => !member.present)) unit.outcome = 'abandoned';
  else {
    if (!unit.members[unit.controller].present) { rotateController(unit); if (game.selectedActions) delete game.selectedActions[unit.id]; }
    if (unit.outcome === 'abandoned') unit.outcome = game.rule === 'duel' || game.finished ? 'spectator' : 'active';
  }
}

export function tickLessonMode(state, activeMs) {
  const game = state?.lessonMode;
  if (!game || !Object.hasOwn(RULES, game.rule)) return fail(state, 'MODE_NOT_STARTED');
  if (!Number.isSafeInteger(activeMs) || activeMs < game.gameNow) return fail(state, 'INVALID_MODE_CLOCK');
  if (paused(state) && activeMs !== game.gameNow) return fail(state, 'MODE_PAUSED_CLOCK_ADVANCED');
  const next = structuredClone(game); next.paused = paused(state);
  if (!next.paused && !next.finished && state.status === 'active') {
    next.gameNow = Math.min(activeMs, next.deadline);
    RULES[next.rule].tick(next, next.gameNow);
    if (activeMs >= next.deadline) next.finished = true;
  }
  return { ok: true, state: { ...state, lessonMode: next } };
}

function defaultAction(game, unit) {
  const p = game.ruleState.players[unit.id];
  switch (game.rule) {
    case 'campaign': return { type: 'station' };
    case 'duel': return { type: 'answer' };
    case 'zones': { const zone = game.ruleState.zones.findIndex(zone => zone.owner !== unit.faction); return zone < 0 ? { type: 'objective' } : { type: 'capture', zone }; }
    case 'survival': return { type: p.energy <= 60 ? 'recover' : 'objective' };
    case 'escort': return { type: p.integrity < 2 || p.fuel >= 6 ? 'repair' : 'fuel' };
    case 'treasure': return { type: p.branch === null ? 'clue' : 'dig' };
    case 'relay': return { type: 'solve', learnerId: unit.members[unit.controller].id };
    case 'lockdown': return { type: 'power' };
    case 'merchant': return { type: 'earn' };
  }
}

function progress(game, unit, action, correct = true) {
  const rule = RULES[game.rule];
  rule.validate(game, unit.id, action, game.gameNow);
  rule.progress(game, unit.id, action, game.gameNow, correct);
}

function engineAction(game, unit, action) {
  if (game.rule === 'campaign' && action.type === 'gate') return { ...action, code: doorCode(game.ruleState.players[unit.id]) };
  if (game.rule === 'relay') return { ...action, learnerId: unit.members[unit.controller].id };
  if (game.rule === 'lockdown' && action.type === 'unlock') {
    // Existing locks are a mechanical effect of the assessed lesson task, not another mathematics question.
    const unlocks = [{ roomType: 'code', code: '314' }, { roomType: 'pipes', rotations: [1, 2, 1] }, { roomType: 'graph', path: ['A', 'B', 'D'] }, { roomType: 'logic', order: ['water', 'seed', 'tree'] }];
    return { ...action, ...unlocks[game.ruleState.players[unit.id].room] };
  }
  return action;
}

function choices(game, unit) {
  const candidates = [], add = (label, action) => candidates.push({ label, action, kind: RULES[game.rule].mathActions.includes(action.type) ? 'assessment' : 'mechanical' });
  switch (game.rule) {
    case 'campaign': add('Nhận ấn tín từ bài tiếp theo', { type: 'station' }); add('Tung xúc xắc', { type: 'roll' }); add('Mở cổng bằng năm ấn tín', { type: 'gate' }); break;
    case 'duel': add('Trả lời lượt đấu bằng bài tiếp theo', { type: 'answer' }); break;
    case 'zones':
      for (let zone = 0; zone < 4; zone++) { add(`Chiếm vùng ${zone + 1}`, { type: 'capture', zone }); add(`Bảo vệ vùng ${zone + 1}`, { type: 'defend', zone }); }
      add('Làm nhiệm vụ tiếp tế', { type: 'objective' }); break;
    case 'survival':
      add('Hồi phục từ bài tiếp theo', { type: 'recover' }); add('Hoàn thành mục tiêu tiếp theo', { type: 'objective' });
      for (let position = 0; position <= game.ruleState.radius; position++) add(`Đến vị trí ${position}`, { type: 'move', position }); break;
    case 'escort': add('Tiếp nhiên liệu', { type: 'fuel' }); add('Sửa đoàn xe', { type: 'repair' }); add('Cho đoàn xe đi một chặng', { type: 'advance' }); break;
    case 'treasure':
      add('Tìm manh mối tiếp theo', { type: 'clue' }); add('Khai quật nhánh đã chọn', { type: 'dig' });
      for (const [branch, label] of [['sun', 'Mặt trời'], ['moon', 'Mặt trăng'], ['star', 'Ngôi sao']]) add(`Chọn nhánh ${label}`, { type: 'choose', branch });
      add('Ghép ba mảnh kho báu', { type: 'assemble' }); break;
    case 'relay': add('Nhận gậy bằng bài tiếp theo', { type: 'solve' }); add('Chuyển gậy tiếp sức', { type: 'handoff' }); break;
    case 'lockdown': add('Nạp năng lượng bằng bài tiếp theo', { type: 'power' }); add('Mở phòng đã nạp năng lượng', { type: 'unlock' }); break;
    case 'merchant':
      add('Kiếm tiền từ bài tiếp theo', { type: 'earn' });
      for (const [item, label] of [['ore', 'quặng'], ['wood', 'gỗ']]) { add(`Mua một ${label}`, { type: 'buy', item, quantity: 1 }); add(`Bán một ${label}`, { type: 'sell', item, quantity: 1 }); }
      add('Giao hợp đồng: hai quặng, một gỗ', { type: 'contract' }); break;
  }
  if (game.finished || !['active', 'temporary-defeat'].includes(unit.outcome)) return [];
  return candidates.filter(choice => {
    try { RULES[game.rule].validate(game, unit.id, engineAction(game, unit, choice.action), game.gameNow); return true; } catch { return false; }
  });
}

function actionValid(game, unit, action) {
  if (!object(action) || typeof action.type !== 'string') return false;
  const fields = { capture: ['zone'], defend: ['zone'], move: ['position'], choose: ['branch'], buy: ['item', 'quantity'], sell: ['item', 'quantity'] };
  if (Object.keys(action).some(key => !['type', ...(fields[action.type] || [])].includes(key))) return false;
  // The registered rule enforces all resource, phase, lane and controller boundaries.
  if (!choices(game, unit).some(choice => choice.action.type === action.type)) return false;
  try { RULES[game.rule].validate(game, unit.id, engineAction(game, unit, action), game.gameNow); return true; } catch { return false; }
}

export function applyLessonModeAction(state, input, actor, activeMs) {
  if (!object(input) || Object.keys(input).some(key => !['requestId', 'rule', 'round', 'startedAt', 'instanceId', 'sequence', 'action'].includes(key)) || !id(input.requestId) || !Number.isSafeInteger(input.sequence) || input.sequence < 1) return fail(state, 'INVALID_MODE_INPUT');
  if (paused(state)) return fail(state, 'MODE_PAUSED');
  if (actor?.role !== 'learner' || !id(actor.id) || state?.status !== 'active' || state.roster?.[actor.id]?.present !== true) return fail(state, 'MODE_LEARNER_UNAVAILABLE');
  const original = state.lessonMode;
  if (!original) return fail(state, 'MODE_NOT_STARTED');
  if (!Number.isSafeInteger(activeMs) || activeMs < original.gameNow) return fail(state, 'INVALID_MODE_CLOCK');
  if (original.packageHash !== state.package?.contentHash || original.round !== state.round || input.rule !== original.rule || input.round !== original.round || input.startedAt !== original.startedAt || input.instanceId !== original.instanceId) return fail(state, 'MODE_PACKAGE_MISMATCH');
  let fingerprint;
  try { fingerprint = canonical(input); } catch { return fail(state, 'INVALID_MODE_INPUT'); }
  if (fingerprint.length > 4000) return fail(state, 'INVALID_MODE_INPUT');
  fingerprint = createHash('sha256').update(fingerprint).digest('hex');
  const ownUnit = original.units.find(unit => unit.members.some(member => member.id === actor.id));
  if (!ownUnit) return fail(state, 'MODE_UNIT_UNAVAILABLE');
  const previous = original.actionReceipts?.[ownUnit.id];
  if (input.sequence === previous?.sequence) return previous.actorId === actor.id && previous.fingerprint === fingerprint ? { ok: true, state, result: { ...previous.result, replay: true } } : fail(state, 'MODE_REQUEST_CONFLICT');
  if (input.sequence !== (previous?.sequence || 0) + 1) return fail(state, 'STALE_MODE_ACTION');
  const ticked = tickLessonMode(state, activeMs);
  if (!ticked.ok) return ticked;
  const game = ticked.state.lessonMode, unit = game.units.find(unit => unit.members.some(member => member.id === actor.id));
  if (!unit || !['active', 'temporary-defeat'].includes(unit.outcome)) return fail(state, 'MODE_UNIT_UNAVAILABLE');
  if (game.finished) return fail(state, 'MODE_FINISHED');
  if (unit.members[unit.controller]?.id !== actor.id || !unit.members[unit.controller]?.present) return fail(state, 'WRONG_CONTROLLER');
  if (!actionValid(game, unit, input.action)) return fail(state, 'INVALID_MODE_ACTION');
  const assessment = RULES[game.rule].mathActions.includes(input.action.type);
  if (assessment) { game.selectedActions ??= {}; game.selectedActions[unit.id] = structuredClone(input.action); }
  else {
    progress(game, unit, engineAction(game, unit, input.action));
    if (game.selectedActions) delete game.selectedActions[unit.id];
  }
  if (game.units.every(unit => ['completed', 'abandoned', 'spectator'].includes(unit.outcome))) game.finished = true;
  const result = { ok: true, selected: assessment, replay: false };
  // One durable receipt per unit; older sequences are rejected, never evicted and replayed for resources.
  game.actionReceipts ??= {}; game.actionReceipts[unit.id] = { sequence: input.sequence, actorId: actor.id, fingerprint, result };
  return { ok: true, state: ticked.state, result };
}

export function applyLessonMode(state, input, activeMs) {
  if (!object(input) || Object.keys(input).some(key => !['learnerId', 'taskId', 'submissionId', 'answer', 'action'].includes(key)) || !['learnerId', 'taskId', 'submissionId'].every(key => id(input[key]))) return fail(state, 'INVALID_MODE_INPUT');
  if (paused(state)) return fail(state, 'MODE_PAUSED');
  if (state?.status !== 'active' || state.roster?.[input.learnerId]?.present !== true) return fail(state, 'MODE_LEARNER_UNAVAILABLE');
  if (!state.lessonMode) return fail(state, 'MODE_NOT_STARTED');
  if (!Number.isSafeInteger(activeMs) || activeMs < state.lessonMode.gameNow) return fail(state, 'INVALID_MODE_CLOCK');
  if (state.lessonMode.packageHash !== state.package?.contentHash || state.lessonMode.round !== state.round) return fail(state, 'MODE_PACKAGE_MISMATCH');
  const activity = state.package?.activities?.[state.timeline?.activityIndex];
  const task = state.package?.tasks?.find(task => task.id === input.taskId);
  if (!activity || activity.id !== state.timeline?.currentActivityId || !activity.taskIds?.includes(input.taskId) || !task || task.activityId !== activity.id || task.participation !== 'individual' || task.type === 'reflection' || (task.branch && task.branch !== 'shared' && task.branch !== (state.branches?.[activity.id]?.[input.learnerId] || 'core'))) return fail(state, 'TASK_NOT_AVAILABLE');
  const sub = state.submissions?.[input.submissionId];
  if (!sub || sub.submissionId !== input.submissionId || sub.learnerId !== input.learnerId || sub.taskId !== input.taskId || sub.activityId !== activity.id) return fail(state, 'MODE_SUBMISSION_MISMATCH');
  if (sub.assessmentStatus !== 'assessed') return fail(state, 'MODE_SUBMISSION_UNASSESSED');
  let correct = sub.ok === true, fingerprint;
  try {
    if (Object.hasOwn(input, 'answer') && canonical(input.answer) !== canonical(sub.answer)) return fail(state, 'MODE_ANSWER_MISMATCH');
    if (task.type === 'closed') {
      const checker = CHECKER_REGISTRY[task.evaluation?.checkerId];
      if (!checker || Boolean(checker(sub.answer, task)?.ok) !== correct) return fail(state, 'MODE_VERDICT_MISMATCH');
    }
    fingerprint = createHash('sha256').update(canonical({ ...input, answer: sub.answer })).digest('hex');
  } catch { return fail(state, 'INVALID_MODE_INPUT'); }
  const previous = state.lessonMode?.receipts?.[input.submissionId];
  if (previous) return previous.fingerprint === fingerprint ? { ok: true, state, result: { ...previous.result, replay: true } } : fail(state, 'MODE_RECEIPT_CONFLICT');
  const rewardKey = canonical([state.round, input.learnerId, activity.id, input.taskId]);
  if (state.lessonMode?.rewarded?.[rewardKey]) return { ok: true, state, result: { correct, replay: true } };
  const ticked = tickLessonMode(state, activeMs);
  if (!ticked.ok) return ticked;
  const game = ticked.state.lessonMode, unit = game.units.find(unit => unit.members.some(member => member.id === input.learnerId));
  if (!unit || !['active', 'temporary-defeat'].includes(unit.outcome)) return fail(state, 'MODE_UNIT_UNAVAILABLE');
  if (game.finished) return fail(state, 'MODE_FINISHED');
  if ((game.rule === 'relay' || game.participation === 'pairs') && unit.members[unit.controller]?.id !== input.learnerId) return fail(state, 'WRONG_CONTROLLER');
  const action = engineAction(game, unit, input.action || game.selectedActions?.[unit.id] || defaultAction(game, unit));
  if (!object(action) || Object.keys(action).some(key => !['type', 'zone', 'learnerId'].includes(key)) || !RULES[game.rule].mathActions.includes(action.type) || (game.rule === 'relay' && action.learnerId !== input.learnerId)) return fail(state, 'INVALID_MODE_ACTION');
  try {
    if (game.rule === 'campaign') { game.challenges.lesson = { digit: game.ruleState.players[unit.id].race.outcomes.length + 1 }; game.activeChallenges[unit.id] = 'lesson'; }
    progress(game, unit, action, correct);
    if (correct && game.rule !== 'relay' && game.participation === 'pairs') rotateController(unit);
    if (game.selectedActions) delete game.selectedActions[unit.id];
    if (game.units.every(unit => ['completed', 'abandoned', 'spectator'].includes(unit.outcome))) game.finished = true;
  } catch (error) { return fail(state, ['INVALID_ACTION', 'RACE_NOT_READY', 'WRONG_CONTROLLER', 'HANDOFF_REQUIRED', 'CONVOY_BLOCKED', 'TEMPORARY_DEFEAT'].includes(error.message) ? error.message : 'MODE_ACTION_REJECTED'); }
  game.challenges = {}; game.activeChallenges = {};
  const result = { correct, replay: false };
  game.receipts[input.submissionId] = { fingerprint, result };
  if (correct) game.rewarded[rewardKey] = true;
  return { ok: true, state: ticked.state, result };
}

const publicFields = {
  campaign: ['score', 'completed'], duel: ['matchPoints', 'correct', 'submitted'], zones: ['correct'], survival: ['energy', 'rounds', 'objectives', 'position'],
  escort: ['distance', 'fuel', 'integrity'], treasure: ['clues', 'branch', 'fragments', 'sets', 'correct', 'points'], relay: ['legs', 'ready', 'points'], lockdown: ['room', 'powered', 'points'], merchant: ['coins', 'ore', 'wood', 'contracts', 'correct'],
};
export function serializeLessonMode(state, learnerId = null) {
  const game = state?.lessonMode;
  if (!game || !Object.hasOwn(RULES, game.rule)) return null;
  const unit = learnerId === null ? null : game.units.find(unit => unit.members.some(member => member.id === learnerId));
  if (learnerId !== null && (!unit || state.roster?.[learnerId]?.present !== true)) return null;
  const aggregate = { total: game.units.length, completed: game.units.filter(unit => unit.outcome === 'completed').length, active: game.units.filter(unit => unit.outcome === 'active').length };
  const own = unit ? Object.fromEntries(publicFields[game.rule].filter(key => Object.hasOwn(game.ruleState.players[unit.id], key)).map(key => [key, structuredClone(game.ruleState.players[unit.id][key])])) : undefined;
  if (own && game.rule === 'campaign') { own.position = game.ruleState.players[unit.id].race.position; own.phase = game.ruleState.players[unit.id].race.phase; }
  if (own) { own.isController = unit.members[unit.controller]?.id === learnerId && unit.members[unit.controller]?.present === true; own.teamSize = unit.members.length; own.turnNumber = unit.controller + 1; own.actions = paused(state) || !own.isController ? [] : choices(game, unit); own.selectedAction = game.selectedActions?.[unit.id] ? structuredClone(game.selectedActions[unit.id]) : null; own.actionSequence = game.actionReceipts?.[unit.id]?.sequence || 0; }
  return { rule: game.rule, participation: game.participation || state.modeParticipation, round: game.round, startedAt: game.startedAt, instanceId: game.instanceId, gameNow: game.gameNow, paused: paused(state) || game.paused, finished: game.finished, aggregate, ...(own ? { own } : {}) };
}
