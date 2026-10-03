import {stats, ordered, requireAction} from './shared.js';
export const constants = Object.freeze({duration: 300000, tickMs: 10000, target: 12});
export function init(units, now) {
  return {lastTick: now, end: now + constants.duration, zones: Array.from({length: 4}, () => ({owner: null, shield: 0})),
    factions: Array.from({length: 4}, () => ({control: 0, correct: 0, resources: 0, objective: 0})), players: stats(units, () => ({correct: 0}))};
}
export function validate(s, id, a) {
  requireAction(['capture', 'defend', 'objective'].includes(a.type));
  if (a.type !== 'objective') requireAction(Number.isInteger(a.zone) && a.zone >= 0 && a.zone < 4);
  const faction = s.units.find(u => u.id === id).faction;
  if (a.type === 'defend') requireAction(s.ruleState.zones[a.zone].owner === faction);
  if (a.type === 'capture') requireAction(s.ruleState.zones[a.zone].owner !== faction);
}
export function progress(s, id, a, now, correct) {
  if (!correct) return;
  const r = s.ruleState, f = s.units.find(u => u.id === id).faction, team = r.factions[f];
  team.correct++; team.resources++; r.players[id].correct++;
  if (a.type === 'objective') { team.objective++; if (team.objective % 3 === 0) team.resources += 3; }
  else if (a.type === 'defend') r.zones[a.zone].shield = Math.min(2, r.zones[a.zone].shield + 1);
  else if (r.zones[a.zone].shield) r.zones[a.zone].shield--;
  else r.zones[a.zone].owner = f;
}
export function tick(s, now) {
  const r = s.ruleState;
  while (r.lastTick + constants.tickMs <= Math.min(now, r.end) && !s.finished) {
    r.lastTick += constants.tickMs;
    for (const zone of r.zones) if (zone.owner !== null) r.factions[zone.owner].control++;
    if (r.factions.some(f => f.control >= constants.target)) s.finished = true;
  }
  if (now >= r.end) s.finished = true;
}
export function rank(s) { return ordered(s.units, id => { const f = s.ruleState.factions[s.units.find(u => u.id === id).faction]; return [f.control, f.correct, f.resources]; }); }
export const mathActions = ['capture', 'defend', 'objective'];
