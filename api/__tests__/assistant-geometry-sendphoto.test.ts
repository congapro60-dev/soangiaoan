import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendPhoto } from '../_assistant-zalo-send.js';

/**
 * sendPhoto — gửi ảnh hình học qua Zalo Bot API.
 * Ảnh phải là URL công khai (Storage token URL); caption chia tin ≤2000, giữ đủ nội dung.
 */
const okResponse = () => ({ ok: true, json: async () => ({ ok: true }) } as Response);

afterEach(() => { vi.unstubAllGlobals(); });

describe('sendPhoto', () => {
  it('P1: POST đúng endpoint + body chat_id/photo/caption', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    const sent = await sendPhoto('tok', 'chat-1', 'https://firebasestorage/x.png', 'Lời giải.');
    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toBe('https://bot-api.zaloplatforms.com/bottok/sendPhoto');
    expect(String(init?.method)).toBe('POST');
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ chat_id: 'chat-1', photo: 'https://firebasestorage/x.png', caption: 'Lời giải.' });
  });

  it('P2: caption dài được chia tin, giữ nguyên nội dung', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    await sendPhoto('tok', 'c', 'https://x/y.png', 'a'.repeat(2500));
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]?.body));
    expect(body.caption.length).toBeLessThanOrEqual(2000);
    const bodies = fetchMock.mock.calls.map(call => JSON.parse(String((call as unknown as [string, RequestInit])[1].body)));
    expect(bodies.map(item => item.caption ?? item.text).join('')).toBe('a'.repeat(2500));
  });

  it('P3: Zalo trả lỗi → false, KHÔNG throw (caller fallback về text)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400 } as Response)));
    expect(await sendPhoto('tok', 'c', 'https://x/y.png', 'cap')).toBe(false);
  });

  it('P4: mạng lỗi/timeout → false, KHÔNG throw', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom'); }));
    expect(await sendPhoto('tok', 'c', 'https://x/y.png', 'cap')).toBe(false);
  });
});
