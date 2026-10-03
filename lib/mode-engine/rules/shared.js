export function stats(units, make) { return Object.fromEntries(units.map(u => [u.id, make(u)])); }
export function requireAction(condition, error = 'INVALID_ACTION') { if (!condition) throw new Error(error); }
export function ordered(units, values) {
  return units.map(u => ({id: u.id, values: values(u.id)})).sort((a, b) => {
    for (let i = 0; i < a.values.length; i++) if (a.values[i] !== b.values[i]) return b.values[i] - a.values[i];
    return a.id.localeCompare(b.id);
  }).map((entry, index) => ({unitId: entry.id, rank: index + 1, values: entry.values}));
}
export function complete(s, id, now) { s.units.find(u => u.id === id).outcome = 'completed'; s.ruleState.players[id].finishedAt ??= now; }
export function noTick() {}
