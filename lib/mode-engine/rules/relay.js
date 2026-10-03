import {stats, ordered, requireAction, complete, noTick} from './shared.js';
import {rotateController} from '../roster.js';
export function init(units) { return {players: stats(units, () => ({legs: 0, ready: false, coverage: [], points: 0, finishedAt: null}))}; }
export function validate(s, id, a) {
  const p = s.ruleState.players[id], u = s.units.find(u => u.id === id);
  requireAction(['solve', 'handoff'].includes(a.type));
  requireAction(a.learnerId === u.members[u.controller].id && u.members[u.controller].present, 'WRONG_CONTROLLER');
  requireAction(a.type === 'solve' ? !p.ready : p.ready, 'HANDOFF_REQUIRED');
}
export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id], u = s.units.find(u => u.id === id);
  if (a.type === 'solve' && correct) { p.ready = true; p.points += 10; if (!p.coverage.includes(a.learnerId)) p.coverage.push(a.learnerId); }
  if (a.type === 'handoff') {
    p.legs++; p.ready = false; rotateController(u);
    if (p.legs >= u.members.length && u.members.every(m => p.coverage.includes(m.id))) complete(s, id, now);
  }
}
export function context(s, id) { return String(s.ruleState.players[id].legs); }
export function rank(s) { return ordered(s.units, id => { const p = s.ruleState.players[id]; return [p.legs, p.points, -(p.finishedAt ?? s.gameNow)]; }); }
export const tick = noTick;
export const mathActions = ['solve'];
