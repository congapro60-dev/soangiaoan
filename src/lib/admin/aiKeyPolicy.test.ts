import { describe, expect, it } from 'vitest';
import { EXHAUSTED_COOLDOWN_MS, classifyGeminiKeyFailure, decideAiKey, looksLikeGeminiKey } from './aiKeyPolicy';

const NOW = Date.parse('2026-09-24T10:00:00Z');

describe('chọn khoá AI', () => {
  it('chưa bật kiểm soát, hoặc thuộc nhóm dùng khoá chung → khoá chung', () => {
    expect(decideAiKey({ gateEnabled: false, isShared: false, ownKey: null, consent: false })).toEqual({ use: 'shared' });
    expect(decideAiKey({ gateEnabled: true, isShared: true, ownKey: null, consent: false })).toEqual({ use: 'shared' });
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
  });
});
