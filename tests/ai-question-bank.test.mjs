import {nativeVmModule} from './helpers/vm-native.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {normalizeAICandidate, mergeAIBank, pickAIQuestion, resolveAITopic} from '../lib/ai-question-bank.js';
import {campaignPublic} from '../lib/campaign.js';

const matrix = { rule: 'campaign', grade: 10, topics: ['quadratic'], minLevel: 1, maxLevel: 3 };
const good = { topic: 'quadratic', level: 2, question: 'Tìm nghiệm của phương trình x² - 5x + 6 = 0, nhập tổng hai nghiệm.', answer: 5, steps: ['Phân tích (x-2)(x-3).', 'Hai nghiệm 2 và 3.', 'Tổng bằng 5.'] };

test('resolveAITopic: nhận cả id và tên tiếng Việt', () => {
    const entry = resolveAITopic('quadratic');
    assert.ok(entry, 'id resolves');
    assert.equal(resolveAITopic(entry.name)?.id, entry.id, 'Vietnamese name resolves');
    assert.equal(resolveAITopic('khong-ton-tai'), null);
});

test('normalizeAICandidate: chặn everything ngoài ma trận', () => {
    assert(normalizeAICandidate(good, matrix).question, 'valid passes');
    assert(normalizeAICandidate({ ...good, topic: 'other-topic' }, matrix).error, 'topic outside matrix rejected');
    assert(normalizeAICandidate({ ...good, level: 0 }, matrix).error, 'level below minLevel rejected');
    assert(normalizeAICandidate({ ...good, level: 9 }, matrix).error, 'level above maxLevel rejected');
    assert(normalizeAICandidate({ ...good, question: 'ngắn' }, matrix).error, 'question too short rejected');
    assert(normalizeAICandidate({ ...good, answer: 'đáp án dài '.repeat(10) }, matrix).error, 'long text answer rejected');
    assert.equal(normalizeAICandidate({ ...good, answer: '3/4' }, matrix).question.answer, '3/4', 'fraction string kept');
    assert.equal(normalizeAICandidate({ ...good, answer: 5.25 }, matrix).question.answer, 5.25, 'numeric kept');
    assert.equal(normalizeAICandidate({ ...good, steps: Array(9).fill('bước') }, matrix).question.steps.length, 6, 'steps capped at 6');
});

test('mergeAIBank: trùng câu bỏ qua, giới hạn 60, thay thế khi yêu cầu', () => {
    const first = mergeAIBank([], [good], matrix);
    assert.equal(first.saved, 1);
    const dup = mergeAIBank(first.bank, [{ ...good }], matrix);
    assert.equal(dup.saved, 0, 'duplicate question text skipped');
    const many = mergeAIBank([], Array.from({ length: 70 }, (_, i) => ({ ...good, question: 'Câu ' + i + ' với dữ kiện đủ dài để hợp lệ.' })), matrix);
    assert.equal(many.bank.length, 60, 'bank capped at 60');
    const replaced = mergeAIBank(first.bank, [good], matrix, { replace: true });
    assert.equal(replaced.bank.length, 1, 'replace drops the old bank');
});

test('pickAIQuestion: đúng topic+mức, né câu đã dùng, bỏ qua slot mcq', () => {
    const bank = [{ ...good, id: 'ai1', format: 'short' }, { ...good, topic: 'quadratic', level: 3, question: 'Câu mức khác với dữ kiện đầy đủ.', id: 'ai2', format: 'short' }];
    const slot = { topic: 'quadratic', level: 2, format: 'short' };
    const picked = pickAIQuestion(bank, slot, []);
    assert.equal(picked.id, 'ai1', 'exact level preferred');
    const afterUse = pickAIQuestion(bank, slot, [picked]);
    assert.equal(afterUse.id, 'ai2', 'falls back to same topic other level');
    assert.equal(pickAIQuestion(bank, slot, [bank[0], bank[1]]), null, 'all used -> null');
    assert.equal(pickAIQuestion(bank, { ...slot, format: 'mcq' }), null, 'mcq slot never uses the bank');
    assert.equal(pickAIQuestion([], slot), null, 'empty bank -> null');
    assert.ok(picked.points > 0 && picked.done === false, 'bonus-shaped fields set');
});

test('campaignPublic: không lộ aiBank cho học sinh', () => {
    const pub = campaignPublic({ ...matrix, seed: 1, aiBank: [{ answer: 5 }] });
    assert.equal(pub.aiBank, undefined, 'aiBank stripped');
    assert.equal(pub.grade, 10, 'rest of campaign intact');
});

test('QA v38 needles: race ưu tiên ngân hàng AI, route chấm đúng điểm', async () => {
    const race = await readFile(resolve('lib/race.js'), 'utf8');
    assert(race.includes('pickAIQuestion(s.campaign.aiBank,plan,r.mathHistory)||contextQuestion(plan,seed)'), 'queueMath prefers the AI bank with fallback');
    const routeSrc = await readFile(resolve('app/api/escape/route.js'), 'utf8');
    assert(routeSrc.includes('ai-question-generate'), 'generate action exists');
    assert(routeSrc.includes('ai-question-save'), 'save action exists');
    assert(routeSrc.includes('aiBank: aiBankOf(room)'), 'board receives the bank');
    const app = await readFile(resolve('public/app.js'), 'utf8');
    assert(app.includes('data-action="ai-generate"'), 'generate button exists');
    assert(app.includes('data-action="ai-save"'), 'save button exists');
    assert(app.includes('aiBankPanel() + gameActivityHostControls()'), 'panel rendered before host controls');
});

// Route-level integration via the escape route VM harness
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
const testEnv = { SITE_OWNER_EMAIL: 'root@aibank.test', SITE_OWNER_USER_ID: 'root-aibank-id' };
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

test('route: lưu ngân hàng AI trước begin, board thấy, HS không thấy', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await post('create-room', { id, adminKey: admin, title: 'AI bank', campaign: { playMode: 'teams', community: 'none', theme: 'modern', grade: 10, minLevel: 1, maxLevel: 3, topics: ['quadratic'] } });
    assert.equal(roomRes.status, 200, JSON.stringify(roomRes.data));
    const room = roomRes.data.room;
    const joined = await post('join', { code: room.code, name: 'Doi 1', mascot: 1 });
    const player = joined.data.session;

    const gen = await post('ai-question-generate', { id, count: 6, round: 1 });
    assert.equal(gen.status, 400, 'generate without AI config fails cleanly');
    assert.equal(gen.data.code, 'AI_PROVIDER_NOT_CONFIGURED');

    const save = await post('ai-question-save', { id, questions: [good], round: 1 });
    assert.equal(save.status, 200, JSON.stringify(save.data));
    assert.equal(save.data.saved, 1);
    assert.equal(save.data.bank.length, 1);

    const boardRes = await route.GET(new Request('https://game.test/api/escape?kind=board&id=' + id, { headers: { ...rootH, Authorization: 'Bearer x' } }));
    const boardData = await boardRes.json();
    assert.equal(boardData.aiBank?.length, 1, 'teacher board sees the bank');

    const st = await getState(player.id, player.token);
    assert.equal(st.status, 200);
    assert.equal(st.data.state.campaign.aiBank, undefined, 'student state has no aiBank');
    assert.ok(database.prepare('SELECT data FROM teams WHERE id=?').get(player.id).data.includes('"aiBank"'), 'team campaign refreshed with the bank for queueMath');
    assert.ok(st.data.state.campaign.plan, 'campaign intact for students');

    const bad = await post('ai-question-save', { id, questions: [{ ...good, topic: 'khong-co' }], round: 1 });
    assert.equal(bad.status, 400, 'invalid topic rejected at save');
});

test('route: không lưu ngân hàng sau khi bắt đầu', async () => {
    const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
    const roomRes = await post('create-room', { id, adminKey: admin, title: 'AI bank late', campaign: { playMode: 'teams', community: 'none', theme: 'modern', grade: 10, topics: ['quadratic'] } });
    const room = roomRes.data.room;
    await post('join', { code: room.code, name: 'Doi 1', mascot: 1 });
    await post('begin', { id });
    const save = await post('ai-question-save', { id, questions: [good], round: 1 });
    assert.equal(save.status, 409, 'save blocked after begin');
    assert.equal(save.data.code, 'ROOM_STARTED');
    const gen = await post('ai-question-generate', { id, count: 6, round: 1 });
    assert.equal(gen.status, 409, 'generate blocked after begin');
});
