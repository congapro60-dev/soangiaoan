import { describe, it, expect, vi, afterEach } from 'vitest';
import { callGradingVision, getGradingChain } from '../_grading-core.js';

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
