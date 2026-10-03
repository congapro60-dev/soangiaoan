export const EVENT_VERSION = 1;

function canonicalize(val) {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(canonicalize);
  const keys = Object.keys(val).sort();
  const res = Object.create(null);
  for (const key of keys) {
    if (val[key] !== undefined) {
      res[key] = canonicalize(val[key]);
    }
  }
  return res;
}

export function fingerprint(payload) {
  if (payload === undefined) return undefined;
  return JSON.stringify(canonicalize(payload));
}
export function createEvent({requestId, type, payload, round, revision, deadline, now = Date.now()} = {}) {
  if (!requestId || !type) throw new Error('INVALID_EVENT');
  return {version: EVENT_VERSION, requestId, type, payload, payloadFingerprint: fingerprint(payload), round, revision, deadline, createdAt: now};
}
export function acceptEvent(cache, event, now = Date.now()) {
  const incomingFingerprint = fingerprint(event.payload);
  const previous = cache.get(event.requestId);
  if (previous) return previous.payloadFingerprint === incomingFingerprint ? {ok: true, replay: true, event: previous} : {ok: false, code: 'REQUEST_ID_CONFLICT'};
  if (event.deadline != null && now > event.deadline) return {ok: false, code: 'DEADLINE_EXPIRED'};
  cache.set(event.requestId, {...event, payloadFingerprint: incomingFingerprint});
  return {ok: true, replay: false, event};
}
export function rewardOnce(rewards, rewardId, reward) { if (rewards.has(rewardId)) return {ok: true, replay: true, reward: rewards.get(rewardId)}; rewards.set(rewardId, reward); return {ok: true, replay: false, reward}; }
