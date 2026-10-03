import {stats, ordered, requireAction} from './shared.js';

export const constants = Object.freeze({rounds: 5, roundMs: 75000});
export function init(units, now) {
  const state = {round: 1, deadline: now + constants.roundMs, players: stats(units, () => ({matchPoints: 0, correct: 0, elapsed: 0, submitted: false})), pairs: []};
  pair(state, units);
  return state;
}
function standings(state, units) { return ordered(units, id => { const p = state.players[id]; return [p.matchPoints, p.correct, -p.elapsed]; }); }
function pair(state, units) {
  const ids = standings(state, units.filter(u => u.outcome === 'active')).map(r => r.unitId);
  state.pairs = [];
  for (let i = 0; i < ids.length; i += 2) state.pairs.push([ids[i], ids[i + 1] ?? null]);
}
export function context(s) { return `duel:${s.ruleState.round}`; }
export function validate(s, id, a) {
  requireAction(a.type === 'answer' && !s.ruleState.players[id].submitted && s.ruleState.pairs.some(p => p.includes(id)));
}
export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id];
  p.submitted = true;
  if (correct) p.correct++;
  p.roundCorrect = correct;
  p.roundTime = now - (s.ruleState.deadline - constants.roundMs);
  p.elapsed += p.roundTime;
}
export function tick(s, now) {
  const r = s.ruleState;
  while (!s.finished && now >= r.deadline) {
    for (const [a, b] of r.pairs) {
      const x = r.players[a], y = b && r.players[b];
      if (!y) x.matchPoints += 3;
      else {
        const diff = Number(!!x.roundCorrect) - Number(!!y.roundCorrect) || (y.roundTime ?? constants.roundMs) - (x.roundTime ?? constants.roundMs);
        x.matchPoints += diff > 0 ? 3 : diff === 0 ? 1 : 0;
        y.matchPoints += diff < 0 ? 3 : diff === 0 ? 1 : 0;
      }
    }
    if (r.round === constants.rounds) { s.finished = true; break; }
    r.round++; r.deadline += constants.roundMs;
    for (const p of Object.values(r.players)) { p.submitted = false; delete p.roundCorrect; delete p.roundTime; }
    pair(r, s.units);
  }
}
export function rank(s) { return standings(s.ruleState, s.units); }
export const mathActions = ['answer'];
