import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStudentAiKey,
  setStudentAiKey,
  callStudentGemini,
  isStudentKeyMissingError,
} from './studentAiKey';

// Environment vitest = 'node' (không có window/localStorage) — stub tối thiểu bằng Map.
const memoryStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memoryStore.set(k, v); },
  removeItem: (k: string) => { memoryStore.delete(k); },
  clear: () => { memoryStore.clear(); },
});

beforeEach(() => {
  memoryStore.clear();
});

describe('getStudentAiKey / setStudentAiKey', () => {
  it('rỗng khi chưa lưu key nào', () => {
    expect(getStudentAiKey()).toBe('');
  });

  it('lưu và đọc lại key, tự trim khoảng trắng', () => {
    setStudentAiKey('  abc123  ');
    expect(getStudentAiKey()).toBe('abc123');
  });
});

describe('callStudentGemini', () => {
  it('throw StudentAiKeyMissing khi chưa có key, không gọi network', async () => {
    const err = await callStudentGemini('hello').catch((e) => e);
    expect(isStudentKeyMissingError(err)).toBe(true);
    expect(err.message).toContain('API key');
  });

  it('gọi được khi có key (mock @google/genai)', async () => {
    setStudentAiKey('fake-key');
    vi.doMock('@google/genai', () => ({
      GoogleGenAI: class {
        models = { generateContent: vi.fn().mockResolvedValue({ text: 'Kết quả AI' }) };
      },
    }));
    const { callStudentGemini: callWithMock } = await import('./studentAiKey');
    const result = await callWithMock('hello');
    expect(result).toBe('Kết quả AI');
    vi.doUnmock('@google/genai');
  });
});
