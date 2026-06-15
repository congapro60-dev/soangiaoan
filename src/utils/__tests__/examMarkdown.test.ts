import { describe, expect, it } from 'vitest';
import { preprocessExamMarkdown } from '../examMarkdown';

describe('preprocessExamMarkdown', () => {
  it('sanitizes centered HTML wrappers around the exam end marker', () => {
    const output = preprocessExamMarkdown('<div style="text-align:center">**--- HẾT ---**</div>');

    expect(output).toBe('**--- HẾT ---**');
    expect(output).not.toContain('<div');
    expect(output).not.toContain('</div>');
  });
});
