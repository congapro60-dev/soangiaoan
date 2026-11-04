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

  it('chỉ đúng 146 mã Tuần 11-17 mang cờ interactive', () => {
    expect([...INTERACTIVE_SOURCE_KEYS].sort()).toEqual([
      '10-11-79', '10-11-80', '10-12-88', '10-12-89', '10-12-90', '10-12-91', '10-12-92', '10-12-93',
      '10-13-100', '10-13-101', '10-13-102', '10-13-103', '10-13-96', '10-13-97', '10-13-98', '10-13-99',
      '10-14-104', '10-14-105', '10-14-106', '10-14-107', '10-14-108', '10-14-109', '10-14-110', '10-14-111',
      '10-15-112', '10-15-113', '10-15-114', '10-15-115', '10-15-116', '10-15-117', '10-15-118', '10-15-119',
      '10-16-120', '10-16-121', '10-16-122', '10-16-123', '10-16-124', '10-16-125', '10-16-126', '10-16-127',
      '10-17-128', '10-17-129', '10-17-130', '10-17-131', '10-17-132', '10-17-133', '10-17-134', '10-17-135',
      '11-11-75', '11-11-76', '11-11-78', '11-11-79', '11-12-82', '11-12-83', '11-12-84', '11-12-85', '11-12-86', '11-12-87',
      '11-13-90', '11-13-91', '11-13-92', '11-13-93', '11-13-94', '11-13-95', '11-13-96', '11-13-97',
      '11-14-100', '11-14-101', '11-14-102', '11-14-103', '11-14-104', '11-14-105', '11-14-98', '11-14-99',
      '11-15-106', '11-15-107', '11-15-108', '11-15-109', '11-15-110', '11-15-111', '11-15-112', '11-15-113',
      '11-16-114', '11-16-115', '11-16-116', '11-16-117', '11-16-118', '11-16-119', '11-16-120', '11-16-121',
      '11-17-122', '11-17-123', '11-17-124', '11-17-125', '11-17-126', '11-17-127', '11-17-128', '11-17-129',
      '12-11-77', '12-11-78', '12-11-79', '12-11-80', '12-12-82', '12-12-83', '12-12-84', '12-12-85', '12-12-86', '12-12-87',
      '12-13-90', '12-13-91', '12-13-92', '12-13-93', '12-13-94', '12-13-95', '12-13-96', '12-13-97',
      '12-14-100', '12-14-101', '12-14-102', '12-14-103', '12-14-104', '12-14-105', '12-14-98', '12-14-99',
      '12-15-106', '12-15-107', '12-15-108', '12-15-109', '12-15-110', '12-15-111', '12-15-112', '12-15-113',
      '12-16-114', '12-16-115', '12-16-116', '12-16-117', '12-16-118', '12-16-119', '12-16-120',
      '12-17-122', '12-17-123', '12-17-124', '12-17-125', '12-17-126', '12-17-127', '12-17-128',
    ]);
  });
});
