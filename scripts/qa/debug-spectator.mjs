import {nativeVmModule} from '../../tests/helpers/vm-native.mjs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

const database = new DatabaseSync(':memory:');
for (const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql','0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql'])
    database.exec(await readFile(resolve('drizzle', file), 'utf8'));
database.exec('PRAGMA foreign_keys=ON');
function stmt(sql, ...params) {
    return {
        first: () => database.prepare(sql).get(...params) ?? null,
        all: () => ({ results: database.prepare(sql).all(...params) }),
        run: () => ({ meta: { changes: Number(database.prepare(sql).run(...params).changes) } })
    };
}
const testEnv = { SITE_OWNER_EMAIL: 'root@dbg.test', SITE_OWNER_USER_ID: 'root-dbg-id' };
const storage = { stmt, db: () => ({ batch: queries => { database.exec('BEGIN'); try { const r = queries.map(q => q.run()); database.exec('COMMIT'); return r; } catch (e) { database.exec('ROLLBACK'); throw e; } } }), getEnv: () => testEnv };
let clock = Date.now();
class TestDate extends Date { static now() { return clock; } }
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID, testEnv.SITE_OWNER_EMAIL, 'Root', clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID, 'root', clock, testEnv.SITE_OWNER_USER_ID);
const context = createContext({ structuredClone, Date: TestDate, crypto: globalThis.crypto, Request, Response, URL, TextEncoder, console });
const cache = new Map();
async function moduleAt(path) {
    if (cache.has(path)) return cache.get(path);
    let m;
    if (resolve(path) === resolve('lib/storage.js'))
        m = new SyntheticModule(['stmt', 'db', 'getEnv'], function () { this.setExport('stmt', storage.stmt); this.setExport('db', storage.db); this.setExport('getEnv', storage.getEnv); }, { context, identifier: path });
    else
        m = new SourceTextModule(await readFile(path, 'utf8'), { context, identifier: path });
    cache.set(path, m);
    return m;
}
const entry = await moduleAt(resolve('app/api/escape/route.js'));
await entry.link((specifier, parent) => specifier.startsWith('node:') ? nativeVmModule(specifier, context) : moduleAt(resolve(dirname(parent.identifier), specifier)));
await entry.evaluate();
const route = entry.namespace;
const rootH = { 'oai-authenticated-user-id': testEnv.SITE_OWNER_USER_ID, 'oai-authenticated-user-email': testEnv.SITE_OWNER_EMAIL };
async function post(action, body = {}, token = '') {
    const response = await route.POST(new Request('https://game.test/api/escape', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Origin': 'https://game.test', ...rootH }, body: JSON.stringify({ action, ...body, requestId: body.requestId || crypto.randomUUID() }) }));
    return { status: response.status, data: await response.json() };
}
async function getState(id, token) {
    const response = await route.GET(new Request('https://game.test/api/escape?kind=state&id=' + id, { headers: { Authorization: 'Bearer ' + token } }));
    return { status: response.status, data: await response.json() };
}

const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
const roomRes = await post('create-room', { id, adminKey: admin, title: 'DBG', campaign: { playMode: 'teams', community: 'boat', theme: 'modern', grade: 10, topics: ['sets'], lateJoin: 'watch' } });
console.log('create:', roomRes.status);
const room = roomRes.data.room;
const before = await post('join', { code: room.code, name: 'Doi dau', mascot: 1 });
console.log('join1:', before.status);
const p1 = before.data.session;
const begin = await post('begin', { id });
console.log('begin:', begin.status);
// kiểm tra config trên DB
const cfg = JSON.parse(database.prepare('SELECT config FROM rooms WHERE id=?').get(id).config);
console.log('config.lateJoin =', cfg.lateJoin);
const late = await post('join', { code: room.code, name: 'HS tre', mascot: 2 });
console.log('join2:', late.status);
const player2 = late.data.session;
const row2 = JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(player2.id).data);
console.log('team2.status =', row2.status, '| spectator =', row2.spectator);
const st = await getState(player2.id, player2.token);
console.log('state.spectator =', st.data.state.spectator, '| state.status =', st.data.state.status);
