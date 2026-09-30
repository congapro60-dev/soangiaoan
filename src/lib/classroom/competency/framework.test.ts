import { describe, expect, it } from 'vitest';
import {
  MATH_COMPETENCIES,
  competenciesByGrade,
  competencyById,
  asCompetencyGrade,
  competencyIdSet,
  competencyOptionsForPrompt,
} from './framework';

describe('MATH_COMPETENCIES — khung năng lực Toán trích từ template trường', () => {
  it('đủ 38 năng lực, chia đúng 17/10/11 theo khối 10/11/12', () => {
    expect(MATH_COMPETENCIES).toHaveLength(38);
    expect(competenciesByGrade(10)).toHaveLength(17);
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

  it('9 năng lực app bổ sung cho khối 10 đều có đủ 4 mô tả mức (để chèn vào file mẫu khi xuất)', () => {
    const added = MATH_COMPETENCIES.filter(item => item.rubric);
    expect(added.map(item => item.id)).toEqual([
      'g10-ham-so-va-do-thi', 'g10-dau-tam-thuc-bpt-bac-hai', 'g10-quy-tac-dem-to-hop', 'g10-nhi-thuc-newton',
      'g10-gia-tri-luong-giac-0-180', 'g10-vecto-mat-phang-toa-do', 'g10-pt-duong-thang', 'g10-pt-duong-tron', 'g10-ba-duong-conic',
    ]);
    for (const item of added) {
      expect(item.rubric).toHaveLength(4);
      expect(item.rubric!.every(text => text.trim().length > 0)).toBe(true);
    }
  });

  it('competencyById tra đúng, id lạ trả undefined', () => {
    expect(competencyById('g10-ham-so-bac-hai')?.topic).toBe('Hàm số bậc hai');
    expect(competencyById('khong-ton-tai')).toBeUndefined();
  });
});

describe('helper gắn nhãn theo khối', () => {
  it('asCompetencyGrade ép chuỗi/số về 10/11/12, khác thì null', () => {
    expect(asCompetencyGrade('10')).toBe(10);
    expect(asCompetencyGrade('Lớp 11')).toBe(11);
    expect(asCompetencyGrade(12)).toBe(12);
    expect(asCompetencyGrade('9')).toBeNull();
    expect(asCompetencyGrade('')).toBeNull();
    expect(asCompetencyGrade(undefined)).toBeNull();
  });

  it('competencyIdSet chỉ chứa id của khối đó', () => {
    const set10 = competencyIdSet(10);
    expect(set10.size).toBe(17);
    expect(set10.has('g10-ham-so-bac-hai')).toBe(true);
    expect(set10.has('g11-ham-va-pt-luong-giac')).toBe(false);
  });

  it('competencyOptionsForPrompt liệt kê đủ id khối, mỗi dòng có id', () => {
    const text = competencyOptionsForPrompt(11);
    const lines = text.split('\n');
    expect(lines).toHaveLength(competenciesByGrade(11).length);
    expect(lines.every(line => line.startsWith('- g11-'))).toBe(true);
  });
});
