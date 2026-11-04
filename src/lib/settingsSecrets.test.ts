import { describe, expect, it } from 'vitest';
import { stripLocalOnlyKeys } from './settingsSecrets';

describe('stripLocalOnlyKeys', () => {
  it('bỏ mọi khoá chỉ-ở-trình-duyệt, kể cả danh sách nhiều khoá Gemini; giữ phần còn lại', () => {
    const out = stripLocalOnlyKeys({
      theme: 'light', selectedModel: 'm', geminiApiKey: 'AIza1', geminiApiKeys: ['AIza1', 'AIza2'],
      claudeApiKey: 'c', openaiApiKey: 'o', grokApiKey: 'g', deepseekApiKey: 'd',
    });
    expect(out).toEqual({ theme: 'light', selectedModel: 'm' });
    expect(JSON.stringify(out)).not.toContain('AIza');
  });
});
