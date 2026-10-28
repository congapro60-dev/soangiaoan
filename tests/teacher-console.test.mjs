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
        first: () => { try { return database.prepare(sql).get(...params) ?? null; } catch (e) { console.error('first error', sql, params); throw e; } },
        all: () => ({ results: database.prepare(sql).all(...params) }),
        run: () => { try { const result = database.prepare(sql).run(...params); return { meta: { changes: Number(result.changes) } }; } catch (e) { console.error('run error', sql, params); throw e; } }
    };
}
const testEnv = { SITE_OWNER_EMAIL: 'root@console.test', SITE_OWNER_USER_ID: 'root-console-id' };
const storage = { stmt, db: () => ({ batch: queries => {
    database.exec('BEGIN');
    try { const result = queries.map(q => q.run()); database.exec('COMMIT'); return result; }
    catch (e) { database.exec('ROLLBACK'); throw e; }
} }), getEnv: () => testEnv };
let clock = Date.now();
class TestDate extends Date { static now() { return clock; } }
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID, testEnv.SITE_OWNER_EMAIL, 'Root', clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID, 'root', clock, testEnv.SITE_OWNER_USER_ID);

const context = createContext({ structuredClone, Date: TestDate, crypto: globalThis.crypto, Request, Response, URL, TextEncoder, console });
const cache = new Map();
async function moduleAt(path) {
    if (cache.has(path)) return cache.get(path);
    let loadedModule;
    if (resolve(path) === resolve('lib/storage.js'))
        loadedModule = new SyntheticModule(['stmt', 'db', 'getEnv'], function () {
            this.setExport('stmt', storage.stmt);
            this.setExport('db', storage.db);
            this.setExport('getEnv', storage.getEnv);
        }, { context, identifier: path });
    else
        loadedModule = new SourceTextModule(await readFile(path, 'utf8'), { context, identifier: path });
    cache.set(path, loadedModule);
    return loadedModule;
}
const entryModule = await moduleAt(resolve('app/api/escape/route.js'));
await entryModule.link((specifier, parent) => specifier.startsWith('node:') ? nativeVmModule(specifier, context) : moduleAt(resolve(dirname(parent.identifier), specifier)));
await entryModule.evaluate();
const route = entryModule.namespace;

const rootH = { 'oai-authenticated-user-id': testEnv.SITE_OWNER_USER_ID, 'oai-authenticated-user-email': testEnv.SITE_OWNER_EMAIL };
async function post(action, body = {}, token = '', extraH = {}) {
    const response = await route.POST(new Request('https://game.test/api/escape', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Origin': 'https://game.test', ...extraH }, body: JSON.stringify({ action, ...body, requestId: body.requestId || crypto.randomUUID() }) }));
    return { status: response.status, data: await response.json() };
}
const teacher = (action, body = {}) => post(action, body, '', rootH);
async function getState(id, token) {
    const response = await route.GET(new Request('https://game.test/api/escape?kind=state&id=' + id, { headers: { Authorization: 'Bearer ' + token } }));
    return { status: response.status, data: await response.json() };
}

test('teacher-console: permission map registers game-action', async () => {
    const src = await readFile(resolve('lib/account-room-access.js'), 'utf8');
    assert(src.includes("'teacher-console': 'game-action'"), 'teacher-console mapped to game-action permission');
});

test('teacher-console: freeze-all freezes every playing team and spares finished ones', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await teacher('create-room', { id, adminKey: admin, title: 'Console freeze', campaign: { playMode: 'teams', community: 'none', theme: 'modern', grade: 10 } });
    assert.equal(roomRes.status, 200, JSON.stringify(roomRes.data));
    const room = roomRes.data.room;
    const joined = [];
    for (let i = 0; i < 3; i++)
        joined.push(await post('join', { code: room.code, name: 'Doi ' + (i + 1), mascot: i }));
    assert(joined.every(x => x.status === 200), JSON.stringify(joined.filter(x => x.status !== 200)));
    const players = joined.map(x => x.data.session);
    const beginRes = await teacher('begin', { id });
    assert.equal(beginRes.status, 200, JSON.stringify(beginRes.data));

    const res = await teacher('teacher-console', { id, consoleAction: 'freeze-all', round: 1 });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.ok, true);
    assert.equal(res.data.frozen, 3);
    assert.equal(res.data.seconds, 20);

    const state = await getState(players[0].id, players[0].token);
    assert.equal(state.status, 200, JSON.stringify(state.data));
    assert.ok(state.data.state.effects.freezeUntil > 0, 'student sees freezeUntil from teacher ice event');
    const ice = state.data.state.events.filter(e => e.type === 'ice');
    assert.ok(ice.length >= 1, 'teacher ice event recorded in team events');

    // second freeze extends to the later until (idempotent max)
    clock += 1000;
    const again = await teacher('teacher-console', { id, consoleAction: 'freeze-all', round: 1 });
    assert.equal(again.status, 200);
    const state2 = await getState(players[0].id, players[0].token);
    assert.ok(state2.data.state.effects.freezeUntil > state.data.state.effects.freezeUntil, 'later freeze extends the window');
    clock -= 1000;
});

test('teacher-console: broadcast reaches the shared board exactly once per requestId', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await teacher('create-room', { id, adminKey: admin, title: 'Console broadcast', campaign: { playMode: 'teams', community: 'none', theme: 'modern', grade: 10 } });
    const room = roomRes.data.room;
    const requestOne = crypto.randomUUID();
    const res = await teacher('teacher-console', { id, consoleAction: 'broadcast', text: '  Cả lớp dừng 1 phút, nghe chốt bài.  ', round: 1, requestId: requestOne });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.notice.text, 'Cả lớp dừng 1 phút, nghe chốt bài.');
    const row = database.prepare('SELECT race FROM rooms WHERE id=?').get(id);
    const race = JSON.parse(row.race);
    assert.equal(race.classNotice.text, 'Cả lớp dừng 1 phút, nghe chốt bài.');
    assert.equal(race.consoleLog.length, 1);

    const replay = await teacher('teacher-console', { id, consoleAction: 'broadcast', text: 'Khác', round: 1, requestId: requestOne });
    assert.equal(replay.status, 200);
    assert.equal(replay.data.replay, true);
    const raceAfterReplay = JSON.parse(database.prepare('SELECT race FROM rooms WHERE id=?').get(id).race);
    assert.equal(raceAfterReplay.consoleLog.length, 1, 'replay does not duplicate the log');
    assert.equal(raceAfterReplay.classNotice.text, 'Cả lớp dừng 1 phút, nghe chốt bài.', 'replay does not overwrite the notice');

    const second = await teacher('teacher-console', { id, consoleAction: 'broadcast', text: 'Chuyển sang phần tổng kết.', round: 1, requestId: crypto.randomUUID() });
    assert.equal(second.status, 200);
    const raceAfterSecond = JSON.parse(database.prepare('SELECT race FROM rooms WHERE id=?').get(id).race);
    assert.equal(raceAfterSecond.classNotice.text, 'Chuyển sang phần tổng kết.');

    const tooLong = await teacher('teacher-console', { id, consoleAction: 'broadcast', text: 'x'.repeat(201), round: 1, requestId: crypto.randomUUID() });
    assert.equal(tooLong.status, 400);
    const badAction = await teacher('teacher-console', { id, consoleAction: 'explode', round: 1 });
    assert.equal(badAction.status, 400);
});

test('teacher-console: grant adds mana, logs the event and validates input', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await teacher('create-room', { id, adminKey: admin, title: 'Console grant', campaign: { playMode: 'teams', community: 'none', theme: 'modern', grade: 10 } });
    const room = roomRes.data.room;
    const joined = [];
    for (let i = 0; i < 2; i++)
        joined.push(await post('join', { code: room.code, name: 'Doi ' + (i + 1), mascot: i }));
    const players = joined.map(x => x.data.session);
    await teacher('begin', { id });
    const before = JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(players[0].id).data);

    const res = await teacher('teacher-console', { id, consoleAction: 'grant', teamId: players[0].id, amount: 50, round: 1 });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.granted, 50);
    const after = JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(players[0].id).data);
    assert.equal(after.score, (before.score || 0) + 50);
    assert.ok(after.events.some(e => e.type === 'teacher-grant' && e.amount === 50), 'teacher-grant event recorded');

    const badAmount = await teacher('teacher-console', { id, consoleAction: 'grant', teamId: players[0].id, amount: 500, round: 1 });
    assert.equal(badAmount.status, 400);
    const unknownTeam = await teacher('teacher-console', { id, consoleAction: 'grant', teamId: crypto.randomUUID(), amount: 50, round: 1 });
    assert.equal(unknownTeam.status, 404);
    const noTeam = await teacher('teacher-console', { id, consoleAction: 'grant', amount: 50, round: 1 });
    assert.equal(noTeam.status, 400);
});

test('QA v37 client needles: console UI, notice banner and progressive shop gating', async () => {
    const src = await readFile(resolve('public/app.js'), 'utf8');
    assert(src.includes('data-console="freeze-all"'), 'freeze-all button exists');
    assert(src.includes('data-console="broadcast"'), 'broadcast button exists');
    assert(src.includes('data-console="grant"'), 'grant button exists');
    assert(src.includes("api('teacher-console'"), 'client posts teacher-console action');
    assert(src.includes("classConsole() + (window.SignalGameActivities"), 'console rendered on the teacher board');
    assert(src.includes("m.classNotice && now() - m.classNotice.at < 90000 ? '<p class=\"map-notice\" role=\"status\">'"), 'map notice banner renders fresh notices');
    assert(src.includes("${state.solved.length >= 1 ? Object.entries(skillNames).filter("), 'skill grid gated behind first solved gate');
    assert(src.includes("Giải xong cổng xuất phát để mở kho kỹ năng, thẻ miễn phí và giao kèo chiến thuật."), 'shop lock notice explains the unlock');
    assert(src.includes("${state.solved.length >= 1 ? pactsPanel() : ''}"), 'pact panel gated behind first solved gate');
    const routeSrc = await readFile(resolve('app/api/escape/route.js'), 'utf8');
    assert(routeSrc.includes("delete publicTurn.consoleLog;"), 'console log is not leaked to students');
    assert(routeSrc.includes('classNotice: classNoticeOf(current)'), 'board map carries the class notice');
    const css = await readFile(resolve('public/style.css'), 'utf8');
    assert(css.includes('.map-notice') && css.includes('.console-panel'), 'styles for notice banner and console panel');
});
