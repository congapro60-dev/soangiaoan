import {stats, ordered, requireAction, complete, noTick} from './shared.js';
export const constants = Object.freeze({prices: Object.freeze({ore: 3, wood: 2}), contract: Object.freeze({ore: 2, wood: 1, reward: 12}), contracts: 3});
export function init(units) { return {players: stats(units, () => ({coins: 4, ore: 0, wood: 0, contracts: 0, correct: 0, finishedAt: null}))}; }
export function validate(s, id, a) {
  const p = s.ruleState.players[id];
  requireAction(['earn', 'buy', 'sell', 'contract'].includes(a.type));
  if (a.type === 'buy' || a.type === 'sell') {
    requireAction(Object.hasOwn(constants.prices, a.item) && Number.isSafeInteger(a.quantity) && a.quantity > 0 && a.quantity <= 100);
    requireAction(a.type === 'buy' ? p.coins >= constants.prices[a.item] * a.quantity : p[a.item] >= a.quantity, 'INSUFFICIENT_RESOURCES');
  }
  if (a.type === 'contract') requireAction(p.ore >= 2 && p.wood >= 1, 'CONTRACT_UNFUNDED');
}
export function progress(s, id, a, now, correct) {
  const p = s.ruleState.players[id];
  if (a.type === 'earn') { if (correct) { p.coins += 5; p.correct++; } }
  else if (a.type === 'contract') { p.ore -= 2; p.wood--; p.coins += constants.contract.reward; p.contracts++; if (p.contracts === constants.contracts) complete(s, id, now); }
  else { const sign = a.type === 'buy' ? 1 : -1; p[a.item] += sign * a.quantity; p.coins -= sign * constants.prices[a.item] * a.quantity; }
}
export function rank(s) { return ordered(s.units, id => { const p = s.ruleState.players[id]; return [p.contracts, p.coins + p.ore * 3 + p.wood * 2, p.correct]; }); }
export const tick = noTick;
export const mathActions = ['earn'];
