import { describe, expect, it } from 'vitest';
import { buildLiveLessonUrls, getPilotDefinitionForLesson, validateLiveLessonLaunch } from './LiveLessonLauncher';

describe('live lesson launcher helpers', () => {
  it('blocks creation when there is no owned synchronized class', () => {
    expect(validateLiveLessonLaunch({ lessonReady: true, classId: '' })).toEqual({
      ok: false,
      message: expect.stringContaining('lớp'),
    });
  });

  it('builds teacher, TV and student URLs with one session id', () => {
    const urls = buildLiveLessonUrls('session-123', 'https://smartplan.test');
    expect(urls.teacher).toBe('https://smartplan.test/adaptive-live/session-123?mode=teacher');
    expect(urls.tv).toBe('https://smartplan.test/adaptive-live/session-123?mode=tv');
    expect(urls.student).toBe('https://smartplan.test/adaptive-live/session-123?mode=student');
    expect(new Set(Object.values(urls).map(url => url.match(/adaptive-live\/([^?]+)/)?.[1]))).toEqual(new Set(['session-123']));
    expect(Object.values(urls).join(' ')).not.toMatch(/pin|secret/i);
  });

  it('rejects a published lesson without the matching pilot definition', () => {
    expect(() => getPilotDefinitionForLesson({
      id: 'arbitrary-lesson',
      title: 'Bài khác',
      durationMinutes: 40,
      status: 'published',
    } as never)).toThrow(/pilot/i);
  });
});
