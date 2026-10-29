import {nativeVmModule} from './helpers/vm-native.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {TOPICS, createCampaign, mathQuestion, campaignPublic} from '../lib/campaign.js';

test('v41 ma trận: phủ SGK THPT, đủ 3 lớp, không trùng id', () => {
    const grades = {};
    for (const t of TOPICS) grades[t.grade] = (grades[t.grade] || 0) + 1;
    assert.ok(TOPICS.length >= 80, 'tổng topics >= 80, thực tế ' + TOPICS.length);
    assert.ok((grades[10] || 0) >= 20, 'lớp 10 >= 20 mục: ' + grades[10]);
    assert.ok((grades[11] || 0) >= 20, 'lớp 11 >= 20 mục: ' + grades[11]);
    assert.ok((grades[12] || 0) >= 18, 'lớp 12 >= 18 mục: ' + grades[12]);
    const ids = TOPICS.map(t => t.id);
    assert.equal(new Set(ids).size, ids.length, 'không trùng id');
    const newOnes = ['proposition', 'vector_scale', 'oxyz_segment', 'arithmetic', 'permutation', 'extrema', 'bayes', 'parallel_planes'];
    for (const id of newOnes) assert(ids.includes(id), 'thiếu ' + id);
    for (const t of TOPICS) assert(t.scope && t.scope.length > 5, 'topic ' + t.id + ' thiếu scope');
});

test('v41 fallback: mathQuestion không throw với mọi topic trong TOPICS', () => {
    const t0 = Date.now();
    for (const t of TOPICS) {
        const q = mathQuestion(t.id, 1, 12345);
        assert.ok(q.question.length > 5 && Number.isFinite(q.answer), 'topic ' + t.id + ' sinh câu thất bại');
    }
    assert.ok(Date.now() - t0 < 10000, 'sinh câu cho toàn bộ ma trận quá chậm');
});

test('v41 durationMinutes: validate trong createCampaign', () => {
    const cfg = createCampaign({ grade: 10, topics: ['vectors'], durationMinutes: 20 });
    assert.equal(cfg.durationMinutes, 20);
    const def = createCampaign({ grade: 10, topics: ['vectors'] });
    assert.equal(def.durationMinutes, 30);
    assert.throws(() => createCampaign({ grade: 10, topics: ['vectors'], durationMinutes: 5 }), /10 đến 60/);
    assert.throws(() => createCampaign({ grade: 10, topics: ['vectors'], durationMinutes: 90 }), /10 đến 60/);
});

test('v41 campaignPublic: durationMinutes không bị strip', () => {
    const cfg = createCampaign({ grade: 10, topics: ['vectors'], durationMinutes: 20 });
    const pub = campaignPublic(cfg);
    assert.equal(pub.durationMinutes, 20);
});

// Route harness
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
const testEnv = { SITE_OWNER_EMAIL: 'root@v41.test', SITE_OWNER_USER_ID: 'root-v41-id' };
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

test('v41 route: phòng 20 phút → durationMs 1200000; timeout đúng 20 phút', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await post('create-room', { id, adminKey: admin, title: 'Room 20 min', campaign: { playMode: 'individual', community: 'none', theme: 'modern', grade: 10, topics: ['vectors'], minLevel: 1, maxLevel: 3, durationMinutes: 20 } });
    assert.equal(roomRes.status, 200, JSON.stringify(roomRes.data).slice(0, 200));
    const room = roomRes.data.room;
    const j = await post('join', { code: room.code, name: 'HS 1', mascot: 1 });
    const player = j.data.session;
    const begin = await post('begin', { id });
    assert.equal(begin.status, 200, JSON.stringify(begin.data).slice(0, 200));

    let st = await getState(player.id, player.token);
    assert.equal(st.data.state.durationMs, 1200000, 'student sees 20-minute duration');

    // tua đồng hồ quá 20 phút -> timeout
    clock += 21 * 60000;
    st = await getState(player.id, player.token);
    assert.equal(st.data.state.status, 'timeout', 'team times out after configured 20 minutes');
    clock -= 21 * 60000;
});

test('v41 Lôi Đài trong phòng boat: 2 hoạt động tập thể chung 1 phiên', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await post('create-room', { id, adminKey: admin, title: 'Columbus boat+arena', campaign: { playMode: 'teams', community: 'boat', theme: 'historical', grade: 11, topics: ['space_parallel'], minLevel: 1, maxLevel: 3 } });
    assert.equal(roomRes.status, 200, JSON.stringify(roomRes.data).slice(0, 200));
    const room = roomRes.data.room;
    for (const name of ['Doi 1', 'Doi 2'])
        await post('join', { code: room.code, name, mascot: 1 });
    const begin = await post('begin', { id });
    assert.equal(begin.status, 200, JSON.stringify(begin.data).slice(0, 200));
    const arena = await post('arena-open', { id });
    assert.equal(arena.status, 200, 'arena-open works in a boat room (theme historical): ' + JSON.stringify(arena.data).slice(0, 200));
    assert.equal(arena.data.ok ?? true, true);
});

test('v41 needles: roomMinutes + AI focus trong app.js/route', async () => {
    const app = await readFile(resolve('public/app.js'), 'utf8');
    assert(app.includes('function roomMinutes()'), 'roomMinutes helper');
    assert(app.includes('id="aiFocus"'), 'AI focus input on the panel');
    assert(app.includes('focus:document.getElementById'), 'handler passes focus');
    const routeSrc = await readFile(resolve('app/api/escape/route.js'), 'utf8');
    assert(routeSrc.includes('Trọng tâm kiến thức BẮT BUỘC'), 'prompt honors focus');
    assert(routeSrc.includes('durationMinutes'), 'route reads durationMinutes');
});
