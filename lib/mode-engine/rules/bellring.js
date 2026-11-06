import {stats, ordered, requireAction, noTick} from './shared.js';

// Rung Chuông Vàng: sai thì rời sàn, đúng thì trụ lại; loại dần tới người cuối cùng.
export const constants = Object.freeze({lives: 1, rescueAt: 5, maxRescues: 1});

export function init(units) {
  return {players: stats(units, () => ({correct: 0, wrong: 0, ring: 0, out: false, rescued: 0, fastest: null, finishedAt: null}))};
}

export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['ring', 'rescue'].includes(a.type));
  if (a.type === 'rescue') {
    requireAction(p.out && p.rescued < constants.maxRescues && p.correct >= constants.rescueAt, 'RESCUE_UNAVAILABLE');
    return;
  }
  requireAction(!p.out, 'LEARNER_ELIMINATED');
}

export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id];
  if (a.type === 'rescue') {
    p.rescued++;
    p.out = false;
    return;
  }
  if (correct) {
    p.correct++;
    p.ring++;
    if (p.fastest === null) p.fastest = now;
  } else {
    p.wrong++;
    p.ring = 0;
    if (p.wrong >= constants.lives) {
      p.out = true;
      s.units.find(u => u.id === id).outcome = 'temporary-defeat';
    }
  }
  // Người cuối cùng còn trên sàn thắng ngay.
  const alive = s.units.filter(u => ['active', 'temporary-defeat'].includes(u.outcome)).filter(u => !s.ruleState.players[u.id].out);
  if (alive.length <= 1 && s.units.length > 1) {
    for (const u of alive) {
      s.ruleState.players[u.id].finishedAt ??= now;
      u.outcome = 'completed';
    }
  }
}

export function rank(s) {
  return ordered(s.units, id => {
    const p = s.ruleState.players[id];
    return [p.out ? 0 : 1, p.ring, p.correct, -(p.fastest ?? s.gameNow)];
  });
}

export const tick = noTick;
export const mathActions = ['ring'];
