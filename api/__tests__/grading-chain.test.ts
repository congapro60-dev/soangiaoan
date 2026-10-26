import { describe, it, expect, vi, afterEach } from 'vitest';
import { callGradingVision, callUtilityVision, getGradingChain, GRADING_MODEL, UTILITY_MODEL } from '../_grading-core.js';

/** Dựng response OpenAI-compatible mà callOpenAiCompatibleVision hiểu. */
const okResponse = (text: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: text } }] }),
});

const failResponse = (status = 500) => ({
  ok: false,
  status,
  text: async () => 'provider down',
});

const stubEnv = (env: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) vi.stubEnv(k, '');
    else vi.stubEnv(k, v);
  }
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getGradingChain — thứ tự lớp dự phòng', () => {
  it('chỉ có Gemini thì chuỗi giữ nguyên một lớp như trước', () => {
    stubEnv({ GRADING_VILAO_API_KEY: '', GRADING_XKIRO_API_KEY: '', GRADING_GEMINI_API_KEY: 'k-gem', GEMINI_API_KEY: '' });

    const names = getGradingChain().map(a => a.name);

    expect(names).toHaveLength(1);
    expect(names[0]).toMatch(/^gemini\//);
  });

  it('Vilao đứng đầu, xKiro ở giữa, Gemini làm lớp chót', () => {
    stubEnv({
      GRADING_VILAO_API_KEY: 'k-vilao',
      GRADING_XKIRO_API_KEY: 'k-xkiro',
      GRADING_GEMINI_API_KEY: 'k-gem',
      GEMINI_API_KEY: '',
    });

    const names = getGradingChain().map(a => a.name);

    expect(names).toHaveLength(3);
    expect(names[0]).toMatch(/^vilao\//);
    expect(names[1]).toMatch(/^xkiro\//);
    expect(names[2]).toMatch(/^gemini\//);
  });

  it('thiếu key xKiro thì chuỗi bỏ lớp đó, không vỡ', () => {
    stubEnv({ GRADING_VILAO_API_KEY: 'k-vilao', GRADING_XKIRO_API_KEY: '', GRADING_GEMINI_API_KEY: 'k-gem', GEMINI_API_KEY: '' });

    const names = getGradingChain().map(a => a.name);

    expect(names.some(n => n.startsWith('xkiro/'))).toBe(false);
    expect(names).toHaveLength(2);
  });

  it('lớp xKiro mặc định trỏ api.xkiro.com/v1 và model :free', async () => {
    stubEnv({ GRADING_VILAO_API_KEY: '', GRADING_XKIRO_API_KEY: 'k-xkiro', GRADING_GEMINI_API_KEY: '', GEMINI_API_KEY: '' });

    const xkiro = getGradingChain().find(a => a.name.startsWith('xkiro/'));
    expect(xkiro).toBeDefined();
    expect(xkiro!.name).toBe('xkiro/qwen/qwen3.8-max:free');

    const fetchMock = vi.fn(async () => okResponse('xin chào'));
    vi.stubGlobal('fetch', fetchMock);
    await xkiro!.call('prompt', [], {});

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.xkiro.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k-xkiro');
  });

  it('GRADING_XKIRO_BASE_URL / GRADING_XKIRO_MODEL ghi đè được mặc định', async () => {
    stubEnv({
      GRADING_VILAO_API_KEY: '',
      GRADING_XKIRO_API_KEY: 'k-xkiro',
      GRADING_XKIRO_BASE_URL: 'https://api.xkiro.com/v1/',
      GRADING_XKIRO_MODEL: 'qwen/qwen3.5-flash:free',
      GRADING_GEMINI_API_KEY: '',
      GEMINI_API_KEY: '',
    });

    const xkiro = getGradingChain().find(a => a.name.startsWith('xkiro/'));
    expect(xkiro!.name).toBe('xkiro/qwen/qwen3.5-flash:free');

    const fetchMock = vi.fn(async () => okResponse('ok'));
    vi.stubGlobal('fetch', fetchMock);
    await xkiro!.call('prompt', [], {});

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe('https://api.xkiro.com/v1/chat/completions');
  });
});

describe('callGradingVision — rơi xuống lớp xKiro khi lớp trước hỏng', () => {
  it('không cấp lại ngân sách khi chuyển nhà dự phòng', async () => {
    stubEnv({ GRADING_VILAO_API_KEY: 'k-vilao', GRADING_XKIRO_API_KEY: 'k-xkiro', GRADING_GEMINI_API_KEY: '', GEMINI_API_KEY: '' });
    vi.useFakeTimers({ toFake: ['Date'] });
    const signal = vi.spyOn(AbortSignal, 'timeout');
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('api.vilao.ai')) { vi.setSystemTime(Date.now() + 45_000); return failResponse(503); }
      return okResponse('ok');
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      expect(await callGradingVision('prompt', [], { timeoutMs: 50_000 })).toBe('ok');
      expect(signal.mock.calls.map(call => call[0])).toEqual([50_000, 5_000]);
    } finally { signal.mockRestore(); vi.useRealTimers(); }
  });

  it('hết ngân sách thì không gọi nhà dự phòng tiếp theo', async () => {
    stubEnv({ GRADING_VILAO_API_KEY: 'k-vilao', GRADING_XKIRO_API_KEY: 'k-xkiro', GRADING_GEMINI_API_KEY: '', GEMINI_API_KEY: '' });
    vi.useFakeTimers({ toFake: ['Date'] });
    const fetchMock = vi.fn(async () => { vi.setSystemTime(Date.now() + 51_000); return failResponse(503); });
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(callGradingVision('prompt', [], { timeoutMs: 50_000 })).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });

  it('Vilao lỗi thì xKiro phục vụ, không gọi tới Gemini', async () => {
    stubEnv({
      GRADING_VILAO_API_KEY: 'k-vilao',
      GRADING_XKIRO_API_KEY: 'k-xkiro',
      GRADING_GEMINI_API_KEY: 'k-gem',
      GEMINI_API_KEY: '',
    });

    const fetchMock = vi.fn(async (url: string) => (
      String(url).includes('api.xkiro.com') ? okResponse('trả lời từ xKiro') : failResponse(500)
    ));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ketQua = await callGradingVision('prompt', [], {});

    expect(ketQua).toBe('trả lời từ xKiro');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map(c => String(c[0]));
    expect(urls[0]).toContain('api.vilao.ai');
    expect(urls[1]).toContain('api.xkiro.com');
  });

  it('không key nào thì báo lỗi nói rõ biến cần set', async () => {
    stubEnv({ GRADING_VILAO_API_KEY: '', GRADING_XKIRO_API_KEY: '', GRADING_GEMINI_API_KEY: '', GEMINI_API_KEY: '' });

    await expect(callGradingVision('prompt', [], {})).rejects.toThrow(/GRADING_XKIRO_API_KEY/);
  });
});

// ── G4: đọc mã đề (việc phụ) cũng đi qua chuỗi, Google chỉ là lớp đỡ cuối ──────

describe('G4 — callUtilityVision đi qua chuỗi dự phòng', () => {
  it('Google chết vẫn đọc được mã đề nhờ Vilao, KHÔNG cần tới Google', async () => {
    stubEnv({
      GRADING_VILAO_API_KEY: 'k-vilao',
      GRADING_XKIRO_API_KEY: 'k-xkiro',
      GRADING_GEMINI_API_KEY: 'k-gem',
      GEMINI_API_KEY: '',
    });

    const fetchMock = vi.fn(async (url: string) => (
      String(url).includes('api.vilao.ai') ? okResponse('{"code":"102"}') : failResponse(503)
    ));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const text = await callUtilityVision('đọc mã đề', [{ mimeType: 'image/jpeg', data: 'AAA' }], 'k-gem');

    expect(text).toBe('{"code":"102"}');
    // Chỉ một lượt gọi: Vilao sống thì không đụng xKiro lẫn Google.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.vilao.ai');
  });

  it('Vilao chết thì xKiro đọc mã đề, không rơi xuống Google', async () => {
    stubEnv({
      GRADING_VILAO_API_KEY: 'k-vilao',
      GRADING_XKIRO_API_KEY: 'k-xkiro',
      GRADING_GEMINI_API_KEY: 'k-gem',
      GEMINI_API_KEY: '',
    });

    const fetchMock = vi.fn(async (url: string) => (
      String(url).includes('api.xkiro.com') ? okResponse('{"code":"103"}') : failResponse(500)
    ));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const text = await callUtilityVision('đọc mã đề', [], 'k-gem');

    expect(text).toBe('{"code":"103"}');
    const urls = fetchMock.mock.calls.map(c => String(c[0]));
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('api.vilao.ai');
    expect(urls[1]).toContain('api.xkiro.com');
    expect(urls.some(u => u.includes('generativelanguage'))).toBe(false);
  });

  it('cả hai kênh rẻ chết thì Google đỡ, và dùng model RẺ (UTILITY_MODEL) chứ không phải model chấm', async () => {
    stubEnv({
      GRADING_VILAO_API_KEY: 'k-vilao',
      GRADING_XKIRO_API_KEY: 'k-xkiro',
      GRADING_GEMINI_API_KEY: 'k-gem',
      GEMINI_API_KEY: '',
    });

    // Gemini trả format riêng (candidates/parts), KHÔNG phải choices của OpenAI-compatible.
    const geminiOk = () => ({
      ok: true,
      status: 200,
      clone: () => ({ text: async () => '' }),
      json: async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"code":"104"}' }] } }],
      }),
    });
    const fetchMock = vi.fn(async (url: string) => (
      String(url).includes('generativelanguage') ? geminiOk() : failResponse(500)
    ));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const text = await callUtilityVision('đọc mã đề', [], 'k-gem');

    expect(text).toBe('{"code":"104"}');
    const urls = fetchMock.mock.calls.map(c => String(c[0]));
    expect(urls).toHaveLength(3);
    expect(urls[2]).toContain(UTILITY_MODEL);
    expect(urls[2]).not.toContain(GRADING_MODEL);
  });

  it('GRADING_GEMINI_FALLBACK=off thì chuỗi KHÔNG có tầng Google nào', () => {
    stubEnv({
      GRADING_VILAO_API_KEY: 'k-vilao',
      GRADING_XKIRO_API_KEY: 'k-xkiro',
      GRADING_GEMINI_API_KEY: 'k-gem',
      GEMINI_API_KEY: '',
      GRADING_GEMINI_FALLBACK: 'off',
    });

    expect(getGradingChain().map(a => a.name)).toEqual([
      'vilao/gemini-3.8-flash',
      'xkiro/qwen/qwen3.8-max:free',
    ]);
    expect(getGradingChain('utility').some(a => a.name.startsWith('gemini/'))).toBe(false);
  });

  it('GRADING_GEMINI_FALLBACK=off thì không có kênh rẻ nào là báo lỗi, không gọi mạng', async () => {
    stubEnv({
      GRADING_VILAO_API_KEY: '',
      GRADING_XKIRO_API_KEY: '',
      GRADING_GEMINI_API_KEY: 'k-gem',
      GEMINI_API_KEY: '',
      GRADING_GEMINI_FALLBACK: 'off',
    });

    const fetchMock = vi.fn(async () => okResponse('không được gọi'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callUtilityVision('đọc mã đề', [], 'k-gem')).rejects.toThrow(/GRADING_VILAO_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('giá trị cờ lạ (không phải off/0/false/no) vẫn coi là BẬT — mặc định an toàn', () => {
    stubEnv({
      GRADING_VILAO_API_KEY: '',
      GRADING_XKIRO_API_KEY: '',
      GRADING_GEMINI_API_KEY: 'k-gem',
      GEMINI_API_KEY: '',
      GRADING_GEMINI_FALLBACK: 'yes',
    });

    expect(getGradingChain().map(a => a.name)).toEqual([`gemini/${GRADING_MODEL}`]);
  });
});
