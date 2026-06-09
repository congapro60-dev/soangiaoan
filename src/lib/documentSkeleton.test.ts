import { describe, expect, it } from 'vitest';
import {
  countMarkdownTableClusters,
  createDocumentSkeleton,
  recalculateSkeletonFromMarkdown,
  validateMarkdownAgainstSkeleton,
} from './documentSkeleton';

describe('documentSkeleton Phase 2B', () => {
  it('counts adjacent markdown table rows as one table cluster', () => {
    const markdown = [
      '| Hoạt động của GV | Hoạt động của HS | Nội dung |',
      '|---|---|---|',
      '| GV hỏi | HS trả lời | Ghi bảng |',
      '| GV chốt | HS ghi | Công thức |',
      '',
      'Đoạn văn xen giữa',
      '',
      '| Tiêu chí | Điểm | Nhận xét |',
      '|---|---|---|',
      '| 1a | 4 | Tốt |',
    ].join('\n');

    expect(countMarkdownTableClusters(markdown)).toBe(2);
  });

  it('creates one skeleton table block per markdown table cluster', () => {
    const skeleton = createDocumentSkeleton([
      '# Bài học mẫu',
      '| Cột 1 | Cột 2 |',
      '|---|---|',
      '| A | B |',
      '| C | D |',
    ].join('\n'));

    expect(skeleton.stats.headingCount).toBe(1);
    expect(skeleton.stats.tableCount).toBe(1);
    expect(skeleton.blocks.find(block => block.type === 'table')?.rowCount).toBe(2);
  });

  it('returns structured validation issues and score details', () => {
    const skeleton = createDocumentSkeleton([
      '# Mục tiêu',
      '# Hoạt động',
      '| GV | HS |',
      '|---|---|',
      '| [nội dung] | ___ |',
    ].join('\n'));

    const result = validateMarkdownAgainstSkeleton('# Mục tiêu\n\nNội dung tự do [...]', skeleton);

    expect(result.ok).toBe(true);
    expect(result.score).toBeLessThan(1);
    expect(result.stats.expectedHeadings).toBe(2);
    expect(result.stats.matchedHeadings).toBe(1);
    expect(result.stats.expectedTables).toBe(1);
    expect(result.stats.detectedTables).toBe(0);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        level: 'warning',
        type: 'missing_heading',
        code: 'missing_heading',
        severity: 'warning',
      }),
      expect.objectContaining({
        level: 'warning',
        type: 'missing_tables',
      }),
      expect.objectContaining({
        level: 'warning',
        type: 'unfilled_placeholder',
      }),
    ]));
  });

  it('hard-errors only on structurally empty output', () => {
    const skeleton = createDocumentSkeleton('# Mục tiêu');
    const result = validateMarkdownAgainstSkeleton('', skeleton);

    expect(result.ok).toBe(false);
    expect(result.issues[0]).toEqual(expect.objectContaining({ level: 'error', type: 'empty_output' }));
  });

  it('recalculates skeleton correctly from modified markdown', () => {
    const manualMarkdown = [
      '# Tiêu đề mới',
      '## Phần 1',
      '| Cột A | Cột B |',
      '|---|---|',
      '| 1 | [nội dung] |',
    ].join('\n');

    const skeleton = recalculateSkeletonFromMarkdown(manualMarkdown, 'manual.txt');

    expect(skeleton.sourceName).toBe('manual.txt');
    expect(skeleton.markdown).toBe(manualMarkdown); // Keeps the exact markdown string
    expect(skeleton.stats.headingCount).toBe(2);
    expect(skeleton.stats.tableCount).toBe(1);
    expect(skeleton.stats.placeholderCount).toBe(1);
  });
});
