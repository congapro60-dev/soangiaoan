import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/firebase', () => ({ db: {} }));
// fileUtils kéo theo pdfjs (cần DOMMatrix, không có trong môi trường test).
vi.mock('../utils/fileUtils', () => ({ normalizePlanTitle: (s: string) => s }));

import { DEFAULT_DATA } from '../types';
import { DEFAULT_GEMINI_RUNTIME_MODEL, GEMINI_RUNTIME_MODELS } from '../lib/gemini';
import { withCurrentDefaultModel } from './useAppState';

describe('model Gemini mặc định', () => {
  it('mặc định là gemini-3.8-flash, 3.7 đứng ngay sau làm dự phòng', () => {
    expect(DEFAULT_GEMINI_RUNTIME_MODEL).toBe('gemini-3.8-flash');
    expect(DEFAULT_DATA.settings.selectedModel).toBe('gemini-3.8-flash');
    expect(GEMINI_RUNTIME_MODELS.slice(0, 2)).toEqual(['gemini-3.8-flash', 'gemini-3.7-flash']);
  });

  it('cài đặt còn lưu model mặc định cũ thì lên 3.8; model khác giữ nguyên', () => {
    const base = DEFAULT_DATA.settings;
    expect(withCurrentDefaultModel({ ...base, selectedModel: 'gemini-3.7-flash' }).selectedModel).toBe('gemini-3.8-flash');
    expect(withCurrentDefaultModel({ ...base, selectedModel: 'gemini-3.1-pro-preview' }).selectedModel).toBe('gemini-3.1-pro-preview');
    expect(withCurrentDefaultModel({ ...base, selectedProvider: 'claude', selectedModel: 'claude-opus-5-5' }).selectedModel).toBe('claude-opus-5-5');
  });
});
