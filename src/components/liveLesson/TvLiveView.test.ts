import { describe, expect, it } from 'vitest';
import { getPilotLiveLessonDefinition } from '../../lib/liveLesson/definition';
import type { LivePublicState, LivePublicStats } from '../../lib/liveLesson/types';
import { getStatCards, getTvListenerNotice, getTvPresentation, getTvStatsItems, shouldSubscribeToLivePublicStats } from './TvLiveView';

describe('TvLiveView public projection', () => {
  it('renders only the public screen and aggregate stats', () => {
    const definition = getPilotLiveLessonDefinition();
    const state: LivePublicState = { cueId: 'P12', tvScreenId: 'S8A', status: 'running', showStats: true, updatedAt: 10 };
    const stats: LivePublicStats = {
      stepId: 'ai-error-w01', participantCount: 4, submittedCount: 4,
      choiceCounts: {}, routeCounts: { M: 0, S: 0, C: 0 },
      errorCategoryCounts: { Conceptual: 1, Algebraic: 1, Logical: 2, 'Missing condition': 0 },
      hintUseCount: 0, updatedAt: 10,
    };
    const presentation = getTvPresentation(definition, state, stats);
    expect(presentation.screen?.id).toBe('S8A');
    expect(presentation.stats?.participantCount).toBe(4);
    expect(JSON.stringify(presentation)).not.toContain(definition.cues[12].teacher);
    expect(JSON.stringify(presentation)).not.toContain(definition.cues[12].boardLarge);
    expect(JSON.stringify(presentation)).not.toContain(definition.aiErrorOfTheWeek.correction);
  });

  it('does not expose a screen or stats when public state is unavailable', () => {
    const definition = getPilotLiveLessonDefinition();
    expect(getTvPresentation(definition, null, null)).toEqual({ screen: null, stats: null });
  });

  it('returns the five public stats items in the TV order', () => {
    const stats: LivePublicStats = {
      stepId: 'ai-error-w01', participantCount: 12, submittedCount: 8,
      choiceCounts: {}, routeCounts: { M: 4, S: 3, C: 1 },
      errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
      hintUseCount: 0, updatedAt: 10,
    };

    expect(getTvStatsItems(stats)).toEqual([
      { label: 'Tham gia', value: 12 },
      { label: 'Đã gửi', value: 8 },
      { label: 'Tuyến M', value: 4 },
      { label: 'Tuyến S', value: 3 },
      { label: 'Tuyến C', value: 1 },
    ]);
  });

  it('waits for the teacher to expose stats before subscribing to the public stats document', () => {
    const hiddenState: LivePublicState = { cueId: 'P00', tvScreenId: 'S0', status: 'lobby', showStats: false, updatedAt: 10 };
    const visibleState: LivePublicState = { ...hiddenState, showStats: true };
    expect(shouldSubscribeToLivePublicStats(hiddenState)).toBe(false);
    expect(shouldSubscribeToLivePublicStats(visibleState)).toBe(true);
  });

  it('distinguishes a public listener reconnect from a closed public state', () => {
    const definition = getPilotLiveLessonDefinition();
    const runningState: LivePublicState = { cueId: 'P12', tvScreenId: 'S8A', status: 'running', showStats: true, updatedAt: 10 };
    expect(getTvListenerNotice({ publicState: runningState, publicStateError: 'permission-denied', statsError: null })).toEqual({
      tone: 'error',
      message: 'Mất kết nối trạng thái công khai. Đang giữ màn hình cuối; phiên có thể đã đóng hoặc hết hạn.',
    });
    expect(getTvListenerNotice({ publicState: { ...runningState, status: 'closed' }, publicStateError: null, statsError: null })).toEqual({
      tone: 'warning',
      message: 'Phiên đã đóng. TV không tiếp tục đọc dữ liệu công khai.',
    });
    expect(definition.title).toBeTruthy();
  });
});

describe('TvLiveView stat cards max', () => {
  it('returns at most 4 stat cards (participantCount + submittedCount + 2 route entries)', () => {
    const stats: LivePublicStats = {
      stepId: 'P16',
      participantCount: 32,
      submittedCount: 21,
      choiceCounts: {},
      routeCounts: { M: 8, S: 17, C: 7 },
      errorCategoryCounts: { Conceptual: 2, Algebraic: 4, Logical: 11, 'Missing condition': 4 },
      hintUseCount: 0,
      updatedAt: Date.now(),
    };
    const cards = getStatCards(stats);
    expect(cards.length).toBeLessThanOrEqual(4);
    expect(cards[0]).toEqual({ label: 'Tham gia', value: 32 });
    expect(cards[1]).toEqual({ label: 'Đã gửi', value: 21 });
  });

  it('shows only participantCount + submittedCount when routeCounts are empty', () => {
    const stats: LivePublicStats = {
      stepId: 'P00',
      participantCount: 5,
      submittedCount: 3,
      choiceCounts: {},
      routeCounts: { M: 0, S: 0, C: 0 },
      errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
      hintUseCount: 0,
      updatedAt: Date.now(),
    };
    const cards = getStatCards(stats);
    expect(cards.length).toBe(2);
  });

  it('does not include name, studentId, languageSupportPlan, rawText, or privateReason in JSON', () => {
    const definition = getPilotLiveLessonDefinition();
    const state: LivePublicState = { cueId: 'P16', tvScreenId: 'S4', status: 'running', showStats: true, updatedAt: Date.now() };
    const stats: LivePublicStats = {
      stepId: 'P16', participantCount: 10, submittedCount: 5,
      choiceCounts: {}, routeCounts: { M: 2, S: 3, C: 0 },
      errorCategoryCounts: { Conceptual: 1, Algebraic: 0, Logical: 4, 'Missing condition': 0 },
      hintUseCount: 0, updatedAt: Date.now(),
    };
    const presentation = getTvPresentation(definition, state, stats);
    const json = JSON.stringify(presentation);
    expect(json).not.toContain('name');
    expect(json).not.toContain('studentId');
    expect(json).not.toContain('languageSupportPlan');
    expect(json).not.toContain('rawText');
    expect(json).not.toContain('privateReason');
  });

  // Blocker 4: stats hidden when showStats=false, no spurious warnings
  it('[B4] presentation.stats is null when showStats=false regardless of stats doc', () => {
    const definition = getPilotLiveLessonDefinition();
    const state: LivePublicState = { cueId: 'P12', tvScreenId: 'S8', status: 'running', showStats: false, updatedAt: 10 };
    const stats: LivePublicStats = {
      stepId: 'warmup', participantCount: 4, submittedCount: 2,
      choiceCounts: {}, routeCounts: { M: 1, S: 2, C: 1 },
      errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
      hintUseCount: 0, updatedAt: 10,
    };
    const presentation = getTvPresentation(definition, state, stats);
    // stats must be null even when a stats doc exists — the show gate controls visibility
    expect(presentation.stats).toBeNull();
  });

  it('[B4] getTvListenerNotice does not emit spurious statsError warning when stats are hidden', () => {
    const runningState: LivePublicState = { cueId: 'P12', tvScreenId: 'S8', status: 'running', showStats: false, updatedAt: 10 };
    // A stale listener error must not be shown after the teacher hides stats.
    expect(getTvListenerNotice({ publicState: runningState, publicStateError: null, statsError: 'permission-denied' })).toBeNull();
  });

  it('[B4] getTvPresentation with showStats=true but no stats doc yet returns null stats (no crash)', () => {
    const definition = getPilotLiveLessonDefinition();
    const state: LivePublicState = { cueId: 'P12', tvScreenId: 'S8', status: 'running', showStats: true, updatedAt: 10 };
    // stats = null simulates subscription active but doc not yet received
    const presentation = getTvPresentation(definition, state, null);
    expect(presentation.stats).toBeNull();
    expect(presentation.screen).not.toBeNull();
  });
});

describe('TvLiveView stat cards max', () => {
  it('returns at most 4 stat cards (participantCount + submittedCount + 2 route entries)', () => {
    const stats: LivePublicStats = {
      stepId: 'P16',
      participantCount: 32,
      submittedCount: 21,
      choiceCounts: {},
      routeCounts: { M: 8, S: 17, C: 7 },
      errorCategoryCounts: { Conceptual: 2, Algebraic: 4, Logical: 11, 'Missing condition': 4 },
      hintUseCount: 0,
      updatedAt: Date.now(),
    };
    const cards = getStatCards(stats);
    expect(cards.length).toBeLessThanOrEqual(4);
    expect(cards[0]).toEqual({ label: 'Tham gia', value: 32 });
    expect(cards[1]).toEqual({ label: 'Đã gửi', value: 21 });
  });

  it('shows only participantCount + submittedCount when routeCounts are empty', () => {
    const stats: LivePublicStats = {
      stepId: 'P00',
      participantCount: 5,
      submittedCount: 3,
      choiceCounts: {},
      routeCounts: { M: 0, S: 0, C: 0 },
      errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
      hintUseCount: 0,
      updatedAt: Date.now(),
    };
    const cards = getStatCards(stats);
    expect(cards.length).toBe(2);
  });

  it('does not include name, studentId, languageSupportPlan, rawText, or privateReason in JSON', () => {
    const definition = getPilotLiveLessonDefinition();
    const state: LivePublicState = { cueId: 'P16', tvScreenId: 'S4', status: 'running', showStats: true, updatedAt: Date.now() };
    const stats: LivePublicStats = {
      stepId: 'P16', participantCount: 10, submittedCount: 5,
      choiceCounts: {}, routeCounts: { M: 2, S: 3, C: 0 },
      errorCategoryCounts: { Conceptual: 1, Algebraic: 0, Logical: 4, 'Missing condition': 0 },
      hintUseCount: 0, updatedAt: Date.now(),
    };
    const presentation = getTvPresentation(definition, state, stats);
    const json = JSON.stringify(presentation);
    expect(json).not.toContain('name');
    expect(json).not.toContain('studentId');
    expect(json).not.toContain('languageSupportPlan');
    expect(json).not.toContain('rawText');
    expect(json).not.toContain('privateReason');
  });
});
