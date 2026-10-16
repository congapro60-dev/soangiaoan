import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ calls: 0, plan: [] as Array<'ok-then-429' | 'fail-immediately-then-ok'>, configs: [] as Array<Record<string, any>> }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContentStream: async (params: { config?: Record<string, any> }) => {
        h.calls += 1;
        h.configs.push(params.config ?? {});
        const kind = h.plan[h.calls - 1] ?? 'ok-then-429';
        return (async function* () {
          if (kind === 'fail-immediately-then-ok') throw new Error('500 model lỗi ngay đầu luồng');
          yield { text: 'phần đầu ' };
          yield { text: 'phần hai ' };
          throw new Error('429 RESOURCE_EXHAUSTED');
        })();
      },
    };
  },
}));

import { callGeminiAIStream } from './gemini';

describe('luồng Gemini không in lặp khi lỗi giữa chừng (QA F8)', () => {
  it('đã có chữ hiện ra rồi thì lỗi được ném ngay — KHÔNG thử lại/đổi model để bắt đầu lại từ đầu', async () => {
    h.calls = 0;
    h.plan = [];
    const chunks: string[] = [];
    await expect(callGeminiAIStream('p', 'khoa', chunk => chunks.push(chunk))).rejects.toThrow('429');
    expect(chunks).toEqual(['phần đầu ', 'phần hai ']); // trước đây: cùng đoạn này lặp lại ~10 lần theo chuỗi model dự phòng
    expect(h.calls).toBe(1);
  });

  it('chưa có chữ nào mà lỗi ở đầu luồng thì vẫn được đổi sang model dự phòng như cũ', async () => {
    h.calls = 0;
    h.plan = ['fail-immediately-then-ok'];
    const chunks: string[] = [];
    await expect(callGeminiAIStream('p', 'khoa', chunk => chunks.push(chunk))).rejects.toThrow('429');
    expect(h.calls).toBeGreaterThan(1); // đã thử model kế tiếp
    expect(chunks.filter(chunk => chunk === 'phần đầu ').length).toBe(1); // nhưng khi đã có chữ thì dừng, không lặp
  });

  it('mức suy nghĩ vào thinkingConfig.thinkingLevel (viết hoa theo SDK), đúng theo model đang gọi; mức không hợp model thì bỏ', async () => {
    h.configs = [];
    h.calls = 0;
    h.plan = [];
    await callGeminiAIStream('p', 'khoa', () => undefined, 0, 'gemini-3.8-flash', 'high').catch(() => undefined);
    expect(h.configs[0].thinkingConfig).toEqual({ thinkingLevel: 'HIGH' });
    h.configs = [];
    await callGeminiAIStream('p', 'khoa', () => undefined, 0, 'gemini-3.8-flash', 'minimal').catch(() => undefined);
    expect(h.configs[0].thinkingConfig).toBeUndefined();
    h.configs = [];
    await callGeminiAIStream('p', 'khoa', () => undefined, 0, 'gemini-3.7-flash', 'high').catch(() => undefined);
    expect(h.configs[0].thinkingConfig).toBeUndefined();
  });
});
