import { describe, expect, it } from 'vitest';
import { buildStudentSkillCards } from './skillViewModel';
import type { StudentSkillState } from '../learning/skillTypes';

const state = (overrides: Partial<StudentSkillState> = {}): StudentSkillState => ({
  skillId: 'math.line-equation',
  masteryEstimate: 0.68,
  confidence: 0.72,
  status: 'developing',
  evidenceCount: 2,
  sourceKinds: ['homework', 'practice'],
  misconceptionCounts: { 'line-sign-error': 2 },
  trend: 'up',
  lastEvidenceAt: '2026-08-24T12:00:00.000Z',
  ...overrides,
});

describe('skillViewModel — projection an toàn cho học sinh', () => {
  it('đổi state thành thẻ ngôn ngữ giáo dục, không đưa raw evidence/nhầm lẫn ra UI', () => {
    const cards = buildStudentSkillCards([state()]);

    expect(cards).toEqual([expect.objectContaining({
      skillId: 'math.line-equation',
      title: 'Lập và sử dụng phương trình đường thẳng',
      statusLabel: 'Đang phát triển',
      trendLabel: 'Đang tiến bộ',
      sourceLabel: 'Bài đã được giáo viên duyệt · Luyện tập',
      masteryPercent: 68,
      confidencePercent: 72,
      evidenceCount: 2,
    })]);
    expect(cards[0]).not.toHaveProperty('misconceptionCounts');
    expect(cards[0]).not.toHaveProperty('lastEvidenceAt');
  });

  it('bỏ skillId ngoài catalog và vẫn phân biệt chưa có dữ liệu', () => {
    const cards = buildStudentSkillCards([
      state({ skillId: 'math.not-in-catalog' }),
      state({ skillId: 'math.quadratic-function', status: 'not_seen', masteryEstimate: 0, confidence: 0, evidenceCount: 0, sourceKinds: [], trend: 'flat' }),
    ]);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      skillId: 'math.quadratic-function',
      statusLabel: 'Chưa có dữ liệu',
      trendLabel: 'Chưa đủ dữ liệu',
      sourceLabel: 'Chưa có minh chứng',
      masteryPercent: 0,
      confidencePercent: 0,
    });
  });
});
