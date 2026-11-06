import {stats, ordered, requireAction, complete, noTick} from './shared.js';

// Đường Đua Tri Thức: trả lời đúng thì xe tiến, sai thì chậm lại; combo 3 câu tăng tốc.
export const constants = Object.freeze({track: 20, step: 1, boostStep: 2, comboAt: 3, comboBonus: 1});

export function init(units) {
  return {players: stats(units, () => ({distance: 0, combo: 0, best: 0, correct: 0, wrong: 0, boosts: 0, finishedAt: null}))};
}

export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['accelerate', 'boost'].includes(a.type));
  if (a.type === 'boost') requireAction(p.combo >= constants.comboAt, 'BOOST_UNAVAILABLE');
}

export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id];
  if (a.type === 'boost') {
    p.combo -= constants.comboAt;
    p.boosts++;
    p.distance = Math.min(constants.track, p.distance + constants.boostStep);
  } else if (correct) {
    p.correct++;
    p.combo++;
    p.best = Math.max(p.best, p.combo);
    p.distance = Math.min(constants.track, p.distance + constants.step + (p.combo >= constants.comboAt ? constants.comboBonus : 0));
  } else {
    p.wrong++;
    p.combo = 0;
    p.distance = Math.max(0, p.distance - 1);
  }
  if (p.distance >= constants.track && p.finishedAt === null) complete(s, id, now);
}

export function rank(s) {
  return ordered(s.units, id => {
    const p = s.ruleState.players[id];
    return [p.finishedAt !== null ? 1 : 0, p.distance, -(p.finishedAt ?? s.gameNow), p.best];
  });
}

export const tick = noTick;
export const mathActions = ['accelerate'];
