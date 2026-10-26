import { describe, expect, it } from 'vitest';
import { parseLiveLessonMode } from './LiveLessonPage';

/**
 * Ca QA thật 2026-10-26: giáo viên mở link `mode=teacher` thấy màn cũ V3 —
 * không có P-timer, không có bố cục Presenter 5 vùng — rồi tưởng sản phẩm hỏng.
 * Luật: link cũ phải tự quy về Presenter V8.8 (tv-control).
 */
describe('parseLiveLessonMode', () => {
  it('mode=teacher (link cũ) quy về tv-control để có P-timer + 5 vùng', () => {
    expect(parseLiveLessonMode('teacher')).toBe('tv-control');
  });

  it('giữ nguyên các chế độ hợp lệ khác', () => {
    expect(parseLiveLessonMode('tv-control')).toBe('tv-control');
    expect(parseLiveLessonMode('tv')).toBe('tv');
    expect(parseLiveLessonMode('student')).toBe('student');
  });

  it('chế độ lạ vẫn bị chặn', () => {
    expect(parseLiveLessonMode('coach')).toBeNull();
    expect(parseLiveLessonMode('')).toBeNull();
    expect(parseLiveLessonMode(null)).toBeNull();
  });
});
