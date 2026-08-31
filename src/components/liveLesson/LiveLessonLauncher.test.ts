import { describe, expect, it } from 'vitest';
import { buildLiveLessonUrls, formatLiveLessonLaunchError, getLiveDefinitionForLesson, getPilotDefinitionForLesson, isAuthoritativeServerClassList, validateLiveLessonLaunch } from './LiveLessonLauncher';

describe('live lesson launcher helpers', () => {
  it('blocks creation when there is no owned synchronized class', () => {
    expect(validateLiveLessonLaunch({ lessonReady: true, classId: '' })).toEqual({
      ok: false,
      message: expect.stringContaining('lớp'),
    });
  });

  it('blocks creation when the selected class has no join code for the student portal', () => {
    expect(validateLiveLessonLaunch({ lessonReady: true, classId: 'class-123', joinCode: '' })).toEqual({
      ok: false,
      message: expect.stringContaining('mã lớp'),
    });
  });

  it('builds teacher, TV and student URLs with one session id', () => {
    const urls = buildLiveLessonUrls('session-123', 'https://smartplan.test', 'class-123', 'JOIN123');
    expect(urls.teacher).toBe('https://smartplan.test/adaptive-live/session-123?mode=teacher');
    expect(urls.tv).toBe('https://smartplan.test/adaptive-live/session-123?mode=tv');
    expect(urls.student).toContain('mode=student');
    expect(urls.student).toContain('classId=class-123');
    expect(urls.student).toContain('joinCode=JOIN123');
    expect(new Set(Object.values(urls).map(url => url.match(/adaptive-live\/([^?]+)/)?.[1]))).toEqual(new Set(['session-123']));
    expect(Object.values(urls).join(' ')).not.toMatch(/pin|secret/i);
  });

  it('puts the selected class context only on the student URL', () => {
    const urls = buildLiveLessonUrls('session-123', 'https://smartplan.test', 'class-123', 'JOIN42');

    expect(urls.student).toBe('https://smartplan.test/adaptive-live/session-123?mode=student&classId=class-123&joinCode=JOIN42');
    expect(urls.teacher).not.toContain('classId');
    expect(urls.teacher).not.toContain('joinCode');
    expect(urls.tv).not.toContain('classId');
    expect(urls.tv).not.toContain('joinCode');
  });

  it('omits joinCode from student URL when joinCode is empty', () => {
    const urls = buildLiveLessonUrls('session-456', 'https://smartplan.test', 'class-456');
    expect(urls.student).toContain('classId=class-456');
    expect(urls.student).not.toContain('joinCode');
  });

  it('does not add the class binding or joinCode to teacher or TV URLs', () => {
    const urls = buildLiveLessonUrls('session-123', 'https://smartplan.test', 'class/secret?no', 'CODE?X');
    expect(urls.teacher).not.toContain('classId');
    expect(urls.teacher).not.toContain('joinCode');
    expect(urls.tv).not.toContain('classId');
    expect(urls.tv).not.toContain('joinCode');
    expect(urls.student).toContain('classId=class%2Fsecret%3Fno');
    expect(urls.student).toContain('joinCode=CODE%3FX');
  });

  it('rejects a published lesson without the matching pilot definition', () => {
    expect(() => getPilotDefinitionForLesson({
      id: 'arbitrary-lesson',
      title: 'Bài khác',
      durationMinutes: 40,
      status: 'published',
    } as never)).toThrow(/pilot/i);
  });

  it('opens a published Ban Toán V4 lesson only through its exact source identity', () => {
    const definition = getLiveDefinitionForLesson({
      id: 'adaptive-v4-10-5-37-teacher-1',
      title: 'Bất phương trình bậc nhất hai ẩn · V4',
      grade: '10',
      durationMinutes: 40,
      status: 'published',
      curriculumRef: { programType: 'TDS', week: '5', period: 37, lessonCode: '10-5-37' },
    } as never);
    expect(definition.id).toBe('g10_w5_p37_v4');
    expect(definition.lessonId).toBe('adaptive-v4-10-5-37-teacher-1');
  });

  it('adds V4 definition context to all three links without changing legacy links', () => {
    const urls = buildLiveLessonUrls('session-123', 'https://smartplan.test', 'class-123', 'JOIN123', {
      definitionKey: '10-5-37',
      lessonId: 'adaptive-v4-10-5-37-teacher-1',
    });
    expect(urls.teacher).toContain('definitionKey=10-5-37');
    expect(urls.tv).toContain('lessonId=adaptive-v4-10-5-37-teacher-1');
    expect(urls.student).toContain('classId=class-123');
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
