import { describe, it, expect } from 'vitest';
import { getBanToanV4PackageMetadata, getBanToanV4DisplayTitle } from './lessonAdapter';

describe('Unique displayTitle per grade', () => {
  it('không có 2 bài trùng displayTitle trong cùng một khối lớp', () => {
    const meta = getBanToanV4PackageMetadata();
    const byGrade: Record<number, Map<string, string>> = { 10: new Map(), 11: new Map(), 12: new Map() };
    const duplicates: string[] = [];

    for (const m of meta) {
      const displayTitle = getBanToanV4DisplayTitle(m.sourceKey);
      const map = byGrade[m.grade];
      if (map.has(displayTitle)) {
        duplicates.push(`Khối ${m.grade}: "${displayTitle}" (keys: ${map.get(displayTitle)} & ${m.sourceKey})`);
      } else {
        map.set(displayTitle, m.sourceKey);
      }
    }

    expect(duplicates).toEqual([]);
    console.log(`Đã kiểm chứng: Khối 10 = ${byGrade[10].size} bài, Khối 11 = ${byGrade[11].size} bài, Khối 12 = ${byGrade[12].size} bài.`);
  });
});
