import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Stub localStorage (environment node) — vi.hoisted để vi.mock truy cập được.
const h = vi.hoisted(() => {
  const memoryStore = new Map<string, string>();
  return {
    memoryStore,
    localStorage: {
      getItem: (k: string) => memoryStore.get(k) ?? null,
      setItem: (k: string, v: string) => { memoryStore.set(k, v); },
      removeItem: (k: string) => { memoryStore.delete(k); },
      clear: () => { memoryStore.clear(); },
    },
    generateContent: vi.fn(),
    currentUserNull: false,
  };
});

vi.stubGlobal('localStorage', h.localStorage);

vi.mock('../firebase', () => ({
  auth: {
    get currentUser() {
      return h.currentUserNull ? null : { getIdToken: async () => 'tok' };
    },
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: h.generateContent };
  },
}));

import {
  getStudentAiKey,
  setStudentAiKey,
  callStudentGemini,
} from './studentAiKey';

let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
let fetchResponses: Array<{ pattern: string; payload: () => unknown; ok?: boolean; status?: number }> = [];

const stubFetch = (responses: Array<{ pattern: string; payload: () => unknown; ok?: boolean; status?: number }>) => {
  fetchCalls = [];
  fetchResponses = responses;
  vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push({ url, init });
    const hit = fetchResponses.find(r => url.includes(r.pattern)) ?? fetchResponses[0];
    const payload = hit.payload();
    return { ok: hit.ok ?? true, status: hit.status ?? 200, json: async () => payload };
  });
};

beforeEach(() => {
  h.memoryStore.clear();
  h.currentUserNull = false;
  h.generateContent.mockReset();
  // afterEach unstubAllGlobals xóa cả localStorage → re-stub before every test.
  vi.stubGlobal('localStorage', h.localStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const body = (call: { url: string; init?: RequestInit }) =>
  JSON.parse(String((call.init?.body as string) || '{}')) as Record<string, unknown>;

describe('getStudentAiKey / setStudentAiKey', () => {
  it('rỗng khi chưa lưu key nào', () => {
    expect(getStudentAiKey()).toBe('');
  });

  it('lưu và đọc lại key, tự trim khoảng trắng', () => {
    setStudentAiKey('  abc123  ');
    expect(getStudentAiKey()).toBe('abc123');
  });
});

describe('callStudentGemini — key riêng (ưu tiên, tự nhận diện loại key)', () => {
  it('key Gemini (AIza…): gọi @google/genai trực tiếp, không gọi network', async () => {
    setStudentAiKey('AIza-fake-key');
    h.generateContent.mockResolvedValue({ text: 'Kết quả AI' });
    const result = await callStudentGemini('hello');
    expect(result).toBe('Kết quả AI');
    expect(fetchCalls).toHaveLength(0);
    expect(h.generateContent).toHaveBeenCalledTimes(1);
  });

  it('key Vilao (sk-…): gọi api.vilao.ai/v1/chat/completions', async () => {
    setStudentAiKey('sk-vilao-test');
    stubFetch([{ pattern: 'api.vilao.ai', payload: () => ({ choices: [{ message: { content: 'Trả lời Vilao' } }] }) }]);
    const result = await callStudentGemini('hello');
    expect(result).toBe('Trả lời Vilao');
    expect(fetchCalls[0].url).toContain('api.vilao.ai/v1/chat/completions');
  });
});

describe('callStudentGemini — không có key và key lỗi → server fallback', () => {
  const serverOk = () => stubFetch([{ pattern: 'ai-relay', payload: () => ({ text: 'AI của thầy' }) }]);

  it('không key → gọi /api/ai-relay với studentAi: true và Bearer token', async () => {
    serverOk();
    const result = await callStudentGemini('hello');
    expect(result).toBe('AI của thầy');
    expect(fetchCalls[0].url).toBe('/api/ai-relay');
    expect(body(fetchCalls[0]).studentAi).toBe(true);
    expect((fetchCalls[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('kèm ảnh → gửi data URL ảnh cho server', async () => {
    serverOk();
    await callStudentGemini('chấm bài', { imageBase64: 'QUJD', imageMimeType: 'image/png' });
    expect(body(fetchCalls[0]).images?.[0]).toBe('data:image/png;base64,QUJD');
  });

  it('key riêng lỗi (hết quota) → rơi xuống server', async () => {
    setStudentAiKey('AIza-broken');
    h.generateContent.mockRejectedValue(new Error('429 RESOURCE_EXHAUSTED'));
    serverOk();
    const result = await callStudentGemini('hello');
    expect(result).toBe('AI của thầy');
  });

  it('không phiên + không key → báo lỗi rõ ràng', async () => {
    h.currentUserNull = true;
    await expect(callStudentGemini('hello')).rejects.toThrow('phiên học sinh');
  });
});