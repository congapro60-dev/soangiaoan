import {env} from 'cloudflare:workers';
import {extractSIWCUser, configuredRoot, isRoot} from '../../../lib/access-control.js';
import {
  INVITE_TTL_MS, MAX_BODY_BYTES, SYSTEM_HOST_ROLES,
  normalizeEmail, requestedEmail, requestedId, inviteScope, resolveRoomAuthority,
  allows, canGrantSystemHost, canInviteRole, accountUpsert, accountEmailOwnerQuery,
  systemHostQuery, membershipQuery, roomQuery, inviteByIdQuery, inviteByTokenQuery,
  roomsForAccountQuery, membersQuery, invitesForRoomQuery, systemInvitesQuery,
  systemHostsQuery, createInviteStatements, acceptInviteStatements,
  revokeInviteStatements, revokeMembershipStatements, grantSystemHostStatements,
  revokeSystemHostStatements, claimRoomStatements, wonContention,
  publicInvite, publicMember, publicSystemHost, hostedRoom, receiptId,
} from '../../../lib/account-hosts.js';
import {db, stmt} from '../../../lib/storage.js';

export const dynamic = 'force-dynamic';

const noStore = {'Cache-Control': 'no-store'};
const json = (data: unknown, status = 200) => Response.json(data, {status, headers: noStore});
const fail = (message: string, status = 400, code?: string) => json({error: message, ...(code ? {code} : {})}, status);
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(x => x.toString(16).padStart(2, '0')).join('');
const envObject = env as unknown as Record<string, string | undefined>;

function actor(request: Request) {
  return extractSIWCUser(request.headers);
}

async function account(user: NonNullable<ReturnType<typeof actor>>, now: number) {
  const existing = await accountEmailOwnerQuery(stmt, {email: user.email}).first();
  if (existing && existing.id !== user.userId) return {error: 'Email is already bound to another account.', code: 'ACCOUNT_EMAIL_CONFLICT'} as const;
  await accountUpsert(stmt, {accountId: user.userId, email: user.email, displayName: user.displayName, now}).run();
  return {id: user.userId, email: user.email, displayName: user.displayName};
}

async function authority(user: NonNullable<ReturnType<typeof actor>>, roomId: string | null) {
  const root = isRoot(user, envObject);
  const system = await systemHostQuery(stmt, {accountId: user.userId}).first();
  const room = roomId ? await roomQuery(stmt, {roomId}).first() : null;
  const membership = roomId ? await membershipQuery(stmt, {roomId, accountId: user.userId}).first() : null;
  return {root, system, room, membership, effective: resolveRoomAuthority({accountId: user.userId, isRootUser: root, systemHost: system, membership, room})};
}

function originOK(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function authFailure(user: ReturnType<typeof actor>) {
  return user ? null : fail('Sign in with ChatGPT is required.', 401, 'AUTH_REQUIRED');
}

function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function roomAllowed(a: Awaited<ReturnType<typeof authority>>, action: string) {
  return !!a.room && !a.room.deleted_at && allows(a.effective, action);
}

function roomView(row: Record<string, unknown>, userId: string, root: boolean) {
  return hostedRoom(row, {accountId: userId, isRootUser: root});
}

export async function GET(request: Request) {
  try {
    const user = actor(request);
    const kind = new URL(request.url).searchParams.get('kind') || 'identity';
    if (kind === 'identity') {
      if (!user) return json({user: null, isRoot: false, configured: !!configuredRoot(envObject)});
      const a = await authority(user, null);
      return json({user, isRoot: a.root, configured: !!configuredRoot(envObject), systemRole: a.system?.role ?? null, revoked: !!a.system?.revoked_at});
    }
    const denied = authFailure(user);
    if (denied) return denied;
    const nowUser = user!;
    if (kind === 'rooms') {
      const root = isRoot(nowUser, envObject);
      const rows = (await roomsForAccountQuery(stmt, {accountId: nowUser.userId, isRootUser: root}).all()).results as Record<string, unknown>[];
      return json({rooms: rows.map(row => roomView(row, nowUser.userId, root))});
    }
    const roomId = requestedId(new URL(request.url).searchParams.get('roomId'));
    if (kind === 'members' || kind === 'invites') {
      if (!roomId) return fail('Missing room.', 400, 'INVALID_ROOM');
      const a = await authority(nowUser, roomId);
      if (!roomAllowed(a, 'manage-members')) return fail('Room access denied.', 403, 'FORBIDDEN');
      if (kind === 'members') return json({members: (await membersQuery(stmt, {roomId}).all()).results.map(publicMember)});
      return json({invites: (await invitesForRoomQuery(stmt, {roomId}).all()).results.map(publicInvite)});
    }
    if (kind === 'system-hosts') {
      const a = await authority(nowUser, null);
      if (!a.root) return fail('Root access required.', 403, 'FORBIDDEN');
      return json({hosts: (await systemHostsQuery(stmt).all()).results.map(publicSystemHost), invites: (await systemInvitesQuery(stmt).all()).results.map(publicInvite)});
    }
    return fail('Unknown host query.', 400, 'INVALID_QUERY');
  } catch (error) {
    console.error('hosts GET', error);
    return fail('Host service unavailable.', 503, 'HOSTS_UNAVAILABLE');
  }
}

export async function POST(request: Request) {
  try {
    if (!originOK(request)) return fail('Invalid request origin.', 403, 'INVALID_ORIGIN');
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return fail('Request is too large.', 413, 'BODY_TOO_LARGE');
    const user = actor(request);
    const denied = authFailure(user);
    if (denied) return denied;
    let body: Record<string, unknown>;
    try { body = JSON.parse(rawBody); } catch { return fail('Invalid request body.', 400, 'INVALID_BODY'); }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail('Invalid request body.', 400, 'INVALID_BODY');
    const action = requestedId(body.action, 40);
    const now = Date.now();
    const current = user!;
    const root = isRoot(current, envObject);
    const identity = await account(current, now);
    if ('error' in identity) return fail(identity.error || 'Account conflict.', 409, identity.code);

    if (action === 'create-invite') {
      const role = requestedId(body.role, 20);
      const email = requestedEmail(body.expectedEmail);
      const roomId = body.roomId == null ? null : requestedId(body.roomId);
      if (!role || !email || !inviteScope(role, roomId)) return fail('Invalid invite.', 400, 'INVALID_INVITE');
      const a = await authority(current, roomId);
      if (!canInviteRole(a.effective, role, root)) return fail('Invite permission denied.', 403, 'FORBIDDEN');
      const raw = token(), inviteId = crypto.randomUUID(), auditId = crypto.randomUUID();
      const built = createInviteStatements(stmt, {inviteId, tokenHash: await hash(raw), expectedEmail: email, role, roomId: roomId ?? null, createdBy: current.userId, rootAccountId: root ? current.userId : undefined, auditId, mutationId: crypto.randomUUID(), now, expiresAt: now + INVITE_TTL_MS} as unknown as Parameters<typeof createInviteStatements>[1]);
      const results = await db().batch(built.statements);
      if (!results[built.mutationIndex].meta.changes) return fail('Invite permission denied.', 403, 'FORBIDDEN');
      return json({invite: {id: inviteId, token: raw, expiresAt: now + INVITE_TTL_MS, role, roomId, expectedEmail: email}});
    }

    if (action === 'accept-invite') {
      const raw = typeof body.token === 'string' ? body.token : '';
      if (!raw || raw.length > 300) return fail('Invite is invalid.', 409, 'INVITE_INVALID');
      const invite = await inviteByTokenQuery(stmt, {tokenHash: await hash(raw)}).first();
      if (!invite || normalizeEmail(invite.expected_email) !== current.email || invite.accepted_at !== null || invite.revoked_at !== null || Number(invite.expires_at) <= now) return fail('Invite is invalid.', 409, 'INVITE_INVALID');
      const built = acceptInviteStatements(stmt, {invite, accountId: current.userId, email: current.email, displayName: current.displayName, mutationId: crypto.randomUUID(), receipt: receiptId('accept-invite', invite.id), rootAccountId: configuredRoot(envObject)?.userId ?? undefined, now} as unknown as Parameters<typeof acceptInviteStatements>[1]);
      const results = await db().batch(built.statements);
      if (!wonContention(results, {receiptIndex: built.receiptIndex, mutationIndex: built.consumeIndex}) || !results[built.grantIndex].meta.changes) return fail('Invite is invalid.', 409, 'INVITE_INVALID');
      return json({ok: true, role: invite.role, roomId: invite.room_id ?? null});
    }

    if (action === 'revoke-invite') {
      const inviteId = requestedId(body.inviteId);
      const invite = inviteId ? await inviteByIdQuery(stmt, {inviteId}).first() : null;
      if (!invite) return fail('Invite not found.', 404, 'NOT_FOUND');
      const a = await authority(current, invite.room_id);
      if (!(root || roomAllowed(a, 'revoke-membership'))) return fail('Invite permission denied.', 403, 'FORBIDDEN');
      const built = revokeInviteStatements(stmt, {invite, actorAccountId: current.userId, mutationId: crypto.randomUUID(), receipt: receiptId('revoke-invite', invite.id), now});
      const results = await db().batch(built.statements);
      if (!wonContention(results, {receiptIndex: built.receiptIndex, mutationIndex: built.mutationIndex})) return fail('Invite is no longer active.', 409, 'INVITE_INVALID');
      return json({ok: true});
    }

    if (action === 'revoke-membership') {
      const roomId = requestedId(body.roomId), accountId = requestedId(body.accountId), grantedAt = Number(body.grantedAt);
      if (!roomId || !accountId || !Number.isSafeInteger(grantedAt)) return fail('Invalid membership.', 400, 'INVALID_MEMBERSHIP');
      const a = await authority(current, roomId);
      if (!roomAllowed(a, 'revoke-membership')) return fail('Membership permission denied.', 403, 'FORBIDDEN');
      const built = revokeMembershipStatements(stmt, {roomId, accountId, grantedAt, actorAccountId: current.userId, mutationId: crypto.randomUUID(), receipt: receiptId('revoke-membership', roomId, accountId, grantedAt), now});
      const results = await db().batch(built.statements);
      if (!wonContention(results, {receiptIndex: built.receiptIndex, mutationIndex: built.mutationIndex})) return fail('Membership is no longer active.', 409, 'MEMBERSHIP_INVALID');
      return json({ok: true});
    }

    if (action === 'grant-system-host' || action === 'revoke-system-host') {
      if (!canGrantSystemHost({isRootUser: root})) return fail('Root access required.', 403, 'FORBIDDEN');
      const accountId = requestedId(body.accountId), target = accountId ? await systemHostQuery(stmt, {accountId}).first() : null;
      if (!accountId) return fail('Invalid account.', 400, 'INVALID_ACCOUNT');
      const role = action === 'grant-system-host' ? SYSTEM_HOST_ROLES.HOST : null;
      const built = action === 'grant-system-host'
        ? grantSystemHostStatements(stmt, {accountId, role, previousCreatedAt: target?.created_at ?? null, actorAccountId: current.userId, mutationId: crypto.randomUUID(), receipt: receiptId('grant-system-host', accountId, target?.created_at ?? 'none'), now})
        : target ? revokeSystemHostStatements(stmt, {accountId, createdAt: target.created_at, actorAccountId: current.userId, mutationId: crypto.randomUUID(), receipt: receiptId('revoke-system-host', accountId, target.created_at), now}) : null;
      if (!built) return fail('System host not found.', 404, 'NOT_FOUND');
      const results = await db().batch(built.statements);
      if (!wonContention(results, {receiptIndex: built.receiptIndex, mutationIndex: built.mutationIndex})) return fail('System host changed.', 409, 'CONFLICT');
      return json({ok: true});
    }

    if (action === 'claim-room') {
      const roomId = requestedId(body.roomId), adminKey = typeof body.adminKey === 'string' ? body.adminKey : '';
      const revision = Number(body.revision);
      if (!roomId || !adminKey || !Number.isSafeInteger(revision)) return fail('Invalid claim.', 400, 'INVALID_CLAIM');
      const a = await authority(current, null);
      if (!root && (!a.system || a.system.revoked_at)) return fail('Host access required.', 403, 'FORBIDDEN');
      const room = await roomQuery(stmt, {roomId}).first();
      const legacy = await stmt('SELECT admin_hash FROM rooms WHERE id=?', roomId).first();
      if (!room || !legacy || room.deleted_at || room.owner_account_id || room.revision !== revision || legacy.admin_hash !== await hash(adminKey)) return fail('Room claim is no longer valid.', 409, 'CLAIM_CONFLICT');
      const rotated = token() + token(), built = claimRoomStatements(stmt, {roomId, revision, expectedAdminHash: legacy.admin_hash, rotatedAdminHash: await hash(rotated), accountId: current.userId, email: current.email, displayName: current.displayName, mutationId: crypto.randomUUID(), receipt: receiptId('claim-room', roomId, revision, legacy.admin_hash), now});
      const results = await db().batch(built.statements);
      if (!wonContention(results, {receiptIndex: built.receiptIndex, mutationIndex: built.mutationIndex})) return fail('Room claim is no longer valid.', 409, 'CLAIM_CONFLICT');
      return json({ok: true, roomId});
    }
    return fail('Unknown host action.', 400, 'INVALID_ACTION');
  } catch (error) {
    console.error('hosts POST', error);
    return fail('Host service unavailable.', 503, 'HOSTS_UNAVAILABLE');
  }
}
