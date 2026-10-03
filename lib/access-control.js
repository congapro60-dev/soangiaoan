const HEADER_PREFIX = 'oai-authenticated-';

export const ROLES = Object.freeze({ROOT: 'root', OWNER: 'owner', COHOST: 'cohost', OBSERVER: 'observer'});

function clean(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Deterministic parser for OpenAI/Sites authenticated request headers.
 * Pure parser, not an authenticator: caller must provide a Headers-compatible
 * object exposing `.get(name)` originating from Sites-dispatched server requests.
 * Callers must never pass body/query data or client-created identity here.
 * Interface shape cannot establish provenance; trust belongs at the server boundary.
 */
export function extractSIWCUser(headers) {
  if (!headers || typeof headers.get !== 'function') return null;
  const userId = clean(headers.get(`${HEADER_PREFIX}user-id`));
  const email = clean(headers.get(`${HEADER_PREFIX}user-email`))?.toLowerCase() ?? null;
  if (!userId || !email) return null;
  const encodedName = clean(headers.get(`${HEADER_PREFIX}user-full-name`));
  const encoding = clean(headers.get(`${HEADER_PREFIX}user-full-name-encoding`));
  let fullName = null;
  if (encodedName && encoding === 'percent-encoded-utf-8') {
    try { fullName = decodeURIComponent(encodedName); } catch { fullName = null; }
  }
  return {userId, email, fullName, displayName: fullName || email};
}

export function configuredRoot(env = {}) {
  const email = clean(env.SITE_OWNER_EMAIL)?.toLowerCase() ?? null;
  const userId = clean(env.SITE_OWNER_USER_ID) ?? null;
  return email && userId ? {email, userId, role: ROLES.ROOT} : null;
}

export function isRoot(user, env = {}) {
  const root = configuredRoot(env);
  return Boolean(root && user && user.userId === root.userId && user.email === root.email);
}

export function permission(role, action, {isSystemHost = true, revoked = false} = {}) {
  if (revoked || !isSystemHost) return false;
  if (role === ROLES.ROOT) return true;
  if (role === ROLES.OWNER) return ['read-room', 'begin', 'reset-room', 'delete-room', 'manage-members', 'grant-membership', 'revoke-membership', 'game-action', 'remove-team'].includes(action);
  if (role === ROLES.COHOST) return ['read-room', 'begin', 'reset-room', 'game-action', 'remove-team'].includes(action);
  if (role === ROLES.OBSERVER) return action === 'read-room';
  return false;
}

export function canManageRoom(actor, roomId, action, options = {}) {
  if (!actor || actor.roomId !== roomId) return false;
  return permission(actor.role, action, options);
}

export function publicStudentRoom(room) {
  return {id: room.id, code: room.code, title: room.title, started: room.started ?? null, mode: room.mode};
}

export function publicTeacherRoom(room) {
  return {...publicStudentRoom(room), ownerAccountId: room.ownerAccountId ?? null, role: room.role ?? null};
}

export function auditPayload(payload = {}) {
  const forbidden = /hash|token|answer|credential|secret/i;
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !forbidden.test(key)));
}

export function shouldAudit(result) {
  return Number(result?.meta?.changes ?? 0) > 0;
}
