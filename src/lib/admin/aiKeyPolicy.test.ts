import { describe, expect, it } from 'vitest';
import { AI_KEY_MODES, EXHAUSTED_COOLDOWN_MS, classifyGeminiKeyFailure, decideAiKey, effectiveAiMode, looksLikeGeminiKey, rateLimitRetryMs, type AiKeyMode, type AiKeyPolicyInput } from './aiKeyPolicy';

const NOW = Date.parse('2026-09-24T10:00:00Z');

describe('chế độ nguồn khoá do giáo viên chọn', () => {
  const OK = { status: 'ok' as const };
  const HET = { status: 'exhausted' as const, statusAt: new Date(NOW - 5 * 60_000).toISOString() };
  const HONG = { status: 'invalid' as const };
  const decide = (patch: Partial<AiKeyPolicyInput>) => decideAiKey({ gateEnabled: true, isShared: false, ownKey: null, consent: true, now: NOW, ...patch });

  it('chưa chọn thì suy từ hành vi cũ: nhóm hoặc đã đồng ý = cả hai; còn lại = chỉ khoá riêng', () => {
    expect(effectiveAiMode({ isShared: true, consent: false })).toBe('both');
    expect(effectiveAiMode({ isShared: false, consent: true })).toBe('both');
    expect(effectiveAiMode({ isShared: false, consent: false })).toBe('own');
    expect(effectiveAiMode({ mode: null, isShared: false, consent: true })).toBe('both');
  });

  it('chọn ví/cả hai nhưng chưa đồng ý tính phí (ngoài nhóm) thì vẫn là chỉ khoá riêng — không bao giờ trừ ví khi chưa đồng ý', () => {
    expect(effectiveAiMode({ mode: 'wallet', isShared: false, consent: false })).toBe('own');
    expect(effectiveAiMode({ mode: 'both', isShared: false, consent: false })).toBe('own');
    expect(effectiveAiMode({ mode: 'wallet', isShared: true, consent: false })).toBe('wallet');
    expect(effectiveAiMode({ mode: 'own', isShared: true, consent: true })).toBe('own');
  });

  it('CHỈ KHOÁ RIÊNG: khoá dùng được thì dùng; không thì chặn — kể cả người trong nhóm và đã đồng ý', () => {
    for (const patch of [{ isShared: false, consent: true }, { isShared: true, consent: true }]) {
      expect(decide({ ...patch, mode: 'own', ownKey: OK })).toEqual({ use: 'own' });
      expect(decide({ ...patch, mode: 'own', ownKey: null })).toEqual({ use: 'blocked', reason: 'no_key' });
      expect(decide({ ...patch, mode: 'own', ownKey: HET })).toEqual({ use: 'blocked', reason: 'exhausted' });
      expect(decide({ ...patch, mode: 'own', ownKey: HONG })).toEqual({ use: 'blocked', reason: 'invalid' });
    }
  });

  it('CHỈ VÍ WEB: bỏ qua khoá riêng dù đang dùng tốt; người trong nhóm ghi nguồn "shared", người ngoài "owner_consent"', () => {
    expect(decide({ mode: 'wallet', ownKey: OK })).toEqual({ use: 'owner_consent' });
    expect(decide({ mode: 'wallet', ownKey: null })).toEqual({ use: 'owner_consent' });
    expect(decide({ mode: 'wallet', isShared: true, consent: false, ownKey: OK })).toEqual({ use: 'shared' });
  });

  it('CẢ HAI: khoá riêng trước; hết/hỏng/không có thì sang ví', () => {
    expect(decide({ mode: 'both', ownKey: OK })).toEqual({ use: 'own' });
    for (const ownKey of [null, HET, HONG]) expect(decide({ mode: 'both', ownKey })).toEqual({ use: 'owner_consent' });
    expect(decide({ mode: 'both', isShared: true, consent: false, ownKey: HET })).toEqual({ use: 'shared' });
  });

  it('chưa bật kiểm soát thì mọi chế độ đều dùng khoá chung như trước', () => {
    for (const mode of AI_KEY_MODES as readonly AiKeyMode[]) expect(decide({ gateEnabled: false, mode, ownKey: OK })).toEqual({ use: 'shared' });
  });
});

describe('chọn khoá AI', () => {
  it('chưa bật kiểm soát, hoặc thuộc nhóm dùng khoá chung → khoá chung', () => {
    expect(decideAiKey({ gateEnabled: false, isShared: false, ownKey: null, consent: false })).toEqual({ use: 'shared' });
    expect(decideAiKey({ gateEnabled: true, isShared: true, ownKey: null, consent: false })).toEqual({ use: 'shared' });
  });

  it('người trong nhóm có khoá riêng thì dùng khoá riêng trước (không trừ ví); khoá hỏng thì về khoá chung', () => {
    expect(decideAiKey({ gateEnabled: true, isShared: true, ownKey: { status: 'ok' }, consent: false })).toEqual({ use: 'own' });
    expect(decideAiKey({ gateEnabled: true, isShared: true, ownKey: { status: 'invalid' }, consent: false })).toEqual({ use: 'shared' });
  });

  it('người ngoài nhóm: khoá riêng trước; hết thì đã đồng ý mới sang khoá chung; chưa đồng ý thì chặn', () => {
    const base = { gateEnabled: true, isShared: false, now: NOW };
    expect(decideAiKey({ ...base, ownKey: { status: 'ok' }, consent: true })).toEqual({ use: 'own' });
    expect(decideAiKey({ ...base, ownKey: null, consent: false })).toEqual({ use: 'blocked', reason: 'no_key' });
    expect(decideAiKey({ ...base, ownKey: null, consent: true })).toEqual({ use: 'owner_consent' });
    const vuaHet = { status: 'exhausted' as const, statusAt: new Date(NOW - 5 * 60_000).toISOString() };
    expect(decideAiKey({ ...base, ownKey: vuaHet, consent: false })).toEqual({ use: 'blocked', reason: 'exhausted' });
    expect(decideAiKey({ ...base, ownKey: vuaHet, consent: true })).toEqual({ use: 'owner_consent' });
    expect(decideAiKey({ ...base, ownKey: { status: 'invalid' }, consent: false })).toEqual({ use: 'blocked', reason: 'invalid' });
  });

  it('khoá "hết" nghỉ đủ 60 phút thì được thử lại', () => {
    const cu = { status: 'exhausted' as const, statusAt: new Date(NOW - EXHAUSTED_COOLDOWN_MS).toISOString() };
    expect(decideAiKey({ gateEnabled: true, isShared: false, ownKey: cu, consent: false, now: NOW })).toEqual({ use: 'own' });
  });

  it('chỉ lỗi CỦA KHOÁ mới tính là hết/hỏng; quá tải hay lỗi máy chủ Google thì không', () => {
    expect(classifyGeminiKeyFailure(429, '{"error":{"status":"RESOURCE_EXHAUSTED"}}')).toBe('exhausted');
    expect(classifyGeminiKeyFailure(400, '{"error":{"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}')).toBe('invalid');
    expect(classifyGeminiKeyFailure(403, '{"error":{"status":"PERMISSION_DENIED","message":"billing not enabled"}}')).toBe('invalid');
    expect(classifyGeminiKeyFailure(400, '{"error":{"message":"Invalid JSON payload"}}')).toBeNull();
    expect(classifyGeminiKeyFailure(503, 'overloaded')).toBeNull();
    expect(classifyGeminiKeyFailure(500, 'quota internal')).toBeNull();
  });

  it('nhận dạng khoá Gemini', () => {
    expect(looksLikeGeminiKey('AIza' + 'a'.repeat(35))).toBe(true);
    expect(looksLikeGeminiKey('sk-abc')).toBe(false);
    // Khoá dạng mới của Google (bắt đầu "AQ.")
    expect(looksLikeGeminiKey('AQ.Ab8RN6' + 'x'.repeat(40))).toBe(true);
    expect(looksLikeGeminiKey('  AQ.Ab8RN6' + 'x'.repeat(40) + ' ')).toBe(true);
    expect(looksLikeGeminiKey('AQ.ngan')).toBe(false);
    expect(looksLikeGeminiKey('AQ.Ab8 RN6' + 'x'.repeat(40))).toBe(false);
  });
});

describe('rateLimitRetryMs — 429 vì gọi nhanh hay vì hết hạn mức', () => {
  it('giới hạn mỗi phút: đợi theo retryDelay (kẹp 5 giây – 2 phút), không có retryDelay thì 60 giây', () => {
    expect(rateLimitRetryMs(429, '{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel"},{"retryDelay":"34s"}')).toBe(34_000);
    expect(rateLimitRetryMs(429, '"retryDelay": "1s"')).toBe(5_000);
    expect(rateLimitRetryMs(429, '"retryDelay": "900s"')).toBe(120_000);
    expect(rateLimitRetryMs(429, 'GenerateRequestsPerMinutePerProjectPerModel')).toBe(60_000);
  });
  it('hết hạn mức ngày, gói free = 0, thân lỗi không rõ, hoặc không phải 429 → null (dừng đợt)', () => {
    expect(rateLimitRetryMs(429, 'GenerateRequestsPerDayPerProjectPerModel "retryDelay":"30s"')).toBeNull();
    expect(rateLimitRetryMs(429, 'limit: 0, model: gemini')).toBeNull();
    expect(rateLimitRetryMs(429, 'RESOURCE_EXHAUSTED')).toBeNull();
    expect(rateLimitRetryMs(503, '"retryDelay":"30s"')).toBeNull();
  });
});
