import {stats, ordered, requireAction, complete, noTick} from './shared.js';
export const constants = Object.freeze({distance: 6, initialFuel: 2, initialIntegrity: 2});
export function init(units) { return {players: stats(units, () => ({distance: 0, fuel: 2, integrity: 2, finishedAt: null}))}; }
export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['repair', 'fuel', 'advance'].includes(a.type));
  if (a.type === 'advance') requireAction(p.fuel > 0 && p.integrity > 0, 'CONVOY_BLOCKED');
  if (a.type === 'repair') requireAction(p.integrity < 4);
  if (a.type === 'fuel') requireAction(p.fuel < 6);
}
export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id];
  if (a.type === 'advance') {
    p.distance++; p.fuel--; p.integrity--;
    if (p.distance === constants.distance) complete(s, id, now);
  } else if (correct && a.type === 'repair') p.integrity = Math.min(4, p.integrity + 2);
  else if (correct) p.fuel = Math.min(6, p.fuel + 3);
}
export function rank(s) { return ordered(s.units, id => { const p = s.ruleState.players[id]; return [p.distance, p.fuel + p.integrity, -(p.finishedAt ?? s.gameNow)]; }); }
export const tick = noTick;
export const mathActions = ['repair', 'fuel'];
