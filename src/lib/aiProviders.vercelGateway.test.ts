import { describe, expect, it } from 'vitest';
import { callAIWithVision, getActiveApiKey } from './aiProviders';
import { DEFAULT_DATA } from '../types';

describe('server-managed Vercel AI Gateway provider', () => {
  it('exposes a non-empty sentinel so existing UI guards allow the provider', () => {
    const settings = { ...DEFAULT_DATA.settings, selectedProvider: 'vercel-gateway' as const };

    expect(getActiveApiKey(settings)).toBe('server-managed-ai-gateway');
  });

  it('fails clearly instead of sending vision requests to the text-only GLM route', async () => {
    const settings = { ...DEFAULT_DATA.settings, selectedProvider: 'vercel-gateway' as const };

    await expect(callAIWithVision('Đọc ảnh', 'data:image/png;base64,AA==', settings))
      .rejects.toThrow('GLM 5.2 qua AI Gateway hiện chỉ hỗ trợ tác vụ văn bản');
  });
});
