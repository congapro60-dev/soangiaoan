// Lôi Đài Ngũ Ấn — ancient-theme community arena.
// Server owns the seed, the pairing, every question and every correctness verdict.
// The client may only name an action; `correct` is never read from a request body.
import {createArena, ARENA_DURATION} from './arena.js';
import {contextQuestion} from './context-questions.js';
import {numericAnswer} from './campaign.js';
import {gameNow, registerPause} from './community.js';

export const ARENA_TYPE = 'arena';
export const ARENA_CELL = 22;
export const ARENA_QUESTIONS = 8;
export const ARENA_COUNTDOWN = 10000;
export const ARENA_COOLDOWN = 10000;
export const ARENA_WALL_MS = ARENA_DURATION * 1000;
export const ARENA_HP = 3;
export const ARENA_MAX_RESOURCE = 5;
export const ARENA_MAX_ASSISTS = 3;
export const ARENA_ANSWER_GAP = 2000;
export const ARENA_ATTACK_GAP = 1500;
export const ARENA_ASSIST_GAP = 3000;
export const ARENA_STUN_GAP = 5000;
export const ARENA_STUN_COST = 2;
export const ARENA_GUARD_MS = 3000;
export const ARENA_STUN_MS = 3000;
export const COMBAT_ACTIONS = Object.freeze(['attack', 'guard', 'assist', 'stun']);

const clampLevel = level => Math.max(0, Math.min(1, Number(level) || 0));

// Deterministic arena: same roster + same seed always yields the same bracket and byes.
export function createArenaEvent({roster, wall, triggerId, seed, round = 1}) {
  const active = roster.filter(s => s.status === 'active');
  const ids = active.map(s => s.id);
  const safeSeed = Number.isFinite(seed) ? seed >>> 0 : crypto.getRandomValues(new Uint32Array(1))[0];
  const paired = createArena(ids, safeSeed);
  const bracket = paired.bracket.map((pair, match) => ({match, left: pair.left, right: pair.right ?? null, bye: !!pair.bye}));
  const slots = new Map();
  bracket.forEach(pair => {
    slots.set(pair.left, {match: pair.match, side: 'left', opponent: pair.right, bye: pair.bye});
    if (pair.right) slots.set(pair.right, {match: pair.match, side: 'right', opponent: pair.left, bye: false});
  });
  return {
    id: crypto.randomUUID(), type: ARENA_TYPE, theme: 'historical', round,
    openedAt: wall, startAt: wall + ARENA_COUNTDOWN,
    finishAt: wall + ARENA_COUNTDOWN + ARENA_WALL_MS,
    resumeAt: wall + ARENA_COUNTDOWN + ARENA_WALL_MS + ARENA_COOLDOWN,
    duration: ARENA_DURATION, questions: ARENA_QUESTIONS, seed: safeSeed, triggerId,
    bracket,
    roster: active.map(s => {
      const slot = slots.get(s.id);
      return {id: s.id, name: s.name, mascot: s.race?.mascot ?? s.mascot ?? 0, match: slot.match, side: slot.side, opponent: slot.opponent, bye: slot.bye};
    })
  };
}

// Per-player row persisted in community_players; `return` restores the exact main-game task.
export function arenaEntry(event, player, index, marker = {}) {
  return {
    id: player.id, event: event.id, slot: index, match: player.match, side: player.side,
    opponent: player.opponent, bye: player.bye,
    step: 0, correct: 0, wrong: 0, lastAt: 0,
    resource: 0, hp: ARENA_HP, shieldUntil: 0, stunnedUntil: 0,
    attackReadyAt: 0, stunReadyAt: 0, assistReadyAt: 0,
    assists: 0, assisted: 0, damage: 0, knockdowns: 0, downs: 0,
    log: [], reward: null, awardedAt: null,
    return: {stage: marker.stage ?? 0, questionRevision: marker.questionRevision ?? 0, round: marker.round ?? event.round}
  };
}
export function arenaEntries(event, markers = {}) {
  return event.roster.map((player, index) => arenaEntry(event, player, index, markers[player.id] || {}));
}

export function arenaOpponent(event, playerId) {
  const me = event.roster.find(p => p.id === playerId);
  if (!me || !me.opponent) return null;
  return event.roster.find(p => p.id === me.opponent) || null;
}

// Questions come from the room's own matrix; only the server ever sees `answer`/`steps`.
export function arenaQuestion(event, campaign, entry) {
  if (!campaign?.plan?.length) return null;
  const plan = campaign.plan[entry.step % campaign.plan.length];
  const seed = (event.seed ^ Math.imul(entry.step + 1, 0x9e3779b1) ^ Math.imul(entry.slot + 1, 0x85ebca6b)) >>> 0;
  return contextQuestion({...plan, level: clampLevel(plan.level), format: 'short'}, seed);
}

const stale = reason => ({ok: false, reason});

function openWindow(event, wall) {
  if (wall < event.startAt) return stale('countdown');
  if (wall >= event.finishAt) return stale('closed');
  return null;
}

// Answering is the only way to gain action resource. Correctness is computed here.
export function arenaAnswer(event, campaign, entry, {answer, step, wall, requestId}) {
  const closed = openWindow(event, wall);
  if (closed) return closed;
  if (entry.step >= ARENA_QUESTIONS) return stale('exhausted');
  if (step !== entry.step) return stale('stale-step');
  if (wall - entry.lastAt < ARENA_ANSWER_GAP) return stale('cooldown');
  if (wall < entry.stunnedUntil) return stale('stunned');
  const question = arenaQuestion(event, campaign, entry);
  if (!question) return stale('no-question');
  const correct = numericAnswer(answer, question.answer);
  const next = {
    ...entry,
    step: entry.step + 1,
    correct: entry.correct + Number(correct),
    wrong: entry.wrong + Number(!correct),
    lastAt: wall,
    resource: correct ? Math.min(ARENA_MAX_RESOURCE, entry.resource + 1) : entry.resource,
    log: [...entry.log, {step: entry.step, action: 'answer', answer: String(answer ?? '').slice(0, 40), ok: correct, at: wall, requestId}]
  };
  return {ok: true, correct, entry: next};
}

function spend(entry, cost) { return {...entry, resource: entry.resource - cost}; }

// Attack/guard/assist/stun all cost resource earned from Math and are individually bounded.
export function arenaCombat(event, {actor, target, action, wall, requestId}) {
  if (!COMBAT_ACTIONS.includes(action)) return stale('invalid-action');
  const closed = openWindow(event, wall);
  if (closed) return closed;
  if (wall < actor.stunnedUntil) return stale('stunned');
  const cap = at => Math.min(at, event.finishAt);

  if (action === 'guard') {
    if (actor.resource < 1) return stale('resource');
    if (wall < actor.shieldUntil) return stale('shield-active');
    const next = {...spend(actor, 1), shieldUntil: cap(wall + ARENA_GUARD_MS), log: [...actor.log, {action, effect: 'guard', at: wall, requestId}]};
    return {ok: true, actor: next, target: null, effect: 'guard'};
  }

  if (!target || target.id === actor.id) return stale('invalid-target');

  if (action === 'assist') {
    if (actor.resource < 1) return stale('resource');
    if (target.id === actor.opponent) return stale('invalid-target');
    if (actor.assists >= ARENA_MAX_ASSISTS) return stale('assist-limit');
    if (wall < actor.assistReadyAt) return stale('cooldown');
    const nextActor = {...spend(actor, 1), assists: actor.assists + 1, assistReadyAt: wall + ARENA_ASSIST_GAP, log: [...actor.log, {action, target: target.id, effect: 'assist', at: wall, requestId}]};
    const nextTarget = {...target, resource: Math.min(ARENA_MAX_RESOURCE, target.resource + 1), assisted: target.assisted + 1};
    return {ok: true, actor: nextActor, target: nextTarget, effect: 'assist'};
  }

  if (target.id !== actor.opponent) return stale('invalid-target');
  const shielded = wall < target.shieldUntil;

  if (action === 'stun') {
    if (actor.resource < ARENA_STUN_COST) return stale('resource');
    if (wall < actor.stunReadyAt) return stale('cooldown');
    const effect = shielded ? 'blocked' : 'stun';
    const nextActor = {...spend(actor, ARENA_STUN_COST), stunReadyAt: wall + ARENA_STUN_GAP, log: [...actor.log, {action, target: target.id, effect, at: wall, blocked: shielded, requestId}]};
    const nextTarget = shielded ? {...target, shieldUntil: 0} : {...target, stunnedUntil: cap(Math.max(target.stunnedUntil, wall + ARENA_STUN_MS))};
    return {ok: true, actor: nextActor, target: nextTarget, effect};
  }

  if (actor.resource < 1) return stale('resource');
  if (wall < actor.attackReadyAt) return stale('cooldown');
  const effect = shielded ? 'blocked' : (target.hp - 1 <= 0 ? 'knockdown' : 'hit');
  const nextActor = {...spend(actor, 1), attackReadyAt: wall + ARENA_ATTACK_GAP, log: [...actor.log, {action, target: target.id, effect, at: wall, blocked: shielded, requestId}]};
  if (shielded) return {ok: true, actor: nextActor, target: {...target, shieldUntil: 0}, effect};
  const hp = target.hp - 1;
  const down = hp <= 0;
  return {
    ok: true, effect,
    actor: {...nextActor, damage: actor.damage + 1, knockdowns: actor.knockdowns + Number(down)},
    // No permanent elimination: a knockdown resets the guard instead of removing the player.
    target: down ? {...target, hp: ARENA_HP, downs: target.downs + 1, stunnedUntil: cap(wall + ARENA_STUN_MS)} : {...target, hp}
  };
}

const MATCH_POINTS = {win: 25, draw: 12, loss: 5, bye: 10};
function outcomeOf(mine, theirs) {
  if (!theirs) return 'bye';
  const left = mine.knockdowns * 2 + mine.correct, right = theirs.knockdowns * 2 + theirs.correct;
  return left > right ? 'win' : left < right ? 'loss' : 'draw';
}

export function arenaResults(event, entries) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const rows = event.roster.map(player => {
    const mine = byId.get(player.id) || arenaEntry(event, player, player.match);
    const theirs = player.opponent ? byId.get(player.opponent) : null;
    const outcome = outcomeOf(mine, theirs);
    return {
      id: player.id, name: player.name, mascot: player.mascot, match: player.match, bye: player.bye,
      opponent: player.opponent, opponentName: event.roster.find(p => p.id === player.opponent)?.name || null,
      correct: mine.correct, wrong: mine.wrong, step: mine.step, hp: mine.hp, damage: mine.damage,
      knockdowns: mine.knockdowns, downs: mine.downs, assists: mine.assists, lastAt: mine.lastAt,
      withdrawn: !!mine.withdrawn, outcome,
      reward: mine.correct * 5 + MATCH_POINTS[outcome]
    };
  });
  const score = r => r.correct * 2 + r.knockdowns;
  return rows
    .sort((a, b) => score(b) - score(a) || b.correct - a.correct || (a.lastAt || Infinity) - (b.lastAt || Infinity) || a.id.localeCompare(b.id))
    .map((r, _i, all) => ({...r, rank: 1 + all.filter(x => score(x) > score(r) || (score(x) === score(r) && x.correct > r.correct)).length}));
}

// Awarded exactly once per team per event, guarded by the team's own event log.
export function settleArena(s, room, event, entries, wall = Date.now()) {
  if (!event || wall < event.resumeAt) return false;
  if (!event.roster.some(p => p.id === s.id)) return false;
  if (s.events?.some(e => e.type === 'arena-result' && e.eventId === event.id)) return false;
  const result = arenaResults(event, entries).find(r => r.id === s.id);
  if (!result) return false;
  s.score = (s.score || 0) + result.reward;
  s.events.push({type: 'arena-result', eventId: event.id, rank: result.rank, outcome: result.outcome, correct: result.correct, knockdowns: result.knockdowns, points: result.reward, at: gameNow(room, event.resumeAt)});
  return true;
}

export function arenaPhase(event, wall) {
  return wall < event.startAt ? 'countdown' : wall < event.finishAt ? 'fighting' : wall < event.resumeAt ? 'results' : 'done';
}

// Student payload: question text only. No answer, no steps, no seed, no opponent internals.
export function publicArena(event, campaign, entries, wall, ownId, teacher = false) {
  if (!event) return null;
  const phase = arenaPhase(event, wall);
  const own = entries.find(e => e.id === ownId) || null;
  const results = arenaResults(event, entries);
  const question = phase === 'fighting' && own && own.step < ARENA_QUESTIONS && wall >= own.stunnedUntil ? arenaQuestion(event, campaign, own) : null;
  const ownRow = results.find(r => r.id === ownId) || null;
  const opponent = own ? results.find(r => r.id === own.opponent) || null : null;
  return {
    id: event.id, type: ARENA_TYPE, theme: event.theme, phase,
    openedAt: event.openedAt, startAt: event.startAt, finishAt: event.finishAt, resumeAt: event.resumeAt,
    duration: event.duration, questions: ARENA_QUESTIONS, spectator: !own,
    bracket: event.bracket.map(pair => ({
      match: pair.match, bye: pair.bye,
      left: results.find(r => r.id === pair.left) ? {id: pair.left, name: results.find(r => r.id === pair.left).name, correct: results.find(r => r.id === pair.left).correct, knockdowns: results.find(r => r.id === pair.left).knockdowns} : null,
      right: pair.right && results.find(r => r.id === pair.right) ? {id: pair.right, name: results.find(r => r.id === pair.right).name, correct: results.find(r => r.id === pair.right).correct, knockdowns: results.find(r => r.id === pair.right).knockdowns} : null
    })),
    entries: results.map(r => ({id: r.id, name: r.name, mascot: r.mascot, match: r.match, correct: r.correct, step: r.step, hp: r.hp, knockdowns: r.knockdowns, downs: r.downs, rank: r.rank, outcome: r.outcome, reward: r.reward, lastAt: r.lastAt, withdrawn: r.withdrawn})),
    own: own ? {
      step: own.step, correct: own.correct, wrong: own.wrong, lastAt: own.lastAt, resource: own.resource,
      hp: own.hp, shieldUntil: own.shieldUntil, stunnedUntil: own.stunnedUntil,
      attackReadyAt: own.attackReadyAt, stunReadyAt: own.stunReadyAt, assistReadyAt: own.assistReadyAt,
      assists: own.assists, assistsLeft: Math.max(0, ARENA_MAX_ASSISTS - own.assists), bye: own.bye,
      mascot: event.roster.find(p => p.id === own.id)?.mascot ?? 0,
      rank: ownRow?.rank ?? null, outcome: ownRow?.outcome ?? null, reward: ownRow?.reward ?? 0,
      return: own.return || null,
      question: question ? {question: question.question, topic: question.topicName, category: question.categoryName, points: question.points} : null,
      opponent: opponent ? {id: opponent.id, name: opponent.name, mascot: opponent.mascot, hp: opponent.hp, correct: opponent.correct, knockdowns: opponent.knockdowns, shielded: wall < (entries.find(e => e.id === opponent.id)?.shieldUntil || 0)} : null
    } : null,
    ...(teacher ? {
      guides: entries.map(entry => ({
        id: entry.id, name: event.roster.find(p => p.id === entry.id)?.name || null,
        resource: entry.resource, hp: entry.hp, assists: entry.assists, damage: entry.damage,
        return: entry.return || null,
        actions: entry.log.filter(a => a.action !== 'answer').map(a => ({action: a.action, target: a.target || null, at: a.at, blocked: !!a.blocked})),
        attempts: entry.log.filter(a => a.action === 'answer').map(a => {
          const q = arenaQuestion(event, campaign, {...entry, step: a.step});
          return {...a, question: q?.question, expected: q?.answer, steps: q?.steps || []};
        })
      }))
    } : {})
  };
}

export {registerPause};
