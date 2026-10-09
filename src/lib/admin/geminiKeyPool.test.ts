import { describe, expect, it } from 'vitest';
import {
  COOLDOWN_NO_FREE_TIER_MS, COOLDOWN_UNKNOWN_MS, POOL_MAX_KEYS, cooldownMsFor, isCooling, pickPoolKey, sanitizePool, toPoolKeyView,
  type PoolKey,
} from './geminiKeyPool';

const NOW = Date.parse('2026-10-09T10:00:00Z');
const MODEL = 'gemini-3.8-flash';
const key = (id: string, over: Partial<PoolKey> = {}): PoolKey => ({ id, label: id, key: `AIza${id.padEnd(35, 'x')}`, tier: 'free', enabled: true, ...over });
const none = new Set<string>();

describe('cooldownMsFor — nghỉ bao lâu sau khi Google từ chối vì hạn mức', () => {
  it('"limit: 0" = model này không có hạn mức miễn phí ở khoá này → nghỉ 24 giờ', () => {
    expect(cooldownMsFor('Quota exceeded for metric ... limit: 0, model: gemini-3.8-flash', NOW)).toBe(COOLDOWN_NO_FREE_TIER_MS);
  });
  it('hạn mức NGÀY → nghỉ tới 08:00 UTC kế tiếp', () => {
    const ms = cooldownMsFor('quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier', NOW);
    expect(NOW + ms).toBe(Date.parse('2026-10-10T08:00:00Z'));
    const lucSau = Date.parse('2026-10-09T07:00:00Z');
    expect(lucSau + cooldownMsFor('PerDay', lucSau)).toBe(Date.parse('2026-10-09T08:00:00Z'));
  });
  it('có retryDelay thì dùng (kẹp 5 giây..15 phút); không rõ thì nghỉ ngắn', () => {
    expect(cooldownMsFor('{"retryDelay": "34s"}', NOW)).toBe(34_000);
    expect(cooldownMsFor('{"retryDelay": "99999s"}', NOW)).toBe(15 * 60 * 1000);
    expect(cooldownMsFor('{"retryDelay": "1s"}', NOW)).toBe(5_000);
    expect(cooldownMsFor('RESOURCE_EXHAUSTED', NOW)).toBe(COOLDOWN_UNKNOWN_MS);
  });
});

describe('pickPoolKey — thứ tự chọn khoá', () => {
  it('free trước paid; xoay vòng giữa các khoá cùng hạng', () => {
    const keys = [key('p1', { tier: 'paid' }), key('f1'), key('f2')];
    expect(pickPoolKey(keys, MODEL, NOW, none, 0)?.id).toBe('f1');
    expect(pickPoolKey(keys, MODEL, NOW, none, 1)?.id).toBe('f2');
    expect(pickPoolKey(keys, MODEL, NOW, none, 2)?.id).toBe('f1');
  });
  it('bỏ qua khoá tắt, hỏng, đang nghỉ (đúng model đó) hoặc đã thử trong lượt này; hết free thì sang paid, hết nữa thì null', () => {
    const cooling = key('f1', { cooldowns: { [MODEL]: new Date(NOW + 60_000).toISOString() } });
    const keys = [cooling, key('f2', { enabled: false }), key('f3', { status: 'invalid' }), key('p1', { tier: 'paid' })];
    expect(pickPoolKey(keys, MODEL, NOW, none, 0)?.id).toBe('p1');
    expect(pickPoolKey(keys, MODEL, NOW, new Set(['p1']), 0)).toBeNull();
    // nghỉ theo model: model khác thì khoá vẫn dùng được; nghỉ xong thì dùng lại
    expect(pickPoolKey([cooling], 'gemini-3.7-flash', NOW, none, 0)?.id).toBe('f1');
    expect(pickPoolKey([cooling], MODEL, NOW + 61_000, none, 0)?.id).toBe('f1');
    expect(isCooling(cooling, MODEL, NOW)).toBe(true);
  });
  it('khoá đang "hết hạn mức" nhưng đã qua giờ nghỉ thì được thử lại', () => {
    const k = key('f1', { status: 'exhausted', cooldowns: { [MODEL]: new Date(NOW - 1).toISOString() } });
    expect(pickPoolKey([k], MODEL, NOW, none, 0)?.id).toBe('f1');
  });
});

describe('sanitizePool / toPoolKeyView', () => {
  it('bỏ mục hỏng, trùng mã, trùng khoá; cắt ở trần; mặc định free + bật', () => {
    const raw = [key('a'), key('a'), { ...key('b'), key: key('a').key }, null, { id: 'c' }, { id: 'd', key: 'AIzaZ', tier: 'lạ' }];
    const out = sanitizePool(raw);
    expect(out.map(k => k.id)).toEqual(['a', 'd']);
    expect(out[1]).toMatchObject({ tier: 'free', enabled: true });
    expect(sanitizePool(Array.from({ length: 50 }, (_, i) => key(`k${i}`))).length).toBe(POOL_MAX_KEYS);
  });
  it('bản gửi giao diện KHÔNG chứa khoá thật, chỉ 4 ký tự cuối, và lọc mốc nghỉ đã qua', () => {
    const k = key('f1', { cooldowns: { a: new Date(NOW + 1000).toISOString(), b: new Date(NOW - 1000).toISOString() } });
    const v = toPoolKeyView(k, NOW);
    expect(JSON.stringify(v)).not.toContain(k.key);
    expect(v.last4).toBe(k.key.slice(-4));
    expect(Object.keys(v.cooldowns)).toEqual(['a']);
    expect(v.status).toBe('ok');
  });
});
