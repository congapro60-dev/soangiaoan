import { describe, expect, it } from 'vitest';
import { buildLiveLessonUrls, formatLiveLessonLaunchError, getPilotDefinitionForLesson, isAuthoritativeServerClassList, validateLiveLessonLaunch } from './LiveLessonLauncher';

describe('live lesson launcher helpers', () => {
  it('blocks creation when there is no owned synchronized class', () => {
    expect(validateLiveLessonLaunch({ lessonReady: true, classId: '' })).toEqual({
      ok: false,
      message: expect.stringContaining('lớp'),
    });
  });

  it('builds teacher, TV and student URLs with one session id', () => {
    const urls = buildLiveLessonUrls('session-123', 'https://smartplan.test', 'class-123');
    expect(urls.teacher).toBe('https://smartplan.test/adaptive-live/session-123?mode=teacher');
    expect(urls.tv).toBe('https://smartplan.test/adaptive-live/session-123?mode=tv');
    expect(urls.student).toBe('https://smartplan.test/adaptive-live/session-123?mode=student&classId=class-123');
    expect(new Set(Object.values(urls).map(url => url.match(/adaptive-live\/([^?]+)/)?.[1]))).toEqual(new Set(['session-123']));
    expect(Object.values(urls).join(' ')).not.toMatch(/pin|secret/i);
  });

  it('does not add the class binding to teacher or TV URLs', () => {
    const urls = buildLiveLessonUrls('session-123', 'https://smartplan.test', 'class/secret?no');
    expect(urls.teacher).not.toContain('classId');
    expect(urls.tv).not.toContain('classId');
    expect(urls.student).toContain('classId=class%2Fsecret%3Fno');
  });

  it('rejects a published lesson without the matching pilot definition', () => {
    expect(() => getPilotDefinitionForLesson({
      id: 'arbitrary-lesson',
      title: 'Bài khác',
      durationMinutes: 40,
      status: 'published',
    } as never)).toThrow(/pilot/i);
  });

  it('falls back from mixed legacy and server class input', () => {
    const serverClass = {
      id: 'class-1', teacherId: 'teacher-1', name: '10A', track: '', grade: '10',
      joinCode: 'JOIN10A', studentCount: 1, createdAt: 'now', updatedAt: 'now',
    };
    const legacyClass = { id: 'class-legacy', name: '10B', grade: '10', students: [] };

    expect(isAuthoritativeServerClassList([serverClass])).toBe(true);
    expect(isAuthoritativeServerClassList([serverClass, legacyClass])).toBe(false);
    expect(isAuthoritativeServerClassList([legacyClass])).toBe(false);
    expect(isAuthoritativeServerClassList([{ ...serverClass, studentCount: 'invalid' }])).toBe(false);
  });

  it('turns Firestore permission errors into an actionable teacher message', () => {
    expect(formatLiveLessonLaunchError(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }))).toContain('đồng bộ');
    expect(formatLiveLessonLaunchError(new Error('network down'))).toBe('network down');
  });
});
