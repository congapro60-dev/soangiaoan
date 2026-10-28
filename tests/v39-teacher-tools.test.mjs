import {nativeVmModule} from './helpers/vm-native.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

// Unit-level needles for the client tools
test('QA v39 needles: telemetry, lesson clock, TV mode trong app.js', async () => {
    const app = await readFile(resolve('public/app.js'), 'utf8');
    assert(app.includes("action: 'client-error'"), 'client posts client-error action');
    assert(app.includes("window.addEventListener('error'"), 'window error listener');
    assert(app.includes("window.addEventListener('unhandledrejection'"), 'unhandledrejection listener');
    assert(app.includes('reportedErrors.size >= 10'), 'telemetry throttled to 10 per session');
    assert(app.includes('function lessonClock() {'), 'lesson clock defined');
    assert(app.includes("lessonClock() + '<p id=\"boardStatus\""), 'clock rendered on the started teacher board');
    assert(app.includes("data-action=\"tv-mode\""), 'TV mode button exists');
    assert(app.includes("case 'tv-mode':"), 'tv-mode handler exists');
    assert(app.includes("localStorage.getItem('signal-tv-mode-v1')"), 'tv mode persisted');
    const routeSrc = await readFile(resolve('app/api/escape/route.js'), 'utf8');
    assert(routeSrc.includes("b.action === 'client-error'"), 'server accepts client-error');
    assert(routeSrc.includes('site_client_errors'), 'errors stored in system_settings ring');
    const css = await readFile(resolve('public/style.css'), 'utf8');
    assert(css.includes('.lesson-clock') && css.includes('body.tv-mode'), 'styles for clock and tv mode');
});

// Route-level integration for client-error
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
const testEnv = { SITE_OWNER_EMAIL: 'root@v39.test', SITE_OWNER_USER_ID: 'root-v39-id' };
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
const post = async (action, body = {}) => {
    const response = await route.POST(new Request('https://game.test/api/escape', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'https://game.test' }, body: JSON.stringify({ action, ...body, requestId: body.requestId || crypto.randomUUID() }) }));
    return { status: response.status, data: await response.json() };
};
const storedErrors = () => { const row = database.prepare("SELECT value FROM system_settings WHERE key='site_client_errors'").get(); return row ? JSON.parse(row.value) : []; };

test('client-error: nhan loi, luu ring 30, cat ngan truong du lieu', async () => {
    const res = await post('client-error', { message: 'TypeError: boom at render', source: 'app.js:123', stack: 'stack...'.repeat(400), room: 'ABC123', screen: 'teacher' });
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
    let list = storedErrors();
    assert.equal(list.length, 1);
    assert.equal(list[0].message, 'TypeError: boom at render');
    assert.ok(list[0].stack.length <= 800, 'stack capped');
    const noMessage = await post('client-error', { source: 'x' });
    assert.equal(noMessage.data.ok, false, 'missing message -> ok:false');
    for (let i = 0; i < 35; i++)
        await post('client-error', { message: 'loi so ' + i });
    list = storedErrors();
    assert.ok(list.length <= 30, 'ring capped at 30, got ' + list.length);
    assert.equal(list.at(-1).message, 'loi so 34', 'newest kept');
    assert.equal(list[0].message, 'loi so 5', 'oldest evicted');
    const long = 'x'.repeat(500);
    const trunc = await post('client-error', { message: long });
    assert.equal(trunc.status, 200);
    assert.equal(storedErrors().at(-1).message.length, 300, 'message truncated to 300');
});
