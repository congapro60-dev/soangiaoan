import {stats, ordered, requireAction, complete, noTick} from './shared.js';
export const constants = Object.freeze({sets: 2, branches: Object.freeze(['sun', 'moon', 'star'])});
export function init(units) { return {players: stats(units, () => ({clues: 0, branch: null, fragments: [], sets: 0, correct: 0, points: 0, finishedAt: null}))}; }
export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['clue', 'choose', 'dig', 'assemble'].includes(a.type));
  if (a.type === 'clue') requireAction(p.branch === null && p.clues === 0);
  if (a.type === 'choose') requireAction(p.clues > 0 && p.branch === null && constants.branches.includes(a.branch) && !p.fragments.includes(a.branch));
  if (a.type === 'dig') requireAction(p.branch !== null);
  if (a.type === 'assemble') requireAction(constants.branches.every(b => p.fragments.includes(b)));
}
export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id];
  if (a.type === 'choose') { p.branch = a.branch; p.clues--; }
  else if (a.type === 'assemble') { p.sets++; p.fragments = []; p.points += 30; if (p.sets === constants.sets) complete(s, id, now); }
  else if (correct) { p.correct++; p.points += 10; if (a.type === 'clue') p.clues++; else { p.fragments.push(p.branch); p.branch = null; } }
}
export function context(s, id) { const p = s.ruleState.players[id]; return `${p.sets}:${p.branch}:${p.fragments.join(',')}`; }
export function rank(s) { return ordered(s.units, id => { const p = s.ruleState.players[id]; return [p.sets, p.correct, p.points, -(p.finishedAt ?? s.gameNow)]; }); }
export const tick = noTick;
export const mathActions = ['clue', 'dig'];
