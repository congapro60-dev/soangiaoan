import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import ts from 'typescript';
import {test} from 'node:test';

const database = new DatabaseSync(':memory:');
for (const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql','0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql']) database.exec(await readFile(resolve('drizzle', file), 'utf8'));
database.exec('PRAGMA foreign_keys=ON');
function stmt(sql, ...params) { const query = database.prepare(sql); return {first: () => query.get(...params) ?? null, all: () => ({results: query.all(...params)}), run: () => ({meta: {changes: Number(query.run(...params).changes)}})}; }
const storage = {stmt, db: () => ({batch: queries => { database.exec('BEGIN'); try { const result = queries.map(query => query.run()); database.exec('COMMIT'); return result; } catch (error) { database.exec('ROLLBACK'); throw error; } }})};
let clock = 1800000000000;
class TestDate extends Date { static now() { return clock; } }
const context = createContext({Date: TestDate, crypto: globalThis.crypto, Request, Response, URL, TextEncoder, console, btoa});
const env = {SITE_OWNER_EMAIL: 'root@example.test', SITE_OWNER_USER_ID: 'root-id'};
const cache = new Map();
async function moduleAt(path) {
  if (cache.has(path)) return cache.get(path);
  let loaded;
  if (resolve(path) === resolve('lib/storage.js')) loaded = new SyntheticModule(['stmt','db'], function() { this.setExport('stmt', storage.stmt); this.setExport('db', storage.db); }, {context, identifier: path});
  else if (resolve(path) === resolve('app/chatgpt-auth.ts')) throw Error('route must not import the UI auth adapter');
  else if (path.replaceAll('\\', '/').endsWith('app/api/hosts/route.ts')) {
    const source = ts.transpileModule(await readFile(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText;
    loaded = new SourceTextModule(source, {context, identifier: path});
  } else loaded = new SourceTextModule(await readFile(path, 'utf8'), {context, identifier: path});
  cache.set(path, loaded); return loaded;
}
const routeModule = await moduleAt(resolve('app/api/hosts/route.ts'));
const workerEnv = new SyntheticModule(['env'], function() { this.setExport('env', env); }, {context, identifier: 'cloudflare:workers'});
await workerEnv.link(() => {});
await workerEnv.evaluate();
await routeModule.link((specifier, parent) => specifier === 'cloudflare:workers' ? workerEnv : moduleAt(resolve(dirname(parent.identifier), specifier)));
await routeModule.evaluate();
const route = routeModule.namespace;
// The route reads the worker env module. The VM import is intentionally isolated;
// tests below also verify the pure builders through the real D1 batch path.
const users = {
  root: {id: 'root-id', email: 'root@example.test', name: 'Root'},
  owner: {id: 'owner-id', email: 'owner@example.test', name: 'Owner'},
  cohost: {id: 'cohost-id', email: 'cohost@example.test', name: 'Cohost'},
  other: {id: 'other-id', email: 'other@example.test', name: 'Other'},
};
function request(user, body, method = 'POST') {
  const headers = {'Origin': 'https://game.test', 'Content-Type': 'application/json'};
  if (user) { headers['oai-authenticated-user-id'] = user.id; headers['oai-authenticated-user-email'] = user.email; headers['oai-authenticated-user-full-name'] = encodeURIComponent(user.name); headers['oai-authenticated-user-full-name-encoding'] = 'percent-encoded-utf-8'; }
  return new Request('https://game.test/api/hosts', {method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined});
}
async function post(user, body) { const response = await route.POST(request(user, body)); return {status: response.status, data: await response.json()}; }
async function get(user, query) { const response = await route.GET(new Request(`https://game.test/api/hosts?${query}`, {headers: {'oai-authenticated-user-id': user.id, 'oai-authenticated-user-email': user.email}})); return {status: response.status, data: await response.json()}; }

// Worker env is synthetic in this VM. The pure root contract is covered by the
// existing access-control suite; this integration suite uses database-backed host
// rows for all route mutations and confirms no first-visitor bootstrap occurs.
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(users.root.id, users.root.email, users.root.name, clock);
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(users.owner.id, users.owner.email, users.owner.name, clock);
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(users.cohost.id, users.cohost.email, users.cohost.name, clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(users.root.id, 'root', clock, users.root.id);
const admin = 'legacy-admin-secret';
const sha = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(x => x.toString(16).padStart(2, '0')).join('');
const roomId = 'room-a';
database.prepare('INSERT INTO rooms(id,code,admin_hash,title,created,revision,mode) VALUES(?,?,?,?,?,?,?)').run(roomId, 'ROOMAA', await sha(admin), 'A', clock, 0, 'legacy');
database.prepare('UPDATE rooms SET owner_account_id=? WHERE id=?').run(users.owner.id, roomId);
database.prepare('INSERT INTO room_memberships(room_id,account_id,role,granted_at,granted_by) VALUES(?,?,?,?,?)').run(roomId, users.owner.id, 'owner', clock, users.root.id);

test('identity is header-only and anonymous remains fail closed', async () => {
  const anonymousResponse = await route.GET(new Request('https://game.test/api/hosts?kind=identity'));
  const anonymous = {status: anonymousResponse.status, data: await anonymousResponse.json()};
  assert.deepEqual(anonymous.status, 200, JSON.stringify(anonymous));
  assert.equal(anonymous.data.user, null);
  assert.equal((await post(null, {action: 'create-invite', role: 'host', expectedEmail: 'x@example.test'})).status, 401);
  assert.equal((await get(users.owner, 'kind=rooms')).status, 200);
});

test('room invite returns one raw token and accepts only the bound identity', async () => {
  const created = await post(users.owner, {action: 'create-invite', role: 'cohost', roomId, expectedEmail: users.cohost.email});
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const invite = created.data.invite;
  assert(invite.token);
  assert(!JSON.stringify(created.data).includes('token_hash'));
  assert.equal((await post(users.other, {action: 'accept-invite', token: invite.token, email: users.cohost.email})).data.code, 'INVITE_INVALID');
  assert.equal(database.prepare('SELECT accepted_at FROM host_invites WHERE id=?').get(invite.id).accepted_at, null);
  assert.equal((await post(users.cohost, {action: 'accept-invite', token: invite.token})).status, 200);
  assert.equal((await post(users.cohost, {action: 'accept-invite', token: invite.token})).data.code, 'INVITE_INVALID');
  assert.equal(database.prepare('SELECT COUNT(*) n FROM room_memberships WHERE room_id=? AND account_id=?').get(roomId, users.cohost.id).n, 1);
  assert.equal(database.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='accept-invite' AND room_id=?").get(roomId).n, 1);
});

test('same timestamp accept contention has one receipt, grant, and audit', async () => {
  const token = 'same-clock-token';
  const inviteId = 'same-clock-invite';
  const now = clock;
  database.prepare('INSERT INTO host_invites(id,token_hash,expected_email,role,room_id,created_by,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').run(inviteId, await sha(token), users.cohost.email, 'observer', roomId, users.owner.id, now, now + 86400000);
  const a = await post(users.cohost, {action: 'accept-invite', token});
  const b = await post(users.cohost, {action: 'accept-invite', token});
  assert.equal(a.status, 200);
  assert.equal(b.data.code, 'INVITE_INVALID');
  assert.equal(database.prepare('SELECT COUNT(*) n FROM admin_audit WHERE action=\'accept-invite\' AND room_id=? AND json_extract(payload,\'$.inviteId\')=?').get(roomId, inviteId).n, 1);
});

test('expiry, revoke, regrant, and cross-room isolation are enforced', async () => {
  const created = await post(users.owner, {action: 'create-invite', role: 'observer', roomId, expectedEmail: users.other.email});
  const invite = created.data.invite;
  assert.equal((await post(users.owner, {action: 'revoke-invite', inviteId: invite.id})).status, 200);
  assert.equal((await post(users.other, {action: 'accept-invite', token: invite.token})).data.code, 'INVITE_INVALID');
  const rooms = await get(users.cohost, 'kind=rooms');
  assert(rooms.data.rooms.every(room => room.id === roomId));
  assert.equal((await post(users.cohost, {action: 'revoke-membership', roomId, accountId: users.owner.id, grantedAt: clock})).status, 403);
  clock += 86400001;
  const expired = await post(users.owner, {action: 'create-invite', role: 'observer', roomId, expectedEmail: users.other.email});
  clock += 86400001;
  const expiredResult = await post(users.other, {action: 'accept-invite', token: expired.data.invite.token});
  assert.equal(expiredResult.status, 409, JSON.stringify(expiredResult));
  assert.equal(expiredResult.data.code, 'INVITE_INVALID', JSON.stringify(expiredResult));
});

test('claim rotates legacy bearer and keeps audit atomic', async () => {
  const unclaimed = 'room-claim';
  database.prepare('INSERT INTO rooms(id,code,admin_hash,title,created,revision,mode) VALUES(?,?,?,?,?,?,?)').run(unclaimed, 'ROOMCC', await sha(admin), 'Claim', clock, 0, 'legacy');
  const claim = await post(users.root, {action: 'claim-room', roomId: unclaimed, revision: 0, adminKey: admin});
  assert.equal(claim.status, 200, JSON.stringify(claim.data));
  assert.notEqual(database.prepare('SELECT owner_account_id,admin_hash FROM rooms WHERE id=?').get(unclaimed).admin_hash, await sha(admin));
  assert.equal(database.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='claim-room' AND room_id=?").get(unclaimed).n, 1);
});

// --- Regression: forged stored root cannot mint or accept system-scope invites ---
// A system_hosts row with role='root' must not grant env-root privileges.
// Only the env-configured (id+email) identity may issue or validate system invites.
const forgedRoot = {id: 'forged-root-id', email: 'forged@example.test', name: 'Forged'};
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(forgedRoot.id, forgedRoot.email, forgedRoot.name, clock);
// Directly insert a system_hosts row with role='root' for the forged user.
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(forgedRoot.id, 'root', clock, users.root.id);

test('forged stored root cannot mint system-scope host invite', async () => {
  // forgedRoot has system_hosts.role='root' but is NOT the env-configured root (id mismatch).
  // Prior to the patch, the SQL guard allowed stored role='root' to pass.
  const result = await post(forgedRoot, {action: 'create-invite', role: 'host', expectedEmail: 'victim@example.test'});
  assert.equal(result.status, 403, 'stored root must not mint system-scope invite: ' + JSON.stringify(result.data));
  assert.equal(result.data.code, 'FORBIDDEN');
  assert.equal(database.prepare("SELECT COUNT(*) n FROM host_invites WHERE role='host' AND room_id IS NULL AND created_by=?").get(forgedRoot.id).n, 0);
});

test('system-scope invite created by env root cannot be accepted as if forged stored root issued it', async () => {
  // Env root creates a valid system invite for other user.
  const victim = {id: 'sys-victim-id', email: 'sysvictim@example.test', name: 'Victim'};
  database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(victim.id, victim.email, victim.name, clock);
  const created = await post(users.root, {action: 'create-invite', role: 'host', expectedEmail: victim.email});
  assert.equal(created.status, 200, 'env root must create system invite: ' + JSON.stringify(created.data));
  const inviteToken = created.data.invite.token;
  const inviteId = created.data.invite.id;
  // Tamper: rewrite created_by to forgedRoot in the DB to simulate a forged invite creator.
  database.prepare('UPDATE host_invites SET created_by=? WHERE id=?').run(forgedRoot.id, inviteId);
  // Attempt to accept: the SQL guard must require created_by = env root id, rejecting forged creator.
  const acceptResult = await post(victim, {action: 'accept-invite', token: inviteToken});
  assert.equal(acceptResult.status, 409, 'invite with forged creator must be rejected: ' + JSON.stringify(acceptResult.data));
  assert.equal(acceptResult.data.code, 'INVITE_INVALID');
  assert.equal(database.prepare('SELECT accepted_at FROM host_invites WHERE id=?').get(inviteId).accepted_at, null);
  assert.equal(database.prepare("SELECT COUNT(*) n FROM system_hosts WHERE account_id=?").get(victim.id).n, 0);
  // Restore and confirm env-root-created invite would accept normally (restore created_by).
  database.prepare('UPDATE host_invites SET created_by=? WHERE id=?').run(users.root.id, inviteId);
  const acceptOk = await post(victim, {action: 'accept-invite', token: inviteToken});
  assert.equal(acceptOk.status, 200, 'env root invite must accept normally after restore: ' + JSON.stringify(acceptOk.data));
  assert.equal(database.prepare("SELECT COUNT(*) n FROM system_hosts WHERE account_id=?").get(victim.id).n, 1);
});

// --- Regression: sameclock invite full lifecycle receipt atomicity ---
// accept → revoke-membership have distinct receipt keys; same-clock regrant gets a new receipt.
test('sameclock lifecycle: accept, revoke-membership, regrant receipts are each independent', async () => {
  const now = clock;
  const lifecycleUser = {id: 'lifecycle-id', email: 'lifecycle@example.test', name: 'Lifecycle'};
  database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(lifecycleUser.id, lifecycleUser.email, lifecycleUser.name, now);
  // Invite at same clock tick.
  const inv1 = await post(users.owner, {action: 'create-invite', role: 'cohost', roomId, expectedEmail: lifecycleUser.email});
  assert.equal(inv1.status, 200, JSON.stringify(inv1.data));
  // Accept: produces a membership with granted_at = now (same clock).
  const acc1 = await post(lifecycleUser, {action: 'accept-invite', token: inv1.data.invite.token});
  assert.equal(acc1.status, 200, 'first accept must succeed: ' + JSON.stringify(acc1.data));
  // Idempotent second accept on same invite must fail: receipt already consumed.
  const acc2 = await post(lifecycleUser, {action: 'accept-invite', token: inv1.data.invite.token});
  assert.equal(acc2.data.code, 'INVITE_INVALID', 'duplicate accept must be rejected');
  // Only one grant row exists.
  assert.equal(database.prepare('SELECT COUNT(*) n FROM room_memberships WHERE room_id=? AND account_id=? AND revoked_at IS NULL').get(roomId, lifecycleUser.id).n, 1);
  // Revoke the membership at same clock (grantedAt = now).
  const rev1 = await post(users.owner, {action: 'revoke-membership', roomId, accountId: lifecycleUser.id, grantedAt: now});
  assert.equal(rev1.status, 200, 'first revoke-membership must succeed: ' + JSON.stringify(rev1.data));
  // Idempotent second revoke must contend on same receipt and lose.
  const rev2 = await post(users.owner, {action: 'revoke-membership', roomId, accountId: lifecycleUser.id, grantedAt: now});
  assert.equal(rev2.status, 409, 'duplicate revoke-membership must be rejected');
  assert.equal(database.prepare('SELECT revoked_at FROM room_memberships WHERE room_id=? AND account_id=?').get(roomId, lifecycleUser.id).revoked_at, now);
  // Regrant via new invite at same clock produces a new invite id → new receipt key → succeeds.
  const inv2 = await post(users.owner, {action: 'create-invite', role: 'observer', roomId, expectedEmail: lifecycleUser.email});
  assert.equal(inv2.status, 200, JSON.stringify(inv2.data));
  const acc3 = await post(lifecycleUser, {action: 'accept-invite', token: inv2.data.invite.token});
  assert.equal(acc3.status, 200, 'regrant must succeed: ' + JSON.stringify(acc3.data));
  // Membership re-exists (ON CONFLICT DO UPDATE) with new role.
  assert.equal(database.prepare("SELECT role FROM room_memberships WHERE room_id=? AND account_id=? AND revoked_at IS NULL").get(roomId, lifecycleUser.id).role, 'observer');
  // Exactly two accept-invite audit rows for this room (first accept + regrant accept).
  assert.equal(database.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='accept-invite' AND room_id=? AND actor_account_id=?").get(roomId, lifecycleUser.id).n, 2);
  // One revoke-membership audit row.
  assert.equal(database.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action='revoke-membership' AND room_id=? AND json_extract(payload,'$.accountId')=?").get(roomId, lifecycleUser.id).n, 1);
  const regranted = database.prepare('SELECT granted_at FROM room_memberships WHERE room_id=? AND account_id=?').get(roomId, lifecycleUser.id);
  assert.equal(regranted.granted_at, now + 1, 'Grant version advances independently of wall clock');
  assert.equal((await post(users.owner, {action: 'revoke-membership', roomId, accountId: lifecycleUser.id, grantedAt: now})).status, 409, 'Stale revoke must not revoke a newer grant');
  const rev3 = await post(users.owner, {action: 'revoke-membership', roomId, accountId: lifecycleUser.id, grantedAt: regranted.granted_at});
  assert.equal(rev3.status, 200, 'Second lifecycle revoke must succeed at the same clock tick');
  assert.equal(database.prepare('SELECT revoked_at FROM room_memberships WHERE room_id=? AND account_id=?').get(roomId, lifecycleUser.id).revoked_at, now);
});

test('system host repeated revoke and regrant advances version at the same clock tick', async () => {
  const host = {id: 'same-clock-host', email: 'same-clock-host@example.test', name: 'Host'};
  database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(host.id, host.email, host.name, clock);
  let grant = await post(users.root, {action: 'grant-system-host', accountId: host.id});
  assert.equal(grant.status, 200);
  for (let cycle = 0; cycle < 3; cycle++) {
    const epoch = database.prepare('SELECT created_at FROM system_hosts WHERE account_id=?').get(host.id).created_at;
    assert.equal(epoch, clock + cycle);
    assert.equal((await post(users.root, {action: 'revoke-system-host', accountId: host.id})).status, 200);
    assert.equal((await post(users.root, {action: 'revoke-system-host', accountId: host.id})).status, 409);
    grant = await post(users.root, {action: 'grant-system-host', accountId: host.id});
    assert.equal(grant.status, 200);
  }
  const invite = await post(users.root, {action: 'create-invite', role: 'host', expectedEmail: host.email});
  assert.equal((await post(host, {action: 'accept-invite', token: invite.data.invite.token})).status, 200);
  assert.equal(database.prepare('SELECT created_at FROM system_hosts WHERE account_id=?').get(host.id).created_at, clock + 4);
  assert.equal((await post(users.root, {action: 'revoke-system-host', accountId: host.id})).status, 200);
});

// --- Regression: body size bounded on actual request body, not content-length header ---
test('oversized body without content-length header is rejected', async () => {
  const bigBody = JSON.stringify({action: 'create-invite', pad: 'x'.repeat(5000)});
  // Deliberately omit content-length by sending a raw fetch-like request with no length header.
  const headers = {
    'Origin': 'https://game.test',
    'Content-Type': 'application/json',
    'oai-authenticated-user-id': users.root.id,
    'oai-authenticated-user-email': users.root.email,
  };
  const req = new Request('https://game.test/api/hosts', {method: 'POST', headers, body: bigBody, duplex: 'half'});
  const result = await route.POST(req);
  assert.equal(result.status, 413, 'oversized body without content-length must return 413');
  const data = await result.json();
  assert.equal(data.code, 'BODY_TOO_LARGE');
});

test('body with lying content-length but large actual body is rejected', async () => {
  const bigBody = JSON.stringify({action: 'create-invite', pad: 'x'.repeat(5000)});
  const headers = {
    'Origin': 'https://game.test',
    'Content-Type': 'application/json',
    'Content-Length': '10',
    'oai-authenticated-user-id': users.root.id,
    'oai-authenticated-user-email': users.root.email,
  };
  const req = new Request('https://game.test/api/hosts', {method: 'POST', headers, body: bigBody, duplex: 'half'});
  const result = await route.POST(req);
  assert.equal(result.status, 413, 'body that exceeds MAX_BODY_BYTES must be rejected even if content-length lies: ' + result.status);
  const data = await result.json();
  assert.equal(data.code, 'BODY_TOO_LARGE');
});

console.log('Hosts integration: identity, scoped invites, wrong identity, expiry/revoke, same-clock receipt contention, isolation, claim audit, forged-stored-root regression, sameclock lifecycle, and body-size checks loaded.');
