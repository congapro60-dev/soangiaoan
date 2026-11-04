import { afterEach, describe, expect, it, vi } from 'vitest';
import { benchmarkAdapter, getGradingChain, runWithGradingChain } from '../_grading-core';

afterEach(() => vi.unstubAllEnvs());

describe('lớp chấm cho đo so sánh model', () => {
  it('nhận đúng dạng nhà/model[@mức], thiếu khoá hoặc sai dạng → null', () => {
    vi.stubEnv('GRADING_VILAO_API_KEY', 'k');
    vi.stubEnv('GRADING_XKIRO_API_KEY', '');
    expect(benchmarkAdapter('vilao/gemini-3.8-flash@low')?.name).toBe('vilao/gemini-3.8-flash@low');
    expect(benchmarkAdapter('xkiro/qwen/qwen3.8-max:free')).toBeNull();
    expect(benchmarkAdapter('openai/gpt-6')).toBeNull();
    expect(benchmarkAdapter('vilao/x@extreme')).toBeNull();
    expect(benchmarkAdapter('vilao/a b')).toBeNull();
  });

  it('ép chuỗi chỉ trong khối việc; ngoài khối giữ chuỗi thường', async () => {
    vi.stubEnv('GRADING_VILAO_API_KEY', 'k');
    const only = benchmarkAdapter('vilao/m@none')!;
    const inside = await runWithGradingChain([only], async () => getGradingChain());
    expect(inside.map(a => a.name)).toEqual(['vilao/m@none']);
    expect(getGradingChain().map(a => a.name)).not.toContain('vilao/m@none');
  });
});

describe('cầu dao nguồn chấm', () => {
  it('nguồn hỏng bị gác xuống cuối; hết thời gian gác thì về lại vị trí ưu tiên', async () => {
    const { callGradingVision, orderByHealth, resetGradingHealth } = await import('../_grading-core');
    resetGradingHealth();
    const calls: string[] = [];
    const free = { name: 'free', tier: 're' as const, call: async () => { calls.push('free'); throw new Error('503'); } };
    const paid = { name: 'paid', tier: 're' as const, call: async () => { calls.push('paid'); return 'ok'; } };
    expect(await runWithGradingChain([free, paid], () => callGradingVision('p', []))).toBe('ok');
    expect(await runWithGradingChain([free, paid], () => callGradingVision('p', []))).toBe('ok');
    expect(calls).toEqual(['free', 'paid', 'paid']); // lượt 2 không phí giờ chờ nguồn đang gác
    expect(orderByHealth([free, paid], Date.now() + 6 * 60_000).map(a => a.name)).toEqual(['free', 'paid']);
    resetGradingHealth();
  });

  it('lớp chưa phải cuối bị giới hạn maxMs để còn giờ cho lớp sau', async () => {
    const { callGradingVision, resetGradingHealth } = await import('../_grading-core');
    resetGradingHealth();
    const seen: (number | undefined)[] = [];
    const slow = { name: 's', tier: 're' as const, maxMs: 50_000, call: async (_p: string, _i: unknown[], o: { timeoutMs?: number }) => { seen.push(o.timeoutMs); throw new Error('timeout'); } };
    const last = { name: 'l', tier: 're' as const, maxMs: 50_000, call: async (_p: string, _i: unknown[], o: { timeoutMs?: number }) => { seen.push(o.timeoutMs); return 'ok'; } };
    await runWithGradingChain([slow, last], () => callGradingVision('p', [], { timeoutMs: 200_000 }));
    expect(seen[0]).toBe(50_000);
    expect(seen[1]).toBeGreaterThan(100_000);
    resetGradingHealth();
  });
});

describe('nhóm chữ: nguồn miễn phí / gói trước, rồi chuỗi chấm thường', () => {
  it('OpenCode → PShareHub → Vilao…; thiếu khoá thì bỏ lớp; nguồn miễn phí hỏng thì rơi xuống', async () => {
    const { getTextChain, callTextModel, resetGradingHealth } = await import('../_grading-core');
    resetGradingHealth();
    vi.stubEnv('GRADING_VILAO_API_KEY', 'k-vilao');
    vi.stubEnv('GRADING_XKIRO_API_KEY', '');
    vi.stubEnv('GRADING_GEMINI_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('TEXT_OPENCODE_API_KEY', 'k-oc');
    vi.stubEnv('TEXT_PSHARE_API_KEY', '');
    expect(getTextChain().map(a => a.name)).toEqual(['opencode/deepseek-v4.1-flash-free', 'vilao/gemini-3.8-flash', 'vilao/deepseek-v4.1-flash']);
    const fetchMock = vi.fn(async (url: string) => (String(url).includes('opencode.ai')
      ? { ok: false, status: 429, text: async () => 'rate' }
      : { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'từ vilao' } }] }) }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await callTextModel('đề')).toBe('từ vilao');
    expect(String(fetchMock.mock.calls[0][0])).toContain('opencode.ai/zen/v1');
    vi.unstubAllGlobals();
    resetGradingHealth();
  });
});
