import { describe, expect, it } from 'vitest';
import { parseUsageStorageKey } from './useTokenTracker';

describe('khoá localStorage của bộ đếm token', () => {
  it('tách nhà cung cấp, model và ngày', () => {
    expect(parseUsageStorageKey('api_usage_gemini_gemini-3.8-flash_2026_09_30'))
      .toEqual({ provider: 'gemini', model: 'gemini-3.8-flash', dateKey: '2026_09_30' });
    expect(parseUsageStorageKey('api_usage_openai-compatible_claude-opus-4-7_2026_09_30'))
      .toEqual({ provider: 'openai-compatible', model: 'claude-opus-4-7', dateKey: '2026_09_30' });
  });

  it('model có gạch dưới vẫn giữ nguyên', () => {
    expect(parseUsageStorageKey('api_usage_nvidia_meta_llama-3_2026_09_30'))
      .toEqual({ provider: 'nvidia', model: 'meta_llama-3', dateKey: '2026_09_30' });
  });

  it('khoá của thứ khác thì bỏ qua', () => {
    expect(parseUsageStorageKey('testing_history')).toBeNull();
    expect(parseUsageStorageKey('api_usage_gemini_2026_09_30')).toBeNull();
  });
});
