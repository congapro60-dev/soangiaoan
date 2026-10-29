import {nativeVmModule} from './helpers/vm-native.mjs';
import test from 'node:test';
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
const testEnv = { SITE_OWNER_EMAIL: 'root@v42.test', SITE_OWNER_USER_ID: 'root-v42-id' };
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

test('v42: chặn vào muộn → HS vào sau thành khán giả, không chơi được', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await post('create-room', { id, adminKey: admin, title: 'V42 watch', campaign: { playMode: 'teams', community: 'boat', theme: 'modern', grade: 10, topics: ['sets'], lateJoin: 'watch' } });
    assert.equal(roomRes.status, 200, JSON.stringify(roomRes.data).slice(0, 200));
    const room = roomRes.data.room;
    const before = await post('join', { code: room.code, name: 'Doi dau', mascot: 1 });
    const player1 = before.data.session;
    await post('begin', { id });
    // HS vào muộn khi đang CHẶN
    const late = await post('join', { code: room.code, name: 'HS vao muon', mascot: 2 });
    assert.equal(late.status, 200, JSON.stringify(late.data).slice(0, 200));
    const player2 = late.data.session;
    const st = await getState(player2.id, player2.token);
    assert.equal(st.data.state.spectator, true, 'HS muon la khan gia');
    assert.equal(st.data.state.status, 'spectator', 'status = spectator');
    // khong cho hanh dong
    const roll = await post('roll', { sequence: 1 }, player2.token);
    assert.notEqual(roll.status, 200, 'khong cho lan xac xac: ' + JSON.stringify(roll.data).slice(0, 120));
    // doi dau tien van choi binh thuong
    const st1 = await getState(player1.id, player1.token);
    assert.notEqual(st1.data.state.spectator, true, 'doi dau khong phai khan gia');
});

test('v42: cho vào muộn → HS vào sau chơi bình thường', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await post('create-room', { id, adminKey: admin, title: 'V42 open', campaign: { playMode: 'individual', community: 'none', theme: 'modern', grade: 10, topics: ['sets'] } });
    const room = roomRes.data.room;
    await post('join', { code: room.code, name: 'HS dau', mascot: 1 });
    await post('begin', { id });
    const late = await post('join', { code: room.code, name: 'HS vao sau', mascot: 2 });
    assert.equal(late.status, 200);
    const player = late.data.session;
    const st = await getState(player.id, player.token);
    assert.equal(st.data.state.status, 'active', 'HS vao sau choi binh thuong');
    assert.notEqual(st.data.state.spectator, true);
});

test('v42: công tắc late-join trên board GV (open → watch → join mới thành khán giả)', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await post('create-room', { id, adminKey: admin, title: 'V42 toggle', campaign: { playMode: 'teams', community: 'none', theme: 'modern', grade: 10, topics: ['sets'] } });
    const room = roomRes.data.room;
    await post('join', { code: room.code, name: 'Doi 1', mascot: 1 });
    await post('begin', { id });
    // chuyen sang watch
    const tog = await post('set-late-join', { id, lateJoin: 'watch', round: 1 });
    assert.equal(tog.status, 200, JSON.stringify(tog.data).slice(0, 150));
    assert.equal(tog.data.lateJoin, 'watch');
    // HS vao sau -> khán giả
    const late = await post('join', { code: room.code, name: 'HS tre', mascot: 2 });
    const player = late.data.session;
    const st = await getState(player.id, player.token);
    assert.equal(st.data.state.spectator, true, 'HS vao sau khi CHAN -> khan gia');
    // mo lai
    const tog2 = await post('set-late-join', { id, lateJoin: 'open', round: 1 });
    assert.equal(tog2.status, 200);
    assert.equal(tog2.data.lateJoin, 'open');
    const val = await post('client-error', { message: 'noop' });
    assert.equal(val.status, 200);
});

test('v42 needles: spectatorView + set-late-join + banner trong app.js/route', async () => {
    const app = await readFile(resolve('public/app.js'), 'utf8');
    assert(app.includes('function spectatorView() {'), 'spectatorView defined');
    assert(app.includes("screen === 'play' && state?.spectator"), 'render branch');
    assert(app.includes('data-console="late-join"'), 'teacher toggle exists');
    assert(app.includes("'set-late-join'"), 'client calls set-late-join');
    const routeSrc = await readFile(resolve('app/api/escape/route.js'), 'utf8');
    assert(routeSrc.includes('set-late-join'), 'route accepts set-late-join');
    assert(routeSrc.includes("s.spectator = true"), 'join creates spectator');
    const css = await readFile(resolve('public/style.css'), 'utf8');
    assert(css.includes('.spectator-banner'), 'spectator banner style');
});
