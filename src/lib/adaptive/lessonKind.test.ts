import { describe, expect, it } from 'vitest';
import { DEFAULT_LESSON_KIND, LESSON_KIND_LABELS, resolveLessonKind, type LessonKind } from './types';

describe('lesson kind separation (self-study vs interactive)', () => {
  it('treats lessons created before the split as self-study', () => {
    expect(resolveLessonKind({})).toBe('self_study');
    expect(resolveLessonKind({ lessonKind: undefined })).toBe('self_study');
    expect(resolveLessonKind({ lessonKind: null })).toBe('self_study');
    expect(DEFAULT_LESSON_KIND).toBe('self_study');
  });

  it('keeps an explicit kind', () => {
    expect(resolveLessonKind({ lessonKind: 'interactive' })).toBe('interactive');
    expect(resolveLessonKind({ lessonKind: 'differentiated' })).toBe('differentiated');
    expect(resolveLessonKind({ lessonKind: 'self_study' })).toBe('self_study');
  });

  it('labels every kind in plain Vietnamese teacher wording', () => {
    const kinds: LessonKind[] = ['self_study', 'interactive', 'differentiated'];
    for (const kind of kinds) {
      expect(LESSON_KIND_LABELS[kind]).toMatch(/\S/);
      expect(LESSON_KIND_LABELS[kind]).not.toMatch(/self_study|interactive|differentiated|V8\./);
    }
    expect(LESSON_KIND_LABELS.self_study).toBe('Bài tự học phân hoá');
    expect(LESSON_KIND_LABELS.interactive).toBe('Bài học tương tác');
  });
});
