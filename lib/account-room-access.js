/**
 * lib/account-room-access.js
 *
 * Account-host authorization integration for app/api/escape/route.js.
 *
 * Contract:
 * - Identity comes exclusively from Sites-dispatched request headers (never body/query).
 * - Root id+email is provisioned via environment variables (SITE_OWNER_EMAIL, SITE_OWNER_USER_ID).
 * - System host "active" flag is checked fresh from the database on every teacher request.
 * - Any authenticated, non-revoked account may create rooms; system host rows are
 *   reserved for global administration and delegation.
 * - Privileges determined by resolveRoomAuthority() from lib/account-hosts.js.
 * - Room-scope cohost may exist without global host; no global create privilege from cohost.
 * - Legacy rooms (owner_account_id IS NULL) keep valid legacy admin bearer for management.
 * - Claimed/new account-owned rooms must use identity; old bearer cannot bypass revoke.
 * - No first-visitor bootstrap; no root-missing fallback granting anonymous create.
 * - No client role authority; no body/query identity.
 *
 * Action → minimum role mapping:
 *   create-room           → system host (active) or root; account-identified caller required
 *   board (GET)           → read-room
 *   begin                 → begin
 *   reset-room            → reset-room
 *   delete-room           → delete-room
 *   remove-team           → remove-team
 *   acknowledge-help      → game-action
 *   resolve-question      → game-action
 *   arena-open            → game-action
 */

import {extractSIWCUser, isRoot, permission, ROLES} from './access-control.js';
import {resolveRoomAuthority} from './account-hosts.js';

export {extractSIWCUser, isRoot, permission, ROLES, resolveRoomAuthority};

/**
 * Resolves identity from request headers only. Never reads body or query.
 * Returns {user, isRootUser} where user is null if anonymous.
 */
export function resolveIdentity(req, env) {
  const user = extractSIWCUser(req.headers);
  const rootUser = isRoot(user, env);
  return {user, isRootUser: rootUser};
}

/**
 * Fetches account authority for a given user against a room, reading live DB state.
 *
 * Parameters:
 *   stmt      - bound stmt function from storage.js
 *   user      - SIWC user object {userId, email} or null
 *   isRootUser - boolean
 *   roomId    - room primary key or null
 *   room      - pre-fetched room row or null
 *
 * Returns: { authority, systemHost, membership, room }
 */
export async function fetchAuthority(stmt, {user, isRootUser, roomId, room = null}) {
  if (!user) {
    return {authority: {role: null, isSystemHost: false, revoked: false}, systemHost: null, membership: null, room: room ?? null};
  }

  if (isRootUser) {
    const r = room ?? (roomId ? await stmt('SELECT id,code,title,started,mode,round,revision,created,owner_account_id,deleted_at FROM rooms WHERE id=?', roomId).first() : null);
    return {
      authority: {role: ROLES.ROOT, isSystemHost: true, revoked: false},
      systemHost: null,
      membership: null,
      room: r,
    };
  }

  const [systemHostRow, roomRow] = await Promise.all([
    stmt('SELECT account_id,role,created_at,revoked_at FROM system_hosts WHERE account_id=?', user.userId).first(),
    room ? Promise.resolve(room)
         : (roomId ? stmt('SELECT id,code,title,started,mode,round,revision,created,owner_account_id,deleted_at FROM rooms WHERE id=?', roomId).first()
                   : Promise.resolve(null)),
  ]);

  const membershipRow = roomId
    ? await stmt('SELECT room_id,account_id,role,granted_at,revoked_at FROM room_memberships WHERE room_id=? AND account_id=?', roomId, user.userId).first()
    : null;

  const authority = resolveRoomAuthority({
    accountId: user.userId,
    isRootUser,
    systemHost: systemHostRow,
    membership: membershipRow,
    room: roomRow,
  });

  return {authority, systemHost: systemHostRow, membership: membershipRow, room: roomRow};
}

/**
 * Returns true if authority allows the given action.
 * Revoked system hosts are denied immediately regardless of room membership.
 */
export function authorizeAction(authority, action) {
  if (!authority || !authority.role) return false;
  if (authority.revoked) return false;
  return permission(authority.role, action, {isSystemHost: authority.isSystemHost, revoked: false});
}

/**
 * Returns true if the account-identified caller may create a new room.
 * Any authenticated account may create its own account-owned room. A revoked
 * system host remains locked out immediately; this preserves root revoke semantics.
 */
export function canCreateRoom(authority, user) {
  if (!authority || !user) return false;
  if (authority.revoked) return false;
  return true;
}

/**
 * Maps a teacher action name to the minimum required permission string.
 * Returns null for actions not subject to account-based authorization (student paths).
 */
export function requiredPermission(action) {
  const map = {
    'board':            'read-room',
    'begin':            'begin',
    'reset-room':       'reset-room',
    'delete-room':      'delete-room',
    'remove-team':      'remove-team',
    'acknowledge-help': 'game-action',
    'resolve-question': 'game-action',
    'arena-open':       'game-action',
  };
  return map[action] ?? null;
}

/**
 * Builds ownership and audit rows for a newly created account-owned room.
 * Returns an array of statement objects ready for db().batch().
 *
 * Parameters:
 *   stmt      - storage stmt binder
 *   roomId    - the inserted room's id
 *   accountId - owner's account id
 *   auditId   - unique id for the admin_audit row
 *   mutationId - idempotency token for the batch
 *   now       - wall clock timestamp
 */
export function createRoomOwnershipStatements(stmt, {roomId, accountId, auditId, mutationId, now}) {
  const payload = JSON.stringify({mutationId, roomId, accountId});
  return [
    stmt(
      `INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by,revoked_at) SELECT ?,?,'owner',?,?,NULL
         WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND owner_account_id=? AND deleted_at IS NULL)
         ON CONFLICT(room_id,account_id) DO UPDATE SET role='owner',granted_at=MAX(excluded.granted_at,room_memberships.granted_at+1),granted_by=excluded.granted_by,revoked_at=NULL`,
      roomId, accountId, now, accountId, roomId, accountId,
    ),
    stmt(
      'INSERT OR IGNORE INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rooms WHERE id=?)',
      auditId, accountId, roomId, 'create-room', payload, now, roomId,
    ),
  ];
}
