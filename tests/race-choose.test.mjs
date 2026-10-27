import assert from 'node:assert/strict';
import test from 'node:test';
import {initRace, choose, roll, STATIONS, EVENT_CELLS} from '../lib/race.js';
import {createCampaign} from '../lib/campaign.js';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule, SyntheticModule, createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {nativeVmModule} from './helpers/vm-native.mjs';
import {challenge} from '../lib/challenges.js';

// v34 "Mã lực mua quyền chọn": campaign mode buys steps (30đ each) instead of rolling dice.
// Duel (no campaign) keeps the seeded dice untouched.

function team(seed = 11) {
  let s = {seed, id: 't', status: 'active', solved: [], events: [], score: 0, penalty: 0, cooldown: 0, drafts: {}, campaign: createCampaign({grade: 10, topics: ['sets', 'quadratic', 'vectors'], stationMax: 2}, seed)};
  initRace(s);
  return s;
}

test('A2: campaign race grants 240 starting points exactly once; duel grants nothing', () => {
  let s = team(11);
  assert.equal(s.score, 240);
  assert.equal(s.events.filter(e => e.type === 'start-grant').length, 1);
  let grant = s.events.find(e => e.type === 'start-grant');
  assert.equal(grant.points, 240);
  initRace(s); // idempotent: existing race is never re-granted
  assert.equal(s.score, 240);
  assert.equal(s.events.filter(e => e.type === 'start-grant').length, 1);
  let duel = {seed: 3, id: 'd', status: 'active', solved: [], events: [], score: 0, penalty: 0, cooldown: 0, drafts: {}};
  initRace(duel);
  assert.equal(duel.score, 0);
  assert.equal(duel.events.filter(e => e.type === 'start-grant').length, 0);
});

test('A1/A3: choose validates 1–6 steps and campaign mode without mutating state', () => {
  let s = team(11);
  finishTravel(s);
  let snapshot = JSON.stringify({pos: s.race.position, rolls: s.race.rolls, events: s.events.length});
  for (let bad of [0, 7, -1, 2.5, '3', null, undefined]) {
    let r = choose(s, bad, 1000);
    assert.equal(r.ok, false, 'steps=' + bad);
  }
  let duel = {seed: 3, id: 'd', status: 'active', solved: [], events: [], score: 0, penalty: 0, cooldown: 0, drafts: {}};
  initRace(duel);
  assert.equal(choose(duel, 3, 1000).ok, false, 'duel rooms keep dice, no choose');
  assert.equal(JSON.stringify({pos: s.race.position, rolls: s.race.rolls, events: s.events.length}), snapshot, 'failed choose mutates nothing');
});

test('A1: purchase price is 30đ per step and the event records steps+cost', () => {
  let s = team(11);
  finishTravel(s);
  let r = choose(s, 2, 1000);
  assert.equal(r.ok, true);
  assert.equal(r.cost, 60);
  assert.equal(r.steps, 2);
  assert.equal(r.die, 2, 'choose reports chosen steps as the effective die');
  let ev = s.events.find(e => e.type === 'choose');
  assert(ev, 'choose pushes a choose event');
  assert.equal(ev.steps, 2);
  assert.equal(ev.cost, 60);
  assert.equal(ev.from, 0);
  assert.equal(ev.to, 2);
  r = choose(s, 6, 1001);
  assert.equal(r.cost, 180);
});

test('A3: choose advances exactly k steps (plus carry) and reuses dice-free movement', () => {
  let s = team(11);
  finishTravel(s);
  let r = choose(s, 6, 1000);
  assert.equal(r.from, 0);
  assert.equal(r.to, 6);
  assert.equal(s.race.position, 6);
  assert.equal(s.race.rolls, 1, 'sequence counter advances for turn guards');
  // Cell 4 is an event cell; choosing 6 steps crosses exactly it once.
  assert.equal(s.race.encounters.length, 1);
  assert.equal(s.race.encounters[0].cell, 4);
  r = choose(s, 1, 1001);
  assert.equal(r.from, 6);
  assert.equal(r.to, 7);
  assert.equal(s.race.encounters.length, 1, 'crossed cells are never re-triggered');
});

test('A3: choose stops at the next station and banks leftover steps as carry', () => {
  // Station 1 (cell 8) must be enforced (not bypassed) for this seed.
  let s = null;
  for (let seed = 1; seed < 60 && !s; seed++) {
    let t = team(seed);
    if (t.race.stationSchedule[0]) s = t;
  }
  assert(s, 'found a seed with enforced station 1');
  finishTravel(s);
  s.race.position = 5;
  let r = choose(s, 6, 1000);
  assert.equal(r.to, 8, 'movement is capped at the station');
  assert.equal(s.race.position, 8);
  assert.equal(s.race.carry, 3, '5+6=11 → 3 leftover steps carried');
  assert.equal(s.race.phase, 'challenge');
});

test('A3: choose respects the campaign station bypass schedule', () => {
  // Station 1 is bypassed for this seed: reaching cell 8 skips its challenge and continues.
  let s = null;
  for (let seed = 1; seed < 60 && !s; seed++) {
    let t = team(seed);
    if (!t.race.stationSchedule[0]) s = t;
  }
  assert(s, 'found a seed with bypassed station 1');
  finishTravel(s);
  s.race.position = 3;
  let r = choose(s, 6, 1000);
  assert.equal(s.race.outcomes.at(-1).bypassed, true, 'station was bypassed, not solved');
  assert.equal(s.race.outcomes.at(-1).skipped, true);
  assert.equal(s.race.phase, 'travel', 'bypass keeps the team moving');
  assert.equal(s.race.position, 9, '3+6=9, station 8 was passed through');
});

test('A5: dice rooms keep pure roll untouched; choose never draws from the bag', () => {
  let duel = {seed: 3, id: 'd', status: 'active', solved: [], events: [], score: 0, penalty: 0, cooldown: 0, drafts: {}};
  initRace(duel);
  let r = roll(duel, 1000);
  assert.equal(r.ok, true);
  assert(r.die >= 1 && r.die <= 6);
  assert.equal(duel.race.rolls, 1);
  assert(duel.race.bag.length < 6, 'roll consumed exactly one die from the bag');
  // Campaign choose never touches the bag: a later duel-style bag check stays deterministic.
  let s = team(11);
  finishTravel(s);
  let bagBefore = null;
  choose(s, 3, 1000);
  assert.equal(s.race.bag.length, bagBefore ?? 0, 'choose draws no die');
});

function finishTravel(s) {
  // Solve the start station so the team is ready to travel.
  s.race.phase = 'travel';
  s.race.outcomes.push({station: 0, position: 0, digit: 1, at: 0});
  s.solved.push(1);
}

// ===== Regression tests for the Codex QA review of v34 (single-source, 2026-10-27) =====

test('Fix 1a: choose stamps the requestId (rid) into the movement event', () => {
  let s = team(11);
  finishTravel(s);
  let r = choose(s, 2, 1000, 'req-rid-1');
  assert.equal(r.ok, true);
  let ev = s.events.find(e => e.type === 'choose');
  assert(ev, 'choose event exists');
  assert.equal(ev.rid, 'req-rid-1', 'movement event carries the requestId for the commit guard');
  assert.equal(ev.steps, 2);
  assert.equal(ev.cost, 60);
});

test('Fix 1b (mục 1): commit SQL refuses the charge when a concurrent skill purchase consumed the revision', () => {
  const database = new DatabaseSync(':memory:');
  database.exec(`CREATE TABLE teams(id TEXT PRIMARY KEY, data TEXT, revision INTEGER, removed_at TEXT);
CREATE TABLE rooms(id TEXT PRIMARY KEY, revision INTEGER, round INTEGER, deleted_at TEXT);
CREATE TABLE skill_actions(id TEXT PRIMARY KEY, room_id TEXT, actor_id TEXT, target_id TEXT, kind TEXT, cost INTEGER, created INTEGER);
INSERT INTO rooms VALUES('r',5,1,NULL);`);
  // Same SQL as app/api/escape/route.js chooseInsert + team-state update.
  const CHOOSE_UPDATE = `UPDATE teams SET data=?,revision=revision+1 WHERE id=? AND revision=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND revision=? AND round=? AND deleted_at IS NULL)`;
  const CHOOSE_INSERT = `INSERT INTO skill_actions(id,room_id,actor_id,target_id,kind,cost,created) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM teams WHERE id=? AND revision=? AND removed_at IS NULL) AND EXISTS(SELECT 1 FROM json_each(COALESCE((SELECT json_extract(data,'$.events') FROM teams WHERE id=?),'[]')) WHERE json_extract(value,'$.rid')=?) AND (SELECT COALESCE(json_extract(data,'$.score'),0) FROM teams WHERE id=?) - COALESCE((SELECT SUM(cost) FROM skill_actions WHERE actor_id=?),0) >= ?`;
  // Happy path: the UPDATE writes rid-bearing state, then the INSERT sees its own committed move.
  let s = team(11);
  finishTravel(s);
  assert.equal(choose(s, 2, 1000, 'rid-happy').ok, true);
  database.prepare('INSERT INTO teams(id,data,revision,removed_at) VALUES(?,?,?,NULL)').run('t1', JSON.stringify(s), 6);
  assert.equal(Number(database.prepare(CHOOSE_UPDATE).run(JSON.stringify(s), 't1', 6, 'r', 5, 1).changes), 1, 'move update commits');
  assert.equal(Number(database.prepare(CHOOSE_INSERT).run('rid-happy', 'r', 't1', 't1', 'choose', 60, 1000, 't1', 7, 't1', 'rid-happy', 't1', 't1', 60).changes), 1, 'charge commits with its own move');
  // Race: a concurrent skill purchase bumps the revision (6→7) but the row data never gains the rid event.
  let before = team(21);
  finishTravel(before);
  database.prepare('INSERT INTO teams(id,data,revision,removed_at) VALUES(?,?,?,NULL)').run('t2', JSON.stringify(before), 6);
  assert.equal(Number(database.prepare(`UPDATE teams SET revision=7 WHERE id=? AND revision=6`).run('t2').changes), 1, 'concurrent skill purchase bumps the revision');
  assert.equal(Number(database.prepare(CHOOSE_UPDATE).run(JSON.stringify(before), 't2', 6, 'r', 5, 1).changes), 0, 'move update loses to the concurrent bump');
  assert.equal(Number(database.prepare(CHOOSE_INSERT).run('rid-race', 'r', 't2', 't2', 'choose', 60, 1000, 't2', 7, 't2', 'rid-race', 't2', 't2', 60).changes), 0, 'no charge without the committed movement event (was the lost-cost bug)');
  assert.equal(database.prepare(`SELECT COALESCE(SUM(cost),0) AS n FROM skill_actions WHERE actor_id='t2'`).get().n, 0, 'ledger shows nothing spent');
});

test('Fix 3 (mục 3): API blocks choose while an individual pact pass is unpaid; roll pays it', async () => {
  const database = new DatabaseSync(':memory:');
  for (const file of ['0000_boring_pete_wisdom.sql', '0001_organic_aqueduct.sql', '0002_big_ogun.sql', '0003_dazzling_rockslide.sql', '0004_classy_wolf_cub.sql', '0005_reflective_hellion.sql', '0006_empty_harry_osborn.sql', '0007_rapid_ezekiel.sql'])
    database.exec(await readFile(resolve('drizzle', file), 'utf8'));
  database.exec('PRAGMA foreign_keys=ON');
  function stmt(sql, ...params) { const query = database.prepare(sql); return { first: () => query.get(...params) ?? null, all: () => ({ results: query.all(...params) }), run: () => { const result = query.run(...params); return { meta: { changes: Number(result.changes) } }; } }; }
  const testEnv = { SITE_OWNER_EMAIL: 'root@race.test', SITE_OWNER_USER_ID: 'root-race-id' };
  const storage = { stmt, db: () => ({ batch: queries => { database.exec('BEGIN'); try { const result = queries.map(q => q.run()); database.exec('COMMIT'); return result; } catch (e) { database.exec('ROLLBACK'); throw e; } } }), getEnv: () => testEnv };
  let clock = 1000000;
  class TestDate extends Date { static now() { return clock; } }
  database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID, testEnv.SITE_OWNER_EMAIL, 'Root', clock);
  database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID, 'root', clock, testEnv.SITE_OWNER_USER_ID);
  const context = createContext({ structuredClone, Date: TestDate, crypto: globalThis.crypto, Request, Response, URL, TextEncoder, console });
  const cache = new Map();
  async function moduleAt(path) { if (cache.has(path)) return cache.get(path); let loadedModule; if (resolve(path) === resolve('lib/storage.js')) loadedModule = new SyntheticModule(['stmt', 'db', 'getEnv'], function () { this.setExport('stmt', storage.stmt); this.setExport('db', storage.db); this.setExport('getEnv', storage.getEnv); }, { context, identifier: path }); else loadedModule = new SourceTextModule(await readFile(path, 'utf8'), { context, identifier: path }); cache.set(path, loadedModule); return loadedModule; }
  const entryModule = await moduleAt(resolve('app/api/escape/route.js'));
  await entryModule.link((specifier, parent) => specifier.startsWith('node:') ? nativeVmModule(specifier, context) : moduleAt(resolve(dirname(parent.identifier), specifier)));
  await entryModule.evaluate();
  const route = entryModule.namespace;
  const rootH = { 'oai-authenticated-user-id': testEnv.SITE_OWNER_USER_ID, 'oai-authenticated-user-email': testEnv.SITE_OWNER_EMAIL };
  async function post(action, body = {}, token = '', extraH = {}) { let response = await route.POST(new Request('https://game.test/api/escape', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Origin': 'https://game.test', ...extraH }, body: JSON.stringify({ action, requestId: crypto.randomUUID(), ...body }) })); return { status: response.status, data: await response.json() }; }
  const teacher = (action, body = {}) => post(action, body, '', rootH);
  const raw = () => JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(T.id).data);
  const id = crypto.randomUUID(), admin = crypto.randomUUID() + crypto.randomUUID();
  const room = (await teacher('create-room', { id, adminKey: admin, title: 'Solo QA', campaign: { grade: 10, topics: ['sets', 'quadratic', 'vectors'], playMode: 'individual', stationMax: 2 } })).data.room;
  const T = (await post('join', { code: room.code, name: 'Cáo', mascot: 0 })).data.session;
  assert.equal((await post('mascot', { id: T.id, mascot: 4, round: 1 }, T.token)).status, 200);
  await teacher('begin', { id });
  // Solve the start gate so the team is ready to travel.
  let pick = await post('choose-level', { id: T.id, level: 0, round: 1 }, T.token);
  assert.equal(pick.status, 200, JSON.stringify(pick.data));
  let s = raw(), i = s.race.outcomes.length;
  let p = challenge(i, s.levels[i], s.seed), input = { ...p.expected };
  if (i === 2) input.circuit = '1,0,0,0,0,0,0,0,1';
  let sub = await post('submit', { id: T.id, input, round: 1 }, T.token);
  assert.equal(sub.status, 200, JSON.stringify(sub.data));
  assert.equal(sub.data.result.ok, true, JSON.stringify(sub.data));
  assert.equal(raw().race.phase, 'travel');
  // Promise one pass pact: one movement is now owed before any purchase.
  assert.equal((await post('pact', { id: T.id, choice: 'pass', round: 1 }, T.token)).status, 200);
  assert.equal(raw().race.promisedPasses, 1);
  let scoreBefore = raw().score;
  let blocked = await post('choose', { id: T.id, steps: 2, sequence: raw().race.rolls, round: 1 }, T.token);
  assert.equal(blocked.status, 409, JSON.stringify(blocked.data));
  assert.equal(blocked.data.code, 'PACT_DEBT', 'direct choose calls cannot dodge the pact');
  assert.equal(raw().race.position, 0, 'blocked choose never moves');
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM skill_actions').get().n, 0, 'blocked choose never charges');
  assert.equal(raw().score, scoreBefore, 'blocked choose never deducts');
  // roll() pays the pact pass without moving.
  let paid = await post('roll', { id: T.id, sequence: raw().race.rolls, round: 1 }, T.token);
  assert.equal(paid.status, 200, JSON.stringify(paid.data));
  assert.equal(paid.data.result.skipped, true, 'the roll is consumed by the pact pass');
  assert.equal(raw().race.paidPasses, 1);
  assert.equal(raw().race.position, 0);
  // After settling the debt, choose works and commits the charge with its movement.
  clock += 1;
  let bought = await post('choose', { id: T.id, steps: 2, sequence: raw().race.rolls, round: 1 }, T.token);
  assert.equal(bought.status, 200, JSON.stringify(bought.data));
  assert.equal(bought.data.result.cost, 60);
  assert.equal(bought.data.result.to, 2);
  assert.equal(raw().race.position, 2);
  assert.equal(database.prepare(`SELECT COUNT(*) AS n FROM skill_actions WHERE kind='choose'`).get().n, 1, 'charge committed exactly once with the move');
  assert.equal(raw().score, scoreBefore, 'the charge is booked as spent, not deducted from stored score');
});

test('Fix 8 (mục 8): campaign rules no longer advertise Xúc xắc kép; duel text unchanged', async () => {
  const src = await readFile(resolve('public/app.js'), 'utf8');
  const i = src.indexOf('<li><strong>Kỹ năng di chuyển:</strong> ${c ? \'');
  assert(i > 0, 'movement skills rule is split by mode');
  const j = src.indexOf(" : '", i);
  const campaign = src.slice(i, j);
  assert(!campaign.includes('Xúc xắc kép'), 'campaign branch omits the locked double dice');
  assert(campaign.includes('Tiến thêm 45 điểm'), 'campaign branch keeps boost');
  const k = src.indexOf('}</li>', j);
  assert(k > j, 'duel branch delimiter found');
  const duel = src.slice(j, k);
  assert(duel.includes('Xúc xắc kép 70 điểm'), 'duel keeps the original double dice text');
});

test('Fix dot2 (mục 8): result() auto log excludes choose/start-grant (raceHistory renders them)', async () => {
  const src = await readFile(resolve('public/app.js'), 'utf8');
  const i = src.indexOf('function result()');
  const end = src.indexOf('function hintDialog()', i);
  assert(i > 0 && end > i, 'result() region found');
  const region = src.slice(i, end);
  assert(region.includes(`'choose', 'start-grant'`), 'choose/start-grant excluded from the generic result log');
});

test('Fix dot2 (mục 8): teacher report gate arrival time counts choose moves (campaign)', async () => {
  const src = await readFile(resolve('public/app.js'), 'utf8');
  const i = src.indexOf('function teamDetail');
  const end = src.indexOf('function render()', i);
  assert(i > 0 && end > i, 'teamDetail region found');
  const region = src.slice(i, end);
  assert(region.includes(`(e.type === 'roll' || e.type === 'choose') && e.to === [0, 8, 16, 24, 32][i]`), 'gate arrival matches choose moves too');
  assert(!region.includes(`e => e.type === 'roll' && e.to === [0, 8, 16, 24, 32][i]`), 'roll-only gate lookup is gone');
});

// ===== Reward dice settles as mana points in campaign (user decision, 2026-10-27) =====

test('C4 reward dice: campaign settles the extra die as 100 mana points; duel keeps extraDice', async () => {
  const src = await readFile(resolve('app/api/escape/route.js'), 'utf8');
  const i = src.indexOf(`if (choice === 'dice')`);
  const end = src.indexOf(`s.events.push({ type: 'reward'`, i);
  assert(i > 0 && end > i, 'dice reward branch found');
  const region = src.slice(i, end);
  assert(region.includes('if (s.campaign)'), 'campaign branch exists');
  assert(region.includes('s.score += 100'), 'campaign settles 100 mana points');
  assert(region.includes('s.race.extraDice'), 'duel still grants the extra die');
  assert(src.slice(end, end + 220).includes(`choice === 'dice' && s.campaign ? 100 : r.points`), 'reward event records the 100 points in campaign');
});

test('C4 reward dice UI: campaign panel swaps the extra die for mana points; duel text unchanged', async () => {
  const src = await readFile(resolve('public/app.js'), 'utf8');
  const i = src.indexOf('function bonusPanel()');
  const end = src.indexOf('function travel()', i);
  assert(i > 0 && end > i, 'bonusPanel region found');
  const region = src.slice(i, end);
  assert(region.includes(`r.campaign ? [['dice', 'Nhận 100 điểm mã lực'`), 'campaign swaps the dice option for mana points');
  assert(region.includes(`'Một xúc xắc thêm'`), 'duel keeps the extra dice option');
  const h = src.indexOf('function raceHistory(');
  const hEnd = src.indexOf('function', h + 10);
  assert(h > 0 && hEnd > h, 'raceHistory region found');
  assert(src.slice(h, hEnd).includes(`dice: r.race.campaign ? 'điểm mã lực' : 'xúc xắc thêm'`), 'history label follows the mode');
});

test('QA v34 F1: buySkill re-renders right after apply so the mana balance is never stale', async () => {
  const src = await readFile(resolve('public/app.js'), 'utf8');
  const i = src.indexOf('async function buySkill');
  const end = src.indexOf('function personalSkills()', i);
  assert(i > 0 && end > i, 'buySkill region found');
  const region = src.slice(i, end);
  assert(/apply\(d\);\s*render\(\);/.test(region), 'render() follows apply(d) inside buySkill');
});

test('QA v34 F2: teacher board flags out-of-mana teams and uses a mode-aware travel notice', async () => {
  const src = await readFile(resolve('public/app.js'), 'utf8');
  const i = src.indexOf('function teamDetail');
  const end = src.indexOf('function teacherMathHistory', i);
  assert(i > 0 && end > i, 'teamDetail region found');
  const region = src.slice(i, end);
  assert(region.includes(`let noMana = !finished && r.race?.campaign && (r.score || 0) < 30;`), 'noMana condition matches the 30-point buy floor');
  assert(region.includes(`\${noMana ? ' · Hết mã lực' : ''}\${finished`), 'summary carries the out-of-mana label');
  assert(region.includes(`: 'Đang chơi'}\${noMana ? ' · Hết mã lực' : ''} · \${r.completed}/5 khóa`), 'body carries the out-of-mana label');
  assert(region.includes(`r.race?.campaign ? 'Chờ lượt di chuyển hoặc xử lý sự kiện.' : 'Chờ lượt xúc xắc hoặc xử lý sự kiện.'`), 'travel notice follows the mode');
});

test('QA v34 F3: campaign mode has no leftover dice wording in gate button, bonus keep text, rules reward or mana helper', async () => {
  const src = await readFile(resolve('public/app.js'), 'utf8');
  assert(src.includes(`state.race.campaign ? 'Trở lại bản đồ · Chọn bước di chuyển' : 'Trở lại bản đồ · Lăn xúc xắc'`), 'gate button label follows the mode');
  assert(src.includes(`r.campaign ? 'Giữ 2 bước để cộng vào lượt di chuyển tiếp theo. Vẫn dừng ở cổng được chỉ định.' : 'Giữ 2 bước để cộng vào lượt xúc xắc tiếp theo. Vẫn dừng ở cổng được chỉ định.'`), 'bonus keep-steps text follows the mode');
  assert(src.includes(`\${c ? 'nhận 100 điểm mã lực' : 'thêm 1 viên xúc xắc vào lượt di chuyển kế tiếp'}. Chỉ nhận một lợi ích;`), 'rules reward list follows the mode');
  assert(src.includes('giao kèo (+40 điểm, tối đa 2/ván)'), 'out-of-mana helper mentions the pact recovery (+40, max 2 per race)');
});

test('QA v36 F3b: map cell tooltip and roll-button fallback stay mode-aware in campaign', async () => {
  const src = await readFile(resolve('public/app.js'), 'utf8');
  const t = src.indexOf('function terrainInfo(');
  const tEnd = src.indexOf('function raceMap(', t);
  assert(t > 0 && tEnd > t, 'terrainInfo region found');
  const terrain = src.slice(t, tEnd);
  assert(terrain.includes(`m.campaign ? 'Chọn bước di chuyển khi đến lượt để tiến về cổng tiếp theo.' : 'Lăn xúc xắc khi đến lượt để tiến về cổng tiếp theo.'`), 'map cell tooltip follows the mode');
  const b = src.indexOf('function bonusPanel()');
  const bEnd = src.indexOf('function pactsPanel(', b);
  assert(b > 0 && bEnd > b, 'bonusPanel region found');
  assert(src.slice(b, bEnd).includes(`\${r.campaign ? 'Chọn bước di chuyển' : 'Lăn xúc xắc'}`), 'roll button fallback follows the mode');
  const c = src.indexOf('function updateRaceClock()');
  const cEnd = src.indexOf('function updateClockRaceAbandon(', c);
  assert(c > 0 && cEnd > c, 'updateRaceClock region found');
  const clock = src.slice(c, cEnd);
  assert(clock.includes(`state.race.campaign ? 'Chọn bước di chuyển · Lượt của bạn' : 'Lăn xúc xắc · Lượt của bạn'`), 'individual clock label follows the mode');
  assert(clock.includes(`own ? (state.race.campaign ? 'Chọn bước di chuyển · ' : 'Lăn xúc xắc · ') + left + ' giây'`), 'team clock label follows the mode');
});
