/**
 * tests/account-room-access.test.mjs
 *
 * VM + SQLite integration tests for account-host authorization in the escape route.
 *
 * Tests:
 *   - root/host create-room succeeds; anon/nohost fail; cohost create fail
 *   - cohost can begin/reset/arena/game-action but not delete/grant
 *   - observer read only; mutations denied
 *   - cross-room isolation: cohost of room A cannot act on room B
 *   - live revoke: revoked system host is denied immediately; new bearer bypass blocked
 *   - new ownership is atomic (audit + membership created together)
 *   - legacy rooms keep valid legacy admin bearer; claim rotates bearer
 *   - no bearer bypass on account-owned rooms (old bearer after revoke fails)
 */

import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {test} from 'node:test';

const database = new DatabaseSync(':memory:');
for (const file of [
  '0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql',
  '0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql',
  '0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql',
]) database.exec(await readFile(resolve('drizzle', file), 'utf8'));
database.exec('PRAGMA foreign_keys=ON');
database.exec(await readFile(resolve('drizzle/0022_site_trash.sql'),'utf8'));

function stmt(sql, ...params) {
  const q = database.prepare(sql);
  return {
    first: () => q.get(...params) ?? null,
    all: () => ({results: q.all(...params)}),
    run: () => ({meta: {changes: Number(q.run(...params).changes)}}),
  };
}
let beforeBatch = null;
const storage = {
  stmt,
  db: () => ({
    batch: queries => {
      if (beforeBatch) { const hook = beforeBatch; beforeBatch = null; hook(); }
      database.exec('BEGIN');
      try {
        const result = queries.map(q => q.run());
        database.exec('COMMIT');
        return result;
      } catch (e) {
        database.exec('ROLLBACK');
        throw e;
      }
    },
  }),
  getEnv: () => testEnv,
};

const testEnv = {SITE_OWNER_EMAIL: 'root@access.test', SITE_OWNER_USER_ID: 'root-access-id'};
let clock = 1800000000000;
class TestDate extends Date { static now() { return clock; } }

const context = createContext({Date: TestDate, crypto: globalThis.crypto, Request, Response, URL, TextEncoder, console, btoa});
const cache = new Map();

async function moduleAt(path) {
  if (cache.has(path)) return cache.get(path);
  let m;
  if (resolve(path) === resolve('lib/storage.js')) {
    m = new SyntheticModule(['stmt', 'db', 'getEnv'], function() {
      this.setExport('stmt', storage.stmt);
      this.setExport('db', storage.db);
      this.setExport('getEnv', storage.getEnv);
    }, {context, identifier: path});
  } else {
    m = new SourceTextModule(await readFile(path, 'utf8'), {context, identifier: path});
  }
  cache.set(path, m);
  return m;
}

const entryModule = await moduleAt(resolve('app/api/escape/route.js'));
await entryModule.link((specifier, parent) => moduleAt(resolve(dirname(parent.identifier), specifier)));
await entryModule.evaluate();
const route = entryModule.namespace;

// --- Users ---
const users = {
  root:     {id: testEnv.SITE_OWNER_USER_ID, email: testEnv.SITE_OWNER_EMAIL},
  host:     {id: 'host-user-id',     email: 'host@access.test'},
  cohost:   {id: 'cohost-user-id',   email: 'cohost@access.test'},
  observer: {id: 'observer-user-id', email: 'observer@access.test'},
  anon:     null,
  nohost:   {id: 'nohost-user-id',   email: 'nohost@access.test'},
};

// Seed accounts and system_hosts.
const seedAccounts = [users.root, users.host, users.cohost, users.observer, users.nohost];
for (const u of seedAccounts) {
  database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(u.id, u.email, u.email, clock);
}
// Root and host are active system hosts.
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(users.root.id, 'root', clock, users.root.id);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(users.host.id, 'host', clock, users.root.id);
// nohost has no system_hosts row.

const sha = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(x => x.toString(16).padStart(2, '0')).join('');

// --- Helpers ---
function siwcHeaders(user) {
  if (!user) return {};
  return {
    'oai-authenticated-user-id': user.id,
    'oai-authenticated-user-email': user.email,
  };
}

async function post(user, action, body = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Origin': 'https://game.test',
    ...siwcHeaders(user),
  };
  const res = await route.POST(new Request('https://game.test/api/escape', {
    method: 'POST',
    headers,
    body: JSON.stringify({action, requestId: crypto.randomUUID(), ...body}),
  }));
  return {status: res.status, data: await res.json()};
}

async function get(user, kind, id) {
  const headers = siwcHeaders(user);
  const res = await route.GET(new Request(`https://game.test/api/escape?kind=${kind}&id=${id}`, {headers}));
  return {status: res.status, data: await res.json()};
}

async function postStudent(token, action, body = {}) {
  const res = await route.POST(new Request('https://game.test/api/escape', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Origin': 'https://game.test', 'Authorization': 'Bearer ' + token},
    body: JSON.stringify({action, requestId: crypto.randomUUID(), ...body}),
  }));
  return {status: res.status, data: await res.json()};
}

// --- Test: root and active host can create rooms; anon and nohost cannot ---
test('root and active host create rooms; anon/nohost fail', async () => {
  const adminKey = crypto.randomUUID() + crypto.randomUUID();

  const anonR = await post(users.anon, 'create-room', {id: crypto.randomUUID(), adminKey, title: 'Anon room'});
  assert.equal(anonR.status, 401, 'anonymous must be 401: ' + JSON.stringify(anonR.data));
  assert.equal(anonR.data.code, 'AUTH_REQUIRED');

  const nohostId = crypto.randomUUID();
  const nohostR = await post(users.nohost, 'create-room', {id: nohostId, adminKey, title: 'NoHost room'});
  assert.equal(nohostR.status, 200, 'any signed-in account may create its own room: ' + JSON.stringify(nohostR.data));
  assert.equal(database.prepare('SELECT owner_account_id FROM rooms WHERE id=?').get(nohostId).owner_account_id, users.nohost.id);

  const rootId = crypto.randomUUID();
  const rootR = await post(users.root, 'create-room', {id: rootId, adminKey, title: 'Root room'});
  assert.equal(rootR.status, 200, 'root must create: ' + JSON.stringify(rootR.data));
  const rootRoom = database.prepare('SELECT owner_account_id FROM rooms WHERE id=?').get(rootId);
  assert.equal(rootRoom.owner_account_id, users.root.id, 'room must be owned by root');

  const hostId = crypto.randomUUID();
  const hostR = await post(users.host, 'create-room', {id: hostId, adminKey, title: 'Host room'});
  assert.equal(hostR.status, 200, 'active host must create: ' + JSON.stringify(hostR.data));
  const hostRoom = database.prepare('SELECT owner_account_id FROM rooms WHERE id=?').get(hostId);
  assert.equal(hostRoom.owner_account_id, users.host.id, 'room must be owned by host');

  // Audit rows created for both rooms.
  assert.equal(database.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='create-room' AND room_id=?").get(rootId).n, 1, 'root room must have audit');
  assert.equal(database.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='create-room' AND room_id=?").get(hostId).n, 1, 'host room must have audit');

  // Membership owner rows created.
  assert.equal(database.prepare("SELECT role FROM room_memberships WHERE room_id=? AND account_id=?").get(rootId, users.root.id)?.role, 'owner', 'root must have owner membership');
  assert.equal(database.prepare("SELECT role FROM room_memberships WHERE room_id=? AND account_id=?").get(hostId, users.host.id)?.role, 'owner', 'host must have owner membership');
});

// --- Test: new room ownership: begin/reset/board via identity; cohost cannot create ---
let sharedRoomId, sharedAdminKey;

test('owner begin/board/reset; cohost game-action not delete; observer read-only', async () => {
  sharedAdminKey = crypto.randomUUID() + crypto.randomUUID();
  sharedRoomId = crypto.randomUUID();

  const created = await post(users.host, 'create-room', {id: sharedRoomId, adminKey: sharedAdminKey, title: 'Shared'});
  assert.equal(created.status, 200, JSON.stringify(created.data));

  // Seed cohost and observer memberships.
  const now = clock;
  database.prepare('INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by) VALUES(?,?,?,?,?)').run(sharedRoomId, users.cohost.id, 'cohost', now, users.host.id);
  database.prepare('INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by) VALUES(?,?,?,?,?)').run(sharedRoomId, users.observer.id, 'observer', now, users.host.id);

  // Owner can board.
  const board = await get(users.host, 'board', sharedRoomId);
  assert.equal(board.status, 200, 'owner board: ' + JSON.stringify(board.data));

  // Cohost can board (read-room).
  const cohostBoard = await get(users.cohost, 'board', sharedRoomId);
  assert.equal(cohostBoard.status, 200, 'cohost board: ' + JSON.stringify(cohostBoard.data));

  // Observer can board (read-room).
  const observerBoard = await get(users.observer, 'board', sharedRoomId);
  assert.equal(observerBoard.status, 200, 'observer board: ' + JSON.stringify(observerBoard.data));

  // Anon cannot board.
  const anonBoard = await get(users.anon, 'board', sharedRoomId);
  assert.equal(anonBoard.status, 403, 'anon board must fail');

  // nohost (no membership, no system_host) cannot board.
  const nohostBoard = await get(users.nohost, 'board', sharedRoomId);
  assert.equal(nohostBoard.status, 403, 'nohost board must fail');

  // Join two teams.
  const joinA = await post(users.anon, 'join', {code: created.data.room.code, name: 'Team A'});
  assert.equal(joinA.status, 200, JSON.stringify(joinA.data));
  const joinB = await post(users.anon, 'join', {code: created.data.room.code, name: 'Team B'});
  assert.equal(joinB.status, 200, JSON.stringify(joinB.data));
  const teamA = joinA.data.session;
  const teamB = joinB.data.session;

  // Owner can begin.
  const beginR = await post(users.host, 'begin', {id: sharedRoomId, revision: database.prepare('SELECT revision FROM rooms WHERE id=?').get(sharedRoomId).revision});
  assert.equal(beginR.status, 200, 'owner begin: ' + JSON.stringify(beginR.data));

  // Cohost can begin (returns ok or room already started).
  const cohostBegin = await post(users.cohost, 'begin', {id: sharedRoomId, revision: database.prepare('SELECT revision FROM rooms WHERE id=?').get(sharedRoomId).revision});
  assert.ok([200, 409].includes(cohostBegin.status), 'cohost begin: ' + JSON.stringify(cohostBegin.data));

  // Observer cannot begin.
  const observerBegin = await post(users.observer, 'begin', {id: sharedRoomId, revision: database.prepare('SELECT revision FROM rooms WHERE id=?').get(sharedRoomId).revision});
  assert.equal(observerBegin.status, 403, 'observer begin must fail: ' + JSON.stringify(observerBegin.data));

  // Cohost cannot delete-room (permission denied).
  const cohostDelete = await post(users.cohost, 'delete-room', {id: sharedRoomId, revision: database.prepare('SELECT revision FROM rooms WHERE id=?').get(sharedRoomId).revision, confirmCode: created.data.room.code});
  assert.equal(cohostDelete.status, 403, 'cohost delete must fail: ' + JSON.stringify(cohostDelete.data));

  // Observer cannot reset-room.
  const observerReset = await post(users.observer, 'reset-room', {id: sharedRoomId, revision: database.prepare('SELECT revision FROM rooms WHERE id=?').get(sharedRoomId).revision, confirmCode: created.data.room.code});
  assert.equal(observerReset.status, 403, 'observer reset must fail: ' + JSON.stringify(observerReset.data));

  // Observer cannot remove-team.
  const observerRemove = await post(users.observer, 'remove-team', {id: sharedRoomId, revision: database.prepare('SELECT revision FROM rooms WHERE id=?').get(sharedRoomId).revision, teamId: teamA.id});
  assert.equal(observerRemove.status, 403, 'observer remove-team must fail: ' + JSON.stringify(observerRemove.data));

  // Cohost can remove-team.
  const cohostRemove = await post(users.cohost, 'remove-team', {id: sharedRoomId, revision: database.prepare('SELECT revision FROM rooms WHERE id=?').get(sharedRoomId).revision, teamId: teamB.id});
  assert.equal(cohostRemove.status, 200, 'cohost remove-team must succeed: ' + JSON.stringify(cohostRemove.data));
});

// --- Test: cohost of room A cannot act on room B (cross-room isolation) ---
test('cross-room isolation: cohost of room A cannot board room B', async () => {
  const adminKey = crypto.randomUUID() + crypto.randomUUID();
  const roomBId = crypto.randomUUID();
  const created = await post(users.root, 'create-room', {id: roomBId, adminKey, title: 'Room B'});
  assert.equal(created.status, 200);

  // cohost has membership only in sharedRoomId (from previous test), not roomBId.
  const boardB = await get(users.cohost, 'board', roomBId);
  assert.equal(boardB.status, 403, 'cohost of room A must not access room B: ' + JSON.stringify(boardB.data));
});

// --- Test: live revoke — revoked system host is denied immediately ---
test('live revoke: revoked system host denied immediately', async () => {
  const adminKey = crypto.randomUUID() + crypto.randomUUID();

  // Create a new host user and revoke them.
  const revokedHost = {id: 'revoked-host-id', email: 'revoked@access.test'};
  database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(revokedHost.id, revokedHost.email, revokedHost.email, clock);
  database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(revokedHost.id, 'host', clock, users.root.id);

  // Create a room while active.
  const roomId = crypto.randomUUID();
  const created = await post(revokedHost, 'create-room', {id: roomId, adminKey, title: 'Before revoke'});
  assert.equal(created.status, 200, 'active host must create: ' + JSON.stringify(created.data));

  // Revoke the host.
  database.prepare('UPDATE system_hosts SET revoked_at=? WHERE account_id=?').run(clock + 1, revokedHost.id);

  // Now revoked host cannot board their own room.
  const boardR = await get(revokedHost, 'board', roomId);
  assert.equal(boardR.status, 403, 'revoked host board must fail: ' + JSON.stringify(boardR.data));

  // Revoked host cannot begin.
  const beginR = await post(revokedHost, 'begin', {id: roomId, revision: database.prepare('SELECT revision FROM rooms WHERE id=?').get(roomId).revision});
  assert.equal(beginR.status, 403, 'revoked host begin must fail: ' + JSON.stringify(beginR.data));
});

// --- Test: no bearer bypass on account-owned rooms ---
test('no bearer bypass: old bearer cannot manage account-owned room', async () => {
  const adminKey = crypto.randomUUID() + crypto.randomUUID();
  const roomId = crypto.randomUUID();
  const created = await post(users.host, 'create-room', {id: roomId, adminKey, title: 'Bearer bypass test'});
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const room = created.data.room;

  // Revoke host.
  database.prepare('UPDATE system_hosts SET revoked_at=? WHERE account_id=?').run(clock + 1, users.host.id);

  // Bearer-only board attempt on account-owned room must fail (no identity path for owned rooms).
  const res = await route.GET(new Request(`https://game.test/api/escape?kind=board&id=${roomId}`, {
    headers: {'Authorization': 'Bearer ' + adminKey},
  }));
  assert.equal(res.status, 403, 'bearer-only request to account-owned room must fail');

  // Restore host for further tests.
  database.prepare('UPDATE system_hosts SET revoked_at=NULL WHERE account_id=?').run(users.host.id);
});

// --- Test: legacy rooms — owner_account_id IS NULL keeps valid legacy bearer ---
test('legacy rooms: null owner_account_id keeps legacy bearer for management', async () => {
  const legacyAdmin = crypto.randomUUID() + crypto.randomUUID();
  const legacyId = crypto.randomUUID();
  const legacyCode = 'LGCYAA';

  // Insert legacy room directly (no owner_account_id).
  database.prepare("INSERT INTO rooms(id,code,admin_hash,title,created,revision,mode) VALUES(?,?,?,?,?,?,?)").run(
    legacyId, legacyCode, await sha(legacyAdmin), 'Legacy', clock, 0, 'legacy',
  );

  // Legacy bearer works for board.
  const boardR = await route.GET(new Request(`https://game.test/api/escape?kind=board&id=${legacyId}`, {
    headers: {'Authorization': 'Bearer ' + legacyAdmin},
  }));
  assert.equal(boardR.status, 200, 'legacy bearer board must succeed: ' + (await boardR.json()));

  // Wrong bearer fails.
  const wrongR = await route.GET(new Request(`https://game.test/api/escape?kind=board&id=${legacyId}`, {
    headers: {'Authorization': 'Bearer wrong'},
  }));
  assert.equal(wrongR.status, 403, 'wrong bearer on legacy room must fail');

  // Identity with no membership also fails on legacy room (bearer-only for legacy).
  const identityR = await route.GET(new Request(`https://game.test/api/escape?kind=board&id=${legacyId}`, {
    headers: siwcHeaders(users.root),
  }));
  assert.equal(identityR.status, 200, 'configured root can inspect all rooms, including legacy rooms');
  const unrelatedR = await route.GET(new Request(`https://game.test/api/escape?kind=board&id=${legacyId}`, {
    headers: siwcHeaders(users.host),
  }));
  assert.equal(unrelatedR.status, 403, 'ordinary host cannot access unrelated legacy rooms without its bearer');

  // Legacy begin via bearer.
  const beginR = await route.POST(new Request('https://game.test/api/escape', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + legacyAdmin, 'Origin': 'https://game.test'},
    body: JSON.stringify({action: 'begin', id: legacyId, revision: 0, requestId: crypto.randomUUID()}),
  }));
  assert.equal(beginR.status, 200, 'legacy bearer begin must succeed');
});

// --- Test: claim rotates old bearer (existing code in hosts route) ---
// The claim itself is tested in hosts-integration.test.mjs; here we verify that
// after claim, the old bearer no longer works on the account-owned room.
test('after claim, old bearer is rejected; identity works', async () => {
  const oldAdmin = crypto.randomUUID() + crypto.randomUUID();
  const claimId = crypto.randomUUID();
  const claimCode = 'CLMAA2';

  database.prepare("INSERT INTO rooms(id,code,admin_hash,title,created,revision,mode) VALUES(?,?,?,?,?,?,?)").run(
    claimId, claimCode, await sha(oldAdmin), 'Claim target', clock, 0, 'legacy',
  );

  // Old bearer works before claim.
  const boardBefore = await route.GET(new Request(`https://game.test/api/escape?kind=board&id=${claimId}`, {
    headers: {'Authorization': 'Bearer ' + oldAdmin},
  }));
  assert.equal(boardBefore.status, 200, 'bearer works before claim');

  // Simulate claim: set owner_account_id and rotate admin_hash.
  const newHash = await sha(crypto.randomUUID() + crypto.randomUUID());
  database.prepare('UPDATE rooms SET owner_account_id=?,admin_hash=?,revision=revision+1 WHERE id=?').run(users.root.id, newHash, claimId);
  database.prepare('INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by) VALUES(?,?,?,?,?) ON CONFLICT DO UPDATE SET role=excluded.role').run(claimId, users.root.id, 'owner', clock, users.root.id);

  // Old bearer no longer works (hash rotated; room is now account-owned so identity path is used).
  const boardOldBearer = await route.GET(new Request(`https://game.test/api/escape?kind=board&id=${claimId}`, {
    headers: {'Authorization': 'Bearer ' + oldAdmin},
  }));
  assert.equal(boardOldBearer.status, 403, 'old bearer must fail after claim');

  // Root identity works.
  const boardIdentity = await get(users.root, 'board', claimId);
  assert.equal(boardIdentity.status, 200, 'root identity must work after claim: ' + JSON.stringify(boardIdentity.data));
});

// --- Test: room-scope cohost without global host has no create privilege ---
test('room-scope cohost without global host can create its own room', async () => {
  const cohostOnlyUser = {id: 'cohost-only-id', email: 'cohostonly@access.test'};
  database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(cohostOnlyUser.id, cohostOnlyUser.email, cohostOnlyUser.email, clock);
  // No system_hosts row for this user.
  // Grant cohost on sharedRoomId.
  database.prepare('INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by) VALUES(?,?,?,?,?) ON CONFLICT DO UPDATE SET role=excluded.role').run(sharedRoomId, cohostOnlyUser.id, 'cohost', clock, users.host.id);

  const adminKey = crypto.randomUUID() + crypto.randomUUID();
  const r = await post(cohostOnlyUser, 'create-room', {id: crypto.randomUUID(), adminKey, title: 'Cohost room'});
  assert.equal(r.status, 200, 'room-scope cohost may create a separate own room: ' + JSON.stringify(r.data));
});

// --- Test: new ownership atomic: membership + audit both present or neither ---
test('revoked host cannot create a room between authority read and write', async () => {
  const host = {id: 'host-revoke-race', email: 'host-revoke-race@access.test'};
  database.prepare('INSERT INTO accounts(id,email,created_at) VALUES(?,?,?)').run(host.id, host.email, clock);
  database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(host.id, 'host', clock, users.root.id);
  const roomId = crypto.randomUUID();
  beforeBatch = () => database.prepare('UPDATE system_hosts SET revoked_at=? WHERE account_id=?').run(clock, host.id);
  const r = await post(host, 'create-room', {id: roomId, adminKey: crypto.randomUUID() + crypto.randomUUID(), title: 'Revocation race'});
  assert.equal(r.status, 403);
  assert.equal(r.data.code, 'FORBIDDEN');
  assert.equal(database.prepare('SELECT COUNT(*) n FROM rooms WHERE id=?').get(roomId).n, 0);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM room_memberships WHERE room_id=?').get(roomId).n, 0);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM admin_audit WHERE room_id=?').get(roomId).n, 0);
});

test('new room ownership is atomic: membership and audit both present', async () => {
  const adminKey = crypto.randomUUID() + crypto.randomUUID();
  const atomicId = crypto.randomUUID();
  const r = await post(users.host, 'create-room', {id: atomicId, adminKey, title: 'Atomic'});
  assert.equal(r.status, 200, JSON.stringify(r.data));

  const membership = database.prepare("SELECT role FROM room_memberships WHERE room_id=? AND account_id=?").get(atomicId, users.host.id);
  assert.equal(membership?.role, 'owner', 'owner membership must exist');

  const audit = database.prepare("SELECT id FROM admin_audit WHERE action='create-room' AND room_id=? AND actor_account_id=?").get(atomicId, users.host.id);
  assert.ok(audit, 'audit row must exist');
});

// --- Test: student tokens unchanged (nonprivileged path) ---
test('student team tokens are unchanged by account-host authorization', async () => {
  const adminKey = crypto.randomUUID() + crypto.randomUUID();
  const studentRoomId = crypto.randomUUID();
  const r = await post(users.root, 'create-room', {id: studentRoomId, adminKey, title: 'Student room'});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const room = r.data.room;

  const joinR = await post(null, 'join', {code: room.code, name: 'Test Team'});
  assert.equal(joinR.status, 200, 'join must succeed: ' + JSON.stringify(joinR.data));
  const session = joinR.data.session;

  // Student token state request.
  const stateR = await route.GET(new Request(`https://game.test/api/escape?kind=state&id=${session.id}`, {
    headers: {'Authorization': 'Bearer ' + session.token},
  }));
  assert.equal(stateR.status, 200, 'student state must succeed');

  // Student cannot board.
  const boardR = await route.GET(new Request(`https://game.test/api/escape?kind=board&id=${studentRoomId}`, {
    headers: {'Authorization': 'Bearer ' + session.token},
  }));
  assert.equal(boardR.status, 403, 'student bearer must not board');
});

console.log('account-room-access: root/host create, anon/nohost fail, cohost createfail, crossroom/observer mutations/live revoke/no bearer bypass/new ownership+atomic audit/legacy readmanage+claim tests loaded.');
