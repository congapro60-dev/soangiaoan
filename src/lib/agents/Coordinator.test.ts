import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runMultiAgentPipeline } from './Coordinator';
import type { AgentContext } from './types';

vi.mock('./PlanningAgent', () => ({ executePlanningAgent: vi.fn() }));
vi.mock('./ContentAgent', () => ({ executeContentAgent: vi.fn() }));
vi.mock('./FormatAgent', () => ({ executeFormatAgent: vi.fn() }));

import { executePlanningAgent } from './PlanningAgent';
import { executeContentAgent } from './ContentAgent';
import { executeFormatAgent } from './FormatAgent';

const RAW = '# Giáo án thô\n' + 'Nội dung chi tiết các hoạt động dạy học. '.repeat(20);

const makeContext = (): AgentContext & { chunks: string[] } => {
  const chunks: string[] = [];
  return {
    chunks,
    onStreamChunk: (c: string) => { chunks.push(c); },
    onStatusChange: () => {},
  } as unknown as AgentContext & { chunks: string[] };
};

beforeEach(() => {
  vi.mocked(executePlanningAgent).mockResolvedValue({ plan: 'dàn ý' } as any);
  vi.mocked(executeContentAgent).mockResolvedValue({ rawContent: RAW } as any);
});

describe('runMultiAgentPipeline — Format Agent là bước trang điểm, không được làm mất nội dung', () => {
  it('Format thành công → trả finalMarkdown', async () => {
    vi.mocked(executeFormatAgent).mockResolvedValue({ finalMarkdown: RAW + '\n(đã định dạng)' } as any);
    const ctx = makeContext();
    const result = await runMultiAgentPipeline(ctx);
    expect(result).toContain('(đã định dạng)');
  });

  it('Format THROW (quota 429) → trả nội dung thô, editor nhận rawContent thay placeholder', async () => {
    vi.mocked(executeFormatAgent).mockRejectedValue(new Error('429 RESOURCE_EXHAUSTED'));
    const ctx = makeContext();
    const result = await runMultiAgentPipeline(ctx);
    expect(result).toBe(RAW);
    // Chunk cuối cùng đẩy vào editor phải là nội dung thật, không phải dòng chờ.
    expect(ctx.chunks[ctx.chunks.length - 1]).toBe(RAW);
  });

  it('Format trả kết quả cụt (<50% nội dung) → coi như thất bại, dùng bản thô', async () => {
    vi.mocked(executeFormatAgent).mockResolvedValue({ finalMarkdown: 'cụt' } as any);
    const ctx = makeContext();
    const result = await runMultiAgentPipeline(ctx);
    expect(result).toBe(RAW);
  });

  it('Planning lỗi → vẫn throw (không có nội dung nào để cứu)', async () => {
    vi.mocked(executePlanningAgent).mockRejectedValue(new Error('boom'));
    const ctx = makeContext();
    await expect(runMultiAgentPipeline(ctx)).rejects.toThrow('boom');
  });
});
