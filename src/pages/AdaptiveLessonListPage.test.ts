import { describe, expect, it } from 'vitest';
import { getDeleteLessonConfirmation, shouldShowLiveLessonAction } from './AdaptiveLessonListPage';

describe('AdaptiveLessonListPage live action', () => {
  it('shows the live action only for published lessons', () => {
    expect(shouldShowLiveLessonAction({ status: 'published' } as never)).toBe(true);
    expect(shouldShowLiveLessonAction({ status: 'draft' } as never)).toBe(false);
    expect(shouldShowLiveLessonAction({ status: 'archived' } as never)).toBe(false);
  });

  it('names the lesson in the destructive confirmation', () => {
    expect(getDeleteLessonConfirmation('Bất phương trình bậc nhất hai ẩn — Tiết 1')).toContain('Bất phương trình bậc nhất hai ẩn — Tiết 1');
    expect(getDeleteLessonConfirmation('')).toContain('chưa đặt tên');
  });
});
