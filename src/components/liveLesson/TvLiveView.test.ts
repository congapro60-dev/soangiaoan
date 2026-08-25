import { describe, expect, it } from 'vitest';
import { getPilotLiveLessonDefinition } from '../../lib/liveLesson/definition';
import type { LivePublicState, LivePublicStats } from '../../lib/liveLesson/types';
import { getTvListenerNotice, getTvPresentation } from './TvLiveView';

describe('TvLiveView public projection', () => {
  it('renders only the public screen and aggregate stats', () => {
    const definition = getPilotLiveLessonDefinition();
    const state: LivePublicState = { cueId: 'P12', tvScreenId: 'S8', status: 'running', showStats: true, updatedAt: 10 };
    const stats: LivePublicStats = {
      stepId: 'ai-error-w01', participantCount: 4, submittedCount: 4,
      choiceCounts: {}, routeCounts: { M: 0, S: 0, C: 0 },
      errorCategoryCounts: { Conceptual: 1, Algebraic: 1, Logical: 2, 'Missing condition': 0 },
      hintUseCount: 0, updatedAt: 10,
    };
    const presentation = getTvPresentation(definition, state, stats);
    expect(presentation.screen?.id).toBe('S8');
    expect(presentation.stats?.participantCount).toBe(4);
    expect(JSON.stringify(presentation)).not.toContain(definition.cues[12].teacher);
    expect(JSON.stringify(presentation)).not.toContain(definition.cues[12].boardLarge);
    expect(JSON.stringify(presentation)).not.toContain(definition.aiErrorOfTheWeek.correction);
  });

  it('does not expose a screen or stats when public state is unavailable', () => {
    const definition = getPilotLiveLessonDefinition();
    expect(getTvPresentation(definition, null, null)).toEqual({ screen: null, stats: null });
  });

  it('distinguishes a public listener reconnect from a closed public state', () => {
    const definition = getPilotLiveLessonDefinition();
    const runningState: LivePublicState = { cueId: 'P12', tvScreenId: 'S8', status: 'running', showStats: true, updatedAt: 10 };
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
