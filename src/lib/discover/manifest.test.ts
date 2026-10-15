import { describe, expect, it } from 'vitest';
import manifest from '../../data/discoverNewKnowledgeLessons.json';
import type { DiscoverNewKnowledgeSeed } from './types';

const rows = manifest as DiscoverNewKnowledgeSeed[];

describe('Discover PPCT manifest', () => {
  it('contains the expected new-knowledge counts for grades 10-12', () => {
    expect(rows).toHaveLength(204);
    expect(rows.filter(row => row.grade === '10')).toHaveLength(54);
    expect(rows.filter(row => row.grade === '11')).toHaveLength(84);
    expect(rows.filter(row => row.grade === '12')).toHaveLength(66);
  });

  it('keeps stable period IDs and source traceability', () => {
    expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
    expect(rows.every(row => row.id.startsWith(`tds-discover-g${row.grade}-p`))).toBe(true);
    expect(rows.every(row => row.sourceWorkbook === 'PPCT THCS-THPT 26-27.xlsx' && row.row > 0)).toBe(true);
  });

  it('excludes review, test, self-choice and project rows', () => {
    expect(rows.some(row => /luyện tập|ôn tập|kiểm tra|tự chọn|dự án|trải nghiệm/i.test(row.text))).toBe(false);
  });
});
