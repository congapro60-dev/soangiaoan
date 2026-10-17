import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EffortPicker } from './EffortPicker';

const render = (provider: string, model: string, value?: string) =>
  renderToStaticMarkup(<EffortPicker provider={provider} model={model} value={value} onChange={() => undefined} />);

describe('EffortPicker — ô chọn mức suy nghĩ', () => {
  it('Claude Opus 5.5: nút Mặc định + đủ 5 mức, mô tả mức đang chọn', () => {
    const html = render('claude', 'claude-opus-5-5', 'xhigh');
    for (const text of ['Mức suy nghĩ', 'Mặc định (Cân bằng)', 'Nhanh', 'Cân bằng', 'Sâu', 'Rất sâu', 'Tối đa', 'Nghĩ rất kỹ cho việc phức tạp']) expect(html, text).toContain(text);
  });

  it('chỉ hiện các mức model nhận: Gemini 3.8 Flash không có "Tối thiểu"; Gemini 3.6 Flash thì có', () => {
    expect(render('gemini', 'gemini-3.8-flash')).not.toContain('Tối thiểu');
    expect(render('gemini', 'gemini-3.6-flash')).toContain('Tối thiểu');
  });

  it('ChatGPT Luna có "Không suy nghĩ"; Sol không có', () => {
    expect(render('openai', 'gpt-6-luna')).toContain('Không suy nghĩ');
    expect(render('openai', 'gpt-6.1-sol')).not.toContain('Không suy nghĩ');
  });

  it('chưa chọn thì mô tả mức mặc định; mức đã lưu mà model mới không nhận thì coi như chưa chọn', () => {
    expect(render('gemini', 'gemini-3.1-pro-preview')).toContain('Nghĩ kỹ');
    expect(render('gemini', 'gemini-3.8-flash', 'minimal')).toContain('Cân bằng:');
  });

  it('model không có mức (Haiku 4.5, Gemini 2.5, Grok) thì không hiện ô', () => {
    expect(render('claude', 'claude-haiku-4-5-20251001')).toBe('');
    expect(render('gemini', 'gemini-2.5-pro')).toBe('');
    expect(render('grok', 'grok-4')).toBe('');
  });
});
