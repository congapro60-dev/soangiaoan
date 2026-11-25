import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DATA } from '../types';
import { providerKeysOf, rotationPlan, withKeyRotation } from './ownKeyRotation';
import { stripLocalOnlyKeys } from './settingsSecrets';

type Settings = typeof DEFAULT_DATA.settings;
const base = (patch: Partial<Settings>): Settings => ({ ...DEFAULT_DATA.settings, ...patch });
const quota = () => new Error('429 RESOURCE_EXHAUSTED quota exceeded');

beforeEach(() => { try { window.localStorage.clear(); } catch { /* môi trường không có localStorage */ } });

describe('tự xoay khoá riêng', () => {
  it('đọc nhiều khoá của hãng, không có thì lấy ô khoá đơn cũ', () => {
    expect(providerKeysOf('claude', base({ claudeApiKey: 'c-1' }))).toEqual(['c-1']);
    expect(providerKeysOf('claude', base({ claudeApiKey: 'c-1', ownApiKeys: { claude: ['c-a', ' c-b ', 'c-a', ''] } }))).toEqual(['c-a', 'c-b']);
  });

  it('cùng hãng: khoá hết hạn mức thì thử khoá kế, khoá tốt trả kết quả', async () => {
    const tried: string[] = [];
    const settings = base({ selectedProvider: 'openai', ownApiKeys: { openai: ['o-1', 'o-2', 'o-3'] } });
    const out = await withKeyRotation(settings, async s => {
      tried.push(s.openaiApiKey);
      if (s.openaiApiKey !== 'o-3') throw quota();
      return 'ok';
    });
    expect(out).toBe('ok');
    expect(new Set(tried)).toEqual(new Set(['o-1', 'o-2', 'o-3']));
  });

  it('lỗi không do khoá (503 quá tải) ném ra ngay, không đổi khoá', async () => {
    let calls = 0;
    const settings = base({ selectedProvider: 'openai', ownApiKeys: { openai: ['o-1', 'o-2'] } });
    await expect(withKeyRotation(settings, async () => { calls++; throw new Error('503 overloaded'); })).rejects.toThrow('503');
    expect(calls).toBe(1);
  });

  it('khác hãng mặc định TẮT: hết khoá thì báo lỗi, không tự sang hãng khác', async () => {
    const settings = base({ selectedProvider: 'claude', claudeApiKey: 'c-1', openaiApiKey: 'o-1' });
    expect(rotationPlan(settings)).toEqual(['claude']);
    await expect(withKeyRotation(settings, async () => { throw quota(); })).rejects.toThrow('429');
  });

  it('bật khác hãng: theo thứ tự đặt, chỉ hãng có khoá, model dự phòng lấy theo hãng', async () => {
    const settings = base({
      selectedProvider: 'claude', selectedModel: 'claude-sonnet-5-5', claudeApiKey: 'c-1', grokApiKey: 'g-1', openaiApiKey: 'o-1',
      keyRotation: { crossProvider: true, order: ['grok', 'deepseek', 'openai'], models: { openai: 'gpt-6.2-sol' } },
    });
    expect(rotationPlan(settings)).toEqual(['claude', 'grok', 'openai']);
    const seen: string[] = [];
    const out = await withKeyRotation(settings, async s => {
      seen.push(`${s.selectedProvider}:${s.selectedModel}`);
      if (s.selectedProvider !== 'openai') throw quota();
      return s.openaiApiKey;
    });
    expect(out).toBe('o-1');
    expect(seen[0]).toBe('claude:claude-sonnet-5-5');
    expect(seen.at(-1)).toBe('openai:gpt-6.2-sol');
  });

  it('luồng chữ đã hiện một phần thì không đổi khoá', async () => {
    const settings = base({ selectedProvider: 'openai', ownApiKeys: { openai: ['o-1', 'o-2'] } });
    let calls = 0;
    await expect(withKeyRotation(settings, async () => { calls++; throw quota(); }, { canRotate: () => false })).rejects.toThrow('429');
    expect(calls).toBe(1);
  });

  it('danh sách nhiều khoá không bao giờ đồng bộ lên Firebase', () => {
    const stripped = stripLocalOnlyKeys(base({ ownApiKeys: { claude: ['c-1'] } })) as Record<string, unknown>;
    expect(stripped.ownApiKeys).toBeUndefined();
  });
});
