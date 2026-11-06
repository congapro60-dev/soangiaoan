import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendPhoto, sendStyled, splitZaloMessage } from '../_assistant-zalo-send.js';

afterEach(() => vi.unstubAllGlobals());
describe('Zalo delivery boundaries', () => {
  it('preserves a long list completely, including emoji and last assignment', async () => {
    const message = Array.from({ length: 80 }, (_, i) => `${i + 1} — Bài tập 📚 ${'x'.repeat(70)}`).join('\n');
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    vi.stubGlobal('fetch', fetcher);
    await sendStyled('token', 'test', message, false);
    const texts = fetcher.mock.calls.map(call => JSON.parse((call as unknown as [string, RequestInit])[1].body as string).text);
    expect(texts.join('')).toBe(message);
    expect(texts.every(t => t.length <= 2000)).toBe(true);
    expect(splitZaloMessage('x'.repeat(1799) + '📚tail').join('')).toBe('x'.repeat(1799) + '📚tail');
  });
  it('HTTP 200 with API rejection stops further chunks', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: false, error_code: 429 }) }));
    vi.stubGlobal('fetch', fetcher);
    await sendStyled('token', 'test', 'x'.repeat(5000), false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not retry ambiguous transport failures', async () => {
    const fetcher = vi.fn(async () => { throw new Error('network'); });
    vi.stubGlobal('fetch', fetcher);
    await sendStyled('token', 'test', 'Title\nBody');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retries plain text only on explicit formatting rejection', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ ok: false, error_code: 400, description: 'Cannot parse entities' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetcher);
    await sendStyled('token', 'test', 'Title\nBody');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).parse_mode).toBeUndefined();
  });
  it('sendPhoto checks API rejection in an HTTP success response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: false }) })));
    expect(await sendPhoto('token', 'test', 'https://example.com/a.jpg', 'caption')).toBe(false);
  });
});


it('preserves long photo captions across photo and following messages', async () => {
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  vi.stubGlobal('fetch', fetcher);
  const caption = 'Lời giải\n' + 'x'.repeat(4000) + '\nhttps://example.com/assignment';
  expect(await sendPhoto('token', 'test', 'https://example.com/a.jpg', caption)).toBe(true);
  const bodies = fetcher.mock.calls.map(call => JSON.parse((call as unknown as [string, RequestInit])[1].body as string));
  expect(bodies.map(body => body.caption ?? body.text).join('')).toBe(caption);
  expect(bodies.every(body => (body.caption ?? body.text).length <= 2000)).toBe(true);
});
