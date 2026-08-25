import { describe, expect, it } from 'vitest';
import { getPilotLiveLessonDefinition } from '../lib/liveLesson/definition';
import {
  getLiveLessonRouteError,
  canLoadParentLiveLessonSession,
  isTeacherSessionOwner,
  parseLiveLessonMode,
  projectLiveLessonDefinition,
  shouldLoadParentLiveLessonSession,
} from './LiveLessonPage';

describe('LiveLessonPage route helpers', () => {
  it('rejects unknown modes and missing sessions with recoverable messages', () => {
    expect(parseLiveLessonMode('screen')).toBeNull();
    expect(getLiveLessonRouteError({ mode: 'screen', session: null })).toContain('mode');
    expect(getLiveLessonRouteError({ mode: 'tv', session: null })).toContain('Không tìm thấy');
  });

  it('keeps teacher-only cue fields out of TV and student projections', () => {
    const definition = getPilotLiveLessonDefinition();
    const tv = projectLiveLessonDefinition(definition, 'tv');
    const student = projectLiveLessonDefinition(definition, 'student');

    expect('cues' in tv).toBe(false);
    expect('cues' in student).toBe(false);
    expect('aiErrorOfTheWeek' in student).toBe(false);
    expect(JSON.stringify(tv)).not.toContain(definition.cues[0].teacher);
    expect(JSON.stringify(student)).not.toContain(definition.cues[0].boardLarge);
  });

  it('allows teacher mode only for the session owner', () => {
    expect(isTeacherSessionOwner({ teacherUid: 'teacher-1' }, 'teacher-1')).toBe(true);
    expect(isTeacherSessionOwner({ teacherUid: 'teacher-1' }, 'teacher-2')).toBe(false);
  });

  it('loads the parent session only for teacher mode', () => {
    expect(shouldLoadParentLiveLessonSession('teacher')).toBe(true);
    expect(shouldLoadParentLiveLessonSession('tv')).toBe(false);
    expect(shouldLoadParentLiveLessonSession('student')).toBe(false);
  });

  it('gates the teacher parent load until auth is ready and signed in', () => {
    expect(canLoadParentLiveLessonSession({ mode: 'teacher', authReady: false, userUid: 'teacher-1' })).toBe(false);
    expect(canLoadParentLiveLessonSession({ mode: 'teacher', authReady: true, userUid: null })).toBe(false);
    expect(canLoadParentLiveLessonSession({ mode: 'teacher', authReady: true, userUid: 'teacher-1' })).toBe(true);
    expect(canLoadParentLiveLessonSession({ mode: 'tv', authReady: false, userUid: null })).toBe(false);
  });
});
