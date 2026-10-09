/**
 * DANH SÁCH NHIỀU KHOÁ GEMINI (phía máy chủ) — xem `src/lib/admin/geminiKeyPool.ts`.
 *
 * Lưu ở `adminSettings/geminiKeyPool` { keys: PoolKey[] }: CHỈ máy chủ đọc/ghi (firestore.rules không mở đường này),
 * khoá thật không bao giờ trả về trình duyệt — giao diện quản trị chỉ nhận 4 ký tự cuối.
 * Việc chọn khoá chạy trong `callGeminiRawHeld` (`_grading-core.ts`) cho nguồn khoá CHUNG; khoá riêng của giáo viên không đi qua đây.
 */
import { classifyGeminiKeyFailure, looksLikeGeminiKey, type AiKeyStatus } from '../src/lib/admin/aiKeyPolicy.js';
import {
  POOL_MAX_KEYS, cooldownMsFor, pickPoolKey, sanitizePool, toPoolKeyView, type PoolKey, type PoolKeyTier,
} from '../src/lib/admin/geminiKeyPool.js';
import { getAdminDb } from './_exam-core.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

const poolRef = (db: Db) => db.collection('adminSettings').doc('geminiKeyPool');
const CACHE_MS = 20_000;
let cache: { keys: PoolKey[]; at: number } | null = null;
let rotation = 0;

const readPool = async (db: Db, fresh = false): Promise<PoolKey[]> => {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.keys;
  const snap = await poolRef(db).get();
  const keys = sanitizePool(snap.exists ? snap.data()?.keys : []);
  cache = { keys, at: Date.now() };
  return keys;
};

/** Chỉ dùng trong test: bỏ bộ nhớ đệm giữa các ca. */
export const resetGeminiPoolCache = (): void => { cache = null; rotation = 0; };

export interface PooledKey { id: string; key: string; tier: PoolKeyTier }

/** Khoá kế tiếp trong danh sách cho `model` (không ném lỗi: danh sách hỏng thì lùi về khoá môi trường, không làm hỏng lượt chấm). */
export const pickFromPool = async (model: string, tried: ReadonlySet<string>): Promise<PooledKey | null> => {
  try {
    const keys = await readPool(getAdminDb());
    const picked = pickPoolKey(keys, model, Date.now(), tried, rotation++);
    return picked ? { id: picked.id, key: picked.key, tier: picked.tier } : null;
  } catch (error) {
    console.error('[gemini-pool] không đọc được danh sách khoá:', error);
    return null;
  }
};

const mutatePool = async (db: Db, change: (keys: PoolKey[]) => PoolKey[] | null): Promise<PoolKey[]> => {
  let result: PoolKey[] = [];
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(poolRef(db));
    const current = sanitizePool(snap.exists ? snap.data()?.keys : []);
    const next = change(current);
    result = next ?? current;
    if (next) transaction.set(poolRef(db), { keys: next, updatedAt: new Date().toISOString() });
  });
  cache = { keys: result, at: Date.now() };
  return result;
};

/** Google từ chối khoá này: ghi trạng thái + cho nghỉ theo model. KHÔNG ném lỗi. */
export const reportPoolKeyFailure = async (picked: PooledKey, model: string, failure: AiKeyStatus, detail: string): Promise<void> => {
  try {
    const now = Date.now();
    await mutatePool(getAdminDb(), keys => keys.map(k => {
      if (k.id !== picked.id) return k;
      const message = detail.replace(/\s+/g, ' ').slice(0, 300);
      if (failure === 'invalid') return { ...k, status: 'invalid' as const, statusAt: new Date(now).toISOString(), statusMessage: message };
      return {
        ...k,
        status: 'exhausted' as const,
        statusAt: new Date(now).toISOString(),
        statusMessage: message,
        cooldowns: { ...(k.cooldowns ?? {}), [model]: new Date(now + cooldownMsFor(detail, now)).toISOString() },
      };
    }));
  } catch (error) {
    console.error('[gemini-pool] không ghi được trạng thái khoá:', error);
  }
};

/** Khoá vừa gọi thành công mà đang bị đánh dấu hết hạn mức → xoá dấu (hạn mức đã đặt lại). KHÔNG ném lỗi. */
export const reportPoolKeySuccess = async (picked: PooledKey): Promise<void> => {
  try {
    const known = cache?.keys.find(k => k.id === picked.id);
    if (!known || (known.status ?? 'ok') === 'ok') return;
    await mutatePool(getAdminDb(), keys => keys.map(k => {
      if (k.id !== picked.id) return k;
      const { status: _s, statusAt: _a, statusMessage: _m, ...rest } = k;
      return rest;
    }));
  } catch (error) {
    console.error('[gemini-pool] không xoá được dấu hết hạn mức:', error);
  }
};

// ── Quản trị ────────────────────────────────────────────────────────────────

type Reply = { status: number; payload: Record<string, unknown> };

const view = (keys: PoolKey[], envConfigured: boolean): Reply => ({
  status: 200,
  payload: { keys: keys.map(k => toPoolKeyView(k, Date.now())), envKeyConfigured: envConfigured, maxKeys: POOL_MAX_KEYS },
});

const newId = (): string => `k_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Thử khoá bằng một lượt gọi rất nhỏ trước khi nhận vào danh sách: sai khoá thì báo ngay, không để dò ra lúc đang chấm bài. */
const pingKey = async (key: string, model: string): Promise<{ ok: true } | { ok: false; message: string }> => {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Trả lời đúng một chữ: ok' }] }], generationConfig: { maxOutputTokens: 16 } }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (res.ok) return { ok: true };
    const detail = await res.text().catch(() => '');
    const failure = classifyGeminiKeyFailure(res.status, detail);
    // Hết hạn mức lúc thử vẫn là khoá thật: nhận vào, hệ thống tự cho nghỉ rồi quay lại.
    if (failure === 'exhausted') return { ok: true };
    return { ok: false, message: failure === 'invalid' ? 'Google báo khoá này không dùng được (sai khoá, bị thu hồi hoặc chưa bật Gemini API).' : `Google trả lỗi ${res.status} khi thử khoá.` };
  } catch {
    return { ok: false, message: 'Không gọi được Google để thử khoá. Thử lại sau ít phút.' };
  }
};

/** Các action quản trị danh sách khoá; trả null nếu không phải việc của module này. Người gọi đã kiểm quyền quản trị. */
export const handleGeminiPoolAdmin = async (
  db: Db,
  action: string,
  body: Body,
  model: string,
  envConfigured: boolean,
): Promise<Reply | null> => {
  if (action === 'adminGeminiKeys') return view(await readPool(db, true), envConfigured);

  if (action === 'adminSaveGeminiKey') {
    const id = typeof body.id === 'string' ? body.id : '';
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : '';
    const tier: PoolKeyTier = body.tier === 'paid' ? 'paid' : 'free';
    const enabled = body.enabled !== false;
    if (id) {
      let found = false;
      const keys = await mutatePool(db, current => current.map(k => {
        if (k.id !== id) return k;
        found = true;
        const base: PoolKey = { ...k, label, tier, enabled };
        // "Bật lại / xoá nghỉ": quản trị chủ động đưa khoá về trạng thái tốt (vd đã sửa lỗi bên Google).
        if (body.clearStatus === true) {
          const { status: _s, statusAt: _a, statusMessage: _m, cooldowns: _c, ...rest } = base;
          return rest;
        }
        return base;
      }));
      return found ? view(keys, envConfigured) : { status: 404, payload: { error: 'Không tìm thấy khoá này.' } };
    }
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!looksLikeGeminiKey(key)) return { status: 422, payload: { error: 'Khoá Gemini có dạng "AIza…" (39 ký tự). Kiểm tra lại khoá vừa dán.' } };
    const current = await readPool(db, true);
    if (current.some(k => k.key === key)) return { status: 409, payload: { error: 'Khoá này đã có trong danh sách.' } };
    if (current.length >= POOL_MAX_KEYS) return { status: 422, payload: { error: `Danh sách tối đa ${POOL_MAX_KEYS} khoá.` } };
    const ping = await pingKey(key, model);
    if (!ping.ok) return { status: 422, payload: { error: ping.message } };
    const keys = await mutatePool(db, list => (list.some(k => k.key === key) || list.length >= POOL_MAX_KEYS
      ? null
      : [...list, { id: newId(), label, key, tier, enabled }]));
    return view(keys, envConfigured);
  }

  if (action === 'adminDeleteGeminiKey') {
    const id = typeof body.id === 'string' ? body.id : '';
    const keys = await mutatePool(db, current => (current.some(k => k.id === id) ? current.filter(k => k.id !== id) : null));
    return view(keys, envConfigured);
  }
  return null;
};
