import { describe, expect, it } from 'vitest';
import { EFFORT_LEVEL_INFO, chosenEffortOf, effortSupportFor, resolveEffort } from './reasoningEffort';

describe('mức suy nghĩ của từng model', () => {
  it('Gemini: model nào nhận mức nào theo tài liệu; model chưa tra được thì không có ô chọn', () => {
    expect(effortSupportFor('gemini', 'gemini-4-argon')).toMatchObject({ levels: ['low', 'medium', 'high'], defaultLevel: 'medium' });
    expect(effortSupportFor('gemini', 'gemini-3.8-flash')?.levels).toEqual(['low', 'medium', 'high']);
    expect(effortSupportFor('gemini', 'gemini-3.5-flash-lite')).toMatchObject({ levels: ['minimal', 'low', 'medium', 'high'], defaultLevel: 'minimal' });
    expect(effortSupportFor('gemini', 'gemini-3.1-pro-preview')).toMatchObject({ levels: ['low', 'medium', 'high'], defaultLevel: 'high' });
    expect(effortSupportFor('gemini', 'models/gemini-3.6-flash')?.levels).toContain('minimal'); // bỏ tiền tố models/
    for (const unknown of ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash']) {
      expect(effortSupportFor('gemini', unknown), unknown).toBeNull();
    }
  });

  it('Claude: Sonnet/Opus/Fable nhận đủ 5 mức; Haiku 4.5 không có mức (gửi lên sẽ bị 400)', () => {
    for (const model of ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1']) {
      expect(effortSupportFor('claude', model)?.levels, model).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    }
    expect(effortSupportFor('claude', 'claude-opus-5-5')?.defaultLevel).toBe('medium');
    expect(effortSupportFor('claude', 'claude-sonnet-5-5')?.defaultLevel).toBe('high');
    expect(effortSupportFor('claude', 'claude-haiku-4-5-20251001')).toBeNull();
  });

  it('ChatGPT: mỗi model một danh sách (Luna có "none", Astra có "minimal", Sol không có cả hai)', () => {
    expect(effortSupportFor('openai', 'gpt-6.1-sol')?.levels).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    expect(effortSupportFor('openai', 'gpt-6-luna')?.levels).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
    expect(effortSupportFor('openai', 'gpt-6-astra')?.levels).toEqual(['minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
  });

  it('hãng khác (Grok, DeepSeek, GLM…) không có mức', () => {
    for (const provider of ['grok', 'deepseek', 'nvidia', 'vercel-gateway']) expect(effortSupportFor(provider, 'bat-ky')).toBeNull();
  });

  it('resolveEffort chỉ trả mức MODEL NHẬN; không hợp thì undefined (không gửi tham số)', () => {
    expect(resolveEffort('gemini', 'gemini-3.8-flash', 'high')).toBe('high');
    expect(resolveEffort('gemini', 'gemini-3.8-flash', 'minimal')).toBeUndefined(); // 3.8 Flash không có minimal
    expect(resolveEffort('gemini', 'gemini-3.6-flash', 'minimal')).toBe('minimal');
    expect(resolveEffort('claude', 'claude-sonnet-5-5', 'xhigh')).toBe('xhigh');
    expect(resolveEffort('claude', 'claude-haiku-4-5-20251001', 'high')).toBeUndefined();
    expect(resolveEffort('openai', 'gpt-6.1-sol', 'none')).toBeUndefined();
    expect(resolveEffort('openai', 'gpt-6-luna', 'none')).toBe('none');
    expect(resolveEffort('gemini', 'gemini-3.8-flash', undefined)).toBeUndefined();
    expect(resolveEffort('gemini', 'gemini-3.8-flash', 'sieu-cap')).toBeUndefined();
    expect(resolveEffort('grok', 'grok-4', 'high')).toBeUndefined();
  });

  it('mọi mã mức trong danh mục đều có tên + mô tả tiếng Việt khác nhau', () => {
    const labels = new Set<string>();
    for (const provider of ['gemini', 'claude', 'openai']) {
      for (const model of ['gemini-4-argon', 'gemini-3.6-flash', 'claude-opus-5-5', 'gpt-6-luna', 'gpt-6-astra']) {
        for (const level of effortSupportFor(provider, model)?.levels ?? []) {
          expect(EFFORT_LEVEL_INFO[level], level).toBeTruthy();
          labels.add(EFFORT_LEVEL_INFO[level].label);
        }
      }
    }
    expect(labels.size).toBe(Object.keys(EFFORT_LEVEL_INFO).length);
  });

  it('chosenEffortOf đọc mức của đúng hãng trong Cài đặt', () => {
    expect(chosenEffortOf({ gemini: 'high', claude: 'low' }, 'claude')).toBe('low');
    expect(chosenEffortOf(undefined, 'gemini')).toBeUndefined();
  });
});
