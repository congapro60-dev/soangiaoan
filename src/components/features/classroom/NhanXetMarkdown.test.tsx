import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NhanXetMarkdown } from './NhanXetMarkdown';
import { formatFeedbackMath, sanitizeDisplayText, tokenizeMath } from '../../../lib/adaptive/mathText';
import solutions from '../../../lib/adaptive/__fixtures__/graded-math-feedback.json';
describe('published math feedback actual Markdown/KaTeX rendering', () => {
  it.each(solutions)('$label renders without KaTeX errors, preserving content and idempotence', ({ text }) => {
    const normalized = formatFeedbackMath(text);
    const html = renderToStaticMarkup(<NhanXetMarkdown>{text}</NhanXetMarkdown>);
    expect(html).not.toContain('katex-error');
    expect(html).not.toContain('ParseError');
    expect(html).toContain('class="katex"');
    expect(formatFeedbackMath(normalized)).toBe(normalized);
    const before = tokenizeMath(sanitizeDisplayText(text)), after = tokenizeMath(normalized);
    const math = (content: string) => content.replace(/\\(?:begin|end)\{aligned\}|\\displaystyle|\\\\|&|\s/g, '').replace(/\.$/, '');
    expect(after.filter(t => t.type === 'math').map(t => math(t.content))).toEqual(before.filter(t => t.type === 'math').map(t => math(t.content)));
    const prose = (content: string) => content.replace(/[\s.]+/g, '');
    expect(prose(after.filter(t => t.type === 'text').map(t => t.content).join(''))).toBe(prose(before.filter(t => t.type === 'text').map(t => t.content).join('')));
  });
});

const render = (text: string) => renderToStaticMarkup(<NhanXetMarkdown>{text}</NhanXetMarkdown>);

describe('lời chữa toán theo bước', () => {
  it('tách chuỗi tích vô hướng dài thành khối căn dấu bằng, giữ lời dẫn ngoài toán', () => {
    const html = render('Dùng tích vô hướng: $A=\\vec{F}\\cdot\\overrightarrow{AB}=2\\cdot4+1\\cdot(-2)+3\\cdot1=9\\,\\mathrm{J}$.\n\nKiểm tra lại đơn vị.');
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('\\begin{aligned}');
    expect(html).toContain('Dùng tích vô hướng:');
    expect(html).toContain('Kiểm tra lại đơn vị.');
    expect(html).not.toContain('katex-error');
    expect(html).toContain('9');
  });

  it('không tách dấu bằng trong phân số/ngoặc hoặc hệ có sẵn; giữ phân số/căn dựng được', () => {
    const html = render('Công thức ngắn $\\frac{\\sqrt{14}}{2}$.\n\n$$\n\\begin{aligned}\nx+y&=3\\\\\nx-y&=1\n\\end{aligned}\n$$');
    expect(html.match(/class="katex-display"/g)).toHaveLength(1);
    expect(html).toContain('mfrac');
    expect(html).toContain('sqrt');
    expect(html).not.toContain('katex-error');
  });

  it('giữ ngắt dòng có chủ đích và không cho công thức ngắn bị bẻ giữa dòng', () => {
    const html = render('Bước 1: chọn công thức.\nBước 2: thay số $x=2$.');
    expect(html).toContain('whitespace-pre-line');
    expect(html).toContain('[&amp;_.katex]:whitespace-nowrap');
  });

  it('giữ hai ý trong cùng danh sách khi đưa phép tính ra khối riêng', () => {
    const html = render('- Thay số: $A=\\vec{F}\\cdot\\overrightarrow{AB}=2\\cdot4+1\\cdot(-2)+3\\cdot1=9$.\n- Kiểm tra đơn vị.');
    expect(html.match(/<ul>/g)).toHaveLength(1);
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).toContain('class="katex-display"');
  });
});
