import test from 'node:test';
import assert from 'node:assert/strict';
import { aiStatus, saveAI, clearAI, testAI, loadStoredAI, cleanAIInput, GEMINI_ENDPOINT } from '../lib/ai-settings.js';
import { lessonAIConfig, setStoredAIConfig } from '../lib/lesson/generation-provider.js';

function fakeDb() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        bind(...v) {
          return {
            async first() { return rows.has(v[0]) ? { value: rows.get(v[0]) } : null; },
            async run() {
              if (/^INSERT/.test(sql)) rows.set(v[0], v[1]);
              if (/^DELETE/.test(sql)) rows.delete(v[0]);
            },
          };
        },
      };
    },
  };
}

test('owner-saved key turns AI on, status never reveals the key, clear turns it off', async () => {
  setStoredAIConfig(null);
  const db = fakeDb();
  assert.equal((await aiStatus(db, {})).configured, false);
  await saveAI(db, { key: 'AIzaSyTESTKEY123456', model: 'gemini-flash-latest' }, 5);
  const status = await aiStatus(db, {});
  assert.equal(status.configured, true);
  assert.equal(status.origin, 'saved');
  assert.equal(status.keyHint, '…3456');
  assert.equal(JSON.stringify(status).includes('AIzaSyTESTKEY'), false);
  setStoredAIConfig(null);
  await loadStoredAI(db);
  assert.deepEqual(lessonAIConfig({}), { endpoint: GEMINI_ENDPOINT, model: 'gemini-flash-latest', key: 'AIzaSyTESTKEY123456' });
  await clearAI(db);
  assert.equal(lessonAIConfig({}), null);
  assert.equal((await aiStatus(db, {})).configured, false);
});

test('env configuration wins over the saved key', async () => {
  const db = fakeDb();
  await saveAI(db, { key: 'AIzaSyTESTKEY123456' });
  const env = { LESSON_AI_ENABLED: 'true', LESSON_AI_ENDPOINT: 'https://ai.example.test/chat', LESSON_AI_MODEL: 'm', LESSON_AI_API_KEY: 'secret' };
  assert.equal(lessonAIConfig(env).key, 'secret');
  assert.equal((await aiStatus(db, env)).origin, 'env');
  setStoredAIConfig(null);
});

test('input validation rejects bad keys, models and non-https endpoints', () => {
  assert.throws(() => cleanAIInput({ key: 'short' }), /INVALID_AI_KEY/);
  assert.throws(() => cleanAIInput({ key: 'has space inside key' }), /INVALID_AI_KEY/);
  assert.throws(() => cleanAIInput({ key: 'AIzaSyTESTKEY123456', model: 'bad model!' }), /INVALID_AI_MODEL/);
  assert.throws(() => cleanAIInput({ key: 'AIzaSyTESTKEY123456', endpoint: 'http://x.test' }), /INVALID_AI_ENDPOINT/);
  assert.throws(() => cleanAIInput({ key: 'AIzaSyTESTKEY123456', endpoint: 'https://x.test/chat?key=FAKE_URL_SECRET' }), /INVALID_AI_ENDPOINT/);
});

test('connection test sends one tiny request with the bearer key and maps HTTP errors', async () => {
  const db = fakeDb();
  await saveAI(db, { key: 'AIzaSyTESTKEY123456' });
  let seen;
  const ok = await testAI({}, async (url, init) => { seen = { url, init }; return { ok: true, status: 200 }; });
  assert.deepEqual(ok, { ok: true, status: 'OK' });
  assert.equal(seen.init.headers.Authorization, 'Bearer AIzaSyTESTKEY123456');
  assert.equal(JSON.parse(seen.init.body).max_tokens, 5);
  assert.deepEqual(await testAI({}, async () => ({ ok: false, status: 401 })), { ok: false, status: 'HTTP_401' });
  setStoredAIConfig(null);
  assert.deepEqual(await testAI({}), { ok: false, status: 'NOT_CONFIGURED' });
});

test('a slow read that began before clear or save never restores an older key (ticket ordering)', async () => {
  setStoredAIConfig(null);
  const db = fakeDb();
  await saveAI(db, { key: 'FAKE_RACE_KEY_1234' });
  let releaseOld;
  const old = db.rows.get('lesson_ai');
  const slowDb = { prepare: () => ({ bind: () => ({ first: () => new Promise((resolve) => { releaseOld = () => resolve({ value: old }); }) }) }) };
  const slowLoad = loadStoredAI(slowDb);
  await clearAI(db);
  assert.equal(lessonAIConfig({}), null);
  releaseOld();
  await slowLoad;
  assert.equal(lessonAIConfig({}), null, 'stale load lost to the newer clear');
  const slowStatus = aiStatus(slowDb, {});
  await saveAI(db, { key: 'FAKE_NEWER_KEY_5678' });
  releaseOld();
  await slowStatus;
  assert.equal(lessonAIConfig({}).key, 'FAKE_NEWER_KEY_5678', 'stale status read lost to the newer save');
  setStoredAIConfig(null);
});

test('delayed save or clear acknowledgement follows the latest database write', async () => {
  for (const operation of ['save', 'clear']) {
    const db = fakeDb();
    setStoredAIConfig(null);
    if (operation === 'clear') await saveAI(db, { key: 'FAKE_OLDER_KEY_1234' });
    let release;
    const delayed = {
      prepare(sql) {
        return { bind(...args) {
          const statement = db.prepare(sql).bind(...args);
          return { first: () => statement.first(), async run() {
            await statement.run();
            await new Promise(resolve => { release = resolve; });
          } };
        } };
      },
    };
    const pending = operation === 'save'
      ? saveAI(delayed, { key: 'FAKE_DELAYED_KEY_1234' }) : clearAI(delayed);
    while (!release) await Promise.resolve();
    if (operation === 'save') await clearAI(db);
    else await saveAI(db, { key: 'FAKE_NEWER_KEY_5678' });
    release();
    await pending;
    assert.equal(lessonAIConfig({})?.key ?? null, operation === 'save' ? null : 'FAKE_NEWER_KEY_5678');
    assert.equal((await aiStatus(db, {})).configured, operation === 'clear');
    setStoredAIConfig(null);
  }
});
