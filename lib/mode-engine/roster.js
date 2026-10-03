export const CLASSROOM = Object.freeze({unitCap: 40, learners: 26, pairs: 13, factions: 4, groupSize: 4});
export const PARTICIPATION = Object.freeze(['group', 'individual', 'pairs']);

export function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function learner(value) {
  if (!value || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || !value.name.trim()) throw new Error('INVALID_LEARNER');
  return {id: value.id, name: value.name.trim(), present: true};
}

export function factionCounts(units) { return [0, 1, 2, 3].map(f => units.filter(u => u.faction === f).reduce((n, u) => n + u.members.length, 0)); }

export function createRoster(learners, {participation = 'individual', seed = 0, factions = {}} = {}) {
  if (!PARTICIPATION.includes(participation)) throw new Error('INVALID_PARTICIPATION');
  const members = learners.map(learner);
  if (new Set(members.map(m => m.id)).size !== members.length) throw new Error('DUPLICATE_LEARNER');
  members.sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`) || a.id.localeCompare(b.id));
  const size = participation === 'pairs' ? 2 : participation === 'group' ? CLASSROOM.groupSize : 1;
  const units = [];
  const count = Math.ceil(members.length / size);
  for (let i = 0; i < members.length;) {
    const width = participation === 'group' ? Math.floor(members.length / count) + (units.length < members.length % count ? 1 : 0) : size;
    units.push({id: `unit-${units.length + 1}`, members: members.slice(i, i + width), faction: units.length % 4,
      controller: 0, outcome: 'active', late: false});
    i += width;
  }
  if (units.length > CLASSROOM.unitCap) throw new Error('UNIT_CAPACITY');
  if (!factions || typeof factions !== 'object' || Array.isArray(factions) || Object.keys(factions).some(id => !units.some(u => u.id === id) || !Number.isInteger(factions[id]) || factions[id] < 0 || factions[id] > 3)) throw new Error('INVALID_FACTIONS');
  for (const u of units) u.faction = Object.hasOwn(factions, u.id) ? factions[u.id] : null;
  // Whole units are indivisible: 26 individuals yield 7/7/6/6; 13 pairs 8/6/6/6;
  // default groups of 4,4,4,4,4,3,3 yield 8/7/7/4. Host overrides are authoritative.
  for (const u of units) if (u.faction === null) {
    const counts = factionCounts(units);
    u.faction = counts.indexOf(Math.min(...counts));
  }
  return {participation, units};
}

// Build units from explicit shared-device membership. The route uses this when
// a class has already assigned learners to devices, so sorting/grouping cannot
// silently change the teacher's device map.
export function createDeviceRoster(devices, {participation = 'individual', seed = 0, factions = {}} = {}) {
  if (!PARTICIPATION.includes(participation) || !Array.isArray(devices) || !devices.length || devices.length > CLASSROOM.unitCap)
    throw new Error('INVALID_DEVICE_ROSTER');
  const units = devices.map((device, index) => {
    const members = Array.isArray(device?.members) ? device.members : [];
    const max = participation === 'individual' ? 1 : participation === 'pairs' ? 2 : CLASSROOM.groupSize;
    if (!members.length || members.length > max) throw new Error('INVALID_DEVICE_MEMBERS');
    const normalized = members.map((member, memberIndex) => learner({
      id: member?.id ?? `learner-${index + 1}-${memberIndex + 1}`,
      name: member?.name ?? member,
    }));
    return {id: `unit-${index + 1}`, members: normalized, faction: null, controller: 0, outcome: 'active', late: false};
  });
  const ids = units.flatMap(unit => unit.members.map(member => member.id));
  if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_LEARNER');
  for (const unit of units) unit.faction = Object.hasOwn(factions, unit.id) ? factions[unit.id] : factionCounts(units).indexOf(Math.min(...factionCounts(units)));
  if (!factions || typeof factions !== 'object' || Array.isArray(factions) || Object.keys(factions).some(id => !units.some(u => u.id === id) || !Number.isInteger(factions[id]) || factions[id] < 0 || factions[id] > 3)) throw new Error('INVALID_FACTIONS');
  return {participation, units, seed};
}

export function addLate(roster, value, {communityOpened = false} = {}) {
  const member = learner(value);
  if (roster.units.some(u => u.members.some(m => m.id === member.id))) throw new Error('DUPLICATE_LEARNER');
  if (roster.units.length >= CLASSROOM.unitCap) throw new Error('UNIT_CAPACITY');
  const next = structuredClone(roster);
  const counts = factionCounts(next.units);
  // Late pairs start as singletons; existing controller/partner assignments never shift.
  next.units.push({id: `unit-${next.units.length + 1}`, members: [member], faction: counts.indexOf(Math.min(...counts)),
    controller: 0, outcome: communityOpened ? 'spectator' : 'active', late: true});
  return next;
}

export function addLateDevice(roster, values, {communityOpened = false} = {}) {
  if (!Array.isArray(values) || !values.length) throw new Error('INVALID_LEARNER');
  const next = structuredClone(roster);
  const members = values.map(learner);
  const ids = next.units.flatMap(unit => unit.members.map(member => member.id));
  if (members.some(member => ids.includes(member.id)) || new Set(members.map(member => member.id)).size !== members.length)
    throw new Error('DUPLICATE_LEARNER');
  if (next.units.length >= CLASSROOM.unitCap) throw new Error('UNIT_CAPACITY');
  const counts = factionCounts(next.units);
  next.units.push({id: `unit-${next.units.length + 1}`, members, faction: counts.indexOf(Math.min(...counts)),
    controller: 0, outcome: communityOpened ? 'spectator' : 'active', late: true});
  return next;
}

export function leave(roster, learnerId) {
  const next = structuredClone(roster);
  const unit = next.units.find(u => u.members.some(m => m.id === learnerId));
  if (!unit) throw new Error('UNKNOWN_LEARNER');
  unit.members.find(m => m.id === learnerId).present = false;
  if (unit.members.every(m => !m.present)) unit.outcome = 'abandoned';
  else if (!unit.members[unit.controller].present) rotateController(unit);
  return next;
}

export function rotateController(unit) {
  for (let i = 1; i <= unit.members.length; i++) {
    const at = (unit.controller + i) % unit.members.length;
    if (unit.members[at].present) { unit.controller = at; return; }
  }
}

export function closeCommunity(roster) {
  const next = structuredClone(roster);
  for (const unit of next.units) if (unit.outcome === 'spectator') unit.outcome = 'active';
  return next;
}
