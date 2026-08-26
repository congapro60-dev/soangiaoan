import { describe, expect, it } from 'vitest';
import { shouldShowLiveLessonAction } from './AdaptiveLessonListPage';

describe('AdaptiveLessonListPage live action', () => {
  it('shows the live action only for published lessons', () => {
    expect(shouldShowLiveLessonAction({ status: 'published' } as never)).toBe(true);
    expect(shouldShowLiveLessonAction({ status: 'draft' } as never)).toBe(false);
    expect(shouldShowLiveLessonAction({ status: 'archived' } as never)).toBe(false);
  });
});
