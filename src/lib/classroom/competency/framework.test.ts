import { describe, expect, it } from 'vitest';
import { MATH_COMPETENCIES, competenciesByGrade, competencyById } from './framework';

describe('MATH_COMPETENCIES — khung năng lực Toán trích từ template trường', () => {
  it('đủ 29 năng lực, chia đúng 8/10/11 theo khối 10/11/12', () => {
    expect(MATH_COMPETENCIES).toHaveLength(29);
    expect(competenciesByGrade(10)).toHaveLength(8);
    expect(competenciesByGrade(11)).toHaveLength(10);
    expect(competenciesByGrade(12)).toHaveLength(11);
  });

  it('id là duy nhất — tránh gắn nhãn/khoá hồ sơ bị đè', () => {
    const ids = MATH_COMPETENCIES.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mọi năng lực có đủ khối/mảng/chủ đề/mô tả và khối hợp lệ', () => {
    for (const item of MATH_COMPETENCIES) {
      expect([10, 11, 12]).toContain(item.grade);
      expect(item.area.trim()).not.toBe('');
      expect(item.topic.trim()).not.toBe('');
      expect(item.competency.trim()).not.toBe('');
    }
  });

  it('competencyById tra đúng, id lạ trả undefined', () => {
    expect(competencyById('g10-ham-so-bac-hai')?.topic).toBe('Hàm số bậc hai');
    expect(competencyById('khong-ton-tai')).toBeUndefined();
  });
});
