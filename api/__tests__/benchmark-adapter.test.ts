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
