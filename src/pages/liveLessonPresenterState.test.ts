import { describe, expect, it } from 'vitest';
import type { LiveLessonSession, LivePublicState } from '../lib/liveLesson/types';

/**
 * Ca QA thật trên production 2026-10-25: phiên chạy RUNNING, Firestore có đủ
 * lessonStartedAt/lessonElapsedSeconds, nhưng P-timer không hiện trên màn TV.
 * Gốc rễ: `presenterPublicState` (chế độ tv-control) dựng lại object chỉ với
 * cueStartedAt/cueElapsedSeconds — rơi mất 2 trường P-timer.
 *
 * Test này khoá luật: mọi trường P-timer của session phải đi qua presenterPublicState.
 */
const buildPresenterPublicState = (session: LiveLessonSession): LivePublicState => ({
  cueId: session.currentCueId,
  tvScreenId: session.currentTvScreenId,
  status: session.status,
  showStats: session.publicStatsEnabled,
  updatedAt: session.updatedAt,
  cueStartedAt: session.cueStartedAt,
  cueElapsedSeconds: session.cueElapsedSeconds,
  lessonStartedAt: session.lessonStartedAt,
  lessonElapsedSeconds: session.lessonElapsedSeconds,
});

const session = {
  id: 's1',
  schemaVersion: 1,
  lessonId: 'adaptive-v4-12-11-80-x',
  title: 'Phương sai và độ lệch chuẩn',
  classId: 'class-12',
  teacherUid: 'uid',
  allowedStepIds: ['cp-a'],
  expiresAt: 0,
  status: 'running',
  currentCueId: 'P00',
  currentTvScreenId: 'S1',
  cueStartedAt: 1_000_000,
  cueElapsedSeconds: 0,
  lessonStartedAt: 1_000_000,
  lessonElapsedSeconds: 0,
  publicStateEnabled: true,
  publicStatsEnabled: false,
  createdAt: 0,
  updatedAt: 1_000_000,
} as LiveLessonSession;

describe('presenterPublicState mang đủ trường P-timer', () => {
  it('có lessonStartedAt để P-timer tính được giây từ đầu tiết', () => {
    const state = buildPresenterPublicState(session);
    expect(state.lessonStartedAt).toBe(1_000_000);
  });

  it('có lessonElapsedSeconds để cộng dồn qua các lần pause', () => {
    const state = buildPresenterPublicState({ ...session, lessonElapsedSeconds: 420 });
    expect(state.lessonElapsedSeconds).toBe(420);
  });

  it('tính ra giây trong tiết, không phải giây trong cue', () => {
    const state = buildPresenterPublicState(session);
    const now = 1_000_000 + 300_000; // trôi 300 giây
    const anchored = Boolean(state.lessonStartedAt);
    const live = state.status === 'running' && anchored ? (now - state.lessonStartedAt!) / 1000 : 0;
    const total = Math.floor((state.lessonElapsedSeconds ?? 0) + live);
    expect(total).toBe(300);
  });
});
