export const ARENA_DURATION = 75;
export const ARENA_ACTIONS = Object.freeze(['answer', 'guard', 'assist', 'stun']);
function rng(seed) { let x = seed >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0); }
export function createArena(participants, seed = 0) {
  const shuffled = [...participants];
  const rand = rng(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rand() % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const bracket = []; for (let i = 0; i < shuffled.length; i += 2) bracket.push({left: shuffled[i], right: shuffled[i + 1] ?? null, bye: !shuffled[i + 1]});
  return {seed, startedAt: null, duration: ARENA_DURATION, bracket, players: Object.fromEntries(shuffled.map(id => [id, {id, status: 'active', stunnedUntil: 0, reward: null}]))};
}
export function arenaAction(state, {player, action, now, correct = false, target, requestId} = {}) {
  if (!ARENA_ACTIONS.includes(action)) throw new Error('INVALID_ARENA_ACTION');
  const fingerprint = JSON.stringify([player, action, correct, target ?? null]);
  if (requestId != null && Object.hasOwn(state.requests || {}, requestId)) {
    return state.requests[requestId] === fingerprint ? {ok: true, state, replay: true} : {ok: false, code: 'REQUEST_ID_CONFLICT'};
  }
  if (!Number.isFinite(now)) return {ok: false, code: 'INVALID_TIME'};
  if (!state.players[player] || state.players[player].status !== 'active') return {ok: false, code: 'NOT_ACTIVE'};
  if (state.startedAt == null) state = {...state, startedAt: now};
  if (now - state.startedAt >= state.duration * 1000) return {...state, result: 'timeout'};
  const actor = state.players[player];
  if (now < actor.stunnedUntil) return {ok: false, code: 'STUNNED'};
  if (now < state.startedAt || now < (actor.lastActionAt ?? -Infinity)) return {ok: false, code: 'INVALID_TIME'};
  if (['stun', 'assist'].includes(action) && (target === player || !Object.hasOwn(state.players, target) || state.players[target].status !== 'active')) return {ok: false, code: 'INVALID_TARGET'};
  if (action === 'stun' && now < (actor.stunReadyAt ?? 0)) return {ok: false, code: 'COOLDOWN'};
  const next = {...state, players: {...state.players, [player]: {...actor, lastActionAt: now}}};
  if (action === 'guard') next.players[player].shieldUntil = Math.min(now + 3000, state.startedAt + state.duration * 1000);
  if (action === 'stun') {
    const victim = state.players[target];
    next.players[player].stunReadyAt = now + 5000;
    next.players[target] = {...victim, stunnedUntil: victim.shieldUntil > now ? victim.stunnedUntil : Math.min(Math.max(victim.stunnedUntil, now + 3000), state.startedAt + state.duration * 1000)};
  }
  if (action === 'answer' && correct) next.players[player].score = (next.players[player].score || 0) + 1;
  if (action === 'assist') next.players[target] = {...state.players[target], assists: (state.players[target].assists || 0) + 1};
  if (requestId != null) next.requests = {...state.requests, [requestId]: fingerprint};
  return {ok: true, state: next};
}
export function awardArena(state, player, reward) { const p = state.players[player]; if (!p) throw new Error('UNKNOWN_PLAYER'); if (p.rewarded || p.reward != null) return {state, replay: true, reward: p.reward}; const next = {...state, players: {...state.players, [player]: {...p, reward, rewarded: true}}}; return {state: next, replay: false, reward}; }
export function returnMarker(state, player, questionId) { if (!state.players[player]) throw new Error('UNKNOWN_PLAYER'); return {player, questionId, arenaSeed: state.seed, temporaryDefeat: false}; }
