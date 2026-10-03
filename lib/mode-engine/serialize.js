import {publicChallenge} from './challenge.js';
import {rank} from './index.js';
import {roomView} from './rules/lockdown.js';
import {constants as merchant} from './rules/merchant.js';

const fields = Object.freeze({
  duel: ['matchPoints', 'correct', 'elapsed', 'submitted'],
  zones: ['correct'], survival: ['energy', 'rounds', 'objectives', 'position'],
  escort: ['distance', 'fuel', 'integrity', 'finishedAt'],
  treasure: ['clues', 'branch', 'fragments', 'sets', 'correct', 'points', 'finishedAt'],
  relay: ['legs', 'ready', 'coverage', 'points', 'finishedAt'],
  lockdown: ['room', 'powered', 'points', 'finishedAt'],
  merchant: ['coins', 'ore', 'wood', 'contracts', 'correct', 'finishedAt']
});
function pick(value, keys) { return Object.fromEntries(keys.filter(k => Object.hasOwn(value, k)).map(k => [k, structuredClone(value[k])])); }

export function serializePublic(state, unitId = null, host = false) {
  const units = state.units.map(u => ({id: u.id, faction: u.faction, controller: u.id === unitId || host ? (u.members[u.controller]?.id ?? null) : null,
    ...(u.id === unitId || host ? {members: u.members.map(m => ({id: m.id, name: m.name, present: m.present}))} : {memberCount: u.members.length}), outcome: u.outcome, late: u.late}));
  const players = {};
  for (const u of state.units) {
    const p = state.ruleState.players[u.id];
    players[u.id] = state.rule === 'campaign' ? {position: p.race.position, phase: p.race.phase, score: p.score, completed: p.completed, status: p.status} : pick(p, fields[state.rule]);
  }
  const view = {rule: state.rule, participation: state.participation, gameNow: state.gameNow, paused: state.paused, finished: state.finished,
    deadline: state.deadline, units, players, ranking: rank(state), challenge: publicChallenge(state.challenges[state.activeChallenges[unitId]])};
  if (state.rule === 'duel') view.duel = {round: state.ruleState.round, deadline: state.ruleState.deadline, pairs: state.ruleState.pairs.map(p => [...p])};
  if (state.rule === 'zones') view.zones = {zones: state.ruleState.zones.map(z => pick(z, ['owner', 'shield'])), factions: state.ruleState.factions.map(f => pick(f, ['control', 'correct', 'resources', 'objective']))};
  if (state.rule === 'survival') view.survival = pick(state.ruleState, ['round', 'radius']);
  if (state.rule === 'lockdown' && Object.hasOwn(players, unitId)) view.room = roomView(state, unitId);
  if (state.rule === 'merchant') view.market = {prices: {...merchant.prices}, contract: {...merchant.contract}, target: merchant.contracts};
  return view;
}

// Host authorization belongs to the future route boundary, never this pure module.
export function serializeHost(state, unitId) {
  const view = serializePublic(state, unitId, true);
  const challenge = state.challenges[state.activeChallenges[unitId]];
  return {...view, solution: challenge ? pick(challenge, ['id', 'answer', 'steps']) : null};
}
