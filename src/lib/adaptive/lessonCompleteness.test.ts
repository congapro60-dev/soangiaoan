import { describe, expect, it } from 'vitest';
import type { KnowledgeUnit, LearningObjective } from './types';
import { getObjectiveCoverage } from './lessonCompleteness';

const objective = (id: string, kind?: LearningObjective['kind']): LearningObjective => ({
  id,
  code: id,
  ...(kind ? { kind } : {}),
  title: id,
  description: id,
  bloomLevel: 'understand',
  masteryThreshold: 0.7,
  prerequisiteObjectiveIds: [],
  commonMisconceptions: [],
});

const unit = (objectiveIds: string[]): KnowledgeUnit => ({
  id: 'unit-1',
  title: 'Mảnh kiến thức',
  objectiveIds,
  estimatedMinutes: 10,
  routes: [],
  quickCheck: { id: 'quick-1', title: 'Quick check', purpose: 'quick_check', durationMinutes: 3, questions: [] },
  maxRemediationAttempts: 2,
});

describe('getObjectiveCoverage', () => {
  it('counts objective ids covered by units instead of comparing unit count to objective count', () => {
    const result = getObjectiveCoverage(
      [objective('math-1', 'math'), objective('math-2', 'math'), objective('math-3', 'math')],
      [unit(['math-1', 'math-2', 'math-3'])],
    );

    expect(result).toEqual({ total: 3, covered: 3, uncoveredObjectiveIds: [], ratio: 1 });
  });

  it('does not require a separate content unit for an explicit language objective', () => {
    const result = getObjectiveCoverage(
      [objective('math-1', 'math'), objective('language-1', 'language')],
      [unit(['math-1'])],
    );

    expect(result).toEqual({ total: 1, covered: 1, uncoveredObjectiveIds: [], ratio: 1 });
  });

  it('treats legacy objectives without kind as content objectives', () => {
    const result = getObjectiveCoverage(
      [objective('obj-1'), objective('obj-2')],
      [unit(['obj-1'])],
    );

    expect(result).toEqual({ total: 2, covered: 1, uncoveredObjectiveIds: ['obj-2'], ratio: 0.5 });
  });

  it('recognizes the legacy V4 language code while preserving content coverage', () => {
    const result = getObjectiveCoverage(
      [objective('M1'), objective('L1')],
      [unit(['M1'])],
    );

    expect(result).toEqual({ total: 1, covered: 1, uncoveredObjectiveIds: [], ratio: 1 });
  });
});
