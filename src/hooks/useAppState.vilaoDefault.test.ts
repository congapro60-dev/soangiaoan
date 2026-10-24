import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/firebase', () => ({ db: {} }));
// fileUtils kéo theo pdfjs (cần DOMMatrix, không có trong môi trường test).
vi.mock('../utils/fileUtils', () => ({ normalizePlanTitle: (s: string) => s }));

import { DEFAULT_DATA } from '../types';
import { withVilaoDefaultProvider } from './useAppState';

/**
 * Bẫy 10/2026: giáo viên mở tab Lớp học, thấy "Chưa có API key", tưởng phải mua key Google,
 * dán key trả phí vào và mất tiền — trong khi đường Vilao (khoá ở máy chủ) vẫn sống. Gốc là
 * cài đặt cũ còn lưu `selectedProvider: 'gemini'` mà không có key riêng.
 */
describe('chuyển nhà cung cấp cũ sang Vilao', () => {
  const base = DEFAULT_DATA.settings;

  it('provider mặc định là vilao', () => {
    expect(base.selectedProvider).toBe('vilao');
  });

  it('lưu "gemini" mà KHÔNG có key riêng thì chuyển sang vilao', () => {
    const next = withVilaoDefaultProvider({ ...base, selectedProvider: 'gemini', geminiApiKey: '', geminiApiKeys: [] });

    expect(next.selectedProvider).toBe('vilao');
  });

  it('đã có key Gemini riêng thì GIỮ nguyên ý định dùng Gemini', () => {
    const next = withVilaoDefaultProvider({ ...base, selectedProvider: 'gemini', geminiApiKey: 'AIza-rieng' });

    expect(next.selectedProvider).toBe('gemini');
  });

  it('key Gemini riêng nằm trong danh sách nhiều khoá cũng tính là có key', () => {
    const next = withVilaoDefaultProvider({ ...base, selectedProvider: 'gemini', geminiApiKey: '', geminiApiKeys: ['', 'AIza-thu-hai'] });

    expect(next.selectedProvider).toBe('gemini');
  });

  it('danh sách khoá toàn ô rỗng thì KHÔNG tính là có key', () => {
    const next = withVilaoDefaultProvider({ ...base, selectedProvider: 'gemini', geminiApiKey: '', geminiApiKeys: ['', '  '] });

    expect(next.selectedProvider).toBe('vilao');
  });

  it('provider khác (claude/openai/vilao…) không bị đụng', () => {
    expect(withVilaoDefaultProvider({ ...base, selectedProvider: 'claude' }).selectedProvider).toBe('claude');
    expect(withVilaoDefaultProvider({ ...base, selectedProvider: 'openai' }).selectedProvider).toBe('openai');
    expect(withVilaoDefaultProvider({ ...base, selectedProvider: 'vilao' }).selectedProvider).toBe('vilao');
  });

  it('không sửa các trường khác của cài đặt', () => {
    const next = withVilaoDefaultProvider({ ...base, selectedProvider: 'gemini', selectedModel: 'gemini-3.8-flash', geminiApiKey: '' });

    expect(next.selectedModel).toBe('gemini-3.8-flash');
    expect(next.models).toEqual(base.models);
  });
});
