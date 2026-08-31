import { describe, expect, it } from 'vitest';
import {
  getBanToanV4ContractByPackageId,
  getBanToanV4PackageForLesson,
  getBanToanV4SourceKeyForLesson,
} from './lessonRegistry';

describe('Ban Toán V4 lesson registry', () => {
  it('resolves a lesson by exact curriculum identity, not by title', () => {
    expect(getBanToanV4SourceKeyForLesson({
      id: 'adaptive-v4-lesson-1',
      grade: '10',
      curriculumRef: { week: '5', period: 31, lessonCode: '10-5-31' },
    })).toBe('10-5-31');

    expect(getBanToanV4SourceKeyForLesson({
      id: 'adaptive-v4-lesson-2',
      grade: '10',
      title: 'Bất phương trình bậc nhất hai ẩn — bản khác',
    } as never)).toBeNull();

    expect(getBanToanV4SourceKeyForLesson({
      grade: '12',
      curriculumRef: { week: '6', period: 41, lessonCode: '' },
    })).toBe('12-6-41');
  });

  it('accepts the stable source key or package id as an exact reference', () => {
    const contract = getBanToanV4ContractByPackageId('g11_w6_p40_v4');
    expect(contract?.sourceKey).toBe('11-6-40');
    expect(getBanToanV4SourceKeyForLesson({ id: '11-6-40', grade: '11' })).toBe('11-6-40');
    expect(getBanToanV4SourceKeyForLesson({ id: 'g11_w6_p40_v4', grade: '11' })).toBe('11-6-40');
  });

  it('returns a binding only when the lesson has an exact package identity', () => {
    const binding = getBanToanV4PackageForLesson({
      id: 'adaptive-v4-10-5-37-teacher-1',
      grade: '10',
      curriculumRef: { programType: 'TDS', week: '5', period: 37, lessonCode: '10-5-37' },
    });
    expect(binding?.metadata.lessonMode).toBe('elective-practice');
    expect(binding?.contract.selfChoice).toBe(true);
    expect(getBanToanV4PackageForLesson({ id: 'unrelated', grade: '10' })).toBeNull();
  });
});
