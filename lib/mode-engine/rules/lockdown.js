import {stats, ordered, requireAction, complete, noTick} from './shared.js';
export const constants = Object.freeze({rooms: Object.freeze(['code', 'pipes', 'graph', 'logic'])});
export function init(units) { return {players: stats(units, () => ({room: 0, powered: false, points: 0, finishedAt: null}))}; }
export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['power', 'unlock'].includes(a.type));
  if (a.type === 'power') requireAction(!p.powered);
  else requireAction(p.powered && a.roomType === constants.rooms[p.room], 'WRONG_ROOM');
}
export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id];
  if (a.type === 'power') { if (correct) p.powered = true; return; }
  const valid = [
    () => a.code === '314',
    () => Array.isArray(a.rotations) && a.rotations.length === 3 && a.rotations.every((r, i) => r === [1, 2, 1][i]),
    () => Array.isArray(a.path) && a.path.join(',') === 'A,B,D',
    () => Array.isArray(a.order) && a.order.join(',') === 'water,seed,tree'
  ][p.room]();
  requireAction(valid, 'PUZZLE_INCORRECT');
  p.room++; p.points += 20; p.powered = false;
  if (p.room === constants.rooms.length) complete(s, id, now);
}
export function roomView(s, id) {
  const room = s.ruleState.players[id].room;
  return [
    {type: 'code', prompt: 'Enter the first three digits of pi, without punctuation.'},
    {type: 'pipes', prompt: 'Rotate each north-facing pipe clockwise to face east, south, east.', count: 3},
    {type: 'graph', start: 'A', end: 'D', edges: [['A', 'B'], ['B', 'D'], ['A', 'C']], prompt: 'Choose a path from A to D.'},
    {type: 'logic', items: ['tree', 'water', 'seed'], prompt: 'Water the soil, plant a seed, then grow a tree. Order the items.'}
  ][room] ?? null;
}
export function context(s, id) { return String(s.ruleState.players[id].room); }
export function rank(s) { return ordered(s.units, id => { const p = s.ruleState.players[id]; return [p.room, p.points, -(p.finishedAt ?? s.gameNow)]; }); }
export const tick = noTick;
export const mathActions = ['power'];
