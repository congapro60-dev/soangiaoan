export const PARTICIPATION = Object.freeze(['group', 'individual', 'pairs']);
export const RULES = Object.freeze(['campaign', 'duel', 'zones', 'survival', 'escort', 'treasure', 'relay', 'lockdown', 'merchant']);
export const OUTCOMES = Object.freeze(['active', 'spectator', 'temporary-defeat', 'completed', 'abandoned']);
export const MODE_LIMITS = Object.freeze({learners: 26, pairs: 13, factions: 4});

export function validateMode({participation, rule}) {
  if (!PARTICIPATION.includes(participation)) throw new Error('INVALID_PARTICIPATION');
  if (!RULES.includes(rule)) throw new Error('INVALID_RULE');
  return {participation, rule};
}

function hash(value) { let x = Number(value) >>> 0; return () => (x = (Math.imul(x ^ (x >>> 16), 2246822519) + 3266489917) >>> 0); }

export function assignParticipants(learners, {seed = 0, participation = 'group', rule = 'campaign'} = {}) {
  validateMode({participation, rule});
  if (!Array.isArray(learners) || learners.length > MODE_LIMITS.learners) throw new Error('LEARNER_CAPACITY');
  const ids = learners.map((learner, index) => typeof learner === 'string' ? learner : learner.id ?? String(index));
  if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_LEARNER');
  const random = hash(seed);
  const order = ids.map((id, index) => ({id, index, sort: random()})).sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
  const pairId = participation === 'pairs' ? (index) => Math.floor(index / 2) : () => null;
  return order.map((entry, index) => ({
    learnerId: entry.id,
    participation,
    rule,
    pair: pairId(index),
    faction: index % MODE_LIMITS.factions,
    outcome: 'active'
  }));
}

export function addLateParticipant(assignments, learner, options = {}) {
  if (assignments.length >= MODE_LIMITS.learners) throw new Error('LEARNER_CAPACITY');
  const learnerId = typeof learner === 'string' ? learner : learner.id;
  if (assignments.some(a => a.learnerId === learnerId)) throw new Error('DUPLICATE_LEARNER');
  const participation = options.participation ?? assignments[0]?.participation ?? 'group';
  const rule = options.rule ?? assignments[0]?.rule ?? 'campaign';
  validateMode({participation, rule});
  let pair = null;
  if (participation === 'pairs') {
    const counts = new Map();
    for (const a of assignments) if (a.pair != null) counts.set(a.pair, (counts.get(a.pair) || 0) + 1);
    pair = [...counts.keys()].sort((a, b) => a - b).find(id => counts.get(id) === 1);
    if (pair == null) {
      pair = 0;
      while (counts.has(pair)) pair++;
    }
  }
  const counts = factionCounts(assignments);
  return {learnerId, participation, rule, pair, faction: counts.indexOf(Math.min(...counts)), outcome: 'active'};
}

export function markLeaver(assignments, learnerId) {
  return assignments.map(a => a.learnerId === learnerId ? {...a, outcome: 'abandoned'} : a);
}

export function factionCounts(assignments) { return [0, 1, 2, 3].map(faction => assignments.filter(a => a.faction === faction).length); }
