import { describe, expect, it } from 'vitest';
import type { LivePublicStats } from '../../lib/liveLesson/types';
import { getTvStatsView } from './TvStatsPanel';

const makeStats = (overrides: Partial<LivePublicStats>): LivePublicStats => ({
  stepId: 'step',
  participantCount: 10,
  submittedCount: 6,
  choiceCounts: {},
  routeCounts: { M: 0, S: 0, C: 0 },
  errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
  hintUseCount: 0,
  updatedAt: 1,
  ...overrides,
});

describe('getTvStatsView', () => {
  it('shows AI error categories for the ai-error step', () => {
    const view = getTvStatsView(makeStats({ stepId: 'cp-ai-error', errorCategoryCounts: { Conceptual: 1, Algebraic: 0, Logical: 3, 'Missing condition': 2 } }));
    expect(view.kind).toBe('error');
    if (view.kind === 'error') {
      expect(view.items.map((i) => i.label)).toEqual(['Conceptual', 'Algebraic', 'Logical', 'Missing condition']);
      expect(view.items.find((i) => i.label === 'Logical')?.count).toBe(3);
    }
  });

  it('shows M/S/C for the route step', () => {
    const view = getTvStatsView(makeStats({ stepId: 'cp-route', routeCounts: { M: 4, S: 3, C: 1 } }));
    expect(view.kind).toBe('route');
    if (view.kind === 'route') expect(view.items.map((i) => i.count)).toEqual([4, 3, 1]);
  });

  it('shows choice counts (non-zero only) for a choice step', () => {
    const view = getTvStatsView(makeStats({ stepId: 'cp-student-goal', choiceCounts: { G1: 5, G2: 0, G3: 2 } }));
    expect(view.kind).toBe('choice');
    if (view.kind === 'choice') {
      expect(view.items).toEqual([{ label: 'G1', count: 5 }, { label: 'G3', count: 2 }]);
    }
  });

  it('shows only participant/submitted counts for a text/exit step', () => {
    const view = getTvStatsView(makeStats({ stepId: 'cp-exit-ticket' }));
    expect(view.kind).toBe('counts');
    expect(view.participantCount).toBe(10);
    expect(view.submittedCount).toBe(6);
  });

  it('sanitizes malformed/negative counts to zero', () => {
    const view = getTvStatsView(makeStats({
      stepId: 'cp-route',
      participantCount: -5 as unknown as number,
      routeCounts: { M: Number.NaN as unknown as number, S: -2 as unknown as number, C: 4 },
    }));
    expect(view.participantCount).toBe(0);
    if (view.kind === 'route') {
      expect(view.items.find((i) => i.label === 'Tuyến M')?.count).toBe(0);
      expect(view.items.find((i) => i.label === 'Tuyến S')?.count).toBe(0);
      expect(view.items.find((i) => i.label === 'Tuyến C')?.count).toBe(4);
    }
  });

  it('never surfaces raw text, names, or private identifiers', () => {
    const serialized = JSON.stringify(getTvStatsView(makeStats({ stepId: 'cp-ai-error', errorCategoryCounts: { Conceptual: 2, Algebraic: 0, Logical: 0, 'Missing condition': 0 } })));
    expect(serialized).not.toMatch(/name|studentId|participantUid|rawText|\bpin\b/i);
  });
});
