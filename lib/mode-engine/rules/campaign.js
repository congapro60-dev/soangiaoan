import {initRace, finishStation, roll, ready, compareTeams, doorCode} from '../../race.js';
import {requireAction, noTick} from './shared.js';
import {hash} from '../roster.js';
import {contextQuestion} from '../../context-questions.js';

export function question(s, id, action) {
  const t = s.ruleState.players[id];
  if (t.puzzle && action.type === 'station') return t.puzzle;
  if (action.type === 'bonus') return t.race.bonus;
  const plan = s.curriculum.plan[t.race.outcomes.length % s.curriculum.plan.length];
  return contextQuestion(plan, (s.seed ^ Math.imul(t.race.outcomes.length + 1, 0x9e3779b1)) >>> 0);
}

export function init(units, now, seed, legacyTeams = {}) {
  const players = {};
  for (const u of units) {
    const team = legacyTeams[u.id] ? structuredClone(legacyTeams[u.id]) : {id: u.id, seed: hash(`${seed}:${u.id}`), status: 'active', solved: [], score: 0, penalty: 0, completed: 0, adjustedMs: 0, events: [], effects: {}};
    requireAction(team.id === u.id, 'LEGACY_ID_MISMATCH');
    initRace(team); players[u.id] = team;
  }
  return {players};
}
export function validate(s, id, a, now) {
  const t = s.ruleState.players[id];
  requireAction(['station', 'roll', 'gate', 'bonus'].includes(a.type));
  if (a.type === 'station') requireAction(t.race.phase === 'challenge');
  if (a.type === 'roll') requireAction(ready(t, now), 'RACE_NOT_READY');
  if (a.type === 'gate') requireAction(t.race.phase === 'gate' && String(a.code) === doorCode(t), 'GATE_LOCKED');
  if (a.type === 'bonus') requireAction(t.race.bonus && !t.race.bonus.done);
}
export function progress(s, id, a, now, correct) {
  const t = s.ruleState.players[id];
  if (a.type === 'roll') roll(t, now);
  else if (a.type === 'gate') { t.status = 'completed'; t.adjustedMs = now - s.startedAt + t.penalty - t.race.timeBonus; s.units.find(u => u.id === id).outcome = 'completed'; }
  else if (correct && a.type === 'station') { const q = s.challenges[s.activeChallenges[id]]; finishStation(t, q.digit ?? (t.race.outcomes.length + 1), now); t.completed++; t.score += 100; }
  else if (correct && a.type === 'bonus') { t.race.bonus.done = true; t.score += t.race.bonus.points || 40; }
}
export function context(s, id) { const t = s.ruleState.players[id]; return `${t.race.phase}:${t.race.outcomes.length}:${t.race.bonus?.serial ?? 0}`; }
export function rank(s) { return Object.values(s.ruleState.players).slice().sort(compareTeams).map((t, i) => ({unitId: t.id, rank: i + 1, values: [t.race.position, t.score, -t.adjustedMs]})); }
export const tick = noTick;
export const mathActions = ['station', 'bonus'];
