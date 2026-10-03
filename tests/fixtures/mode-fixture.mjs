import {createGame, reduce} from '../../lib/mode-engine/index.js';

export const learners = Object.freeze(Array.from({length: 26}, (_, i) => Object.freeze({id: `learner-${i + 1}`, name: `Learner ${i + 1}`})));
export function fixture(rule, options = {}) { return createGame({rule, learners, seed: 173, ...options}); }
export function act(state, unitId, action, {correct = true, gameNow = state.gameNow, answer} = {}) {
  let next = state;
  let challengeId;
  const math = {campaign: ['station', 'bonus'], duel: ['answer'], zones: ['capture', 'defend', 'objective'], survival: ['recover', 'objective'], escort: ['repair', 'fuel'], treasure: ['clue', 'dig'], relay: ['solve'], lockdown: ['power'], merchant: ['earn']}[state.rule].includes(action.type);
  const serial = Object.keys(state.requests).length;
  if (math) {
    const issued = reduce(next, {type: 'issue', requestId: `issue-${serial}`, unitId, round: 1, action}, {gameNow});
    next = issued.state; challengeId = issued.result.challengeId;
    answer ??= correct ? next.challenges[challengeId].expected ?? next.challenges[challengeId].answer : '__wrong__';
  }
  const event = {type: 'progress', requestId: `progress-${serial}`, unitId, round: 1, action};
  if (math) { event.challengeId = challengeId; event.answer = answer; }
  return reduce(next, event, {gameNow}).state;
}
export function tick(state, gameNow, pause = false) { return reduce(state, {type: 'tick'}, {gameNow, pause}).state; }
