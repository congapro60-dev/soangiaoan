// AI connection that the site owner pastes in the app (system_settings key 'lesson_ai'). The key is never sent back to
// a browser: status shows only the last 4 characters. Env variables LESSON_AI_* still win when they are set.
import * as provider from './lesson/generation-provider.js';

const setStoredAIConfig = (value) => provider.setStoredAIConfig?.(value);
const lessonAIConfig = (env) => provider.lessonAIConfig(env);

const KEY = 'lesson_ai';
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
export const GEMINI_MODEL = 'gemini-flash-latest'; // Google alias for the current Flash model; the owner can type another model name

async function read(db) {
  try {
    if (typeof db === 'function') db = db();
    const row = await db.prepare('SELECT value FROM system_settings WHERE key=?').bind(KEY).first();
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}

/** Call at the start of any request that may use AI, so lessonAIConfig() sees the saved connection. Accepts the db or the db() getter; never throws. */
export async function loadStoredAI(db) {
  await fresh(db);
}

// Every writer of the shared in-memory copy takes a ticket; an older ticket never overwrites a newer one, so a slow
// read that started before "Xóa khóa"/"Lưu khóa" finished cannot bring the old key back.
let ticket = 0;
let applied = 0;
function apply(value, mine) {
  if (mine < applied) return;
  applied = mine;
  setStoredAIConfig(value);
}
async function fresh(db) {
  const mine = ++ticket;
  const value = await read(db);
  apply(value, mine);
  return value;
}

export async function aiStatus(db, env) {
  const saved = await fresh(db);
  const fromEnv = env?.LESSON_AI_ENABLED === 'true' && Boolean(env.LESSON_AI_API_KEY);
  let config = null;
  try {
    config = lessonAIConfig(env);
  } catch {
    config = null;
  }
  return {
    configured: Boolean(config),
    origin: fromEnv ? 'env' : saved?.enabled ? 'saved' : null,
    model: config?.model || saved?.model || GEMINI_MODEL,
    endpoint: config?.endpoint || saved?.endpoint || GEMINI_ENDPOINT,
    keyHint: fromEnv ? null : saved?.key ? '…' + saved.key.slice(-4) : null,
    updatedAt: saved?.updatedAt || null,
  };
}

export function cleanAIInput({ endpoint = GEMINI_ENDPOINT, model = GEMINI_MODEL, key } = {}) {
  const e = String(endpoint).trim();
  const m = String(model).trim();
  const k = String(key ?? '').trim();
  let url;
  try {
    url = new URL(e);
  } catch {
    throw new Error('INVALID_AI_ENDPOINT');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw new Error('INVALID_AI_ENDPOINT');
  if (!/^[\w.:/-]{1,80}$/.test(m)) throw new Error('INVALID_AI_MODEL');
  if (k.length < 10 || k.length > 300 || /\s/.test(k)) throw new Error('INVALID_AI_KEY');
  return { endpoint: url.href, model: m, key: k };
}

export async function saveAI(db, input, now = Date.now()) {
  const value = { ...cleanAIInput(input), enabled: true, updatedAt: now };
  await db.prepare('INSERT INTO system_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').bind(KEY, JSON.stringify(value), now).run();
  await fresh(db); // re-read after the write: the DB is the truth, so a later clear always wins even if this reply is slow
}

export async function clearAI(db) {
  await db.prepare('DELETE FROM system_settings WHERE key=?').bind(KEY).run();
  await fresh(db);
}

/** One tiny request so the owner knows the key works. Returns { ok, status }. */
export async function testAI(env, fetchImpl = fetch) {
  const config = lessonAIConfig(env);
  if (!config) return { ok: false, status: 'NOT_CONFIGURED' };
  try {
    const response = await fetchImpl(config.endpoint, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.key },
      body: JSON.stringify({ model: config.model, stream: false, max_tokens: 5, messages: [{ role: 'user', content: 'Reply with OK.' }] }),
    });
    return { ok: response.ok, status: response.ok ? 'OK' : 'HTTP_' + response.status };
  } catch {
    return { ok: false, status: 'NETWORK' };
  }
}
