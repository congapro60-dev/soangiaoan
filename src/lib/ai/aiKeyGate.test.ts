import { afterEach, describe, expect, it, vi } from 'vitest';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const blocked = () => json(402, { code: 'AI_KEY_REQUIRED', reason: 'no_balance' });

const setup = async (responses: Response[]) => {
  vi.resetModules();
  const fetchMock = vi.fn(async () => responses.shift() ?? json(200, { ok: true }));
  (globalThis as { window?: unknown }).window = { fetch: fetchMock };
  const gate = await import('./aiKeyGate');
  gate.installAiKeyFetchGate();
  const win = (globalThis as unknown as { window: { fetch: typeof fetch } }).window;
  return { gate, fetchMock, call: (url: string) => win.fetch(url, { method: 'POST', body: '{}' }) };
};

afterEach(() => { delete (globalThis as { window?: unknown }).window; });

describe('aiKeyGate', () => {
  it('gửi lại đúng yêu cầu cũ khi giáo viên xử lý xong và bấm Thử lại', async () => {
    const { gate, fetchMock, call } = await setup([blocked(), json(200, { graded: true })]);
    const resolver = vi.fn(async () => true);
    gate.setAiKeyGateResolver(resolver);
    const res = await call('/api/grade-homework');
    expect(resolver).toHaveBeenCalledWith('no_balance');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('bấm Để sau → trả nguyên 402 cho nơi gọi, không gửi lại', async () => {
    const { gate, fetchMock, call } = await setup([blocked()]);
    gate.setAiKeyGateResolver(async () => false);
    const res = await call('/api/classroom');
    expect(res.status).toBe(402);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('nhiều yêu cầu bị chặn cùng lúc chỉ mở MỘT hộp', async () => {
    const { gate, call } = await setup([blocked(), blocked()]);
    let release: (value: boolean) => void = () => undefined;
    const resolver = vi.fn(() => new Promise<boolean>(resolve => { release = resolve; }));
    gate.setAiKeyGateResolver(resolver);
    const both = Promise.all([call('/api/grade-homework'), call('/api/grade-homework')]);
    await new Promise(resolve => setTimeout(resolve, 0));
    release(true);
    const results = await both;
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(results.map(r => r.status)).toEqual([200, 200]);
  });

  it('bỏ qua 402 của đường khác hoặc không phải AI_KEY_REQUIRED', async () => {
    const { gate, call } = await setup([blocked(), json(402, { error: 'khác' })]);
    const resolver = vi.fn(async () => true);
    gate.setAiKeyGateResolver(resolver);
    expect((await call('/api/other')).status).toBe(402);
    expect((await call('/api/classroom')).status).toBe(402);
    expect(resolver).not.toHaveBeenCalled();
  });
});
