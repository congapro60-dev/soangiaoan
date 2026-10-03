import * as campaign from './rules/campaign.js';
import * as duel from './rules/duel.js';
import * as zones from './rules/zones.js';
import * as survival from './rules/survival.js';
import * as escort from './rules/escort.js';
import * as treasure from './rules/treasure.js';
import * as relay from './rules/relay.js';
import * as lockdown from './rules/lockdown.js';
import * as merchant from './rules/merchant.js';
import {createRoster, createDeviceRoster, rotateController, addLate, addLateDevice, leave, closeCommunity} from './roster.js';
import {canonical, issueChallenge, verifyChallenge, curriculumPlan} from './challenge.js';

export const RULES = Object.freeze({campaign, duel, zones, survival, escort, treasure, relay, lockdown, merchant});
export const LIMITS = Object.freeze({duration: 1800000, challengeMs: 60000});

export function createGame({rule, learners, devices = null, participation = 'individual', seed = 1, gameNow = 0, legacyTeams = {}, curriculum = {}, factions = {}}) {
  if (!Object.hasOwn(RULES, rule)) throw new Error('INVALID_RULE');
  if (!Number.isSafeInteger(seed) || !Number.isFinite(gameNow) || gameNow < 0) throw new Error('INVALID_CLOCK_OR_SEED');
  const roster = devices ? createDeviceRoster(devices, {participation, seed, factions}) : createRoster(learners, {participation, seed, factions});
  if (!roster.units.length) throw new Error('EMPTY_ROSTER');
  return {rule, seed, curriculum: curriculumPlan(curriculum, seed), participation, units: roster.units, startedAt: gameNow, gameNow, round: 1, deadline: gameNow + LIMITS.duration,
    paused: false, communityOpened: false, finished: false, serial: 0, challenges: {}, activeChallenges: {}, requests: {},
    ruleState: RULES[rule].init(roster.units, gameNow, seed, legacyTeams)};
}

// Wall time conversion is separate from the reducer. Overlapping pauses are unioned.
export function gameClock(wallNow, pauses = []) {
  if (!Number.isFinite(wallNow) || wallNow < 0) throw new Error('INVALID_CLOCK');
  const intervals = pauses.map(({start, end}) => {
    if (!Number.isFinite(start) || start < 0 || (end != null && (!Number.isFinite(end) || end < start))) throw new Error('INVALID_PAUSE');
    return [Math.min(start, wallNow), Math.min(end ?? wallNow, wallNow)];
  }).sort((a, b) => a[0] - b[0]);
  let total = 0, until = 0;
  for (const [start, end] of intervals) { total += Math.max(0, end - Math.max(start, until)); until = Math.max(until, end); }
  return wallNow - total;
}

export function rank(state) { return RULES[state.rule].rank(state); }

export function reduce(state, event, {gameNow, pause = false} = {}) {
  if (!Number.isFinite(gameNow) || gameNow < state.gameNow) throw new Error('INVALID_CLOCK');
  if (typeof pause !== 'boolean') throw new Error('INVALID_PAUSE');
  if (event.type === 'rank') return {state, result: rank(state)};
  const rule = RULES[state.rule];
  if (Object.hasOwn(event, 'correct') || Object.hasOwn(event, 'expected') || (event.action && (Object.hasOwn(event.action, 'correct') || Object.hasOwn(event.action, 'expected')))) throw new Error('UNTRUSTED_SOLUTION');
  const fingerprint = canonical(event);
  const key = event.requestId ? `request:${event.requestId}` : null;
  if (event.type !== 'tick') {
    if (typeof event.requestId !== 'string' || !event.requestId || event.requestId.length > 128) throw new Error('REQUEST_ID_REQUIRED');
    if (Object.hasOwn(state.requests, key)) {
      const prior = state.requests[key];
      if (prior.fingerprint !== fingerprint) throw new Error('REQUEST_ID_CONFLICT');
      return {state, result: structuredClone(prior.result)};
    }
  }
  const next = structuredClone(state);
  const administrative = ['join', 'leave', 'community-open', 'community-close'].includes(event.type);
  // Callers supply logical gameNow, not wall time; paused calls cannot advance it.
  if (pause && gameNow !== state.gameNow) throw new Error('PAUSED_CLOCK_ADVANCED');
  next.paused = pause;
  if (!pause && !next.finished) {
    next.gameNow = Math.min(gameNow, next.deadline);
    rule.tick(next, next.gameNow);
    if (gameNow >= next.deadline) next.finished = true;
  }
  if (event.type === 'tick') return {state: next, result: {ok: true, finished: next.finished}};
  if (pause && !administrative) throw new Error('GAME_PAUSED');
  if (next.finished && !['leave','community-close'].includes(event.type)) throw new Error('GAME_FINISHED');
  if (event.round !== next.round) throw new Error('STALE_ROUND');
  // Administrative events are trusted engine inputs; authorization remains a route concern.
  if (['join', 'leave', 'community-open', 'community-close'].includes(event.type)) {
    const roster = {participation: next.participation, units: next.units};
    if (event.type === 'join') {
      next.units = event.learners ? addLateDevice(roster, event.learners, {communityOpened: next.communityOpened}).units : addLate(roster, event.learner, {communityOpened: next.communityOpened}).units;
      const unit = next.units.at(-1);
      next.ruleState.players[unit.id] = rule.init([unit], next.gameNow, next.seed).players[unit.id];
    } else if (event.type === 'leave') next.units = leave(roster, event.learnerId).units;
    else if (event.type === 'community-open') next.communityOpened = true;
    else { next.communityOpened = false; next.units = closeCommunity(roster).units; }
    const result = {ok: true};
    next.requests[key] = {fingerprint, result};
    return {state: next, result};
  }
  const unit = next.units.find(u => u.id === event.unitId);
  if (!unit || !['active', 'temporary-defeat'].includes(unit.outcome)) throw new Error('UNIT_INACTIVE');
  if (!event.action || typeof event.action.type !== 'string') throw new Error('INVALID_ACTION');
  const now = next.gameNow;
  rule.validate(next, unit.id, event.action, now);
  const context = rule.context?.(next, unit.id) ?? '';
  let result;
  if (event.type === 'issue') {
    if (!rule.mathActions.includes(event.action.type)) throw new Error('NO_CHALLENGE_REQUIRED');
    const active = next.challenges[next.activeChallenges[unit.id]];
    if (active && !active.used && active.deadline > now && active.context === context) throw new Error('CHALLENGE_PENDING');
    const sharedDuel = next.rule === 'duel';
    const challenge = issueChallenge({seed: next.seed, serial: ++next.serial, unitId: unit.id, action: event.action, gameNow: now, context, round: next.round,
      curriculum: next.curriculum, questionKey: sharedDuel ? `duel:${next.ruleState.round}` : undefined,
      legacyQuestion: next.rule === 'campaign' ? campaign.question(next, unit.id, event.action) : undefined});
    if (sharedDuel) {
      // Same question/topic/level for every simultaneous duel participant.
      challenge.deadline = Math.min(challenge.deadline, next.ruleState.deadline);
    }
    next.challenges[challenge.id] = challenge;
    next.activeChallenges[unit.id] = challenge.id;
    result = {ok: true, challengeId: challenge.id};
  } else if (event.type === 'progress') {
    let correct = true;
    if (rule.mathActions.includes(event.action.type)) {
      if (event.challengeId !== next.activeChallenges[unit.id]) throw new Error('CHALLENGE_MISMATCH');
      const challenge = next.challenges[event.challengeId];
      correct = verifyChallenge(challenge, {unitId: unit.id, action: event.action, answer: event.answer, gameNow: now, round: next.round, context});
      challenge.used = true;
    }
    rule.progress(next, unit.id, event.action, now, correct);
    if (correct && next.rule !== 'relay' && next.participation === 'pairs' && rule.mathActions.includes(event.action.type)) rotateController(unit);
    if (next.units.every(u => ['completed', 'abandoned', 'spectator'].includes(u.outcome))) next.finished = true;
    result = {ok: true, correct};
  } else throw new Error('INVALID_EVENT');
  next.requests[key] = {fingerprint, result: structuredClone(result)};
  return {state: next, result};
}
