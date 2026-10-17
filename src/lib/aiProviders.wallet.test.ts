import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Ví web trả thay khoá cho Gemini / Claude / ChatGPT: kiểm "có khoá" cho giao diện và đường gọi (relay hay khoá riêng) của từng chế độ.

const m = vi.hoisted(() => ({
  callAiRelay: vi.fn(),
  claudeCreate: vi.fn(),
  openaiCreate: vi.fn(),
  geminiRaw: vi.fn(),
}));

vi.mock('./firebase', () => ({ auth: { currentUser: null } }));
vi.mock('./aiRelay', async () => {
  const actual = await vi.importActual<typeof import('./aiRelay')>('./aiRelay');
  return { ...actual, callAiRelay: m.callAiRelay };
});
vi.mock('./gemini', async () => {
  const actual = await vi.importActual<typeof import('./gemini')>('./gemini');
  return { ...actual, callGeminiAIRaw: m.geminiRaw };
});
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: m.claudeCreate }; },
}));
vi.mock('openai', () => ({
  default: class { chat = { completions: { create: m.openaiCreate } }; },
}));

import { WALLET_MANAGED_API_KEY, callAI, callAIStream, getActiveApiKey } from './aiProviders';
import { setAiModeSnapshot } from './ai/aiModeStore';

type TestSettings = Parameters<typeof getActiveApiKey>[0];
const settings = (over: Record<string, unknown>) => ({ selectedProvider: 'gemini', ...over }) as unknown as TestSettings;
const on = (mode: 'own' | 'wallet' | 'both', relayVendors: string[] = ['claude', 'openai']) => setAiModeSnapshot({ mode, gateEnabled: true, relayVendors });

beforeEach(() => {
  vi.clearAllMocks();
  m.callAiRelay.mockResolvedValue({ text: 'từ ví web', model: 'm', truncated: false });
});
afterEach(() => setAiModeSnapshot(null));

describe('getActiveApiKey — "có khoá" cho giao diện khi ví web trả thay', () => {
  it('chưa có chế độ / web chưa bật phí / chỉ khoá riêng: rỗng như cũ, nên giao diện vẫn nhắc nhập khoá', () => {
    expect(getActiveApiKey(settings({}))).toBe('');
    setAiModeSnapshot({ mode: 'wallet', gateEnabled: false, relayVendors: ['claude'] });
    expect(getActiveApiKey(settings({}))).toBe('');
    on('own');
    expect(getActiveApiKey(settings({}))).toBe('');
    expect(getActiveApiKey(settings({ selectedProvider: 'claude' }))).toBe('');
  });

  it('chế độ ví hoặc "cả hai" mà chưa có khoá riêng: có dấu hiệu "ví trả thay" (không còn bị chặn bằng "Vui lòng nhập API Key")', () => {
    on('wallet');
    expect(getActiveApiKey(settings({}))).toBe(WALLET_MANAGED_API_KEY);
    expect(getActiveApiKey(settings({ selectedProvider: 'claude' }))).toBe(WALLET_MANAGED_API_KEY);
    expect(getActiveApiKey(settings({ selectedProvider: 'openai' }))).toBe(WALLET_MANAGED_API_KEY);
    on('both');
    expect(getActiveApiKey(settings({ selectedProvider: 'claude' }))).toBe(WALLET_MANAGED_API_KEY);
  });

  it('có khoá riêng thì luôn trả đúng khoá đó, không bao giờ trả dấu hiệu', () => {
    on('wallet');
    expect(getActiveApiKey(settings({ geminiApiKey: 'AIza-own' }))).toBe('AIza-own');
    expect(getActiveApiKey(settings({ selectedProvider: 'claude', claudeApiKey: 'sk-ant-own' }))).toBe('sk-ant-own');
  });

  it('hãng chưa được máy chủ bật ví, hoặc hãng không có ví (Grok, DeepSeek): vẫn rỗng', () => {
    on('wallet', ['claude']);
    expect(getActiveApiKey(settings({ selectedProvider: 'openai' }))).toBe('');
    expect(getActiveApiKey(settings({ selectedProvider: 'grok' }))).toBe('');
    expect(getActiveApiKey(settings({ selectedProvider: 'deepseek' }))).toBe('');
  });
});

describe('Claude / ChatGPT — đường gọi theo chế độ', () => {
  it('chế độ chỉ ví: gọi relay đúng hãng + model đang chọn (nếu ví trả được), không đụng SDK của hãng', async () => {
    on('wallet');
    const text = await callAI('Soạn bài', settings({ selectedProvider: 'claude', selectedModel: 'claude-haiku-4-5-20251001' }));
    expect(text).toBe('từ ví web');
    expect(m.callAiRelay).toHaveBeenCalledWith(expect.objectContaining({ provider: 'claude', model: 'claude-haiku-4-5-20251001', prompt: 'Soạn bài' }));
    expect(m.claudeCreate).not.toHaveBeenCalled();
  });

  it('model đang chọn mà ví chưa trả được thì dùng model "nên dùng" của hãng', async () => {
    on('wallet');
    await callAI('x', settings({ selectedProvider: 'openai', selectedModel: 'gpt-5' }));
    expect(m.callAiRelay).toHaveBeenCalledWith(expect.objectContaining({ provider: 'openai', model: 'gpt-6.1-sol' }));
  });

  it('chế độ chỉ khoá riêng, hoặc máy chủ chưa bật ví cho hãng: khoá riêng như cũ, không relay', async () => {
    m.claudeCreate.mockResolvedValue({ content: [{ type: 'text', text: 'từ khoá riêng' }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' });
    on('own');
    expect(await callAI('x', settings({ selectedProvider: 'claude', claudeApiKey: 'sk-ant-own' }))).toBe('từ khoá riêng');
    on('wallet', []);
    expect(await callAI('x', settings({ selectedProvider: 'claude', claudeApiKey: 'sk-ant-own' }))).toBe('từ khoá riêng');
    expect(m.callAiRelay).not.toHaveBeenCalled();
  });

  it('"cả hai": khoá riêng trước; lỗi CỦA KHOÁ (hết tiền nạp/429) mới chuyển sang ví, lỗi quá tải thì KHÔNG đốt ví', async () => {
    on('both');
    const claude = settings({ selectedProvider: 'claude', claudeApiKey: 'sk-ant-own' });
    m.claudeCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'ok khoá riêng' }], usage: {}, stop_reason: 'end_turn' });
    expect(await callAI('x', claude)).toBe('ok khoá riêng');
    expect(m.callAiRelay).not.toHaveBeenCalled();

    m.claudeCreate.mockRejectedValueOnce(new Error('400 invalid_request_error: Your credit balance is too low'));
    expect(await callAI('x', claude)).toBe('từ ví web');
    expect(m.callAiRelay).toHaveBeenCalledTimes(1);

    m.claudeCreate.mockRejectedValueOnce(new Error('529 overloaded_error'));
    await expect(callAI('x', claude)).rejects.toThrow('529');
    expect(m.callAiRelay).toHaveBeenCalledTimes(1);
  });

  it('luồng chữ qua ví (chế độ chỉ ví) hiện trọn một cục, gọi relay đúng hãng', async () => {
    on('wallet');
    const chunks: string[] = [];
    await callAIStream('x', settings({ selectedProvider: 'openai' }), chunk => chunks.push(chunk));
    expect(chunks).toEqual(['từ ví web']);
    expect(m.callAiRelay).toHaveBeenCalledWith(expect.objectContaining({ provider: 'openai' }));
  });
});

describe('Gemini — nhiều khoá riêng trong Cài đặt', () => {
  const quota = () => new Error('429 RESOURCE_EXHAUSTED: quota exceeded');

  it('khoá đầu hết hạn mức thì dùng khoá thứ hai, KHÔNG đốt ví; hết cả hai mới sang ví (chế độ "cả hai")', async () => {
    on('both');
    const own = settings({ geminiApiKey: 'AIza-first', geminiApiKeys: ['AIza-first', 'AIza-second'] });
    m.geminiRaw.mockImplementation(async (_prompt: string, key: string) => {
      if (key === 'AIza-first') throw quota();
      return { text: `từ ${key}`, usage: undefined, truncated: false };
    });
    expect(await callAI('x', own)).toBe('từ AIza-second');
    expect(m.callAiRelay).not.toHaveBeenCalled();

    m.geminiRaw.mockRejectedValue(quota());
    const both = settings({ geminiApiKey: 'AIza-three', geminiApiKeys: ['AIza-three', 'AIza-four'] });
    expect(await callAI('x', both)).toBe('từ ví web');
    expect(m.callAiRelay).toHaveBeenCalledTimes(1);
  });
});

describe('mức suy nghĩ — trình duyệt gửi đúng tham số cho từng hãng', () => {
  it('Claude (khoá riêng): output_config.effort theo Cài đặt; model không nhận (Haiku 4.5) hoặc chưa chọn thì không gửi', async () => {
    m.claudeCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }], usage: {}, stop_reason: 'end_turn' });
    const base = { selectedProvider: 'claude', claudeApiKey: 'sk-ant-own' };
    await callAI('x', settings({ ...base, selectedModel: 'claude-opus-5-5', effort: { claude: 'xhigh' } }));
    expect(m.claudeCreate.mock.calls.at(-1)?.[0]).toMatchObject({ model: 'claude-opus-5-5', output_config: { effort: 'xhigh' } });
    await callAI('x', settings({ ...base, selectedModel: 'claude-opus-5-5', effort: { claude: 'low' } }));
    expect(m.claudeCreate.mock.calls.at(-1)?.[0].output_config).toEqual({ effort: 'low' });
    await callAI('x', settings({ ...base, selectedModel: 'claude-haiku-4-5-20251001', effort: { claude: 'high' } }));
    expect(m.claudeCreate.mock.calls.at(-1)?.[0].output_config).toBeUndefined();
    await callAI('x', settings({ ...base, selectedModel: 'claude-sonnet-5-5' }));
    expect(m.claudeCreate.mock.calls.at(-1)?.[0].output_config).toBeUndefined();
  });

  it('ChatGPT (khoá riêng): reasoning_effort theo Cài đặt', async () => {
    m.openaiCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }], usage: {} });
    const base = { selectedProvider: 'openai', openaiApiKey: 'sk-own' };
    await callAI('x', settings({ ...base, selectedModel: 'gpt-6.1-sol', effort: { openai: 'max' } }));
    expect(m.openaiCreate.mock.calls.at(-1)?.[0]).toMatchObject({ model: 'gpt-6.1-sol', reasoning_effort: 'max' });
    await callAI('x', settings({ ...base, selectedModel: 'gpt-6.1-sol', effort: { openai: 'none' } }));
    expect(m.openaiCreate.mock.calls.at(-1)?.[0].reasoning_effort).toBeUndefined();
  });

  it('Gemini (khoá riêng): mức của hãng được chuyển cho lời gọi SDK', async () => {
    m.geminiRaw.mockResolvedValue({ text: 'ok', truncated: false });
    await callAI('x', settings({ geminiApiKey: 'AIza-own', selectedModel: 'gemini-3.8-flash', effort: { gemini: 'high' } }));
    expect(m.geminiRaw.mock.calls.at(-1)?.[3]).toBe('high');
  });

  it('qua ví web: mức đã kiểm hợp model đi kèm lượt relay (Gemini và hãng khác)', async () => {
    on('wallet');
    m.callAiRelay.mockResolvedValue({ text: 'từ ví web', model: 'm', truncated: false });
    await callAI('x', settings({ selectedModel: 'gemini-3.8-flash', effort: { gemini: 'low' } }));
    expect(m.callAiRelay.mock.calls.at(-1)?.[0]).toMatchObject({ model: 'gemini-3.8-flash', effort: 'low' });
    await callAI('x', settings({ selectedProvider: 'claude', selectedModel: 'claude-sonnet-5-5', effort: { claude: 'max' } }));
    expect(m.callAiRelay.mock.calls.at(-1)?.[0]).toMatchObject({ provider: 'claude', model: 'claude-sonnet-5-5', effort: 'max' });
    await callAI('x', settings({ selectedProvider: 'claude', selectedModel: 'claude-haiku-4-5-20251001', effort: { claude: 'max' } }));
    expect(m.callAiRelay.mock.calls.at(-1)?.[0].effort).toBeUndefined();
  });
});
