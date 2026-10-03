import {stats, ordered, requireAction} from './shared.js';
export const constants = Object.freeze({tickMs: 10000, rounds: 6, roundMs: 30000, energy: 100});
export function init(units, now) { return {start: now, lastTick: now, round: 1, radius: 6, players: stats(units, () => ({energy: 100, rounds: 0, objectives: 0, position: 0}))}; }
export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['recover', 'objective', 'move'].includes(a.type));
  if (a.type !== 'recover') requireAction(p.energy > 0, 'TEMPORARY_DEFEAT');
  if (a.type === 'move') requireAction(Number.isInteger(a.position) && a.position >= 0 && a.position <= s.ruleState.radius);
}
export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id], unit = s.units.find(u => u.id === id);
  if (a.type === 'move') { p.position = a.position; return; }
  if (!correct) return;
  if (a.type === 'recover') { p.energy = Math.min(100, p.energy + 40); p.position = 0; unit.outcome = 'active'; }
  else p.objectives++;
}
export function tick(s, now) {
  const r = s.ruleState;
  while (r.lastTick + constants.tickMs <= Math.min(now, r.start + constants.rounds * constants.roundMs)) {
    r.lastTick += constants.tickMs;
    const boundary = (r.lastTick - r.start) % constants.roundMs === 0;
    for (const u of s.units) {
      if (!['active', 'temporary-defeat'].includes(u.outcome)) continue;
      const p = r.players[u.id];
      p.energy = Math.max(0, p.energy - 10 - (p.position > r.radius ? 20 : 0));
      if (!p.energy) u.outcome = 'temporary-defeat';
      if (boundary && p.energy > 0) p.rounds++;
    }
    if (boundary) { r.round++; r.radius = Math.max(1, r.radius - 1); }
  }
  if (now >= r.start + constants.rounds * constants.roundMs) s.finished = true;
}
export function rank(s) { return ordered(s.units, id => { const p = s.ruleState.players[id]; return [p.rounds, p.objectives, p.energy]; }); }
export const mathActions = ['recover', 'objective'];
