import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DocData = Record<string, any>;

const h = vi.hoisted(() => ({ store: {} as Record<string, DocData> }));

vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async () => ({}) }) }));
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: (n: number) => ({ __inc: n }) } }));

const applyMerge = (current: DocData, patch: DocData): DocData => {
  const next = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && '__inc' in v) next[k] = (Number(current[k]) || 0) + v.__inc;
    else if (v && typeof v === 'object' && !Array.isArray(v)) next[k] = applyMerge(current[k] && typeof current[k] === 'object' ? current[k] : {}, v);
    else next[k] = v;
  }
  return next;
};

const fakeDb = () => {
  const docRef = (path: string): any => ({
    get: async () => ({ exists: h.store[path] !== undefined, data: () => (h.store[path] ? { ...h.store[path] } : undefined) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => { h.store[path] = opts?.merge ? applyMerge(h.store[path] ?? {}, data) : applyMerge({}, data); },
  });
  return {
    runTransaction: async <T,>(work: (tx: any) => Promise<T>): Promise<T> => {
      const writes: Array<() => Promise<unknown>> = [];
      const result = await work({ get: (ref: any) => ref.get(), set: (ref: any, data: DocData, opts?: { merge?: boolean }) => { writes.push(() => ref.set(data, opts)); } });
      for (const write of writes) await write();
      return result;
    },
    collection: (col: string) => ({
      doc: (id: string) => docRef(`${col}/${id}`),
      add: async (d: DocData) => { h.store[`${col}/auto${Object.keys(h.store).length}`] = d; },
    }),
  };
};

vi.mock('../_exam-core.js', () => ({ getAdminDb: () => fakeDb() }));

import { callGradingVision, callUtilityVision } from '../_grading-core.js';
import { createAiUsageContext, runWithAiUsage } from '../_ai-usage.js';
import { AiKeyRequiredError } from '../_ai-keys.js';

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

/** Lượt chấm của một giáo viên ĐANG BỊ TRỪ VÍ (handler đã chọn khoá trước, như grade-homework). */
const asBilledTeacher = <T,>(fn: () => Promise<T>): Promise<T> => {
  const context = createAiUsageContext('t', 'gradeHomework', { classId: 'lop-1' }, async () => ({ uid: 'gv-1', email: 'gv1@x.vn', anonymous: false }));
  context.keyChoice = { key: 'SERVER', source: 'owner_consent', ownerUid: 'gv-1', billing: { usdVnd: 26_190, voucher: null } };
  return runWithAiUsage(context, fn);
};

const vilaoOk = (text = '{"score":8}', usage: unknown = { prompt_tokens: 1_000_000, completion_tokens: 0, total_tokens: 1_000_000 }) =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: text } }], usage }) }));

const usageRows = () => Object.entries(h.store).filter(([p]) => p.startsWith('aiUsage/')).map(([, d]) => d);

beforeEach(() => {
  h.store = {};
  vi.stubEnv('GRADING_VILAO_API_KEY', 'k-vilao');
  vi.stubEnv('GRADING_XKIRO_API_KEY', '');
  vi.stubEnv('GRADING_GEMINI_API_KEY', 'k-gem');
  vi.stubEnv('GEMINI_API_KEY', '');
  vi.stubEnv('AI_HOLD_RETRY_MS', '1');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('chuỗi chấm Vilao/xKiro — ghi sổ + giữ chỗ + trừ ví như lớp Gemini', () => {
  it('lớp Vilao chấm xong: ghi lượt "vilao/…", TRỪ VÍ đúng giá, trả hết phần giữ chỗ', async () => {
    h.store['aiWallets/gv-1'] = { balanceVnd: 10_000 };
    vi.stubGlobal('fetch', vilaoOk());

    expect(await asBilledTeacher(() => callGradingVision('chấm', [], {}))).toBe('{"score":8}');

    // 1.000.000 token vào × 400đ/1M = 400đ
    expect(h.store['aiWallets/gv-1']).toMatchObject({ balanceVnd: 9_600, heldVnd: 0 });
    expect(usageRows()).toHaveLength(1);
    expect(usageRows()[0]).toMatchObject({ provider: 'vilao', model: 'vilao/gemini-3.8-flash', keySource: 'owner_consent', keyOwnerUid: 'gv-1', chargeVnd: 400, feature: 'gradeHomework' });
    expect(h.store[`aiSpend/gv-1_${today.slice(0, 7)}`]).toMatchObject({ chargeVnd: 400, calls: 1 });
  });

  it('đọc mã đề (đường utility) cũng bị tính như vậy', async () => {
    h.store['aiWallets/gv-1'] = { balanceVnd: 10_000 };
    vi.stubGlobal('fetch', vilaoOk('A01'));

    expect(await asBilledTeacher(() => callUtilityVision('đọc mã', [], 'ignored', {}))).toBe('A01');
    expect(h.store['aiWallets/gv-1'].balanceVnd).toBe(9_600);
  });

  it('ví hết tiền: chặn TRƯỚC khi gọi Vilao, không lùi sang lớp Gemini (cùng luật ví)', async () => {
    h.store['aiWallets/gv-1'] = { balanceVnd: 0 };
    const fetchMock = vilaoOk();
    vi.stubGlobal('fetch', fetchMock);

    await expect(asBilledTeacher(() => callGradingVision('chấm', [], {}))).rejects.toBeInstanceOf(AiKeyRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(usageRows()).toHaveLength(0);
  });

  it('Vilao lỗi HTTP: không ghi lượt, phần giữ chỗ được TRẢ LẠI rồi mới sang lớp kế', async () => {
    h.store['aiWallets/gv-1'] = { balanceVnd: 10_000 };
    vi.stubEnv('GRADING_GEMINI_API_KEY', '');
    vi.stubEnv('GRADING_XKIRO_API_KEY', 'k-xkiro');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'down' })
      .mockImplementationOnce(vilaoOk('ok-xkiro', { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await asBilledTeacher(() => callGradingVision('chấm', [], {}))).toBe('ok-xkiro');

    // xKiro là model :free → 0đ, ví nguyên vẹn, không còn tiền kẹt giữ chỗ.
    expect(h.store['aiWallets/gv-1']).toMatchObject({ balanceVnd: 10_000, heldVnd: 0 });
    expect(usageRows()).toHaveLength(1);
    expect(usageRows()[0]).toMatchObject({ provider: 'xkiro', model: 'xkiro/qwen/qwen3.8-max:free' });
  });

  it('Vilao bị cắt vì hết trần token vẫn GHI lượt (hãng tính tiền cả lượt bị cắt) rồi mới báo lỗi', async () => {
    h.store['aiWallets/gv-1'] = { balanceVnd: 10_000 };
    vi.stubEnv('GRADING_GEMINI_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"sc' } }], usage: { prompt_tokens: 1_000_000, completion_tokens: 0, total_tokens: 1_000_000 } }),
    })));

    await expect(asBilledTeacher(() => callGradingVision('chấm', [], {}))).rejects.toMatchObject({ kind: 'max_tokens' });
    expect(h.store['aiWallets/gv-1']).toMatchObject({ balanceVnd: 9_600, heldVnd: 0 });
    expect(usageRows()[0]).toMatchObject({ finishReason: 'length' });
  });

  it('CẦU CHÌ: lượt bị trừ ví mà model chưa có giá (vd đổi xKiro sang model trả phí) → log cảnh báo, không im lặng 0đ', async () => {
    h.store['aiWallets/gv-1'] = { balanceVnd: 10_000 };
    vi.stubEnv('GRADING_VILAO_API_KEY', '');
    vi.stubEnv('GRADING_XKIRO_API_KEY', 'k-xkiro');
    vi.stubEnv('GRADING_XKIRO_MODEL', 'qwen/qwen3.8-max');
    vi.stubGlobal('fetch', vilaoOk('ok'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(await asBilledTeacher(() => callGradingVision('chấm', [], {}))).toBe('ok');
    const warned = warn.mock.calls.map(args => args.map(String).join(' ')).filter(line => line.includes('chưa có giá'));
    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain('xkiro/qwen/qwen3.8-max');
    expect(warned[0]).toContain('gv-1');
    warn.mockRestore();
  });

  it('cầu chì không kêu với model ":free" (0đ là đúng) và với model đã có giá', async () => {
    h.store['aiWallets/gv-1'] = { balanceVnd: 10_000 };
    vi.stubEnv('GRADING_GEMINI_API_KEY', '');
    vi.stubEnv('GRADING_XKIRO_API_KEY', 'k-xkiro');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'down' })
      .mockImplementationOnce(vilaoOk('ok-xkiro')));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await asBilledTeacher(() => callGradingVision('chấm', [], {}));
    h.store['aiWallets/gv-1'] = { balanceVnd: 10_000 };
    vi.stubGlobal('fetch', vilaoOk());
    await asBilledTeacher(() => callGradingVision('chấm', [], {}));

    expect(warn.mock.calls.some(args => args.map(String).join(' ').includes('chưa có giá'))).toBe(false);
    warn.mockRestore();
  });

  it('không có ngữ cảnh request (script, test cũ): vẫn chấm được, không giữ chỗ', async () => {
    vi.stubGlobal('fetch', vilaoOk('ok'));
    expect(await callGradingVision('chấm', [], {})).toBe('ok');
    expect(Object.keys(h.store).some(p => p.startsWith('aiWallets/'))).toBe(false);
  });
});
