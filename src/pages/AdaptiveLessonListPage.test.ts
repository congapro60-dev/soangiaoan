import { describe, expect, it } from 'vitest';
import {
  getDeleteLessonConfirmation,
  resolveAdaptiveBuilderUrl,
  resolveAdaptivePortalUrl,
  shouldShowLiveLessonAction,
} from './AdaptiveLessonListPage';
import { buildCanonicalDraft } from '../lib/liveLesson/v4/sequentialPublication';
import { getBanToanV4PackageMetadata } from '../lib/liveLesson/v4';

describe('AdaptiveLessonListPage helpers', () => {
  describe('shouldShowLiveLessonAction', () => {
    it('returns true for published lessons with a V4 binding', () => {
      const draft = buildCanonicalDraft('10-5-31', 'teacher-1');
      expect(shouldShowLiveLessonAction({ ...draft, status: 'published' })).toBe(true);
    });

    it('returns true for the legacy pilot lesson', () => {
      expect(shouldShowLiveLessonAction({ id: 'tds-g10-30-pilot', status: 'published' } as never)).toBe(true);
    });

    it('returns true for any published lesson without an id (legacy helper contract)', () => {
      expect(shouldShowLiveLessonAction({ status: 'published' } as never)).toBe(true);
    });

    it('returns false for non-published statuses', () => {
      expect(shouldShowLiveLessonAction({ status: 'draft' } as never)).toBe(false);
      expect(shouldShowLiveLessonAction({ status: 'archived' } as never)).toBe(false);
    });

    it('returns true for V4 formation, practice, and elective-practice modes', () => {
      const metadata = getBanToanV4PackageMetadata();
      const formation = metadata.filter(m => m.lessonMode === 'formation').slice(0, 2);
      const practice = metadata.filter(m => m.lessonMode === 'practice').slice(0, 2);
      const elective = metadata.filter(m => m.lessonMode === 'elective-practice').slice(0, 2);

      for (const m of [...formation, ...practice, ...elective]) {
        const draft = buildCanonicalDraft(m.sourceKey, 'teacher-1');
        expect(shouldShowLiveLessonAction({ ...draft, status: 'published' })).toBe(true);
      }
    });
  });

  describe('getDeleteLessonConfirmation', () => {
    it('names the lesson in the destructive confirmation', () => {
      expect(getDeleteLessonConfirmation('Bất phương trình bậc nhất hai ẩn — Tiết 1')).toContain('Bất phương trình bậc nhất hai ẩn — Tiết 1');
    });

    it('shows placeholder for empty title', () => {
      expect(getDeleteLessonConfirmation('')).toContain('chưa đặt tên');
    });

    it('trims whitespace from title', () => {
      expect(getDeleteLessonConfirmation('  ')).toContain('chưa đặt tên');
    });
  });

  describe('resolveAdaptiveBuilderUrl', () => {
    it('encodes the lesson id', () => {
      expect(resolveAdaptiveBuilderUrl('new')).toBe('/adaptive-builder/new');
      expect(resolveAdaptiveBuilderUrl('10-5-31')).toBe('/adaptive-builder/10-5-31');
    });
  });

  describe('resolveAdaptivePortalUrl', () => {
    it('encodes the lesson id', () => {
      expect(resolveAdaptivePortalUrl('10-5-31')).toBe('/adaptive-portal/10-5-31');
    });
  });
});
