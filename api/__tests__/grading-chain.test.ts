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
  // `PH_CHAT_VILAO_KEY` là khoá dự phòng dùng chung (chấm bài dùng tạm khoá chat khi chưa có
  // khoá chấm riêng). Mặc định xoá để các ca cũ giữ nguyên ý nghĩa "chỉ có key nêu trong ca".
  for (const [k, v] of Object.entries({ PH_CHAT_VILAO_KEY: '', ...env })) {
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

  // 30/10: production KHÔNG có GRADING_VILAO_API_KEY nên chuỗi rỗng → mọi lượt chấm qua bot hỏng
  // ("Máy chủ chưa cấu hình khoá chấm bài") dù khoá chat PH_CHAT_VILAO_KEY có sẵn và chạy tốt.
  it('chưa có khoá chấm riêng thì dùng TẠM khoá chat, hạ model về model khoá chat đã đăng ký', () => {
    stubEnv({ GRADING_VILAO_API_KEY: '', PH_CHAT_VILAO_KEY: 'k-chat', GRADING_XKIRO_API_KEY: '', GRADING_GEMINI_API_KEY: '', GEMINI_API_KEY: '' });

    const names = getGradingChain().map(a => a.name);

    expect(names).toEqual(['vilao/cnt/glm-5.3-flash']);
  });

  it('có khoá chấm riêng thì quay lại model chấm chuẩn (không dùng model chat)', () => {
    stubEnv({ GRADING_VILAO_API_KEY: 'k-cham', PH_CHAT_VILAO_KEY: 'k-chat', GRADING_XKIRO_API_KEY: '', GRADING_GEMINI_API_KEY: '', GEMINI_API_KEY: '' });

    expect(getGradingChain().map(a => a.name)).toEqual(['vilao/gemini-3.8-flash']);
  });

  it('GRADING_VILAO_MODEL ghi đè được cả hai trường hợp', () => {
    stubEnv({ GRADING_VILAO_API_KEY: '', PH_CHAT_VILAO_KEY: 'k-chat', GRADING_VILAO_MODEL: 'cong-tu/glm-5', GRADING_XKIRO_API_KEY: '', GRADING_GEMINI_API_KEY: '', GEMINI_API_KEY: '' });

    expect(getGradingChain().map(a => a.name)).toEqual(['vilao/cong-tu/glm-5']);
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
