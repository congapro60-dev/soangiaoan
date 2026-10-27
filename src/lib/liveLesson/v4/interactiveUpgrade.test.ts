import { describe, expect, it } from 'vitest';
import { INTERACTIVE_SOURCE_KEYS, buildCanonicalDraft, publishSequentially, type SaveCallback } from './sequentialPublication';
import type { AdaptiveLesson } from '../../adaptive/types';

/**
 * Ca Codex bắt được: bài đã publish dạng self_study bị `skipped_already_published`
 * TRƯỚC bước gắn lessonKind, nên không bao giờ được nâng thành interactive.
 *
 * Dữ liệu giả dùng buildCanonicalDraft thật để qua được auditLeson (cần curriculumRef,
 * fiveStepFlow…), rồi mới ghi đè status/lessonKind như một bài cũ đã publish.
 */
const savedLessons: AdaptiveLesson[] = [];

const save: SaveCallback = async (lesson) => {
  savedLessons.push(lesson);
};

const existingPublishedSelfStudy = (
  sourceKey: string,
  teacherId: string,
  lessonKind: AdaptiveLesson['lessonKind'] = 'self_study',
): AdaptiveLesson => ({
  ...buildCanonicalDraft(sourceKey, teacherId),
  status: 'published',
  lessonKind,
  updatedAt: new Date().toISOString(),
});

describe('xuất bản 3 bài Tuần 11 là interactive', () => {
  it('bài đã publish dạng self_study được nâng cấp, không bị skip', async () => {
    savedLessons.length = 0;
    const teacherId = 'teacher-upgrade';
    const existing = new Map<string, AdaptiveLesson>();
    // Giả lập bài 12 đã tồn tại với lessonKind self_study.
    existing.set('12-11-80', existingPublishedSelfStudy('12-11-80', teacherId));

    const reports = await publishSequentially({
      existingLessons: existing,
      teacherId,
      save,
      sourceKeys: ['12-11-80'],
    });

    const report = reports.find(item => item.sourceKey === '12-11-80');
    expect(report?.status).toBe('published');
    expect(savedLessons).toHaveLength(1);
    expect(savedLessons[0].lessonKind).toBe('interactive');
  });

  it('bài interactive đã đúng thì vẫn skip như cũ (không ghi lại vô ích)', async () => {
    savedLessons.length = 0;
    const teacherId = 'teacher-noop';
    const already = existingPublishedSelfStudy('12-11-80', teacherId, 'interactive');
    const existing = new Map<string, AdaptiveLesson>([['12-11-80', already]]);

    const reports = await publishSequentially({
      existingLessons: existing,
      teacherId,
      save,
      sourceKeys: ['12-11-80'],
    });

    expect(reports[0].status).toBe('skipped_already_published');
    expect(savedLessons).toHaveLength(0);
  });

  it('bài Tuần 5–6 đã publish vẫn skip, không bị đổi lessonKind', async () => {
    savedLessons.length = 0;
    const teacherId = 'teacher-w5';
    const existing = new Map<string, AdaptiveLesson>([
      ['10-5-32', existingPublishedSelfStudy('10-5-32', teacherId)],
    ]);

    const reports = await publishSequentially({
      existingLessons: existing,
      teacherId,
      save,
      sourceKeys: ['10-5-32'],
    });

    expect(reports[0].status).toBe('skipped_already_published');
    expect(savedLessons).toHaveLength(0);
  });

  it('chỉ đúng 5 mã Tuần 11 mang cờ interactive', () => {
    expect([...INTERACTIVE_SOURCE_KEYS].sort()).toEqual(['10-11-79', '10-11-80', '11-11-75', '11-11-76', '12-11-80']);
  });
});
