import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CoachExpectedContent } from './CoachExpectedContent';

const render = (value: unknown) => renderToStaticMarkup(createElement(CoachExpectedContent, { value }));

describe('private Coach expected content rendering policy', () => {
  it('renders string answers through the shared rich-text and KaTeX renderer', () => {
    const html = render('Answer **checked**: $x=\\pi/6$.');
    expect(html).toContain('live-rich-text');
    expect(html).toContain('<strong>checked</strong>');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('katex-error');
  });

  it('renders string rubric mathematics rather than raw delimiters', () => {
    const html = render('Rubric: verify $k\\in\\mathbb{Z}$.');
    expect(html).toContain('class="katex"');
    expect(html).toContain('∈');
    expect(html).not.toContain('$k');
    expect(html).not.toContain('katex-error');
  });

  it.each([0, 12, false, true])('preserves literal primitive %s', value => {
    expect(render(value).replace(/<[^>]*>/g, '')).toBe(String(value));
    expect(render(value)).not.toContain('katex');
  });

  it('renders ordered arrays recursively without dropping zero, false or nested values', () => {
    const html = render(['First $x=1$', 0, false, ['Nested $y=2$', true], { final: '**literal**' }]);
    expect(html.match(/<ol(?:\s[^>]*)?>/g)).toHaveLength(2);
    expect(html.match(/<li(?:\s[^>]*)?>/g)).toHaveLength(7);
    expect(html.match(/class="katex"/g)).toHaveLength(2);
    const positions = ['First', '>0<', '>false<', 'Nested', '>true<', 'literal'].map(text => html.indexOf(text));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('renders Golden-style rubric fields as readable labeled mathematics without dropping fields', () => {
    const html = render({ mode: 'look_for', criteria: ['Giải thích $x=\\pi/6$.', 'Kiểm tra miền xác định.'],
      sourceBasis: 'Giáo án đã duyệt', acceptEquivalent: false });
    expect(html).toContain('Kiểu tiêu chí');
    expect(html).toContain('Tiêu chí');
    expect(html).toContain('Nguồn căn cứ');
    expect(html).toContain('Cho phép cách trả lời tương đương');
    expect(html).toContain('class="katex"');
    expect(html).toContain('Giải thích');
    expect(html).toContain('Kiểm tra miền xác định.');
    expect(html).toContain('data-boolean="false"');
    expect(html).not.toContain('katex-error');
    expect(html).not.toContain('Dữ liệu có cấu trúc — cần rà nội dung:');
  });

  it('shows a structured true/false key privately as ordered Vietnamese choices', () => {
    const html = render({ mode: 'structured_true_false_matrix', key: [true, true, false], rationale: '$k\\in\\mathbb{Z}$' });
    expect(html).toContain('Đáp án theo hàng');
    expect(html).toContain('>Đúng<');
    expect(html).toContain('>Sai<');
    expect(html.indexOf('>Sai<')).toBeGreaterThan(html.indexOf('>Đúng<'));
    expect(html).toContain('class="katex"');
  });

  it('renders unknown nested object keys and values safely without executing markup', () => {
    const html = render({ criteria: [{ label: '**Rubric**', levels: [0, false], math: '$k\\in\\mathbb{Z}$' }],
      unknown: '<script>&</script>' });
    expect(html).toContain('unknown');
    expect(html).toContain('&lt;script&gt;&amp;&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('<strong>Rubric</strong>');
    expect(html).toContain('class="katex"');
    expect(html).toContain('>0<');
    expect(html).toContain('data-boolean="false"');
  });
});
