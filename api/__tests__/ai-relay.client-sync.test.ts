import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/firebase', () => ({ auth: { currentUser: null } }));

import { RELAY_MODELS } from '../_ai-relay-core';
import { RELAY_MODEL_IDS, callAiRelay, relayModelFor } from '../../src/lib/aiRelay';

describe('relay ví web — trình duyệt và máy chủ phải thống nhất', () => {
  it('danh sách model trình duyệt được phép gửi = danh sách máy chủ chấp nhận (lệch là lượt gọi bị 400)', () => {
    expect([...RELAY_MODEL_IDS]).toEqual([...RELAY_MODELS]);
  });

  it('model đang chọn nếu ví trả được, không thì Gemini 3.8 Flash', () => {
    expect(relayModelFor('gemini-3.7-flash')).toBe('gemini-3.7-flash');
    expect(relayModelFor(undefined, 'gemini-3.1-pro-preview')).toBe('gemini-3.1-pro-preview');
    expect(relayModelFor('gemini-3.5-flash')).toBe('gemini-3.8-flash');
    expect(relayModelFor(undefined)).toBe('gemini-3.8-flash');
  });

  it('chưa đăng nhập giáo viên thì báo lỗi rõ ràng, không gọi mạng', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(callAiRelay({ prompt: 'x', model: 'gemini-3.8-flash' })).rejects.toThrow('đăng nhập');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
