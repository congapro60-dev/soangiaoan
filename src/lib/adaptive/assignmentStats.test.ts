import { describe, expect, it } from 'vitest';
import { buildAssignmentStats } from './assignmentStats';

describe('buildAssignmentStats', () => {
  it('tổng hợp theo seed/mục tiêu/lỗi sai/hỗ trợ; retry không đổi điểm', () => {
    const events = [
      { assignmentId: 'a1', type: 'attempt', studentId: 's1', objectiveScores: [{ objectiveId: 'o1', score: 1, maxScore: 2 }], misconceptionIds: ['m1'], wrongQuestionIds: ['q1'] },
      { assignmentId: 'a1', type: 'attempt', studentId: 's2', objectiveScores: [{ objectiveId: 'o1', score: 2, maxScore: 2 }], misconceptionIds: ['m1', 'm2'], wrongQuestionIds: [] },
      { assignmentId: 'a1', type: 'retry', studentId: 's1', objectiveScores: [{ objectiveId: 'o1', score: 2, maxScore: 2 }], misconceptionIds: ['m9'], wrongQuestionIds: ['q9'] },
      { assignmentId: 'other', type: 'attempt', studentId: 's3', objectiveScores: [], misconceptionIds: ['zz'], wrongQuestionIds: [] },
    ];
    const progress = [{ assignmentId: 'a1', status: 'completed' }, { assignmentId: 'a1', status: 'in_progress' }];
    const [stats] = buildAssignmentStats([{ id: 'a1', discoverSeedId: 'seed-1', title: 'T' }], progress, events);
    expect(stats).toMatchObject({ discoverSeedId: 'seed-1', started: 2, completed: 1, support: { retryEvents: 1, studentsRetrying: 1 } });
    expect(stats.objectives).toEqual([{ objectiveId: 'o1', avgPercent: 75 }]);
    expect(stats.misconceptions[0]).toEqual({ id: 'm1', count: 2 });
    expect(stats.misconceptions.map(item => item.id)).not.toContain('m9');
    expect(stats.wrongQuestions).toEqual([{ id: 'q1', count: 1 }]);
  });
});
