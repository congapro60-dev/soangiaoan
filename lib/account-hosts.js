import {auditPayload, permission, ROLES} from './access-control.js';

/**
 * Pure statement builders and policy for account-based hosting.
 *
 * Atomicity contract — receipt-owned mutations.
 * A timestamp is NOT proof of ownership: two accepts in the same millisecond
 * write the same `accepted_at`, so a loser of the consume CAS would still match
 * `accepted_at=?` and go on to grant and audit. Every repeatable mutation here
 * is therefore pinned to a receipt row in `admin_audit` whose primary key is a
 * deterministic function of the target and its current epoch. `INSERT OR IGNORE`
 * makes that primary key the single point of contention, and the receipt payload
 * carries a per-request `mutationId`. Later statements in the same batch run only
 * when they can prove `admin_audit.id = <receipt> AND payload.mutationId = <mine>`,
 * so grants and audit rows exist if and only if this request won the contention.
 *
 * Creations (invites) are instead pinned to their own freshly generated primary
 * key: only the creating request can know that id, so row existence is already
 * mutation-specific and no separate receipt is required.
 *
 * No I/O here. Callers pass a `prepare(sql, ...values)` binder and run the
 * returned statements inside one `db().batch()` transaction.
 */

export const INVITE_TTL_MS = 86400000;
export const MAX_BODY_BYTES = 4000;
export const SYSTEM_HOST_ROLES = Object.freeze({ROOT: 'root', HOST: 'host'});
export const ROOM_INVITE_ROLES = Object.freeze([ROLES.OWNER, ROLES.COHOST, ROLES.OBSERVER]);
export const SYSTEM_INVITE_ROLES = Object.freeze([SYSTEM_HOST_ROLES.HOST]);

// Receipt ownership predicate. Params: receiptId, mutationId.
const OWNS_RECEIPT = "EXISTS(SELECT 1 FROM admin_audit WHERE id=? AND json_extract(payload,'$.mutationId')=?)";

const ROOM_COLUMNS = 'id,code,title,started,mode,round,revision,created,owner_account_id,deleted_at';

export function normalizeEmail(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}

function clean(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function inviteScope(role, roomId) {
  if (roomId) return ROOM_INVITE_ROLES.includes(role) ? 'room' : null;
  return SYSTEM_INVITE_ROLES.includes(role) ? 'system' : null;
}

export function receiptId(kind, ...parts) {
  return [kind, ...parts.map(part => (part === null || part === undefined ? 'none' : String(part)))].join(':');
}

/**
 * Resolves the effective room authority for a request. A room membership alone is
 * sufficient: a cohost or observer invited to one room never needs global host
 * rights. An explicit `system_hosts` revocation is a global lockout that overrides
 * room membership and room ownership, but can never unseat the env-configured root.
 */
export function resolveRoomAuthority({accountId, isRootUser = false, systemHost = null, membership = null, room = null}) {
  if (isRootUser) return {role: ROLES.ROOT, isSystemHost: true, revoked: false};
  if (systemHost && systemHost.revoked_at !== null && systemHost.revoked_at !== undefined) {
    return {role: null, isSystemHost: false, revoked: true};
  }
  if (!room || room.deleted_at) return {role: null, isSystemHost: false, revoked: false};
  if (accountId && room.owner_account_id === accountId) return {role: ROLES.OWNER, isSystemHost: true, revoked: false};
  const live = membership && (membership.revoked_at === null || membership.revoked_at === undefined);
  if (live && [ROLES.OWNER, ROLES.COHOST, ROLES.OBSERVER].includes(membership.role)) {
    return {role: membership.role, isSystemHost: true, revoked: false};
  }
  return {role: null, isSystemHost: false, revoked: false};
}

export function allows(authority, action) {
  if (!authority || !authority.role) return false;
  return permission(authority.role, action, {isSystemHost: authority.isSystemHost, revoked: authority.revoked});
}

/** Only the env-configured root may mint system-scope host invites or grants. */
export function canGrantSystemHost({isRootUser}) {
  return isRootUser === true;
}

/** Granting the room `owner` role is reserved for root; owners delegate cohost/observer. */
export function canInviteRole(authority, role, isRootUser) {
  if (isRootUser) return true;
  if (role === ROLES.OWNER) return false;
  return allows(authority, 'grant-membership');
}

export function accountUpsert(prepare, {accountId, email, displayName, now}) {
  return prepare(
    'INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name',
    accountId, email, displayName ?? null, now,
  );
}

export function accountEmailOwnerQuery(prepare, {email}) {
  return prepare('SELECT id FROM accounts WHERE email=?', email);
}

export function systemHostQuery(prepare, {accountId}) {
  return prepare('SELECT account_id,role,created_at,created_by,revoked_at FROM system_hosts WHERE account_id=?', accountId);
}

export function membershipQuery(prepare, {roomId, accountId}) {
  return prepare('SELECT room_id,account_id,role,granted_at,granted_by,revoked_at FROM room_memberships WHERE room_id=? AND account_id=?', roomId, accountId);
}

export function roomQuery(prepare, {roomId}) {
  return prepare(`SELECT ${ROOM_COLUMNS} FROM rooms WHERE id=?`, roomId);
}

export function inviteByIdQuery(prepare, {inviteId}) {
  return prepare('SELECT id,expected_email,role,room_id,created_by,created_at,expires_at,accepted_at,revoked_at FROM host_invites WHERE id=?', inviteId);
}

/** Token hashes stay at rest: lookup is by hash and never selects the hash back out. */
export function inviteByTokenQuery(prepare, {tokenHash}) {
  return prepare('SELECT id,expected_email,role,room_id,created_by,created_at,expires_at,accepted_at,revoked_at FROM host_invites WHERE token_hash=?', tokenHash);
}

export function roomsForAccountQuery(prepare, {accountId, isRootUser}) {
  if (isRootUser) return prepare(`SELECT ${ROOM_COLUMNS},NULL AS member_role FROM rooms WHERE deleted_at IS NULL ORDER BY created DESC`);
  return prepare(
    `SELECT ${ROOM_COLUMNS},(SELECT role FROM room_memberships m WHERE m.room_id=rooms.id AND m.account_id=? AND m.revoked_at IS NULL) AS member_role
       FROM rooms WHERE deleted_at IS NULL AND (owner_account_id=? OR EXISTS(SELECT 1 FROM room_memberships m2 WHERE m2.room_id=rooms.id AND m2.account_id=? AND m2.revoked_at IS NULL))
      ORDER BY created DESC`,
    accountId, accountId, accountId,
  );
}

export function membersQuery(prepare, {roomId}) {
  return prepare('SELECT m.room_id,m.account_id,m.role,m.granted_at,m.granted_by,m.revoked_at,a.email,a.display_name FROM room_memberships m JOIN accounts a ON a.id=m.account_id WHERE m.room_id=? ORDER BY m.granted_at', roomId);
}

export function invitesForRoomQuery(prepare, {roomId}) {
  return prepare('SELECT id,expected_email,role,room_id,created_by,created_at,expires_at,accepted_at,revoked_at FROM host_invites WHERE room_id=? ORDER BY created_at DESC', roomId);
}

export function systemInvitesQuery(prepare) {
  return prepare('SELECT id,expected_email,role,room_id,created_by,created_at,expires_at,accepted_at,revoked_at FROM host_invites WHERE room_id IS NULL ORDER BY created_at DESC', );
}

export function systemHostsQuery(prepare) {
  return prepare('SELECT s.account_id,s.role,s.created_at,s.created_by,s.revoked_at,a.email,a.display_name FROM system_hosts s JOIN accounts a ON a.id=s.account_id ORDER BY s.created_at');
}

/**
 * Creates an invite. The fresh `host_invites.id` is the mutation proof, so the
 * audit row is conditional on that id existing: no other request can produce it.
 * Issuer authority is re-asserted inside SQL so a creator revoked between the
 * authorization read and the write cannot mint a usable token.
 */
export function createInviteStatements(prepare, {inviteId, tokenHash, expectedEmail, role, roomId = null, createdBy, rootAccountId = null, auditId, mutationId, now, expiresAt}) {
  const root = rootAccountId ?? '';
  const insert = roomId
    ? prepare(
      `INSERT INTO host_invites(id,token_hash,expected_email,role,room_id,created_by,created_at,expires_at,accepted_at,revoked_at)
         SELECT ?,?,?,?,?,?,?,?,NULL,NULL WHERE EXISTS(
           SELECT 1 FROM rooms r WHERE r.id=? AND r.deleted_at IS NULL
             AND NOT EXISTS(SELECT 1 FROM system_hosts bl WHERE bl.account_id=? AND bl.revoked_at IS NOT NULL AND ?<>?)
             AND (?=? OR r.owner_account_id=? OR EXISTS(SELECT 1 FROM room_memberships m WHERE m.room_id=r.id AND m.account_id=? AND m.role='owner' AND m.revoked_at IS NULL))
             AND (?=? OR EXISTS(SELECT 1 FROM system_hosts sh WHERE sh.account_id=? AND sh.revoked_at IS NULL) OR r.owner_account_id=? OR EXISTS(SELECT 1 FROM room_memberships m2 WHERE m2.room_id=r.id AND m2.account_id=? AND m2.role='owner' AND m2.revoked_at IS NULL)))`,
      inviteId, tokenHash, expectedEmail, role, roomId, createdBy, now, expiresAt,
      roomId,
      createdBy, createdBy, root,
      createdBy, root, createdBy, createdBy,
      createdBy, root, createdBy, createdBy, createdBy,
    )
    : prepare(
      `INSERT INTO host_invites(id,token_hash,expected_email,role,room_id,created_by,created_at,expires_at,accepted_at,revoked_at)
         SELECT ?,?,?,?,NULL,?,?,?,NULL,NULL WHERE ?=?`,
      inviteId, tokenHash, expectedEmail, role, createdBy, now, expiresAt,
      createdBy, root,
    );
  const payload = JSON.stringify(auditPayload({mutationId, inviteId, role, roomId, scope: roomId ? 'room' : 'system', expiresAt}));
  return {
    statements: [
      insert,
      prepare(
        'INSERT OR IGNORE INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM host_invites WHERE id=?)',
        auditId, createdBy, roomId, 'create-invite', payload, now, inviteId,
      ),
    ],
    mutationIndex: 0,
    auditIndex: 1,
  };
}

/**
 * Consumes an invite exactly once and grants exactly the invited scope.
 *
 * Statement order: account upsert (FK parent) → receipt → consume → grant.
 * The receipt INSERT carries every precondition: unaccepted, unrevoked, unexpired,
 * email-bound to the live SIWC identity, scope-consistent, room still present, and
 * issuer authority still live. Because the batch is one transaction, nothing can
 * invalidate those between the receipt and the grant, so receipt ownership is a
 * sound proof that this request performed the consume.
 *
 * A room-scoped invite can only reach `room_memberships` and a system-scoped invite
 * can only reach `system_hosts`: the two grant statements carry mutually exclusive
 * `room_id IS NOT NULL` / `IS NULL` predicates, so a room role can never escalate
 * into a global host grant.
 */
export function acceptInviteStatements(prepare, {invite, accountId, email, displayName, mutationId, receipt, rootAccountId = null, now}) {
  const roomId = invite.room_id ?? null;
  const scope = inviteScope(invite.role, roomId);
  if (!scope) throw Error('Unsupported invite scope');
  const root = rootAccountId ?? '';
  const guard = scope === 'room'
    ? {
      sql: `SELECT 1 FROM host_invites i JOIN rooms r ON r.id=i.room_id
              WHERE i.id=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? AND i.expected_email=?
                AND i.room_id IS NOT NULL AND i.role IN ('owner','cohost','observer') AND r.deleted_at IS NULL
                AND (i.created_by=? OR NOT EXISTS(SELECT 1 FROM system_hosts bl WHERE bl.account_id=i.created_by AND bl.revoked_at IS NOT NULL))
                AND (i.created_by=? OR EXISTS(SELECT 1 FROM system_hosts sh WHERE sh.account_id=i.created_by AND sh.revoked_at IS NULL)
                     OR r.owner_account_id=i.created_by
                     OR EXISTS(SELECT 1 FROM room_memberships m WHERE m.room_id=i.room_id AND m.account_id=i.created_by AND m.role='owner' AND m.revoked_at IS NULL))`,
      params: [invite.id, now, email, root, root],
    }
    : {
      sql: `SELECT 1 FROM host_invites i
              WHERE i.id=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? AND i.expected_email=?
                AND i.room_id IS NULL AND i.role IN ('host')
                AND i.created_by=?`,
      params: [invite.id, now, email, root],
    };
  const payload = JSON.stringify(auditPayload({mutationId, inviteId: invite.id, role: invite.role, roomId, scope}));
  const grant = scope === 'room'
    ? prepare(
      `INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by,revoked_at)
         SELECT i.room_id,?,i.role,?,i.created_by,NULL FROM host_invites i
          WHERE i.id=? AND i.room_id IS NOT NULL AND i.accepted_at IS NOT NULL AND ${OWNS_RECEIPT}
         ON CONFLICT(room_id,account_id) DO UPDATE SET role=excluded.role,granted_at=MAX(excluded.granted_at,room_memberships.granted_at+1),granted_by=excluded.granted_by,revoked_at=NULL`,
      accountId, now, invite.id, receipt, mutationId,
    )
    : prepare(
      `INSERT INTO system_hosts(account_id,role,created_at,created_by,revoked_at)
         SELECT ?,i.role,?,i.created_by,NULL FROM host_invites i
          WHERE i.id=? AND i.room_id IS NULL AND i.accepted_at IS NOT NULL AND ${OWNS_RECEIPT}
         ON CONFLICT(account_id) DO UPDATE SET role=excluded.role,created_at=MAX(excluded.created_at,system_hosts.created_at+1),created_by=excluded.created_by,revoked_at=NULL`,
      accountId, now, invite.id, receipt, mutationId,
    );
  return {
    statements: [
      accountUpsert(prepare, {accountId, email, displayName, now}),
      prepare(
        `INSERT OR IGNORE INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(${guard.sql})`,
        receipt, accountId, roomId, 'accept-invite', payload, now, ...guard.params,
      ),
      prepare(
        `UPDATE host_invites SET accepted_at=? WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL AND ${OWNS_RECEIPT}`,
        now, invite.id, receipt, mutationId,
      ),
      grant,
    ],
    receiptIndex: 1,
    consumeIndex: 2,
    grantIndex: 3,
    scope,
  };
}

/** Revoking an unused invite is a once-per-invite mutation, so the invite id pins the receipt. */
export function revokeInviteStatements(prepare, {invite, actorAccountId, mutationId, receipt, now}) {
  const payload = JSON.stringify(auditPayload({mutationId, inviteId: invite.id, role: invite.role, roomId: invite.room_id ?? null}));
  return {
    statements: [
      prepare(
        `INSERT OR IGNORE INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,?
           WHERE EXISTS(SELECT 1 FROM host_invites WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL)`,
        receipt, actorAccountId, invite.room_id ?? null, 'revoke-invite', payload, now, invite.id,
      ),
      prepare(
        `UPDATE host_invites SET revoked_at=? WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL AND ${OWNS_RECEIPT}`,
        now, invite.id, receipt, mutationId,
      ),
    ],
    receiptIndex: 0,
    mutationIndex: 1,
  };
}

/**
 * Revokes a room membership. Grant/revoke repeats over time, so the receipt key
 * carries the membership's `granted_at` epoch: a re-grant produces a new epoch and
 * therefore a new receipt key, while two revokes of the same grant contend on one.
 * Grant epochs advance monotonically, even when Date.now() has not advanced.
 * Treat granted_at/created_at as version tokens; never rewrite them from the clock.
 */
export function revokeMembershipStatements(prepare, {roomId, accountId, grantedAt, actorAccountId, mutationId, receipt, now}) {
  const payload = JSON.stringify(auditPayload({mutationId, accountId, roomId, grantedAt}));
  return {
    statements: [
      prepare(
        `INSERT OR IGNORE INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,?
           WHERE EXISTS(SELECT 1 FROM room_memberships WHERE room_id=? AND account_id=? AND granted_at=? AND revoked_at IS NULL)`,
        receipt, actorAccountId, roomId, 'revoke-membership', payload, now, roomId, accountId, grantedAt,
      ),
      prepare(
        `UPDATE room_memberships SET revoked_at=? WHERE room_id=? AND account_id=? AND granted_at=? AND revoked_at IS NULL AND ${OWNS_RECEIPT}`,
        now, roomId, accountId, grantedAt, receipt, mutationId,
      ),
    ],
    receiptIndex: 0,
    mutationIndex: 1,
  };
}

/** Root-only direct system host grant. The receipt key carries the prior row epoch. */
export function grantSystemHostStatements(prepare, {accountId, role, previousCreatedAt = null, actorAccountId, mutationId, receipt, now}) {
  const payload = JSON.stringify(auditPayload({mutationId, accountId, role, previousCreatedAt}));
  const guard = previousCreatedAt === null
    ? {sql: 'SELECT 1 FROM accounts WHERE id=? AND NOT EXISTS(SELECT 1 FROM system_hosts WHERE account_id=?)', params: [accountId, accountId]}
    : {sql: 'SELECT 1 FROM system_hosts WHERE account_id=? AND created_at=?', params: [accountId, previousCreatedAt]};
  return {
    statements: [
      prepare(
        `INSERT OR IGNORE INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,NULL,?,?,? WHERE EXISTS(${guard.sql})`,
        receipt, actorAccountId, 'grant-system-host', payload, now, ...guard.params,
      ),
      prepare(
        `INSERT INTO system_hosts(account_id,role,created_at,created_by,revoked_at) SELECT ?,?,?,?,NULL WHERE ${OWNS_RECEIPT}
           ON CONFLICT(account_id) DO UPDATE SET role=excluded.role,created_at=MAX(excluded.created_at,system_hosts.created_at+1),created_by=excluded.created_by,revoked_at=NULL`,
        accountId, role, now, actorAccountId, receipt, mutationId,
      ),
    ],
    receiptIndex: 0,
    mutationIndex: 1,
  };
}

/** Immediate global lockout. The receipt key carries the row's `created_at` epoch. */
export function revokeSystemHostStatements(prepare, {accountId, createdAt, actorAccountId, mutationId, receipt, now}) {
  const payload = JSON.stringify(auditPayload({mutationId, accountId, createdAt}));
  return {
    statements: [
      prepare(
        `INSERT OR IGNORE INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,NULL,?,?,?
           WHERE EXISTS(SELECT 1 FROM system_hosts WHERE account_id=? AND created_at=? AND revoked_at IS NULL)`,
        receipt, actorAccountId, 'revoke-system-host', payload, now, accountId, createdAt,
      ),
      prepare(
        `UPDATE system_hosts SET revoked_at=? WHERE account_id=? AND created_at=? AND revoked_at IS NULL AND ${OWNS_RECEIPT}`,
        now, accountId, createdAt, receipt, mutationId,
      ),
    ],
    receiptIndex: 0,
    mutationIndex: 1,
  };
}

/**
 * Claims a legacy admin-key room into an account and rotates the admin hash.
 *
 * Replaces `lib/host-service.js` `claimRoomStatements`, whose audit predicate
 * (`owner_account_id=? AND revision=?`) is satisfiable by a request that changed
 * nothing when the same account claims concurrently, producing a duplicate audit
 * row for one mutation. Here the receipt key is the room id, so the audit row and
 * the rotation are both owned by a single winning request.
 *
 * The rotated hash is server-generated and never returned, which invalidates the
 * old bearer. The expected hash is compared in SQL so the check cannot drift from
 * the mutation.
 */
export function claimRoomStatements(prepare, {roomId, revision, expectedAdminHash, rotatedAdminHash, accountId, email, displayName, mutationId, receipt, now}) {
  const payload = JSON.stringify(auditPayload({mutationId, roomId, revision}));
  return {
    statements: [
      accountUpsert(prepare, {accountId, email, displayName, now}),
      prepare(
        `INSERT OR IGNORE INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,?
           WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND revision=? AND admin_hash=? AND owner_account_id IS NULL AND deleted_at IS NULL)`,
        receipt, accountId, roomId, 'claim-room', payload, now, roomId, revision, expectedAdminHash,
      ),
      prepare(
        `UPDATE rooms SET owner_account_id=?,admin_hash=?,revision=revision+1
           WHERE id=? AND revision=? AND admin_hash=? AND owner_account_id IS NULL AND deleted_at IS NULL AND ${OWNS_RECEIPT}`,
        accountId, rotatedAdminHash, roomId, revision, expectedAdminHash, receipt, mutationId,
      ),
      prepare(
        `INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by,revoked_at)
           SELECT ?,?,'owner',?,?,NULL WHERE ${OWNS_RECEIPT} AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND owner_account_id=?)
           ON CONFLICT(room_id,account_id) DO UPDATE SET role='owner',granted_at=MAX(excluded.granted_at,room_memberships.granted_at+1),granted_by=excluded.granted_by,revoked_at=NULL`,
        roomId, accountId, now, accountId, receipt, mutationId, roomId, accountId,
      ),
    ],
    receiptIndex: 1,
    mutationIndex: 2,
    grantIndex: 3,
  };
}

/** A mutation counts only when its receipt and its own write both changed one row. */
export function wonContention(results, {receiptIndex, mutationIndex}) {
  const changes = index => Number(results?.[index]?.meta?.changes ?? 0);
  return changes(receiptIndex) === 1 && changes(mutationIndex) >= 1;
}

export function publicInvite(row) {
  return {
    id: row.id,
    expectedEmail: row.expected_email,
    role: row.role,
    roomId: row.room_id ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? null,
    revokedAt: row.revoked_at ?? null,
  };
}

export function publicMember(row) {
  return {
    roomId: row.room_id,
    accountId: row.account_id,
    email: row.email ?? null,
    displayName: row.display_name ?? null,
    role: row.role,
    grantedAt: row.granted_at,
    grantedBy: row.granted_by ?? null,
    revokedAt: row.revoked_at ?? null,
  };
}

export function publicSystemHost(row) {
  return {
    accountId: row.account_id,
    email: row.email ?? null,
    displayName: row.display_name ?? null,
    role: row.role,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
    revokedAt: row.revoked_at ?? null,
  };
}

export function hostedRoom(row, {accountId, isRootUser}) {
  const authority = resolveRoomAuthority({
    accountId,
    isRootUser,
    membership: row.member_role ? {role: row.member_role, revoked_at: null} : null,
    room: row,
  });
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    started: row.started ?? null,
    mode: row.mode,
    round: row.round,
    revision: row.revision,
    created: row.created,
    ownerAccountId: row.owner_account_id ?? null,
    role: authority.role,
  };
}

export function requestedEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function requestedId(value, limit = 70) {
  const id = clean(value);
  if (!id || id.length > limit || ['__proto__', 'constructor', 'prototype'].includes(id)) return null;
  return id;
}
