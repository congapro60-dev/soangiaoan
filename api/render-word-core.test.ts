import { describe, expect, it } from 'vitest';
import { preprocessExamMarkdownForWord } from './render-word-core';

describe('preprocessExamMarkdownForWord', () => {
  it('converts short plain A/B/C/D options to a valid 4-column GFM option grid', () => {
    const input = ['Câu 1. Chọn đáp án đúng.', 'A. 1', 'B. 2', 'C. 3', 'D. 4'].join('\n');

    const output = preprocessExamMarkdownForWord(input);

    expect(output).toContain('<!-- OPTION_GRID -->');
    expect(output).toContain('| A. 1 | B. 2 | C. 3 | D. 4 |');
    expect(output).toContain('| --- | --- | --- | --- |');
  });

  it('converts markdown-list bold A/B/C/D options to a valid 4-column GFM option grid', () => {
    const input = ['Câu 2. Chọn đáp án đúng.', '- **A.** 10', '- **B.** 20', '- **C.** 30', '- **D.** 40'].join('\n');

    const output = preprocessExamMarkdownForWord(input);

    expect(output).toContain('<!-- OPTION_GRID -->');
    expect(output).toContain('| A. 10 | B. 20 | C. 30 | D. 40 |');
    expect(output).toContain('| --- | --- | --- | --- |');
  });

  it('sanitizes centered HTML wrappers around the end marker', () => {
    const output = preprocessExamMarkdownForWord('<div style="text-align:center">**--- HẾT ---**</div>');

    expect(output).toBe('**--- HẾT ---**');
    expect(output).not.toContain('<div');
    expect(output).not.toContain('</div>');
  });
});
